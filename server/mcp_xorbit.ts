// server/mcp_xorbit.ts
// Tools MCP de Xorbit 360: Ads, Piloto automático, Social, WhatsApp.
// Para uso de Claude, Codex, Antigravity, opencode o cualquier LLM vía MCP.

import { zernioRequest } from './zernio/client.ts';
import { buildSocialThreads } from './social.ts';

type McpDeps = { projectRoot: string; getDB: () => any; saveDB: (next: any) => void };
type AnyRow = Record<string, any>;

function dbOf(deps: McpDeps): any { return deps.getDB() || {}; }
function saveDb(deps: McpDeps): void {
  try { (deps.saveDB as any)(deps.getDB()); } catch { /* noop */ }
}

/** Llama a Zernio y desempaqueta errores en español. */
async function zx(path: string, opts: { method?: string; body?: any; query?: AnyRow } = {}): Promise<any> {
  const { method = 'GET', body, query } = opts;
  let full = path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) full += (path.includes('?') ? '&' : '?') + s;
  }
  const r: any = await zernioRequest({ method, path: full, body });
  if (r?.success === false) throw new Error(r?.error?.message || r?.error?.code || 'El proveedor rechazó la solicitud');
  return r?.data ?? r;
}

function apStore(db: any) {
  if (!db.adsAutopilot || typeof db.adsAutopilot !== 'object') db.adsAutopilot = {};
  const ap = db.adsAutopilot;
  if (!Array.isArray(ap.rules)) ap.rules = [];
  if (!Array.isArray(ap.history)) ap.history = [];
  if (!ap.alertPhone) ap.alertPhone = '+573192392853';
  return ap;
}

const S = (desc: string, props: AnyRow = {}, required: string[] = []) => ({
  description: desc,
  inputSchema: { type: 'object', properties: props, required, additionalProperties: false },
});

export const xorbitToolDefs = [
  // ---------- Ads ----------
  { name: 'ads_status', ...S('Estado de la conexión de anuncios: cuentas, add-on, plataformas.', {}, []) },
  { name: 'ads_list', ...S('Lista anuncios con métricas.', { platform: { type: 'string' }, status: { type: 'string', enum: ['active', 'paused', 'all'] }, limit: { type: 'number' } }) },
  { name: 'ads_tree', ...S('Jerarquía Campaña > Ad Set > Ad con métricas.', { platform: { type: 'string' }, limit: { type: 'number' } }) },
  { name: 'ads_campaigns', ...S('Lista campañas agregadas.', { platform: { type: 'string' } }) },
  { name: 'ads_get', ...S('Detalle de un anuncio.', { adId: { type: 'string' } }, ['adId']) },
  { name: 'ads_update', ...S('Actualiza un anuncio: estado, presupuesto diario USD, nombre.', { adId: { type: 'string' }, status: { type: 'string', enum: ['active', 'paused'] }, dailyBudgetUsd: { type: 'number' }, name: { type: 'string' } }, ['adId']) },
  { name: 'ads_delete', ...S('Cancela/elimina un anuncio.', { adId: { type: 'string' } }, ['adId']) },
  { name: 'ads_campaign_status', ...S('Pausa o reanuda TODOS los anuncios de una campaña.', { campaignId: { type: 'string' }, status: { type: 'string', enum: ['paused', 'active'] } }, ['campaignId', 'status']) },
  { name: 'ads_boost', ...S('Promociona un post orgánico existente como anuncio.', { postId: { type: 'string' }, accountId: { type: 'string' }, dailyBudgetUsd: { type: 'number' }, objective: { type: 'string' } }, ['postId']) },
  { name: 'ads_create', ...S('Crea un anuncio desde cero.', { accountId: { type: 'string' }, name: { type: 'string' }, headline: { type: 'string' }, body: { type: 'string' }, link: { type: 'string' }, dailyBudgetUsd: { type: 'number' }, imageUrl: { type: 'string' } }, ['headline', 'dailyBudgetUsd']) },
  { name: 'ads_messaging', ...S('Crea anuncio click-to-WhatsApp/Messenger/IG Direct.', { accountId: { type: 'string' }, headline: { type: 'string' }, body: { type: 'string' }, dailyBudgetUsd: { type: 'number' }, whatsappNumber: { type: 'string' } }, ['headline', 'dailyBudgetUsd']) },
  { name: 'ads_analytics', ...S('Analítica de un anuncio: resumen + timeline diario.', { adId: { type: 'string' }, fromDate: { type: 'string' }, toDate: { type: 'string' } }, ['adId']) },
  { name: 'ads_interests', ...S('Busca intereses para targeting.', { q: { type: 'string' }, accountId: { type: 'string' } }, ['q']) },
  { name: 'ads_audiences', ...S('Gestiona audiencias: listar o crear.', { action: { type: 'string', enum: ['list', 'create'] }, accountId: { type: 'string' }, name: { type: 'string' }, type: { type: 'string', enum: ['customer_list', 'website', 'lookalike'] } }, ['action']) },
  { name: 'ads_conversions', ...S('Envía evento de conversión (Conversions API) atribuido a ventas del CRM.', { accountId: { type: 'string' }, eventName: { type: 'string' }, eventValue: { type: 'number' }, phone: { type: 'string', description: 'Teléfono del comprador en formato E.164 para atribución' } }, ['eventName']) },
  // ---------- Piloto automático ----------
  { name: 'autopilot_rules', ...S('Lista las reglas del piloto automático de anuncios.', {}, []) },
  { name: 'autopilot_rule_set', ...S('Crea o actualiza una regla del piloto.', { id: { type: 'string' }, name: { type: 'string' }, type: { type: 'string', enum: ['pause_no_sales', 'cpc_spike', 'scale_winner'] }, active: { type: 'boolean' }, spendUsd: { type: 'number' }, days: { type: 'number' }, cpcSpikePct: { type: 'number' }, roasMin: { type: 'number' }, scalePct: { type: 'number' }, notifyWhatsapp: { type: 'boolean' }, whatsappNumber: { type: 'string' } }, ['name', 'type']) },
  { name: 'autopilot_rule_delete', ...S('Elimina una regla del piloto.', { id: { type: 'string' } }, ['id']) },
  { name: 'autopilot_evaluate', ...S('Ejecuta la evaluación del piloto ahora mismo.', {}, []) },
  { name: 'autopilot_history', ...S('Historial de acciones ejecutadas por el piloto.', { limit: { type: 'number' } }) },
  // ---------- Social ----------
  { name: 'social_threads', ...S('Hilos sociales unificados por persona (DMs, comentarios, historias, menciones).', { origin: { type: 'string', enum: ['dm', 'comment', 'story', 'mention', 'all'] }, limit: { type: 'number' } }) },
  { name: 'social_reply', ...S('Responde un hilo social (DM si hay conversación, comentario público si no).', { threadId: { type: 'string' }, text: { type: 'string' } }, ['threadId', 'text']) },
  { name: 'social_to_dm', ...S('Pasa un comentario a DM privado.', { threadId: { type: 'string' }, text: { type: 'string' } }, ['threadId', 'text']) },
  { name: 'social_automations', ...S('Lista automatizaciones sociales (comment-to-DM, ice breakers, historias).', {}, []) },
  { name: 'social_publish', ...S('Publica o programa un post multired.', { text: { type: 'string' }, accountIds: { type: 'array', items: { type: 'string' } }, scheduledFor: { type: 'string', description: 'ISO 8601 para programar, omitir para publicar ya' }, mediaUrls: { type: 'array', items: { type: 'string' } } }, ['text']) },
  { name: 'social_scheduled', ...S('Lista posts programados.', {}, []) },
  { name: 'social_analytics', ...S('Analítica social por cuenta y rango.', { accountId: { type: 'string' }, fromDate: { type: 'string' }, toDate: { type: 'string' } }) },
  { name: 'social_reflink', ...S('Crea enlace de referido ig.me.', { accountId: { type: 'string' }, code: { type: 'string' } }, ['accountId', 'code']) },
  // ---------- WhatsApp ----------
  { name: 'whatsapp_providers', ...S('Lista los proveedores WhatsApp por número (evolution, zernio_coexistence, zernio_api).', {}, []) },
  { name: 'whatsapp_provider_set', ...S('Asigna el proveedor a un número.', { phone: { type: 'string' }, provider: { type: 'string', enum: ['evolution', 'zernio_coexistence', 'zernio_api'] } }, ['phone', 'provider']) },
];

export async function handleXorbitTool(name: string, args: AnyRow, deps: McpDeps): Promise<unknown | null> {
  const db = dbOf(deps);
  const a = args || {};
  switch (name) {
    // ===== Ads =====
    case 'ads_status': {
      const accs: any = await zx('/v1/accounts', { query: { page: 1, limit: 50 } }).catch(() => ({ accounts: [] }));
      const list = accs.accounts || accs.data || [];
      let addon: boolean | null = null;
      try { await zx('/v1/ads', { query: { limit: 1 } }); addon = true; }
      catch (e: any) { addon = /add-on/i.test(e?.message || '') ? false : null; }
      return { connected: list.length > 0, adsAddonActive: addon, accounts: list.map((x: any) => ({ id: x._id || x.id, platform: x.platform, username: x.username || x.displayName })) };
    }
    case 'ads_list': {
      const q: AnyRow = { limit: a.limit || 50 };
      if (a.platform) q.platform = a.platform;
      if (a.status && a.status !== 'all') q.status = a.status;
      return zx('/v1/ads', { query: q });
    }
    case 'ads_tree':
      return zx('/v1/ads/tree', { query: { platform: a.platform, limit: a.limit || 50 } });
    case 'ads_campaigns':
      return zx('/v1/ads/campaigns', { query: { platform: a.platform } });
    case 'ads_get':
      return zx('/v1/ads/' + encodeURIComponent(a.adId));
    case 'ads_update': {
      const body: AnyRow = {};
      if (a.status) body.status = a.status;
      if (a.dailyBudgetUsd) body.budget = { amount: Number(a.dailyBudgetUsd), type: 'daily' };
      if (a.name) body.name = a.name;
      return zx('/v1/ads/' + encodeURIComponent(a.adId), { method: 'PUT', body });
    }
    case 'ads_delete':
      return zx('/v1/ads/' + encodeURIComponent(a.adId), { method: 'DELETE' });
    case 'ads_campaign_status':
      return zx('/v1/ads/campaigns/' + encodeURIComponent(a.campaignId) + '/status', { method: 'PUT', body: { status: a.status } });
    case 'ads_boost': {
      const body: AnyRow = { postId: a.postId };
      if (a.accountId) body.accountId = a.accountId;
      if (a.dailyBudgetUsd) body.dailyBudget = { amount: Number(a.dailyBudgetUsd), currency: 'USD' };
      if (a.objective) body.objective = a.objective;
      return zx('/v1/ads/boost', { method: 'POST', body });
    }
    case 'ads_create': {
      const body: AnyRow = {
        headline: a.headline, body: a.body, link: a.link,
        dailyBudget: { amount: Number(a.dailyBudgetUsd), currency: 'USD' },
      };
      if (a.accountId) body.accountId = a.accountId;
      if (a.name) body.name = a.name;
      if (a.imageUrl) body.imageUrl = a.imageUrl;
      return zx('/v1/ads/create', { method: 'POST', body });
    }
    case 'ads_messaging': {
      const body: AnyRow = {
        headline: a.headline, body: a.body,
        dailyBudget: { amount: Number(a.dailyBudgetUsd), currency: 'USD' },
      };
      if (a.accountId) body.accountId = a.accountId;
      if (a.whatsappNumber) body.whatsappNumber = a.whatsappNumber;
      return zx('/v1/ads/messaging', { method: 'POST', body });
    }
    case 'ads_analytics':
      return zx('/v1/ads/' + encodeURIComponent(a.adId) + '/analytics', { query: { fromDate: a.fromDate, toDate: a.toDate } });
    case 'ads_interests':
      return zx('/v1/ads/interests', { query: { q: a.q, accountId: a.accountId } });
    case 'ads_audiences': {
      if (a.action === 'create') {
        return zx('/v1/ads/audiences', { method: 'POST', body: { accountId: a.accountId, name: a.name, type: a.type || 'customer_list' } });
      }
      return zx('/v1/ads/audiences', { query: { accountId: a.accountId } });
    }
    case 'ads_conversions': {
      const body: AnyRow = { eventName: a.eventName };
      if (a.accountId) body.accountId = a.accountId;
      if (a.eventValue !== undefined) body.eventValue = Number(a.eventValue);
      if (a.phone) body.userData = { phone: a.phone };
      return zx('/v1/ads/conversions', { method: 'POST', body });
    }
    // ===== Piloto automático =====
    case 'autopilot_rules': {
      const ap = apStore(db);
      return { rules: ap.rules, alertPhone: ap.alertPhone };
    }
    case 'autopilot_rule_set': {
      const ap = apStore(db);
      const id = a.id || `rule-${Date.now()}`;
      const rule: AnyRow = {
        id, name: a.name, type: a.type, active: a.active !== false,
        spendUsd: a.spendUsd ?? 20, days: a.days ?? 3, cpcSpikePct: a.cpcSpikePct ?? 50,
        roasMin: a.roasMin ?? 3, scalePct: a.scalePct ?? 20,
        notifyWhatsapp: !!a.notifyWhatsapp, whatsappNumber: a.whatsappNumber || ap.alertPhone,
        updatedAt: new Date().toISOString(),
      };
      const idx = ap.rules.findIndex((r: any) => r.id === id);
      if (idx >= 0) ap.rules[idx] = { ...ap.rules[idx], ...rule };
      else ap.rules.push({ ...rule, createdAt: new Date().toISOString() });
      saveDb(deps);
      return { success: true, rule: ap.rules.find((r: any) => r.id === id) };
    }
    case 'autopilot_rule_delete': {
      const ap = apStore(db);
      ap.rules = ap.rules.filter((r: any) => r.id !== a.id);
      saveDb(deps);
      return { success: true };
    }
    case 'autopilot_evaluate': {
      // Se dispara vía el loop interno: marcar bandera para evaluación inmediata
      db.adsAutopilot = db.adsAutopilot || {};
      db.adsAutopilot._evaluateNow = true;
      saveDb(deps);
      return { success: true, queued: true, note: 'Evaluación encolada; el motor la ejecuta en segundos.' };
    }
    case 'autopilot_history': {
      const ap = apStore(db);
      const lim = Math.min(100, Math.max(1, Number(a.limit) || 20));
      return { history: ap.history.slice(0, lim) };
    }
    // ===== Social =====
    case 'social_threads': {
      let threads: AnyRow[] = buildSocialThreads(db);
      if (a.origin && a.origin !== 'all') threads = threads.filter((t) => (t.origins || []).includes(a.origin));
      const lim = Math.min(100, Math.max(1, Number(a.limit) || 30));
      return { count: threads.length, threads: threads.slice(0, lim) };
    }
    case 'social_reply':
    case 'social_to_dm': {
      const threads: AnyRow[] = buildSocialThreads(db);
      const thread = threads.find((t) => t.id === a.threadId);
      if (!thread) throw new Error('Hilo no encontrado');
      const text = String(a.text || '').trim();
      if (!text) throw new Error('Mensaje vacío');
      if (name === 'social_to_dm') {
        const fc = (thread.messages || []).find((m: any) => m.origin === 'comment');
        if (!fc?.postId || !fc?.commentId) throw new Error('Sin comentario de referencia');
        await zx(`/v1/inbox/comments/${encodeURIComponent(fc.postId)}/${encodeURIComponent(fc.commentId)}/private-reply`, {
          method: 'POST', body: { accountId: thread.accountId || fc.accountId, message: text },
        });
        return { success: true, via: 'dm' };
      }
      const hasDM = (thread.origins || []).includes('dm') && thread.conversationId;
      if (hasDM) {
        await zx(`/v1/inbox/conversations/${encodeURIComponent(thread.conversationId)}/messages`, {
          method: 'POST', body: { accountId: thread.accountId, message: { type: 'text', text } },
        });
        return { success: true, via: 'dm' };
      }
      const fc = (thread.messages || []).find((m: any) => m.origin === 'comment');
      if (!fc?.postId) throw new Error('Sin post de referencia');
      await zx(`/v1/inbox/comments/${encodeURIComponent(fc.postId)}`, {
        method: 'POST', body: { accountId: thread.accountId || fc.accountId, message: text, commentId: fc.commentId },
      });
      return { success: true, via: 'comment' };
    }
    case 'social_automations': {
      const list = db.socialAutomations || [];
      return { count: list.length, automations: list };
    }
    case 'social_publish': {
      const body: AnyRow = { text: a.text };
      if (a.accountIds?.length) body.accountIds = a.accountIds;
      if (a.scheduledFor) body.scheduledFor = a.scheduledFor;
      if (a.mediaUrls?.length) body.mediaUrls = a.mediaUrls;
      return zx('/v1/posts', { method: 'POST', body });
    }
    case 'social_scheduled':
      return zx('/v1/posts', { query: { status: 'scheduled', limit: 50 } });
    case 'social_analytics':
      return zx('/v1/analytics', { query: { accountId: a.accountId, fromDate: a.fromDate, toDate: a.toDate } });
    case 'social_reflink': {
      const r: any = await zx('/v1/workflows', { method: 'POST', body: { trigger: 'referral', accountId: a.accountId, code: a.code, name: `Referido ${a.code}` } });
      const username = r?.username || r?.account?.username || '';
      return { success: true, url: username ? `https://ig.me/m/${username}?ref=${a.code}` : null, workflow: r };
    }
    // ===== WhatsApp =====
    case 'whatsapp_providers': {
      const reg = (db.whatsappProviders && typeof db.whatsappProviders === 'object') ? db.whatsappProviders : {};
      return { providers: reg };
    }
    case 'whatsapp_provider_set': {
      if (!db.whatsappProviders || typeof db.whatsappProviders !== 'object') db.whatsappProviders = {};
      const key = String(a.phone).replace(/\D/g, '');
      db.whatsappProviders[key] = { provider: a.provider, updatedAt: new Date().toISOString() };
      saveDb(deps);
      return { success: true, phone: key, provider: a.provider };
    }
    default:
      return null;
  }
}
