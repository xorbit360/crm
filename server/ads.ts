// server/ads.ts
// Módulo Ads: herramienta de Tráfico con TODAS las funciones de Zernio Ads API.
// Una sola integración → 7 plataformas: Meta, Google, TikTok, LinkedIn,
// Pinterest, X, OpenAI Ads. Base: https://zernio.com/api/v1/ads

import express from 'express';
import { zernioRequest } from './zernio/client.ts';

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

function adsCfg(db: any): AnyRow {
  if (!db.adsZernio || typeof db.adsZernio !== 'object') db.adsZernio = {};
  return db.adsZernio;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Meta (Facebook)', needsConnection: 'facebook' },
  { id: 'instagram', name: 'Instagram Ads', needsConnection: 'facebook' },
  { id: 'tiktok', name: 'TikTok Ads', needsConnection: 'tiktokads' },
  { id: 'google', name: 'Google Ads', needsConnection: 'google' },
  { id: 'linkedin', name: 'LinkedIn Ads', needsConnection: 'linkedin' },
  { id: 'pinterest', name: 'Pinterest Ads', needsConnection: 'pinterest' },
  { id: 'twitter', name: 'X (Twitter) Ads', needsConnection: 'twitterads' },
];

/** Traduce errores de Zernio Ads a español amigable. */
function translateAdsError(err: any): string {
  const code = String(err?.code || '');
  const msg = String(err?.message || err?.error || '');
  if (code === 'addon_required' || /ads add-?on required/i.test(msg)) {
    return 'Tu cuenta no tiene el add-on de anuncios. Actívalo: los primeros 500 anuncios activos son gratis.';
  }
  if (code === 'linked_account_required' || /connected facebook account is required/i.test(msg)) {
    return 'Conecta una cuenta de Facebook en Zernio para gestionar anuncios de Meta/Instagram.';
  }
  if (code === 'platform_connection_required' || /platform ads connection required/i.test(msg)) {
    return 'Esa plataforma necesita su conexión de anuncios antes de usarse (TikTok: conecta TikTok Ads; X: conecta X Ads).';
  }
  if (/missing_required_field/i.test(code) || /missing required/i.test(msg)) {
    return 'Falta un dato obligatorio: ' + (err?.param ? '(' + err.param + ') ' : '') + msg;
  }
  return msg || 'El proveedor rechazó la solicitud.';
}

async function zads(path: string, opts: { method?: string; body?: any; query?: AnyRow } = {}): Promise<any> {
  const { method = 'GET', body, query } = opts;
  let fullPath = path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) fullPath += (path.includes('?') ? '&' : '?') + s;
  }
  const r = await zernioRequest({ method, path: fullPath, body });
  if ((r as any)?.success === false) {
    const e: any = new Error(translateAdsError((r as any).error));
    e.zernioCode = (r as any).error?.code;
    e.zernioRaw = (r as any).error;
    throw e;
  }
  return (r as any)?.data ?? r;
}

function errJson(res: any, e: any, fallback: string) {
  const out: AnyRow = { success: false, error: e?.message || fallback };
  if (e?.zernioCode) out.code = e.zernioCode;
  return res.status(400).json(out);
}

function pickAccountId(db: any, req: any): string {
  const cfg = adsCfg(db);
  return String(req.query?.accountId || req.body?.accountId || cfg.accountId || '').trim();
}

export function setupAdsRoutes(app: express.Express) {
  const router = express.Router();

  // ---------- Estado ----------
  router.get('/status', async (_req, res) => {
    try {
      const db = getDB();
      const cfg = adsCfg(db);
      let zernioAccounts: any[] = [];
      let adsAddonActive: boolean | null = null;
      try {
        const accs = await zads('/v1/accounts', { query: { page: 1, limit: 50 } });
        const list = accs.accounts || accs.data || [];
        zernioAccounts = list.map((a: any) => ({
          id: a._id || a.id,
          platform: a.platform,
          username: a.username || a.displayName || a.name,
          isActive: a.isActive !== false,
        }));
      } catch { /* sin cuentas legibles */ }
      try {
        await zads('/v1/ads', { query: { limit: 1 } });
        adsAddonActive = true;
      } catch (e: any) {
        adsAddonActive = /add-on/i.test(e?.message || '') ? false : null;
      }
      if (!cfg.accountId && zernioAccounts.length > 0) {
        cfg.accountId = zernioAccounts[0].id;
        saveDB();
      }
      res.json({
        success: true,
        connected: zernioAccounts.length > 0,
        adsAddonActive,
        zernioAccounts,
        selectedAccountId: cfg.accountId || null,
        selectedAdAccountId: cfg.adAccountId || null,
        selectedPlatform: cfg.platform || 'facebook',
        platforms: PLATFORMS,
        costNote: 'Primeros 500 anuncios activos gratis; luego $0.01 por anuncio activo/mes.',
      });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo verificar el estado de Ads.');
    }
  });

  router.post('/select-account', (req, res) => {
    try {
      const db = getDB();
      const cfg = adsCfg(db);
      if (req.body?.accountId) cfg.accountId = String(req.body.accountId);
      if (req.body?.adAccountId) cfg.adAccountId = String(req.body.adAccountId);
      if (req.body?.platform) cfg.platform = String(req.body.platform);
      saveDB();
      res.json({ success: true, selected: { accountId: cfg.accountId || null, adAccountId: cfg.adAccountId || null, platform: cfg.platform || null } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  // ---------- Cuentas publicitarias ----------
  router.get('/accounts', async (req, res) => {
    try {
      const db = getDB();
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      const data = await zads('/v1/ads/accounts', { query: { accountId, platform: req.query?.platform || undefined } });
      res.json({ success: true, adAccounts: data.accounts || data.data || data.adAccounts || [] });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron cargar las cuentas publicitarias.');
    }
  });

  // ---------- Listado ----------
  router.get('/list', async (req, res) => {
    try {
      const db = getDB();
      const cfg = adsCfg(db);
      const q: AnyRow = {
        platform: req.query?.platform || cfg.platform || undefined,
        status: req.query?.status || undefined,
        campaignId: req.query?.campaignId || undefined,
        fromDate: req.query?.fromDate || undefined,
        toDate: req.query?.toDate || undefined,
        source: 'all',
        page: req.query?.page || 1,
        limit: Math.min(500, Number(req.query?.limit || 50)),
      };
      if (cfg.adAccountId) q.adAccountId = cfg.adAccountId;
      const data = await zads('/v1/ads', { query: q });
      res.json({ success: true, ads: data.ads || data.data || [], pagination: data.pagination || null });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron cargar los anuncios.');
    }
  });

  // Compat con frontend actual
  router.get('/campaigns', async (req, res) => {
    try {
      const db = getDB();
      const cfg = adsCfg(db);
      const data = await zads('/v1/ads/campaigns', {
        query: { accountId: pickAccountId(db, req) || undefined, platform: (req.query?.platform as string) || cfg.platform || undefined, limit: 100 },
      });
      const campaigns = (data.campaigns || data.data || []).map((c: any) => ({
        id: c.id || c.campaignId,
        name: c.name,
        status: String(c.status || '').toUpperCase(),
        platform: c.platform || cfg.platform || 'facebook',
        objective: c.objective || null,
        metrics: {
          impressions: Number(c.metrics?.impressions ?? c.impressions ?? 0),
          clicks: Number(c.metrics?.clicks ?? c.clicks ?? 0),
          spend: Number(c.metrics?.spend ?? c.spend ?? 0),
          ctr: Number(c.metrics?.ctr ?? c.ctr ?? 0),
          cpc: Number(c.metrics?.cpc ?? c.cpc ?? 0),
          conversions: Number(c.metrics?.conversions ?? c.conversions ?? 0),
        },
        adsCount: c.adsCount ?? c.ads_count ?? null,
      }));
      res.json({ success: true, connected: true, campaigns });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron cargar las campañas.');
    }
  });

  router.get('/tree', async (req, res) => {
    try {
      const db = getDB();
      const data = await zads('/v1/ads/tree', {
        query: { accountId: pickAccountId(db, req) || undefined, platform: (req.query?.platform as string) || undefined, limit: 100 },
      });
      res.json({ success: true, tree: data.campaigns || data.tree || data.data || [] });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cargar la jerarquía.');
    }
  });

  // ---------- Detalle / actualizar / eliminar ad ----------
  router.get('/:id', async (req, res) => {
    try {
      const data = await zads('/v1/ads/' + encodeURIComponent(req.params.id));
      res.json({ success: true, ad: (data as any).ad || data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cargar el anuncio.');
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const b = req.body || {};
      const body: AnyRow = {};
      if (b.status) body.status = String(b.status).toLowerCase(); // active|paused
      if (b.name) body.name = String(b.name);
      if (b.budget) body.budget = b.budget; // { amount, type }
      if (b.dailyBudget !== undefined) body.budget = { amount: Number(b.dailyBudget), type: 'daily' };
      if (b.targeting) body.targeting = b.targeting;
      const data = await zads('/v1/ads/' + encodeURIComponent(req.params.id), { method: 'PUT', body });
      res.json({ success: true, ad: (data as any).ad || data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo actualizar el anuncio.');
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await zads('/v1/ads/' + encodeURIComponent(req.params.id), { method: 'DELETE' });
      res.json({ success: true, id: req.params.id });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cancelar el anuncio.');
    }
  });

  // ---------- Campañas: pausar/reanudar/eliminar ----------
  router.put('/campaigns/:id/status', async (req, res) => {
    try {
      const status = String(req.body?.status || '').toLowerCase();
      if (!['paused', 'active'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Estado inválido: usa paused o active.' });
      }
      const data = await zads('/v1/ads/campaigns/' + encodeURIComponent(req.params.id) + '/status', {
        method: 'PUT',
        body: { status, platform: req.body?.platform || undefined },
      });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cambiar el estado de la campaña.');
    }
  });

  router.delete('/campaigns/:id', async (req, res) => {
    try {
      await zads('/v1/ads/campaigns/' + encodeURIComponent(req.params.id), { method: 'DELETE' });
      res.json({ success: true, id: req.params.id });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo eliminar la campaña.');
    }
  });

  // Compat: crear/actualizar simple (frontend anterior)
  router.post('/create-campaign', async (req, res) => {
    try {
      const db = getDB();
      const cfg = adsCfg(db);
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      const data = await zads('/v1/ads/create', {
        method: 'POST',
        body: {
          accountId,
          adAccountId: req.body?.adAccountId || cfg.adAccountId || undefined,
          name: String(req.body?.name || 'Nueva campaña'),
          goal: String(req.body?.objective || req.body?.goal || 'traffic'),
          budgetAmount: Number(req.body?.dailyBudget || req.body?.budget || 5),
          budgetType: 'daily',
          headline: String(req.body?.name || 'Nueva campaña'),
          body: String(req.body?.message || ''),
          linkUrl: req.body?.linkUrl || undefined,
        },
      });
      res.json({ success: true, realCreated: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo crear la campaña.');
    }
  });

  router.post('/update-campaign', async (req, res) => {
    try {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'Falta el id.' });
      const body: AnyRow = {};
      if (req.body?.status) body.status = String(req.body.status).toLowerCase() === 'active' ? 'active' : 'paused';
      if (req.body?.dailyBudget !== undefined) body.budget = { amount: Number(req.body.dailyBudget), type: 'daily' };
      const data = await zads('/v1/ads/' + encodeURIComponent(id), { method: 'PUT', body });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo actualizar.');
    }
  });

  // ---------- Analítica ----------
  router.get('/:id/analytics', async (req, res) => {
    try {
      const data = await zads('/v1/ads/' + encodeURIComponent(req.params.id) + '/analytics', {
        query: {
          fromDate: req.query?.fromDate || undefined,
          toDate: req.query?.toDate || undefined,
          breakdowns: req.query?.breakdowns || undefined, // age,gender,country
        },
      });
      const a: any = (data as any).analytics || data;
      res.json({
        success: true,
        summary: a.summary || null,
        daily: a.daily || [],
        breakdowns: a.breakdowns || null,
      });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cargar la analítica.');
    }
  });

  // ---------- Crear: boost / standalone / messaging ----------
  router.post('/boost', async (req, res) => {
    try {
      const db = getDB();
      const b = req.body || {};
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      if (!b.postId && !b.platformPostId) {
        return res.status(400).json({ success: false, error: 'Indica el post a promocionar (postId o platformPostId).' });
      }
      const data = await zads('/v1/ads/boost', {
        method: 'POST',
        body: {
          accountId,
          adAccountId: b.adAccountId || adsCfg(db).adAccountId || undefined,
          postId: b.postId || undefined,
          platformPostId: b.platformPostId || undefined,
          name: String(b.name || 'Boost'),
          goal: String(b.goal || 'engagement'),
          budget: { amount: Number(b.budgetAmount || 5), type: String(b.budgetType || 'daily') },
          currency: String(b.currency || 'USD'),
          targeting: b.targeting || { ageMin: 18, ageMax: 65, countries: ['CO'] },
          callToAction: b.callToAction || undefined,
          whatsappPhoneNumber: b.whatsappPhoneNumber || undefined,
        },
      });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo promocionar el post.');
    }
  });

  router.post('/create', async (req, res) => {
    try {
      const db = getDB();
      const b = req.body || {};
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      if (!b.headline || !b.body) {
        return res.status(400).json({ success: false, error: 'Título y texto del anuncio son obligatorios.' });
      }
      const data = await zads('/v1/ads/create', {
        method: 'POST',
        body: {
          accountId,
          adAccountId: b.adAccountId || adsCfg(db).adAccountId || undefined,
          name: String(b.name || b.headline),
          goal: String(b.goal || 'traffic'),
          budgetAmount: Number(b.budgetAmount || 5),
          budgetType: String(b.budgetType || 'daily'),
          currency: String(b.currency || 'USD'),
          headline: String(b.headline),
          body: String(b.body),
          linkUrl: b.linkUrl || undefined,
          imageUrl: b.imageUrl || undefined,
          callToAction: b.callToAction || 'LEARN_MORE',
          countries: b.countries || ['CO'],
          ageMin: b.ageMin || 18,
          ageMax: b.ageMax || 65,
          interests: b.interests || undefined,
        },
      });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo crear el anuncio.');
    }
  });

  router.post('/messaging', async (req, res) => {
    try {
      const db = getDB();
      const b = req.body || {};
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      const data = await zads('/v1/ads/messaging', {
        method: 'POST',
        body: {
          accountId,
          adAccountId: b.adAccountId || adsCfg(db).adAccountId || undefined,
          name: String(b.name || 'Click to WhatsApp'),
          destination: String(b.destination || 'whatsapp'), // whatsapp | messenger | instagram_direct
          whatsappPhoneNumber: b.whatsappPhoneNumber || undefined,
          budget: { amount: Number(b.budgetAmount || 5), type: String(b.budgetType || 'daily') },
          currency: String(b.currency || 'USD'),
          creatives: b.creatives || (b.headline && b.body ? [{ headline: b.headline, body: b.body, imageUrl: b.imageUrl, linkUrl: b.linkUrl }] : undefined),
          targeting: b.targeting || { ageMin: 18, ageMax: 65, countries: ['CO'] },
        },
      });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo crear el anuncio de mensajería.');
    }
  });

  router.get('/interests', async (req, res) => {
    try {
      const db = getDB();
      const q = String(req.query?.q || '').trim();
      if (!q) return res.status(400).json({ success: false, error: 'Escribe un término para buscar intereses.' });
      const data = await zads('/v1/ads/interests', { query: { q, accountId: pickAccountId(db, req) || undefined } });
      res.json({ success: true, interests: (data as any).interests || (data as any).data || [] });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron buscar intereses.');
    }
  });

  // ---------- Audiencias ----------
  router.get('/audiences', async (req, res) => {
    try {
      const db = getDB();
      const data = await zads('/v1/ads/audiences', {
        query: { accountId: pickAccountId(db, req) || undefined, adAccountId: (req.query?.adAccountId as string) || adsCfg(db).adAccountId || undefined },
      });
      res.json({ success: true, audiences: (data as any).audiences || (data as any).data || [] });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron cargar las audiencias.');
    }
  });

  router.post('/audiences', async (req, res) => {
    try {
      const db = getDB();
      const b = req.body || {};
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      if (!b.name) return res.status(400).json({ success: false, error: 'El nombre de la audiencia es obligatorio.' });
      const data = await zads('/v1/ads/audiences', {
        method: 'POST',
        body: {
          accountId,
          adAccountId: b.adAccountId || adsCfg(db).adAccountId || undefined,
          name: String(b.name),
          type: String(b.type || 'customer_list'), // customer_list | website | lookalike
          description: b.description || undefined,
          pixelId: b.pixelId || undefined,
          retentionDays: b.retentionDays || undefined,
          sourceAudienceId: b.sourceAudienceId || undefined,
          country: b.country || undefined,
          ratio: b.ratio || undefined,
        },
      });
      res.json({ success: true, audience: (data as any).audience || data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo crear la audiencia.');
    }
  });

  router.get('/audiences/:id', async (req, res) => {
    try {
      const data = await zads('/v1/ads/audiences/' + encodeURIComponent(req.params.id));
      res.json({ success: true, audience: (data as any).audience || data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo cargar la audiencia.');
    }
  });

  router.delete('/audiences/:id', async (req, res) => {
    try {
      await zads('/v1/ads/audiences/' + encodeURIComponent(req.params.id), { method: 'DELETE' });
      res.json({ success: true, id: req.params.id });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo eliminar la audiencia.');
    }
  });

  router.post('/audiences/:id/users', async (req, res) => {
    try {
      const users = (req.body as any)?.users;
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, error: 'Envía una lista de usuarios con email o teléfono.' });
      }
      if (users.length > 10000) {
        return res.status(400).json({ success: false, error: 'Máximo 10.000 usuarios por carga.' });
      }
      const data = await zads('/v1/ads/audiences/' + encodeURIComponent(req.params.id) + '/users', {
        method: 'POST',
        body: { users },
      });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron subir los usuarios.');
    }
  });

  // ---------- Conversiones y leads ----------
  router.post('/conversions', async (req, res) => {
    try {
      const db = getDB();
      const b = req.body || {};
      const accountId = pickAccountId(db, req);
      if (!accountId || !b.destinationId || !Array.isArray(b.events) || b.events.length === 0) {
        return res.status(400).json({ success: false, error: 'Faltan datos: destinationId y events son obligatorios.' });
      }
      const data = await zads('/v1/ads/conversions', {
        method: 'POST',
        body: { accountId, destinationId: String(b.destinationId), events: b.events, testCode: b.testCode || undefined },
      });
      res.json({ success: true, result: data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron enviar las conversiones.');
    }
  });

  router.get('/conversion-destinations', async (req, res) => {
    try {
      const db = getDB();
      const accountId = pickAccountId(db, req);
      if (!accountId) return res.status(400).json({ success: false, error: 'Conecta una cuenta primero.' });
      const data = await zads('/v1/accounts/' + encodeURIComponent(accountId) + '/conversion-destinations');
      res.json({ success: true, destinations: (data as any).destinations || (data as any).data || [] });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron cargar los destinos de conversión.');
    }
  });

  router.get('/lead-forms', async (req, res) => {
    try {
      const db = getDB();
      const data = await zads('/v1/ads/lead-forms', { query: { accountId: pickAccountId(db, req) || undefined } });
      res.json({ success: true, forms: (data as any).forms || (data as any).data || [] });
    } catch (e: any) {
      return errJson(res, e, 'No se pudieron cargar los formularios.');
    }
  });

  router.post('/lead-forms', async (req, res) => {
    try {
      const db = getDB();
      const b = req.body || {};
      const accountId = pickAccountId(db, req);
      if (!accountId || !b.name) {
        return res.status(400).json({ success: false, error: 'Faltan datos: cuenta y nombre del formulario.' });
      }
      const data = await zads('/v1/ads/lead-forms', {
        method: 'POST',
        body: { accountId, name: String(b.name), questions: b.questions || [], privacyPolicyUrl: b.privacyPolicyUrl || undefined },
      });
      res.json({ success: true, form: (data as any).form || data });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo crear el formulario.');
    }
  });

  router.delete('/lead-forms/:id', async (req, res) => {
    try {
      await zads('/v1/ads/lead-forms/' + encodeURIComponent(req.params.id), { method: 'DELETE' });
      res.json({ success: true, id: req.params.id });
    } catch (e: any) {
      return errJson(res, e, 'No se pudo archivar el formulario.');
    }
  });

// ---------- Piloto automático de Ads (motor de reglas) ----------
// Evalúa periódicamente las reglas del usuario contra las métricas reales
// (Zernio Ads) y ejecuta acciones: pausar, escalar presupuesto, notificar.
// Las reglas usan conversiones atribuidas; el conteo de ventas reales del CRM
// se incluye como señal secundaria en cada evaluación.

interface AutopilotRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  isPreset: boolean;
  type: 'pause_no_sales' | 'cpc_spike' | 'scale_winner';
  spendUsd: number;      // umbral de gasto (pause_no_sales)
  days: number;          // ventana de evaluación en días
  cpcSpikePct: number;   // % de subida de CPC vs referencia (cpc_spike)
  roasMin: number;       // ROAS mínimo (scale_winner)
  scalePct: number;      // % de aumento de presupuesto (scale_winner)
  scope: string;         // 'all' o campaignId
  notifyPush: boolean;
  notifyWhatsapp: boolean;
  whatsappNumber: string;
  baseline: Record<string, number>; // cpc de referencia por campaña (cpc_spike)
  lastRunAt: string | null;
  createdAt: string;
}

interface AutopilotEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  campaignId: string;
  campaignName: string;
  action: 'paused' | 'scaled' | 'notified' | 'skipped';
  detail: string;
  at: string;
}

function autopilotStore(db: any): { rules: AutopilotRule[]; history: AutopilotEvent[]; alertPhone: string } {
  if (!db.adsAutopilot || typeof db.adsAutopilot !== 'object') db.adsAutopilot = {};
  const ap = db.adsAutopilot;
  if (!Array.isArray(ap.rules)) ap.rules = [];
  if (!Array.isArray(ap.history)) ap.history = [];
  if (!ap.alertPhone) ap.alertPhone = '+573192392853'; // linea admin del CEO (Super Admin)
  if (!ap._seeded) {
    const now = new Date().toISOString();
    ap.rules = [
      {
        id: 'preset-pause-no-sales',
        name: 'Pausar campañas sin ventas',
        description: 'Si una campaña gasta $20 USD o más en 3 días sin generar ventas, se pausa automáticamente.',
        active: true, isPreset: true, type: 'pause_no_sales',
        spendUsd: 20, days: 3, cpcSpikePct: 50, roasMin: 3, scalePct: 20,
        scope: 'all', notifyPush: true, notifyWhatsapp: false, whatsappNumber: '',
        baseline: {}, lastRunAt: null, createdAt: now,
      },
      {
        id: 'preset-cpc-spike',
        name: 'Avisar si el CPC se dispara',
        description: 'Si el costo por clic sube 50% o más frente a su promedio, te avisamos para revisarla.',
        active: true, isPreset: true, type: 'cpc_spike',
        spendUsd: 20, days: 7, cpcSpikePct: 50, roasMin: 3, scalePct: 20,
        scope: 'all', notifyPush: true, notifyWhatsapp: false, whatsappNumber: '',
        baseline: {}, lastRunAt: null, createdAt: now,
      },
      {
        id: 'preset-scale-winner',
        name: 'Escalar campañas ganadoras',
        description: 'Si una campaña mantiene ROAS de 3x o más en 7 días, su presupuesto sube 20% automáticamente.',
        active: true, isPreset: true, type: 'scale_winner',
        spendUsd: 20, days: 7, cpcSpikePct: 50, roasMin: 3, scalePct: 20,
        scope: 'all', notifyPush: true, notifyWhatsapp: false, whatsappNumber: '',
        baseline: {}, lastRunAt: null, createdAt: now,
      },
    ];
    ap._seeded = true;
    saveDB();
  }
  return ap;
}

function pushHistory(db: any, ev: AutopilotEvent) {
  const ap = autopilotStore(db);
  ap.history.unshift(ev);
  if (ap.history.length > 100) ap.history.length = 100;
  saveDB();
}

async function autopilotNotify(title: string, body: string, rule: AutopilotRule) {
  // 1) Push del CRM (siempre que esté activado en la regla)
  if (rule.notifyPush) {
    try {
      const { pushNotifyAll } = await import('./push.ts');
      await pushNotifyAll(title, body, '/ads');
    } catch (e: any) {
      console.log('[Autopilot] push falló:', e?.message || e);
    }
  }
  // 2) WhatsApp al número configurado en la regla
  const notifyNum = String(rule.whatsappNumber || '').trim() || String(autopilotStore(getDB()).alertPhone || '').trim();
  if (rule.notifyWhatsapp && notifyNum) {
    try {
      const db = getDB();
      const apiUrl = String(db.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'https://whatsapp.xorbit360.com').replace(/\/+$/, '');
      const apiKey = String(db.evolutionApiKey || process.env.EVOLUTION_API_KEY || '');
      const instance = String(db.evolutionDefaultInstance || 'channel-default');
      const to = notifyNum.replace(/\D/g, '');
      if (apiUrl && apiKey && to) {
        const res = await fetch(apiUrl + '/message/sendText/' + encodeURIComponent(instance), {
          method: 'POST',
          headers: { apikey: apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: to, text: '🤖 *Piloto automático Xorbit*\n\n' + title + '\n\n' + body }),
        });
        if (!res.ok) console.log('[Autopilot] WhatsApp no enviado, status', res.status);
      }
    } catch (e: any) {
      console.log('[Autopilot] WhatsApp falló:', e?.message || e);
    }
  }
}

/** Ventas reales del CRM en los últimos N días (señal secundaria del piloto). */
function crmSalesCount(db: any, days: number): number {
  try {
    const since = Date.now() - days * 86400000;
    const orders: any[] = Array.isArray(db.orders) ? db.orders : [];
    const live: any[] = Array.isArray(db.liveSelling?.orders) ? db.liveSelling.orders : [];
    const all = orders.concat(live);
    return all.filter((o: any) => {
      const t = new Date(o.createdAt || o.date || o.created_at || 0).getTime();
      const cancelled = /cancel/i.test(String(o.status || ''));
      return t >= since && !cancelled;
    }).length;
  } catch { return 0; }
}

async function evaluateAutopilot(manual = false) {
  const db = getDB();
  const ap = autopilotStore(db);
  const active = ap.rules.filter((r: AutopilotRule) => r.active);
  if (!active.length) return { evaluated: 0, actions: 0 };
  let campaigns: any[] = [];
  try {
    const data = await zads('/v1/ads/tree', { query: { limit: 100 } });
    const tree = (data as any).tree || (data as any).campaigns || (data as any).data || [];
    campaigns = Array.isArray(tree) ? tree : [];
  } catch (e: any) {
    console.log('[Autopilot] no se pudo leer campañas:', e?.message || e);
    return { evaluated: 0, actions: 0, error: e?.message };
  }
  let actions = 0;
  const crmSales7d = crmSalesCount(db, 7);
  for (const rule of active) {
    const targets = rule.scope === 'all' ? campaigns : campaigns.filter((c: any) => String(c.id || c._id) === rule.scope);
    for (const camp of targets) {
      const cid = String(camp.id || camp._id || '');
      const cname = String(camp.name || cid);
      const m: any = camp.metrics || {};
      const spend = Number(m.spend || 0);
      const conversions = Number(m.conversions || 0);
      const cpc = Number(m.cpc || 0);
      const roas = Number(m.roas || 0);
      try {
        if (rule.type === 'pause_no_sales') {
          if (spend >= rule.spendUsd && conversions === 0) {
            await zads('/v1/ads/campaigns/' + encodeURIComponent(cid) + '/status', { method: 'PUT', body: { status: 'paused' } });
            actions++;
            const detail = `Gastó $${spend.toFixed(2)} USD sin ventas → pausada. Ventas CRM (7d): ${crmSales7d}.`;
            pushHistory(db, { id: 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), ruleId: rule.id, ruleName: rule.name, campaignId: cid, campaignName: cname, action: 'paused', detail, at: new Date().toISOString() });
            await autopilotNotify('Campaña pausada: ' + cname, detail, rule);
          }
        } else if (rule.type === 'cpc_spike') {
          const base = Number(rule.baseline[cid] || 0);
          if (base > 0 && cpc > 0 && cpc >= base * (1 + rule.cpcSpikePct / 100)) {
            actions++;
            const detail = `CPC actual $${cpc.toFixed(2)} vs referencia $${base.toFixed(2)} (+${rule.cpcSpikePct}% o más).`;
            pushHistory(db, { id: 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), ruleId: rule.id, ruleName: rule.name, campaignId: cid, campaignName: cname, action: 'notified', detail, at: new Date().toISOString() });
            await autopilotNotify('CPC disparado: ' + cname, detail, rule);
            rule.baseline[cid] = cpc; // re-anclar para no repetir
          } else if (cpc > 0 && !base) {
            rule.baseline[cid] = cpc; // primera medición: fijar referencia
          }
        } else if (rule.type === 'scale_winner') {
          if (roas >= rule.roasMin && spend > 0) {
            // Escalar: subir presupuesto del primer ad con budget conocido
            const ads: any[] = Array.isArray(camp.ads) ? camp.ads : [];
            const withBudget = ads.find((a: any) => a.budget?.amount || a.dailyBudget);
            if (withBudget) {
              const cur = Number(withBudget.budget?.amount || withBudget.dailyBudget || 0);
              const next = Math.round(cur * (1 + rule.scalePct / 100));
              if (next > cur) {
                await zads('/v1/ads/' + encodeURIComponent(String(withBudget.id || withBudget._id)), { method: 'PUT', body: { budget: { amount: next, type: 'daily' } } });
                actions++;
                const detail = `ROAS ${roas.toFixed(2)}x ≥ ${rule.roasMin}x → presupuesto $${cur} → $${next} USD/día.`;
                pushHistory(db, { id: 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), ruleId: rule.id, ruleName: rule.name, campaignId: cid, campaignName: cname, action: 'scaled', detail, at: new Date().toISOString() });
                await autopilotNotify('Campaña escalada: ' + cname, detail, rule);
              }
            }
          }
        }
      } catch (e: any) {
        console.log('[Autopilot] error en regla', rule.id, 'campaña', cid, ':', e?.message || e);
      }
    }
    rule.lastRunAt = new Date().toISOString();
  }
  saveDB();
  console.log(`[Autopilot] evaluación ${manual ? 'manual' : 'programada'}: ${active.length} reglas, ${actions} acciones.`);
  return { evaluated: active.length, actions };
}

let autopilotTimer: any = null;
function startAutopilotLoop() {
  if (autopilotTimer) return;
  // Primera pasada a los 5 min del arranque, luego cada 60 min.
  setTimeout(() => { evaluateAutopilot(false).catch(() => {}); }, 5 * 60 * 1000);
  autopilotTimer = setInterval(() => { evaluateAutopilot(false).catch(() => {}); }, 60 * 60 * 1000);
  // Evaluación inmediata bajo demanda (MCP autopilot_evaluate u otros): revisa la bandera cada 10 s.
  setInterval(() => {
    try {
      const db = getDB();
      if (db && db.adsAutopilot && db.adsAutopilot._evaluateNow) {
        db.adsAutopilot._evaluateNow = false;
        try { saveDB(); } catch {}
        evaluateAutopilot(true).catch(() => {});
      }
    } catch {}
  }, 10 * 1000);
  console.log('[Autopilot] motor de reglas iniciado (cada 60 min).');
}


  // ---------- Piloto automático: CRUD de reglas e historial ----------
  router.get('/autopilot/rules', (req, res) => {
    try {
      const ap = autopilotStore(getDB());
      res.json({ success: true, rules: ap.rules });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e?.message || 'No se pudieron leer las reglas.' });
    }
  });

  router.post('/autopilot/rules', (req, res) => {
    try {
      const db = getDB();
      const ap = autopilotStore(db);
      const b = req.body || {};
      const type = String(b.type || 'pause_no_sales');
      if (!['pause_no_sales', 'cpc_spike', 'scale_winner'].includes(type)) {
        return res.status(400).json({ success: false, error: 'Tipo de regla inválido.' });
      }
      const rule: AutopilotRule = {
        id: 'rule-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: String(b.name || 'Regla personalizada').slice(0, 80),
        description: String(b.description || '').slice(0, 200),
        active: b.active !== false,
        isPreset: false,
        type: type as AutopilotRule['type'],
        spendUsd: Number(b.spendUsd) || 20,
        days: Number(b.days) || 3,
        cpcSpikePct: Number(b.cpcSpikePct) || 50,
        roasMin: Number(b.roasMin) || 3,
        scalePct: Number(b.scalePct) || 20,
        scope: String(b.scope || 'all'),
        notifyPush: b.notifyPush !== false,
        notifyWhatsapp: !!b.notifyWhatsapp,
        whatsappNumber: String(b.whatsappNumber || ''),
        baseline: {},
        lastRunAt: null,
        createdAt: new Date().toISOString(),
      };
      ap.rules.push(rule);
      saveDB();
      res.json({ success: true, rule });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e?.message || 'No se pudo crear la regla.' });
    }
  });

  router.put('/autopilot/rules/:id', (req, res) => {
    try {
      const db = getDB();
      const ap = autopilotStore(db);
      const rule = ap.rules.find((r: AutopilotRule) => r.id === req.params.id);
      if (!rule) return res.status(404).json({ success: false, error: 'Regla no encontrada.' });
      const b = req.body || {};
      for (const k of ['name', 'description', 'spendUsd', 'days', 'cpcSpikePct', 'roasMin', 'scalePct', 'scope', 'whatsappNumber'] as const) {
        if (b[k] !== undefined) (rule as any)[k] = k === 'name' || k === 'description' || k === 'scope' || k === 'whatsappNumber' ? String(b[k]).slice(0, 200) : Number(b[k]);
      }
      for (const k of ['active', 'notifyPush', 'notifyWhatsapp'] as const) {
        if (b[k] !== undefined) (rule as any)[k] = !!b[k];
      }
      saveDB();
      res.json({ success: true, rule });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e?.message || 'No se pudo actualizar la regla.' });
    }
  });

  router.delete('/autopilot/rules/:id', (req, res) => {
    try {
      const db = getDB();
      const ap = autopilotStore(db);
      const i = ap.rules.findIndex((r: AutopilotRule) => r.id === req.params.id);
      if (i < 0) return res.status(404).json({ success: false, error: 'Regla no encontrada.' });
      ap.rules.splice(i, 1);
      saveDB();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e?.message || 'No se pudo eliminar la regla.' });
    }
  });

  router.get('/autopilot/config', (req, res) => {
    try {
      const ap = autopilotStore(getDB());
      res.json({ success: true, alertPhone: ap.alertPhone || '' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: 'No se pudo leer la configuracion.' });
    }
  });

  router.put('/autopilot/config', (req, res) => {
    try {
      const db = getDB();
      const ap = autopilotStore(db);
      const phone = String(req.body?.alertPhone || '').replace(/\D/g, '').slice(0, 15);
      if (!phone) return res.status(400).json({ success: false, error: 'Numero invalido.' });
      ap.alertPhone = '+' + phone;
      saveDB();
      res.json({ success: true, alertPhone: ap.alertPhone });
    } catch (e: any) {
      res.status(400).json({ success: false, error: 'No se pudo guardar.' });
    }
  });

  router.get('/autopilot/history', (req, res) => {
    try {
      const ap = autopilotStore(getDB());
      res.json({ success: true, history: ap.history.slice(0, 50) });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e?.message || 'No se pudo leer el historial.' });
    }
  });

  router.post('/autopilot/evaluate', async (_req, res) => {
    try {
      const r = await evaluateAutopilot(true);
      res.json({ success: true, ...r });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e?.message || 'Falló la evaluación.' });
    }
  });

  startAutopilotLoop();

  app.use('/api/ads', router);
}

export default setupAdsRoutes;

