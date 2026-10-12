// server/radar.ts
// Radar: espía de anuncios (Meta Ad Library pública) + productos en tendencia (Google Trends) + favoritos.
// Sin tokens: Ad Library vía Chromium headless (playwright-core), Trends vía API HTTP pública no oficial.

import express from 'express';

type AnyRow = Record<string, any>;

function getDB(): any {
  return (globalThis as any).currentDB || {};
}

function saveDB(): void {
  try {
    const fn = (globalThis as any).saveDB || (globalThis as any).persistDB;
    if (typeof fn === 'function') fn();
  } catch { /* noop */ }
}

function radarStore(db: any): AnyRow {
  if (!db.radar || typeof db.radar !== 'object') db.radar = {};
  const r = db.radar;
  if (!r.cache || typeof r.cache !== 'object') r.cache = {};
  if (!Array.isArray(r.favorites)) r.favorites = [];
  return r;
}

function errJson(res: any, e: any, fallback: string) {
  return res.status(400).json({ success: false, error: e?.message || fallback });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const RADAR_COUNTRIES = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'AR', name: 'Argentina' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
];

const ADS_CACHE_TTL = 6 * 3600 * 1000;
const TRENDS_CACHE_TTL = 6 * 3600 * 1000;
const MIN_SCRAPE_GAP = 120000; // 2 min entre scrapes: Meta limita agresivo por IP

// ---------------- Chromium (Ad Library) ----------------

let _browser: any = null;
let _lastScrapeAt = 0;
let _scrapeChain: Promise<any> = Promise.resolve();

async function getBrowser(): Promise<any> {
  if (_browser) {
    try {
      if (_browser.isConnected && _browser.isConnected()) return _browser;
    } catch { /* relanzar */ }
    _browser = null;
  }
  const { chromium } = await import('playwright-core');
  const exe = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  _browser = await chromium.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled'],
  });
  return _browser;
}

// Parser ejecutado dentro de la página (anclado a texto, tolerante a cambios de clases de Meta).
const ADLIB_PARSER = `() => {
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const idNodes = [];
  let tn;
  while ((tn = walker.nextNode())) {
    if (/Library ID:\\s*\\d{5,}/.test(tn.nodeValue || '')) idNodes.push(tn);
  }
  for (const t of idNodes) {
    const m = (t.nodeValue || '').match(/Library ID:\\s*(\\d{5,})/);
    if (!m) continue;
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    let el = t.parentElement, card = null;
    for (let i = 0; i < 14 && el && el !== document.body; i++, el = el.parentElement) {
      const txt = el.innerText || '';
      if (txt.includes('Sponsored') && txt.includes('Started running') && txt.length > 200 && txt.length < 15000) { card = el; break; }
    }
    if (!card) continue;
    const full = card.innerText || '';
    let pageName = '';
    try {
      const links = Array.from(card.querySelectorAll('a'));
      for (const a of links) {
        const tx = (a.innerText || '').trim();
        const href = a.getAttribute('href') || '';
        if (tx && tx.length >= 2 && tx.length <= 60 && href && href.indexOf('/ads/library') === -1 && !/see ad details|ver (los )?detalles/i.test(tx)) { pageName = tx; break; }
      }
    } catch (e) {}
    const dm = full.match(/Started running on\\s+([A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4})/);
    let image = '';
    try {
      const imgs = Array.from(card.querySelectorAll('img'));
      let best = null, bestW = 0;
      for (const im of imgs) {
        const s = im.getAttribute('src') || '';
        if (s.indexOf('scontent') === -1) continue;
        const w = im.naturalWidth || 0;
        if (w > bestW) { bestW = w; best = s; }
      }
      image = best || ((imgs.map(i => i.getAttribute('src') || '').find(s => s.indexOf('scontent') !== -1)) || '');
    } catch (e) {}
    const platforms = [];
    for (const p of ['Facebook', 'Instagram', 'Messenger', 'Audience Network']) {
      if (full.indexOf(p) !== -1) platforms.push(p);
    }
    const lines = full.split('\\n').map(s => s.trim()).filter(s =>
      s && s.length > 0 &&
      !/^(Sponsored|Patrocinado|Active|Library ID|Started running|Platforms|See ad details|Ver (los )?detalles|Facebook|Instagram|Messenger|Audience Network)/i.test(s)
    );
    const body = lines.filter(s => s.length > 25).slice(0, 3).join('\\n\\n').slice(0, 700);
    out.push({
      id,
      pageName: pageName || 'Anunciante',
      body,
      image,
      startDate: dm ? dm[1] : '',
      platforms,
      url: 'https://www.facebook.com/ads/library/?id=' + id,
    });
  }
  return out;
}`;

function activeDays(startDate: string): number | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

async function scrapeAdLibrary(keyword: string, country: string, maxAds = 24): Promise<AnyRow[]> {
  // Cola global: un scrape a la vez + intervalo mínimo (rate-limit respetuoso).
  const job = _scrapeChain.then(async () => {
    const gap = Date.now() - _lastScrapeAt;
    if (gap < MIN_SCRAPE_GAP) await sleep(MIN_SCRAPE_GAP - gap);
    _lastScrapeAt = Date.now();
    const browser = await getBrowser();
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      locale: 'es-CO',
      viewport: { width: 1366, height: 900 },
    });
    try {
      const url =
        'https://www.facebook.com/ads/library/?active_status=active&ad_type=all' +
        `&country=${encodeURIComponent(country)}&q=${encodeURIComponent(keyword)}` +
        '&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=keyword_unordered&media_type=all';
      let rateLimited = false;
      page.on('response', async (r) => {
        try {
          if (r.url().includes('/api/graphql') && r.request().method() === 'POST') {
            const txt = await r.text();
            if (/Rate limit exceeded|1675004/.test(txt)) rateLimited = true;
          }
        } catch { /* noop */ }
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Espera única y paciente: NO hacer scroll agresivo (cada scroll dispara
      // más consultas GraphQL y Meta bloquea la IP por "Rate limit exceeded").
      await page.waitForFunction(
        () => !!(document.body && document.body.innerText && document.body.innerText.includes('Library ID:')),
        { timeout: 40000 }
      ).catch(() => {});
      if (rateLimited) {
        throw new Error('Meta limitó temporalmente las consultas desde el servidor (rate limit). Espera unos minutos e intenta de nuevo.');
      }
      const raw: AnyRow[] = await page.evaluate(`(${ADLIB_PARSER})()`);
      if (raw.length === 0) {
        // Sin tarjetas pero sin rate limit: probablemente sin resultados o bloqueo suave.
        const bodyTxt: string = await page.evaluate(() => (document.body ? document.body.innerText.slice(0, 500) : ''));
        if (/log in|iniciar sesi.n/i.test(bodyTxt) && bodyTxt.length < 2000) {
          throw new Error('Meta pidió iniciar sesión para ver la biblioteca. Intenta de nuevo en unos minutos.');
        }
      }
      return raw.slice(0, maxAds).map((a) => ({ ...a, activeDays: activeDays(a.startDate) }));
    } finally {
      await page.close().catch(() => {});
    }
  });
  // La cadena nunca se rompe por un fallo individual.
  _scrapeChain = job.catch(() => {});
  return job;
}

// ---------------- Google Trends (HTTP) ----------------

const TRENDS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
let _trendsCookie = '';

async function trendsGet(url: string): Promise<string> {
  const headers: AnyRow = { 'User-Agent': TRENDS_UA, Accept: 'application/json' };
  if (_trendsCookie) headers['Cookie'] = _trendsCookie;
  let r = await fetch(url, { headers });
  if (r.status === 429 || r.status === 403) {
    // Renovar cookies (las IP de datacenter suelen necesitarlo).
    try {
      const r0 = await fetch('https://trends.google.com/trends?geo=CO', { headers: { 'User-Agent': TRENDS_UA } });
      const sc: string[] = ((r0.headers as any).getSetCookie?.() as string[]) || [];
      if (sc.length) _trendsCookie = sc.map((c) => c.split(';')[0]).join('; ');
    } catch { /* noop */ }
    await sleep(1500);
    r = await fetch(url, { headers: { ...headers, Cookie: _trendsCookie } });
  }
  if (!r.ok) throw new Error(`Google Trends respondió ${r.status}. Intenta de nuevo en unos minutos.`);
  return r.text();
}

function parseTrends(t: string): any {
  return JSON.parse(t.replace(/^\)\]\}',?\n/, ''));
}

async function trendsExplore(keyword: string, country: string): Promise<any> {
  const req = { comparisonItem: [{ keyword, geo: country, time: 'today 12-m' }], category: 0, property: '' };
  const body = await trendsGet(
    `https://trends.google.com/trends/api/explore?hl=es-419&tz=-300&req=${encodeURIComponent(JSON.stringify(req))}`
  );
  return parseTrends(body);
}

export async function trendsInterest(keyword: string, country: string): Promise<AnyRow[]> {
  const exp = await trendsExplore(keyword, country);
  const w = (exp.widgets || []).find((x: any) => x.id === 'TIMESERIES');
  if (!w?.token) throw new Error('Google Trends no devolvió datos para esa búsqueda.');
  const wreq = { ...(w.request || {}), locale: 'es-419' };
  const body = await trendsGet(
    `https://trends.google.com/trends/api/widgetdata/multiline?hl=es-419&tz=-300&req=${encodeURIComponent(
      JSON.stringify(wreq)
    )}&token=${encodeURIComponent(w.token)}`
  );
  const data = parseTrends(body);
  const tl = data?.default?.timelineData || [];
  return tl.map((p: any) => ({ t: p.formattedTime || '', v: p.value?.[0] ?? 0 }));
}

export async function trendsRelated(keyword: string, country: string): Promise<{ rising: AnyRow[]; top: AnyRow[] }> {
  const exp = await trendsExplore(keyword, country);
  const w = (exp.widgets || []).find((x: any) => x.id === 'RELATED_QUERIES');
  if (!w?.token) return { rising: [], top: [] };
  const wreq = { ...(w.request || {}), locale: 'es-419' };
  const body = await trendsGet(
    `https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=es-419&tz=-300&req=${encodeURIComponent(
      JSON.stringify(wreq)
    )}&token=${encodeURIComponent(w.token)}`
  );
  const data = parseTrends(body);
  const lists: AnyRow[] = data?.default?.rankedList || [];
  const pick = (pred: (t: string) => boolean) =>
    (lists.find((l) => pred(String(l.title || '')))?.rankedKeyword || []).map((k: any) => ({
      query: k.query,
      value: k.value,
      label: k.formattedValue || '',
    }));
  return {
    rising: pick((t) => /rising|aumento/i.test(t)),
    top: pick((t) => /top|principal/i.test(t)),
  };
}

// ---------------- Rutas ----------------

export function setupRadarRoutes(app: express.Express) {
  const router = express.Router();

  router.get('/countries', (_req, res) => {
    res.json({ success: true, countries: RADAR_COUNTRIES });
  });

  // Espía de anuncios — Meta Ad Library pública (caché 6h).
  router.post('/ads/search', async (req, res) => {
    try {
      const keyword = String(req.body?.keyword || '').trim();
      const country = String(req.body?.country || 'CO').toUpperCase();
      const platform = String(req.body?.platform || 'all');
      const sort = String(req.body?.sort || 'oldest');
      const limit = Math.min(48, Math.max(6, Number(req.body?.limit) || 24));
      if (!keyword) return res.status(400).json({ success: false, error: 'Escribe una palabra clave para espiar.' });
      const db = getDB();
      const store = radarStore(db);
      const key = `ads:${country}:${keyword.toLowerCase()}`;
      const hit = store.cache[key];
      let ads: AnyRow[];
      let cached = false;
      if (hit && Date.now() - hit.at < ADS_CACHE_TTL) {
        ads = hit.data;
        cached = true;
      } else {
        ads = await scrapeAdLibrary(keyword, country, limit);
        store.cache[key] = { at: Date.now(), data: ads };
        saveDB();
      }
      let list = ads;
      if (platform !== 'all') {
        const want = platform === 'instagram' ? 'Instagram' : 'Facebook';
        list = list.filter((a) => (a.platforms || []).includes(want));
      }
      list = [...list].sort((a, b) =>
        sort === 'oldest' ? (b.activeDays ?? -1) - (a.activeDays ?? -1) : (a.activeDays ?? 9999) - (b.activeDays ?? 9999)
      );
      res.json({
        success: true,
        cached,
        source: 'Meta Ad Library pública',
        sourceNote: 'Datos públicos de facebook.com/ads/library. La antigüedad activa es la mejor señal: un anuncio que lleva meses corriendo suele ser ganador.',
        ads: list,
      });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo espiar la Ad Library. Intenta de nuevo en un minuto.');
    }
  });

  // Tendencia 12 meses de una palabra clave.
  router.get('/trends/interest', async (req, res) => {
    try {
      const keyword = String(req.query.keyword || '').trim();
      const country = String(req.query.country || 'CO').toUpperCase();
      if (!keyword) return res.status(400).json({ success: false, error: 'Indica una palabra clave.' });
      const db = getDB();
      const store = radarStore(db);
      const key = `trend:${country}:${keyword.toLowerCase()}`;
      const hit = store.cache[key];
      let points: AnyRow[];
      let cached = false;
      if (hit && Date.now() - hit.at < TRENDS_CACHE_TTL) {
        points = hit.data;
        cached = true;
      } else {
        points = await trendsInterest(keyword, country);
        store.cache[key] = { at: Date.now(), data: points };
        saveDB();
      }
      res.json({ success: true, cached, source: 'Google Trends', points });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo consultar Google Trends.');
    }
  });

  // Búsquedas relacionadas en aumento (señal de productos en tendencia).
  router.get('/trends/related', async (req, res) => {
    try {
      const keyword = String(req.query.keyword || '').trim();
      const country = String(req.query.country || 'CO').toUpperCase();
      if (!keyword) return res.status(400).json({ success: false, error: 'Indica una palabra clave.' });
      const db = getDB();
      const store = radarStore(db);
      const key = `related:${country}:${keyword.toLowerCase()}`;
      const hit = store.cache[key];
      let data: { rising: AnyRow[]; top: AnyRow[] };
      let cached = false;
      if (hit && Date.now() - hit.at < TRENDS_CACHE_TTL) {
        data = hit.data;
        cached = true;
      } else {
        data = await trendsRelated(keyword, country);
        store.cache[key] = { at: Date.now(), data };
        saveDB();
      }
      res.json({ success: true, cached, source: 'Google Trends', ...data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo consultar Google Trends.');
    }
  });

  // Favoritos.
  router.get('/favorites', (_req, res) => {
    const store = radarStore(getDB());
    res.json({ success: true, favorites: store.favorites });
  });

  router.post('/favorites', (req, res) => {
    try {
      const db = getDB();
      const store = radarStore(db);
      const b = req.body || {};
      if (!b.type || !b.data) return res.status(400).json({ success: false, error: 'Falta el contenido del favorito.' });
      const fav = { id: `fav-${Date.now()}`, type: b.type, data: b.data, createdAt: new Date().toISOString() };
      store.favorites.unshift(fav);
      saveDB();
      res.json({ success: true, favorite: fav });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo guardar el favorito.');
    }
  });

  router.delete('/favorites/:id', (req, res) => {
    try {
      const db = getDB();
      const store = radarStore(db);
      store.favorites = store.favorites.filter((f: any) => f.id !== req.params.id);
      saveDB();
      res.json({ success: true });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo eliminar el favorito.');
    }
  });

  app.use('/api/radar', router);
}

export default setupRadarRoutes;
