import type { Express, Request, Response } from 'express';
import type { Server as HttpServer } from 'http';
import type { Socket } from 'net';
import crypto from 'crypto';
import { getSupabase } from './supabase.ts';
import { decryptSecret, encryptSecret, isEncryptedSecret, maskSecret } from './secretBox.ts';
import { subscribePlatformEvent } from './platformWebhooks.ts';
import { enviarMensajeZernio } from './zernio/messaging.ts';
import { zernioRequest } from './zernio/client.ts';

// ============================================================================
// Llamadas IA de confirmación contra entrega — Xorbit 360
// Flujo: pedido COD del bot -> WhatsApp de confirmación -> si el cliente no
// responde en N minutos -> llamada de voz (Telefonía + voz IA de Google Live).
// Sin SDKs: Twilio por REST (fetch + Basic Auth), Gemini Live por WebSocket,
// transcodificación mulaw/PCM en JS puro. El WebSocket de Twilio Media Streams
// se sirve con un manejador 'upgrade' mínimo (sin dependencias nuevas).
// ============================================================================

const LOG = '[VoiceCalls]';
const CONFIG_WORKSPACE = 'default';
const CONFIG_KEY = 'voice.calls.config';
const FALLBACK_KEY = 'voice.calls.data';

// Modelo de audio nativo de Gemini Live (verificado en docs de Google AI for
// Developers, oct-2026). Alias "-latest" para no quedar atado a un preview
// con fecha que caduque. Alternativa vigente: gemini-3.1-flash-live-preview.
const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-latest';
const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// Costos estimados cuando Twilio no reporta precio en el callback.
const TWILIO_COST_PER_MIN = 0.05;
const GEMINI_COST_PER_MIN = 0.023;

const TWILIO_API = 'https://api.twilio.com/2010-04-01';
const WS_PATH = '/api/voice-calls/twilio/stream';
const MAX_CALL_SECONDS = 300;
const RETRY_DELAY_MS = 4 * 60 * 60 * 1000; // reintento tras 4h si no contestó
const WA_FAILED_GRACE_MS = 2 * 60 * 1000; // si falló el WhatsApp, llamar a los 2 min

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type VoiceCallStatus = 'programada' | 'en_curso' | 'confirmada' | 'cancelada' | 'no_contesto' | 'fallida';

interface TelephonyConfig {
  twilioAccountSid: string; // cifrado con secretBox
  twilioAuthToken: string; // cifrado con secretBox
  twilioFromNumber: string;
  googleKey: string; // cifrado con secretBox (override por tenant de la clave de voz)
  delayDefaultMin: number;
  publicHost: string; // dominio público para las URLs que Twilio debe alcanzar
  liveModel: string; // modelo de Gemini Live
}

export interface VoiceCallCampaign {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
  delayMin: number;
  scheduleStart: string; // 'HH:MM'
  scheduleEnd: string; // 'HH:MM'
  maxAttempts: number;
  whatsappFirst: boolean;
  systemPrompt: string;
  voice: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptEntry {
  role: 'cliente' | 'asistente' | 'sistema';
  text: string;
  at: string;
}

export interface VoiceCall {
  id: string;
  tenantId: string;
  campaignId: string;
  orderId: string;
  customerName: string;
  phone: string;
  orderSummary: string;
  orderTotal: number;
  status: VoiceCallStatus;
  attempts: number;
  whatsappSentAt: string | null;
  whatsappFailed: boolean;
  whatsappReplied: boolean;
  customerReplied: boolean;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  twilioCallSid: string | null;
  recordingUrl: string | null;
  costUsd: number | null;
  transcript: TranscriptEntry[];
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CONFIG: TelephonyConfig = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '',
  googleKey: '',
  delayDefaultMin: 15,
  publicHost: 'crm.xorbit360.com',
  liveModel: DEFAULT_LIVE_MODEL,
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

type Handler = (req: Request, res: Response) => Promise<void>;
function route(handler: Handler) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err) => {
      const status = Number(err?.status || 500);
      if (status >= 500) console.error(LOG, err?.message || err);
      if (!res.headersSent) res.status(status).json({ success: false, error: err?.message || 'Error interno del módulo de llamadas.' });
    });
  };
}

function cleanText(v: unknown, max = 500): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function tenantId(req: Request): string {
  const user: any = (req as any).authUser || {};
  return String(user.workspaceId || user.tenantId || 'default').slice(0, 80);
}

function digitsOnly(v: string): string {
  return String(v || '').replace(/\D/g, '');
}

/** Normaliza a E.164; Colombia (+57) por defecto para números locales de 10 dígitos. */
export function normalizePhoneE164(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return '';
  if (raw.trim().startsWith('+')) return '+' + d;
  if (d.length === 12 && d.startsWith('57')) return '+' + d;
  if (d.length === 11 && d.startsWith('57')) return '+' + d;
  if (d.length === 10) return '+57' + d;
  if (d.length > 12) return '+' + d;
  return '';
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function decryptField(v: unknown): string {
  const s = String(v || '');
  if (!s) return '';
  try { return (isEncryptedSecret(s) ? decryptSecret(s) : s).trim(); }
  catch { return ''; }
}

// ---------------------------------------------------------------------------
// Configuración de telefonía (app_settings, workspace 'default')
// ---------------------------------------------------------------------------

export async function readVoiceCallsConfig(): Promise<TelephonyConfig> {
  return readConfig();
}

async function readConfig(): Promise<TelephonyConfig> {
  const client = getSupabase();
  if (!client) return { ...DEFAULT_CONFIG };
  const { data } = await (client.from('app_settings').select('value')
    .eq('workspace_id', CONFIG_WORKSPACE).eq('key', CONFIG_KEY).maybeSingle() as any);
  const raw = data?.value;
  const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
  return { ...DEFAULT_CONFIG, ...(parsed || {}) };
}

async function writeConfig(cfg: TelephonyConfig): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no disponible');
  const { error } = await (client.from('app_settings').upsert(
    { workspace_id: CONFIG_WORKSPACE, key: CONFIG_KEY, value: JSON.stringify(cfg), updated_at: new Date().toISOString() },
    { onConflict: 'workspace_id,key' },
  ) as any);
  if (error) throw new Error(error.message);
}

/**
 * Resuelve la clave de Google (voz IA) para un tenant: primero busca override
 * en app_settings del propio tenant (workspace = tenantId, key 'voice.settings');
 * si no hay, usa la clave de plataforma (workspace 'default').
 */
export async function resolveTenantGoogleKey(tenant: string): Promise<string> {
  const client = getSupabase();
  if (!client) return '';
  const t = String(tenant || 'default');
  async function readKey(workspace: string): Promise<string> {
    try {
      const { data } = await (client!.from('app_settings').select('value')
        .eq('workspace_id', workspace).eq('key', 'voice.settings').maybeSingle() as any);
      const raw = data?.value;
      const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
      return decryptField(parsed?.googleKey);
    } catch { return ''; }
  }
  if (t !== 'default') {
    const perTenant = await readKey(t);
    if (perTenant) return perTenant;
  }
  return readKey('default');
}

// ---------------------------------------------------------------------------
// Almacenamiento: Supabase (voice_call_campaigns / voice_calls) con fallback
// a app_settings ('voice.calls.data') si las tablas aún no existen.
// ---------------------------------------------------------------------------

let tablesCheck: 'unknown' | 'yes' | 'no' = 'unknown';

async function tablesAvailable(): Promise<boolean> {
  if (tablesCheck !== 'unknown') return tablesCheck === 'yes';
  const client = getSupabase();
  if (!client) { tablesCheck = 'no'; return false; }
  try {
    const { error } = await (client.from('voice_call_campaigns').select('id').limit(1) as any);
    if (error && (/does not exist|42P01/i.test(String(error.code || '') + ' ' + String(error.message || '')))) {
      console.warn(LOG, 'Tablas voice_call_* no existen; usando respaldo en app_settings.');
      tablesCheck = 'no';
    } else if (error) {
      console.warn(LOG, 'No se pudo verificar tablas voice_call_*:', error.message, '; usando respaldo.');
      tablesCheck = 'no';
    } else {
      tablesCheck = 'yes';
    }
  } catch {
    tablesCheck = 'no';
  }
  return tablesCheck === 'yes';
}

interface FallbackData { campaigns: VoiceCallCampaign[]; calls: VoiceCall[]; }

async function readFallback(): Promise<FallbackData> {
  const client = getSupabase();
  if (!client) return { campaigns: [], calls: [] };
  try {
    const { data } = await (client.from('app_settings').select('value')
      .eq('workspace_id', CONFIG_WORKSPACE).eq('key', FALLBACK_KEY).maybeSingle() as any);
    const raw = data?.value;
    const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    return {
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      calls: Array.isArray(parsed.calls) ? parsed.calls : [],
    };
  } catch { return { campaigns: [], calls: [] }; }
}

async function writeFallback(d: FallbackData): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const capped: FallbackData = {
    campaigns: d.campaigns,
    calls: d.calls.slice(0, 500),
  };
  await (client.from('app_settings').upsert(
    { workspace_id: CONFIG_WORKSPACE, key: FALLBACK_KEY, value: JSON.stringify(capped), updated_at: new Date().toISOString() },
    { onConflict: 'workspace_id,key' },
  ) as any);
}

function rowToCampaign(r: any): VoiceCallCampaign {
  return {
    id: String(r.id), tenantId: String(r.tenant_id || 'default'), name: String(r.name || ''),
    active: r.active !== false,
    delayMin: Number(r.delay_min ?? 15), scheduleStart: String(r.schedule_start || '09:00'),
    scheduleEnd: String(r.schedule_end || '20:00'), maxAttempts: Number(r.max_attempts ?? 2),
    whatsappFirst: r.whatsapp_first !== false,
    systemPrompt: String(r.system_prompt || ''), voice: String(r.voice || 'Kore'),
    createdAt: String(r.created_at || new Date().toISOString()),
    updatedAt: String(r.updated_at || new Date().toISOString()),
  };
}

function campaignToRow(c: VoiceCallCampaign): Record<string, any> {
  return {
    id: c.id, tenant_id: c.tenantId, name: c.name, active: c.active,
    delay_min: c.delayMin, schedule_start: c.scheduleStart, schedule_end: c.scheduleEnd,
    max_attempts: c.maxAttempts, whatsapp_first: c.whatsappFirst,
    system_prompt: c.systemPrompt, voice: c.voice,
    created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

function rowToCall(r: any): VoiceCall {
  const st = String(r.status || 'programada');
  const status: VoiceCallStatus = (['programada', 'en_curso', 'confirmada', 'cancelada', 'no_contesto', 'fallida'] as string[]).includes(st)
    ? (st as VoiceCallStatus) : 'programada';
  return {
    id: String(r.id), tenantId: String(r.tenant_id || 'default'),
    campaignId: String(r.campaign_id || ''), orderId: String(r.order_id || ''),
    customerName: String(r.customer_name || ''), phone: String(r.phone || ''),
    orderSummary: String(r.order_summary || ''), orderTotal: Number(r.order_total ?? 0),
    status, attempts: Number(r.attempts ?? 0),
    whatsappSentAt: r.whatsapp_sent_at ? String(r.whatsapp_sent_at) : null,
    whatsappFailed: r.whatsapp_failed === true, whatsappReplied: r.whatsapp_replied === true,
    customerReplied: r.customer_replied === true,
    scheduledFor: r.scheduled_for ? String(r.scheduled_for) : null,
    startedAt: r.started_at ? String(r.started_at) : null,
    endedAt: r.ended_at ? String(r.ended_at) : null,
    durationSec: r.duration_sec != null ? Number(r.duration_sec) : null,
    twilioCallSid: r.twilio_sid ? String(r.twilio_sid) : null,
    recordingUrl: r.recording_url ? String(r.recording_url) : null,
    costUsd: r.cost_usd != null ? Number(r.cost_usd) : null,
    transcript: Array.isArray(r.transcript) ? r.transcript : [],
    lastError: r.error ? String(r.error) : null,
    createdAt: String(r.created_at || new Date().toISOString()),
    updatedAt: String(r.updated_at || new Date().toISOString()),
  };
}

function callToRow(c: VoiceCall): Record<string, any> {
  return {
    id: c.id, tenant_id: c.tenantId, campaign_id: c.campaignId || null, order_id: c.orderId || null,
    customer_name: c.customerName, phone: c.phone,
    order_summary: c.orderSummary, order_total: c.orderTotal,
    status: c.status, attempts: c.attempts,
    whatsapp_sent_at: c.whatsappSentAt, whatsapp_failed: c.whatsappFailed,
    whatsapp_replied: c.whatsappReplied, customer_replied: c.customerReplied,
    scheduled_for: c.scheduledFor, started_at: c.startedAt, ended_at: c.endedAt,
    duration_sec: c.durationSec, twilio_sid: c.twilioCallSid,
    recording_url: c.recordingUrl, cost_usd: c.costUsd,
    transcript: c.transcript, error: c.lastError,
    created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

async function listCampaigns(tenant: string): Promise<VoiceCallCampaign[]> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data, error } = await (client.from('voice_call_campaigns').select('*')
      .eq('tenant_id', tenant).order('created_at', { ascending: true }) as any);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToCampaign);
  }
  const fb = await readFallback();
  return fb.campaigns.filter((c) => c.tenantId === tenant);
}

async function saveCampaign(c: VoiceCallCampaign): Promise<void> {
  c.updatedAt = new Date().toISOString();
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_call_campaigns').upsert(campaignToRow(c), { onConflict: 'id' }) as any);
    if (error) throw new Error(error.message);
    return;
  }
  const fb = await readFallback();
  const i = fb.campaigns.findIndex((x) => x.id === c.id);
  if (i >= 0) fb.campaigns[i] = c; else fb.campaigns.push(c);
  await writeFallback(fb);
}

async function deleteCampaign(id: string): Promise<void> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_call_campaigns').delete().eq('id', id) as any);
    if (error) throw new Error(error.message);
    return;
  }
  const fb = await readFallback();
  fb.campaigns = fb.campaigns.filter((x) => x.id !== id);
  await writeFallback(fb);
}

async function listCalls(tenant: string, status: string | undefined, limit: number): Promise<VoiceCall[]> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    let q = client.from('voice_calls').select('*').eq('tenant_id', tenant).order('created_at', { ascending: false }).limit(limit);
    if (status) q = q.eq('status', status);
    const { data, error } = await (q as any);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToCall);
  }
  const fb = await readFallback();
  return fb.calls
    .filter((c) => c.tenantId === tenant && (!status || c.status === status))
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, limit);
}

async function getCall(id: string): Promise<VoiceCall | null> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data, error } = await (client.from('voice_calls').select('*').eq('id', id).maybeSingle() as any);
    if (error) throw new Error(error.message);
    return data ? rowToCall(data) : null;
  }
  const fb = await readFallback();
  return fb.calls.find((c) => c.id === id) || null;
}

async function findCallByTwilioSid(sid: string): Promise<VoiceCall | null> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data, error } = await (client.from('voice_calls').select('*').eq('twilio_sid', sid).maybeSingle() as any);
    if (error) throw new Error(error.message);
    return data ? rowToCall(data) : null;
  }
  const fb = await readFallback();
  return fb.calls.find((c) => c.twilioCallSid === sid) || null;
}

async function findActiveCallByOrder(orderId: string, tenant: string): Promise<VoiceCall | null> {
  if (!orderId) return null;
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data, error } = await (client.from('voice_calls').select('*')
      .eq('tenant_id', tenant).eq('order_id', orderId).in('status', ['programada', 'en_curso']).limit(1) as any);
    if (error) throw new Error(error.message);
    return data && data[0] ? rowToCall(data[0]) : null;
  }
  const fb = await readFallback();
  return fb.calls.find((c) => c.tenantId === tenant && c.orderId === orderId && (c.status === 'programada' || c.status === 'en_curso')) || null;
}

async function saveCall(c: VoiceCall): Promise<void> {
  c.updatedAt = new Date().toISOString();
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_calls').upsert(callToRow(c), { onConflict: 'id' }) as any);
    if (error) throw new Error(error.message);
    return;
  }
  const fb = await readFallback();
  const i = fb.calls.findIndex((x) => x.id === c.id);
  if (i >= 0) fb.calls[i] = c; else fb.calls.unshift(c);
  await writeFallback(fb);
}

// ---------------------------------------------------------------------------
// Campañas
// ---------------------------------------------------------------------------

export function defaultSystemPrompt(): string {
  return [
    'Eres Valeria, la asistente de confirmación de pedidos de la tienda.',
    'Estás llamando por teléfono a un cliente que hizo un pedido con PAGO CONTRA ENTREGA.',
    'Datos del pedido: cliente {nombre}, dirección {direccion}, total a pagar {total} COP en efectivo, productos: {resumen}.',
    'Tiempo estimado de entrega: 2 a 4 días hábiles.',
    'Tu guion: 1) Saluda en español y confirma que hablas con {nombre}.',
    '2) Confirma que la dirección de entrega {direccion} es correcta.',
    '3) Confirma que tendrá el dinero en efectivo listo ({total} COP) al momento de la entrega.',
    '4) Pregunta directamente si confirma el pedido.',
    'Si confirma: dile que el pedido queda confirmado y llegará en 2 a 4 días hábiles. Si cancela: agradece con amabilidad y despídete.',
    'Habla en español, tono cálido y profesional, frases cortas. No menciones que eres una IA salvo que te lo pregunten.',
  ].join(' ');
}

function buildCampaign(tenant: string, partial: Partial<VoiceCallCampaign> & { name: string }): VoiceCallCampaign {
  const now = new Date().toISOString();
  return {
    id: partial.id || uid('camp'),
    tenantId: tenant,
    name: partial.name,
    active: partial.active !== false,
    delayMin: Math.max(1, Math.min(120, Number(partial.delayMin ?? 15) || 15)),
    scheduleStart: String(partial.scheduleStart || '09:00'),
    scheduleEnd: String(partial.scheduleEnd || '20:00'),
    maxAttempts: Math.max(1, Math.min(5, Number(partial.maxAttempts ?? 2) || 2)),
    whatsappFirst: partial.whatsappFirst !== false,
    systemPrompt: String(partial.systemPrompt || defaultSystemPrompt()),
    voice: String(partial.voice || 'Kore'),
    createdAt: partial.createdAt || now,
    updatedAt: now,
  };
}

async function ensureDefaultCampaign(tenant = 'default'): Promise<VoiceCallCampaign> {
  const existing = await listCampaigns(tenant);
  if (existing.length > 0) return existing[0];
  const c = buildCampaign(tenant, { name: 'Confirmación Contra Entrega', active: true });
  await saveCampaign(c);
  console.log(LOG, 'Campaña por defecto creada:', c.name);
  return c;
}

async function getActiveCampaign(tenant = 'default'): Promise<VoiceCallCampaign | null> {
  const all = await listCampaigns(tenant);
  const active = all.find((c) => c.active);
  if (active) return active;
  if (all.length === 0) return ensureDefaultCampaign(tenant);
  return null;
}

// ---------------------------------------------------------------------------
// Transcodificación de audio en JS puro (sin ffmpeg)
// Twilio: mulaw 8kHz <-> Gemini Live: PCM16 16kHz (entrada) / 24kHz (salida)
// ---------------------------------------------------------------------------

const SEG_END = [0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff, 0x1fff, 0x3fff, 0x7fff];

/** PCM16 -> mulaw (G.711, algoritmo clásico). */
export function mulawEncode(sample: number): number {
  let s = Math.round(sample) >> 2; // 14 bits efectivos, como el algoritmo original
  let mask: number;
  if (s < 0) { s = -s; mask = 0x7f; } else { mask = 0xff; }
  if (s > 8159) s = 8159;
  s += 33; // 132 >> 2
  let seg = 0;
  for (; seg < 8; seg++) { if (s <= SEG_END[seg]) break; }
  const uval = ((seg << 4) | ((s >> (seg + 3)) & 0x0f)) ^ mask;
  return uval & 0xff;
}

/** mulaw -> PCM16 (G.711, algoritmo clásico). */
export function mulawDecode(uval: number): number {
  const u = (~uval) & 0xff;
  let t = ((u & 0x0f) << 3) + 0x84;
  t <<= ((u & 0x70) >> 4);
  const s16 = (u & 0x80) ? (0x84 - t) : (t - 0x84);
  return s16 << 2;
}

export function resampleLinear(input: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = Math.round(input[i0] * (1 - frac) + input[i1] * frac);
  }
  return out;
}

function mulawBytesToPcm16(b: Buffer): Int16Array {
  const out = new Int16Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = mulawDecode(b[i]);
  return out;
}

function pcm16ToMulawBytes(pcm: Int16Array): Buffer {
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = mulawEncode(pcm[i]);
  return out;
}

// ---------------------------------------------------------------------------
// Servidor WebSocket mínimo (lado Twilio Media Streams).
// Sin dependencias: handshake + frames de texto sobre el evento 'upgrade'.
// ---------------------------------------------------------------------------

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

interface TwilioStreamSession {
  socket: Socket;
  callId: string;
  streamSid: string | null;
  twilioCallSid: string | null;
  onEvent: (evt: any) => void;
  onClose: () => void;
  closed: boolean;
}

const activeStreams = new Map<string, TwilioStreamSession>(); // callId -> sesión

function wsSendText(socket: Socket, text: string): void {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2); header[0] = 0x81; header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

function wsSendPong(socket: Socket, payload: Buffer): void {
  const header = Buffer.alloc(2); header[0] = 0x8a; header[1] = payload.length > 125 ? 125 : payload.length;
  socket.write(Buffer.concat([header, payload.subarray(0, 125)]));
}

/** Extrae mensajes de texto completos de un buffer de frames (cliente -> servidor, enmascarados). */
function wsExtractMessages(state: { buf: Buffer; frag: Buffer[] }, chunk: Buffer): string[] {
  state.buf = Buffer.concat([state.buf, chunk]);
  const messages: string[] = [];
  for (;;) {
    const b = state.buf;
    if (b.length < 2) break;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) { if (b.length < 4) break; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) break; len = Number(b.readBigUInt64BE(2)); off = 10; }
    const maskOff = masked ? 4 : 0;
    if (b.length < off + maskOff + len) break;
    let payload = b.subarray(off + maskOff, off + maskOff + len);
    if (masked) {
      const mask = b.subarray(off, off + 4);
      const un = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) un[i] = payload[i] ^ mask[i % 4];
      payload = un;
    }
    state.buf = b.subarray(off + maskOff + len);
    if (opcode === 0x8) return messages; // close: el 'close' del socket lo maneja
    if (opcode === 0x9) { /* ping: se responde fuera */ continue; }
    if (opcode === 0x1 || opcode === 0x0) {
      state.frag.push(payload);
      if (fin) { messages.push(Buffer.concat(state.frag).toString('utf8')); state.frag = []; }
    }
    // binarios (0x2) de Twilio no se usan; se ignoran
  }
  return messages;
}

// token -> callId (el token viaja en la query del Stream URL para autenticar el upgrade)
const streamTokens = new Map<string, { callId: string; expires: number }>();

/** Limpia tokens vencidos que nunca se usaron. */
export function sweepStreamTokens(): void {
  const now = Date.now();
  for (const [t, e] of streamTokens) if (e.expires < now) streamTokens.delete(t);
}

export function issueStreamToken(callId: string): string {
  const token = crypto.randomBytes(24).toString('hex');
  streamTokens.set(token, { callId, expires: Date.now() + 30 * 60 * 1000 });
  return token;
}

/**
 * Monta el manejador 'upgrade' para /api/voice-calls/twilio/stream.
 * Llamar una vez con el http.Server real (ver server.ts).
 */
export function attachVoiceCallsUpgrade(server: HttpServer): void {
  server.on('upgrade', (req: any, socket: Socket, head: Buffer) => {
    let urlPath = '';
    try { urlPath = String(req.url || '').split('?')[0]; } catch { /* noop */ }
    if (urlPath !== WS_PATH) return; // no es nuestro: lo maneja otro listener/express
    handleTwilioUpgrade(req, socket, head);
  });
  console.log(LOG, 'manejador WebSocket montado en', WS_PATH);
}

function handleTwilioUpgrade(req: any, socket: Socket, _head: Buffer): void {
  const fail = (code: number, msg: string) => {
    try { socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\n\r\n`); } catch { /* noop */ }
    socket.destroy();
  };
  try {
    const url = new URL(String(req.url || ''), 'http://localhost');
    const token = url.searchParams.get('t') || '';
    const entry = streamTokens.get(token);
    if (!entry || entry.expires < Date.now()) { fail(401, 'Unauthorized'); return; }
    streamTokens.delete(token);
    const key = String(req.headers['sec-websocket-key'] || '');
    if (!key) { fail(400, 'Bad Request'); return; }
    const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    const session: TwilioStreamSession = {
      socket, callId: entry.callId, streamSid: null, twilioCallSid: null,
      onEvent: () => {}, onClose: () => {}, closed: false,
    };
    activeStreams.set(entry.callId, session);
    const parseState = { buf: Buffer.alloc(0), frag: [] as Buffer[] };
    socket.on('data', (chunk: Buffer) => {
      try {
        for (const text of wsExtractMessages(parseState, chunk)) {
          let evt: any = null;
          try { evt = JSON.parse(text); } catch { continue; }
          if (evt && evt.event === 'start') {
            session.streamSid = String(evt.start?.streamSid || '');
            session.twilioCallSid = String(evt.start?.callSid || '');
          }
          session.onEvent(evt);
        }
      } catch (e: any) { console.error(LOG, 'error parseando frame Twilio:', e?.message || e); }
    });
    const doClose = () => {
      if (session.closed) return;
      session.closed = true;
      activeStreams.delete(entry.callId);
      try { session.onClose(); } catch (e: any) { console.error(LOG, 'onClose:', e?.message || e); }
    };
    socket.on('close', doClose);
    socket.on('error', (e) => { console.error(LOG, 'socket Twilio:', (e as any)?.message || e); doClose(); });
    // Ping de Twilio: el parser lo detecta por opcode; respondemos pong simple
    // (los pings llegan como frames 0x9; wsExtractMessages los salta, pero el
    // socket sigue vivo por el tráfico de medios).
    bridgeSession(session);
  } catch (e: any) {
    console.error(LOG, 'upgrade Twilio falló:', e?.message || e);
    try { socket.destroy(); } catch { /* noop */ }
  }
}

/** Envía audio mulaw 8kHz (base64) a Twilio por el stream activo. */
export function sendAudioToTwilio(callId: string, mulawB64: string): boolean {
  const s = activeStreams.get(callId);
  if (!s || s.closed || !s.streamSid) return false;
  try {
    wsSendText(s.socket, JSON.stringify({ event: 'media', streamSid: s.streamSid, media: { payload: mulawB64 } }));
    return true;
  } catch { return false; }
}

export function closeTwilioStream(callId: string): void {
  const s = activeStreams.get(callId);
  if (!s || s.closed) return;
  s.closed = true;
  try { s.socket.end(); } catch { /* noop */ }
  activeStreams.delete(callId);
}

// ---------------------------------------------------------------------------
// Puente Gemini Live (server-to-server, WebSocket nativo de Node)
// Twilio (mulaw 8kHz) <-> Gemini (PCM16 16kHz entrada / 24kHz salida)
// ---------------------------------------------------------------------------

interface BridgeCallbacks {
  onAudioToTwilio: (mulaw8kB64: string) => void;
  onTranscript: (role: 'cliente' | 'asistente', text: string) => void;
  onEnd: (reason: string) => void;
  onError: (msg: string) => void;
}

interface GeminiBridge {
  sendPcm16: (pcm: Int16Array) => void;
  sendTextTurn: (text: string) => void;
  close: () => void;
}

function startGeminiBridge(opts: {
  apiKey: string; systemPrompt: string; voice: string; liveModel: string; cb: BridgeCallbacks;
}): GeminiBridge {
  const { apiKey, systemPrompt, voice, liveModel, cb } = opts;
  const url = `${GEMINI_WS_URL}?key=${encodeURIComponent(apiKey)}`;
  const ws = new WebSocket(url);
  let setupDone = false;
  let closed = false;
  const pendingAudio: Int16Array[] = [];
  let userTextBuf = '';
  let modelTextBuf = '';

  const safeSend = (obj: unknown) => {
    if (closed || ws.readyState !== 1) return;
    try { ws.send(JSON.stringify(obj)); } catch (e: any) { console.error(LOG, 'Gemini send:', e?.message || e); }
  };

  const flushTranscript = () => {
    const u = userTextBuf.trim(); const m = modelTextBuf.trim();
    userTextBuf = ''; modelTextBuf = '';
    if (u) cb.onTranscript('cliente', u);
    if (m) cb.onTranscript('asistente', m);
  };

  ws.onopen = () => {
    safeSend({
      setup: {
        model: `models/${liveModel}`,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
  };

  ws.onmessage = (ev: MessageEvent) => {
    let msg: any = null;
    try { msg = JSON.parse(String(ev.data)); } catch { return; }
    if (msg.setupComplete) {
      setupDone = true;
      for (const pcm of pendingAudio.splice(0)) bridgeSendPcm(pcm);
      // Dispara el saludo inicial del asistente
      safeSend({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'El cliente acaba de contestar la llamada. Salúdalo ahora en español siguiendo tu guion.' }] }], turnComplete: true } });
      return;
    }
    if (msg.goAway) { console.log(LOG, 'Gemini goAway:', JSON.stringify(msg.goAway).slice(0, 120)); return; }
    const sc = msg.serverContent;
    if (!sc) return;
    const parts: any[] = sc.modelTurn?.parts || [];
    for (const p of parts) {
      const b64 = p?.inlineData?.data;
      if (!b64) continue;
      try {
        const raw = Buffer.from(String(b64), 'base64');
        const pcm = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
        const down = resampleLinear(pcm, 24000, 8000);
        cb.onAudioToTwilio(pcm16ToMulawBytes(down).toString('base64'));
      } catch (e: any) { console.error(LOG, 'audio Gemini:', e?.message || e); }
    }
    if (typeof sc.inputTranscription?.text === 'string') userTextBuf += sc.inputTranscription.text;
    if (typeof sc.outputTranscription?.text === 'string') modelTextBuf += sc.outputTranscription.text;
    if (sc.turnComplete === true) flushTranscript();
  };

  const doEnd = (reason: string) => {
    if (closed) return;
    closed = true;
    flushTranscript();
    try { cb.onEnd(reason); } catch (e: any) { console.error(LOG, 'onEnd:', e?.message || e); }
  };

  ws.onerror = () => { cb.onError('Error de conexión con el proveedor de voz.'); doEnd('error'); };
  ws.onclose = () => { doEnd('cerrado'); };

  function bridgeSendPcm(pcm16: Int16Array): void {
    if (!setupDone) {
      if (pendingAudio.length < 250) pendingAudio.push(pcm16); // ~5s de buffer
      return;
    }
    safeSend({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: Buffer.from(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength).toString('base64') } } });
  }

  // Cierre de seguridad: duración máxima de llamada
  const killTimer = setTimeout(() => doEnd('timeout'), MAX_CALL_SECONDS * 1000);
  (killTimer as any)?.unref?.();

  return {
    sendPcm16: bridgeSendPcm,
    sendTextTurn: (text: string) => safeSend({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } }),
    close: () => {
      clearTimeout(killTimer);
      closed = true;
      try { ws.close(); } catch { /* noop */ }
    },
  };
}

/** Conecta el stream de Twilio con Gemini Live para una llamada. */
function bridgeSession(session: TwilioStreamSession): void {
  (async () => {
    const call = await getCall(session.callId);
    if (!call) { console.error(LOG, 'llamada no encontrada para stream:', session.callId); closeTwilioStream(session.callId); return; }
    const cfg = await readConfig();
    const googleKey = decryptField(cfg.googleKey) || (await resolveTenantGoogleKey(call.tenantId));
    if (!googleKey) {
      console.error(LOG, 'sin clave de voz para la llamada', call.id);
      await saveCall({ ...call, status: 'fallida', lastError: 'Falta la clave del proveedor de voz.', endedAt: new Date().toISOString() });
      closeTwilioStream(session.callId);
      return;
    }
    const campaign = (await listCampaigns(call.tenantId)).find((c) => c.id === call.campaignId) || null;
    const systemPrompt = renderPrompt(campaign?.systemPrompt || defaultSystemPrompt(), call);

    let bridge: GeminiBridge | null = null;
    let finalized = false;

    const finalize = async (outcome: VoiceCallStatus | null, note: string | null) => {
      if (finalized) return;
      finalized = true;
      try { bridge?.close(); } catch { /* noop */ }
      const cur = await getCall(call.id);
      if (!cur || (cur.status !== 'en_curso' && cur.status !== 'programada')) return;
      const endedAt = new Date().toISOString();
      const durationSec = cur.startedAt ? Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(cur.startedAt)) / 1000)) : 0;
      const finalStatus = outcome || inferOutcome(cur);
      await saveCall({
        ...cur, status: finalStatus, endedAt, durationSec,
        lastError: note || cur.lastError,
        costUsd: estimateCost(cur.costUsd, durationSec),
      });
      console.log(LOG, `llamada ${call.id} finalizada: ${finalStatus} (${durationSec}s)`);
      // Reintento si no contestó y quedan intentos
      if (finalStatus === 'no_contesto') {
        const camp = campaign || (await getActiveCampaign(cur.tenantId));
        const maxA = camp?.maxAttempts ?? 2;
        if (cur.attempts < maxA) {
          await saveCall({
            ...(await getCall(call.id) as VoiceCall),
            status: 'programada',
            scheduledFor: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
            lastError: 'No contestó; reintento programado.',
          });
          console.log(LOG, `llamada ${call.id}: reintento programado`);
        }
      }
      closeTwilioStream(call.id);
    };

    session.onEvent = (evt: any) => {
      if (!evt || typeof evt !== 'object') return;
      if (evt.event === 'media' && bridge) {
        try {
          const payload = String(evt.media?.payload || '');
          if (!payload) return;
          const pcm8 = mulawBytesToPcm16(Buffer.from(payload, 'base64'));
          bridge.sendPcm16(resampleLinear(pcm8, 8000, 16000));
        } catch (e: any) { console.error(LOG, 'media Twilio:', e?.message || e); }
      } else if (evt.event === 'stop') {
        finalize(null, null);
      }
    };
    session.onClose = () => { finalize(null, null); };

    bridge = startGeminiBridge({
      apiKey: googleKey,
      systemPrompt,
      voice: campaign?.voice || 'Kore',
      liveModel: cfg.liveModel || DEFAULT_LIVE_MODEL,
      cb: {
        onAudioToTwilio: (mulawB64) => { sendAudioToTwilio(call.id, mulawB64); },
        onTranscript: async (role, text) => {
          const cur = await getCall(call.id);
          if (!cur) return;
          await saveCall({ ...cur, transcript: [...cur.transcript, { role, text, at: new Date().toISOString() }] });
        },
        onEnd: (reason) => { finalize(null, reason === 'timeout' ? 'Duración máxima alcanzada.' : null); },
        onError: async (msg) => {
          const cur = await getCall(call.id);
          if (cur && (cur.status === 'en_curso' || cur.status === 'programada')) {
            await saveCall({ ...cur, status: 'fallida', lastError: msg, endedAt: new Date().toISOString() });
          }
        },
      },
    });
  })().catch(async (e: any) => {
    console.error(LOG, 'bridgeSession:', e?.message || e);
    closeTwilioStream(session.callId);
  });
}

function renderPrompt(template: string, call: VoiceCall): string {
  const total = call.orderTotal > 0 ? `$${Math.round(call.orderTotal).toLocaleString('es-CO')}` : 'el total del pedido';
  return String(template || defaultSystemPrompt())
    .replaceAll('{nombre}', call.customerName || 'cliente')
    .replaceAll('{direccion}', orderAddressOf(call) || 'la dirección registrada')
    .replaceAll('{total}', total)
    .replaceAll('{resumen}', call.orderSummary || 'su pedido');
}

function orderAddressOf(call: VoiceCall): string {
  try {
    const db = (globalThis as any).currentDB;
    const orders: any[] = Array.isArray(db?.orders) ? db.orders : [];
    const o = orders.find((x: any) => String(x?.id) === String(call.orderId));
    const a = String(o?.address || o?.direccion || '').trim();
    return a;
  } catch { return ''; }
}

/** Heurística sobre la transcripción para inferir el resultado. */
function inferOutcome(call: VoiceCall): VoiceCallStatus {
  const texts = call.transcript.map((t) => `${t.role}:${t.text}`).join('\n').toLowerCase();
  const clientSaid = call.transcript.some((t) => t.role === 'cliente' && t.text.trim().length > 1);
  if (!clientSaid) return 'no_contesto';
  if (/(cancel|anula|no lo quiero|no quiero|mejor no|no me interesa)/.test(texts)) return 'cancelada';
  if (/(confirmo|s[ií] confirmo|acepto|de acuerdo|dale|listo|vale|perfecto|sí\b)/.test(texts)) return 'confirmada';
  return 'no_contesto';
}

function estimateCost(current: number | null, durationSec: number): number {
  const mins = Math.max(1 / 60, durationSec / 60);
  const est = mins * (TWILIO_COST_PER_MIN + GEMINI_COST_PER_MIN);
  return Math.round(((current || 0) + est) * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Telefonía: crear llamada por REST (sin SDK)
// ---------------------------------------------------------------------------

function twilioAuth(cfg: TelephonyConfig): { sid: string; auth: string } {
  const sid = decryptField(cfg.twilioAccountSid);
  const token = decryptField(cfg.twilioAuthToken);
  return { sid, auth: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') };
}

async function twilioCreateCallRaw(sid: string, authHeader: string, from: string, to: string, voiceUrl: string, statusUrl: string): Promise<string> {
  if (!sid || !authHeader || !from) throw new Error('Telefonía no configurada.');
  const body = new URLSearchParams({
    To: to, From: from, Url: voiceUrl, StatusCallback: statusUrl, Record: 'true',
  });
  const res = await fetch(`${TWILIO_API}/Accounts/${encodeURIComponent(sid)}/Calls.json`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(20000),
  });
  const txt = await res.text().catch(() => '');
  if (!res.ok) {
    let detail = `La telefonía respondió HTTP ${res.status}.`;
    try {
      const j = JSON.parse(txt);
      if (j?.message) detail = `Telefonía: ${String(j.message).slice(0, 180)}`;
    } catch { /* noop */ }
    throw new Error(detail);
  }
  try {
    const j = JSON.parse(txt);
    const callSid = String(j?.sid || '');
    if (!callSid) throw new Error('La telefonía no devolvió identificador de llamada.');
    return callSid;
  } catch (e: any) {
    throw new Error(e?.message || 'Respuesta inválida de la telefonía.');
  }
}

async function twilioCreateCall(cfg: TelephonyConfig, to: string, voiceUrl: string, statusUrl: string, fromOverride?: string): Promise<string> {
  const { sid, auth } = twilioAuth(cfg);
  const from = cleanText(fromOverride || cfg.twilioFromNumber, 30);
  return twilioCreateCallRaw(sid, auth, from, to, voiceUrl, statusUrl);
}

async function twilioFetchRecordingAuth(recordingUrl: string, authHeader: string): Promise<{ status: number; contentType: string; body: ArrayBuffer } | null> {
  let url = recordingUrl;
  if (!/^https?:\/\//i.test(url)) url = `https://api.twilio.com${url}`;
  const res = await fetch(url, { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return { status: res.status, contentType: res.headers.get('content-type') || 'audio/mpeg', body: buf };
}

async function twilioFetchRecording(recordingUrl: string, cfg: TelephonyConfig): Promise<{ status: number; contentType: string; body: ArrayBuffer } | null> {
  const { auth } = twilioAuth(cfg);
  return twilioFetchRecordingAuth(recordingUrl, auth);
}

// ---------------------------------------------------------------------------
// WhatsApp de confirmación (antes de llamar)
// ---------------------------------------------------------------------------

async function resolveWhatsappConversation(phone: string): Promise<{ conversationId: string; accountId: string } | null> {
  try {
    const lookup = await zernioRequest<any>({ method: 'GET', path: '/v1/inbox/conversations?limit=100' });
    if (lookup.success === false) return null;
    const payload: any = lookup.data || {};
    const conversations: any[] = Array.isArray(payload) ? payload
      : (Array.isArray(payload.data) ? payload.data : (Array.isArray(payload.conversations) ? payload.conversations : []));
    const want = digitsOnly(phone).slice(-10);
    if (!want) return null;
    const match = conversations
      .filter((c: any) => String(c?.platform || '').toLowerCase() === 'whatsapp')
      .filter((c: any) => {
        const candidates = [c?.participantId, c?.participantPhone, c?.phone, c?.contact?.phone, c?.contact?.id]
          .map((v: any) => digitsOnly(String(v || '')));
        return candidates.some((d) => d && (d.endsWith(want) || want.endsWith(d)));
      })
      .sort((a: any, b: any) => Date.parse(b?.lastMessageAt || b?.updatedAt || 0) - Date.parse(a?.lastMessageAt || a?.updatedAt || 0))[0];
    if (!match) return null;
    const conversationId = String(match.id || match._id || '');
    const accountId = String(match.accountId || '');
    if (!conversationId || !accountId) return null;
    return { conversationId, accountId };
  } catch (e: any) {
    console.error(LOG, 'resolviendo conversación WhatsApp:', e?.message || e);
    return null;
  }
}

async function sendConfirmationWhatsApp(call: VoiceCall): Promise<boolean> {
  try {
    const conv = await resolveWhatsappConversation(call.phone);
    if (!conv) {
      console.warn(LOG, `sin conversación WhatsApp para ${call.phone}; se continúa al flujo de llamada`);
      return false;
    }
    const total = call.orderTotal > 0 ? ` por $${Math.round(call.orderTotal).toLocaleString('es-CO')} COP` : '';
    const text = `Hola ${call.customerName || 'cliente'}, soy Valeria de Xorbit 360. Tu pedido (${call.orderSummary || 'registrado'})${total} quedó registrado con pago contra entrega. Responde SÍ para confirmar la entrega. Si no respondes, te llamaremos en unos minutos para confirmar. ¡Gracias!`;
    const r = await enviarMensajeZernio({
      accountId: conv.accountId,
      conversationId: conv.conversationId,
      platform: 'whatsapp',
      text,
      orderId: call.orderId,
      idempotencyKey: `voicecall-${call.id}`,
    });
    if (!r.success) {
      console.warn(LOG, 'WhatsApp no enviado:', r.error || 'sin detalle');
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn(LOG, 'WhatsApp falló:', e?.message || e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Detección de respuesta del cliente en el historial (cancela la llamada)
// ---------------------------------------------------------------------------

export function detectCustomerReply(phone: string, sinceTs: number): { replied: boolean; text: string } {
  try {
    const hist = (globalThis as any).currentDB?.messagesHistory;
    if (!hist || typeof hist !== 'object') return { replied: false, text: '' };
    const want = digitsOnly(phone).slice(-10);
    if (!want) return { replied: false, text: '' };
    for (const key of Object.keys(hist)) {
      const kd = digitsOnly(key);
      if (!kd || !(kd.endsWith(want) || want.endsWith(kd))) continue;
      const arr = hist[key];
      if (!Array.isArray(arr)) continue;
      for (const m of arr) {
        const role = String(m?.role || '');
        if (role !== 'user' && role !== 'client') continue;
        const ts = Number(m?.timestamp || 0);
        if (ts && ts > sinceTs) return { replied: true, text: String(m?.text || '').slice(0, 200) };
      }
    }
  } catch (e: any) { console.error(LOG, 'detectCustomerReply:', e?.message || e); }
  return { replied: false, text: '' };
}

// ---------------------------------------------------------------------------
// Orquestación: pedido -> WhatsApp -> llamada
// ---------------------------------------------------------------------------

function isCodPayment(pm: string): boolean {
  return /contra[\s_-]?entrega|\bcod\b|efectivo/i.test(String(pm || ''));
}

function findFullOrder(orderId: string): any | null {
  try {
    const db = (globalThis as any).currentDB;
    const orders: any[] = Array.isArray(db?.orders) ? db.orders : [];
    return orders.find((o: any) => String(o?.id) === String(orderId)) || null;
  } catch { return null; }
}

function summarizeOrder(order: any, eventData: any): { summary: string; total: number; name: string; phone: string; address: string } {
  const items: any[] = Array.isArray(order?.items) ? order.items : (Array.isArray(eventData?.items) ? eventData.items : []);
  const summary = items.map((it: any) => `${it.qty || 1}x ${it.name || 'producto'}`).join(', ').slice(0, 300)
    || String(eventData?.summary || '').slice(0, 300) || 'pedido registrado';
  const total = Number(order?.amount ?? order?.total ?? eventData?.total ?? 0) || 0;
  return {
    summary,
    total,
    name: String(order?.customerName ?? eventData?.customerName ?? 'Cliente').slice(0, 80),
    phone: String(order?.phone ?? eventData?.phone ?? ''),
    address: String(order?.address ?? eventData?.address ?? '').slice(0, 200),
  };
}

async function handleOrderCreated(data: any): Promise<void> {
  try {
    const orderId = String(data?.id || '');
    const paymentMethod = String(data?.paymentMethod || data?.metodoPago || '');
    if (!orderId || !isCodPayment(paymentMethod)) return;
    const tenant = String(data?.tenantId || data?.workspaceId || 'default').slice(0, 80);
    const existing = await findActiveCallByOrder(orderId, tenant);
    if (existing) return; // ya hay una llamada programada/en curso para este pedido
    const campaign = await getActiveCampaign(tenant);
    if (!campaign) { console.log(LOG, 'sin campaña activa; se omite pedido', orderId); return; }

    const full = findFullOrder(orderId);
    const info = summarizeOrder(full, data);
    const e164 = normalizePhoneE164(info.phone);
    if (!e164) { console.warn(LOG, 'pedido', orderId, 'sin teléfono válido; se omite'); return; }

    const now = new Date().toISOString();
    const call: VoiceCall = {
      id: uid('vc'), tenantId: tenant, campaignId: campaign.id, orderId,
      customerName: info.name, phone: e164,
      orderSummary: info.summary, orderTotal: info.total,
      status: 'programada', attempts: 0,
      whatsappSentAt: null, whatsappFailed: false, whatsappReplied: false, customerReplied: false,
      scheduledFor: null, startedAt: null, endedAt: null, durationSec: null,
      twilioCallSid: null, recordingUrl: null, costUsd: null,
      transcript: [], lastError: null, createdAt: now, updatedAt: now,
    };
    await saveCall(call);
    console.log(LOG, `pedido COD ${orderId} -> llamada ${call.id} programada`);

    if (campaign.whatsappFirst) {
      const ok = await sendConfirmationWhatsApp(call);
      const cur = await getCall(call.id);
      if (cur) {
        await saveCall({
          ...cur,
          whatsappSentAt: ok ? new Date().toISOString() : cur.whatsappSentAt,
          whatsappFailed: !ok,
        });
      }
    }
  } catch (e: any) {
    console.error(LOG, 'handleOrderCreated:', e?.message || e);
  }
}

/** Entrada directa por si el coordinador quiere disparar el flujo sin pasar por el bus. */
export async function notifyOrderCreatedDirecto(order: any): Promise<void> {
  await handleOrderCreated(order || {});
}

// ---------------------------------------------------------------------------
// Disparo de la llamada
// ---------------------------------------------------------------------------

async function triggerCall(call: VoiceCall, campaign: VoiceCallCampaign): Promise<void> {
  const cfg = await readConfig();
  // Telefonía efectiva: plataforma integrada (cuenta maestra + número verificado
  // del tenant + cobro a billetera) o modo clásico (cuenta propia del tenant).
  const { resolveCallTelephony, assertVoiceBalance } = await import('./voicePlatform.ts');
  const tel = await resolveCallTelephony(call.tenantId);
  if (tel.platform) {
    await assertVoiceBalance(call.tenantId, 2);
  }
  const googleKey = decryptField(cfg.googleKey) || (await resolveTenantGoogleKey(call.tenantId));
  if (!googleKey) throw new Error('Falta la clave del proveedor de voz.');
  const to = call.phone; // ya viene en E.164
  const host = cleanText(cfg.publicHost, 120) || 'crm.xorbit360.com';
  const voiceUrl = `https://${host}/api/voice-calls/twilio/voice`;
  const statusUrl = `https://${host}/api/voice-calls/twilio/status`;
  const twilioSid = await twilioCreateCallRaw(tel.sid, tel.auth, tel.from, to, voiceUrl, statusUrl);
  const cur = (await getCall(call.id)) || call;
  await saveCall({
    ...cur, status: 'en_curso', attempts: cur.attempts + 1,
    startedAt: new Date().toISOString(), twilioCallSid: twilioSid, lastError: null,
  });
  console.log(LOG, `llamada ${call.id} disparada (${tel.platform ? 'plataforma' : 'cuenta propia'} ${twilioSid.slice(0, 10)}…)`);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

let schedulerStarted = false;
let subscribed = false;

function bogotaHHMM(d: Date): string {
  try {
    return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  } catch { return '12:00'; }
}

function inSchedule(campaign: VoiceCallCampaign, now: Date): boolean {
  const hhmm = bogotaHHMM(now);
  return hhmm >= campaign.scheduleStart && hhmm <= campaign.scheduleEnd;
}

async function healStaleCalls(): Promise<void> {
  try {
    const calls = await listCalls('default', 'en_curso', 200);
    const tenants = new Set<string>(['default']);
    for (const c of calls) tenants.add(c.tenantId);
    for (const t of tenants) {
      const list = await listCalls(t, 'en_curso', 200);
      for (const c of list) {
        const ageMs = Date.now() - Date.parse(c.startedAt || c.createdAt);
        if (ageMs > 15 * 60 * 1000) {
          const campaign = (await listCampaigns(t)).find((x) => x.id === c.campaignId);
          const maxA = campaign?.maxAttempts ?? 2;
          if (c.attempts < maxA) {
            await saveCall({ ...c, status: 'programada', scheduledFor: new Date().toISOString(), lastError: 'Llamada interrumpida; reintentando.' });
          } else {
            await saveCall({ ...c, status: 'fallida', endedAt: new Date().toISOString(), lastError: 'Llamada interrumpida sin completar.' });
          }
          console.log(LOG, 'llamada estancada reparada:', c.id);
        }
      }
    }
  } catch (e: any) { console.error(LOG, 'healStaleCalls:', e?.message || e); }
}

async function schedulerTick(): Promise<void> {
  const tenants = new Set<string>(['default']);
  try {
    const sample = await listCalls('default', 'programada', 200);
    for (const c of sample) tenants.add(c.tenantId);
  } catch { /* noop */ }
  const now = new Date();
  for (const tenant of tenants) {
    let calls: VoiceCall[] = [];
    try { calls = await listCalls(tenant, 'programada', 200); } catch (e: any) { console.error(LOG, 'tick list:', e?.message || e); continue; }
    for (const call of calls) {
      try {
        const campaign = (await listCampaigns(tenant)).find((c) => c.id === call.campaignId)
          || (await listCampaigns(tenant)).find((c) => c.active);
        if (!campaign || !campaign.active) continue;
        if (call.scheduledFor && Date.parse(call.scheduledFor) > now.getTime()) continue;
        const baseTs = call.whatsappSentAt ? Date.parse(call.whatsappSentAt) : Date.parse(call.createdAt);
        const graceMs = call.whatsappSentAt ? campaign.delayMin * 60 * 1000
          : (call.whatsappFailed ? WA_FAILED_GRACE_MS : 60 * 1000);
        if (now.getTime() < baseTs + graceMs) continue;
        if (!inSchedule(campaign, now)) continue;
        // ¿Respondió el cliente por WhatsApp en la ventana? Cancela la llamada.
        const reply = detectCustomerReply(call.phone, baseTs);
        if (reply.replied) {
          await saveCall({
            ...call, status: 'cancelada', whatsappReplied: true, customerReplied: true,
            lastError: 'El cliente respondió por WhatsApp; llamada cancelada.',
            transcript: [...call.transcript, { role: 'cliente', text: `[WhatsApp] ${reply.text}`, at: new Date().toISOString() }],
          });
          console.log(LOG, `llamada ${call.id} cancelada: cliente respondió por WhatsApp`);
          continue;
        }
        if (call.attempts >= campaign.maxAttempts) {
          await saveCall({ ...call, status: 'fallida', lastError: `Sin respuesta tras ${campaign.maxAttempts} intento(s).` });
          continue;
        }
        await triggerCall(call, campaign);
      } catch (e: any) {
        const msg = String(e?.message || 'Error al disparar la llamada');
        console.error(LOG, `llamada ${call.id}:`, msg);
        const cur = (await getCall(call.id)) || call;
        if (/no configurada|Falta la clave/i.test(msg)) {
          // Error de configuración: reintentar no lo arregla
          await saveCall({ ...cur, status: 'fallida', lastError: msg });
        } else {
          await saveCall({ ...cur, status: 'programada', scheduledFor: new Date(Date.now() + RETRY_DELAY_MS).toISOString(), lastError: msg });
        }
      }
    }
  }
}

export function initVoiceCallsScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  if (!subscribed) {
    subscribed = true;
    subscribePlatformEvent('order.created', (data) => { handleOrderCreated(data).catch(() => {}); });
  }
  ensureDefaultCampaign('default').catch((e: any) => console.error(LOG, 'campaña por defecto:', e?.message || e));
  healStaleCalls().catch(() => {});
  setInterval(() => { schedulerTick().catch((e: any) => console.error(LOG, 'scheduler:', e?.message || e)); }, 30_000);
  setInterval(() => { try { sweepStreamTokens(); } catch { /* noop */ } }, 5 * 60 * 1000);
  setTimeout(() => { schedulerTick().catch(() => {}); }, 5_000);
  console.log(LOG, 'scheduler iniciado (cada 30s)');
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

function readFormBody(req: Request): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    try {
      const b: any = (req as any).body;
      if (b && typeof b === 'object' && Object.keys(b).length > 0) {
        const out: Record<string, string> = {};
        for (const k of Object.keys(b)) out[k] = String(b[k]);
        resolve(out);
        return;
      }
    } catch { /* noop */ }
    let raw = '';
    req.on('data', (ch: Buffer) => { raw += ch.toString('utf8'); if (raw.length > 200_000) req.destroy(); });
    req.on('end', () => {
      const out: Record<string, string> = {};
      try {
        for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
      } catch { /* noop */ }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}

function sanitizeCampaign(c: VoiceCallCampaign) {
  return { ...c };
}

function summarizeCall(c: VoiceCall, campaignName: string) {
  const last = c.transcript.length > 0 ? c.transcript[c.transcript.length - 1] : null;
  return {
    id: c.id, campaignId: c.campaignId, campaignName, orderId: c.orderId,
    customerName: c.customerName, phone: c.phone,
    orderSummary: c.orderSummary, orderTotal: c.orderTotal,
    status: c.status, attempts: c.attempts,
    whatsappSentAt: c.whatsappSentAt, whatsappReplied: c.whatsappReplied,
    startedAt: c.startedAt, endedAt: c.endedAt, durationSec: c.durationSec,
    recordingUrl: c.recordingUrl ? true : false, costUsd: c.costUsd,
    transcriptCount: c.transcript.length,
    lastMessage: last ? `${last.role}: ${last.text.slice(0, 120)}` : null,
    lastError: c.lastError, createdAt: c.createdAt, updatedAt: c.updatedAt,
  };
}

/** Rutas públicas de la telefonía (Twilio las llama sin sesión). */
export function setupVoiceCallsPublicRoutes(app: Express): void {
  // TwiML: Twilio pide estas instrucciones al contestar la llamada
  app.post('/api/voice-calls/twilio/voice', async (req, res) => {
    try {
      const form = await readFormBody(req);
      const callSid = String(form.CallSid || '');
      const call = callSid ? await findCallByTwilioSid(callSid) : null;
      if (!call) { res.type('text/xml').send('<Response><Hangup/></Response>'); return; }
      const token = issueStreamToken(call.id);
      const host = String(req.headers.host || '');
      const streamUrl = `wss://${host}${WS_PATH}?t=${token}`;
      const twiml = `<Response><Connect><Stream url="${streamUrl}"><Parameter name="callId" value="${call.id}"/></Stream></Connect></Response>`;
      res.type('text/xml').send(twiml);
    } catch (e: any) {
      console.error(LOG, 'twilio/voice:', e?.message || e);
      res.type('text/xml').send('<Response><Hangup/></Response>');
    }
  });

  // Callback de estado de Twilio (form-urlencoded)
  app.post('/api/voice-calls/twilio/status', async (req, res) => {
    try {
      const form = await readFormBody(req);
      const callSid = String(form.CallSid || form.Callsid || '');
      if (!callSid) { res.sendStatus(200); return; }
      const call = await findCallByTwilioSid(callSid);
      if (!call) { res.sendStatus(200); return; }
      const twilioStatus = String(form.CallStatus || '').toLowerCase();
      const duration = form.CallDuration ? Number(form.CallDuration) : null;
      const recordingUrl = String(form.RecordingUrl || '');
      const price = form.Price ? Number(form.Price) : null;
      let status: VoiceCallStatus = call.status;
      let lastError = call.lastError;
      if (['no-answer', 'busy'].includes(twilioStatus)) {
        if (call.status === 'en_curso' || call.status === 'programada') { status = 'no_contesto'; lastError = `La llamada no fue contestada (${twilioStatus}).`; }
      } else if (['failed', 'canceled'].includes(twilioStatus)) {
        if (call.status === 'en_curso' || call.status === 'programada') { status = 'fallida'; lastError = `La telefonía reportó: ${twilioStatus}.`; }
      } else if (twilioStatus === 'completed' && (call.status === 'en_curso' || call.status === 'programada')) {
        status = inferOutcome(call) === 'confirmada' ? 'confirmada' : (call.transcript.length > 0 ? call.status : 'no_contesto');
        if (status === 'no_contesto') lastError = 'Llamada terminada sin conversación.';
      }
      const endedAt = ['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(twilioStatus)
        ? new Date().toISOString() : call.endedAt;
      const costUsd = price != null && !Number.isNaN(price)
        ? Math.round(Math.abs(price) * 10000) / 10000
        : (duration != null ? estimateCost(call.costUsd, duration) : call.costUsd);
      await saveCall({
        ...call, status, lastError, endedAt,
        durationSec: duration != null && !Number.isNaN(duration) ? duration : call.durationSec,
        recordingUrl: recordingUrl || call.recordingUrl,
        costUsd,
      });
      // Modo plataforma: descontar el costo real (+margen) de la billetera del tenant
      if (['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(twilioStatus)) {
        try {
          const { platformActive, chargeVoiceCall } = await import('./voicePlatform.ts');
          if (await platformActive()) {
            const dur = duration != null && !Number.isNaN(duration) ? duration : call.durationSec;
            await chargeVoiceCall(call.tenantId, call.id, price, dur);
          }
        } catch (e: any) { console.warn(LOG, 'cobrando llamada:', e?.message || e); }
      }
      // Reintento si no contestó y quedan intentos
      if (status === 'no_contesto') {
        const updated = (await getCall(call.id)) || call;
        const campaign = (await listCampaigns(updated.tenantId)).find((c) => c.id === updated.campaignId);
        if (updated.attempts < (campaign?.maxAttempts ?? 2)) {
          await saveCall({
            ...updated, status: 'programada',
            scheduledFor: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
            lastError: 'No contestó; reintento programado.',
          });
        }
      }
      res.sendStatus(200);
    } catch (e: any) {
      console.error(LOG, 'twilio/status:', e?.message || e);
      res.sendStatus(200);
    }
  });
}

/** Rutas de administración (detrás de la sesión del CRM). */
export function setupVoiceCallsRoutes(app: Express): void {
  // ---- Configuración de telefonía y voz (etiquetas genéricas, sin marcas) ----
  app.get('/api/voice-calls/config', route(async (_req, res) => {
    const cfg = await readConfig();
    const { platformActive, readMasterConfig } = await import('./voicePlatform.ts');
    const master = await readMasterConfig();
    const platActive = await platformActive();
    res.json({
      success: true,
      telefonia: {
        accountSidMasked: maskSecret(cfg.twilioAccountSid),
        fromNumber: cfg.twilioFromNumber || null,
        configured: Boolean(decryptField(cfg.twilioAccountSid) && decryptField(cfg.twilioAuthToken) && cfg.twilioFromNumber),
      },
      platform: {
        active: platActive,
        masterConfigured: Boolean(String(master.accountSid || '').length > 0 && String(master.authToken || '').length > 0),
      },
      googleKeySet: Boolean(decryptField(cfg.googleKey)),
      googleKeyMasked: maskSecret(cfg.googleKey),
      delayDefaultMin: cfg.delayDefaultMin,
      publicHost: cfg.publicHost,
      liveModel: cfg.liveModel,
    });
  }));

  app.put('/api/voice-calls/config', route(async (req, res) => {
    const body = req.body || {};
    const cfg = await readConfig();
    const sid = cleanText(body.twilioAccountSid, 80);
    const token = cleanText(body.twilioAuthToken, 120);
    const from = cleanText(body.twilioFromNumber, 30);
    const gkey = cleanText(body.googleKey, 200);
    if (sid) cfg.twilioAccountSid = encryptSecret(sid);
    if (token) cfg.twilioAuthToken = encryptSecret(token);
    if (body.twilioFromNumber !== undefined) cfg.twilioFromNumber = from;
    if (gkey) cfg.googleKey = encryptSecret(gkey);
    if (body.clearGoogleKey === true) cfg.googleKey = '';
    if (body.clearTelefonia === true) { cfg.twilioAccountSid = ''; cfg.twilioAuthToken = ''; cfg.twilioFromNumber = ''; }
    if (body.delayDefaultMin !== undefined) {
      const d = Number(body.delayDefaultMin);
      if (Number.isFinite(d) && d >= 1 && d <= 120) cfg.delayDefaultMin = Math.round(d);
    }
    if (body.publicHost !== undefined) cfg.publicHost = cleanText(body.publicHost, 120) || cfg.publicHost;
    if (body.liveModel !== undefined) {
      const m = cleanText(body.liveModel, 80);
      if (m) cfg.liveModel = m;
    }
    await writeConfig(cfg);
    res.json({
      success: true,
      telefonia: {
        accountSidMasked: maskSecret(cfg.twilioAccountSid),
        fromNumber: cfg.twilioFromNumber || null,
        configured: Boolean(decryptField(cfg.twilioAccountSid) && decryptField(cfg.twilioAuthToken) && cfg.twilioFromNumber),
      },
      googleKeySet: Boolean(decryptField(cfg.googleKey)),
      googleKeyMasked: maskSecret(cfg.googleKey),
      delayDefaultMin: cfg.delayDefaultMin,
      publicHost: cfg.publicHost,
      liveModel: cfg.liveModel,
    });
  }));

  // ---- Campañas ----
  app.get('/api/voice-calls/campaigns', route(async (req, res) => {
    const list = await listCampaigns(tenantId(req));
    res.json({ success: true, campaigns: list.map(sanitizeCampaign) });
  }));

  app.post('/api/voice-calls/campaigns', route(async (req, res) => {
    const body = req.body || {};
    if (!cleanText(body.name, 120)) { res.status(400).json({ success: false, error: 'La campaña necesita un nombre.' }); return; }
    const c = buildCampaign(tenantId(req), {
      name: cleanText(body.name, 120),
      active: body.active !== false,
      delayMin: Number(body.delayMin),
      scheduleStart: cleanText(body.scheduleStart, 5),
      scheduleEnd: cleanText(body.scheduleEnd, 5),
      maxAttempts: Number(body.maxAttempts),
      whatsappFirst: body.whatsappFirst !== false,
      systemPrompt: String(body.systemPrompt || '').slice(0, 4000),
      voice: cleanText(body.voice, 40),
    });
    if (!/^\d{2}:\d{2}$/.test(c.scheduleStart) || !/^\d{2}:\d{2}$/.test(c.scheduleEnd)) {
      res.status(400).json({ success: false, error: 'El horario debe tener formato HH:MM.' });
      return;
    }
    await saveCampaign(c);
    res.json({ success: true, campaign: sanitizeCampaign(c) });
  }));

  app.put('/api/voice-calls/campaigns/:id', route(async (req, res) => {
    const id = String(req.params.id || '');
    const list = await listCampaigns(tenantId(req));
    const c = list.find((x) => x.id === id);
    if (!c) { res.status(404).json({ success: false, error: 'Campaña no encontrada.' }); return; }
    const body = req.body || {};
    const next = buildCampaign(tenantId(req), {
      ...c,
      name: body.name !== undefined ? cleanText(body.name, 120) || c.name : c.name,
      active: body.active !== undefined ? body.active !== false : c.active,
      delayMin: body.delayMin !== undefined ? Number(body.delayMin) : c.delayMin,
      scheduleStart: body.scheduleStart !== undefined ? cleanText(body.scheduleStart, 5) : c.scheduleStart,
      scheduleEnd: body.scheduleEnd !== undefined ? cleanText(body.scheduleEnd, 5) : c.scheduleEnd,
      maxAttempts: body.maxAttempts !== undefined ? Number(body.maxAttempts) : c.maxAttempts,
      whatsappFirst: body.whatsappFirst !== undefined ? body.whatsappFirst !== false : c.whatsappFirst,
      systemPrompt: body.systemPrompt !== undefined ? String(body.systemPrompt).slice(0, 4000) : c.systemPrompt,
      voice: body.voice !== undefined ? cleanText(body.voice, 40) : c.voice,
    });
    await saveCampaign(next);
    res.json({ success: true, campaign: sanitizeCampaign(next) });
  }));

  app.delete('/api/voice-calls/campaigns/:id', route(async (req, res) => {
    const id = String(req.params.id || '');
    const list = await listCampaigns(tenantId(req));
    if (!list.some((x) => x.id === id)) { res.status(404).json({ success: false, error: 'Campaña no encontrada.' }); return; }
    await deleteCampaign(id);
    res.json({ success: true });
  }));

  // ---- Llamadas ----
  app.get('/api/voice-calls/calls', route(async (req, res) => {
    const t = tenantId(req);
    const status = cleanText(req.query.status, 20) || undefined;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const calls = await listCalls(t, status, limit);
    const campaigns = await listCampaigns(t);
    const nameOf = (id: string) => campaigns.find((c) => c.id === id)?.name || '—';
    res.json({ success: true, calls: calls.map((c) => summarizeCall(c, nameOf(c.campaignId))) });
  }));

  app.get('/api/voice-calls/calls/:id', route(async (req, res) => {
    const c = await getCall(String(req.params.id || ''));
    if (!c) { res.status(404).json({ success: false, error: 'Llamada no encontrada.' }); return; }
    const campaigns = await listCampaigns(c.tenantId);
    res.json({
      success: true,
      call: { ...summarizeCall(c, campaigns.find((x) => x.id === c.campaignId)?.name || '—'), transcript: c.transcript, recordingUrl: c.recordingUrl },
    });
  }));

  app.get('/api/voice-calls/calls/:id/recording', route(async (req, res) => {
    const c = await getCall(String(req.params.id || ''));
    if (!c || !c.recordingUrl) { res.status(404).json({ success: false, error: 'Esta llamada aún no tiene grabación disponible.' }); return; }
    const { resolveCallTelephony } = await import('./voicePlatform.ts');
    const tel = await resolveCallTelephony(c.tenantId);
    const rec = await twilioFetchRecordingAuth(c.recordingUrl, tel.auth);
    if (!rec) { res.status(404).json({ success: false, error: 'No se pudo descargar la grabación de la telefonía.' }); return; }
    res.setHeader('Content-Type', rec.contentType);
    res.send(Buffer.from(rec.body));
  }));

  // Llamada de prueba inmediata
  app.post('/api/voice-calls/test', route(async (req, res) => {
    const body = req.body || {};
    const to = normalizePhoneE164(String(body.to || ''));
    if (!to) { res.status(400).json({ success: false, error: 'Indica un número válido para la prueba.' }); return; }
    const t = tenantId(req);
    // Valida telefonía efectiva (plataforma o cuenta propia) antes de crear el registro
    const { resolveCallTelephony, assertVoiceBalance } = await import('./voicePlatform.ts');
    const tel = await resolveCallTelephony(t);
    if (tel.platform) await assertVoiceBalance(t, 2);
    let campaign: VoiceCallCampaign | null = null;
    if (body.campaignId) campaign = (await listCampaigns(t)).find((c) => c.id === String(body.campaignId)) || null;
    campaign = campaign || (await getActiveCampaign(t));
    if (!campaign) { res.status(400).json({ success: false, error: 'No hay campaña activa.' }); return; }
    const now = new Date().toISOString();
    const call: VoiceCall = {
      id: uid('vc'), tenantId: t, campaignId: campaign.id, orderId: 'TEST',
      customerName: 'Prueba', phone: to, orderSummary: 'Llamada de prueba', orderTotal: 0,
      status: 'programada', attempts: 0,
      whatsappSentAt: null, whatsappFailed: false, whatsappReplied: false, customerReplied: false,
      scheduledFor: null, startedAt: null, endedAt: null, durationSec: null,
      twilioCallSid: null, recordingUrl: null, costUsd: null,
      transcript: [], lastError: null, createdAt: now, updatedAt: now,
    };
    await saveCall(call);
    try {
      await triggerCall(call, campaign);
      res.json({ success: true, callId: call.id });
    } catch (e: any) {
      const cur = (await getCall(call.id)) || call;
      await saveCall({ ...cur, status: 'fallida', lastError: String(e?.message || 'No se pudo iniciar la llamada de prueba.') });
      res.status(400).json({ success: false, error: String(e?.message || 'No se pudo iniciar la llamada de prueba.') });
    }
  }));
}
