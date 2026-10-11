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
    return 'Tu cuenta Zernio no tiene el add-on de Ads. Actívalo en tu panel de Zernio: los primeros 500 ads activos son gratis.';
  }
  if (code === 'linked_account_required' || /connected facebook account is required/i.test(msg)) {
    return 'Conecta una cuenta de Facebook en Zernio para gestionar anuncios de Meta/Instagram.';
  }
  if (code === 'platform_connection_required' || /platform ads connection required/i.test(msg)) {
    return 'Esa plataforma necesita su conexión de Ads en Zernio antes de usarse (TikTok: conecta TikTok Ads; X: conecta X Ads).';
  }
  if (/missing_required_field/i.test(code) || /missing required/i.test(msg)) {
    return 'Falta un dato obligatorio: ' + (err?.param ? '(' + err.param + ') ' : '') + msg;
  }
  return msg || 'Zernio rechazó la solicitud.';
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
        costNote: 'Zernio Ads: primeros 500 ads activos gratis; luego $0.01 por ad activo/mes.',
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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
      if (!accountId) return res.status(400).json({ success: false, error: 'Selecciona una cuenta Zernio primero.' });
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

  app.use('/api/ads', router);
}

export default setupAdsRoutes;
