import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import { decryptSecret, encryptSecret, isEncryptedSecret, maskSecret } from './secretBox.ts';

// ============================================================================
// Telefonía integrada estilo plataforma — Xorbit 360
// Xorbit opera UNA cuenta maestra de telefonía. El usuario final, todo dentro
// del CRM: (1) conecta su propio número como identificador de llamadas
// mediante verificación por llamada con código, (2) compra minutos con su
// billetera (recarga vía Bold). Sin cuentas externas para el usuario final.
// La marca del proveedor de telefonía nunca se expone en la UI.
// ============================================================================

const LOG = '[VoicePlatform]';
const MASTER_KEY = 'voice.master.config';
const PRICING_KEY = 'voice.pricing';
const PENDING_TOPUPS_KEY = 'voice.topups.pending';
const NUMBERS_FALLBACK_KEY = 'voice.platform.numbers';
const WALLETS_FALLBACK_KEY = 'voice.platform.wallets';
const LEDGER_FALLBACK_KEY = 'voice.platform.ledger';

const TWILIO_API = 'https://api.twilio.com/2010-04-01';
const USD_COP = 4000;

// Costos base por minuto (cuando la telefonía no reporta precio real)
export const PLATFORM_TWILIO_COST_PER_MIN = 0.05;
export const PLATFORM_GEMINI_COST_PER_MIN = 0.023;

interface MasterConfig {
  accountSid: string; // cifrado
  authToken: string; // cifrado
  enabled: boolean;
}

export interface VoicePackage {
  id: string;
  minutes: number;
  priceCop: number;
  label: string;
}

interface VoicePricing {
  costPerMinUsd: number;
  markupPct: number;
  packages: VoicePackage[];
}

export interface TenantNumber {
  id: string;
  tenantId: string;
  phone: string; // E.164
  label: string;
  verified: boolean;
  isPrimary: boolean;
  twilioSid: string | null;
  createdAt: string;
}

const DEFAULT_MASTER: MasterConfig = { accountSid: '', authToken: '', enabled: true };

const DEFAULT_PRICING: VoicePricing = {
  costPerMinUsd: PLATFORM_TWILIO_COST_PER_MIN + PLATFORM_GEMINI_COST_PER_MIN,
  markupPct: 30,
  packages: [
    { id: 'vox-60', minutes: 60, priceCop: 29900, label: '60 minutos' },
    { id: 'vox-200', minutes: 200, priceCop: 89900, label: '200 minutos' },
    { id: 'vox-500', minutes: 500, priceCop: 199900, label: '500 minutos' },
  ],
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
      if (!res.headersSent) res.status(status).json({ success: false, error: err?.message || 'Error interno de la plataforma de voz.' });
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

function isSuperAdmin(req: Request): boolean {
  return (req as any)?.authUser?.role === 'superadmin';
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function digitsOnly(v: string): string {
  return String(v || '').replace(/\D/g, '');
}

/** Normaliza a E.164; Colombia (+57) por defecto para números locales de 10 dígitos. */
export function normalizePhoneE164(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return '';
  if (String(raw).trim().startsWith('+')) return '+' + d;
  if (d.length === 12 && d.startsWith('57')) return '+' + d;
  if (d.length === 11 && d.startsWith('57')) return '+' + d;
  if (d.length === 10) return '+57' + d;
  if (d.length > 12) return '+' + d;
  return '';
}

function decryptField(v: unknown): string {
  const s = String(v || '');
  if (!s) return '';
  try { return (isEncryptedSecret(s) ? decryptSecret(s) : s).trim(); }
  catch { return ''; }
}

// ---------------------------------------------------------------------------
// app_settings (workspace 'default')
// ---------------------------------------------------------------------------

async function readSetting(key: string): Promise<any> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data } = await (client.from('app_settings').select('value')
      .eq('workspace_id', 'default').eq('key', key).maybeSingle() as any);
    const raw = data?.value;
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  } catch { return null; }
}

async function writeSetting(key: string, value: any): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no disponible');
  const { error } = await (client.from('app_settings').upsert(
    { workspace_id: 'default', key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
    { onConflict: 'workspace_id,key' },
  ) as any);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Config maestra + precios
// ---------------------------------------------------------------------------

export async function readMasterConfig(): Promise<MasterConfig> {
  const raw = await readSetting(MASTER_KEY);
  return { ...DEFAULT_MASTER, ...(raw || {}) };
}

async function writeMasterConfig(cfg: MasterConfig): Promise<void> {
  await writeSetting(MASTER_KEY, cfg);
}

export async function readPricing(): Promise<VoicePricing> {
  const raw = await readSetting(PRICING_KEY);
  const merged: VoicePricing = { ...DEFAULT_PRICING, ...(raw || {}) };
  if (!Array.isArray(merged.packages) || merged.packages.length === 0) merged.packages = DEFAULT_PRICING.packages;
  if (!Number.isFinite(merged.costPerMinUsd) || merged.costPerMinUsd <= 0) merged.costPerMinUsd = DEFAULT_PRICING.costPerMinUsd;
  if (!Number.isFinite(merged.markupPct) || merged.markupPct < 0) merged.markupPct = DEFAULT_PRICING.markupPct;
  return merged;
}

async function writePricing(p: VoicePricing): Promise<void> {
  await writeSetting(PRICING_KEY, p);
}

export function pricePerMinUsd(p: VoicePricing): number {
  return +(p.costPerMinUsd * (1 + p.markupPct / 100)).toFixed(4);
}

/** ¿Está activa la telefonía integrada? (credenciales maestras presentes) */
export async function platformActive(): Promise<boolean> {
  const cfg = await readMasterConfig();
  return cfg.enabled && Boolean(decryptField(cfg.accountSid) && decryptField(cfg.authToken));
}

function masterAuth(cfg: MasterConfig): { sid: string; auth: string } {
  const sid = decryptField(cfg.accountSid);
  const token = decryptField(cfg.authToken);
  return { sid, auth: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') };
}

// ---------------------------------------------------------------------------
// Tablas: voice_tenant_numbers / voice_wallets / voice_wallet_ledger
// (Supabase con fallback a app_settings, mismo patrón que voiceCalls)
// ---------------------------------------------------------------------------

let tablesCheck: 'unknown' | 'yes' | 'no' = 'unknown';

async function tablesAvailable(): Promise<boolean> {
  if (tablesCheck !== 'unknown') return tablesCheck === 'yes';
  const client = getSupabase();
  if (!client) { tablesCheck = 'no'; return false; }
  try {
    const { error } = await (client.from('voice_tenant_numbers').select('id').limit(1) as any);
    if (error && (/does not exist|42P01/i.test(String(error.code || '') + ' ' + String(error.message || '')))) {
      tablesCheck = 'no'; return false;
    }
    tablesCheck = 'yes'; return true;
  } catch { tablesCheck = 'no'; return false; }
}

async function readFallbackArray(key: string): Promise<any[]> {
  const raw = await readSetting(key);
  return Array.isArray(raw) ? raw : [];
}

async function writeFallbackArray(key: string, arr: any[]): Promise<void> {
  await writeSetting(key, arr.slice(0, 500));
}

// ---- Números del tenant ----

function rowToNumber(r: any): TenantNumber {
  return {
    id: String(r.id), tenantId: String(r.tenant_id || 'default'),
    phone: String(r.phone), label: String(r.label || ''),
    verified: Boolean(r.verified), isPrimary: Boolean(r.is_primary),
    twilioSid: r.twilio_sid ? String(r.twilio_sid) : null,
    createdAt: String(r.created_at || new Date().toISOString()),
  };
}

export async function listTenantNumbers(tenant: string): Promise<TenantNumber[]> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data, error } = await (client.from('voice_tenant_numbers').select('*')
      .eq('tenant_id', tenant).order('created_at', { ascending: true }) as any);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToNumber);
  }
  return readFallbackArray(NUMBERS_FALLBACK_KEY)
    .filter((r: any) => String(r.tenant_id || 'default') === tenant).map(rowToNumber);
}

export async function getTenantPrimaryNumber(tenant: string): Promise<string> {
  const list = await listTenantNumbers(tenant);
  const primary = list.find((n) => n.verified && n.isPrimary) || list.find((n) => n.verified);
  return primary ? primary.phone : '';
}

async function saveTenantNumber(n: TenantNumber): Promise<void> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_tenant_numbers').upsert({
      id: n.id, tenant_id: n.tenantId, phone: n.phone, label: n.label,
      verified: n.verified, is_primary: n.isPrimary, twilio_sid: n.twilioSid,
    }, { onConflict: 'id' }) as any);
    if (error) throw new Error(error.message);
    return;
  }
  const arr = await readFallbackArray(NUMBERS_FALLBACK_KEY);
  const idx = arr.findIndex((r: any) => String(r.id) === n.id);
  const row = { id: n.id, tenant_id: n.tenantId, phone: n.phone, label: n.label, verified: n.verified, is_primary: n.isPrimary, twilio_sid: n.twilioSid, created_at: n.createdAt };
  if (idx >= 0) arr[idx] = row; else arr.push(row);
  await writeFallbackArray(NUMBERS_FALLBACK_KEY, arr);
}

async function deleteTenantNumberRow(id: string, tenant: string): Promise<void> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_tenant_numbers').delete().eq('id', id).eq('tenant_id', tenant) as any);
    if (error) throw new Error(error.message);
    return;
  }
  const arr = await readFallbackArray(NUMBERS_FALLBACK_KEY);
  await writeFallbackArray(NUMBERS_FALLBACK_KEY, arr.filter((r: any) => !(String(r.id) === id && String(r.tenant_id || 'default') === tenant)));
}

// ---- Billetera ----

export async function voiceWalletBalance(tenant: string): Promise<number> {
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data } = await (client.from('voice_wallets').select('balance_usd').eq('tenant_id', tenant).maybeSingle() as any);
    return Number(data?.balance_usd ?? 0);
  }
  const arr = await readFallbackArray(WALLETS_FALLBACK_KEY);
  const row = arr.find((r: any) => String(r.tenant_id) === tenant);
  return Number(row?.balance_usd ?? 0);
}

async function voiceWalletSet(tenant: string, balanceUsd: number): Promise<number> {
  const v = Math.round(balanceUsd * 100) / 100;
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_wallets').upsert(
      { tenant_id: tenant, balance_usd: v, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id' }) as any);
    if (error) throw new Error(error.message);
  } else {
    const arr = await readFallbackArray(WALLETS_FALLBACK_KEY);
    const idx = arr.findIndex((r: any) => String(r.tenant_id) === tenant);
    if (idx >= 0) arr[idx].balance_usd = v; else arr.push({ tenant_id: tenant, balance_usd: v });
    await writeFallbackArray(WALLETS_FALLBACK_KEY, arr);
  }
  return v;
}

export interface LedgerEntry {
  id: string; tenantId: string; kind: 'topup' | 'charge' | 'manual' | 'refund';
  amountUsd: number; costUsd: number; marginUsd: number; minutes: number | null;
  reference: string; detail: string; createdAt: string;
}

function rowToLedger(r: any): LedgerEntry {
  return {
    id: String(r.id), tenantId: String(r.tenant_id || r.tenantId || 'default'),
    kind: r.kind, amountUsd: Number(r.amount_usd ?? r.amountUsd ?? 0),
    costUsd: Number(r.cost_usd ?? r.costUsd ?? 0), marginUsd: Number(r.margin_usd ?? r.marginUsd ?? 0),
    minutes: r.minutes ?? r.minutes_usd ?? null,
    reference: String(r.reference || ''), detail: String(r.detail || ''),
    createdAt: String(r.created_at || r.createdAt || new Date().toISOString()),
  };
}

export async function voiceLedger(tenant: string, limit = 50): Promise<LedgerEntry[]> {
  const lim = Math.max(1, Math.min(200, limit));
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { data, error } = await (client.from('voice_wallet_ledger').select('*')
      .eq('tenant_id', tenant).order('created_at', { ascending: false }).limit(lim) as any);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToLedger);
  }
  return readFallbackArray(LEDGER_FALLBACK_KEY)
    .filter((r: any) => String(r.tenant_id || r.tenantId || 'default') === tenant)
    .map(rowToLedger).slice(0, lim);
}

async function ledgerAdd(e: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<void> {
  const entry: LedgerEntry = { ...e, id: uid('vl'), createdAt: new Date().toISOString() };
  if (await tablesAvailable()) {
    const client = getSupabase()!;
    const { error } = await (client.from('voice_wallet_ledger').insert({
      id: entry.id, tenant_id: entry.tenantId, kind: entry.kind,
      amount_usd: entry.amountUsd, cost_usd: entry.costUsd, margin_usd: entry.marginUsd,
      minutes: entry.minutes, reference: entry.reference, detail: entry.detail,
    }) as any);
    if (error) throw new Error(error.message);
    return;
  }
  const arr = await readFallbackArray(LEDGER_FALLBACK_KEY);
  arr.unshift(entry);
  await writeFallbackArray(LEDGER_FALLBACK_KEY, arr);
}

// ---------------------------------------------------------------------------
// Telefonía: verificación de número propio (llamada con código)
// ---------------------------------------------------------------------------

async function twilioPost(sid: string, auth: string, path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${TWILIO_API}${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(25000),
  });
  const txt = await res.text().catch(() => '');
  let j: any = null;
  try { j = JSON.parse(txt); } catch { /* noop */ }
  if (!res.ok) throw new Error(j?.message ? `Telefonía: ${String(j.message).slice(0, 180)}` : `La telefonía respondió HTTP ${res.status}.`);
  return j || {};
}

async function twilioGet(sid: string, auth: string, path: string): Promise<any> {
  const res = await fetch(`${TWILIO_API}${path}`, {
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(25000),
  });
  const txt = await res.text().catch(() => '');
  let j: any = null;
  try { j = JSON.parse(txt); } catch { /* noop */ }
  if (!res.ok) throw new Error(j?.message ? `Telefonía: ${String(j.message).slice(0, 180)}` : `La telefonía respondió HTTP ${res.status}.`);
  return j || {};
}

async function twilioDelete(sid: string, auth: string, path: string): Promise<void> {
  const res = await fetch(`${TWILIO_API}${path}`, {
    method: 'DELETE', headers: { Authorization: auth },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text().catch(() => '');
    let detail = `HTTP ${res.status}`;
    try { const j = JSON.parse(txt); if (j?.message) detail = String(j.message).slice(0, 160); } catch { /* noop */ }
    throw new Error(`Telefonía: ${detail}`);
  }
}

/**
 * Inicia la verificación de un número: la plataforma llama al número y la
 * persona que contesta debe ingresar el código devuelto aquí.
 */
export async function startNumberVerification(phoneE164: string, label: string): Promise<{ code: string }> {
  const cfg = await readMasterConfig();
  const { sid, auth } = masterAuth(cfg);
  if (!sid) throw new Error('La telefonía integrada no está configurada.');
  // NOTA: el SDK oficial de Twilio crea la solicitud de validación con
  // POST /Accounts/{sid}/OutgoingCallerIds.json (no existe /ValidationRequests.json).
  const j = await twilioPost(sid, auth, `/Accounts/${encodeURIComponent(sid)}/OutgoingCallerIds.json`, {
    PhoneNumber: phoneE164,
    FriendlyName: cleanText(label || 'Mi número', 60) || 'Mi número',
  });
  const code = String(j?.validation_code || '').trim();
  if (!code) throw new Error('La telefonía no devolvió código de verificación.');
  return { code };
}

/** Confirma si el número ya quedó verificado como identificador de llamadas. */
export async function checkNumberVerified(phoneE164: string): Promise<{ verified: boolean; sid: string | null }> {
  const cfg = await readMasterConfig();
  const { sid, auth } = masterAuth(cfg);
  if (!sid) throw new Error('La telefonía integrada no está configurada.');
  const j = await twilioGet(sid, auth, `/Accounts/${encodeURIComponent(sid)}/OutgoingCallerIds.json?PageSize=50`);
  const list: any[] = Array.isArray(j?.outgoing_caller_ids) ? j.outgoing_caller_ids : [];
  const want = digitsOnly(phoneE164);
  const match = list.find((o: any) => digitsOnly(String(o?.phone_number || '')) === want);
  return { verified: Boolean(match), sid: match ? String(match.sid || '') : null };
}

async function removeOutgoingCallerId(outgoingSid: string): Promise<void> {
  const cfg = await readMasterConfig();
  const { sid, auth } = masterAuth(cfg);
  if (!sid || !outgoingSid) return;
  await twilioDelete(sid, auth, `/Accounts/${encodeURIComponent(sid)}/OutgoingCallerIds/${encodeURIComponent(outgoingSid)}.json`);
}

// ---------------------------------------------------------------------------
// Cobro por llamada (modo plataforma)
// ---------------------------------------------------------------------------

/** Contexto efectivo para disparar una llamada del tenant. */
export async function resolveCallTelephony(tenant: string): Promise<{ sid: string; auth: string; from: string; platform: boolean }> {
  if (await platformActive()) {
    const cfg = await readMasterConfig();
    const { sid, auth } = masterAuth(cfg);
    const from = await getTenantPrimaryNumber(tenant);
    if (!from) {
      const e: any = new Error('Conecta y verifica tu número en Telefonía → Mis números antes de llamar.');
      e.status = 400; throw e;
    }
    return { sid, auth, from, platform: true };
  }
  // Solo plataforma integrada (decisión de Oscar, 2026-10-21): el modo clásico
  // de cuenta propia por tienda se eliminó.
  const e: any = new Error('La telefonía integrada no está activa. El Super Admin debe configurar la cuenta maestra en Llamadas → Telefonía.');
  e.status = 400; throw e;
}

/** Verifica que el saldo alcance para al menos N minutos al precio con margen. */
export async function assertVoiceBalance(tenant: string, minMinutes = 2): Promise<void> {
  const pricing = await readPricing();
  const need = +(pricePerMinUsd(pricing) * minMinutes).toFixed(2);
  const balance = await voiceWalletBalance(tenant);
  if (balance < need) {
    const e: any = new Error(`Saldo insuficiente en tu billetera de voz. Necesitas al menos $${need.toFixed(2)} USD (≈${minMinutes} min) y tu saldo es $${balance.toFixed(2)} USD. Recarga minutos en Telefonía → Minutos.`);
    e.status = 402; throw e;
  }
}

/**
 * Descuenta el costo real de una llamada finalizada: costo telefonía +
 * costo voz IA, más el margen configurado. Registra en el ledger.
 */
export async function chargeVoiceCall(tenant: string, callId: string, twilioCostUsd: number | null, durationSec: number | null): Promise<{ chargedUsd: number; minutes: number }> {
  const pricing = await readPricing();
  const mins = Math.max(1 / 60, Number(durationSec || 0) / 60);
  const twCost = twilioCostUsd != null && Number.isFinite(twilioCostUsd) ? Math.abs(twilioCostUsd) : mins * PLATFORM_TWILIO_COST_PER_MIN;
  const aiCost = mins * PLATFORM_GEMINI_COST_PER_MIN;
  const cost = twCost + aiCost;
  const charged = Math.round(cost * (1 + pricing.markupPct / 100) * 10000) / 10000;
  const margin = Math.round((charged - cost) * 10000) / 10000;
  const balance = await voiceWalletBalance(tenant);
  const next = await voiceWalletSet(tenant, balance - charged);
  await ledgerAdd({
    tenantId: tenant, kind: 'charge', amountUsd: -charged,
    costUsd: Math.round(cost * 10000) / 10000, marginUsd: margin,
    minutes: Math.round(mins * 100) / 100,
    reference: callId, detail: `Llamada ${callId} (${Math.round(mins * 100) / 100} min). Saldo restante: $${next.toFixed(2)} USD.`,
  });
  console.log(LOG, `llamada ${callId} cobrada: $${charged.toFixed(4)} USD (${mins.toFixed(2)} min) al tenant ${tenant}`);
  return { chargedUsd: charged, minutes: mins };
}

// ---------------------------------------------------------------------------
// Recargas vía Bold (órdenes VOICE-*)
// ---------------------------------------------------------------------------

interface PendingTopup { tenant: string; minutes: number; amountCop: number; packageId: string; createdAt: string; }

async function readPendingTopups(): Promise<Record<string, PendingTopup>> {
  const raw = await readSetting(PENDING_TOPUPS_KEY);
  return raw && typeof raw === 'object' ? raw : {};
}

async function writePendingTopups(map: Record<string, PendingTopup>): Promise<void> {
  const entries = Object.entries(map).slice(-200);
  await writeSetting(PENDING_TOPUPS_KEY, Object.fromEntries(entries));
}

export async function createVoiceTopupOrder(tenant: string, packageId: string): Promise<{ orderId: string; minutes: number; amountCop: number; label: string }> {
  const pricing = await readPricing();
  const pkg = pricing.packages.find((p) => p.id === packageId);
  if (!pkg) { const e: any = new Error('Paquete no válido.'); e.status = 400; throw e; }
  const orderId = `VOICE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const pend = await readPendingTopups();
  pend[orderId] = { tenant, minutes: pkg.minutes, amountCop: pkg.priceCop, packageId: pkg.id, createdAt: new Date().toISOString() };
  await writePendingTopups(pend);
  return { orderId, minutes: pkg.minutes, amountCop: pkg.priceCop, label: pkg.label };
}

/** Acredita minutos cuando Bold aprueba una orden VOICE-*. Retorna true si la procesó. */
export async function creditVoiceWalletForBoldOrder(orderId: string): Promise<boolean> {
  try {
    if (!String(orderId || '').startsWith('VOICE-')) return false;
    const pend = await readPendingTopups();
    const top = pend[orderId];
    if (!top) return false;
    delete pend[orderId];
    await writePendingTopups(pend);
    const usd = Math.round((top.amountCop / USD_COP) * 100) / 100;
    const balance = await voiceWalletBalance(top.tenant);
    const next = await voiceWalletSet(top.tenant, balance + usd);
    await ledgerAdd({
      tenantId: top.tenant, kind: 'topup', amountUsd: usd, costUsd: 0, marginUsd: 0,
      minutes: top.minutes, reference: orderId,
      detail: `Recarga ${top.minutes} minutos vía Bold ($${top.amountCop.toLocaleString('es-CO')} COP). Nuevo saldo: $${next.toFixed(2)} USD.`,
    });
    console.log(LOG, `billetera de voz acreditada: ${top.tenant} +$${usd} USD (${top.minutes} min) orden ${orderId}`);
    return true;
  } catch (err: any) {
    console.warn(LOG, 'acreditando orden Bold:', err?.message || err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

export function setupVoicePlatformRoutes(app: Express): void {
  // ---- Estado general ----
  app.get('/api/voice-platform/status', route(async (req, res) => {
    const active = await platformActive();
    const cfg = await readMasterConfig();
    res.json({
      success: true,
      platformActive: active,
      masterConfigured: Boolean(decryptField(cfg.accountSid) && decryptField(cfg.authToken)),
      isSuperAdmin: isSuperAdmin(req),
    });
  }));

  // ---- Config maestra (solo Super Admin) ----
  app.get('/api/voice-platform/master', route(async (req, res) => {
    if (!isSuperAdmin(req)) { res.status(403).json({ success: false, error: 'Solo Super Admin.' }); return; }
    const cfg = await readMasterConfig();
    res.json({
      success: true,
      master: {
        accountSidMasked: maskSecret(cfg.accountSid),
        configured: Boolean(decryptField(cfg.accountSid) && decryptField(cfg.authToken)),
        enabled: cfg.enabled,
      },
    });
  }));

  app.put('/api/voice-platform/master', route(async (req, res) => {
    if (!isSuperAdmin(req)) { res.status(403).json({ success: false, error: 'Solo Super Admin.' }); return; }
    const body = req.body || {};
    const cfg = await readMasterConfig();
    const sid = cleanText(body.accountSid, 80);
    const token = cleanText(body.authToken, 120);
    if (sid) cfg.accountSid = encryptSecret(sid);
    if (token) cfg.authToken = encryptSecret(token);
    if (body.enabled !== undefined) cfg.enabled = body.enabled !== false;
    if (body.clear === true) { cfg.accountSid = ''; cfg.authToken = ''; }
    await writeMasterConfig(cfg);
    res.json({
      success: true,
      master: {
        accountSidMasked: maskSecret(cfg.accountSid),
        configured: Boolean(decryptField(cfg.accountSid) && decryptField(cfg.authToken)),
        enabled: cfg.enabled,
      },
    });
  }));

  // ---- Precios y paquetes ----
  app.get('/api/voice-platform/pricing', route(async (_req, res) => {
    const p = await readPricing();
    res.json({ success: true, pricing: { ...p, pricePerMinUsd: pricePerMinUsd(p) } });
  }));

  app.put('/api/voice-platform/pricing', route(async (req, res) => {
    if (!isSuperAdmin(req)) { res.status(403).json({ success: false, error: 'Solo Super Admin.' }); return; }
    const body = req.body || {};
    const p = await readPricing();
    if (body.costPerMinUsd !== undefined) {
      const v = Number(body.costPerMinUsd);
      if (Number.isFinite(v) && v > 0 && v < 10) p.costPerMinUsd = v;
    }
    if (body.markupPct !== undefined) {
      const v = Number(body.markupPct);
      if (Number.isFinite(v) && v >= 0 && v <= 500) p.markupPct = v;
    }
    if (Array.isArray(body.packages)) {
      const pkgs: VoicePackage[] = [];
      for (const x of body.packages.slice(0, 10)) {
        const minutes = Math.round(Number(x?.minutes || 0));
        const priceCop = Math.round(Number(x?.priceCop || 0));
        if (minutes > 0 && priceCop > 0) {
          pkgs.push({ id: cleanText(x?.id || uid('vox'), 40), minutes, priceCop, label: cleanText(x?.label || `${minutes} minutos`, 60) });
        }
      }
      if (pkgs.length > 0) p.packages = pkgs;
    }
    await writePricing(p);
    res.json({ success: true, pricing: { ...p, pricePerMinUsd: pricePerMinUsd(p) } });
  }));

  // ---- Mis números ----
  app.get('/api/voice-platform/numbers', route(async (req, res) => {
    const list = await listTenantNumbers(tenantId(req));
    res.json({ success: true, numbers: list.map((n) => ({ id: n.id, phone: n.phone, label: n.label, verified: n.verified, isPrimary: n.isPrimary, createdAt: n.createdAt })) });
  }));

  // Inicia verificación: la plataforma llama al número con un código
  app.post('/api/voice-platform/numbers', route(async (req, res) => {
    if (!(await platformActive())) { res.status(400).json({ success: false, error: 'La telefonía integrada no está activa.' }); return; }
    const body = req.body || {};
    const phone = normalizePhoneE164(String(body.phone || ''));
    if (!phone) { res.status(400).json({ success: false, error: 'Indica un número celular válido.' }); return; }
    const t = tenantId(req);
    const existing = await listTenantNumbers(t);
    if (existing.some((n) => n.phone === phone)) {
      res.status(400).json({ success: false, error: 'Ese número ya está registrado.' }); return;
    }
    if (existing.filter((n) => !n.verified).length >= 3) {
      res.status(400).json({ success: false, error: 'Tienes verificaciones pendientes. Termina o elimina una antes de agregar otra.' }); return;
    }
    const { code } = await startNumberVerification(phone, String(body.label || 'Mi número'));
    const n: TenantNumber = {
      id: uid('vn'), tenantId: t, phone, label: cleanText(body.label || 'Mi número', 60),
      verified: false, isPrimary: existing.length === 0, twilioSid: null, createdAt: new Date().toISOString(),
    };
    await saveTenantNumber(n);
    res.json({
      success: true,
      code,
      message: `Te estamos llamando al ${phone}. Contesta e ingresa el código ${code} en tu teléfono; luego pulsa "Ya ingresé el código".`,
    });
  }));

  // Confirma la verificación (el usuario ya ingresó el código en su teléfono)
  app.post('/api/voice-platform/numbers/confirm', route(async (req, res) => {
    const body = req.body || {};
    const phone = normalizePhoneE164(String(body.phone || ''));
    if (!phone) { res.status(400).json({ success: false, error: 'Número inválido.' }); return; }
    const t = tenantId(req);
    const list = await listTenantNumbers(t);
    const n = list.find((x) => x.phone === phone);
    if (!n) { res.status(404).json({ success: false, error: 'Número no encontrado.' }); return; }
    const { verified, sid } = await checkNumberVerified(phone);
    if (!verified) {
      res.status(400).json({ success: false, error: 'Aún no aparece verificado. Contesta la llamada e ingresa el código, luego reintenta.' });
      return;
    }
    await saveTenantNumber({ ...n, verified: true, twilioSid: sid });
    res.json({ success: true, message: `Número ${phone} verificado.` });
  }));

  app.put('/api/voice-platform/numbers/:id/primary', route(async (req, res) => {
    const t = tenantId(req);
    const list = await listTenantNumbers(t);
    const n = list.find((x) => x.id === String(req.params.id || ''));
    if (!n) { res.status(404).json({ success: false, error: 'Número no encontrado.' }); return; }
    if (!n.verified) { res.status(400).json({ success: false, error: 'Solo un número verificado puede ser principal.' }); return; }
    for (const x of list) await saveTenantNumber({ ...x, isPrimary: x.id === n.id });
    res.json({ success: true });
  }));

  app.delete('/api/voice-platform/numbers/:id', route(async (req, res) => {
    const t = tenantId(req);
    const list = await listTenantNumbers(t);
    const n = list.find((x) => x.id === String(req.params.id || ''));
    if (!n) { res.status(404).json({ success: false, error: 'Número no encontrado.' }); return; }
    if (n.twilioSid) { try { await removeOutgoingCallerId(n.twilioSid); } catch (e: any) { console.warn(LOG, 'eliminando identificador:', e?.message || e); } }
    await deleteTenantNumberRow(n.id, t);
    const rest = (await listTenantNumbers(t)).filter((x) => x.verified);
    if (n.isPrimary && rest.length > 0) await saveTenantNumber({ ...rest[0], isPrimary: true });
    res.json({ success: true });
  }));

  // ---- Billetera ----
  app.get('/api/voice-platform/wallet', route(async (req, res) => {
    const t = tenantId(req);
    const [balanceUsd, pricing] = await Promise.all([voiceWalletBalance(t), readPricing()]);
    const ppm = pricePerMinUsd(pricing);
    res.json({
      success: true,
      wallet: {
        balanceUsd: +balanceUsd.toFixed(2),
        minutesApprox: ppm > 0 ? Math.floor((balanceUsd / ppm) * 10) / 10 : 0,
        pricePerMinUsd: ppm,
        currency: 'USD',
      },
      packages: pricing.packages,
      platformActive: await platformActive(),
    });
  }));

  app.get('/api/voice-platform/wallet/ledger', route(async (req, res) => {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 30)));
    res.json({ success: true, ledger: await voiceLedger(tenantId(req), limit) });
  }));

  // Crea orden de recarga Bold (el frontend abre el checkout con estos datos)
  app.post('/api/voice-platform/wallet/topup', route(async (req, res) => {
    if (!(await platformActive())) { res.status(400).json({ success: false, error: 'La telefonía integrada no está activa.' }); return; }
    const body = req.body || {};
    const t = tenantId(req);
    const order = await createVoiceTopupOrder(t, String(body.packageId || ''));
    res.json({
      success: true,
      orderId: order.orderId,
      minutes: order.minutes,
      amountCop: order.amountCop,
      currency: 'COP',
      description: `Minutos de voz Xorbit 360 - ${order.label}`,
    });
  }));

  // Recarga manual (solo Super Admin)
  app.post('/api/voice-platform/wallet/topup-manual', route(async (req, res) => {
    if (!isSuperAdmin(req)) { res.status(403).json({ success: false, error: 'Solo Super Admin.' }); return; }
    const body = req.body || {};
    const target = cleanText(body.tenantId || 'default', 80);
    const minutes = Math.round(Number(body.minutes || 0));
    if (minutes <= 0 || minutes > 100000) { res.status(400).json({ success: false, error: 'Minutos inválidos.' }); return; }
    const pricing = await readPricing();
    const usd = Math.round(minutes * pricePerMinUsd(pricing) * 100) / 100;
    const balance = await voiceWalletBalance(target);
    const next = await voiceWalletSet(target, balance + usd);
    await ledgerAdd({
      tenantId: target, kind: 'manual', amountUsd: usd, costUsd: 0, marginUsd: 0,
      minutes, reference: 'manual-superadmin',
      detail: `Recarga manual por Super Admin: ${minutes} min. Nuevo saldo: $${next.toFixed(2)} USD.`,
    });
    res.json({ success: true, tenantId: target, balanceUsd: next });
  }));
}
