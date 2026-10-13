import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import crypto from 'crypto';
import { encryptSecret, decryptSecret, isEncryptedSecret, maskSecret, isSecretEncryptionEnabled } from './secretBox.ts';

// ============================================================================
// Webhooks de la Plataforma (Configuración → Webhooks)
// - URLs ENTRANTES: registro de endpoints que la plataforma expone para recibir
// - URLs SALIENTES: webhooks globales que la plataforma dispara ante eventos
//   (a diferencia de Live Selling, que son por landing).
// Todo genérico: cualquier aplicación externa se puede conectar.
// ============================================================================

type AnyRow = Record<string, any>;
type Handler = (req: Request, res: Response) => Promise<void>;
function route(handler: Handler) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err) => {
      console.error('[PlatformWebhooks]', err);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Error interno' });
    });
  };
}
function db(): any { return getSupabase(); }

const WORKSPACE = 'default';
const SETTINGS_KEY = 'platform.webhooks';
const MAX_LOGS = 50;

export const PLATFORM_WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Pedido creado' },
  { id: 'order.updated', label: 'Pedido actualizado' },
  { id: 'customer.new', label: 'Nuevo cliente' },
  { id: 'lead.captured', label: 'Lead capturado' },
  { id: 'payment.confirmed', label: 'Pago confirmado' },
  { id: 'whatsapp.message_received', label: 'Mensaje de WhatsApp recibido' },
  { id: 'comment.received', label: 'Comentario recibido' },
  { id: 'appointment.created', label: 'Cita agendada' },
];

export const INCOMING_ENDPOINTS = [
  { method: 'POST', path: '/api/zernio/webhook', label: 'Mensajes de WhatsApp y redes (proveedor oficial)' },
  { method: 'POST', path: '/api/whatsapp/evolution-webhook', label: 'Mensajes de WhatsApp (Evolution)' },
  { method: 'POST', path: '/api/payments/bold/webhook', label: 'Notificaciones de pago Bold' },
  { method: 'POST', path: '/api/integrations/bold/webhook', label: 'Notificaciones de pago Bold (integraciones)' },
  { method: 'POST', path: '/api/webhooks/meta', label: 'Eventos de Meta' },
  { method: 'POST', path: '/api/webhooks/tiktok', label: 'Eventos de TikTok' },
];

// ---------------------------------------------------------------------------
// Bus interno de eventos (suscriptores en memoria dentro del propio CRM).
// `firePlatformEvent` notifica también a estos suscriptores, además de los
// webhooks salientes configurados. Cambio aditivo: no altera lo existente.
// ---------------------------------------------------------------------------
const internalSubscribers = new Map<string, Array<(data: AnyRow) => void>>();

/** Suscribe un módulo del CRM a un evento de plataforma (bus en memoria). */
export function subscribePlatformEvent(event: string, cb: (data: AnyRow) => void): void {
  const key = String(event || '');
  if (!key || typeof cb !== 'function') return;
  const list = internalSubscribers.get(key) || [];
  list.push(cb);
  internalSubscribers.set(key, list);
}

interface OutgoingHook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string; // cifrado con enc:v1: cuando hay llave maestra
  lastDelivery?: { ok: boolean; at: string; status?: number; detail?: string } | null;
}

interface PlatformWebhookSettings {
  outgoing: OutgoingHook[];
  logs: Array<{ at: string; url: string; event: string; status?: number; ok: boolean; ms: number }>;
}

const DEFAULT_SETTINGS: PlatformWebhookSettings = { outgoing: [], logs: [] };

function cleanUrl(v: unknown): string {
  const s = String(v || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return '';
  return s.slice(0, 500);
}

async function readSettings(): Promise<PlatformWebhookSettings> {
  try {
    const client = db();
    if (!client) return { ...DEFAULT_SETTINGS };
    const { data } = await client.from('app_settings').select('value')
      .eq('workspace_id', WORKSPACE).eq('key', SETTINGS_KEY).maybeSingle() as any;
    const raw = data?.value;
    const stored = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    return {
      outgoing: Array.isArray(stored.outgoing) ? stored.outgoing : [],
      logs: Array.isArray(stored.logs) ? stored.logs : [],
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

async function writeSettings(s: PlatformWebhookSettings): Promise<void> {
  const client = db();
  if (!client) throw new Error('Supabase no disponible');
  const payload = { value: s, updated_at: new Date().toISOString() };
  const { data: existing } = await client.from('app_settings').select('id')
    .eq('workspace_id', WORKSPACE).eq('key', SETTINGS_KEY).maybeSingle() as any;
  if (existing?.id) {
    await client.from('app_settings').update(payload).eq('id', existing.id);
  } else {
    await client.from('app_settings').insert({ workspace_id: WORKSPACE, key: SETTINGS_KEY, ...payload } as any);
  }
}

function sanitizeHook(h: OutgoingHook): AnyRow {
  return {
    id: h.id, url: h.url, events: h.events, active: h.active !== false,
    secretSet: !!h.secret, secretMasked: h.secret ? maskSecret(h.secret) : null,
    lastDelivery: h.lastDelivery || null,
  };
}

function decryptHookSecret(h: OutgoingHook): string {
  if (!h.secret) return '';
  try { return isEncryptedSecret(h.secret) ? decryptSecret(h.secret) : String(h.secret); }
  catch { return ''; }
}

async function deliverToHook(hook: OutgoingHook, event: string, payloadObj: AnyRow): Promise<{ ok: boolean; status?: number; ms: number; detail?: string }> {
  const started = Date.now();
  const payload = JSON.stringify(payloadObj);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const secret = decryptHookSecret(hook);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Xorbit360-Platform/1.0',
    };
    if (secret) headers['X-Webhook-Signature'] = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const res = await fetch(hook.url, { method: 'POST', headers, body: payload, signal: ctrl.signal });
    return { ok: res.ok, status: res.status, ms: Date.now() - started, detail: res.ok ? 'entregado' : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - started, detail: e?.name === 'AbortError' ? 'timeout 10s' : String(e?.message || 'error').slice(0, 120) };
  } finally { clearTimeout(timer); }
}

/** Dispara un evento de plataforma a todos los webhooks salientes suscritos. Nunca bloquea. */
export function firePlatformEvent(event: string, data: AnyRow): void {
  // Bus interno en memoria (módulos del propio CRM, ej. Llamadas IA)
  try {
    const subs = internalSubscribers.get(event);
    if (subs) {
      for (const cb of subs) {
        try { cb(data); } catch (e: any) { console.error('[PlatformWebhooks] suscriptor interno falló:', e?.message || e); }
      }
    }
  } catch { /* nunca rompe el flujo principal */ }
  (async () => {
    try {
      const settings = await readSettings();
      const targets = settings.outgoing.filter((h) => h.active !== false && h.url && (h.events.includes(event) || h.events.includes('*') || h.events.includes('all')));
      if (!targets.length) return;
      const payloadObj = { event, occurred_at: new Date().toISOString(), data };
      let changed = false;
      for (const h of targets) {
        const r = await deliverToHook(h, event, payloadObj);
        h.lastDelivery = { ok: r.ok, at: new Date().toISOString(), status: r.status, detail: r.detail };
        settings.logs.unshift({ at: new Date().toISOString(), url: h.url, event, status: r.status, ok: r.ok, ms: r.ms });
        changed = true;
      }
      if (settings.logs.length > MAX_LOGS) settings.logs = settings.logs.slice(0, MAX_LOGS);
      if (changed) { try { await writeSettings(settings); } catch { /* best-effort */ } }
    } catch { /* nunca rompe el flujo principal */ }
  })().catch(() => {});
}

async function findHook(settings: PlatformWebhookSettings, id: string): Promise<OutgoingHook | null> {
  return settings.outgoing.find((h) => String(h.id) === String(id)) || null;
}

export function setupPlatformWebhooksRoutes(app: Express): void {
  // ---- API principal (nueva sección Configuración → Webhooks) ----
  app.get('/api/platform-webhooks', route(async (_req, res) => {
    const s = await readSettings();
    res.json({
      success: true,
      outgoing: s.outgoing.map(sanitizeHook),
      incoming: INCOMING_ENDPOINTS,
      events: PLATFORM_WEBHOOK_EVENTS,
      logs: s.logs.slice(0, 20),
    });
  }));

  app.put('/api/platform-webhooks', route(async (req, res) => {
    const body = req.body || {};
    if (!Array.isArray(body.outgoing)) { res.status(400).json({ success: false, error: 'Formato inválido' }); return; }
    const current = await readSettings();
    const next: OutgoingHook[] = [];
    for (const item of body.outgoing.slice(0, 20)) {
      const url = cleanUrl(item.url);
      if (!url) continue;
      const id = String(item.id || `wh_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
      const events = Array.isArray(item.events) ? item.events.filter((e: any) => PLATFORM_WEBHOOK_EVENTS.some((c) => c.id === e)) : [];
      const prev = current.outgoing.find((h) => String(h.id) === id);
      let secret = prev?.secret || '';
      const rawSecret = String(item.secret || '').trim();
      if (rawSecret) {
        if (!isSecretEncryptionEnabled()) { res.status(400).json({ success: false, error: 'El servidor no tiene la llave maestra de cifrado.' }); return; }
        secret = encryptSecret(rawSecret);
      } else if (item.clearSecret === true) { secret = ''; }
      next.push({ id, url, events, active: item.active !== false, secret, lastDelivery: prev?.lastDelivery || null });
    }
    await writeSettings({ outgoing: next, logs: current.logs });
    res.json({ success: true, outgoing: next.map(sanitizeHook) });
  }));

  app.post('/api/platform-webhooks/test', route(async (req, res) => {
    const s = await readSettings();
    const hook = await findHook(s, String(req.body?.id || ''));
    if (!hook) { res.status(404).json({ success: false, error: 'Webhook no encontrado' }); return; }
    const r = await deliverToHook(hook, 'test', {
      event: 'test', occurred_at: new Date().toISOString(),
      data: { message: 'Evento de prueba desde Xorbit 360 · Webhooks de la Plataforma' },
    });
    hook.lastDelivery = { ok: r.ok, at: new Date().toISOString(), status: r.status, detail: r.detail };
    s.logs.unshift({ at: new Date().toISOString(), url: hook.url, event: 'test', status: r.status, ok: r.ok, ms: r.ms });
    s.logs = s.logs.slice(0, MAX_LOGS);
    try { await writeSettings(s); } catch { /* best-effort */ }
    res.json({ success: r.ok, statusCode: r.status, latencyMs: r.ms, detail: r.detail });
  }));

  app.get('/api/platform-webhooks/logs', route(async (_req, res) => {
    const s = await readSettings();
    res.json({ success: true, logs: s.logs.slice(0, 20) });
  }));

  // ---- Compatibilidad con el tab "Webhooks de la Plataforma" (MCP y API) ----
  // Ese tab usa una sola URL; se mapea al primer webhook saliente (id 'legacy').
  const getLegacy = async (): Promise<{ targetUrl: string; secretMasked: string | null; events: string[] }> => {
    const s = await readSettings();
    const h = s.outgoing[0];
    return { targetUrl: h?.url || '', secretMasked: h?.secret ? maskSecret(h.secret) : null, events: h?.events || [] };
  };

  app.get('/api/webhooks/config', route(async (_req, res) => {
    const legacy = await getLegacy();
    res.json({ success: true, config: { targetUrl: legacy.targetUrl, secret: legacy.secretMasked, events: legacy.events } });
  }));

  app.post('/api/webhooks/config', route(async (req, res) => {
    const body = req.body || {};
    const url = cleanUrl(body.targetUrl);
    if (!url) { res.status(400).json({ success: false, error: 'URL https válida requerida' }); return; }
    const events = Array.isArray(body.events) ? body.events.filter((e: any) => PLATFORM_WEBHOOK_EVENTS.some((c) => c.id === e)) : [];
    const s = await readSettings();
    const rawSecret = String(body.secret || '').trim();
    let first = s.outgoing[0];
    if (!first) {
      if (!isSecretEncryptionEnabled() && rawSecret) { res.status(400).json({ success: false, error: 'El servidor no tiene la llave maestra de cifrado.' }); return; }
      first = { id: 'legacy', url, events, active: true, secret: rawSecret ? encryptSecret(rawSecret) : '', lastDelivery: null };
      s.outgoing.unshift(first);
    } else {
      first.url = url; first.events = events; first.active = true;
      if (rawSecret && rawSecret !== maskSecret(first.secret)) {
        if (!isSecretEncryptionEnabled()) { res.status(400).json({ success: false, error: 'El servidor no tiene la llave maestra de cifrado.' }); return; }
        first.secret = encryptSecret(rawSecret);
      }
    }
    await writeSettings(s);
    res.json({ success: true });
  }));

  app.post('/api/webhooks/test-dispatch', route(async (req, res) => {
    const body = req.body || {};
    const url = cleanUrl(body.targetUrl);
    if (!url) { res.status(400).json({ success: false, error: 'URL https válida requerida' }); return; }
    const event = String(body.event || 'order.created');
    const payloadObj = body.payload && typeof body.payload === 'object' ? body.payload : { event, timestamp: new Date().toISOString() };
    const secret = String(body.secret || '').trim();
    const hook: OutgoingHook = { id: 'adhoc', url, events: [event], active: true, secret: secret && isSecretEncryptionEnabled() ? encryptSecret(secret) : '' };
    const started = Date.now();
    const r = await deliverToHook(hook, event, payloadObj);
    try {
      const s = await readSettings();
      s.logs.unshift({ at: new Date().toISOString(), url, event, status: r.status, ok: r.ok, ms: Date.now() - started });
      s.logs = s.logs.slice(0, MAX_LOGS);
      await writeSettings(s);
    } catch { /* best-effort */ }
    res.json({ success: r.ok, statusCode: r.status, latencyMs: Date.now() - started, detail: r.detail });
  }));

  app.get('/api/webhooks/logs', route(async (_req, res) => {
    const s = await readSettings();
    res.json({ success: true, logs: s.logs.slice(0, 20).map((l) => ({ statusCode: l.status, event: l.event, timestamp: l.at, latencyMs: l.ms })) });
  }));
}
