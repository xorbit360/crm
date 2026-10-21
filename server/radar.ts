// server/radar.ts
// Radar: espía de anuncios (Meta Ad Library pública) + productos en tendencia (Google Trends) + favoritos.
// Sin tokens: Ad Library vía Chromium headless (playwright-core), Trends vía API HTTP pública no oficial.

import express from 'express';
import { getSupabase } from './supabase.ts';
import { decryptSecret, isEncryptedSecret } from './secretBox.ts';
import { getSession } from './auth.ts';
import * as billingModule from './billing.ts';

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
  { code: 'GT', name: 'Guatemala' },
  { code: 'PA', name: 'Panamá' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'ES', name: 'España' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'SG', name: 'Singapur' },
  { code: 'AE', name: 'Emiratos Árabes' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egipto' },
  { code: 'TR', name: 'Turquía' },
  { code: 'PL', name: 'Polonia' },
  { code: 'SE', name: 'Suecia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'CH', name: 'Suiza' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Bélgica' },
];

const ADS_CACHE_TTL = 6 * 3600 * 1000;
const TRENDS_CACHE_TTL = 6 * 3600 * 1000;
const MIN_SCRAPE_GAP = 120000; // 2 min entre scrapes: Meta limita agresivo por IP

// ---------------- Chromium (Ad Library) ----------------

let _browser: any = null;
let _lastScrapeAt = 0;
let _scrapeChain: Promise<any> = Promise.resolve();
// Cola separada para TikTok/Google: no necesitan el gap anti-rate-limit de
// Meta (2 min) y ya no esperan detrás de sus scrapes; corren en paralelo.
let _otherChain: Promise<any> = Promise.resolve();

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

// Parser de respaldo: anclado a tarjetas por texto (Sponsored + Started running),
// sin depender de que "Library ID:" esté visible en la tarjeta.
const ADLIB_PARSER_FALLBACK = `() => {
  const out = [];
  const seen = new Set();
  const cards = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let tn;
  while ((tn = walker.nextNode())) {
    const v = tn.nodeValue || '';
    if (/Started running on|Empezó a circular/i.test(v)) {
      let el = tn.parentElement, card = null;
      for (let i = 0; i < 12 && el && el !== document.body; i++, el = el.parentElement) {
        const txt = el.innerText || '';
        if ((txt.includes('Sponsored') || txt.includes('Patrocinado')) && txt.length > 200 && txt.length < 15000) { card = el; break; }
      }
      if (card && cards.indexOf(card) === -1) cards.push(card);
    }
  }
  for (const card of cards) {
    try {
      const full = card.innerText || '';
      let id = '';
      try {
        const links = Array.from(card.querySelectorAll('a'));
        for (const a of links) {
          const h = a.getAttribute('href') || '';
          const m = h.match(/[?&]id=(\\d{5,})/);
          if (m) { id = m[1]; break; }
        }
      } catch (e) {}
      if (!id) {
        let h = 7;
        const seed = full.slice(0, 400);
        for (let ci = 0; ci < seed.length; ci++) h = (h * 31 + seed.charCodeAt(ci)) | 0;
        id = 'meta-' + Math.abs(h).toString(36);
      }
      if (seen.has(id)) continue;
      seen.add(id);
      let pageName = '';
      try {
        const links = Array.from(card.querySelectorAll('a'));
        for (const a of links) {
          const tx = (a.innerText || '').trim();
          const href = a.getAttribute('href') || '';
          if (tx && tx.length >= 2 && tx.length <= 60 && href.indexOf('/ads/library') === -1 && !/see ad details|ver detalles del anuncio/i.test(tx)) { pageName = tx; break; }
        }
      } catch (e) {}
      const dm = full.match(/Started running on\\s+([A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4})|Empezó a circular el\\s+(\\d{1,2} de [a-záéíóúñ]+ de \\d{4})/i);
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
        image = best || '';
      } catch (e) {}
      const platforms = [];
      for (const p of ['Facebook', 'Instagram', 'Messenger', 'Audience Network']) {
        if (full.indexOf(p) !== -1) platforms.push(p);
      }
      const lines = full.split('\\n').map(s => s.trim()).filter(s =>
        s && s.length > 0 &&
        !/^(Sponsored|Patrocinado|Active|Activos?|Library ID|Started running|Empezó a circular|Platforms|Plataformas|See ad details|Ver detalles del anuncio|Facebook|Instagram|Messenger|Audience Network)/i.test(s)
      );
      let destination = '';
      let destinationType = '';
      try {
        const hrefs = Array.from(card.querySelectorAll('a')).map(a => a.getAttribute('href') || '').filter(Boolean);
        const ext = [];
        for (let h of hrefs) {
          try { const u = new URL(h, location.origin); if (/l\\.facebook\\.com$/i.test(u.hostname)) { const r = u.searchParams.get('u'); if (r) h = r; } } catch (e) {}
          if (!/^https?:\\/\\//i.test(h)) continue;
          if (/facebook\\.com\\/ads\\/library/i.test(h)) continue;
          if (/(^|\\.)(facebook|instagram)\\.com/i.test(h) && !/wa\\.me|whatsapp/i.test(h)) continue;
          ext.push(h);
        }
        const wa = ext.find(x => /wa\\.me|api\\.whatsapp\\.com|chat\\.whatsapp\\.com/i.test(x));
        if (wa) { destination = wa; destinationType = 'whatsapp'; }
        else if (ext.length) { destination = ext[0]; destinationType = 'landing'; }
        else if (/enviar mensaje de whatsapp|send whatsapp message/i.test(full)) { destinationType = 'whatsapp'; }
      } catch (e) {}
      out.push({
        id,
        pageName: pageName || 'Anunciante',
        body: lines.filter(s => s.length > 25).slice(0, 3).join('\\n\\n').slice(0, 700),
        image,
        startDate: dm ? (dm[1] || dm[2] || '') : '',
        platforms,
        url: /^\\d{5,}$/.test(id) ? 'https://www.facebook.com/ads/library/?id=' + id : '',
        destination,
        destinationType,
      });
    } catch (e) {}
  }
  return out;
}`;

// Textos de la interfaz de Meta que NUNCA son nombre de página ni copy del
// anuncio; el parser los capturaba como pageName ("Impresiones:", "Este
// anuncio tiene varias versiones", "Abrir menú desplegable", ...).
const META_UI_JUNK = /^(Impresiones\b|Número de impresiones|Este anuncio tiene varias versiones|Abrir menú|Ver detalles|See ad details|Ver todos los detalles|See all details|Transparencia por ubicación|Información sobre el descargo|Patrocinado|Sponsored|Activos?|Active|Plataformas|Platforms|Publicidad|Advertising|Cerrar|Close|Detalles del anuncio|Ad details|Identificador de la biblioteca|Library ID)/i;

// Destino real del anuncio de Meta, desde los enlaces del dialogo de detalle:
// el redirect de Meta (l.php?u=) trae el destino codificado; los enlaces de
// mensajeria (wa.me / api.whatsapp.com) => WhatsApp; cualquier otro dominio
// externo => Landing/tienda. Si no hay enlace en el DOM, el CTA "Enviar
// mensaje de WhatsApp" tambien delata el tipo.
function metaDestination(links: string[], text: string): { destination: string; destinationType: string } {
  const candidates: string[] = [];
  for (const raw of links || []) {
    let href = String(raw || '');
    if (!href || !/^https?:\/\//i.test(href)) continue;
    try {
      const u = new URL(href);
      if (/(^|\.)l\.facebook\.com$/i.test(u.hostname)) {
        const real = u.searchParams.get('u');
        if (real) href = real;
      }
    } catch { /* noop */ }
    if (/facebook\.com\/ads\/library/i.test(href)) continue;
    if (/(^|\.)(facebook|instagram)\.com/i.test(href) && !/wa\.me|whatsapp/i.test(href)) continue;
    candidates.push(href);
  }
  const wa = candidates.find((h) => /wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com/i.test(h));
  if (wa) return { destination: wa, destinationType: 'whatsapp' };
  if (candidates.length) return { destination: candidates[0], destinationType: 'landing' };
  if (/enviar mensaje de whatsapp|send whatsapp message/i.test(text)) return { destination: '', destinationType: 'whatsapp' };
  return { destination: '', destinationType: '' };
}

function sanitizeMetaAd(a: AnyRow): AnyRow {
  const body = String(a.body || '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !META_UI_JUNK.test(s))
    .join('\n')
    .slice(0, 700);
  let pageName = String(a.pageName || '').trim();
  if (!pageName || pageName.length > 60 || META_UI_JUNK.test(pageName) || /^</.test(pageName) || /^[\d.,\s]+$/.test(pageName)) pageName = 'Anunciante';
  return { ...a, pageName, body };
}

export async function scrapeAdLibrary(keyword: string, country: string, maxAds = 24): Promise<AnyRow[]> {
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
      if (rateLimited) {
        throw new Error('Meta limitó temporalmente las consultas desde el servidor (rate limit). Espera unos minutos e intenta de nuevo.');
      }
      // 1) Scroll moderado: la página reporta miles de resultados pero las
      // tarjetas cargan por lazy-load. 6 scrolls suaves con pausa.
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2)).catch(() => {});
        await page.waitForTimeout(1400);
        if (rateLimited) break;
      }
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await page.waitForTimeout(1000);
      // 2) Ancla real: esperar tarjetas. "Library ID:" no se renderiza sin
      // expandir, pero los botones "See ad details" sí aparecen con las tarjetas.
      await page.waitForFunction(
        () => {
          const t = document.body ? document.body.innerText : '';
          return t.includes('Sponsored') || t.includes('Patrocinado') ||
            t.includes('See ad details') || t.includes('Ver detalles del anuncio');
        },
        { timeout: 30000 }
      ).catch(() => {});
      // Nota: si Meta marcó rate limit en graphql, NO abortamos: los botones
      // de detalle ya cargaron y la expansión de diálogos no depende de graphql.

      // 3) Expandir "See ad details" / "Ver detalles del anuncio" tarjeta por
      // tarjeta y leer el Library ID del diálogo (estructura real actual).
      // La página puede venir en español: "Identificador de la biblioteca".
      const ads: AnyRow[] = [];
      const seen = new Set<string>();
      const detailSel = 'text=/^(See ad details|Ver detalles del anuncio)$/i';
      let btnCount = 0;
      try { btnCount = await page.locator(detailSel).count(); } catch { btnCount = 0; }
      for (let i = 0; i < Math.min(btnCount, maxAds); i++) {
        const btn = page.locator(detailSel).nth(i);
        try {
          await btn.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
          await btn.click({ timeout: 8000 });
        } catch { continue; }
        await page.waitForTimeout(1400);
        const dlg: AnyRow = await page.evaluate(() => {
          const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
          const d = dialogs[dialogs.length - 1] as HTMLElement | undefined;
          if (!d) return { text: '', links: [] as string[] };
          const text = d.innerText || '';
          let image = '';
          try {
            const imgs = Array.from(d.querySelectorAll('img'));
            let bw = 0;
            for (const im of imgs) {
              const s = im.getAttribute('src') || '';
              if (!s || s.indexOf('scontent') === -1) continue;
              const w = (im as HTMLImageElement).naturalWidth || 0;
              if (w >= bw) { bw = w; image = s; }
            }
          } catch (e) {}
          let links: string[] = [];
          try {
            links = Array.from(d.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).href || '').filter(Boolean);
          } catch (e) {}
          return { text, image, links };
        }).catch(() => ({ text: '', image: '', links: [] as string[] }));
        const full = String(dlg.text || '');
        // El diálogo puede venir en inglés ("Library ID: 123") o español
        // ("Identificador de la biblioteca: 123").
        const idM = full.match(/(?:Library ID|Identificador de la biblioteca)\s*:?\s*(\d{5,})/i);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
        if (!idM || seen.has(idM[1])) continue;
        seen.add(idM[1]);
        // El nombre de la página viene tras la línea "Plataformas"/"Platforms".
        const allLines = full.split('\n').map((s) => s.trim());
        let nameLine = '';
        const platIdx = allLines.findIndex((l) => /^(Plataformas|Platforms)$/i.test(l));
        if (platIdx !== -1) {
          for (let k = platIdx + 1; k < allLines.length && k < platIdx + 6; k++) {
            const l = allLines[k];
            if (l && l.length >= 2 && l.length <= 60 && !META_UI_JUNK.test(l)) {
              nameLine = l;
              break;
            }
          }
        }
        if (!nameLine) {
          nameLine = allLines.find((l) =>
            l.length >= 2 && l.length <= 60 &&
            !/^(Sponsored|Patrocinado|Active|Activos?|Library ID|Identificador de la biblioteca|Detalles del anuncio|Ad details|Cerrar|Close|Número de impresiones|En circulación|Started running|Plataformas|Platforms|Publicidad|Ver detalles|See ad details)/i.test(l)
          ) || 'Anunciante';
        }
        const dm = full.match(/Started running on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})|(?:Empezó a circular|En circulación desde)\s+(?:el\s+)?(\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}|\d{1,2}\s+[a-záéíóúñ]+\s+\d{4})/i);
        const platforms: string[] = [];
        for (const p of ['Facebook', 'Instagram', 'Messenger', 'Audience Network']) {
          if (full.indexOf(p) !== -1) platforms.push(p);
        }
        const bodyLines = full.split('\n').map((s) => s.trim()).filter((s) =>
          s && s.length > 0 &&
          !/^(Sponsored|Patrocinado|Active|Activos?|Library ID|Identificador de la biblioteca|Started running|Empezó a circular|En circulación desde|Platforms|Plataformas|See ad details|Ver detalles del anuncio|Detalles del anuncio|Cerrar|Close)/i.test(s)
        );
        ads.push({
          id: idM[1],
          pageName: nameLine || 'Anunciante',
          body: bodyLines.filter((s) => s.length > 25).slice(0, 3).join('\n\n').slice(0, 700),
          image: dlg.image || '',
          startDate: dm ? (dm[1] || dm[2] || '') : '',
          platforms,
          url: 'https://www.facebook.com/ads/library/?id=' + idM[1],
          ...metaDestination(Array.isArray(dlg.links) ? dlg.links : [], full),
          source: 'meta',
        });
      }

      // 4) Fallback: si ningún diálogo se pudo expandir, parsear tarjetas por
      // anclas de texto (no exige Library ID visible).
      let raw: AnyRow[] = ads;
      if (!raw.length) {
        raw = await page.evaluate(`(${ADLIB_PARSER_FALLBACK})()`);
      }
      if (!raw.length) {
        const bodyTxt: string = await page.evaluate(() => (document.body ? document.body.innerText.slice(0, 500) : ''));
        if (/log in|iniciar sesi.n/i.test(bodyTxt) && bodyTxt.length < 2000) {
          throw new Error('Meta pidió iniciar sesión para ver la biblioteca. Intenta de nuevo en unos minutos.');
        }
      }
      return raw.slice(0, maxAds).map((a) => ({ ...sanitizeMetaAd(a), source: 'meta', activeDays: activeDays(a.startDate) }));
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

async function trendsRelatedOnce(keyword: string, country: string): Promise<{ rising: AnyRow[]; top: AnyRow[] }> {
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
  // Google ya NO envía el campo title en rankedList (verificado en vivo):
  // buscar solo por título devolvía siempre vacío. Se usa el título si viene
  // y, si no, el orden estándar de la API: [0]=principales, [1]=en aumento.
  const mapList = (l: AnyRow | undefined) =>
    (l?.rankedKeyword || []).map((k: any) => ({
      query: k.query,
      value: k.value,
      label: k.formattedValue || '',
    }));
  const topList = lists.find((l) => /top|principal/i.test(String(l.title || ''))) || lists[0];
  const risingList = lists.find((l) => /rising|aumento/i.test(String(l.title || ''))) || lists[1];
  return {
    rising: mapList(risingList),
    top: mapList(topList),
  };
}

// Google Trends a veces no tiene consultas relacionadas para frases largas
// ("faja colombiana" volvía vacío): se reintenta con variantes más cortas
// (sin la última palabra, luego solo la primera) antes de rendirse.
export async function trendsRelated(keyword: string, country: string): Promise<{ rising: AnyRow[]; top: AnyRow[] }> {
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const variants = [keyword.trim()];
  if (words.length > 2) variants.push(words.slice(0, -1).join(' '));
  if (words.length > 1) variants.push(words[0]);
  let last: { rising: AnyRow[]; top: AnyRow[] } = { rising: [], top: [] };
  let lastError: any = null;
  let anySuccess = false;
  for (const v of [...new Set(variants)]) {
    try {
      last = await trendsRelatedOnce(v, country);
      anySuccess = true;
      if (last.rising.length || last.top.length) return last;
    } catch (e) {
      // Una variante puede fallar (p. ej. 429 de Google); se prueban las demás
      // y solo se propaga el error si TODAS fallan.
      lastError = e;
    }
  }
  if (!anySuccess && lastError) throw lastError;
  return last;
}

// ---------------- TikTok Creative Center (scraper tolerante) ----------------

// Encola un trabajo de navegador sin el gap anti-Meta (solo Meta necesita el
// intervalo de 2 min). Usa su PROPIA cadena (_otherChain): TikTok y Google se
// serializan entre ellos, pero corren en paralelo con Meta.
function queueBrowserJob<T>(fn: () => Promise<T>): Promise<T> {
  const job = _otherChain.then(fn);
  _otherChain = job.catch(() => {});
  return job;
}

function browserPageOpts() {
  return {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'es-ES',
    viewport: { width: 1366, height: 900 },
  };
}

// Parser ejecutado dentro de la página: capas de detección (selectores
// probables + fallback genérico por señales de anuncio). Si la página cambia,
// simplemente devuelve menos o ningún anuncio (nunca rompe el backend).
// Parser ejecutado dentro de la página del Creative Center.
// CLAVE: acota la búsqueda al contenido principal (main) y excluye
// header/nav/footer/aside — el bug anterior devolvía texto de navegación.
// Capas: 1) selectores probables de tarjetas, 2) fallback por señales de
// anuncio (likes + anunciante + imagen) solo dentro del área de resultados.
const TIKTOK_PARSER = `() => {
  const out = [];
  const seen = new Set();
  // Área de resultados: el main, sin zonas de navegación.
  const scope = document.querySelector('main') || document.body;
  const inNav = (el) => {
    try { return !!el.closest('header, nav, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]'); }
    catch (e) { return false; }
  };
  const pickImg = (el) => {
    try {
      const imgs = Array.from(el.querySelectorAll('img'));
      let best = '', bw = 0;
      for (const im of imgs) {
        const s = im.getAttribute('src') || '';
        if (!s || /logo|avatar|icon|sprite|tiktokcdn.*logo/i.test(s)) continue;
        const w = im.naturalWidth || 0;
        if (w >= bw) { bw = w; best = s; }
      }
      return best;
    } catch (e) { return ''; }
  };
  const pickLikes = (txt) => {
    const m = (txt || '').match(/([\\d.,]+)\\s*([KMB])?\\s*(Likes|Me gusta|likes)/);
    return m ? (m[1] + (m[2] || '')) : '';
  };
  const pickDate = (txt) => {
    const m = (txt || '').match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2})/i);
    return m ? m[1] : '';
  };
  const looksLikeAd = (t) => {
    // Señales de tarjeta de anuncio del Top Ads: métricas + anunciante.
    return /\\b(Likes?|Me gusta|Impressions|Impresiones|CTR|Clicks)\\b/i.test(t) &&
      !/^(Home|Inicio|Log in|Iniciar sesión|Creative Center|Inspiration|Top Ads)/i.test(t.trim().split('\\n')[0] || '');
  };
  let cards = [];
  // Capa 1: selectores probables de tarjetas de anuncios.
  const selGroups = [
    scope.querySelectorAll('[class*="card-item" i], [class*="CardItem"]'),
    scope.querySelectorAll('[class*="creative-card" i], [class*="CreativeCard"]'),
    scope.querySelectorAll('[class*="top-ad" i], [class*="TopAd"]'),
    scope.querySelectorAll('a[class*="card" i]'),
  ];
  for (const g of selGroups) {
    if (g && g.length >= 2) { cards = Array.from(g).filter((c) => !inNav(c)); break; }
  }
  // Capa 2: fallback genérico por señales, solo dentro del scope y fuera de nav.
  if (!cards.length) {
    const divs = Array.from(scope.querySelectorAll('div'));
    const scored = [];
    for (const d of divs) {
      if (inNav(d)) continue;
      const t = d.innerText || '';
      if (t.length < 60 || t.length > 2200) continue;
      if (!looksLikeAd(t)) continue;
      if (d.querySelectorAll('img, video').length === 0) continue;
      // Evitar contenedores gigantes: preferir el más pequeño que calce.
      scored.push({ el: d, len: t.length });
    }
    scored.sort((a, b) => a.len - b.len);
    const picked = [];
    for (const s of scored) {
      if (picked.length >= 60) break;
      if (picked.some((p) => p.contains(s.el) || s.el.contains(p))) continue;
      picked.push(s.el);
    }
    cards = picked;
  }
  for (const c of cards) {
    try {
      const txt = (c.innerText || '').trim();
      if (!txt || txt.length < 40) continue;
      const lines = txt.split('\\n').map((s) => s.trim()).filter((s) => s.length > 1);
      // El anunciante suele ser la primera línea corta con texto.
      const advertiser = lines.find((l) => l.length >= 2 && l.length <= 60) || 'Anunciante';
      const linkEl = c.tagName === 'A' ? c : (c.querySelector('a[href]') || (c.closest ? c.closest('a[href]') : null));
      const href = linkEl ? (linkEl.getAttribute('href') || '') : '';
      const idM = href.match(/(\\d{8,})/);
      const id = idM ? idM[1] : ('tt-' + Math.abs(Array.from(txt.slice(0, 300)).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)).toString(36));
      if (seen.has(id)) continue;
      seen.add(id);
      const bodyLines = lines.filter((l) => l !== advertiser && !/^\\d/.test(l) && l.length > 3);
      out.push({
        id,
        advertiser,
        pageName: advertiser,
        body: bodyLines.slice(0, 4).join('\\n\\n').slice(0, 700),
        image: pickImg(c),
        likes: pickLikes(txt),
        startDate: pickDate(txt),
        url: href ? (href.indexOf('http') === 0 ? href : 'https://ads.tiktok.com' + href) : '',
      });
    } catch (e) {}
  }
  return out;
}`;


async function fetchTikTokMaterials(country: string): Promise<AnyRow[]> {
  return queueBrowserJob(async () => {
    try {
      const browser = await getBrowser();
      const page = await browser.newPage(browserPageOpts());
      try {
        // Estrategia: el Creative Center carga los Top Ads vía su propia API
        // (creative_radar_api/v1/top_ads/v2/list). Interceptamos TODAS las
        // respuestas paginadas (scroll) en lugar de parsear el DOM.
        // OJO: el parámetro keyword= de esa API devuelve 0 para casi todo y
        // el buscador de la SPA no es automatizable de forma fiable
        // (verificado en vivo 2026-10-20); por eso el filtro por palabra
        // clave se hace aquí, con coincidencia por palabras normalizada.
        const byId = new Map<string, AnyRow>();
        page.on('response', async (r) => {
          try {
            const u = r.url();
            if (u.includes('/creative_radar_api/v1/top_ads/v2/list')) {
              const j = await r.json().catch(() => null);
              const m = j?.data?.materials;
              if (Array.isArray(m)) {
                for (const x of m) if (x && x.id != null) byId.set(String(x.id), x);
              }
            }
          } catch { /* noop */ }
        });
        const cc = String(country || 'US').toUpperCase();
        const url =
          'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en' +
          `?region=${encodeURIComponent(cc)}&period=30`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        // Esperar la primera tanda de Top Ads.
        for (let i = 0; i < 10 && !byId.size; i++) {
          await page.waitForTimeout(2500);
        }
        // Scroll para paginar: más material = mejor filtro por palabra clave.
        let lastSize = byId.size;
        let stale = 0;
        for (let i = 0; i < 6 && byId.size < 60 && stale < 2; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5)).catch(() => {});
          await page.waitForTimeout(2200);
          if (byId.size === lastSize) stale++;
          else { stale = 0; lastSize = byId.size; }
        }
        const materials = [...byId.values()];
        return materials;
      } finally {
        await page.close().catch(() => {});
      }
    } catch {
      return [];
    }
  });
}

// Coincidencia por palabra clave sobre el texto de un material de TikTok:
// normalizada (minusculas, sin acentos), por palabras significativas y con
// variantes singular/plural. La usa el espia y el tablero de virales.
function tiktokKeywordMatch(m: AnyRow, kw: string): boolean {
  const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'para', 'con', 'sin', 'por', 'del', 'una', 'uno', 'en', 'y', 'a']);
  const tokens = norm(kw).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  if (!tokens.length) return false;
  const variants = new Set<string>();
  for (const t of tokens) {
    variants.add(t);
    if (t.endsWith('es') && t.length > 4) variants.add(t.slice(0, -2));
    if (t.endsWith('s') && t.length > 3) variants.add(t.slice(0, -1));
  }
  const hay = norm(`${m.ad_title || ''} ${m.brand_name || ''}`);
  return [...variants].some((v) => hay.includes(v));
}

export async function scrapeTikTokAds(keyword: string, country: string, maxAds = 24): Promise<AnyRow[]> {
  const materials = await fetchTikTokMaterials(country);
  // Filtro por palabra clave en cliente (la API de TikTok con keyword=
  // devuelve 0 para casi todo; verificado en vivo 2026-10-20). NUNCA se
  // devuelve la lista generica sin filtrar.
  const kw = String(keyword || '').trim();
  let list = materials;
  let keywordFiltered = false;
  if (kw) {
    list = materials.filter((m: AnyRow) => tiktokKeywordMatch(m, kw));
    keywordFiltered = true;
  }
  const out = list.slice(0, maxAds).map((m: AnyRow) => {
  const vi = m.video_info || {};
  const likes = m.like != null ? String(m.like) : '';
  return {
    id: String(m.id || ''),
    advertiser: String(m.brand_name || m.advertiser_name || 'Anunciante'),
    pageName: String(m.brand_name || m.advertiser_name || 'Anunciante'),
    body: String(m.ad_title || m.desc || '').slice(0, 700),
    image: String(vi.cover || m.cover || ''),
    likes,
    ctr: m.ctr != null ? String(m.ctr) : '',
    startDate: '',
    url: m.id ? `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en` : '',
    source: 'tiktok',
    keywordFiltered,
  };
  });
      return out;
  return out;
}

// ---------------- Virales por pais (tablero inicial del Radar) ----------------

export interface ViralCategory { id: string; name: string; keyword: string; match: string[] }

export const VIRAL_CATEGORIES: ViralCategory[] = [
  { id: 'fajas', name: 'Fajas y moldeadores', keyword: 'fajas', match: ['faja', 'moldeadora', 'cinturilla', 'postquirurgica', 'corrector de postura'] },
  { id: 'belleza', name: 'Belleza y cuidado facial', keyword: 'protector solar', match: ['protector solar', 'skincare', 'crema facial', 'serum', 'skin care'] },
  { id: 'hogar', name: 'Hogar y cocina', keyword: 'freidora de aire', match: ['freidora', 'air fryer', 'organizador', 'aspiradora robot', 'licuadora portatil'] },
  { id: 'tecnologia', name: 'Tecnologia', keyword: 'mini proyector', match: ['proyector', 'auriculares', 'audifonos', 'reloj inteligente', 'smartwatch', 'parlante bluetooth'] },
  { id: 'bienestar', name: 'Bienestar y suplementos', keyword: 'colageno hidrolizado', match: ['colageno', 'magnesio', 'proteina', 'vitamina', 'suplemento', 'probioticos'] },
  { id: 'mascotas', name: 'Mascotas', keyword: 'arena para gatos', match: ['perro', 'gato', 'mascota', 'cachorro', 'arena para gatos'] },
  { id: 'capilar', name: 'Cuidado capilar', keyword: 'tratamiento capilar', match: ['capilar', 'cabello', 'keratina', 'shampoo', 'tratamiento capilar'] },
  { id: 'herramientas', name: 'Herramientas y mejoras del hogar', keyword: 'taladro', match: ['taladro', 'cinta selladora', 'sellador', 'destornillador electrico', 'atornillador', 'herramientas'] },
];


// Palabras por idioma: el tablero es mundial, pero cada pais busca en su
// idioma. Los nombres de categoria se quedan en espanol (la interfaz es
// para el usuario de Xorbit); lo que cambia es el termino de busqueda.
const VIRAL_L10N: Record<string, Record<string, { keyword: string; match: string[] }>> = {
  en: {
    fajas: { keyword: 'waist trainer', match: ['waist trainer', 'shapewear', 'posture corrector', 'corset'] },
    belleza: { keyword: 'sunscreen', match: ['sunscreen', 'skincare', 'face cream', 'serum', 'skin care'] },
    hogar: { keyword: 'air fryer', match: ['air fryer', 'organizer', 'robot vacuum', 'portable blender'] },
    tecnologia: { keyword: 'mini projector', match: ['projector', 'earbuds', 'headphones', 'smartwatch', 'bluetooth speaker'] },
    bienestar: { keyword: 'collagen peptides', match: ['collagen', 'magnesium', 'protein', 'vitamin', 'supplement', 'probiotics'] },
    mascotas: { keyword: 'cat litter', match: ['dog', 'cat', 'pet', 'puppy', 'cat litter'] },
    capilar: { keyword: 'hair treatment', match: ['hair treatment', 'keratin', 'shampoo', 'hair mask'] },
    herramientas: { keyword: 'cordless drill', match: ['drill', 'sealant tape', 'screwdriver', 'waterproof tape', 'tools'] },
  },
  pt: {
    fajas: { keyword: 'cinta modeladora', match: ['cinta modeladora', 'modeladora', 'corretor de postura'] },
    belleza: { keyword: 'protetor solar', match: ['protetor solar', 'skincare', 'creme facial', 'serum'] },
    hogar: { keyword: 'fritadeira eletrica', match: ['fritadeira', 'air fryer', 'organizador', 'aspirador robo'] },
    tecnologia: { keyword: 'mini projetor', match: ['projetor', 'fone de ouvido', 'relogio inteligente', 'smartwatch'] },
    bienestar: { keyword: 'colageno hidrolizado', match: ['colageno', 'magnesio', 'proteina', 'vitamina', 'suplemento'] },
    mascotas: { keyword: 'areia para gatos', match: ['cachorro', 'gato', 'pet', 'areia para gatos'] },
    capilar: { keyword: 'tratamento capilar', match: ['capilar', 'cabelo', 'queratina', 'shampoo'] },
    herramientas: { keyword: 'furadeira', match: ['furadeira', 'fita veda rosca', 'parafusadeira', 'ferramentas'] },
  },
  fr: {
    fajas: { keyword: 'gaine minceur', match: ['gaine', 'minceur', 'correcteur de posture', 'corset'] },
    belleza: { keyword: 'creme solaire', match: ['creme solaire', 'protection solaire', 'skincare', 'serum'] },
    hogar: { keyword: 'friteuse sans huile', match: ['friteuse', 'air fryer', 'organisateur', 'aspirateur robot'] },
    tecnologia: { keyword: 'mini projecteur', match: ['projecteur', 'ecouteurs', 'montre connectee', 'enceinte bluetooth'] },
    bienestar: { keyword: 'collagene', match: ['collagene', 'magnesium', 'proteines', 'vitamines', 'complement'] },
    mascotas: { keyword: 'litiere pour chat', match: ['chien', 'chat', 'litiere', 'animal'] },
    capilar: { keyword: 'soin capillaire', match: ['capillaire', 'cheveux', 'keratine', 'shampooing'] },
    herramientas: { keyword: 'perceuse', match: ['perceuse', 'ruban adhesif', 'visseuse', 'outils', 'etancheite'] },
  },
  de: {
    fajas: { keyword: 'Bauchwegguertel', match: ['bauchweg', 'mieder', 'haltung', 'korsett'] },
    belleza: { keyword: 'Sonnencreme', match: ['sonnencreme', 'sonnenschutz', 'gesichtscreme', 'serum'] },
    hogar: { keyword: 'Heissluftfritteuse', match: ['heissluftfritteuse', 'airfryer', 'organizer', 'saugroboter'] },
    tecnologia: { keyword: 'Mini Beamer', match: ['beamer', 'kopfhoerer', 'smartwatch', 'bluetooth lautsprecher'] },
    bienestar: { keyword: 'Kollagen', match: ['kollagen', 'magnesium', 'protein', 'vitamine', 'nahrungsergaenzung'] },
    mascotas: { keyword: 'Katzenstreu', match: ['hund', 'katze', 'katzenstreu', 'haustier'] },
    capilar: { keyword: 'Haarkur', match: ['haarkur', 'haare', 'keratin', 'shampoo'] },
    herramientas: { keyword: 'Akkuschrauber', match: ['akkuschrauber', 'bohrer', 'dichtband', 'werkzeug'] },
  },
  it: {
    fajas: { keyword: 'guaina snellente', match: ['guaina', 'snellente', 'correttore posturale', 'corsetto'] },
    belleza: { keyword: 'protezione solare', match: ['protezione solare', 'skincare', 'crema viso', 'siero'] },
    hogar: { keyword: 'friggitrice ad aria', match: ['friggitrice ad aria', 'organizer', 'robot aspirapolvere'] },
    tecnologia: { keyword: 'mini proiettore', match: ['proiettore', 'auricolari', 'smartwatch', 'cassa bluetooth'] },
    bienestar: { keyword: 'collagene', match: ['collagene', 'magnesio', 'proteine', 'vitamine', 'integratore'] },
    mascotas: { keyword: 'lettiera per gatti', match: ['cane', 'gatto', 'lettiera', 'cucciolo'] },
    capilar: { keyword: 'trattamento capelli', match: ['capelli', 'cheratina', 'shampoo', 'maschera capelli'] },
    herramientas: { keyword: 'trapano', match: ['trapano', 'avvitatore', 'nastro sigillante', 'utensili'] },
  },
};

const COUNTRY_LANG: Record<string, string> = {
  US: 'en', CA: 'en', GB: 'en', AU: 'en', IN: 'en', SG: 'en', JP: 'en', KR: 'en', AE: 'en',
  BR: 'pt', PT: 'pt', FR: 'fr', DE: 'de', IT: 'it',
};

function viralTermsFor(cat: ViralCategory, country: string): { keyword: string; match: string[] } {
  const lang = COUNTRY_LANG[String(country || 'CO').toUpperCase()] || 'es';
  return VIRAL_L10N[lang]?.[cat.id] || { keyword: cat.keyword, match: cat.match };
}

// Actividad TikTok por categoria para un pais: una sola captura de los Top
// Ads del pais y conteo local por palabras de cada categoria.
export async function tiktokVirales(country: string): Promise<{ total: number; categories: Record<string, { count: number; examples: string[] }> }> {
  const materials = await fetchTikTokMaterials(country);
  const categories: Record<string, { count: number; examples: string[] }> = {};
  for (const cat of VIRAL_CATEGORIES) {
    const terms = viralTermsFor(cat, country);
    const matched = materials.filter((m: AnyRow) => terms.match.some((w) => tiktokKeywordMatch(m, w)));
    const brands = new Map<string, number>();
    for (const m of matched) {
      const b = String(m.brand_name || m.advertiser_name || '').trim();
      if (b) brands.set(b, (brands.get(b) || 0) + 1);
    }
    const examples = [...brands.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b);
    categories[cat.id] = { count: matched.length, examples };
  }
  return { total: materials.length, categories };
}

// ---------------- Google Ads Transparency (scraper tolerante) ----------------

const GOOGLE_AT_PARSER = `(kw) => {
  const out = [];
  const seen = new Set();
  // Los resultados son links a creatividades: /advertiser/AR.../creative/CR...
  const links = Array.from(document.querySelectorAll('a[href*="/advertiser/"][href*="/creative/"]'));
  // Nombre del anunciante: sale en el encabezado de resultados.
  let advName = '';
  try {
    const h = document.querySelector('h1, h2');
    if (h && h.innerText && h.innerText.trim().length < 80) advName = h.innerText.trim();
  } catch (e) {}
  if (!advName) advName = String(kw || 'Anunciante');
  for (const a of links) {
    try {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\\/advertiser\\/(AR\\d+)\\/creative\\/(CR\\d+)/);
      if (!m) continue;
      const id = m[2];
      if (seen.has(id)) continue;
      seen.add(id);
      // La tarjeta de la creatividad: subir hasta un contenedor con imagen.
      let card = a;
      let img = '';
      for (let i = 0; i < 10 && card && card !== document.body; i++, card = card.parentElement) {
        try {
          const im = card.querySelector('img');
          if (im && im.getAttribute('src')) { img = im.getAttribute('src'); break; }
        } catch (e) {}
      }
      const cardTxt = (() => {
        try {
          let el = a;
          for (let i = 0; i < 6 && el && el !== document.body; i++, el = el.parentElement) {
            const t = (el.innerText || '').trim();
            if (t.length > 20 && t.length < 800) return t;
          }
        } catch (e) {}
        return '';
      })();
      out.push({
        id,
        advertiser: advName,
        pageName: advName,
        body: cardTxt.split('\\n').map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 4).join('\\n\\n').slice(0, 500),
        image: img,
        startDate: '',
        url: href.indexOf('http') === 0 ? href : 'https://adstransparency.google.com' + href,
      });
    } catch (e) {}
  }
  return out;
}`;

export async function scrapeGoogleAds(keyword: string, country: string, maxAds = 24): Promise<AnyRow[]> {
  return queueBrowserJob(async () => {
    try {
      const browser = await getBrowser();
      const page = await browser.newPage(browserPageOpts());
      try {
        const url = `https://adstransparency.google.com/?region=${encodeURIComponent(country.toUpperCase())}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        // La home es una SPA: hay que EJECUTAR la búsqueda. El buscador es un
        // input type="text" sin placeholder; al escribir muestra sugerencias
        // (role="option") y hay que CLICAR una para ir a la página del anunciante.
        await page.waitForTimeout(6000);
        let searched = false;
        const inputSels = [
          'input[placeholder*="Search" i]',
          'input[placeholder*="Buscar" i]',
          'input[type="search"]',
          'input[aria-label*="Search" i]',
          'input[aria-label*="Buscar" i]',
          'input[type="text"]:visible',
        ];
        for (const sel of inputSels) {
          try {
            const inp = page.locator(sel).first();
            if ((await inp.count()) === 0) continue;
            await inp.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
            await inp.click({ timeout: 5000 }).catch(() => {});
            await inp.fill(keyword, { timeout: 8000 }).catch(() => {});
            await page.waitForTimeout(2500);
            // Preferir clicar la primera sugerencia del autocomplete.
            const opt = page.locator('[role="option"]').first();
            if ((await opt.count()) > 0) {
              await opt.click({ timeout: 8000 }).catch(() => {});
              searched = true;
            } else {
              await inp.press('Enter').catch(() => {});
              searched = true;
            }
            break;
          } catch { /* siguiente selector */ }
        }
        if (!searched) return [];
        // Esperar resultados: enlaces a /advertiser/ (tarjetas de anunciantes).
        await page.waitForFunction(
          () => document.querySelectorAll('a[href*="/advertiser/"]').length > 0,
          { timeout: 25000 }
        ).catch(() => {});
        // Scroll suave por si hay lazy-load de más resultados.
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
          await page.waitForTimeout(1000);
        }
        const raw: AnyRow[] = await page.evaluate(`(${GOOGLE_AT_PARSER})(${JSON.stringify(keyword)})`);
        return raw.slice(0, maxAds).map((a) => ({ ...a, source: 'google', activeDays: activeDays(a.startDate) }));
      } finally {
        await page.close().catch(() => {});
      }
    } catch {
      return [];
    }
  });
}

// ---------------- Analizador de tiendas ----------------

const STORE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function httpGetText(url: string, timeoutMs = 20000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': STORE_UA, Accept: 'text/html,application/xhtml+xml' },
      signal: ctl.signal,
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`La tienda respondió ${r.status}.`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

async function httpGetJson(url: string, timeoutMs = 15000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': STORE_UA, Accept: 'application/json' },
      signal: ctl.signal,
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function metaContent(html: string, prop: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
  if (m) return m[1];
  const m2 = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
  );
  return m2 ? m2[1] : '';
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]{1,200})<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function extractJsonLdProducts(html: string): AnyRow[] {
  const out: AnyRow[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const pushProduct = (p: any) => {
    if (!p || typeof p !== 'object') return;
    const types = Array.isArray(p['@type']) ? p['@type'] : [p['@type']];
    if (!types.some((t: any) => String(t).toLowerCase() === 'product')) return;
    const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
    const img = Array.isArray(p.image) ? p.image[0] : p.image;
    out.push({
      name: String(p.name || 'Producto'),
      price: offers?.price != null ? String(offers.price) : '',
      image: typeof img === 'string' ? img : img?.url || '',
      url: String(p.url || ''),
    });
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = Array.isArray(data) ? data : data?.['@graph'] || [data];
      for (const n of nodes) pushProduct(n);
    } catch { /* bloque JSON-LD inválido */ }
  }
  return out;
}

// Detecta la plataforma y extrae el catálogo de productos de una tienda.
export async function analyzeStore(url: string): Promise<{
  platform: string;
  title: string;
  currency: string;
  products: AnyRow[];
  productCount: number;
}> {
  let clean = String(url || '').trim();
  if (!clean) throw new Error('Indica la URL de la tienda.');
  if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
  let u: URL;
  try {
    u = new URL(clean);
  } catch {
    throw new Error('La URL de la tienda no es válida.');
  }
  const origin = u.origin;
  const html = await httpGetText(u.toString());

  const title = metaContent(html, 'og:title') || extractTitle(html) || u.hostname;
  const currency = metaContent(html, 'og:price:currency');
  const products: AnyRow[] = [];
  let platform = 'personalizada';

  // Shopify: cdn.shopify.com en el HTML o /products.json vivo (límite 50).
  let shopifyList: any[] = [];
  try {
    const pj = await httpGetJson(origin + '/products.json?limit=250');
    if (Array.isArray(pj?.products)) shopifyList = pj.products;
  } catch { /* no es Shopify por API */ }
  if (/cdn\.shopify\.com/i.test(html) || shopifyList.length) {
    platform = 'shopify';
    for (const p of shopifyList.slice(0, 50)) {
      const v = (p.variants && p.variants[0]) || {};
      products.push({
        name: String(p.title || 'Producto'),
        price: String(v.price ?? p.price ?? ''),
        image: (p.images && p.images[0] && p.images[0].src) || '',
        url: origin + '/products/' + (p.handle || ''),
      });
    }
  }

  // WooCommerce: wp-content + woocommerce en el HTML o Store API viva.
  if (!products.length) {
    let wooList: any[] = [];
    try {
      const wj = await httpGetJson(origin + '/wp-json/wc/store/products?per_page=50');
      if (Array.isArray(wj)) wooList = wj;
    } catch { /* no es Woo por API */ }
    if ((/wp-content/i.test(html) && /woocommerce/i.test(html)) || wooList.length) {
      platform = 'woocommerce';
      for (const p of wooList.slice(0, 50)) {
        const minor = p.prices?.price != null ? Number(p.prices.price) : NaN;
        products.push({
          name: String(p.name || 'Producto'),
          price: !isNaN(minor) ? String(minor / 100) : String(p.price || ''),
          image: (p.images && p.images[0] && p.images[0].src) || '',
          url: p.permalink || origin,
        });
      }
    }
  }

  // Fallback: JSON-LD (Product) u Open Graph para tiendas personalizadas.
  if (!products.length) {
    for (const p of extractJsonLdProducts(html).slice(0, 50)) {
      products.push({ name: p.name, price: p.price, image: p.image, url: p.url || origin });
    }
    if (!products.length && metaContent(html, 'og:title')) {
      products.push({
        name: metaContent(html, 'og:title'),
        price: metaContent(html, 'og:price:amount'),
        image: metaContent(html, 'og:image'),
        url: u.toString(),
      });
    }
  }

  return { platform, title, currency, products, productCount: products.length };
}

// ---------------- Persistencia Supabase ----------------

async function sbInsert(table: string, rows: AnyRow[]): Promise<void> {
  try {
    const client = getSupabase();
    if (!client || !rows.length) return;
    await client.from(table).insert(rows);
  } catch { /* fire-and-forget: nunca bloquea la respuesta */ }
}

// Guarda la búsqueda del usuario (fire-and-forget).
function logRadarSearch(userEmail: string, kind: string, keyword: string, country: string, source: string) {
  void sbInsert('radar_searches', [
    { user_email: userEmail || '', kind, keyword: keyword || '', country: country || '', source: source || '' },
  ]).catch(() => {});
}

// Guarda los anuncios detectados para alimentar alertas y el cron (fire-and-forget).
function persistRadarAds(source: string, keyword: string, country: string, ads: AnyRow[]) {
  const rows = ads.slice(0, 60).map((a) => ({
    source,
    external_id: String(a.id || ''),
    keyword,
    country,
    page_name: String(a.pageName || a.advertiser || ''),
    body: String(a.body || '').slice(0, 2000),
    image_url: String(a.image || ''),
    start_date: String(a.startDate || ''),
    active_days: a.activeDays ?? null,
    platforms: Array.isArray(a.platforms) ? a.platforms : [],
    url: String(a.url || ''),
  }));
  void sbInsert('radar_ads', rows).catch(() => {});
}

function persistRadarStore(analysisUrl: string, a: AnyRow) {
  void sbInsert('radar_stores', [
    {
      url: analysisUrl,
      platform: a.platform || 'personalizada',
      title: String(a.title || '').slice(0, 300),
      currency: String(a.currency || ''),
      product_count: Number(a.productCount || 0),
    },
  ]).catch(() => {});
}

// ---------------- Clave OpenRouter (env → DB cifrada → app_settings) ----------------

async function resolveRadarAiKey(): Promise<string> {
  const envKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  if (envKey) return envKey;
  try {
    const raw = String((getDB() as any).openrouterApiKey || '');
    if (raw) {
      const plain = (isEncryptedSecret(raw) ? decryptSecret(raw) : raw).trim();
      if (plain) return plain;
    }
  } catch { /* noop */ }
  try {
    const client = getSupabase();
    if (client) {
      const { data } = await client.from('app_settings').select('value').eq('key', 'openrouterApiKey').limit(1);
      const raw = data?.[0]?.value ? String(data[0].value) : '';
      if (raw) return (isEncryptedSecret(raw) ? decryptSecret(raw) : raw).trim();
    }
  } catch { /* noop */ }
  return '';
}

// ---------------- Cuotas y paywall ----------------

// Admin y superadmin pasan siempre. Para los demás: el módulo de billing
// (getRadarTier / consumeRadarSearch) decide la cuota; si aún no está
// disponible, se niega el acceso por defecto (fail-closed).
function radarTierOf(email: string): string {
  try {
    const fn = (billingModule as any).getRadarTier;
    if (typeof fn === 'function') return String(fn(getDB, email) || 'none');
  } catch { /* noop */ }
  return 'none';
}

function radarConsume(email: string): boolean {
  try {
    const fn = (billingModule as any).consumeRadarSearch;
    if (typeof fn === 'function') return fn(getDB, saveDB, email) === true;
  } catch { /* noop */ }
  return false;
}

// Tablero Virales: visible para cualquier sesión (modelo freemium: ver gratis,
// buscar pagando). No exige tier del Radar ni consume créditos de búsqueda.
function radarSessionGate(req: any, res: any, next: any) {
  try {
    const session: any = getSession(req);
    const email = String(session?.email || session?.sub || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ success: false, error: 'Inicia sesión para usar el Radar de Anuncios.' });
    }
    req.radarUser = email;
    return next();
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'No se pudo verificar tu sesión.' });
  }
}

function radarGate(req: any, res: any, next: any) {
  try {
    const session: any = getSession(req);
    const role = String(session?.role || '').toLowerCase();
    if (role === 'admin' || role === 'superadmin') {
      req.radarUser = String(session?.email || '').trim().toLowerCase();
      return next();
    }
    const email = String(session?.email || session?.sub || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ success: false, error: 'Inicia sesión para usar el Radar de Anuncios.' });
    }
    const tier = radarTierOf(email);
    if (tier === 'none') {
      return res.status(402).json({
        success: false,
        paywall: true,
        product: 'radar',
        error: 'El Radar de Anuncios requiere una suscripción activa. Activa tu plan para seguir espiando.',
      });
    }
    if (!radarConsume(email)) {
      return res.status(402).json({
        success: false,
        paywall: true,
        product: 'radar',
        error: 'Agotaste las búsquedas del Radar de tu plan. Mejora tu plan o espera el próximo ciclo.',
      });
    }
    req.radarUser = email;
    return next();
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'No se pudo verificar tu suscripción.' });
  }
}

// ---------------- Rutas ----------------



export function setupRadarRoutes(app: express.Express) {
  const router = express.Router();

  router.get('/countries', (_req, res) => {
    res.json({ success: true, countries: RADAR_COUNTRIES });
  });

  // Espía de anuncios (caché 6h). source: meta | tiktok | google | all.
  router.post('/ads/search', radarGate, async (req, res) => {
    try {
      const keyword = String(req.body?.keyword || '').trim();
      const country = String(req.body?.country || 'CO').toUpperCase();
      const platform = String(req.body?.platform || 'all');
      const sort = String(req.body?.sort || 'oldest');
      const source = ['meta', 'tiktok', 'google', 'all'].includes(String(req.body?.source || 'meta'))
        ? String(req.body.source)
        : 'meta';
      const limit = Math.min(48, Math.max(6, Number(req.body?.limit) || 24));
      if (!keyword) return res.status(400).json({ success: false, error: 'Escribe una palabra clave para espiar.' });
      const userEmail = String((req as any).radarUser || '');
      const db = getDB();
      const store = radarStore(db);
      const key = `ads:${source}:${country}:${keyword.toLowerCase()}`;
      const hit = store.cache[key];
      let ads: AnyRow[];
      let cached = false;
      if (hit && Date.now() - hit.at < ADS_CACHE_TTL) {
        ads = hit.data;
        cached = true;
      } else {
        const sources = source === 'all' ? ['meta', 'tiktok', 'google'] : [source];
        const perSource = Math.max(6, Math.ceil(limit / sources.length));
        // Fuentes EN PARALELO: el tiempo total es el de la fuente más lenta,
        // no la suma. Meta usa su propia cola con gap anti-rate-limit;
        // TikTok/Google usan otra cola (ver queueBrowserJob).
        const perSourceResults = await Promise.all(
          sources.map(async (s) => {
            try {
              if (s === 'meta') return await scrapeAdLibrary(keyword, country, perSource);
              if (s === 'tiktok') return await scrapeTikTokAds(keyword, country, perSource);
              return await scrapeGoogleAds(keyword, country, perSource);
            } catch { /* una fuente caída no tumba la búsqueda */ return []; }
          })
        );
        const all: AnyRow[] = perSourceResults.flat();
        // Deduplicar por fuente+id y ordenar por antigüedad activa.
        const seen = new Set<string>();
        ads = all
          .filter((a) => {
            const k = `${a.source || source}:${a.id}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .slice(0, limit);
        // No cachear resultados vacíos: puede ser rate-limit o error de la fuente.
        // Así la próxima llamada reintenta el scrape en vez de servir el vacío 6h.
        if (ads.length > 0) {
          store.cache[key] = { at: Date.now(), data: ads };
          saveDB();
        }
        if (!cached) {
          for (const s of sources) {
            persistRadarAds(s, keyword, country, ads.filter((a) => (a.source || source) === s));
          }
          logRadarSearch(userEmail, 'ads', keyword, country, source);
        }
      }
      let list = ads;
      if (platform !== 'all') {
        const want = platform === 'instagram' ? 'Instagram' : 'Facebook';
        list = list.filter((a) => (a.platforms || []).includes(want));
      }
      list = [...list].sort((a, b) =>
        sort === 'oldest' ? (b.activeDays ?? -1) - (a.activeDays ?? -1) : (a.activeDays ?? 9999) - (b.activeDays ?? 9999)
      );
      const sourceNames: Record<string, string> = {
        meta: 'Meta Ad Library pública',
        tiktok: 'TikTok Creative Center',
        google: 'Google Ads Transparency',
        all: 'Múltiples fuentes (Meta, TikTok, Google)',
      };
      res.json({
        success: true,
        cached,
        source: sourceNames[source] || source,
        sourceNote: 'La antigüedad activa es la mejor señal: un anuncio que lleva meses corriendo suele ser ganador.',
        ads: list,
      });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo espiar los anuncios. Intenta de nuevo en un minuto.');
    }
  });

  // Tendencia 12 meses de una palabra clave.
  router.get('/trends/interest', radarGate, async (req, res) => {
    try {
      const keyword = String(req.query.keyword || '').trim();
      const country = String(req.query.country || 'CO').toUpperCase();
      if (!keyword) return res.status(400).json({ success: false, error: 'Indica una palabra clave.' });
      const userEmail = String((req as any).radarUser || '');
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
        // No cachear vacío: puede ser error/rate-limit de Trends.
        if (points.length > 0) {
          store.cache[key] = { at: Date.now(), data: points };
          saveDB();
        }
        logRadarSearch(userEmail, 'trends-interest', keyword, country, 'google-trends');
      }
      res.json({ success: true, cached, source: 'Google Trends', points });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo consultar Google Trends.');
    }
  });

  // Búsquedas relacionadas en aumento (señal de productos en tendencia).
  router.get('/trends/related', radarGate, async (req, res) => {
    try {
      const keyword = String(req.query.keyword || '').trim();
      const country = String(req.query.country || 'CO').toUpperCase();
      if (!keyword) return res.status(400).json({ success: false, error: 'Indica una palabra clave.' });
      const userEmail = String((req as any).radarUser || '');
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
        // No cachear vacío: puede ser error/rate-limit de Trends.
        if (data.rising.length > 0 || data.top.length > 0) {
          store.cache[key] = { at: Date.now(), data };
          saveDB();
        }
        logRadarSearch(userEmail, 'trends-related', keyword, country, 'google-trends');
      }
      res.json({ success: true, cached, source: 'Google Trends', ...data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo consultar Google Trends.');
    }
  });

  // Análisis profundo de anuncios con LLM (OpenRouter).
  // Tablero inicial: productos virales por pais. Tendencias de Google por
  // categoria precargada, frescas en cada apertura (con la cache corta de
  // related compartida para no quemar la cuota de Trends).
  router.get('/virales', radarSessionGate, async (req, res) => {
    try {
      const country = String(req.query.country || 'CO').toUpperCase();
      const db = getDB();
      const store = radarStore(db);
      // Secuencial con pausa: Google Trends limita las consultas related en
      // paralelo desde la misma IP (verificado con GT: en paralelo 1/6
      // categorias, individual 6/6). Un reintento si una categoria sale vacia.
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const categories: AnyRow[] = [];
      for (const cat of VIRAL_CATEGORIES) {
        const terms = viralTermsFor(cat, country);
        const key = `related:${country}:${terms.keyword.toLowerCase()}`;
        const hit = store.cache[key];
        let data: { rising: AnyRow[]; top: AnyRow[] };
        if (hit && Date.now() - hit.at < TRENDS_CACHE_TTL) {
          data = hit.data;
        } else {
          data = await trendsRelated(terms.keyword, country).catch(() => ({ rising: [], top: [] }));
          if (!(data.rising.length > 0 || data.top.length > 0)) {
            await sleep(2000);
            data = await trendsRelated(terms.keyword, country).catch(() => ({ rising: [], top: [] }));
          }
          if (data.rising.length > 0 || data.top.length > 0) {
            store.cache[key] = { at: Date.now(), data };
            saveDB();
          }
        }
        categories.push({
          id: cat.id, name: cat.name, keyword: terms.keyword,
          top: (data.top || []).slice(0, 5), rising: (data.rising || []).slice(0, 5),
        });
        await sleep(800);
      }
      res.json({ success: true, country, categories });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cargar el tablero de virales.');
    }
  });

  // Actividad de TikTok por categoria (una captura por pais, cache 30 min:
  // la captura con navegador es costosa y la cuota de TikTok es fragil).
  router.get('/virales/tiktok', radarSessionGate, async (req, res) => {
    try {
      const country = String(req.query.country || 'CO').toUpperCase();
      const db = getDB();
      const store = radarStore(db);
      const key = `virales:tiktok:${country}`;
      const hit = store.cache[key];
      if (hit && Date.now() - hit.at < 30 * 60 * 1000) {
        return res.json({ success: true, country, cached: true, cachedAt: hit.at, ...hit.data });
      }
      const data = await tiktokVirales(country);
      if (data.total > 0) {
        store.cache[key] = { at: Date.now(), data };
        saveDB();
      }
      res.json({ success: true, country, cached: false, ...data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cargar la actividad de TikTok.');
    }
  });

  router.post('/analyze', radarGate, async (req, res) => {
    try {
      const ads = Array.isArray(req.body?.ads) ? req.body.ads.slice(0, 12) : [];
      if (!ads.length) {
        return res.status(400).json({ success: false, error: 'Envía al menos un anuncio para analizar.' });
      }
      const userEmail = String((req as any).radarUser || '');
      const key = await resolveRadarAiKey();
      if (!key) {
        return res.status(503).json({
          success: false,
          error:
            'Análisis IA no disponible: falta la clave de OpenRouter. Configúrala en Súper Admin → Configuración General → Proveedor IA.',
        });
      }
      const model = String(process.env.OPENROUTER_RESPONSE_MODEL || 'openai/gpt-4o-mini').trim();
      const brief = ads
        .map(
          (a: any, i: number) =>
            `Anuncio ${i + 1}: ${a.pageName || a.advertiser || '?'} | ${String(a.body || '').slice(0, 300)} | ` +
            `fuente: ${a.source || '?'} | activo ${a.activeDays ?? '?'} días` +
            (a.likes ? ` | me gusta: ${a.likes}` : '')
        )
        .join('\n');
      const prompt =
        'Eres un analista experto en publicidad de respuesta directa para e-commerce en Latinoamérica. ' +
        'Analiza estos anuncios ganadores (los que llevan más días activos suelen vender más) y responde ' +
        'SOLO con un JSON válido, sin texto adicional, con esta forma exacta:\n' +
        '{"score": 0-100, "hooks": ["..."], "angles": ["..."], "whyItSells": "...", "risks": ["..."], "suggestedNiche": "..."}\n\n' +
        'ANUNCIOS:\n' +
        brief;
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 30000);
      let rawText = '';
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
          }),
          signal: ctl.signal,
        });
        if (!r.ok) throw new Error(`OpenRouter respondió ${r.status}.`);
        const data: any = await r.json();
        rawText = String(data?.choices?.[0]?.message?.content || '');
      } finally {
        clearTimeout(timer);
      }
      let analysis: AnyRow | null = null;
      try {
        // Quitar cercas ```json / ``` que el modelo a veces agrega, y luego
        // extraer el objeto JSON (greedy: primera { hasta la última }).
        const clean = rawText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        const m = clean.match(/\{[\s\S]*\}/);
        if (m) analysis = JSON.parse(m[0]);
      } catch { /* respuesta no parseable */ }
      logRadarSearch(userEmail, 'analyze', `análisis de ${ads.length} anuncios`, '', 'llm');
      res.json({
        success: true,
        model,
        analysis: analysis || {
          score: 0,
          hooks: [],
          angles: [],
          whyItSells: '',
          risks: [],
          suggestedNiche: '',
          raw: rawText.slice(0, 2000),
        },
      });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo completar el análisis.');
    }
  });

  // Analiza la tienda de un competidor: plataforma + catálogo de productos.
  router.post('/store/analyze', radarGate, async (req, res) => {
    try {
      const url = String(req.body?.url || '').trim();
      const userEmail = String((req as any).radarUser || '');
      const analysis = await analyzeStore(url);
      persistRadarStore(url, analysis);
      logRadarSearch(userEmail, 'store', url, '', 'store-analyzer');
      res.json({ success: true, store: analysis });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo analizar la tienda.');
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
