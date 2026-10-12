// ============================================================================
// Generación de Video Xorbit 360 — backend.
// Genera clips de video con IA vía OpenRouter (POST /api/v1/videos, async:
// submit → poll → descargar MP4) y arma videos largos (1 min+) uniendo clips
// con ffmpeg en el servidor.
//
// Modelos soportados: Seedance 2.5/2.0/fast (ByteDance), Veo 3.1 Fast (Google),
// Kling 3.0 (Kuaishou), Hailuo 3 (MiniMax).
//
// Cobro: cada generación descuenta del wallet del tenant (USD). El Super Admin
// define el precio de venta (margen % sobre el costo + overrides por modelo).
// Todo queda registrado en el ledger (modelo, duración, costo real, cobrado).
//
// La API key de OpenRouter se reutiliza del panel (cifrada con secretBox):
// variable de entorno OPENROUTER_API_KEY o currentDB.openrouterApiKey.
// Sin menciones a terceros en la UI: todo es marca Xorbit 360.
// ============================================================================

import type { Express, Request, Response } from 'express';
import { decryptSecret } from './secretBox.ts';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

type AnyRow = Record<string, any>;

// ---------------------------------------------------------------------------
// Catálogo de modelos (costos USD/segundo, datos OpenRouter sep-2026)
// ---------------------------------------------------------------------------
export interface VideoModelSpec {
  id: string;
  name: string;
  vendor: string;
  badge?: string;
  description: string;
  audio: boolean;
  audioPricePerSec?: Record<string, number>;
  resolutions: string[];
  defaultResolution: string;
  minClipSec: number;
  maxClipSec: number;
  aspects: string[];
  pricePerSec: Record<string, number>;
  imageToVideo: boolean;
}

export const VIDEO_MODEL_CATALOG: VideoModelSpec[] = [
  {
    id: 'bytedance/seedance-2.5', name: 'Seedance 2.5', vendor: 'ByteDance',
    badge: 'Recomendado', description: 'Última generación con audio integrado. Ideal para UGC y anuncios.',
    audio: true, resolutions: ['480p', '720p'], defaultResolution: '720p',
    minClipSec: 4, maxClipSec: 30, aspects: ['16:9', '9:16', '1:1'],
    pricePerSec: { '480p': 0.103, '720p': 0.234 }, imageToVideo: true,
  },
  {
    id: 'bytedance/seedance-2.0', name: 'Seedance 2.0 Pro', vendor: 'ByteDance',
    description: 'Máxima calidad, hasta 4K. Para piezas premium.',
    audio: false, resolutions: ['480p', '720p', '1080p'], defaultResolution: '1080p',
    minClipSec: 4, maxClipSec: 15, aspects: ['16:9', '9:16', '1:1'],
    pricePerSec: { '480p': 0.067, '720p': 0.20, '1080p': 0.35 }, imageToVideo: true,
  },
  {
    id: 'bytedance/seedance-2.0-fast', name: 'Seedance 2.0 Fast', vendor: 'ByteDance',
    badge: 'Económico', description: 'Rápido y barato. Perfecto para probar ideas y volumen.',
    audio: false, resolutions: ['480p', '720p'], defaultResolution: '720p',
    minClipSec: 4, maxClipSec: 15, aspects: ['16:9', '9:16', '1:1'],
    pricePerSec: { '480p': 0.05, '720p': 0.10 }, imageToVideo: true,
  },
  {
    id: 'google/veo-3.1-fast', name: 'Veo 3.1 Fast', vendor: 'Google',
    description: 'Calidad cinematográfica de Google. Gran adherencia al prompt.',
    audio: true, resolutions: ['720p', '1080p'], defaultResolution: '720p',
    minClipSec: 4, maxClipSec: 8, aspects: ['16:9', '9:16'],
    pricePerSec: { '720p': 0.08, '1080p': 0.30 }, imageToVideo: true,
  },
  {
    id: 'kwaivgi/kling-v3.0-std', name: 'Kling 3.0', vendor: 'Kuaishou',
    description: 'Excelente con rostros y personas reales. Audio opcional.',
    audio: false, resolutions: ['720p', '1080p'], defaultResolution: '720p',
    minClipSec: 3, maxClipSec: 15, aspects: ['16:9', '9:16', '1:1'],
    pricePerSec: { '720p': 0.084, '1080p': 0.10 },
    audioPricePerSec: { '720p': 0.126, '1080p': 0.168 }, imageToVideo: true,
  },
  {
    id: 'minimax/hailuo-3', name: 'Hailuo 3', vendor: 'MiniMax',
    badge: 'Económico 2K', description: '2K a precio bajo. Buen balance calidad/precio.',
    audio: true, resolutions: ['2K'], defaultResolution: '2K',
    minClipSec: 5, maxClipSec: 15, aspects: ['16:9', '9:16', '1:1'],
    pricePerSec: { '2K': 0.13 }, imageToVideo: true,
  },
];

export function findModel(id: string): VideoModelSpec | null {
  return VIDEO_MODEL_CATALOG.find((m) => m.id === id) || null;
}

// ---------------------------------------------------------------------------
// Estado (currentDB.videoGen) — mismo patrón que otros módulos
// ---------------------------------------------------------------------------
function getMemDB(): any { return (globalThis as any).currentDB || {}; }
function saveMemDB(): void {
  try {
    const fn = (globalThis as any).saveDB || (globalThis as any).persistDB;
    if (typeof fn === 'function') fn((globalThis as any).currentDB);
  } catch { /* noop */ }
}
export function vgStore(): AnyRow {
  const db = getMemDB();
  if (!db.videoGen || typeof db.videoGen !== 'object') db.videoGen = {};
  const vg = db.videoGen;
  if (!Array.isArray(vg.jobs)) vg.jobs = [];
  if (!Array.isArray(vg.ledger)) vg.ledger = [];
  if (!vg.pricing || typeof vg.pricing !== 'object') vg.pricing = { markupPct: 0, overrides: {} };
  if (!vg.wallets || typeof vg.wallets !== 'object') vg.wallets = {};
  return vg;
}
function tenantId(req: Request): string {
  const user: any = (req as any).authUser || {};
  return String(user.workspaceId || user.tenantId || 'default').slice(0, 80);
}
function isSuperAdmin(req: Request): boolean {
  return (req as any)?.authUser?.role === 'superadmin';
}
function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function cleanText(v: unknown, max = 4000): string { return String(v ?? '').trim().slice(0, max); }

function getOpenRouterKey(): string {
  const envKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  if (envKey) return envKey;
  try { return decryptSecret(getMemDB().openrouterApiKey).trim(); } catch { return ''; }
}

// ---------------------------------------------------------------------------
// Precios: costo y precio de venta
// ---------------------------------------------------------------------------
export function costPerSec(model: VideoModelSpec, resolution: string, withAudio: boolean): number {
  if (withAudio && model.audioPricePerSec?.[resolution] != null) return model.audioPricePerSec[resolution];
  return model.pricePerSec[resolution] ?? model.pricePerSec[model.defaultResolution] ?? 0;
}
export function salePerSec(modelId: string, resolution: string, withAudio: boolean): number {
  const vg = vgStore();
  const ov = vg.pricing?.overrides?.[modelId]?.[resolution + (withAudio ? ':audio' : '')]
    ?? vg.pricing?.overrides?.[modelId]?.[resolution];
  if (typeof ov === 'number' && ov >= 0) return ov;
  const model = findModel(modelId);
  if (!model) return 0;
  const markup = Number(vg.pricing?.markupPct ?? 100);
  return +(costPerSec(model, resolution, withAudio) * (1 + markup / 100)).toFixed(4);
}

export interface ClipPlanItem { index: number; durationSec: number; prompt: string; }
export interface EstimateResult {
  ok: boolean; model: string; modelName: string; resolution: string; aspectRatio: string;
  mode: 'clip' | 'long'; totalSec: number; clips: ClipPlanItem[];
  costUsd: number; priceUsd: number; costPerSec: number; pricePerSec: number;
  error?: string;
}

export function planClips(model: VideoModelSpec, totalSec: number, basePrompt: string): ClipPlanItem[] {
  const clipSec = Math.min(model.maxClipSec, Math.max(model.minClipSec, totalSec));
  const n = Math.max(1, Math.ceil(totalSec / model.maxClipSec));
  const per = Math.round((totalSec / n) * 10) / 10;
  const clips: ClipPlanItem[] = [];
  for (let i = 0; i < n; i++) {
    const dur = i === n - 1 ? Math.round((totalSec - per * (n - 1)) * 10) / 10 : per;
    const prompt = n === 1 ? basePrompt
      : `${basePrompt}\n\n(Parte ${i + 1} de ${n}: continuación directa de la escena anterior. Mismo personaje, mismo estilo visual, misma iluminación y ambiente. Sin cortes bruscos ni cambios de escenario.)`;
    clips.push({ index: i, durationSec: Math.max(model.minClipSec, Math.min(model.maxClipSec, dur)), prompt });
  }
  return clips;
}

export function estimateVideoCost(params: {
  modelId: string; totalSec: number; resolution?: string; aspectRatio?: string; withAudio?: boolean; prompt?: string;
}): EstimateResult {
  const model = findModel(params.modelId);
  if (!model) return { ok: false, error: 'Modelo no válido', } as any;
  const resolution = model.resolutions.includes(params.resolution || '') ? params.resolution! : model.defaultResolution;
  const aspectRatio = model.aspects.includes(params.aspectRatio || '') ? params.aspectRatio! : '16:9';
  const withAudio = !!params.withAudio && (!!model.audio || !!model.audioPricePerSec);
  const totalSec = Math.min(300, Math.max(1, Math.round(Number(params.totalSec) || 8)));
  const mode: 'clip' | 'long' = totalSec > model.maxClipSec ? 'long' : 'clip';
  const clips = mode === 'long'
    ? planClips(model, totalSec, params.prompt || '')
    : [{ index: 0, durationSec: Math.min(model.maxClipSec, Math.max(model.minClipSec, totalSec)), prompt: params.prompt || '' }];
  const cps = costPerSec(model, resolution, withAudio);
  const pps = salePerSec(model.id, resolution, withAudio);
  const costUsd = +(clips.reduce((s, c) => s + c.durationSec * cps, 0)).toFixed(2);
  const priceUsd = +(clips.reduce((s, c) => s + c.durationSec * pps, 0)).toFixed(2);
  return {
    ok: true, model: model.id, modelName: model.name, resolution, aspectRatio,
    mode, totalSec, clips, costUsd, priceUsd, costPerSec: +cps.toFixed(4), pricePerSec: +pps.toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Wallet del tenant
// ---------------------------------------------------------------------------
export function walletBalance(tenant: string): number {
  const vg = vgStore();
  return Number(vg.wallets?.[tenant]?.balanceUsd ?? 0);
}
function walletAdd(tenant: string, delta: number, reason: string): number {
  const vg = vgStore();
  if (!vg.wallets[tenant]) vg.wallets[tenant] = { balanceUsd: 0 };
  vg.wallets[tenant].balanceUsd = +(Number(vg.wallets[tenant].balanceUsd || 0) + delta).toFixed(2);
  saveMemDB();
  return vg.wallets[tenant].balanceUsd;
}
function ledgerAdd(entry: AnyRow): void {
  const vg = vgStore();
  vg.ledger.unshift({ id: uid('lg'), created_at: new Date().toISOString(), ...entry });
  vg.ledger = vg.ledger.slice(0, 500);
  saveMemDB();
}

// ---------------------------------------------------------------------------
// Cliente OpenRouter /api/v1/videos (async: submit → poll → descargar)
// ---------------------------------------------------------------------------
const OR_VIDEOS_URL = 'https://openrouter.ai/api/v1/videos';
const POLL_INTERVAL_MS = 10_000;
const CLIP_TIMEOUT_MS = 20 * 60_000;
const FETCH_TIMEOUT_MS = 30_000;

async function orFetch(url: string, opts: AnyRow = {}): Promise<any> {
  const key = getOpenRouterKey();
  if (!key) { const e: any = new Error('Falta la clave de OpenRouter. Configúrala en el panel: Configuración General → Proveedor IA.'); e.status = 503; throw e; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      signal: ctrl.signal,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xorbit360.com/',
        'X-Title': 'Xorbit 360 Video',
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || `OpenRouter respondió ${res.status}`;
      const e: any = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg).slice(0, 300));
      e.status = res.status; throw e;
    }
    return data;
  } finally { clearTimeout(timer); }
}

interface SubmittedClip { providerJobId: string; pollingUrl: string; }

async function submitClip(model: VideoModelSpec, prompt: string, durationSec: number, aspectRatio: string, resolution: string, imageDataUrl?: string): Promise<SubmittedClip> {
  const body: AnyRow = {
    model: model.id,
    prompt,
    duration: Math.round(durationSec),
    aspect_ratio: aspectRatio,
    resolution,
  };
  if (imageDataUrl) { body.image = imageDataUrl; body.first_frame = imageDataUrl; }
  const data = await orFetch(OR_VIDEOS_URL, { method: 'POST', body, timeoutMs: 60_000 });
  const providerJobId = String(data?.id || data?.job_id || data?.data?.id || '');
  const pollingUrl = String(data?.polling_url || data?.pollingUrl || data?.data?.polling_url || '');
  if (!providerJobId && !pollingUrl) throw new Error('OpenRouter no devolvió un trabajo de video válido');
  return { providerJobId: providerJobId || pollingUrl, pollingUrl: pollingUrl || `${OR_VIDEOS_URL}/${providerJobId}` };
}

function extractVideoUrl(data: any): string {
  if (!data || typeof data !== 'object') return '';
  const cands = [
    data.video_url, data.videoUrl, data.url,
    data?.output?.video_url, data?.output?.url,
    data?.result?.video_url, data?.result?.url,
    data?.data?.video_url, data?.data?.url,
    Array.isArray(data.unsigned_urls) ? data.unsigned_urls[0] : '',
    Array.isArray(data?.output?.unsigned_urls) ? data.output.unsigned_urls[0] : '',
  ];
  for (const c of cands) if (typeof c === 'string' && c.startsWith('http')) return c;
  return '';
}
function extractStatus(data: any): string {
  const s = String(data?.status || data?.state || data?.data?.status || '').toLowerCase();
  return s;
}

async function pollClipDone(sub: SubmittedClip): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < CLIP_TIMEOUT_MS) {
    const data = await orFetch(sub.pollingUrl);
    const status = extractStatus(data);
    if (['completed', 'complete', 'succeeded', 'success', 'done'].includes(status)) {
      const url = extractVideoUrl(data);
      if (!url) throw new Error('El trabajo terminó pero no devolvió URL de video');
      return url;
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      throw new Error(data?.error?.message || data?.error || 'La generación del clip falló en el proveedor');
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Tiempo de espera agotado generando el clip (20 min)');
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5 * 60_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error(`No se pudo descargar el video (${res.status})`);
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(destPath);
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length) {
          const ok = file.write(value);
          if (!ok) await new Promise<void>((r) => file.once('drain', r));
        }
      }
    } finally { reader.releaseLock(); }
    await new Promise<void>((resolve, reject) => {
      file.on('error', reject);
      file.end(() => resolve());
    });
  } finally { clearTimeout(timer); }
}

function execFileAsync(file: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 10 * 60_000 }, (err, stdout, stderr) => {
      if (err) { const e: any = new Error(`ffmpeg falló: ${String(stderr || err.message).slice(0, 300)}`); e.stderr = stderr; reject(e); }
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function concatClipsWithFfmpeg(clipPaths: string[], outPath: string): Promise<void> {
  const listPath = path.join(path.dirname(outPath), 'concat-list.txt');
  const content = clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, content, 'utf8');
  await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
  try { fs.unlinkSync(listPath); } catch { /* noop */ }
}

function jobDir(jobId: string): string {
  return path.join(process.cwd(), 'uploads', 'videogen', jobId);
}

// ---------------------------------------------------------------------------
// Motor de trabajos (cola en memoria, un trabajo a la vez)
// ---------------------------------------------------------------------------
export type VideoJob = AnyRow;

function findJob(id: string, tenant: string): VideoJob | null {
  const vg = vgStore();
  return vg.jobs.find((j: AnyRow) => j.id === id && j.tenant_id === tenant) || null;
}
function setJobPatch(job: VideoJob, patch: AnyRow): void {
  Object.assign(job, patch, { updated_at: new Date().toISOString() });
  saveMemDB();
}

let workerRunning = false;
let workerTimer: any = null;

export function startVideoWorker(): void {
  if (workerTimer) return;
  workerTimer = setInterval(() => { void processQueue().catch((e) => console.error('[VideoGen] worker:', e?.message)); }, 5000);
  console.log('[VideoGen] motor de trabajos iniciado');
}

async function processQueue(): Promise<void> {
  if (workerRunning) return;
  const vg = vgStore();
  const next = vg.jobs.find((j: AnyRow) => j.status === 'queued');
  if (!next) return;
  workerRunning = true;
  try { await runJob(next); }
  catch (e: any) { console.error('[VideoGen] job falló:', next.id, e?.message); }
  finally { workerRunning = false; }
}

async function runJob(job: VideoJob): Promise<void> {
  const model = findModel(job.model);
  if (!model) { setJobPatch(job, { status: 'failed', error: 'Modelo no válido' }); return; }
  const dir = jobDir(job.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  setJobPatch(job, { status: 'working', progress: 2, progressMsg: 'Iniciando generación…' });

  const clips: ClipPlanItem[] = job.clips || [];
  const clipFiles: string[] = [];
  let billedSec = 0;
  try {
    for (let i = 0; i < clips.length; i++) {
      if ((vgStore().jobs.find((j: AnyRow) => j.id === job.id)?.status) === 'cancelled') {
        throw new Error('cancelled');
      }
      const clip = clips[i];
      setJobPatch(job, {
        progress: Math.round(2 + (i / clips.length) * 88),
        progressMsg: clips.length > 1 ? `Generando clip ${i + 1} de ${clips.length}…` : 'Generando video…',
        currentClip: i + 1, totalClips: clips.length,
      });
      const sub = await submitClip(model, clip.prompt, clip.durationSec, job.aspectRatio, job.resolution, job.imageDataUrl || undefined);
      const videoUrl = await pollClipDone(sub);
      const clipPath = path.join(dir, `clip-${i}.mp4`);
      await downloadToFile(videoUrl, clipPath);
      clipFiles.push(clipPath);
      billedSec += clip.durationSec;
      setJobPatch(job, { progress: Math.round(2 + ((i + 1) / clips.length) * 88) });
    }

    let finalPath: string;
    let finalUrl: string;
    if (clipFiles.length > 1) {
      setJobPatch(job, { progress: 93, progressMsg: 'Uniendo clips…' });
      finalPath = path.join(dir, 'final.mp4');
      await concatClipsWithFfmpeg(clipFiles, finalPath);
    } else {
      finalPath = path.join(dir, 'final.mp4');
      fs.copyFileSync(clipFiles[0], finalPath);
    }
    finalUrl = `/uploads/videogen/${job.id}/final.mp4`;

    const cps = costPerSec(model, job.resolution, !!job.withAudio);
    const pps = salePerSec(model.id, job.resolution, !!job.withAudio);
    const costUsd = +(billedSec * cps).toFixed(2);
    const priceUsd = +(billedSec * pps).toFixed(2);
    walletAdd(job.tenant_id, -priceUsd, `Video ${job.id}`);
    ledgerAdd({
      tenant_id: job.tenant_id, job_id: job.id, kind: 'video_charge',
      model: job.model, modelName: model.name, totalSec: +billedSec.toFixed(1),
      costUsd, priceUsd, marginUsd: +(priceUsd - costUsd).toFixed(2), status: 'done',
    });
    setJobPatch(job, {
      status: 'done', progress: 100, progressMsg: 'Listo',
      outputUrl: finalUrl, costUsd, priceUsd, billedSec: +billedSec.toFixed(1),
    });
    console.log(`[VideoGen] job ${job.id} listo: ${billedSec}s costo $${costUsd} cobrado $${priceUsd}`);
  } catch (e: any) {
    const cancelled = String(e?.message) === 'cancelled' || job.status === 'cancelled';
    if (cancelled) {
      // Cobra proporcional por los clips ya generados
      const cps = costPerSec(model, job.resolution, !!job.withAudio);
      const pps = salePerSec(model.id, job.resolution, !!job.withAudio);
      const costUsd = +(billedSec * cps).toFixed(2);
      const priceUsd = +(billedSec * pps).toFixed(2);
      if (priceUsd > 0) {
        walletAdd(job.tenant_id, -priceUsd, `Video ${job.id} (cancelado parcial)`);
        ledgerAdd({ tenant_id: job.tenant_id, job_id: job.id, kind: 'video_charge', model: job.model, modelName: model.name, totalSec: +billedSec.toFixed(1), costUsd, priceUsd, marginUsd: +(priceUsd - costUsd).toFixed(2), status: 'cancelled' });
      }
      setJobPatch(job, { status: 'cancelled', progressMsg: 'Cancelado', costUsd, priceUsd });
    } else {
      ledgerAdd({ tenant_id: job.tenant_id, job_id: job.id, kind: 'video_failed', model: job.model, modelName: model.name, totalSec: 0, costUsd: 0, priceUsd: 0, marginUsd: 0, status: 'failed', note: String(e?.message || e).slice(0, 200) });
      setJobPatch(job, { status: 'failed', error: String(e?.message || 'Error generando el video').slice(0, 300), progressMsg: 'Falló' });
    }
  }
}

function jobSummary(j: AnyRow): AnyRow {
  return {
    id: j.id, prompt: String(j.prompt || '').slice(0, 140), model: j.model, modelName: j.modelName,
    mode: j.mode, totalSec: j.totalSec, resolution: j.resolution, aspectRatio: j.aspectRatio,
    status: j.status, progress: j.progress || 0, progressMsg: j.progressMsg || '',
    outputUrl: j.outputUrl || null, costUsd: j.costUsd ?? null, priceUsd: j.priceUsd ?? null,
    error: j.error || null, created_at: j.created_at, updated_at: j.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Creación de trabajos (API + MCP)
// ---------------------------------------------------------------------------
export interface CreateJobParams {
  prompt: string; modelId: string; totalSec?: number; resolution?: string;
  aspectRatio?: string; withAudio?: boolean; imageBase64?: string; confirmed?: boolean;
}
export interface CreateJobResult {
  ok: boolean; job?: AnyRow; estimate?: EstimateResult; needsConfirmation?: boolean; error?: string; status?: number;
}
/** Crea un trabajo de video (usado por la API y por MCP). */
export function createVideoJob(tenant: string, p: CreateJobParams): CreateJobResult {
  const prompt = cleanText(p.prompt, 4000);
  if (!prompt) return { ok: false, error: 'Describe la escena del video', status: 400 };
  const model = findModel(String(p.modelId || ''));
  if (!model) return { ok: false, error: 'Modelo no válido', status: 400 };
  const est = estimateVideoCost({
    modelId: model.id,
    totalSec: Number(p.totalSec || 8),
    resolution: String(p.resolution || ''),
    aspectRatio: String(p.aspectRatio || ''),
    withAudio: !!p.withAudio,
    prompt,
  });
  if (!est.ok) return { ok: false, error: est.error || 'Parámetros inválidos', status: 400 };
  if (!p.confirmed) return { ok: true, needsConfirmation: true, estimate: est };
  const balance = walletBalance(tenant);
  if (balance < est.priceUsd) {
    return { ok: false, status: 402, error: `Saldo insuficiente. Este video cuesta $${est.priceUsd.toFixed(2)} USD y tu saldo es $${balance.toFixed(2)} USD. Recarga saldo para continuar.` };
  }
  let imageDataUrl: string | null = null;
  if (p.imageBase64 && model.imageToVideo) {
    const raw = String(p.imageBase64);
    if (raw.length > 12_000_000) return { ok: false, error: 'La imagen es muy pesada (máx ~8 MB)', status: 400 };
    imageDataUrl = raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
  }
  const now = new Date().toISOString();
  const job: VideoJob = {
    id: uid('vg'), tenant_id: tenant, prompt, model: model.id, modelName: model.name,
    mode: est.mode, totalSec: est.totalSec, clips: est.clips,
    resolution: est.resolution, aspectRatio: est.aspectRatio, withAudio: !!p.withAudio && (!!model.audio || !!model.audioPricePerSec),
    imageDataUrl,
    status: 'queued', progress: 0, progressMsg: 'En cola',
    created_at: now, updated_at: now,
  };
  vgStore().jobs.unshift(job);
  saveMemDB();
  void processQueue().catch(() => { /* el intervalo lo retoma */ });
  return { ok: true, job: jobSummary(job), estimate: { priceUsd: est.priceUsd, costUsd: est.costUsd } as any };
}

export function cancelVideoJob(id: string, tenant: string): AnyRow | null {
  const job = findJob(id, tenant);
  if (!job || job.status === 'done' || job.status === 'failed') return null;
  setJobPatch(job, { status: 'cancelled', progressMsg: 'Cancelando…' });
  return jobSummary(job);
}

// ---------------------------------------------------------------------------
// Rutas admin
// ---------------------------------------------------------------------------
export function setupVideoGenAdminRoutes(app: Express) {
  // Catálogo de modelos + precios de venta vigentes
  app.get('/api/video-gen/models', (req: Request, res: Response) => {
    try {
      const models = VIDEO_MODEL_CATALOG.map((m) => ({
        id: m.id, name: m.name, vendor: m.vendor, badge: m.badge || null,
        description: m.description, audio: m.audio, hasAudioOption: !!m.audioPricePerSec,
        resolutions: m.resolutions, defaultResolution: m.defaultResolution,
        minClipSec: m.minClipSec, maxClipSec: m.maxClipSec, aspects: m.aspects,
        imageToVideo: m.imageToVideo,
        costPerSec: Object.fromEntries(m.resolutions.map((r) => [r, costPerSec(m, r, false)])),
        salePerSec: Object.fromEntries(m.resolutions.map((r) => [r, salePerSec(m.id, r, false)])),
        salePerSecAudio: m.audioPricePerSec ? Object.fromEntries(m.resolutions.map((r) => [r, salePerSec(m.id, r, true)])) : null,
      }));
      res.json({ ok: true, models });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Estimador de costo (no genera nada)
  app.post('/api/video-gen/estimate', (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const est = estimateVideoCost({
        modelId: String(b.modelId || b.model || ''),
        totalSec: Number(b.totalSec || b.durationSec || 8),
        resolution: String(b.resolution || ''),
        aspectRatio: String(b.aspectRatio || ''),
        withAudio: !!b.withAudio,
        prompt: cleanText(b.prompt, 4000),
      });
      if (!est.ok) { res.status(400).json({ ok: false, error: est.error || 'Parámetros inválidos' }); return; }
      res.json({ ok: true, estimate: est });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error estimando' }); }
  });

  // Wallet del tenant
  app.get('/api/video-gen/wallet', (req: Request, res: Response) => {
    try {
      const tenant = tenantId(req);
      res.json({ ok: true, balanceUsd: walletBalance(tenant), currency: 'USD' });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });


  // Crear trabajo (valida saldo contra el estimado; NO genera en la estimación)
  app.post('/api/video-gen/jobs', async (req: Request, res: Response) => {
    try {
      const tenant = tenantId(req);
      const b = req.body || {};
      const r = createVideoJob(tenant, {
        prompt: b.prompt, modelId: String(b.modelId || b.model || ''),
        totalSec: Number(b.totalSec || b.durationSec || 8),
        resolution: String(b.resolution || ''), aspectRatio: String(b.aspectRatio || ''),
        withAudio: !!b.withAudio, imageBase64: b.imageBase64, confirmed: !!b.confirmed,
      });
      if (!r.ok) { res.status(r.status || 400).json({ ok: false, error: r.error }); return; }
      if (r.needsConfirmation) { res.json({ ok: true, needsConfirmation: true, estimate: r.estimate }); return; }
      res.json({ ok: true, job: r.job, estimate: r.estimate });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error creando el trabajo' }); }
  });

  // Listar trabajos
  app.get('/api/video-gen/jobs', (req: Request, res: Response) => {
    try {
      const tenant = tenantId(req);
      const jobs = vgStore().jobs.filter((j: AnyRow) => j.tenant_id === tenant).slice(0, 50);
      res.json({ ok: true, jobs: jobs.map(jobSummary) });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Detalle
  app.get('/api/video-gen/jobs/:id', (req: Request, res: Response) => {
    try {
      const job = findJob(req.params.id, tenantId(req));
      if (!job) { res.status(404).json({ ok: false, error: 'Trabajo no encontrado' }); return; }
      res.json({ ok: true, job: { ...jobSummary(job), clips: job.clips || [] } });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Cancelar
  app.post('/api/video-gen/jobs/:id/cancel', (req: Request, res: Response) => {
    try {
      const job = cancelVideoJob(req.params.id, tenantId(req));
      if (!job) { res.status(404).json({ ok: false, error: 'Trabajo no encontrado o ya terminó' }); return; }
      res.json({ ok: true, job });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Descargar MP4
  app.get('/api/video-gen/jobs/:id/download', (req: Request, res: Response) => {
    try {
      const job = findJob(req.params.id, tenantId(req));
      if (!job || job.status !== 'done') { res.status(404).json({ ok: false, error: 'Video no disponible' }); return; }
      const filePath = path.join(jobDir(job.id), 'final.mp4');
      if (!fs.existsSync(filePath)) { res.status(404).json({ ok: false, error: 'Archivo no encontrado' }); return; }
      res.download(filePath, `xorbit-video-${job.id}.mp4`);
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Ledger (tenant: solo los suyos; superadmin: todos con ?all=1)
  app.get('/api/video-gen/ledger', (req: Request, res: Response) => {
    try {
      const tenant = tenantId(req);
      const all = String(req.query.all || '') === '1' && isSuperAdmin(req);
      const rows = vgStore().ledger.filter((l: AnyRow) => all || l.tenant_id === tenant).slice(0, 200);
      res.json({ ok: true, ledger: rows });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // ---- Super Admin: precios ----
  app.get('/api/video-gen/pricing', (req: Request, res: Response) => {
    try {
      if (!isSuperAdmin(req)) { res.status(403).json({ ok: false, error: 'Solo Super Admin' }); return; }
      const vg = vgStore();
      const table = VIDEO_MODEL_CATALOG.map((m) => ({
        id: m.id, name: m.name,
        cost: Object.fromEntries(m.resolutions.map((r) => [r, costPerSec(m, r, false)])),
        sale: Object.fromEntries(m.resolutions.map((r) => [r, salePerSec(m.id, r, false)])),
      }));
      res.json({ ok: true, markupPct: vg.pricing.markupPct, overrides: vg.pricing.overrides, table });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  app.put('/api/video-gen/pricing', (req: Request, res: Response) => {
    try {
      if (!isSuperAdmin(req)) { res.status(403).json({ ok: false, error: 'Solo Super Admin' }); return; }
      const b = req.body || {};
      const vg = vgStore();
      if (b.markupPct !== undefined) {
        const pct = Math.max(0, Math.min(1000, Number(b.markupPct) || 0));
        vg.pricing.markupPct = pct;
      }
      if (b.overrides && typeof b.overrides === 'object') {
        // { modelId: { resolution: salePerSec, ... } }
        for (const [modelId, res] of Object.entries(b.overrides)) {
          if (!findModel(modelId) || typeof res !== 'object' || !res) continue;
          if (!vg.pricing.overrides[modelId]) vg.pricing.overrides[modelId] = {};
          for (const [r, v] of Object.entries(res as AnyRow)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) vg.pricing.overrides[modelId][r] = +n.toFixed(4);
          }
        }
      }
      saveMemDB();
      res.json({ ok: true, markupPct: vg.pricing.markupPct, overrides: vg.pricing.overrides });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // ---- Super Admin: recargar wallet ----
  app.post('/api/video-gen/wallet/topup', (req: Request, res: Response) => {
    try {
      if (!isSuperAdmin(req)) { res.status(403).json({ ok: false, error: 'Solo Super Admin' }); return; }
      const b = req.body || {};
      const target = String(b.tenantId || tenantId(req)).slice(0, 80);
      const amount = Number(b.amountUsd);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) { res.status(400).json({ ok: false, error: 'Monto inválido' }); return; }
      const balance = walletAdd(target, +amount.toFixed(2), 'Recarga manual (Super Admin)');
      ledgerAdd({ tenant_id: target, job_id: null, kind: 'topup', model: '-', modelName: 'Recarga de saldo', totalSec: 0, costUsd: 0, priceUsd: +amount.toFixed(2), marginUsd: 0, status: 'topup' });
      res.json({ ok: true, tenantId: target, balanceUsd: balance });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Estado del motor (para diagnóstico)
  app.get('/api/video-gen/engine', (req: Request, res: Response) => {
    try {
      const vg = vgStore();
      const queued = vg.jobs.filter((j: AnyRow) => j.status === 'queued').length;
      const working = vg.jobs.filter((j: AnyRow) => j.status === 'working').length;
      const keyOk = !!getOpenRouterKey();
      let ffmpegOk = false;
      try { require('child_process').execSync('ffmpeg -version', { stdio: 'ignore', timeout: 5000 }); ffmpegOk = true; } catch { /* noop */ }
      res.json({ ok: true, queued, working, workerRunning, openRouterKey: keyOk, ffmpeg: ffmpegOk });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message || 'Error' }); }
  });
}

// ---------------------------------------------------------------------------
// Funciones exportadas para MCP / otros módulos
// ---------------------------------------------------------------------------
export { walletBalance as vgWalletBalance, ledgerAdd as vgLedgerAdd };
export function vgListJobs(tenant: string, limit = 20): AnyRow[] {
  return vgStore().jobs.filter((j: AnyRow) => j.tenant_id === tenant).slice(0, limit).map(jobSummary);
}
export function vgGetJob(id: string, tenant: string): AnyRow | null {
  const j = findJob(id, tenant);
  return j ? { ...jobSummary(j), clips: j.clips || [] } : null;
}
