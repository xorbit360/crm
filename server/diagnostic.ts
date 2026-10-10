import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import { decryptSecret, encryptSecret, isEncryptedSecret, isSecretEncryptionEnabled, maskSecret } from './secretBox.ts';
import { renderDiagnosticPage } from './diagnosticPage.ts';
import { gradeFor, normalizeStoreUrl, runDiagnostic, type DiagnosticResult } from './diagnosticCore.ts';

// ============================================================================
// Diagnóstico de Conversión Xorbit 360: página pública /diagnostico, motor en
// servidor con avance real (jobs en memoria + polling), captura de lead,
// agenda y notificaciones del lado del servidor (Evolution/WhatsApp y correo
// cuando haya proveedor configurado). El correo de notificaciones y el número
// de WhatsApp de Oscar viven SOLO en la configuración del servidor
// (app_settings, workspace default); jamás se renderizan en la página pública
// ni viajan en respuestas de la API pública.
// ============================================================================

const DEFAULT_TENANT = 'default';
const SETTINGS_KEY = 'diagnostic.settings';
const WORKSPACE = 'default';
const AI_TIMEOUT_MS = 30_000;
const JOB_TTL_MS = 10 * 60_000;

type AnyRow = Record<string, any>;

interface DiagnosticSettings {
  notifyEmail: string;
  whatsappNumber: string;
  whatsappInstance: string;
  notifyOnDiagnostic: boolean;
  notifyOnSchedule: boolean;
  emailFrom: string;
  emailApiKey: string; // guardada cifrada (enc:v1:) cuando hay llave maestra
}

const DEFAULT_SETTINGS: DiagnosticSettings = {
  notifyEmail: '',
  whatsappNumber: '',
  whatsappInstance: '',
  notifyOnDiagnostic: false,
  notifyOnSchedule: true,
  emailFrom: '',
  emailApiKey: '',
};

function db(): any {
  const client = getSupabase();
  if (!client) {
    const err: any = new Error('Supabase no está configurado en el servidor');
    err.status = 503;
    throw err;
  }
  return client;
}

function tenantId(req: Request): string {
  const user: any = (req as any).authUser || {};
  return String(user.workspaceId || user.tenantId || DEFAULT_TENANT).slice(0, 80);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function normalizePhoneCO(value: unknown): string {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) digits = `57${digits}`;
  return digits;
}

function isValidPhone(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}

// --- Rate-limit en memoria (mismo patrón que Live Selling) ------------------
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function requestIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}
function checkRate(req: Request, res: Response, bucket: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const key = `${bucket}:${requestIp(req)}`;
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  if (current.count > maxPerMinute) {
    res.status(429).json({ success: false, error: 'Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.' });
    return false;
  }
  return true;
}

function sendError(res: Response, err: any) {
  const status = Number(err?.status || 500);
  if (status >= 500) console.error('[Diagnostic]', err?.message || err);
  res.status(status).json({ success: false, error: err?.message || 'Error interno' });
}
type Handler = (req: Request, res: Response) => Promise<void>;
function route(handler: Handler) {
  return (req: Request, res: Response) => { handler(req, res).catch((err) => sendError(res, err)); };
}

// --- Configuración (app_settings, workspace default) -------------------------
async function readDiagnosticSettings(): Promise<DiagnosticSettings> {
  const client = db();
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('workspace_id', WORKSPACE)
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  let stored: Partial<DiagnosticSettings> = {};
  if (data?.value) {
    try { stored = typeof data.value === 'string' ? JSON.parse(data.value) : data.value; } catch { stored = {}; }
  }
  const settings: DiagnosticSettings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
  // Semilla desde la configuración ya existente del CRM (solo primera vez).
  if (!settings.whatsappNumber) {
    const { data: phoneRow } = await client
      .from('app_settings')
      .select('value')
      .eq('workspace_id', WORKSPACE)
      .eq('key', 'connectedPhone')
      .maybeSingle();
    const connected = phoneRow?.value ? String(phoneRow.value).replace(/\D/g, '') : '';
    if (connected) settings.whatsappNumber = connected;
  }
  return settings;
}

async function writeDiagnosticSettings(settings: DiagnosticSettings): Promise<void> {
  const client = db();
  const { error } = await client
    .from('app_settings')
    .upsert(
      { workspace_id: WORKSPACE, key: SETTINGS_KEY, value: JSON.stringify(settings), updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id,key' },
    );
  if (error) throw new Error(error.message);
}

// --- IA económica (OpenRouter), con fallback silencioso a reglas -------------
async function resolveAiKey(): Promise<string> {
  const envKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  if (envKey) return envKey;
  try {
    const client = db();
    const { data } = await client
      .from('app_settings')
      .select('value')
      .eq('workspace_id', WORKSPACE)
      .eq('key', 'openrouterApiKey')
      .maybeSingle();
    const raw = data?.value ? String(data.value) : '';
    const plain = isEncryptedSecret(raw) ? decryptSecret(raw) : raw;
    return String(plain || '').trim();
  } catch {
    return '';
  }
}

async function aiImpacts(result: DiagnosticResult): Promise<{ resumen: string; impactos: Record<string, string> } | null> {
  const key = await resolveAiKey();
  if (!key) return null;
  const model = String(process.env.OPENROUTER_RESPONSE_MODEL || 'openai/gpt-4o-mini').trim();
  const findingsText = result.findings
    .map((f) => `- [${f.id}] ${f.title} | Categoría: ${f.category} | Severidad: ${f.severity} | Evidencia detectada: ${f.evidence}`)
    .join('\n');
  const pagesText = result.pagesAnalyzed
    .map((p) => `- ${p.kind}: ${p.finalUrl} (respuesta ${(p.ms / 1000).toFixed(1)}s, título: ${p.title || 'sin título'})`)
    .join('\n');
  const prompt = [
    'Eres el analista de conversión de Xorbit 360. Escribe en español claro, directo y sin humo.',
    `Analizamos la tienda ${result.domain}: puntaje ${result.score}/100 (${result.grade}). ${result.pagesNote}`,
    'Páginas revisadas:',
    pagesText,
    'Hallazgos (problemas confirmados con evidencia real):',
    findingsText,
    'Tarea: 1) Un resumen de máximo 2 frases sobre el estado de la tienda. 2) Para CADA hallazgo, una frase de máximo 22 palabras que explique por qué ese problema le cuesta ventas, usando SOLO la evidencia dada (no inventes datos).',
    'Responde ÚNICAMENTE con JSON válido, sin markdown: {"resumen":"...","impactos":{"idDelHallazgo":"frase", ...}}',
  ].join('\n');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 850,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json: any = await res.json().catch(() => null);
    const content = String(json?.choices?.[0]?.message?.content || '');
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const impactos: Record<string, string> = {};
    if (parsed && typeof parsed.impactos === 'object') {
      for (const [k, v] of Object.entries(parsed.impactos)) {
        if (typeof v === 'string' && v.trim()) impactos[k] = v.trim().slice(0, 240);
      }
    }
    return { resumen: String(parsed?.resumen || '').slice(0, 400), impactos };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// --- Notificaciones (solo servidor) ------------------------------------------
async function evolutionSendText(number: string, text: string, instanceHint: string): Promise<{ ok: boolean; detail: string }> {
  const base = String(process.env.EVOLUTION_API_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.EVOLUTION_API_KEY || '').trim();
  if (!base || !apiKey) return { ok: false, detail: 'Evolution no configurado en el entorno' };
  const headers = { apikey: apiKey, 'Content-Type': 'application/json' };
  try {
    // Resolver instancias reales y preferir las ABIERTAS: un canal a mitad de
    // conexión acepta la petición pero falla al enviar ("Connection Closed").
    const listRes = await fetch(`${base}/instance/fetchInstances`, { headers, signal: AbortSignal.timeout(8000) });
    const list = await listRes.json().catch(() => null);
    const items: any[] = Array.isArray(list) ? list : (list?.instances || []);
    const norm = items.map((i: any) => ({
      name: String(i?.name || i?.instanceName || ''),
      state: String(i?.connectionStatus || i?.state || i?.status || ''),
      owner: String(i?.ownerJid || i?.number || '').replace(/\D/g, ''),
    })).filter((i) => i.name);
    const isOpen = (i: { state: string }) => /open|connected/i.test(i.state);
    const hint = instanceHint.trim();
    const openOnes = norm.filter(isOpen);
    const candidates: string[] = [];
    const push = (name?: string) => { if (name && !candidates.includes(name)) candidates.push(name); };
    if (hint) push(openOnes.find((i) => i.name === hint)?.name || hint);
    push(openOnes.find((i) => i.name === 'channel-default')?.name);
    openOnes.forEach((i) => push(i.name));
    push('channel-default');
    if (!candidates.length) candidates.push('channel-default');

    let lastDetail = '';
    for (const instance of candidates.slice(0, 3)) {
      const res = await fetch(`${base}/message/sendText/${encodeURIComponent(instance)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ number, text }),
        signal: AbortSignal.timeout(12000),
      });
      const bodyText = await res.text().catch(() => '');
      if (res.ok) return { ok: true, detail: `Evolution HTTP ${res.status} (instancia ${instance})` };
      lastDetail = `Evolution HTTP ${res.status} (instancia ${instance}): ${bodyText.slice(0, 130)}`;
    }
    return { ok: false, detail: lastDetail || 'Evolution sin instancias disponibles' };
  } catch (err: any) {
    return { ok: false, detail: `Evolution error: ${String(err?.message || err).slice(0, 160)}` };
  }
}

async function sendEmailViaResend(settings: DiagnosticSettings, subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  const rawKey = settings.emailApiKey || '';
  const apiKey = (isEncryptedSecret(rawKey) ? decryptSecret(rawKey) : rawKey).trim();
  if (!apiKey) return { ok: false, detail: 'sin-proveedor: falta la clave del proveedor de correo' };
  if (!settings.notifyEmail) return { ok: false, detail: 'sin-destino: falta el correo de notificaciones' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: settings.emailFrom || 'Xorbit 360 <notificaciones@xorbit360.com>',
        to: [settings.notifyEmail],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const bodyText = await res.text().catch(() => '');
    return { ok: res.ok, detail: `Resend HTTP ${res.status}${res.ok ? '' : `: ${bodyText.slice(0, 160)}`}` };
  } catch (err: any) {
    return { ok: false, detail: `Resend error: ${String(err?.message || err).slice(0, 160)}` };
  }
}

async function notifyOwner(event: 'diagnostic' | 'schedule', lead: AnyRow, result?: DiagnosticResult): Promise<string> {
  const settings = await readDiagnosticSettings().catch(() => DEFAULT_SETTINGS);
  const enabled = event === 'schedule' ? settings.notifyOnSchedule : settings.notifyOnDiagnostic;
  const channels: string[] = [];
  if (!enabled) return 'omitida-por-configuracion';
  const when = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const title = event === 'schedule' ? 'Nueva llamada agendada desde tu Diagnóstico de Conversión' : 'Nuevo diagnóstico de conversión completado';
  const lines = [
    `🔔 ${title}`,
    `Tienda: ${lead.store_url || lead.domain || ''}`,
    `Puntaje: ${lead.score_total ?? ''}/100`,
    `Nombre: ${lead.name || ''}`,
    `WhatsApp del lead: ${lead.whatsapp || ''}`,
    lead.status === 'agendado' && lead.preferred_at ? `Fecha y hora pedida: ${new Date(lead.preferred_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}` : '',
    `Hora del aviso: ${when} (Colombia)`,
    'Revisa el detalle en tu CRM: Landings → Diagnóstico de Conversión.',
  ].filter(Boolean);
  const text = lines.join('\n');
  if (settings.whatsappNumber) {
    const wa = await evolutionSendText(settings.whatsappNumber, text, settings.whatsappInstance);
    channels.push(`whatsapp:${wa.ok ? 'ok' : 'fallo'} (${wa.detail})`);
  } else {
    channels.push('whatsapp:sin-numero-configurado');
  }
  const html = `<div style="font-family:Arial,sans-serif;color:#111"><h2>${title}</h2><p>${lines.slice(1).join('<br/>')}</p>${result ? `<p>Problemas detectados: ${result.findings.map((f) => f.title).join(' · ')}</p>` : ''}</div>`;
  const mail = await sendEmailViaResend(settings, `Xorbit 360 · ${title}`, html);
  channels.push(`correo:${mail.ok ? 'ok' : mail.detail}`);
  return channels.join(' | ').slice(0, 480);
}

// --- Jobs en memoria (avance real del análisis) -------------------------------
interface JobState {
  id: string;
  step: string;
  pages: { kind: string; url: string; status: string }[];
  result: DiagnosticResult | null;
  leadId: string | null;
  error: string | null;
  createdAt: number;
}
const jobs = new Map<string, JobState>();

function newJobId(): string {
  return `diag_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function executeJob(job: JobState, input: { storeUrl: string; name: string; whatsapp: string; tenant: string }): Promise<void> {
  try {
    const result = await runDiagnostic(input.storeUrl, (phase) => { job.step = phase; });
    for (const p of result.pagesAnalyzed) job.pages.push({ kind: p.kind, url: p.finalUrl, status: 'ok' });
    job.step = 'ai';
    const ai = await aiImpacts(result).catch(() => null);
    if (ai) {
      for (const f of result.findings) if (ai.impactos[f.id]) f.impact = ai.impactos[f.id];
      if (ai.resumen) (result as any).aiResumen = ai.resumen;
    }
    const client = db();
    const { data, error } = await client
      .from('diagnostic_leads')
      .insert({
        tenant_id: input.tenant,
        store_url: result.inputUrl,
        domain: result.domain,
        name: input.name,
        whatsapp: input.whatsapp,
        score_total: result.score,
        scores: { blocks: result.blocks, pages: result.pageScores, grade: result.grade, gradeLabel: result.gradeLabel },
        findings: result.findings,
        ai_summary: ai?.resumen ? { resumen: ai.resumen } : null,
        status: 'nuevo',
        source: 'landing-publica',
        notify_status: null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    const leadRow = { id: data.id, store_url: result.inputUrl, domain: result.domain, name: input.name, whatsapp: input.whatsapp, score_total: result.score, status: 'nuevo' };
    const notifyStatus = await notifyOwner('diagnostic', leadRow, result).catch((e) => `error: ${String(e?.message || e).slice(0, 120)}`);
    await client.from('diagnostic_leads').update({ notify_status: notifyStatus }).eq('id', data.id);
    job.leadId = data.id;
    job.result = result;
    job.step = 'done';
  } catch (err: any) {
    job.error = String(err?.message || 'No pudimos completar el análisis.').slice(0, 300);
    job.step = 'error';
  } finally {
    setTimeout(() => jobs.delete(job.id), JOB_TTL_MS).unref?.();
  }
}

// ---------------------------------------------------------------------------
// Rutas públicas (sin sesión)
// ---------------------------------------------------------------------------
export function setupDiagnosticPublicRoutes(app: Express): void {
  app.get('/diagnostico', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(renderDiagnosticPage());
  });

  // Solo expone lo necesario para el botón de WhatsApp; jamás correos ni claves.
  app.get('/api/public/diagnostic/config', route(async (_req, res) => {
    const settings = await readDiagnosticSettings();
    const number = normalizePhoneCO(settings.whatsappNumber);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      whatsappUrl: number
        ? `https://wa.me/${number}?text=${encodeURIComponent('Hola, vengo del análisis de la web, me interesa optimizar mi web')}`
        : null,
      publicUrl: 'https://crm.xorbit360.com/diagnostico',
    });
  }));

  app.post('/api/public/diagnostic/analyze', route(async (req, res) => {
    if (!checkRate(req, res, 'diag-analyze', 6)) return;
    const storeUrlRaw = cleanText(req.body?.storeUrl, 500);
    const name = cleanText(req.body?.name, 120);
    const whatsapp = normalizePhoneCO(req.body?.whatsapp);
    if (!storeUrlRaw || !normalizeStoreUrl(storeUrlRaw)) {
      res.status(400).json({ success: false, error: 'Pega una URL válida de tu tienda (ejemplo: https://tutienda.com).' });
      return;
    }
    if (!name) { res.status(400).json({ success: false, error: 'Cuéntanos tu nombre para personalizar el diagnóstico.' }); return; }
    if (!isValidPhone(whatsapp)) { res.status(400).json({ success: false, error: 'Escribe un WhatsApp válido con indicativo de país.' }); return; }
    const job: JobState = { id: newJobId(), step: 'capturing', pages: [], result: null, leadId: null, error: null, createdAt: Date.now() };
    jobs.set(job.id, job);
    void executeJob(job, { storeUrl: storeUrlRaw, name, whatsapp, tenant: DEFAULT_TENANT });
    res.status(202).json({ success: true, jobId: job.id });
  }));

  app.get('/api/public/diagnostic/jobs/:id', route(async (req, res) => {
    if (!checkRate(req, res, 'diag-status', 180)) return;
    const job = jobs.get(String(req.params.id || ''));
    if (!job) { res.status(404).json({ success: false, error: 'Este análisis ya no está disponible. Corre uno nuevo.' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      step: job.step,
      pages: job.pages,
      leadId: job.leadId,
      error: job.error,
      result: job.step === 'done' ? job.result : null,
    });
  }));

  app.post('/api/public/diagnostic/schedule', route(async (req, res) => {
    if (!checkRate(req, res, 'diag-schedule', 10)) return;
    const client = db();
    const leadId = cleanText(req.body?.leadId, 60);
    const name = cleanText(req.body?.name, 120);
    const whatsapp = normalizePhoneCO(req.body?.whatsapp);
    const date = cleanText(req.body?.preferredDate, 12);
    const time = cleanText(req.body?.preferredTime, 8);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      res.status(400).json({ success: false, error: 'Elige la fecha y la hora que prefieres para la llamada.' });
      return;
    }
    const preferred = new Date(`${date}T${time}:00-05:00`);
    if (Number.isNaN(preferred.getTime())) {
      res.status(400).json({ success: false, error: 'La fecha elegida no es válida.' });
      return;
    }
    let lead: AnyRow | null = null;
    if (leadId) {
      const { data } = await client.from('diagnostic_leads').select('*').eq('id', leadId).maybeSingle();
      lead = data || null;
    }
    if (!lead) {
      if (!name || !isValidPhone(whatsapp)) {
        res.status(400).json({ success: false, error: 'Para agendar necesitamos tu nombre y tu WhatsApp.' });
        return;
      }
      const { data, error } = await client
        .from('diagnostic_leads')
        .insert({
          tenant_id: DEFAULT_TENANT,
          store_url: '',
          domain: '',
          name,
          whatsapp,
          score_total: null,
          scores: {},
          findings: [],
          status: 'agendado',
          preferred_at: preferred.toISOString(),
          source: 'landing-publica-agenda-directa',
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      lead = data;
    } else {
      const patch: AnyRow = { status: 'agendado', preferred_at: preferred.toISOString() };
      if (name) patch.name = name;
      if (isValidPhone(whatsapp)) patch.whatsapp = whatsapp;
      const { data, error } = await client.from('diagnostic_leads').update(patch).eq('id', lead.id).select('*').single();
      if (error) throw new Error(error.message);
      lead = data;
    }
    const notifyStatus = await notifyOwner('schedule', lead as AnyRow).catch((e) => `error: ${String(e?.message || e).slice(0, 120)}`);
    await client.from('diagnostic_leads').update({ notify_status: notifyStatus }).eq('id', (lead as AnyRow).id);
    res.json({ success: true, scheduled: true, leadId: (lead as AnyRow).id });
  }));
}

// ---------------------------------------------------------------------------
// Rutas de panel (requieren sesión; se registran tras requireApiSession)
// ---------------------------------------------------------------------------
function publicSettingsView(settings: DiagnosticSettings) {
  const emailKeyReady = Boolean((isEncryptedSecret(settings.emailApiKey) ? decryptSecret(settings.emailApiKey) : settings.emailApiKey).trim());
  return {
    notifyEmail: settings.notifyEmail,
    whatsappNumber: settings.whatsappNumber,
    whatsappInstance: settings.whatsappInstance,
    notifyOnDiagnostic: settings.notifyOnDiagnostic,
    notifyOnSchedule: settings.notifyOnSchedule,
    emailFrom: settings.emailFrom,
    emailApiKeySet: emailKeyReady,
    emailApiKeyMasked: settings.emailApiKey ? maskSecret(settings.emailApiKey) : null,
    emailReady: emailKeyReady && Boolean(settings.notifyEmail),
    encryptionEnabled: isSecretEncryptionEnabled(),
    publicUrl: 'https://crm.xorbit360.com/diagnostico',
  };
}

export function setupDiagnosticAdminRoutes(app: Express): void {
  app.get('/api/diagnostic/leads', route(async (req, res) => {
    const client = db();
    const { data, error } = await client
      .from('diagnostic_leads')
      .select('id, store_url, domain, name, whatsapp, score_total, scores, findings, status, preferred_at, source, notify_status, created_at')
      .eq('tenant_id', tenantId(req))
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    res.json({ success: true, leads: data || [] });
  }));

  app.get('/api/diagnostic/settings', route(async (_req, res) => {
    const settings = await readDiagnosticSettings();
    res.json({ success: true, settings: publicSettingsView(settings) });
  }));

  app.put('/api/diagnostic/settings', route(async (req, res) => {
    const current = await readDiagnosticSettings();
    const body = req.body || {};
    const next: DiagnosticSettings = { ...current };
    if (body.notifyEmail !== undefined) {
      const email = cleanText(body.notifyEmail, 160);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ success: false, error: 'El correo de notificaciones no es válido.' });
        return;
      }
      next.notifyEmail = email;
    }
    if (body.whatsappNumber !== undefined) next.whatsappNumber = normalizePhoneCO(body.whatsappNumber);
    if (body.whatsappInstance !== undefined) next.whatsappInstance = cleanText(body.whatsappInstance, 80);
    if (body.notifyOnDiagnostic !== undefined) next.notifyOnDiagnostic = Boolean(body.notifyOnDiagnostic);
    if (body.notifyOnSchedule !== undefined) next.notifyOnSchedule = Boolean(body.notifyOnSchedule);
    if (body.emailFrom !== undefined) next.emailFrom = cleanText(body.emailFrom, 160);
    if (body.emailApiKey !== undefined) {
      const key = cleanText(body.emailApiKey, 400);
      if (key) {
        if (!isSecretEncryptionEnabled()) {
          res.status(400).json({ success: false, error: 'El servidor no tiene la llave maestra de cifrado; no se puede guardar la clave.' });
          return;
        }
        next.emailApiKey = encryptSecret(key);
      }
    }
    if (body.clearEmailApiKey === true) next.emailApiKey = '';
    await writeDiagnosticSettings(next);
    res.json({ success: true, settings: publicSettingsView(next) });
  }));
}
