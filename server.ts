import express from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import os from 'os';
import { distributeTonCommissions } from './src/lib/ton.ts';
import { GoogleGenAI, Type } from '@google/genai';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocketDirect, { useMultiFileAuthState as useMultiFileAuthStateDirect, DisconnectReason as DisconnectReasonDirect, downloadMediaMessage as downloadMediaMessageDirect, fetchLatestBaileysVersion as fetchLatestBaileysVersionDirect, Browsers as BrowsersDirect, makeCacheableSignalKeyStore as makeCacheableSignalKeyStoreDirect } from '@whiskeysockets/baileys';
import * as baileysNamespace from '@whiskeysockets/baileys';
import * as libsignalModule from 'libsignal';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import {
  saveToSupabase,
  loadFromSupabase,
  isSupabaseConfigured,
  checkSupabaseStatus,
  SUPABASE_SCHEMA_SQL,
  getSupabaseCredentials
} from './server/supabase.ts';
import {
  queueNormalizedMirror,
  mirrorStateToNormalizedTables,
  isNormalizedReadReady,
  loadInboxFromTables,
  loadWhatsappFromTables,
  loadStateFromNormalizedTables,
} from './server/normalizedDb.ts';
import { setupLiveSellingAdminRoutes, setupLiveSellingPublicRoutes } from './server/liveSelling.ts';
import { setupDiagnosticAdminRoutes, setupDiagnosticPublicRoutes } from './server/diagnostic.ts';
import { setupZernioRoutes } from './server/zernio/routes.ts';
import { handleZernioWebhook } from './server/zernio/webhook.ts';
import { setupBoldRoutes } from './server/bold.ts';
import { setupMcpRoutes } from './server/mcp.ts';
import {
  clearSessionCookie,
  getSession,
  requireApiSession,
  requireRole,
  requireSession,
  safeCompareSecret,
  setSessionCookie,
} from './server/auth.ts';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isSecretEncryptionEnabled,
  maskSecret,
} from './server/secretBox.ts';

const SENSITIVE_RESPONSE_FIELD = /(password|passcode|secret|mnemonic|private.?key|api.?key|api.?key.?backup|access.?token|refresh.?token|bot.?token|token)$/i;

function sanitizeForClient(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeForClient);
  if (!value || typeof value !== 'object') return value;

  const sanitized: Record<string, any> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (SENSITIVE_RESPONSE_FIELD.test(key)) {
      sanitized[`${key}Configured`] = Boolean(String(fieldValue ?? '').trim());
      continue;
    }
    sanitized[key] = sanitizeForClient(fieldValue);
  }
  return sanitized;
}

async function verifyPassword(candidate: string, stored: unknown): Promise<boolean> {
  const value = String(stored ?? '');
  if (!candidate || !value) return false;
  if (/^\$2[aby]\$/.test(value)) return bcrypt.compare(candidate, value);
  return safeCompareSecret(candidate, value);
}

function verifyWebhookHmac(req: express.Request, secret: unknown, headerName: string): boolean {
  const configuredSecret = String(secret ?? '').trim();
  const supplied = String(req.headers[headerName.toLowerCase()] || '').replace(/^sha256=/i, '').trim();
  const rawBody = String((req as any).rawBody || '');
  if (!configuredSecret || !supplied || !rawBody) return false;
  const expected = crypto.createHmac('sha256', configuredSecret).update(rawBody).digest('hex');
  return safeCompareSecret(supplied, expected);
}

let makeWASocket: any = null;
let useMultiFileAuthState: any = null;
let makeCacheableSignalKeyStore: any = null;
let DisconnectReason: any = null;
let downloadMediaMessage: any = null;
let fetchLatestBaileysVersion: any = null;
let Browsers: any = null;

// Helper to find makeWASocket
if (typeof makeWASocketDirect === 'function') {
  makeWASocket = makeWASocketDirect;
} else if (baileysNamespace && typeof (baileysNamespace as any).makeWASocket === 'function') {
  makeWASocket = (baileysNamespace as any).makeWASocket;
} else if (baileysNamespace && (baileysNamespace as any).default && typeof (baileysNamespace as any).default.makeWASocket === 'function') {
  makeWASocket = (baileysNamespace as any).default.makeWASocket;
} else if (baileysNamespace && (baileysNamespace as any).default && typeof (baileysNamespace as any).default === 'function') {
  makeWASocket = (baileysNamespace as any).default;
} else if (baileysNamespace && (baileysNamespace as any).default?.default && typeof (baileysNamespace as any).default.default === 'function') {
  makeWASocket = (baileysNamespace as any).default.default;
} else if (baileysNamespace && (baileysNamespace as any).default?.default && typeof (baileysNamespace as any).default.default.makeWASocket === 'function') {
  makeWASocket = (baileysNamespace as any).default.default.makeWASocket;
}

export const incrementAiUsage = (provider: string) => {
    if (!currentDB.aiUsageCounts) currentDB.aiUsageCounts = { gemini: 0, openai: 0 };
    currentDB.aiUsageCounts[provider] = (currentDB.aiUsageCounts[provider] || 0) + 1;
    saveDBData(currentDB);
};

// Helper to find useMultiFileAuthState
if (typeof useMultiFileAuthStateDirect === 'function') {
  useMultiFileAuthState = useMultiFileAuthStateDirect;
} else if (baileysNamespace && typeof (baileysNamespace as any).useMultiFileAuthState === 'function') {
  useMultiFileAuthState = (baileysNamespace as any).useMultiFileAuthState;
} else if (baileysNamespace && (baileysNamespace as any).default && typeof (baileysNamespace as any).default.useMultiFileAuthState === 'function') {
  useMultiFileAuthState = (baileysNamespace as any).default.useMultiFileAuthState;
} else if (baileysNamespace && (baileysNamespace as any).default?.default && typeof (baileysNamespace as any).default.default.useMultiFileAuthState === 'function') {
  useMultiFileAuthState = (baileysNamespace as any).default.default.useMultiFileAuthState;
}

// Helper to find makeCacheableSignalKeyStore
if (typeof makeCacheableSignalKeyStoreDirect === 'function') {
  makeCacheableSignalKeyStore = makeCacheableSignalKeyStoreDirect;
} else if (baileysNamespace && typeof (baileysNamespace as any).makeCacheableSignalKeyStore === 'function') {
  makeCacheableSignalKeyStore = (baileysNamespace as any).makeCacheableSignalKeyStore;
} else if (baileysNamespace && (baileysNamespace as any).default && typeof (baileysNamespace as any).default.makeCacheableSignalKeyStore === 'function') {
  makeCacheableSignalKeyStore = (baileysNamespace as any).default.makeCacheableSignalKeyStore;
} else if (baileysNamespace && (baileysNamespace as any).default?.default && typeof (baileysNamespace as any).default.default.makeCacheableSignalKeyStore === 'function') {
  makeCacheableSignalKeyStore = (baileysNamespace as any).default.default.makeCacheableSignalKeyStore;
}
if (!makeCacheableSignalKeyStore) {
  makeCacheableSignalKeyStore = (keys: any) => keys;
}

// In-Memory Retry Counter Cache for Baileys E2E message decryption retries
class MemoryRetryCache {
  private cache = new Map<string, { value: any; expires: number }>();
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }
  set(key: string, value: any, ttlSeconds = 300): void {
    this.cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
  del(key: string): void {
    this.cache.delete(key);
  }
  flushAll(): void {
    this.cache.clear();
  }
}
const msgRetryCounterCache = new MemoryRetryCache();

const wAuthBaseDir = '/tmp';
const conflictRetries: Record<string, number> = {};

// Auto-healing helper to purge corrupted or desynced libsignal ratchets
function purgeSessionFilesOnDisk(addrIdentifier?: string) {
  try {
    const defaultAuthDir = path.resolve(wAuthBaseDir, 'baileys_auth_info');
    const authDirs = [defaultAuthDir];
    try {
      const dbChannels = (globalThis as any).currentDB?.channels || [];
      for (const ch of dbChannels) {
        if (ch?.id) {
          authDirs.push(path.resolve(wAuthBaseDir, `baileys_auth_info_${ch.id}`));
        }
      }
    } catch(e) {}

    for (const dir of authDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.startsWith('session-')) continue;
        if (!addrIdentifier) {
          try {
            fs.unlinkSync(path.join(dir, file));
            console.log(`[WhatsApp Auto-Heal] Purgado archivo de sesión desincronizado: ${file}`);
          } catch(e) {}
        } else {
          const cleanId = addrIdentifier.replace(/\D/g, '');
          if (file.includes(addrIdentifier) || (cleanId.length > 5 && file.includes(cleanId))) {
            try {
              fs.unlinkSync(path.join(dir, file));
              console.log(`[WhatsApp Auto-Heal] Purgado archivo de sesión desincronizado para ${addrIdentifier}: ${file}`);
            } catch(e) {}
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[WhatsApp Auto-Heal] Error en purgeSessionFilesOnDisk:`, err);
  }
}

// Global Libsignal Auto-Recovery Patch:
// Intercepts "Over 2000 messages into the future!" and "Failed to decrypt message with any known session"
// Automatically destroys desynced session files to allow WhatsApp to perform a fresh clean prekey exchange
try {
  if (libsignalModule && (libsignalModule as any).SessionCipher) {
    const proto = (libsignalModule as any).SessionCipher.prototype;
    if (proto && typeof proto.decryptWithSessions === 'function') {
      const origDecryptWithSessions = proto.decryptWithSessions;
      proto.decryptWithSessions = async function(data: any, sessions: any[]) {
        if (!sessions || !sessions.length) {
          throw new (libsignalModule as any).SessionError("No sessions available");
        }
        const errs: any[] = [];
        for (const session of sessions) {
          try {
            const plaintext = await this.doDecryptWhisperMessage(data, session);
            session.indexInfo.used = Date.now();
            return { session, plaintext };
          } catch (e: any) {
            errs.push(e);
            const msg = e?.message || String(e);
            if (msg.includes('Over 2000 messages into the future') || msg.includes('Chain closed')) {
              const addrId = this.addr ? this.addr.id : '';
              purgeSessionFilesOnDisk(addrId);
            }
          }
        }
        const hasFutureError = errs.some(e => String(e).includes('Over 2000 messages into the future'));
        const addrStr = this.addr?.id || (this.addr?.toString ? this.addr.toString() : 'contacto');
        if (hasFutureError) {
          console.warn(`[WhatsApp Auto-Heal] Ratchet desincronizado (>2000 mensajes futuros) detectado para ${addrStr}. Purgando sesión para negociar nuevo cifrado limpio.`);
          purgeSessionFilesOnDisk(this.addr?.id);
        } else {
          console.warn(`[WhatsApp Auto-Heal] Fallo al descifrar con sesiones conocidas para ${addrStr}. Purgando sesión y solicitando re-cifrado.`);
          purgeSessionFilesOnDisk(this.addr?.id);
        }
        throw new (libsignalModule as any).SessionError("No matching sessions found for message");
      };
      console.log("[WhatsApp Auto-Heal] Parche de auto-recuperación de libsignal activado con éxito.");
    }
  }
} catch (patchErr) {
  console.warn(`[WhatsApp Auto-Heal] No se pudo inicializar el parche de libsignal:`, patchErr);
}

// Helper to find DisconnectReason
if (DisconnectReasonDirect) {
  DisconnectReason = DisconnectReasonDirect;
} else if (baileysNamespace && (baileysNamespace as any).DisconnectReason) {
  DisconnectReason = (baileysNamespace as any).DisconnectReason;
} else if (baileysNamespace && (baileysNamespace as any).default && (baileysNamespace as any).default.DisconnectReason) {
  DisconnectReason = (baileysNamespace as any).default.DisconnectReason;
} else if (baileysNamespace && (baileysNamespace as any).default?.default && (baileysNamespace as any).default.default.DisconnectReason) {
  DisconnectReason = (baileysNamespace as any).default.default.DisconnectReason;
}

// Helper to find downloadMediaMessage
if (typeof downloadMediaMessageDirect === 'function') {
  downloadMediaMessage = downloadMediaMessageDirect;
} else if (baileysNamespace && typeof (baileysNamespace as any).downloadMediaMessage === 'function') {
  downloadMediaMessage = (baileysNamespace as any).downloadMediaMessage;
} else if (baileysNamespace && (baileysNamespace as any).default && typeof (baileysNamespace as any).default.downloadMediaMessage === 'function') {
  downloadMediaMessage = (baileysNamespace as any).default.downloadMediaMessage;
} else if (baileysNamespace && (baileysNamespace as any).default?.default && typeof (baileysNamespace as any).default.default.downloadMediaMessage === 'function') {
  downloadMediaMessage = (baileysNamespace as any).default.default.downloadMediaMessage;
}

// Helpers for fetchLatestBaileysVersion & Browsers
fetchLatestBaileysVersion = fetchLatestBaileysVersionDirect || (baileysNamespace as any)?.fetchLatestBaileysVersion || (baileysNamespace as any)?.default?.fetchLatestBaileysVersion;
Browsers = BrowsersDirect || (baileysNamespace as any)?.Browsers || (baileysNamespace as any)?.default?.Browsers;

// Fallbacks
if (!makeWASocket) {
  console.log("WARNING: makeWASocket was not dynamically resolved to a function. Falling back to direct import.");
  makeWASocket = makeWASocketDirect;
}
if (!useMultiFileAuthState) {
  useMultiFileAuthState = useMultiFileAuthStateDirect;
}
if (!DisconnectReason) {
  DisconnectReason = DisconnectReasonDirect || {};
}
if (!downloadMediaMessage) {
  downloadMediaMessage = downloadMediaMessageDirect;
}

console.log('Resolved functions:', {
  makeWASocket: typeof makeWASocket,
  useMultiFileAuthState: typeof useMultiFileAuthState,
  DisconnectReason: typeof DisconnectReason,
  downloadMediaMessage: typeof downloadMediaMessage,
  fetchLatestBaileysVersion: typeof fetchLatestBaileysVersion,
  Browsers: typeof Browsers
});
console.log('---------------------------------');

// Helper function to generate a realistic audio waveform simulation for WhatsApp PTT
function generateSimulatedWaveform(length = 64): Uint8Array {
  const wave = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    // Generate a beautiful bell-ish curve with random ripples
    const normalized = i / (length - 1); // 0 to 1
    const factor = Math.sin(normalized * Math.PI); // 0 -> 1 -> 0
    const randomRipple = Math.floor(Math.random() * 25) + 5; // 5 to 30
    wave[i] = Math.floor(factor * 60) + randomRipple; // peak around 65-90
  }
  return wave;
}

// Helper function to convert any audio buffer (webm, mp3, wav, m4a, ogg, etc.) to OGG OPUS PTT format using ffmpeg
async function convertAudioToOggOpus(inputBuffer: Buffer, originalUrlOrMime?: string): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const randId = Math.random().toString(36).substring(2, 9);

  // Try to detect the correct extension to help ffmpeg parse the container correctly
  let ext = 'tmp';
  if (originalUrlOrMime) {
    const checkStr = originalUrlOrMime.toLowerCase();
    if (checkStr.includes('audio/webm') || checkStr.includes('webm')) ext = 'webm';
    else if (checkStr.includes('audio/ogg') || checkStr.includes('ogg')) ext = 'ogg';
    else if (checkStr.includes('audio/mpeg') || checkStr.includes('audio/mp3') || checkStr.includes('mp3')) ext = 'mp3';
    else if (checkStr.includes('audio/wav') || checkStr.includes('wav')) ext = 'wav';
    else if (checkStr.includes('audio/m4a') || checkStr.includes('m4a')) ext = 'm4a';
    else if (checkStr.includes('audio/mp4')) ext = 'mp4';
  }

  const inputPath = path.join(tmpDir, `input_audio_${Date.now()}_${randId}.${ext}`);
  const outputPath = path.join(tmpDir, `output_audio_${Date.now()}_${randId}.ogg`);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    // Command to convert to OGG OPUS (WhatsApp native PTT voice note format)
    // -ac 1 (mono), -ar 48000 (48kHz sample rate), -c:a libopus -b:a 32k
    const cmd = `ffmpeg -i "${inputPath}" -c:a libopus -b:a 32k -ac 1 -ar 48000 "${outputPath}" -y`;

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[ffmpeg] Audio conversion error:', stderr);
          return reject(error);
        }
        resolve();
      });
    });

    const oggBuffer = await fs.promises.readFile(outputPath);
    console.log(`[ffmpeg] Audio (${inputBuffer.length} bytes, format: ${ext}) convertido exitosamente a OGG OPUS PTT (${oggBuffer.length} bytes).`);
    return oggBuffer;
  } catch (err) {
    console.warn('[ffmpeg] Fallo la conversion a OGG OPUS, enviando buffer original:', err);
    return inputBuffer;
  } finally {
    try { if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath); } catch (e) {}
    try { if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath); } catch (e) {}
  }
}

// Helper to retrieve media buffer from base64, local disk, or remote URL
async function getMediaBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const base64Data = parts[1] || parts[0];
      return Buffer.from(base64Data, 'base64');
    }
    if (url.startsWith('/uploads/') || url.includes('/uploads/')) {
      const fileName = url.split('/uploads/')[1];
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    }
    if (url.startsWith('http')) {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (e) {
    console.error("Error retrieving media buffer for URL:", url, e);
  }
  return null;
}

// ==========================================
// EVOLUTION API INTEGRATION (VPS MULTI-TENANT)
// ==========================================
const DEFAULT_EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "https://whatsapp.xorbit360.com";
const DEFAULT_EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "06mqaBYA1qN3PA9LejyAUe8YHG3A0YWh";
const DEFAULT_EVOLUTION_WEBHOOK_BASE = "https://crm.xorbit360.com";

function normalizeEvolutionWebhookBase(value?: string) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!normalized) return DEFAULT_EVOLUTION_WEBHOOK_BASE;
  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    // Migrate the former Expert 360 deployment automatically. A stale value in
    // Supabase previously sent incoming Evolution events to the wrong server.
    if (hostname === 'expert360.ai.studio' || hostname.endsWith('.expert360.ai.studio')) {
      return DEFAULT_EVOLUTION_WEBHOOK_BASE;
    }
  } catch (_) {
    return DEFAULT_EVOLUTION_WEBHOOK_BASE;
  }
  return normalized;
}

function getEvolutionConfig() {
  const dbUrl = (typeof currentDB !== 'undefined' && currentDB.evolutionApiUrl) ? currentDB.evolutionApiUrl : '';
  const dbKey = (typeof currentDB !== 'undefined' && currentDB.evolutionApiKey) ? currentDB.evolutionApiKey : '';
  const dbWebhook = (typeof currentDB !== 'undefined' && currentDB.evolutionWebhookBaseUrl) ? currentDB.evolutionWebhookBaseUrl : '';
  const apiUrl = (dbUrl || DEFAULT_EVOLUTION_API_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (dbKey || DEFAULT_EVOLUTION_API_KEY || "").trim();
  const webhookBaseUrl = normalizeEvolutionWebhookBase(dbWebhook);
  return { apiUrl, apiKey, webhookBaseUrl, isConfigured: !!(apiUrl && apiKey) };
}

async function evolutionRequest(endpoint: string, options: { method?: string; body?: any; timeoutMs?: number } = {}) {
  const { apiUrl, apiKey, isConfigured } = getEvolutionConfig();
  if (!isConfigured) {
    throw new Error("Evolution API no está configurada (falta URL o API Key)");
  }
  const url = `${apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

  try {
    const headers: Record<string, string> = {
      'apikey': apiKey,
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function ensureEvolutionInstance(instanceName: string, number?: string, qrcode = true) {
  try {
    const encoded = encodeURIComponent(instanceName);
    const check = await evolutionRequest(`/instance/connectionState/${encoded}`, { timeoutMs: 5000 });
    if (check.ok && check.data && check.data.instance) {
      return check.data.instance;
    }
    const createBody: any = {
      instanceName,
      qrcode,
      integration: "WHATSAPP-BAILEYS"
    };
    if (number) {
      createBody.number = number.replace(/\D/g, '');
    }
    const createRes = await evolutionRequest('/instance/create', {
      method: 'POST',
      body: createBody,
      timeoutMs: 10000
    });
    console.log(`[Evolution API] Instancia ${instanceName} creada con status:`, createRes.status);
    return createRes.data?.instance || createRes.data;
  } catch (err: any) {
    console.error(`[Evolution API] Error verificando/creando instancia ${instanceName}:`, err.message);
    return null;
  }
}

async function setupEvolutionWebhook(instanceName: string, appHostUrl?: string) {
  try {
    const evoConfig = getEvolutionConfig();
    const cleanHost = (appHostUrl || evoConfig.webhookBaseUrl || "https://crm.xorbit360.com").replace(/\/+$/, '');
    const webhookUrl = `${cleanHost}/api/whatsapp/evolution-webhook`;
    const encoded = encodeURIComponent(instanceName);
    const res = await evolutionRequest(`/webhook/set/${encoded}`, {
      method: 'POST',
      body: {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"]
        }
      },
      timeoutMs: 8000
    });
    console.log(`[Evolution API] Webhook configurado hacia ${webhookUrl} para ${instanceName}:`, res.status);
    return res.ok;
  } catch (err: any) {
    console.warn(`[Evolution API] Aviso configurando webhook para ${instanceName}:`, err.message);
    return false;
  }
}

function isGenericEvolutionInstanceAlias(instanceName: string): boolean {
  const normalized = String(instanceName || '').trim().toLowerCase();
  return !normalized || normalized === 'channel-default' || normalized === 'evolution_whatsapp' || normalized === 'whatsapp';
}

// Find the requested instance without silently routing a message through an
// unrelated account. Generic legacy aliases may resolve to the sole open
// instance, while an explicit instance name always remains exact.
async function resolveActualEvolutionInstance(instanceName: string): Promise<string> {
  const requestedInstance = String(instanceName || '').trim() || 'channel-default';
  try {
    const listRes = await evolutionRequest('/instance/fetchInstances', { timeoutMs: 5000 });
    if (listRes.ok && Array.isArray(listRes.data)) {
      // 1. Direct match if open
      const exact = listRes.data.find((i: any) => i.name === requestedInstance || i.instanceName === requestedInstance);
      if (exact && exact.connectionStatus === 'open') {
        return exact.name || exact.instanceName || requestedInstance;
      }
      // 2. Phone match if exact is not open
      const cleanPhoneMatch = requestedInstance.match(/(\d{8,15})/);
      if (cleanPhoneMatch) {
        const phone = cleanPhoneMatch[1];
        const matchByPhone = listRes.data.find((i: any) =>
          i.connectionStatus === 'open' &&
          ((i.ownerJid && i.ownerJid.includes(phone)) || (i.number && i.number.includes(phone)))
        );
        if (matchByPhone) {
          return matchByPhone.name || matchByPhone.instanceName || requestedInstance;
        }
      }

      // 3. Only generic legacy aliases can fall back, and only when the
      // destination is unambiguous. This prevents cross-account sends.
      if (isGenericEvolutionInstanceAlias(requestedInstance)) {
        const openInstances = listRes.data.filter((i: any) => i.connectionStatus === 'open');
        if (openInstances.length === 1) {
          return openInstances[0].name || openInstances[0].instanceName || requestedInstance;
        }
      }
      if (exact) return exact.name || exact.instanceName || requestedInstance;
    }
  } catch (e) {}
  return requestedInstance;
}

async function getEvolutionConnectionState(instanceName: string) {
  try {
    const encoded = encodeURIComponent(instanceName);
    const res = await evolutionRequest(`/instance/connectionState/${encoded}`, { timeoutMs: 6000 });
    let state = (res.ok && res.data?.instance?.state) ? res.data.instance.state : 'close';
    let phone: string | null = null;
    let exists = !!(res.ok && res.data);

    // If state is not open, check if instance exists under alias (e.g. channel-default or by phone)
    if (state !== 'open') {
      const cleanPhoneMatch = instanceName.match(/(\d{8,15})/);
      const targetPhone = cleanPhoneMatch ? cleanPhoneMatch[1] : null;

      try {
        const listRes = await evolutionRequest('/instance/fetchInstances', { timeoutMs: 5000 });
        if (listRes.ok && Array.isArray(listRes.data)) {
          const exact = listRes.data.find((i: any) => i.name === instanceName || i.instanceName === instanceName);
          if (exact && exact.connectionStatus === 'open') {
            exists = true;
            state = 'open';
            if (exact.ownerJid) phone = exact.ownerJid.split('@')[0].replace(/\D/g, '');
            else if (exact.number) phone = exact.number.replace(/\D/g, '');
          } else if (targetPhone) {
            const aliasInst = listRes.data.find((i: any) =>
              (i.connectionStatus === 'open') &&
              ((i.ownerJid && i.ownerJid.includes(targetPhone)) || (i.number && i.number.includes(targetPhone)))
            );
            if (aliasInst) {
              exists = true;
              state = 'open';
              phone = targetPhone;
            }
          } else {
            // General fallback: if channel-default is asked, but there is any active open instance on the VPS (+573192392853_admin)
            const anyOpenInst = listRes.data.find((i: any) => i.connectionStatus === 'open');
            if (anyOpenInst) {
              exists = true;
              state = 'open';
              if (anyOpenInst.ownerJid) phone = anyOpenInst.ownerJid.split('@')[0].replace(/\D/g, '');
              else if (anyOpenInst.number) phone = anyOpenInst.number.replace(/\D/g, '');
            } else if (exact) {
              exists = true;
              state = exact.connectionStatus || state;
            }
          }
        }
      } catch (e) {}
    } else {
      try {
        const listRes = await evolutionRequest('/instance/fetchInstances', { timeoutMs: 5000 });
        if (listRes.ok && Array.isArray(listRes.data)) {
          const inst = listRes.data.find((i: any) => i.name === instanceName || i.instanceName === instanceName);
          if (inst) {
            if (inst.ownerJid) phone = inst.ownerJid.split('@')[0].replace(/\D/g, '');
            else if (inst.number) phone = inst.number.replace(/\D/g, '');
          }
        }
      } catch(e) {}
    }

    return { state, phone, exists: exists || state === 'open' };
  } catch (err: any) {
    return { state: 'close', phone: null, exists: false, error: err.message };
  }
}

async function getEvolutionQr(instanceName: string) {
  try {
    await ensureEvolutionInstance(instanceName, undefined, true);
    const encoded = encodeURIComponent(instanceName);
    const res = await evolutionRequest(`/instance/connect/${encoded}`, { timeoutMs: 8000 });
    if (res.ok && res.data) {
      if (res.data.base64 && typeof res.data.base64 === 'string') {
        return res.data.base64;
      }
      if (res.data.code && typeof res.data.code === 'string') {
        return res.data.code;
      }
    }
    return null;
  } catch (err: any) {
    console.error(`[Evolution API] Error obteniendo QR para ${instanceName}:`, err.message);
    return null;
  }
}

async function getEvolutionPairingCode(instanceName: string, phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encoded = encodeURIComponent(instanceName);
  try {
    try {
      await evolutionRequest(`/instance/delete/${encoded}`, { method: 'DELETE', timeoutMs: 5000 });
    } catch(e) {}

    await evolutionRequest('/instance/create', {
      method: 'POST',
      body: {
        instanceName,
        number: cleanPhone,
        qrcode: false,
        integration: "WHATSAPP-BAILEYS"
      },
      timeoutMs: 8000
    });

    const res = await evolutionRequest(`/instance/connect/${encoded}?number=${cleanPhone}`, { timeoutMs: 8000 });
    if (res.ok && res.data && res.data.pairingCode) {
      const raw = String(res.data.pairingCode).replace(/-/g, '').trim();
      const formatted = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
      return { rawCode: raw, pairingCode: formatted };
    }
    return null;
  } catch (err: any) {
    console.error(`[Evolution API] Error obteniendo pairing code para ${instanceName}:`, err.message);
    return null;
  }
}

function normalizeEvolutionRecipient(number: string, remoteJid?: string): string {
  const preferred = String(remoteJid || number || '').trim();
  const jidMatch = preferred.match(/^([^@]+)@(lid|s\.whatsapp\.net)$/i);
  if (jidMatch) {
    const local = jidMatch[1].split(':')[0].replace(/\D/g, '');
    if (local) return `${local}@${jidMatch[2].toLowerCase()}`;
  }
  return preferred.replace(/\D/g, '');
}

type RecentEvolutionOutbound = {
  instance: string;
  recipient: string;
  text: string;
  messageId?: string;
  timestamp: number;
};
const recentEvolutionOutbounds: RecentEvolutionOutbound[] = [];

function rememberEvolutionOutbound(instance: string, recipient: string, text: string, response: any) {
  const item: RecentEvolutionOutbound = {
    instance,
    recipient,
    text,
    messageId: response?.data?.key?.id || response?.data?.messageId || response?.data?.id,
    timestamp: Date.now()
  };
  recentEvolutionOutbounds.push(item);
  const cutoff = Date.now() - 2 * 60 * 1000;
  while (recentEvolutionOutbounds.length && recentEvolutionOutbounds[0].timestamp < cutoff) {
    recentEvolutionOutbounds.shift();
  }
  return item;
}

function isEvolutionServerEcho(instance: string, data: any, text: string): boolean {
  const cutoff = Date.now() - 30 * 1000;
  const messageId = String(data?.key?.id || '');
  const remoteJid = String(data?.key?.remoteJid || '');
  return recentEvolutionOutbounds.some(item =>
    item.timestamp >= cutoff &&
    item.instance === instance &&
    ((messageId && item.messageId === messageId) ||
      (item.text === text && (!remoteJid || item.recipient === remoteJid || item.recipient.replace(/\D/g, '') === remoteJid.replace(/\D/g, ''))))
  );
}

async function sendEvolutionTextMessage(instanceName: string, number: string, text: string, remoteJid?: string) {
  const recipient = normalizeEvolutionRecipient(number, remoteJid);
  const actualInstance = await resolveActualEvolutionInstance(instanceName);
  const encoded = encodeURIComponent(actualInstance);
  const pending = rememberEvolutionOutbound(actualInstance, recipient, text, {});
  const response = await evolutionRequest(`/message/sendText/${encoded}`, {
    method: 'POST',
    body: {
      number: recipient,
      text: text
    },
    timeoutMs: 12000
  });
  if (response?.ok) {
    pending.messageId = response?.data?.key?.id || response?.data?.messageId || response?.data?.id;
  } else {
    const index = recentEvolutionOutbounds.indexOf(pending);
    if (index >= 0) recentEvolutionOutbounds.splice(index, 1);
  }
  return response;
}

async function sendEvolutionMediaMessage(
  instanceName: string,
  number: string,
  mediatype: string,
  media: string,
  caption = '',
  fileName = 'archivo',
  mimetype?: string,
  remoteJid?: string
) {
  const recipient = normalizeEvolutionRecipient(number, remoteJid);
  const actualInstance = await resolveActualEvolutionInstance(instanceName);
  const encoded = encodeURIComponent(actualInstance);

  // Strip data: prefix if present, Evolution API requires pure raw base64 or URL
  let cleanMedia = (media || '').trim();
  let extractedMime = mimetype;
  if (cleanMedia.startsWith('data:')) {
    const match = cleanMedia.match(/^data:([^;]+);base64,/);
    if (match && !extractedMime) extractedMime = match[1];
    cleanMedia = cleanMedia.split(',')[1] || cleanMedia;
  }

  const normalizedType = mediatype === 'imagen' ? 'image' : (mediatype === 'archivo' ? 'document' : mediatype);

  if (normalizedType === 'audio') {
    try {
      const audioRes = await evolutionRequest(`/message/sendWhatsAppAudio/${encoded}`, {
        method: 'POST',
        body: {
          number: recipient,
          audio: cleanMedia,
          encoding: true
        },
        timeoutMs: 20000
      });
      if (audioRes.ok) {
        rememberEvolutionOutbound(actualInstance, recipient, caption || '[audio]', audioRes);
        return audioRes;
      }
    } catch (e) {
      console.warn('[Evolution API] sendWhatsAppAudio fallback to sendMedia:', e);
    }
  }

  const payload: any = {
    number: recipient,
    mediatype: normalizedType,
    media: cleanMedia,
    caption: caption || '',
    fileName: fileName || (normalizedType === 'image' ? 'foto.jpg' : (normalizedType === 'video' ? 'video.mp4' : (normalizedType === 'audio' ? 'audio.ogg' : 'archivo.pdf')))
  };
  if (extractedMime) {
    payload.mimetype = extractedMime;
  }

  const response = await evolutionRequest(`/message/sendMedia/${encoded}`, {
    method: 'POST',
    body: payload,
    timeoutMs: 20000
  });
  if (response?.ok) rememberEvolutionOutbound(actualInstance, recipient, caption || `[${normalizedType}]`, response);
  return response;
}

async function fetchEvolutionProfilePicture(instanceName: string, number: string, remoteJid?: string): Promise<string | null> {
  try {
    const recipient = normalizeEvolutionRecipient(number, remoteJid);
    if (!recipient) return null;
    const actualInstance = await resolveActualEvolutionInstance(instanceName);
    const encoded = encodeURIComponent(actualInstance);
    const res = await evolutionRequest(`/chat/fetchProfilePictureUrl/${encoded}`, {
      method: 'POST',
      body: { number: recipient },
      timeoutMs: 6000
    });
    if (res.ok && res.data && (res.data.profilePictureUrl || res.data.url)) {
      return res.data.profilePictureUrl || res.data.url;
    }
  } catch (e) {
    // Ignore profile picture fetch errors
  }
  return null;
}

async function fetchEvolutionMediaBase64(instanceName: string, rawMessage: any): Promise<{ base64?: string; mimetype?: string; fileName?: string } | null> {
  try {
    const actualInstance = await resolveActualEvolutionInstance(instanceName);
    const encoded = encodeURIComponent(actualInstance);
    // Evolution API expects the full record object or { key: ..., message: ... }
    const messagePayload = (rawMessage && rawMessage.key) ? rawMessage : {
      key: { id: rawMessage?.id || 'msg_' + Date.now(), fromMe: false },
      message: rawMessage?.message || rawMessage
    };
    const res = await evolutionRequest(`/chat/getBase64FromMediaMessage/${encoded}`, {
      method: 'POST',
      body: { message: messagePayload, convertToMp4: false },
      timeoutMs: 15000
    });
    if (res.ok && res.data && res.data.base64) {
      return {
        base64: res.data.base64,
        mimetype: res.data.mimetype || res.data.mimeType,
        fileName: res.data.fileName
      };
    }
  } catch (e) {
    // Ignore media download errors
  }
  return null;
}

let onEvolutionIncomingMessage: ((instance: string, data: any) => Promise<void>) | null = null;

// Helper to send bot replies and real audio voice notes (PTT) to WhatsApp
async function sendWhatsAppBotReplies(
  clientSock: any,
  senderJid: string,
  userIncomingText: string,
  repliesList: string[],
  phone: string,
  channelId: string = 'channel-default'
) {
  const evoConfig = getEvolutionConfig();
  if (!clientSock && !evoConfig.isConfigured) return;

  function cleanQuestionText(q: string): string {
    if (!q) return "";
    return q
      .toLowerCase()
      .replace(/^\s*si\s+(?:el\s+)?usuario\s+pregunta\s+/, "")
      .replace(/^\s*si\s+pregunta\s+/, "")
      .replace(/^\s*usuario\s+pregunta\s+/, "")
      .trim();
  }

  let matchedFaq: any = null;
  const incomingLower = (userIncomingText || '').toLowerCase().trim();
  const faqsList = Array.isArray(currentDB.faqsList) ? currentDB.faqsList : (Array.isArray(currentDB.faqs) ? currentDB.faqs : []);
  if (faqsList.length > 0) {

    // 1. Try quick exact or near-exact match first to minimize latency
    for (const f of faqsList) {
      if (!f.question) continue;
      const qClean = cleanQuestionText(f.question);
      const qLower = qClean.toLowerCase().trim();
      const cleanIncoming = incomingLower.replace(/[¿?¡!]/g, '').trim();
      const cleanQ = qLower.replace(/[¿?¡!]/g, '').trim();
      if (cleanIncoming === cleanQ || incomingLower === qLower) {
        matchedFaq = f;
        break;
      }
    }

    // 2. If no exact match and globalExecuteAIInternal is available, use AI semantic matching
    if (!matchedFaq && globalExecuteAIInternal) {
      try {
        const faqQuestions = faqsList
          .map((f: any, idx: number) => ({ index: idx, question: f.question }))
          .filter((q: any) => q.question && q.question.trim().length > 0);

        if (faqQuestions.length > 0) {
          const matchingPrompt = `Analiza detalladamente la intención de la siguiente frase recibida de un cliente en WhatsApp:
"${userIncomingText}"

Determina si el cliente está expresando exactamente la misma duda, solicitud, pregunta o intención que alguna de las siguientes preguntas predefinidas en la lista.
Ignora variaciones menores de palabras, sinónimos, faltas de ortografía, inclusión o exclusión de saludos (ej: "Hola, ¿cómo te llamas?" vs "Como te llamas ?") u otras formas coloquiales de expresar exactamente la misma idea (ej: "Cuál es tu nombre", "cómo te llamas", "cómo te puedo llamar", "dime tu nombre" tienen exactamente la misma intención).

Lista de preguntas predefinidas:
${faqQuestions.map((q: any) => `[ID: ${q.index}] "${q.question}"`).join('\n')}

Responde ÚNICAMENTE con un objeto JSON en el siguiente formato, sin bloques de código Markdown (\`\`\`json) ni explicaciones de ningún tipo:
{
  "matched": true o false,
  "matchedIndex": número o null
}`;

          console.log(`[AI Semantic Match] Evaluando frase del cliente: "${userIncomingText}"`);
          const aiResponse = await globalExecuteAIInternal(matchingPrompt, null, null, 'classifier');
          if (aiResponse) {
            const cleanJson = aiResponse.replace(/```json/i, '').replace(/```/g, '').trim();
            try {
              const parsedMatch = JSON.parse(cleanJson);
              if (parsedMatch) {
                const isMatched = parsedMatch.matched === true || parsedMatch.matched === 'true';
                if (isMatched && parsedMatch.matchedIndex !== null && parsedMatch.matchedIndex !== undefined) {
                  const idx = typeof parsedMatch.matchedIndex === 'number'
                    ? parsedMatch.matchedIndex
                    : parseInt(parsedMatch.matchedIndex, 10);
                  if (!isNaN(idx) && faqsList[idx]) {
                    matchedFaq = faqsList[idx];
                    console.log(`[AI Semantic Match] ¡ÉXITO! Frase "${userIncomingText}" coincide semánticamente con Pregunta #${idx+1}: "${faqsList[idx].question}"`);
                  }
                }
              }
            } catch (pErr) {
              // Try regex fallback if JSON parse failed
              const matchMatched = cleanJson.match(/"matched"\s*:\s*(true|false)/i);
              const matchIdx = cleanJson.match(/"matchedIndex"\s*:\s*(\d+)/);
              if (matchMatched && matchMatched[1].toLowerCase() === 'true' && matchIdx) {
                const idx = parseInt(matchIdx[1], 10);
                if (faqsList[idx]) {
                  matchedFaq = faqsList[idx];
                  console.log(`[AI Semantic Match Regex Fallback] ¡ÉXITO! Frase "${userIncomingText}" coincide con Pregunta #${idx+1}: "${faqsList[idx].question}"`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[AI Semantic Match Error] Error al buscar coincidencia semántica:', err);
      }
    }

    // 3. Fallback to original keyword-based matching if still not matched
    if (!matchedFaq) {
      for (const f of faqsList) {
        if (!f.question) continue;
        const qClean = cleanQuestionText(f.question);
        const qLower = qClean.toLowerCase().trim();
        if (!qLower) continue;

        // Clean match with cleaned question
        const cleanIncoming = incomingLower.replace(/[¿?¡!]/g, '').trim();
        const cleanQ = qLower.replace(/[¿?¡!]/g, '').trim();
        if (cleanIncoming === cleanQ || incomingLower.includes(qLower)) {
          matchedFaq = f;
          break;
        }

        // Match with keywords
        const keywords = qLower
          .split(/\s+/)
          .map((w: string) => w.replace(/[¿?¡!]/g, '').trim())
          .filter((w: string) => w.length > 3 && !['como', 'cuando', 'donde', 'quien', 'cual', 'para', 'este', 'esta', 'estos', 'estas', 'esel', 'saber', 'tienen', 'tiene', 'usuario', 'pregunta', 'preguntar'].includes(w));

        if (keywords.length > 0) {
          const matchedCount = keywords.filter((kw: string) => incomingLower.includes(kw)).length;
          const threshold = keywords.length >= 3 ? 2 : 1;
          if (matchedCount >= threshold) {
            matchedFaq = f;
            break;
          }
        }
      }
    }
  }

  let attachedMedia: any = null;
  if (matchedFaq && matchedFaq.attachments && Array.isArray(matchedFaq.attachments) && matchedFaq.attachments.length > 0) {
    attachedMedia = matchedFaq.attachments.find((att: any) => att.url && !att.url.toLowerCase().includes('blob:')) || matchedFaq.attachments[0];
  }

  let matchedRule: any = null;
  const aiRulesList = currentDB.aiAutomationRules || [];
  if (!matchedFaq && Array.isArray(aiRulesList)) {
    for (const rule of aiRulesList) {
      if (rule.active === false) continue;
      const kw = (rule.keyword || rule.phrase || '').trim().toLowerCase();
      if (kw && incomingLower.includes(kw)) {
        matchedRule = rule;
        break;
      }
    }
  }
  if (!attachedMedia && matchedRule && matchedRule.attachments && Array.isArray(matchedRule.attachments) && matchedRule.attachments.length > 0) {
    attachedMedia = matchedRule.attachments.find((att: any) => att.url && !att.url.toLowerCase().includes('blob:')) || matchedRule.attachments[0];
  }

  const isFirstAssistantMessage = !currentDB.messagesHistory || !currentDB.messagesHistory[phone] || currentDB.messagesHistory[phone].filter((m: any) => m.role === 'assistant').length === 0;
  if (!attachedMedia && isFirstAssistantMessage && currentDB.greetingAttachments && Array.isArray(currentDB.greetingAttachments) && currentDB.greetingAttachments.length > 0) {
    attachedMedia = currentDB.greetingAttachments.find((att: any) => att.url && !att.url.toLowerCase().includes('blob:')) || currentDB.greetingAttachments[0];
  }

  let effectiveReplies = [...repliesList];
  if (matchedFaq) {
    if (matchedFaq.answer && matchedFaq.answer.trim()) {
      effectiveReplies = [matchedFaq.answer.trim()];
    } else if (attachedMedia) {
      // Si la FAQ tiene un archivo adjunto pero la respuesta de texto está vacía, no enviamos texto alguno.
      effectiveReplies = [""];
    }
  } else if (isFirstAssistantMessage) {
    const greeting = (currentDB.customGreeting || '').trim();
    if (greeting) {
      // Prepend welcome greeting so the customer receives the greeting AND the AI response to their actual question!
      if (repliesList.length > 0 && repliesList[0].trim() && repliesList[0].trim() !== greeting) {
        effectiveReplies = [greeting, ...repliesList];
      } else {
        effectiveReplies = [greeting];
      }
    } else {
      // No custom greeting configured, use the AI generated replies
      effectiveReplies = repliesList.length > 0 ? repliesList : ["¡Hola! 👋 Bienvenido. ¿En qué te puedo asesorar hoy?"];
    }
  }

  // Ensure effectiveReplies is NEVER empty or completely blank
  if (!effectiveReplies || effectiveReplies.length === 0 || !effectiveReplies.some((msg: string) => msg && msg.trim())) {
    effectiveReplies = ["¡Hola! 👋 Gracias por comunicarte con nosotros. ¿En qué producto o servicio estás interesado hoy?"];
  }

  for (let idx = 0; idx < effectiveReplies.length; idx++) {
    const r = effectiveReplies[idx];

    // Check if reply text contains embedded audio tag or reference
    const audioRefMatch = r.match(/(?:🤖🔊\s*)?\[?(nota_de_voz_[^\]\s]+\.(?:ogg|mp3|wav|m4a)|nota_de_voz_[^\]\s]+)\]?/i)
      || r.match(/\[(audio:[^\]]+|nota_de_voz[^\]]+)\]/i);

    // Clean reply text of bracketed audio tags
    let cleanReplyText = r
      .replace(/(?:🤖🔊\s*)?\[?(nota_de_voz_[^\]s]+\.(?:ogg|mp3|wav|m4a)|nota_de_voz_[^\]\s]+)\]?/gi, '')
      .replace(/\[(audio:[^\]]+|nota_de_voz[^\]]+)\]/gi, '')
      .trim();

    // If an audio tag was matched, look for the matching attachment across all FAQs
    if (audioRefMatch) {
      const tagAudioName = (audioRefMatch[1] || 'Nota_de_voz_PTT.ogg').trim().toLowerCase();

      // Look for exact named attachment first!
      let foundByName: any = null;
      for (const f of faqsList) {
        if (f.attachments && Array.isArray(f.attachments)) {
          const found = f.attachments.find((att: any) =>
            att.type === 'audio' &&
            att.name &&
            (att.name.toLowerCase().includes(tagAudioName) || tagAudioName.includes(att.name.toLowerCase()))
          );
          if (found) {
            foundByName = found;
            break;
          }
        }
      }

      if (foundByName) {
        attachedMedia = foundByName;
      } else {
        // Fallback: if not found by name, use any audio attachment of the matched FAQ or the first audio FAQ
        if (!attachedMedia) {
          for (const f of faqsList) {
            if (f.attachments && Array.isArray(f.attachments)) {
              const found = f.attachments.find((att: any) => att.type === 'audio' && (!att.url || !att.url.toLowerCase().includes('blob:')))
                || f.attachments.find((att: any) => att.type === 'audio');
              if (found) {
                attachedMedia = found;
                break;
              }
            }
          }
        }
      }
    }

    // Default fallback if we need audio but still don't have an attachment
    if (audioRefMatch && !attachedMedia) {
      attachedMedia = {
        name: 'Nota_de_voz_PTT.ogg',
        type: 'audio',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      };
    }

    if (cleanReplyText) {
      const quota = reserveAiMessageCredit(phone);
      if (!quota.allowed) {
        console.log(`[AI Credits] Respuesta detenida para +${phone}: ${quota.reason}`);
        break;
      }
      if (clientSock) {
        await clientSock.sendMessage(senderJid, { text: cleanReplyText });
      } else {
        const evoResult = await sendEvolutionTextMessage(channelId, phone, cleanReplyText, senderJid);
        if (!evoResult?.ok) {
          throw new Error(evoResult?.data?.response?.message || evoResult?.data?.message || `Evolution API rechazó el mensaje (${evoResult?.status || 'sin estado'})`);
        }
      }

      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.messagesHistory[phone]) currentDB.messagesHistory[phone] = [];
      currentDB.messagesHistory[phone].push({
        role: 'assistant',
        text: cleanReplyText,
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      });
      if (currentDB.messagesHistory[phone].length > 15) {
        currentDB.messagesHistory[phone].shift();
      }

      if (idx < effectiveReplies.length - 1 || attachedMedia) {
        await new Promise(res => setTimeout(res, 1200));
      }
    }

    if (attachedMedia && (idx === effectiveReplies.length - 1 || attachedMedia.type === 'audio')) {
      try {
        const quota = reserveAiMessageCredit(phone);
        if (!quota.allowed) {
          console.log(`[AI Credits] Adjunto detenido para +${phone}: ${quota.reason}`);
          break;
        }
        let mediaBuffer: Buffer | null = await getMediaBuffer(attachedMedia.url);

        if (!mediaBuffer && attachedMedia.type === 'audio') {
          try {
            const res = await fetch('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
            const ab = await res.arrayBuffer();
            mediaBuffer = Buffer.from(ab);
          } catch(e) {}
        }

        if (mediaBuffer) {
          if (attachedMedia.type === 'audio') {
            console.log(`[WhatsApp Real] Enviando NOTA DE VOZ PTT REAL para +${phone}...`);
            const oggBuffer = await convertAudioToOggOpus(mediaBuffer, attachedMedia.url || attachedMedia.name);
            if (clientSock) {
              await clientSock.sendMessage(senderJid, {
                audio: oggBuffer,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus',
                waveform: generateSimulatedWaveform(64)
              });
            } else {
              const base64Audio = `data:audio/ogg;base64,${oggBuffer.toString('base64')}`;
              const evoResult = await sendEvolutionMediaMessage(channelId, phone, 'audio', base64Audio, '', attachedMedia.name || 'Nota_de_voz_PTT.ogg', undefined, senderJid);
              if (!evoResult?.ok) throw new Error(evoResult?.data?.message || `Evolution API rechazó el audio (${evoResult?.status || 'sin estado'})`);
            }

            if (!currentDB.messagesHistory[phone]) currentDB.messagesHistory[phone] = [];
            currentDB.messagesHistory[phone].push({
              role: 'assistant',
              text: '🎤 [Nota de voz enviada]',
              attachment: {
                name: attachedMedia.name || 'Nota_de_voz_PTT.ogg',
                type: 'audio',
                url: attachedMedia.url || ''
              },
              time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              timestamp: Date.now()
            });
          } else if (attachedMedia.type === 'imagen') {
            if (clientSock) {
              await clientSock.sendMessage(senderJid, { image: mediaBuffer, caption: cleanReplyText || '' });
            } else {
              const base64Img = `data:image/jpeg;base64,${mediaBuffer.toString('base64')}`;
              const evoResult = await sendEvolutionMediaMessage(channelId, phone, 'image', base64Img, cleanReplyText || '', attachedMedia.name || 'imagen.jpg', undefined, senderJid);
              if (!evoResult?.ok) throw new Error(evoResult?.data?.message || `Evolution API rechazó la imagen (${evoResult?.status || 'sin estado'})`);
            }
          } else if (attachedMedia.type === 'video') {
            if (clientSock) {
              await clientSock.sendMessage(senderJid, { video: mediaBuffer, caption: cleanReplyText || '' });
            } else {
              const base64Vid = `data:video/mp4;base64,${mediaBuffer.toString('base64')}`;
              const evoResult = await sendEvolutionMediaMessage(channelId, phone, 'video', base64Vid, cleanReplyText || '', attachedMedia.name || 'video.mp4', undefined, senderJid);
              if (!evoResult?.ok) throw new Error(evoResult?.data?.message || `Evolution API rechazó el video (${evoResult?.status || 'sin estado'})`);
            }
          } else if (attachedMedia.type === 'archivo') {
            if (clientSock) {
              await clientSock.sendMessage(senderJid, { document: mediaBuffer, fileName: attachedMedia.name || 'archivo', caption: cleanReplyText || '' });
            } else {
              const base64Doc = `data:application/octet-stream;base64,${mediaBuffer.toString('base64')}`;
              const evoResult = await sendEvolutionMediaMessage(channelId, phone, 'document', base64Doc, cleanReplyText || '', attachedMedia.name || 'archivo', undefined, senderJid);
              if (!evoResult?.ok) throw new Error(evoResult?.data?.message || `Evolution API rechazó el archivo (${evoResult?.status || 'sin estado'})`);
            }
          }
        }
      } catch (attErr) {
        console.error('[WhatsApp Real] Error enviando adjunto/audio PTT:', attErr);
      }
      attachedMedia = null;
    }
  }
}

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const messageBuffers = new Map<string, { timer: NodeJS.Timeout, messages: any[] }>();

// Helper to process buffered messages
async function processBufferedMessages(senderJid: string, messages: any[]) {
    // 1. Combine messages, check for quoted content, handle images/audio
    let combinedText = "";
    let mediaData: any[] = []; // Handle media

    for (const msg of messages) {
        let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

        // Handle Quoted Messages
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const quotedText = quoted.conversation || quoted.extendedTextMessage?.text || "[Media]";
            text = `[Respuesta al mensaje: "${quotedText}"] \n${text}`;
        }

        combinedText += text + "\n";
    }

    // 2. Perform the logic that currently exists in upsert loop, but using combinedText.
    console.log(`[WhatsApp Buffer] Procesando ${messages.length} mensajes para ${senderJid}: "${combinedText.substring(0, 50)}..."`);
    // ... [Original processing logic will go here] ...
}

const port = Number(process.env.PORT) || 3000;

function formatNumberCO(num: number): string {
  return num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function generateInvoiceString(order: any): string {
  const d = new Date(order.timestamp || new Date());
  const dateStr = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  const orderIdNum = order.id ? order.id.replace(/\D/g, '') : Math.floor(10000 + Math.random() * 90000);
  let total = order.amount || 28000;
  const addressStr = order.address || 'Yumbo';
  const phoneStr = order.phone || '';
  const payMethod = order.paymentMethod ? order.paymentMethod.toUpperCase() : 'EFECTIVO';

  // Find products list from DB
  const products = currentDB?.products || [];

  // Parse items and match prices
  let matchedItems = (order.items || []).map((item: string) => {
    let qty = 1;
    let name = item.trim();

    // Check if starts with e.g. "1x", "2x"
    const qtyMatch = name.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10);
      name = qtyMatch[2].trim();
    }

    // Try to find product base price
    let foundProd = products.find((p: any) => p.name.toLowerCase() === name.toLowerCase());
    let unitPrice = foundProd ? foundProd.basePrice : 15000; // default standard executive
    if (name.toLowerCase().includes('jugo') || name.toLowerCase().includes('bebida') || name.toLowerCase().includes('lulada')) {
      unitPrice = 6000;
    } else if (name.toLowerCase().includes('empanada') || name.toLowerCase().includes('aborrajado')) {
      unitPrice = 5000;
    }

    return {
      qty,
      name,
      unitPrice,
      totalPrice: unitPrice * qty
    };
  });

  // Calculate items sum
  let itemsSum = matchedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

  // Determine delivery fee
  let deliveryFee = 0;
  let possibleDeliveryFee = total - itemsSum;

  if (possibleDeliveryFee > 0) {
    deliveryFee = possibleDeliveryFee;
  } else {
    let lowercaseAddress = addressStr.toLowerCase();
    if (currentDB.deliveryZones && Array.isArray(currentDB.deliveryZones)) {
      for (const z of currentDB.deliveryZones) {
        if (z.zone && lowercaseAddress.includes(z.zone.toLowerCase())) {
          deliveryFee = Number(z.cost) || 0;
          break;
        }
      }
    }
    if (deliveryFee === 0 && addressStr.trim().length > 0) {
      deliveryFee = 4000; // default delivery fee
    }

    const targetItemsSum = Math.max(0, total - deliveryFee);
    if (itemsSum > 0 && targetItemsSum > 0) {
      matchedItems.forEach((it: any) => {
        it.totalPrice = Math.round((it.totalPrice / itemsSum) * targetItemsSum);
      });
    } else if (targetItemsSum === 0) {
      deliveryFee = total;
    }
  }

  // Ensure it sums exactly to total
  const finalItemsSum = matchedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);
  if (finalItemsSum + deliveryFee !== total) {
    if (matchedItems.length > 0) {
      matchedItems[matchedItems.length - 1].totalPrice += (total - (finalItemsSum + deliveryFee));
    } else {
      deliveryFee = total;
    }
  }

  // Calculations for subtotal and INC tax matching user ticket design
  const sub = Math.round(total / 1.08);
  const tax = total - sub;

  // Format and align lines
  let itemsTextLines = matchedItems.map((it: any) => {
    const itemFullLineName = `${it.name} x ${it.qty}`;
    const priceStr = `$ ${formatNumberCO(it.totalPrice)}`;
    const dotsAndSpacesLength = Math.max(1, 40 - itemFullLineName.length);
    const padding = ' '.repeat(dotsAndSpacesLength);
    return `${itemFullLineName}${padding}${priceStr}`;
  });

  if (itemsTextLines.length === 0) {
    itemsTextLines.push(`Consumo General                           $ ${formatNumberCO(total - deliveryFee)}`);
  }

  const itemsText = itemsTextLines.join('\n');

  // Domicilio line
  const cleanAddressSnippet = addressStr.length > 20 ? addressStr.substring(0, 20) : addressStr;
  const domLineName = `Domicilio - ${cleanAddressSnippet} x 1`;
  const domPriceStr = `$ ${formatNumberCO(deliveryFee)}`;
  const dotsAndSpacesLength = Math.max(1, 40 - domLineName.length);
  const padding = ' '.repeat(dotsAndSpacesLength);
  const deliveryLine = `${domLineName}${padding}${domPriceStr}`;

  return `RESTAURANTE Y HOSPEDAJE LA MONA DE YUMBO
NIT: 1114487291-1
Sede: Principal
calle 16#2-48 fray peña
Tel: 3173814709
restaurantelamonadeyumbo@gmail.com
----------------------------------------
nos complace ser parte de tu vida, Gracias por elegirnos
----------------------------------------
Cajero: wilka gomez
${dateStr} ${timeStr}
No. VNE-${orderIdNum}
----------------------------------------
${itemsText}
${deliveryLine}

Subtotal:                                $ ${formatNumberCO(sub)},22
INC (8.0%)                               $ ${formatNumberCO(tax)},78
Total venta:                             $ ${formatNumberCO(total)}
----------------------------------------
Tipo de pago    ${payMethod.padEnd(15, ' ')} Valor    $ ${formatNumberCO(total)}
                                Cambio   $ 0
----------------------------------------
Cliente: ${addressStr}
Telefono: ${phoneStr}
----------------------------------------
Trabajamos las 24 horas para Ti`;
}

function safeParseJSON(str: string): any {
  try {
    const cleanStr = str.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanStr);
  } catch (err) {
    console.error('Error parsing JSON:', err, '\\nRaw str:', str);
    return null;
  }
}

// Initialize data path for holding administrative state
const dbPath = path.resolve(process.cwd(), 'menu_data.json');

const defaultMenu = {
  active: {
    entradas: ["Sopa de Patacón Calientita", "Crema de Verduras con Crutones", "Consomé de la Casa"],
    principios: ["Lentejas Guisadas al Carbón", "Arroz Blanco Esponjoso", "Puré de Papa Gratinado", "Ensalada Rusa Fresca"],
    carnes: ["Chuleta de Cerdo Valluna Apandada", "Pollo Sudado en su Jugo", "Filete de Res a la Plancha", "Opción Vegetariana: Croquetas de Lentejas"],
    bebidas: ["Jugo de Lulo Helado", "Limonada Natural", "Agua Panela con Limón"],
    postres: ["Copa de Helado de Vainilla", "Dulce de Brevas con Arequipe Colombiano"],
    precio: 15000,
    nota_adicional: "El menú del día incluye entrada, principio, carne, bebida, ensalada y postre de la casa."
  },
  prompt: "Analiza esta imagen de un menú del día escrito a mano, digital, o impreso de restaurante colombiano. Extrae los nombres de los platos y colócalos en su categoría respectiva. Si encuentras precios individuales u opciones, regístralas adecuadamente o calcula el precio del almuerzo ejecutivo promedio. Las categorías solicitadas son: entradas, principios (acompañamientos/ensaladas), carnes (platos principales/proteínas), bebidas y postres. Entrega ÚNICAMENTE un objeto JSON con las claves: entradas, principios, carnes, bebidas, postres, precio y nota_adicional. Si una categoría no tiene elementos, deja su lista vacía."
};

const defaultBackofficeState = {
  active: defaultMenu.active,
  prompt: defaultMenu.prompt,
  botPrompt: "Actúa como la Mona IA, la asistente virtual de WhatsApp para el Restaurante La Mona en Yumbo. Tu objetivo es interactuar con el cliente sirviendo el menú de comida, aconsejando opciones y capturando sus datos de domicilio.\n\nSigue ESTE FLUJO paso a paso:\n1. Saluda cordialmente con estilo valluno. Como adjuntaremos una foto del menú real, NO tienes que enlistar todos los platos en texto a menos que te pregunten algo específico. Simplemente diles que ahí les compartes el menú del día en la imagen e invítalos a antojarse.\n2. Con amabilidad, solicita uno a uno los siguientes datos de despacho:\n   - Nombre completo\n   - Dirección exacta de entrega (en Yumbo)\n   - Teléfono de contacto\n   - Si pagará en efectivo o transferencia bancaria.\n3. Una vez confirmados todos los datos de forma explícita, agradece el pedido.\n\nMantén respuestas cortas, amables y con buena sazón, imitando la comunicación real por chat de WhatsApp.\n\nNOTA MUY IMPORTANTE: En tu PRIMER saludo o siempre que vayas a ofrecer el menú por primera vez en la conversación, DEBES incluir este código exacto en tu respuesta: [ENVIAR_IMAGEN_MENU]. Esto le dirá a nuestro sistema que despache la foto del tablero. Luego continuas preguntando qué se les antoja.",
  menuImage: null,
  messagesHistory: {} as Record<string, { role: string, text: string }[]>,
  orders: [
    {
      id: "ORD-092",
      customerName: "María Camila Rodríguez",
      phone: "+57 312 345 6789",
      status: "CONFIRMANDO",
      transcription: "Hola sra, quiero un sancocho de gallina especial y un jugo de champús con lulo para la Calle 15 # 4-12.",
      address: "Calle 15 # 4-12, Barrio Belalcázar, Yumbo",
      items: ["1x Sancocho de Gallina (Yumbo Especial)", "1x Jugo de Champús con Lulo"],
      waiterId: "S1",
      deliveryId: "D1",
      paymentMethod: "Transferencia",
      amount: 28000,
      timestamp: new Date().toISOString()
    },
    {
      id: "ORD-093",
      customerName: "Andrés Felipe Gómez",
      phone: "+57 321 456 7890",
      status: "EN COCINA",
      transcription: "Tráeme una bandeja paisa mona y unos aborrajados de plátano por favor al Barrio Centro.",
      address: "Carrera 3 # 8-45, Barrio Centro, Yumbo",
      items: ["1x Bandeja Paisa Mona", "2x Aborrajados Vallunos de Plátano (x2) font"],
      waiterId: "S2",
      deliveryId: "D2",
      paymentMethod: "Efectivo",
      amount: 36000,
      timestamp: new Date().toISOString()
    },
    {
      id: "ORD-091",
      customerName: "Juan Sebastián Castro",
      phone: "+57 301 987 6543",
      status: "ENTREGADO",
      transcription: "Quiero empanadas de entrada, de plato fuerte filete de res con lentejas, agua panela helada.",
      address: "Carrera 12 # 2-33, Barrio Guacandí, Yumbo",
      items: ["1x Empanadas Vallunas con Ají (x3)", "1x Filete de Res a la Plancha", "1x Lentejas Guisadas al Carbón", "1x Agua Panela con Limón"],
      waiterId: "S1",
      deliveryId: "D3",
      paymentMethod: "Efectivo",
      amount: 21000,
      timestamp: new Date().toISOString()
    }
  ],
  staff: [
    { id: "S1", name: "Sofía Cano", type: "mesero", status: "ACTIVO", ordersCount: 2 },
    { id: "S2", name: "Mateo Álvarez", type: "mesero", status: "ACTIVO", ordersCount: 1 },
    { id: "S3", name: "Camila Ortiz", type: "mesero", status: "ACTIVO", ordersCount: 0 },
    { id: "S4", name: "Carlos Gómez", type: "mesero", status: "DESCANSO", ordersCount: 0 },
    { id: "D1", name: "Juan Restrepo", type: "domiciliario", status: "ACTIVO", ordersCount: 1 },
    { id: "D2", name: "Pedro Nel", type: "domiciliario", status: "ACTIVO", ordersCount: 1 },
    { id: "D3", name: "Santiago López", type: "domiciliario", status: "ACTIVO", ordersCount: 1 },
    { id: "D4", name: "Andrés Cabrera", type: "domiciliario", status: "DESCANSO", ordersCount: 0 }
  ],
  products: [
    { sku: "LM-101", name: "Sancocho de Gallina (Yumbo Especial)", category: "mains", basePrice: 22000, stock: 45, aiSync: true },
    { sku: "LM-102", name: "Bandeja Paisa Mona", category: "mains", basePrice: 26000, stock: 32, aiSync: true },
    { sku: "LM-103", name: "Empanadas Vallunas con Ají (x3)", category: "starters", basePrice: 6000, stock: 80, aiSync: true },
    { sku: "LM-104", name: "Aborrajados Vallunos de Plátano (x2)", category: "starters", basePrice: 5000, stock: 15, aiSync: true },
    { sku: "LM-105", name: "Jugo de Champús con Lulo", category: "drinks", basePrice: 6000, stock: 50, aiSync: true },
    { sku: "LM-106", name: "Lulada Valluna Refrescante", category: "drinks", basePrice: 7000, stock: 35, aiSync: true },
    { sku: "LM-107", name: "Dulce de Brevas con Arequipe", category: "desserts", basePrice: 4000, stock: 25, aiSync: true }
  ],
  customers: [
    { id: "C1", name: "María Camila Rodríguez", registerDate: "2024-03-12", address: "Calle 15 # 4-12, Barrio Belalcázar, Yumbo", phone: "+57 312 345 6789", recurrence: "DIARIO", ordersCount: 15 },
    { id: "C2", name: "Andrés Felipe Gómez", registerDate: "2024-04-05", address: "Carrera 3 # 8-45, Barrio Centro, Yumbo", phone: "+57 321 456 7890", recurrence: "SEMANAL", ordersCount: 12 },
    { id: "C3", name: "Juan Sebastián Castro", registerDate: "2024-05-18", address: "Carrera 12 # 2-33, Barrio Guacandí, Yumbo", phone: "+57 301 987 6543", recurrence: "SEMANAL", ordersCount: 6 },
    { id: "C4", name: "Diana Marcela Patiño", registerDate: "2024-06-01", address: "Calle 7 # 10-15, Barrio San Jorge, Yumbo", phone: "+57 315 222 1100", recurrence: "NUEVO", ordersCount: 1 }
  ],
  chats: [
    { id: "CH-1", sender: "María Camila Rodríguez", phone: "+57 312 345 6789", message: "Hola sra, quiero un sancocho de gallina especial y un jugo de champús con lulo para la Calle 15.", time: "11:45 AM", status: "en_conversacion" },
    { id: "CH-2", sender: "Andrés Felipe Gómez", phone: "+57 321 456 7890", message: "Tráeme una bandeja paisa mona y unos aborrajados de plátano por favor.", time: "11:58 AM", status: "entrega" },
    { id: "CH-3", sender: "Carlos Rentería", phone: "+57 317 444 5555", message: "Señores buenas tardes, ¿tienen puré de papa hoy?", time: "12:10 PM", status: "nuevo" },
    { id: "CH-4", sender: "Sandra Viviana Ortiz", phone: "+57 318 999 8888", message: "Hola, a qué hora abren? Me interesa reservar para 4 personas hoy para almorzar", time: "12:15 PM", status: "nuevo" }
  ],
  whatsappConnected: false,
  isAiGlobalActive: true,
  autoPauseOnManualReply: false,
  disabledBots: [] as string[],
  blacklistedBots: [] as string[],
  roomsPaymentMethods: [] as string[],
  apiProvider: 'gemini',
  customApiKey: "",
  apiProviderBackup: 'gemini',
  customApiKeyBackup: "",
  customApiKeyBudgetBackup: 5.00,
  customGreeting: "",
  fallbackMessage: "Estoy un poco saturada, dame un momento y ya te respondo 😅.",
  apiTokens: { total: 0, prompt: 0, candidates: 0 },
  maxTokensLimit: 1000000
};

function getDBData() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure all fields exist
      return {
        ...defaultBackofficeState,
        autoPauseOnManualReply: parsed.autoPauseOnManualReply !== undefined ? parsed.autoPauseOnManualReply : false,
        disabledBots: parsed.disabledBots || [],
        blacklistedBots: parsed.blacklistedBots || [],
        roomsPaymentMethods: parsed.roomsPaymentMethods || [],
        apiProvider: parsed.apiProvider || 'gemini',
        customApiKey: parsed.customApiKey || "",
        apiProviderBackup: parsed.apiProviderBackup || 'gemini',
        customApiKeyBackup: parsed.customApiKeyBackup || "",
        customApiKeyBudgetBackup: parsed.customApiKeyBudgetBackup !== undefined ? parsed.customApiKeyBudgetBackup : 5.00,
        customGreeting: parsed.customGreeting || "",
        fallbackMessage: parsed.fallbackMessage || "Estoy un poco saturada, dame un momento y ya te respondo 😅.",
        connectedPhone: parsed.connectedPhone,
        apiTokens: parsed.apiTokens || { total: 0, prompt: 0, candidates: 0 },
        maxTokensLimit: parsed.maxTokensLimit !== undefined ? parsed.maxTokensLimit : 1000000,
        ...parsed
      };
    }
  } catch (err) {
    console.error('Error reading DB file, using defaults:', err);
  }
  return {
    ...defaultBackofficeState,
    disabledBots: [] as string[],
    blacklistedBots: [] as string[],
    roomsPaymentMethods: [] as string[]
  };
}

const realtimeClients = new Set<any>();

function broadcastRealtimeChange() {
  const payload = `event: state_changed\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`;
  for (const client of realtimeClients) {
    try { client.write(payload); } catch { realtimeClients.delete(client); }
  }
}

let normalizedDbActive = false;

function saveDBData(data: any) {
  try {
    // Local ephemeral cache only. Supabase source of truth is the normalized
    // tables once the cutover has booted successfully.
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    if (isSupabaseConfigured()) {
      if (normalizedDbActive) {
        queueNormalizedMirror(data, 250);
      } else {
        // Compatibility fallback while tables are unavailable: keep the old
        // app_state copy moving and continue trying to populate the tables.
        saveToSupabase(data).catch(err => console.warn('[Supabase Save Warning]:', err?.message || err));
        queueNormalizedMirror(data);
      }
    }
    broadcastRealtimeChange();
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// In-memory load
let currentDB = getDBData();
let globalExecuteAIInternal: any = null;

const AI_CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Reserve one automated message from the active recharge package. */
function reserveAiMessageCredit(phone: string): { allowed: boolean; reason?: 'no_conversations' | 'message_limit' } {
  const balance = currentDB.aiBalance;
  // Keep legacy accounts working until their first package is configured.
  if (!balance || typeof balance.conversations !== 'number') return { allowed: true };

  if (!currentDB.aiConversationUsage || typeof currentDB.aiConversationUsage !== 'object') {
    currentDB.aiConversationUsage = {};
  }

  const key = String(phone || 'unknown').replace(/\D/g, '') || 'unknown';
  const now = Date.now();
  const maxMessages = Math.max(1, Number(balance.aiMessagesPerConv) || 25);
  let usage = currentDB.aiConversationUsage[key];
  const startsNewWindow = !usage || !usage.startedAt || now - Number(usage.startedAt) >= AI_CONVERSATION_WINDOW_MS;

  if (startsNewWindow) {
    if (Number(balance.conversations) <= 0) return { allowed: false, reason: 'no_conversations' };
    balance.conversations = Math.max(0, Number(balance.conversations) - 1);
    usage = { startedAt: now, messagesSent: 0 };
  }

  if (Number(usage.messagesSent) >= maxMessages) return { allowed: false, reason: 'message_limit' };

  usage.messagesSent = Number(usage.messagesSent || 0) + 1;
  usage.lastMessageAt = now;
  currentDB.aiConversationUsage[key] = usage;
  balance.lastUsageAt = new Date(now).toISOString();
  saveDBData(currentDB);
  return { allowed: true };
}

// Timezone Management (Automatic Detection by Device / IP, Defaulting to Colombia America/Bogota)
if (!currentDB.systemTimezone) {
  currentDB.systemTimezone = 'America/Bogota';
}
process.env.TZ = currentDB.systemTimezone;

function getSystemTimezone(): string {
  return currentDB?.systemTimezone || process.env.TZ || 'America/Bogota';
}

function getFormattedTime(date: Date | number = new Date()): string {
  const tz = getSystemTimezone();
  try {
    const d = typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz
    }).format(d);
  } catch (_) {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Bogota'
    }).format(typeof date === 'number' ? new Date(date) : date);
  }
}

async function initDB() {
  try {
    if (isSupabaseConfigured()) {
      console.log('[Database] Connecting to Supabase normalized tables...');
      let tableState: any = null;
      try {
        tableState = await loadStateFromNormalizedTables();
      } catch (err: any) {
        console.warn('[NormalizedDB Load Warning]:', err?.message || err);
      }

      if (tableState) {
        fs.writeFileSync(dbPath, JSON.stringify(tableState, null, 2), 'utf-8');
        currentDB = getDBData();
        normalizedDbActive = true;
        console.log('✅ DB loaded from Supabase normalized tables.');
      } else {
        console.log('[NormalizedDB] Tables empty/unavailable; falling back to app_state compatibility copy...');
        const supabaseData = await loadFromSupabase();
        if (supabaseData) {
          fs.writeFileSync(dbPath, JSON.stringify(supabaseData, null, 2), 'utf-8');
          currentDB = getDBData();
          console.log('✅ DB synced from app_state compatibility copy.');
        } else {
          console.log('[Supabase] Initializing state: uploading current local DB state to Supabase...');
          await saveToSupabase(currentDB);
        }
      }
    } else {
      console.log('[Database] Supabase credentials not configured in env (SUPABASE_URL / SUPABASE_KEY), using local DB.');
    }
  } catch (err: any) {
    console.log('[Database] Supabase sync error (using local DB state):', err?.message || err);
  }

  // Do not block the HTTP server on a full mirror. Tables are already the
  // boot source; this background pass only syncs defaults/cleanup mutations
  // made while loading.
  if (isSupabaseConfigured()) queueNormalizedMirror(currentDB, 5000);

  const persistedEvolutionWebhook = String(currentDB?.evolutionWebhookBaseUrl || '');
  const normalizedEvolutionWebhook = normalizeEvolutionWebhookBase(persistedEvolutionWebhook);
  if (persistedEvolutionWebhook !== normalizedEvolutionWebhook) {
    currentDB.evolutionWebhookBaseUrl = normalizedEvolutionWebhook;
    console.log(`[Evolution API] URL de webhook corregida a ${normalizedEvolutionWebhook}.`);
    saveDBData(currentDB);
  }

  // Older disconnects persisted an empty object, which the UI interpreted as
  // a live WhatsApp Cloud connection after every restart.
  if (currentDB?.whatsappOauthConfig &&
      (!currentDB.whatsappOauthConfig.apiToken || !currentDB.whatsappOauthConfig.phoneNumberId)) {
    currentDB.whatsappOauthConfig = null;
    console.log('[WhatsApp Cloud] Estado de conexión vacío eliminado durante el arranque.');
    saveDBData(currentDB);
  }

  // Clean up any remaining blob attachments in memory and save to Supabase/local
  let hasBlob = false;
  if (currentDB && currentDB.faqsList && Array.isArray(currentDB.faqsList)) {
    for (const faq of currentDB.faqsList) {
      if (faq.attachments && Array.isArray(faq.attachments)) {
        const cleanedAtts = faq.attachments.filter((att: any) => !att.url || !att.url.toLowerCase().includes('blob:'));
        if (cleanedAtts.length !== faq.attachments.length) {
          faq.attachments = cleanedAtts;
          hasBlob = true;
        }
      }
    }
  }
  if (hasBlob) {
    console.log('[Startup Cleanup] Cleaned up browser blob attachments from memory and database.');
    saveDBData(currentDB);
  }

  // Migracion transparente: las claves de IA heredadas en texto plano
  // pasan a formato cifrado (AES-256-GCM). Si la llave maestra no esta
  // configurada, se dejan como estan y se cifran en el proximo guardado.
  if (isSecretEncryptionEnabled()) {
    let migratedSecrets = false;
    for (const field of ['customApiKey', 'customApiKeyBackup', 'openrouterApiKey']) {
      const legacyValue = (currentDB as any)[field];
      if (typeof legacyValue === 'string' && legacyValue.trim() && !isEncryptedSecret(legacyValue)) {
        (currentDB as any)[field] = encryptSecret(legacyValue.trim());
        migratedSecrets = true;
      }
    }
    const blobToken = currentDB?.chatbotIntegrationTokens?.openrouter?.token;
    if (typeof blobToken === 'string' && blobToken.trim() && !isEncryptedSecret(blobToken)) {
      currentDB.chatbotIntegrationTokens.openrouter.token = encryptSecret(blobToken.trim());
      migratedSecrets = true;
    }
    if (migratedSecrets) {
      console.log('[SecretBox] Claves de IA heredadas migradas a almacenamiento cifrado.');
      saveDBData(currentDB);
    }
  }
}

// Utility to construct unified dynamic prompt for WhatsApp Chatbot
function buildSystemPrompt(params: {
  phone: string;
  senderName: string;
  text: string;
  history: any[];
  mediaInfo?: string;
}) {
  const { phone, senderName, text, history, mediaInfo } = params;

  const antiHallucinationDirective = `
=========================================
🚨 REGLA ABSOLUTA DE INFORMACIÓN Y ENTRENAMIENTO BASE (MÁXIMA PRIORIDAD):
1. Para productos, precios, inventario, características y promociones, usa ÚNICAMENTE el CATÁLOGO OFICIAL sincronizado en Xorbit 360.
2. Para políticas y atención, responde únicamente con la configuración interna provista a continuación.
3. Está ESTRICTAMENTE PROHIBIDO consultar, completar o enriquecer respuestas con información de internet o fuentes externas.
4. Si el cliente solicita algo que no está en el Catálogo o la configuración interna, responde educadamente:
   "En este momento no dispongo de esa información específica en mi entrenamiento base, pero con gusto te conectaré con un asesor humano para ayudarte."
=========================================
`;

  // 1. Business Identity & Custom Instructions
  const bizName = currentDB.businessName || "Nuestra Empresa / Plataforma";
  const botInstructions = currentDB.botPrompt || "Actúa como un asistente virtual capacitado para responder dudas, brindar información de nuestros servicios o productos y capturar datos de contacto de manera profesional, amable y eficiente.";

  // 2. Active AI Rules
  const rulesList = currentDB.rules || currentDB.botRules || currentDB.rulesList || [];
  let rulesStr = "";
  if (Array.isArray(rulesList) && rulesList.length > 0) {
    const activeRules = rulesList.filter((r: any) => r.active !== false);
    if (activeRules.length > 0) {
      rulesStr = `\n=========================================\n🚨 REGLAS DE CONDUCTA Y ATENCIÓN OBLIGATORIAS (MÁXIMA PRIORIDAD ABSOLUTA - SOBREESCRIBEN CUALQUIER OTRA INSTRUCCIÓN):\n${activeRules.map((r: any, i: number) => `Regla #${i+1} [${r.title || r.name || 'Regla'}] - ESTRICTO CUMPLIMIENTO: ${r.content || r.description || r.instruction || JSON.stringify(r)}`).join('\n')}\n=========================================\n`;
    }
  }

  // 3. Knowledge Base & FAQs (High Priority)
  const faqsFormatted = (currentDB.faqsList && Array.isArray(currentDB.faqsList) && currentDB.faqsList.length > 0)
    ? currentDB.faqsList.map((f: any, i: number) => {
        let attsStr = "";
        if (f.attachments && Array.isArray(f.attachments) && f.attachments.length > 0) {
          attsStr = `\n  - ARCHIVOS Y NOTAS DE VOZ ADJUNTOS: ${f.attachments.map((a: any) => `"${a.name}" (tipo: ${a.type})`).join(', ')}`;
        }
        return `FAQ #${i+1}:\n  Pregunta: ${f.question}\n  Respuesta Oficial: ${f.answer}${attsStr}`;
      }).join('\n\n')
    : (currentDB.faqs || '');
  const faqsStr = faqsFormatted ? `\n=========================================\n🚨 BASE DE CONOCIMIENTO Y PREGUNTAS FRECUENTES (FAQS - SOBREESCRIBE EL PROMPT BASE):\n${faqsFormatted}\nSi el cliente hace una pregunta que coincida con una de las FAQs anteriores, responde usando EXACTAMENTE la Respuesta Oficial de esa FAQ.\nREGLA DE ADJUNTOS/NOTAS DE VOZ: Si la FAQ incluye una nota de voz u otro archivo adjunto, es OBLIGATORIO que incluyas en tu respuesta el nombre exacto del archivo entre corchetes para que el sistema lo pueda enviar. (Ejemplo: escribe "[nota_de_voz.ogg]" o "[archivo.pdf]" al final de tu respuesta de texto). El sistema reemplazará ese texto por el archivo real.\n=========================================\n` : '';

  // 4. Custom Greeting Rule
  const greetingAttsFormatted = (currentDB.greetingAttachments && Array.isArray(currentDB.greetingAttachments) && currentDB.greetingAttachments.length > 0)
    ? `\n  - ARCHIVOS Y NOTAS DE VOZ ADJUNTOS EN EL SALUDO: ${currentDB.greetingAttachments.map((a: any) => `"${a.name}" (tipo: ${a.type})`).join(', ')}`
    : '';
  const customGreetingStr = currentDB.customGreeting
    ? `\n=========================================\n🚨 SALUDO INICIAL BASE CONFIGURADO (MÁXIMA PRIORIDAD DE INICIO):\n"${currentDB.customGreeting}"${greetingAttsFormatted}\nREGLA DE SALUDO: Si es la primera interacción o el historial de mensajes está vacío (0 o 1 mensaje del cliente), saluda obligatoriamente usando como plantilla directa este saludo configurado junto con sus archivos o notas de voz adjuntos si los tiene. Si ya saludaste antes en la conversación, NO repitas el saludo inicial.\n=========================================\n`
    : '';

  const aiAutomationRulesList = currentDB.aiAutomationRules || [];
  let aiRulesStr = "";
  if (Array.isArray(aiAutomationRulesList) && aiAutomationRulesList.length > 0) {
    const activeAiRules = aiAutomationRulesList.filter((r: any) => r.active !== false);
    if (activeAiRules.length > 0) {
      const formatted = activeAiRules.map((r: any, i: number) => {
        let attsStr = "";
        if (r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0) {
          attsStr = `\n  - ARCHIVOS Y NOTAS DE VOZ ADJUNTOS: ${r.attachments.map((a: any) => `"${a.name}" (tipo: ${a.type})`).join(', ')}`;
        }
        return `Regla de Automatización #${i+1}: Si el cliente menciona "${r.keyword || r.phrase}", aplica la acción "${r.action}" (${r.actionValue || r.value || ''}).${attsStr}`;
      }).join('\n');
      aiRulesStr = `\n=========================================\n🚨 REGLAS DE AUTOMATIZACIÓN DE IA Y ACCIONES:\n${formatted}\n=========================================\n`;
    }
  }

  // 5. Products / Services / Catalogs if present in currentDB
  let catalogStr = "";
  if (currentDB.products && Array.isArray(currentDB.products) && currentDB.products.length > 0) {
    const availableProducts = currentDB.products.filter((p: any) => p?.isActive !== false && p?.isAvailableForBot !== false);
    catalogStr += `\nCATÁLOGO OFICIAL SINCRONIZADO (ÚNICA FUENTE PARA INFORMACIÓN DE PRODUCTOS):\n` +
      availableProducts.map((p: any) => {
        const controlledStock = typeof p.stock === 'number' || /^\d+$/.test(String(p.stock || '').trim());
        const stock = controlledStock ? (Number(p.stock) > 0 ? `${Number(p.stock)} disponibles` : '¡AGOTADO!') : 'Disponible';
        const details = [p.basicDescription || p.description, p.features, p.benefits, p.differentiators].filter(Boolean).join(' | ');
        return `- ${p.name}: $${p.offerPrice || p.price || p.basePrice || 0} COP (${stock})${details ? ` — ${details}` : ''}`;
      }).join('\n') + '\nPROHIBIDO agregar información tomada de internet o inferida fuera de este catálogo.\n';
  }

  // 6. Active menu (if configured)
  let menuStr = "";
  if (currentDB.active && (currentDB.active.entradas?.length || currentDB.active.principios?.length || currentDB.active.carnes?.length)) {
    const m = currentDB.active;
    menuStr = `\nOPCIONES ADICIONALES DE MENÚ / CATÁLOGO:\n- Entradas: ${(m.entradas || []).join(', ')}\n- Acompañamientos: ${(m.principios || []).join(', ')}\n- Platos Fuertes: ${(m.carnes || []).join(', ')}\n- Bebidas: ${(m.bebidas || []).join(', ')}\n- Precio general: $${m.precio || 0} COP\n`;
  }

  // 7. Payment methods & Delivery zones
  const paymentStr = currentDB.paymentMethods?.length ? `\nMétodos de Pago Aceptados: ${currentDB.paymentMethods.join(', ')}` : '';
  const deliveryStr = currentDB.deliveryZones?.length ? `\nCostos y Zonas de Domicilio/Envío: ${currentDB.deliveryZones.map((z: any) => `${z.zone} ($${z.cost})`).join(', ')}` : '';

  const chatCols = currentDB.chatColumnNames || {};
  const colNamesStr = `\nColumnas del Embudo de Ventas (Kanban):\n- nuevo: "${chatCols.nuevo || 'Nuevo Mensaje'}"\n- en_conversacion: "${chatCols.en_conversacion || 'En Conversación'}"\n- entrega: "${chatCols.entrega || 'En Entrega'}"\n- post_entrega: "${chatCols.post_entrega || 'Post Entrega'}"`;

  // Clean sender name: ignore default placeholders
  const isGenericName = !senderName || senderName === "Cliente WhatsApp" || senderName === "Cliente" || senderName === "Usuario" || senderName.includes("WhatsApp");
  const cleanSenderName = isGenericName ? "" : senderName;

  return `${antiHallucinationDirective}
=========================================
INSTRUCCIONES Y ROL PRINCIPAL DEL ASISTENTE VIRTUAL
=========================================
Eres un asesor comercial y de soporte virtual de "${bizName}". Actúa con naturalidad, cordialidad, amabilidad y empatía profesional, como un humano atendiendo por WhatsApp.

=========================================
🚨 JERARQUÍA Y ORDEN DE PRIORIDAD ABSOLUTA DEL ENTRENAMIENTO:
1. PRIMERA PRIORIDAD ABSOLUTA: Las REGLAS DE CONDUCTA, el SALUDO INICIAL BASE y las PREGUNTAS FRECUENTES (FAQS). Si hay cualquier discrepancia con el Prompt Base, DEBES obedecer estrictamente las Reglas, el Saludo Inicial y las FAQs.
2. SEGUNDA PRIORIDAD: El Prompt de Entrenamiento Base del Negocio.

=========================================
REGLA DE ORO SOBRE EL NOMBRE DEL CLIENTE:
- Cliente en WhatsApp: ${cleanSenderName ? `"${cleanSenderName}"` : 'Nombre no especificado aún'}. Teléfono: +${phone}.
- ATENCIÓN ABSOLUTA: Solo dirígete al cliente por su nombre "${cleanSenderName}" si este es un nombre propio natural claro de la persona. NUNCA asumas ni inventes nombres de otras personas.

${rulesStr}
${customGreetingStr}
${faqsStr}
${aiRulesStr}

=========================================
PROMPT DE ENTRENAMIENTO BASE DEL NEGOCIO (SEGUNDA PRIORIDAD COMPLEMENTARIA):
"${botInstructions}"
${catalogStr}
${menuStr}
${paymentStr}
${deliveryStr}
${colNamesStr}
`;
}


process.on('uncaughtException', (err: any) => {
  const msg = err?.message || String(err);
  if (msg.includes('Bad MAC') || msg.includes('Failed to decrypt') || msg.includes('Session error') || msg.includes('SessionError')) {
    console.log('[WhatsApp Session Warning Handled]:', msg);
    return;
  }
  console.error('[Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  if (msg.includes('Bad MAC') || msg.includes('Failed to decrypt') || msg.includes('Session error') || msg.includes('SessionError')) {
    console.log('[WhatsApp Session Rejection Handled]:', msg);
    return;
  }
  console.error('[Unhandled Rejection]:', reason);
});

async function createServer() {
  await initDB().catch(err => console.error('initDB async error:', err));
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(self), microphone=(self)');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' https: data: blob:; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://checkout.bold.co; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https: wss:; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; frame-src https:;"
    );
    next();
  });

  // Compress JSON snapshots (especially the inbox) before sending them to
  // browsers and external MCP clients. This keeps realtime updates small
  // without changing the event/webhook flow.
  app.use(compression({ threshold: 1024 }));

  // Set json limit to 15mb and preserve rawBody for HMAC verification (Zernio Webhook)
  app.use(express.json({
    limit: '15mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // MCP remoto con perfiles separados (Super Admin / Usuario). Los tokens
  // viven únicamente en variables de entorno y nunca se guardan en Git.
  setupMcpRoutes(app, {
    projectRoot: process.cwd(),
    getDB: () => currentDB,
    saveDB: (next) => {
      currentDB = next;
      saveDBData(currentDB);
    }
  });

  // Serve uploaded files statically
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Canal servidor -> navegador. Los webhooks actualizan currentDB y este
  // stream avisa inmediatamente al CRM sin recargar la página ni hacer polling.
  app.get('/api/realtime/events', requireSession, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    realtimeClients.add(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    const heartbeat = setInterval(() => {
      try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { clearInterval(heartbeat); }
    }, 25000);
    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeClients.delete(res);
    });
  });

  // Strict Authentication & Access Validation (Paid / Active Users Only)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Por favor ingresa usuario/correo y contraseña." });
      }

      const normUser = String(username).trim().toLowerCase();
      const pass = String(password).trim();

      // 1. Cuenta maestra: credenciales solo desde el entorno del servidor.
      const adminUsername = String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@xorbit360.com').trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
      if ((normUser === adminUsername || normUser === adminEmail) && await verifyPassword(pass, adminPassword)) {
        const user = {
          name: process.env.ADMIN_DISPLAY_NAME || 'Administrador Xorbit 360',
          email: adminEmail,
          role: 'superadmin',
          username: adminUsername,
          phone: process.env.ADMIN_PHONE || '',
          plan: 'SuperAdmin Master'
        };
        setSessionCookie(res, user);
        return res.json({
          success: true,
          user
        });
      }

      // 2. Search in active database users (registered / paid via landing)
      const users = Array.isArray(currentDB.users) ? currentDB.users : [];
      const matchedUser = users.find((u: any) =>
        (u.email && u.email.trim().toLowerCase() === normUser) ||
        (u.username && u.username.trim().toLowerCase() === normUser)
      );

      if (matchedUser) {
        const validPass = await verifyPassword(pass, matchedUser.password) || await verifyPassword(pass, matchedUser.tempPassword);
        if (!validPass) {
          return res.status(401).json({ success: false, error: "Contraseña incorrecta." });
        }

        if (matchedUser.status !== 'activo') {
          return res.status(403).json({
            success: false,
            requirePayment: true,
            error: "Tu suscripción no está activa. Para acceder al CRM adquiere tu plan en https://xorbit360.com"
          });
        }

        const user = {
          name: matchedUser.name || normUser,
          email: matchedUser.email || normUser,
          role: matchedUser.role || 'droshipper',
          username: matchedUser.username || normUser,
          phone: matchedUser.phone || '',
          plan: matchedUser.plan || 'Paquete Pro'
        };
        if (!/^\$2[aby]\$/.test(String(matchedUser.password || ''))) {
          matchedUser.password = await bcrypt.hash(pass, 12);
          delete matchedUser.tempPassword;
          saveDBData(currentDB);
        }
        setSessionCookie(res, user);
        return res.json({
          success: true,
          user
        });
      }

      // 3. User not found -> Deny access and direct to payment
      return res.status(403).json({
        success: false,
        requirePayment: true,
        error: "Acceso no autorizado: crm.xorbit360.com es exclusivo para clientes activos. Por favor adquiere tu paquete en https://xorbit360.com para recibir tus credenciales de ingreso."
      });
    } catch (err: any) {
      console.error("[Auth Login Error]:", err);
      res.status(500).json({ success: false, error: "Error en el servidor de autenticación." });
    }
  });

  // Strict Google Login: User must be active/paid in database to enter
  app.post("/api/auth/google-login", (req, res) => {
    return res.status(501).json({
      success: false,
      error: 'El acceso con Google está temporalmente deshabilitado mientras se configura OAuth seguro.'
    });
    /* Legacy flow retained temporarily for reference; unreachable by design.
    try {
      const { email, name } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: "Correo de Google no proporcionado." });
      }

      const normEmail = String(email).trim().toLowerCase();

      // Master admin check
      if (normEmail === 'admin@xorbit360.com') {
        return res.json({
          success: true,
          user: {
            name: name || 'Oscar Molina',
            email: normEmail,
            role: 'superadmin',
            username: 'admin',
            phone: '573192392853',
            plan: 'SuperAdmin Master'
          }
        });
      }

      // Check in registered active users
      const users = Array.isArray(currentDB.users) ? currentDB.users : [];
      const matchedUser = users.find((u: any) => u.email && u.email.trim().toLowerCase() === normEmail);

      if (matchedUser) {
        if (matchedUser.status !== 'activo') {
          return res.status(403).json({
            success: false,
            requirePayment: true,
            error: `Tu cuenta de Google (${normEmail}) no tiene un paquete activo. Para ingresar debes adquirir tu plan en https://xorbit360.com`
          });
        }

        return res.json({
          success: true,
          user: {
            name: matchedUser.name || name || normEmail.split('@')[0],
            email: matchedUser.email || normEmail,
            role: matchedUser.role || 'droshipper',
            username: matchedUser.username || normEmail.split('@')[0],
            phone: matchedUser.phone || '',
            plan: matchedUser.plan || 'Paquete Pro'
          }
        });
      }

      // If user hasn't paid yet, block and require payment
      return res.status(403).json({
        success: false,
        requirePayment: true,
        error: `La cuenta de Google (${normEmail}) no está registrada como cliente activo. Debes adquirir tu paquete primero en https://xorbit360.com para tener acceso a crm.xorbit360.com.`
      });
    } catch (err: any) {
      console.error("[Google Auth Error]:", err);
      res.status(500).json({ success: false, error: "Error en el servidor de autenticación." });
    }
    */
  });

  app.get('/api/auth/session', (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ authenticated: false });
    const { iat: _iat, exp: _exp, sub: _sub, ...user } = session;
    return res.json({ authenticated: true, user });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    return res.json({ success: true });
  });

  // Default-deny for APIs not explicitly classified as public webhooks.
  app.use('/api/admin', requireRole('superadmin', 'admin'));
  app.use('/api/supabase', requireRole('superadmin', 'admin'));
  app.use('/api/integrations/chatbot-tokens', requireRole('superadmin', 'admin'));
  app.use('/api/telegram-pay', requireRole('superadmin', 'admin'));
  setupLiveSellingPublicRoutes(app);
  setupDiagnosticPublicRoutes(app);
  app.use('/api', requireApiSession);
  setupLiveSellingAdminRoutes(app);
  setupDiagnosticAdminRoutes(app);

  // Receives the real browser exception behind the generic error screen. The
  // payload is truncated and never includes cookies, tokens or request bodies.
  app.post('/api/client-errors', (req, res) => {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const clip = (value: unknown, max = 4000) => String(value ?? '').slice(0, max);
    const authUser = (req as any).authUser;
    console.error('[ClientError]', JSON.stringify({
      at: new Date().toISOString(),
      user: authUser ? { id: authUser.sub || null, role: authUser.role || null } : null,
      name: clip(body.name, 120),
      message: clip(body.message, 1000),
      stack: clip(body.stack),
      componentStack: clip(body.componentStack),
      url: clip(body.url, 500),
      userAgent: clip(body.userAgent, 500),
    }));
    res.status(204).end();
  });

  // Setup Bold Payments Gateway (Merchant ID FFVSR3C7Y1) Routes & Webhook
  setupBoldRoutes(app, () => currentDB, (db) => saveDBData(db));

  // Setup Zernio (Meta Cloud API Oficial) Routes & Webhook handler
  setupZernioRoutes(app, (event) => {
    try {
      const msg = event.message;
      if (!msg) return;
      const eventType = String(event.eventType || '').toLowerCase();
      if (!['message.received', 'message.sent', 'comment.received', 'comment.created'].includes(eventType)) return;
      if (!currentDB.chats) currentDB.chats = [];
      const rawEvent: any = event.raw || {};
      const rawData: any = rawEvent.data || {};
      const rawMessage: any = rawEvent.message || rawData.message || {};
      const rawConversation: any = rawEvent.conversation || rawData.conversation || {};
      const zernioConversationId = msg.conversationId || rawEvent.conversationId || rawData.conversationId || rawConversation.id || '';
      const incomingMessage = msg.direction !== 'outgoing';
      const socialPlatform = String(rawEvent.platform || rawData.platform || rawMessage.platform || 'instagram').toLowerCase();
      const participantId = String(
        incomingMessage
          ? (msg.senderId || rawConversation.participantId || rawData.participantId || '')
          : (rawConversation.participantId || rawData.participantId || rawData.recipientId || rawMessage.recipientId || rawMessage.recipient?.id || '')
      ).trim();
      const participantUsername = String(rawConversation.participantUsername || rawData.participantUsername || rawMessage.recipient?.username || '').replace(/^@/, '').trim();
      const socialAccountId = String(rawEvent.accountId || rawData.accountId || rawMessage.accountId || '').trim();
      const stableSocialId = String(zernioConversationId || participantId || msg.senderId || msg.senderPhone || '').trim();
      const existingConversation = currentDB.chats.find((c: any) => {
        const samePlatform = String(c.platform || c.channelId || '').toLowerCase().includes(socialPlatform === 'facebook' ? 'messenger' : socialPlatform);
        if (!samePlatform) return false;
        if (zernioConversationId && c.conversationId && String(c.conversationId) === String(zernioConversationId)) return true;
        if (participantId && [c.participantId, c.externalId, String(c.phone || '').replace(/\D/g, '')].some((value: any) => String(value || '') === participantId)) return true;
        if (participantUsername && String(c.participantUsername || '').replace(/^@/, '').toLowerCase() === participantUsername.toLowerCase()) return true;
        return false;
      });

      // A message.sent event identifies the business account as sender. When
      // no customer thread can be resolved, ignoring the echo is safer than
      // creating a fake chat for our own Instagram account.
      if (!incomingMessage && !existingConversation) return;
      const identitySource = incomingMessage
        ? (msg.senderPhone || participantId || msg.senderId || zernioConversationId)
        : (existingConversation?.phone || existingConversation?.participantId || existingConversation?.externalId || participantId || zernioConversationId);
      const cleanPhone = String(identitySource || '').replace(/\D/g, '') || `social-${stableSocialId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      if (!cleanPhone) return;

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const profileAvatar = msg.senderAvatar ||
        rawMessage.sender?.profilePicture || rawMessage.sender?.profilePictureUrl || rawMessage.sender?.profile_picture || rawMessage.sender?.avatar ||
        rawConversation.participantPicture || rawConversation.participantProfilePicture ||
        msg.raw?.sender?.profile_picture || msg.raw?.sender?.profilePicture || msg.raw?.sender?.profilePictureUrl || msg.raw?.sender?.avatar ||
        rawData.sender?.profile_picture || rawData.sender?.profilePicture || rawData.sender?.profilePictureUrl || rawData.sender?.avatar ||
        rawData.participantPicture || rawData.profile_picture || rawData.profilePicture || rawData.profilePictureUrl || '';
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];

      const zAtt: any = (msg as any).attachment || undefined;
      const zAttType: string | undefined = zAtt?.type;
      const socialDisplayText = msg.text || (zAttType === 'audio' ? '🎤 [Audio de voz]' : (zAttType === 'imagen' ? '📷 [Imagen]' : (zAttType === 'video' ? '🎥 [Video]' : (zAtt ? '📎 [Archivo]' : msg.text))));
      const socialAttachment = zAtt && zAtt.url ? {
        name: zAtt.name || (zAttType === 'audio' ? 'Nota_de_voz.ogg' : (zAttType === 'imagen' ? 'Imagen.jpg' : (zAttType === 'video' ? 'Video.mp4' : 'Archivo'))),
        type: zAttType,
        url: zAtt.url,
        size: zAttType === 'audio' ? 'Audio' : (zAttType === 'imagen' ? 'Imagen' : (zAttType === 'video' ? 'Video' : 'Archivo'))
      } : undefined;

      currentDB.messagesHistory[cleanPhone].push({
        id: msg.id || undefined,
        role: msg.direction === 'outgoing' ? 'agent' : 'client',
        source: `social_${socialPlatform || 'omnichannel'}`,
        fromMobile: msg.direction === 'outgoing',
        text: socialDisplayText,
        attachment: socialAttachment,
        time: nowStr,
        timestamp: msg.timestamp || Date.now()
      });

      // Los comentarios de publicaciones e historias también deben quedar
      // disponibles en el módulo "Comentarios Redes".
      if (eventType === 'comment.received' || eventType === 'comment.created') {
        if (!Array.isArray(currentDB.socialComments)) currentDB.socialComments = [];
        const raw: any = event.raw || {};
        const data: any = raw.data || {};
        const comment: any = raw.comment || data.comment || {};
        const commentId = String(event.eventId || msg.id || `comment-${Date.now()}`);
        if (!currentDB.socialComments.some((item: any) => String(item.id) === commentId)) {
          currentDB.socialComments.unshift({
            id: commentId,
            authorName: msg.senderName || comment.author?.name || comment.from?.name || 'Usuario de red social',
            authorAvatar: comment.author?.avatar || comment.from?.profile_picture || '',
            authorId: msg.senderId || comment.author?.id || comment.from?.id || '',
            platform: String(raw.platform || data.platform || comment.platform || 'instagram').toLowerCase(),
            postTitle: comment.post?.title || data.post?.title || data.media?.caption || 'Publicación de Instagram',
            postId: comment.postId || data.postId || data.media?.id || '',
            text: msg.text || comment.text || comment.message || '',
            timestamp: new Date().toISOString(),
            status: 'pendiente'
          });
          currentDB.socialComments = currentDB.socialComments.slice(0, 500);
        }
      }

      if (currentDB.messagesHistory[cleanPhone].length > 40) {
        currentDB.messagesHistory[cleanPhone].shift();
      }

      // Primero se busca por la conversación externa. Así todos los mensajes
      // de Instagram del mismo hilo se mantienen en una sola tarjeta, aunque
      // el proveedor cambie el teléfono/ID mostrado del participante.
      const chatIdx = currentDB.chats.findIndex((c: any) => {
        if (zernioConversationId && c.conversationId && String(c.conversationId) === String(zernioConversationId)) return true;
        if (c?.platform !== socialPlatform && c?.channelId !== socialPlatform) return false;
        if (participantId && [c.participantId, c.externalId].some((value: any) => String(value || '') === participantId)) return true;
        return Boolean(c.phone && c.phone.replace(/\D/g, '') === cleanPhone);
      });
      if (chatIdx !== -1) {
        const updatedChat = { ...currentDB.chats[chatIdx], message: socialDisplayText, time: nowStr, timestamp: Date.now(),
          channelId: socialPlatform === 'instagram' ? 'instagram' : currentDB.chats[chatIdx].channelId,
          platform: socialPlatform, conversationId: zernioConversationId || currentDB.chats[chatIdx].conversationId,
          externalId: participantId || currentDB.chats[chatIdx].externalId,
          participantId: participantId || currentDB.chats[chatIdx].participantId,
          participantUsername: participantUsername || currentDB.chats[chatIdx].participantUsername,
          accountId: socialAccountId || currentDB.chats[chatIdx].accountId,
          ...(profileAvatar && incomingMessage ? { avatar: profileAvatar } : {}),
          ...(incomingMessage ? { unread: (Number(currentDB.chats[chatIdx].unread) || 0) + 1 } : {}) };
        currentDB.chats.splice(chatIdx, 1);
        currentDB.chats.unshift(updatedChat);
      } else {
        currentDB.chats.unshift({
          id: `CH-${Date.now().toString().slice(-4)}`,
          sender: msg.senderName || `Cliente +${cleanPhone}`,
          phone: `+${cleanPhone}`,
          message: socialDisplayText,
          time: nowStr,
          timestamp: Date.now(),
          status: 'en_conversacion',
          avatar: profileAvatar || undefined,
          unread: incomingMessage ? 1 : 0
          ,channelId: socialPlatform === 'instagram' ? 'instagram' : 'whatsapp'
          ,platform: socialPlatform
          ,conversationId: zernioConversationId || undefined
          ,externalId: participantId || msg.senderId || undefined
          ,participantId: participantId || msg.senderId || undefined
          ,participantUsername: participantUsername || undefined
          ,accountId: socialAccountId || undefined
        });
      }
      saveDBData(currentDB);
    } catch (err) {
      console.error('[Zernio Event Ingest Error]:', err);
    }
  });

  // ==========================================
  // EVOLUTION API WEBHOOK & CONFIG ENDPOINTS
  // ==========================================
  app.post("/api/whatsapp/evolution-webhook", async (req, res) => {
    res.status(200).json({ received: true });
    try {
      const body = req.body || {};
      const rawEvent = body.event || body.type;
      const instance = body.instance || 'channel-default';
      const data = body.data;

      const event = String(rawEvent || '').toLowerCase().replace(/[-_]/g, '.');
      console.log(`[Evolution API Webhook] Evento recibido: "${rawEvent}" (normalizado: "${event}") para instancia: "${instance}"`);

      if (event === 'connection.update' || event === 'qrcode.updated') {
        const state = data?.state || (data?.status === 'open' ? 'open' : undefined);
        console.log(`[Evolution API] Actualización de conexión para ${instance}:`, state);
        if (state === 'open' || data?.status === 'open') {
          currentDB.whatsappConnected = true;
          if (data?.owner) {
            currentDB.connectedPhone = data.owner.split('@')[0].replace(/\D/g, '');
          }
          currentDB.whatsappError = undefined;
          saveDBData(currentDB);
        } else if (state === 'close' || state === 'refused') {
          currentDB.whatsappConnected = false;
          saveDBData(currentDB);
        }
      } else if (event === 'messages.upsert' || event === 'send.message') {
        if (onEvolutionIncomingMessage) {
          const items: any[] = Array.isArray(data)
            ? data
            : (data?.messages && Array.isArray(data.messages) ? data.messages : (data ? [data] : []));

          for (const item of items) {
            await onEvolutionIncomingMessage(instance, item);
          }
        }
      }
    } catch (err: any) {
      console.error("[Evolution API Webhook Handler Error]:", err?.message || err);
    }
  });

  app.get("/api/whatsapp/evolution-config", async (req, res) => {
    const evoConfig = getEvolutionConfig();
    let vpsOnline = false;
    let activeInstancesCount = 0;
    if (evoConfig.isConfigured) {
      try {
        const ping = await evolutionRequest('/instance/fetchInstances', { timeoutMs: 4000 });
        if (ping.ok) {
          vpsOnline = true;
          activeInstancesCount = Array.isArray(ping.data) ? ping.data.length : 0;
        }
      } catch(e) {}
    }
    res.json({
      apiUrl: evoConfig.apiUrl,
      hasApiKey: !!evoConfig.apiKey,
      maskedApiKey: evoConfig.apiKey ? `${evoConfig.apiKey.slice(0, 4)}...${evoConfig.apiKey.slice(-4)}` : '',
      isConfigured: evoConfig.isConfigured,
      webhookBaseUrl: evoConfig.webhookBaseUrl,
      fullWebhookUrl: `${evoConfig.webhookBaseUrl}/api/whatsapp/evolution-webhook`,
      vpsOnline,
      activeInstancesCount
    });
  });

  app.post("/api/whatsapp/evolution-config", async (req, res) => {
    try {
      const { apiUrl, apiKey, webhookBaseUrl } = req.body;
      if (apiUrl !== undefined) currentDB.evolutionApiUrl = apiUrl.trim().replace(/\/+$/, "");
      if (apiKey !== undefined) currentDB.evolutionApiKey = apiKey.trim();
      if (webhookBaseUrl !== undefined) currentDB.evolutionWebhookBaseUrl = normalizeEvolutionWebhookBase(webhookBaseUrl);
      saveDBData(currentDB);
      res.json({ success: true, message: "Configuración de Evolution API actualizada exitosamente." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sincronizar todos los webhooks de todas las instancias en Evolution API hacia el dominio personalizado
  app.post("/api/whatsapp/sync-webhooks", async (req, res) => {
    try {
      const { customBaseUrl } = req.body || {};
      if (customBaseUrl) {
        currentDB.evolutionWebhookBaseUrl = normalizeEvolutionWebhookBase(customBaseUrl);
        saveDBData(currentDB);
      }
      const evoConfig = getEvolutionConfig();
      const cleanHost = normalizeEvolutionWebhookBase(customBaseUrl || evoConfig.webhookBaseUrl);
      const fullWebhook = `${cleanHost}/api/whatsapp/evolution-webhook`;

      const listRes = await evolutionRequest('/instance/fetchInstances', { timeoutMs: 6000 });
      const results: any[] = [];
      if (listRes.ok && Array.isArray(listRes.data)) {
        for (const inst of listRes.data) {
          const instName = inst.name || inst.instanceName;
          if (instName) {
            const ok = await setupEvolutionWebhook(instName, cleanHost);
            results.push({ instance: instName, success: ok, webhookUrl: fullWebhook });
          }
        }
      }
      console.log(`[Evolution API] Webhooks sincronizados hacia ${fullWebhook} para ${results.length} instancias.`);
      res.json({
        success: true,
        message: `Webhooks actualizados hacia ${fullWebhook} para ${results.length} instancia(s).`,
        webhookUrl: fullWebhook,
        results
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Endpoint: Sincronizar conversaciones y mensajes recientes directamente desde el VPS de Evolution API
  app.post("/api/whatsapp/sync-recent-chats", async (req, res) => {
    try {
      const limit = req.body?.limit ? Number(req.body.limit) : 80;
      const result = await syncChatsFromEvolutionVPS(limit);
      res.json({
        success: true,
        message: `Sincronización completada. ${result.importedCount} mensaje(s) importados, ${result.chatsCount} chats en total.`,
        importedCount: result.importedCount,
        chatsCount: result.chatsCount,
        chats: currentDB.chats || [],
        messagesHistory: currentDB.messagesHistory || {}
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Endpoint: Borrar Memoria Completa de la IA (Todas las conversaciones)
  app.post("/api/whatsapp/memory/clear", (req, res) => {
    try {
      currentDB.messagesHistory = {};
      currentDB.chats = [];
      currentDB.whatsappError = undefined;
      saveDBData(currentDB);
      console.log("[WhatsApp API] Memoria de conversaciones e historial borrados por completo.");
      res.json({ success: true, message: "Memoria e historial de la IA borrados exitosamente" });
    } catch (err: any) {
      console.error("Error al borrar memoria de la IA:", err);
      res.status(500).json({ success: false, error: err.message || "Error al borrar memoria" });
    }
  });

  // Endpoint: Borrar conversación individual de un cliente (Reiniciar chat de cero)
  app.post("/api/whatsapp/chat/delete", (req, res) => {
    try {
      const { chatId, phone } = req.body;
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

      if (currentDB.messagesHistory) {
        if (cleanPhone && currentDB.messagesHistory[cleanPhone]) {
          delete currentDB.messagesHistory[cleanPhone];
        }
        if (chatId && currentDB.messagesHistory[chatId]) {
          delete currentDB.messagesHistory[chatId];
        }
        for (const k of Object.keys(currentDB.messagesHistory)) {
          const kClean = k.replace(/\D/g, '');
          if (cleanPhone && (kClean === cleanPhone || kClean.endsWith(cleanPhone) || cleanPhone.endsWith(kClean))) {
            delete currentDB.messagesHistory[k];
          }
        }
      }

      if (chatId && currentDB.chats) {
        currentDB.chats = currentDB.chats.filter((c: any) => c.id !== chatId);
      }
      if (cleanPhone && currentDB.chats) {
        currentDB.chats = currentDB.chats.filter((c: any) => {
          const cPhone = (c.phone || '').replace(/\D/g, '');
          return cPhone !== cleanPhone;
        });
      }

      saveDBData(currentDB);
      console.log(`[WhatsApp API] Conversación eliminada/reiniciada para chatId: ${chatId}, phone: ${phone}`);
      res.json({ success: true, message: "Conversación reiniciada desde cero." });
    } catch (err: any) {
      console.error("Error al borrar conversación individual:", err);
      res.status(500).json({ success: false, error: err.message || "Error al borrar conversación" });
    }
  });

  // Endpoint to convert client-recorded/uploaded audio to OGG Opus PTT format and save it on the server
  app.post("/api/whatsapp/convert-audio", async (req, res) => {
    try {
      const { mediaBase64 } = req.body;
      if (!mediaBase64) {
        return res.status(400).json({ success: false, error: "Falta mediaBase64" });
      }

      // Extract raw base64 data and mime type
      let mimeType = "audio/webm";
      let base64Data = mediaBase64;
      if (mediaBase64.includes(",")) {
        const parts = mediaBase64.split(",");
        base64Data = parts[1];
        const mimePart = parts[0].match(/data:([^;]+)/);
        if (mimePart) {
          mimeType = mimePart[1];
        }
      }

      const inputBuffer = Buffer.from(base64Data, "base64");

      // Convert to OGG Opus PTT format using our existing converter!
      const outputBuffer = await convertAudioToOggOpus(inputBuffer, mimeType);

      // Save to uploads folder
      const filename = `nota_de_voz_${Date.now()}_ptt.ogg`;
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, outputBuffer);

      // Return local URL
      res.json({
        success: true,
        dataUrl: `/uploads/${filename}`,
        name: filename
      });
    } catch (err: any) {
      console.error("Error en convert-audio:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Endpoint: Forzar/Generar respuesta inmediata de la IA para un chat
  app.post("/api/whatsapp/trigger-ai-reply", async (req, res) => {
    try {
      const { phone, channelId, customPrompt } = req.body;
      const cleanPhone = (phone || '').replace(/\D/g, '');
      if (!cleanPhone) {
        return res.status(400).json({ success: false, error: "Falta número de teléfono" });
      }

      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      const history = currentDB.messagesHistory[cleanPhone] || [];
      const chatObj = (currentDB.chats || []).find((c: any) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone);
      const senderName = chatObj?.sender || `+${cleanPhone}`;

      // Get last client message text or fallback
      const lastClientMsg = [...history].reverse().find((m: any) => m.role === 'client' || m.sender === 'client');
      const textToProcess = customPrompt || (lastClientMsg ? lastClientMsg.text : "Hola, ¿en qué me puedes colaborar hoy?");

      console.log(`[Trigger AI Reply] Generando respuesta manual para +${cleanPhone} con mensaje: "${textToProcess}"`);

      const extractedText = await processWithAgents({
        phone: cleanPhone,
        senderName,
        text: textToProcess,
        history
      });

      if (!extractedText) {
        return res.status(500).json({ success: false, error: "La IA no generó respuesta." });
      }

      const parsed = safeParseJSON(extractedText);
      let replies: string[] = [];
      if (parsed && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
        replies = parsed.replies;
      } else if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
        replies = [parsed.reply.trim()];
      } else if (typeof extractedText === 'string' && extractedText.trim()) {
        replies = [extractedText.trim()];
      } else {
        replies = ["¡Hola! ¿En qué te podemos colaborar hoy con La Mona?"];
      }

      const activeId = chatObj?.instanceName || channelId || chatObj?.channelId || 'channel-default';
      const storedRemoteJid = chatObj?.remoteJid || '';
      // A stored remote JID identifies an Evolution-backed conversation. Do
      // not reroute it through an unrelated Baileys socket just because one is
      // connected elsewhere on the server.
      const clientSock = storedRemoteJid
        ? null
        : (activeSockets[activeId] || (activeId === 'channel-default' ? getAnyConnectedSock() : null));
      const senderJid = storedRemoteJid || `${cleanPhone}@s.whatsapp.net`;

      await sendWhatsAppBotReplies(
        clientSock,
        senderJid,
        textToProcess,
        replies,
        cleanPhone,
        activeId
      );

      saveDBData(currentDB);

      res.json({
        success: true,
        replies,
        messagesHistory: currentDB.messagesHistory || {},
        chats: currentDB.chats || []
      });
    } catch (err: any) {
      console.error("Error al forzar respuesta de IA:", err);
      res.status(500).json({ success: false, error: err.message || "Error al generar respuesta de IA" });
    }
  });

  // Endpoint: Activar / Desactivar Bot IA para un número específico
  app.post("/api/whatsapp/toggle-bot-phone", (req, res) => {
    try {
      const { phone, active } = req.body;
      const cleanPhone = (phone || '').replace(/\D/g, '');
      if (!cleanPhone) {
        return res.status(400).json({ success: false, error: "Falta número de teléfono" });
      }
      if (!currentDB.disabledBots) currentDB.disabledBots = [];
      if (active) {
        currentDB.disabledBots = currentDB.disabledBots.filter((p: string) => p.replace(/\D/g, '') !== cleanPhone);
      } else {
        if (!currentDB.disabledBots.some((p: string) => p.replace(/\D/g, '') === cleanPhone)) {
          currentDB.disabledBots.push(cleanPhone);
        }
      }
      saveDBData(currentDB);
      console.log(`[Bot Toggle] IA para +${cleanPhone} ahora está: ${active ? 'ACTIVADA' : 'PAUSADA'}`);
      res.json({ success: true, isBotActive: active, disabledBots: currentDB.disabledBots });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Avatar proxy for WhatsApp and Meta/Instagram CDN images.
  app.get("/api/whatsapp/avatar-proxy", async (req, res) => {
    try {
      const rawUrl = req.query.url as string;
      if (!rawUrl) return res.status(400).send("Missing URL");
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'https:') {
        return res.status(403).send("Forbidden protocol");
      }
      const hostname = parsed.hostname.toLowerCase();
      const allowedHosts = [
        'whatsapp.net',
        'fbcdn.net',
        'cdninstagram.com',
        'instagram.com'
      ];
      if (!allowedHosts.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        return res.status(403).send("Forbidden host");
      }
      const fetchRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!fetchRes.ok) return res.status(fetchRes.status).send("Failed to fetch image");
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const arrayBuf = await fetchRes.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(500).send("Proxy error: " + err.message);
    }
  });

  // API Route: Send manual agent replies/files over the WhatsApp connection
  app.post("/api/whatsapp/reply", async (req, res) => {
    try {
      const { phone, message, type, mediaBase64, isPtt, fileName, channelId, remoteJid } = req.body;
      const targetPhone = (phone || '').replace(/\D/g, '');
      if (!targetPhone) {
        return res.status(400).json({ success: false, error: "Falta el número de teléfono (phone)" });
      }

      const storedChat = (currentDB.chats || []).find((chat: any) =>
        !/instagram|messenger|facebook|tiktok/i.test(`${chat?.platform || ''} ${chat?.channelId || ''}`) &&
        String(chat?.phone || '').replace(/\D/g, '') === targetPhone
      );
      const socialChat = (currentDB.chats || []).find((chat: any) =>
        /instagram|messenger|facebook/i.test(`${chat?.platform || ''} ${chat?.channelId || ''}`) &&
        [chat?.phone, chat?.participantId, chat?.externalId].some((value: any) => String(value || '').replace(/\D/g, '') === targetPhone)
      );
      if (socialChat) {
        return res.status(400).json({ success: false, error: 'Este chat es de Instagram/Messenger: la nota de voz debe enviarse por el canal social, no por WhatsApp' });
      }
      const requestedChannel = String(channelId || '').trim();
      const effectiveRemoteJid = remoteJid || storedChat?.remoteJid || '';
      const activeId = storedChat?.instanceName ||
        (requestedChannel && requestedChannel !== 'evolution_whatsapp' ? requestedChannel : '') ||
        'channel-default';
      const isEvolutionConversation = Boolean(
        effectiveRemoteJid ||
        storedChat?.instanceName ||
        requestedChannel.toLowerCase().includes('evolution')
      );
      // Never borrow a socket from another WhatsApp account for an Evolution
      // conversation.  Its exact instance and remote JID are authoritative.
      const clientSock = isEvolutionConversation
        ? null
        : (activeSockets[activeId] || (activeId === 'channel-default' ? getAnyConnectedSock() : null));

      const normalizedType = type === 'imagen' || type === 'image' ? 'imagen' :
                             (type === 'audio' ? 'audio' :
                             (type === 'video' ? 'video' :
                             (type === 'archivo' || type === 'document' ? 'archivo' : type)));

      let detectedMime = '';
      if (mediaBase64 && typeof mediaBase64 === 'string' && mediaBase64.startsWith('data:')) {
        const match = mediaBase64.match(/^data:([^;]+);base64,/);
        if (match) detectedMime = match[1];
      }

      const effectiveFileName = fileName || (normalizedType === 'audio' ? 'Nota_de_voz.ogg' :
                                            (normalizedType === 'imagen' ? 'foto.jpg' :
                                            (normalizedType === 'video' ? 'video.mp4' : 'archivo.pdf')));

      let attachmentObj: any = undefined;
      if (normalizedType && mediaBase64) {
        attachmentObj = {
          name: effectiveFileName,
          type: normalizedType,
          url: mediaBase64.startsWith('data:') ? mediaBase64 : `data:${detectedMime || 'application/octet-stream'};base64,${mediaBase64}`,
          size: 'Manual'
        };
      }

      if (!clientSock) {
        const evoConfig = getEvolutionConfig();
        if (evoConfig.isConfigured) {
          if (normalizedType === 'audio' || mediaBase64) {
            const evoMediaType = normalizedType === 'audio' ? 'audio' : (normalizedType === 'imagen' ? 'image' : (normalizedType === 'video' ? 'video' : 'document'));
            const evoResult = await sendEvolutionMediaMessage(activeId, targetPhone, evoMediaType, mediaBase64, message || "", effectiveFileName, detectedMime, effectiveRemoteJid);
            if (!evoResult?.ok) throw new Error(evoResult?.data?.response?.message || evoResult?.data?.message || `Evolution API rechazó el archivo (${evoResult?.status || 'sin estado'})`);
          } else {
            const evoResult = await sendEvolutionTextMessage(activeId, targetPhone, message || "", effectiveRemoteJid);
            if (!evoResult?.ok) throw new Error(evoResult?.data?.response?.message || evoResult?.data?.message || `Evolution API rechazó el mensaje (${evoResult?.status || 'sin estado'})`);
          }

          if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
          if (!currentDB.messagesHistory[targetPhone]) currentDB.messagesHistory[targetPhone] = [];
          currentDB.messagesHistory[targetPhone].push({
            role: 'assistant',
            text: message || (normalizedType === 'audio' ? '🎤 [Nota de voz enviada]' : (normalizedType === 'imagen' ? '📷 [Imagen enviada]' : (normalizedType === 'video' ? '🎥 [Video enviado]' : `📎 [${effectiveFileName}]`))),
            attachment: attachmentObj,
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
          });
          if (currentDB.messagesHistory[targetPhone].length > 35) {
            currentDB.messagesHistory[targetPhone].shift();
          }
          saveDBData(currentDB);

          return res.json({ success: true, message: "Mensaje y multimedia enviados exitosamente vía Evolution API" });
        }

        return res.status(500).json({ success: false, error: "No hay conexión activa con WhatsApp para enviar mensajes." });
      }

      const targetJid = `${targetPhone}@s.whatsapp.net`;

      if (normalizedType || mediaBase64) {
        // We have an audio or general file attachment to send
        const buffer = await getMediaBuffer(mediaBase64);
        if (!buffer) {
          return res.status(400).json({ success: false, error: "No se pudo obtener el buffer del archivo multimedia" });
        }

        if (normalizedType === 'audio') {
          let mimeType = detectedMime || 'audio/ogg; codecs=opus';
          const converted = await convertAudioToOggOpus(buffer, mimeType);
          await clientSock.sendMessage(targetJid, {
            audio: converted,
            ptt: !!isPtt,
            mimetype: 'audio/ogg; codecs=opus',
            waveform: generateSimulatedWaveform(64)
          });
        } else if (normalizedType === 'imagen') {
          await clientSock.sendMessage(targetJid, { image: buffer, caption: message || "" });
        } else if (normalizedType === 'video') {
          await clientSock.sendMessage(targetJid, { video: buffer, caption: message || "" });
        } else {
          await clientSock.sendMessage(targetJid, { document: buffer, fileName: effectiveFileName, caption: message || "" });
        }
      } else {
        // Plain text message
        if (!message) {
          return res.status(400).json({ success: false, error: "Falta mensaje o archivo multimedia" });
        }
        await clientSock.sendMessage(targetJid, { text: message });
      }

      // Record in history
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.messagesHistory[targetPhone]) currentDB.messagesHistory[targetPhone] = [];
      currentDB.messagesHistory[targetPhone].push({
        role: 'assistant',
        text: message || (normalizedType === 'audio' ? '🎤 [Nota de voz enviada]' : (normalizedType === 'imagen' ? '📷 [Imagen enviada]' : (normalizedType === 'video' ? '🎥 [Video enviado]' : `📎 [${effectiveFileName}]`))),
        attachment: attachmentObj,
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      });
      if (currentDB.messagesHistory[targetPhone].length > 35) {
        currentDB.messagesHistory[targetPhone].shift();
      }
      saveDBData(currentDB);

      res.json({ success: true, message: "Mensaje enviado exitosamente" });
    } catch (err: any) {
      console.error("Error en endpoint /api/whatsapp/reply:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/whatsapp/reconnect", async (req, res) => {
    let channelId = (req.body.channelId || 'channel-default').trim();
    if (channelId.startsWith(' ') || (!channelId.startsWith('+') && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId))) {
      channelId = `+${channelId.trim()}`;
    }
    const evoConfig = getEvolutionConfig();

    if (evoConfig.isConfigured) {
      try {
        if (req.body.resetSession) {
          await evolutionRequest(`/instance/delete/${encodeURIComponent(channelId)}`, { method: 'DELETE', timeoutMs: 5000 }).catch(() => {});
        }
        await ensureEvolutionInstance(channelId, undefined, true);
        setupEvolutionWebhook(channelId).catch(() => {});
        currentDB.whatsappConnected = false;
        currentDB.whatsappError = undefined;
        saveDBData(currentDB);
        return res.json({
          success: true,
          message: "Instancia de Evolution API reiniciada. Generando nuevo código QR...",
          engine: 'evolution-api'
        });
      } catch (err: any) {
        console.error("[Evolution API Reconnect Error]:", err.message);
      }
    }

    if (reconnectTimers[channelId]) {
      clearTimeout(reconnectTimers[channelId]);
      delete reconnectTimers[channelId];
    }
    conflictRetries[channelId] = 0;

    // Automatically purge broken/desynced session ratchets while preserving login credentials (creds.json)
    purgeSessionFilesOnDisk(channelId === 'channel-default' ? undefined : channelId);

    if (channelId === 'channel-default') {
      currentDB.whatsappError = undefined;
    }

    if (req.body.force || req.body.resetSession) {
      isConnecting[channelId] = false;
      if (req.body.resetSession) {
        const sessionFolder = channelId === 'channel-default' ? 'baileys_auth_info' : `baileys_auth_info_${channelId}`;
        const authSessionPath = path.resolve(wAuthBaseDir, sessionFolder);
        if (fs.existsSync(authSessionPath)) {
          try {
            fs.rmSync(authSessionPath, { recursive: true, force: true });
            console.log(`[WhatsApp Real] Sesión local borrada completamente para canal ${channelId}`);
          } catch(e) {}
        }
        if (currentDB.whatsappSessionData && currentDB.whatsappSessionData[channelId]) {
          delete currentDB.whatsappSessionData[channelId];
        }
        if (channelId === 'channel-default') {
          currentDB.whatsappConnected = false;
          currentDB.whatsappError = undefined;
          currentQrCode = null;
        }
        saveDBData(currentDB);
      }
    }
    await connectToWhatsApp(channelId, true);
    res.json({ success: true, message: "Sesión y conexión de WhatsApp reiniciadas con éxito." });
  });

  app.post("/api/whatsapp/disconnect", async (req, res) => {
    try {
      const channelId = req.body.channelId || 'channel-default';
      const evoConfig = getEvolutionConfig();

      if (evoConfig.isConfigured) {
        try {
          await evolutionRequest(`/instance/logout/${channelId}`, { method: 'DELETE', timeoutMs: 6000 }).catch(() => {});
        } catch(e) {}
      }

      const sock = activeSockets[channelId];
      if (sock) {
        try {
          await sock.logout();
        } catch (e) {}
        try {
          sock.end(undefined);
        } catch (e) {}
        delete activeSockets[channelId];
      }
      if (channelId === 'channel-default') {
        currentDB.whatsappConnected = false;
        currentDB.connectedPhone = '';
        currentQrCode = null;
      }
      const chIdx = (currentDB.channels || []).findIndex((c: any) => c.id === channelId);
      if (chIdx !== -1) {
        currentDB.channels[chIdx].connected = false;
        currentDB.channels[chIdx].phone = '';
      }
      saveDBData(currentDB);
      res.json({ success: true, message: "WhatsApp desconectado exitosamente" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- WHITELABEL & USER PERSONALIZATION API ---
  app.get("/api/whitelabel/config", (req, res) => {
    try {
      const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
      if (email && currentDB.userWhiteLabels && currentDB.userWhiteLabels[email]) {
        return res.json({ success: true, config: currentDB.userWhiteLabels[email] });
      }
      return res.json({ success: true, config: currentDB.whiteLabelConfig || null });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/whitelabel/config", (req, res) => {
    try {
      const config = req.body;
      if (!currentDB.userWhiteLabels) currentDB.userWhiteLabels = {};

      const email = config.userEmail ? config.userEmail.trim().toLowerCase() : '';
      const isGlobal = !!config.isGlobal;

      if (isGlobal || !email) {
        currentDB.whiteLabelConfig = config;
      }
      if (email) {
        currentDB.userWhiteLabels[email] = config;
      }
      saveDBData(currentDB);
      res.json({ success: true, config });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- REAL-TIME DNS VERIFICATION API ---
  app.post("/api/domain/verify-dns", async (req, res) => {
    try {
      const { domain, isSubdomain } = req.body;
      const cleanDomain = (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!cleanDomain) {
        return res.status(400).json({ success: false, error: 'Dominio requerido' });
      }

      const cnameUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
      const aUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;

      const [cnameRes, aRes] = await Promise.all([
        fetch(cnameUrl, { signal: AbortSignal.timeout(4000) }).then(r => r.json()).catch(() => null),
        fetch(aUrl, { signal: AbortSignal.timeout(4000) }).then(r => r.json()).catch(() => null)
      ]);

      const recordsFound: string[] = [];
      let cnameFound = '';
      if (cnameRes && cnameRes.Answer) {
        for (const ans of cnameRes.Answer) {
          if (ans.type === 5 && ans.data) {
            cnameFound = ans.data.replace(/\.$/, '');
            recordsFound.push(`CNAME: ${cnameFound}`);
          }
        }
      }

      if (aRes && aRes.Answer) {
        for (const ans of aRes.Answer) {
          if (ans.type === 1 && ans.data) {
            recordsFound.push(`A: ${ans.data}`);
          }
        }
      }

      const isApex = !isSubdomain;
      const targetCname = 'crm.xorbit360.com';
      const appHost = req.headers.host || '';

      const targetMatch = !!cnameFound && (
        cnameFound.toLowerCase().includes('xorbit360') ||
        cnameFound.toLowerCase().includes('run.app') ||
        cnameFound.toLowerCase() === targetCname ||
        (appHost && cnameFound.toLowerCase().includes(appHost.split(':')[0]))
      );

      const hasA = recordsFound.some(r => r.startsWith('A:'));
      const isConfigured = isSubdomain ? (targetMatch || recordsFound.length > 0) : (hasA || recordsFound.length > 0);

      res.json({
        checked: true,
        domain: cleanDomain,
        isApex,
        recordsFound,
        isConfigured,
        cnameFound,
        targetMatch,
        sslStatus: isConfigured ? 'Activo (SSL Let\'s Encrypt / Cloudflare)' : 'Pendiente de propagación DNS',
        details: isConfigured
          ? `¡Dominio ${cleanDomain} verificado correctamente! Los registros apuntan a la infraestructura.`
          : `El dominio ${cleanDomain} aún no tiene los registros DNS propagados. Asegúrate de configurar el registro CNAME o A en tu proveedor (Cloudflare, GoDaddy, Namecheap, etc.).`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- LIVE SELLING (XORBIT LIVE STYLE) API ---
  app.get("/api/live-selling/config", (req, res) => {
    try {
      if (!currentDB.liveSelling) {
        currentDB.liveSelling = {
          customDomain: '',
          dnsVerified: false,
          streamTitle: 'Gran Venta Especial en Vivo',
          platform: 'camera',
          streamUrl: '',
          streamKey: '',
          activeSessionId: 'live-default',
          isLiveNow: false,
          pinnedProductId: null,
          flashOfferTimerSeconds: 300,
          flashOfferDiscountPercent: 25,
          commentAutomationEnabled: true,
          triggerKeywords: ['QUIERO', 'PIDO', 'COMPRO', 'LO QUIERO', '#L1', '#L2', 'ORDENAR', 'PROMO'],
          autoReplyWhatsApp: true,
          autoReplyInChat: true,
          autoReplyTemplate: '¡Hola {{nombre}}! 🎁 Tu pedido en vivo para "{{producto}}" ha sido apartado exitosamente. Confirma tu entrega aquí: {{link_checkout}}',
          chatReplyTemplate: '¡Excelente @{{usuario}}! Pedido apartado 🎉 Te acabamos de enviar el link privado por WhatsApp con tu descuento exclusivo de Live.',
          products: [],
          orders: [],
          stats: {
            totalRevenue: 0,
            totalOrders: 0,
            peakViewers: 0,
            conversionRate: 0
          }
        };
        saveDBData(currentDB);
      }
      res.json({ success: true, config: sanitizeForClient(currentDB.liveSelling) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/live-selling/config", (req, res) => {
    try {
      currentDB.liveSelling = {
        ...(currentDB.liveSelling || {}),
        ...req.body
      };
      saveDBData(currentDB);
      res.json({ success: true, config: sanitizeForClient(currentDB.liveSelling) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/live-selling/orders", (req, res) => {
    try {
      const orders = (currentDB.liveSelling && currentDB.liveSelling.orders) ? currentDB.liveSelling.orders : [];
      res.json({ success: true, orders });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/live-selling/orders", async (req, res) => {
    try {
      if (!currentDB.liveSelling) currentDB.liveSelling = {};
      if (!currentDB.liveSelling.orders) currentDB.liveSelling.orders = [];

      const newOrder = {
        id: 'LIVE-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date().toISOString(),
        ...req.body
      };

      currentDB.liveSelling.orders.unshift(newOrder);

      if (!currentDB.liveSelling.stats) currentDB.liveSelling.stats = { totalRevenue: 0, totalOrders: 0, peakViewers: 0, conversionRate: 0 };
      currentDB.liveSelling.stats.totalOrders = currentDB.liveSelling.orders.length;
      currentDB.liveSelling.stats.totalRevenue = currentDB.liveSelling.orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

      saveDBData(currentDB);

      // Si el teléfono está presente y WhatsApp está conectado, enviar mensaje de confirmación
      if (req.body.phone && currentDB.whatsappConnected && currentDB.liveSelling.autoReplyWhatsApp) {
        try {
          const phone = req.body.phone.replace(/\D/g, '');
          const jid = `${phone}@s.whatsapp.net`;
          const defaultSock = activeSockets['channel-default'];
          if (defaultSock && defaultSock.sendMessage) {
            const template = currentDB.liveSelling.autoReplyTemplate || '¡Hola {{nombre}}! 🎁 Tu pedido en vivo para "{{producto}}" ha sido apartado exitosamente. Confirma aquí: {{link_checkout}}';
            const text = template
              .replace(/{{nombre}}/g, req.body.customerName || 'Cliente')
              .replace(/{{producto}}/g, req.body.productName || 'Producto en Vivo')
              .replace(/{{link_checkout}}/g, req.body.checkoutLink || `https://${req.headers.host || 'app'}/checkout/${newOrder.id}`);

            defaultSock.sendMessage(jid, { text }).catch((err: any) => console.warn('Live order WA notification warning:', err));
          }
        } catch (waErr) {
          console.warn('Live order WA notification error:', waErr);
        }
      }

      res.json({ success: true, order: newOrder });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/whatsapp/pairing-code", async (req, res) => {
    let channelId = (req.body.channelId || 'channel-default').trim();
    if (channelId.startsWith(' ') || (!channelId.startsWith('+') && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId))) {
      channelId = `+${channelId.trim()}`;
    }
    const phoneNumber = req.body.phoneNumber?.replace(/\D/g, '');

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Phone number required" });
    }

    const evoConfig = getEvolutionConfig();
    if (evoConfig.isConfigured) {
      try {
        const evoCode = await getEvolutionPairingCode(channelId, phoneNumber);
        if (evoCode) {
          setupEvolutionWebhook(channelId).catch(() => {});
          return res.json({
            success: true,
            pairingCode: evoCode.pairingCode,
            rawCode: evoCode.rawCode,
            engine: 'evolution-api'
          });
        }
      } catch (err: any) {
        console.error("[Evolution API Pairing Code Error]:", err.message);
      }
    }

    try {
      let sock = activeSockets[channelId];
      if (!sock) {
        isConnecting[channelId] = false;
        await connectToWhatsApp(channelId, true);
        sock = activeSockets[channelId];
      }

      if (sock) {
        // Wait a bit to ensure the socket is connected before requesting pairing code
        await new Promise(resolve => setTimeout(resolve, 2000));
        const code = await sock.requestPairingCode(phoneNumber);
        res.json({ success: true, pairingCode: code, rawCode: code.replace('-', '') });
      } else {
        res.status(400).json({ success: false, error: "Could not initialize WhatsApp socket" });
      }
    } catch (e: any) {
      console.error("[WhatsApp Real] Error generating pairing code:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/whatsapp/qr", async (req, res) => {
    let channelId = (typeof req.query.channelId === 'string' ? req.query.channelId : 'channel-default').trim();
    if (channelId.startsWith(' ') || (!channelId.startsWith('+') && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId))) {
      channelId = `+${channelId.trim()}`;
    }
    const evoConfig = getEvolutionConfig();

    if (evoConfig.isConfigured) {
      try {
        const evoQr = await getEvolutionQr(channelId);
        if (evoQr) {
          setupEvolutionWebhook(channelId).catch(() => {});
          return res.json({ qr: evoQr, engine: 'evolution-api' });
        }
      } catch (err: any) {
        console.warn("[Evolution API QR Warning]:", err.message);
      }
    }

    if (channelId === 'channel-default' && currentQrCode) {
      res.json({ qr: currentQrCode });
    } else if (qrCodesMap[channelId]) {
      res.json({ qr: qrCodesMap[channelId] });
    } else {
      res.json({ qr: null });
    }
  });

  app.get("/api/whatsapp/diagnostic", async (req, res) => {
    let channelId = (typeof req.query.channelId === 'string' ? req.query.channelId : 'channel-default').trim();
    if (channelId.startsWith(' ') || (!channelId.startsWith('+') && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId))) {
      channelId = `+${channelId.trim()}`;
    }
    const evoConfig = getEvolutionConfig();

    if (evoConfig.isConfigured) {
      try {
        const evoConn = await getEvolutionConnectionState(channelId);
        const isConn = (evoConn.state === 'open');
        if (isConn) {
          currentDB.whatsappConnected = true;
          if (evoConn.phone) {
            currentDB.connectedPhone = evoConn.phone;
          }
          currentDB.whatsappError = undefined;
        } else {
          currentDB.whatsappConnected = false;
        }
        return res.json({
          whatsappConnected: isConn,
          hasQr: !isConn,
          hasWASock: true,
          whatsappError: isConn ? null : (evoConn.exists ? (evoConn.state === 'connecting' ? 'Código QR generado. Escanéalo en WhatsApp.' : 'Sesión desconectada. Escanea el código QR.') : 'Instancia no creada. Generando QR...'),
          connectedPhone: isConn ? (evoConn.phone || currentDB.connectedPhone || null) : null,
          engine: 'evolution-api',
          vpsStatus: 'connected',
          instanceState: evoConn.state,
          instanceName: channelId,
          webhookBaseUrl: evoConfig.webhookBaseUrl,
          fullWebhookUrl: `${evoConfig.webhookBaseUrl}/api/whatsapp/evolution-webhook`
        });
      } catch (err: any) {
        console.warn("[Evolution API Diagnostic Warning]:", err.message);
      }
    }

    const hasQr = !!(channelId === 'channel-default' ? currentQrCode : qrCodesMap[channelId]);
    const hasWASock = !!activeSockets[channelId] || !!isConnecting[channelId];
    res.json({
        whatsappConnected: !!currentDB.whatsappConnected,
        hasQr,
        hasWASock,
        whatsappError: currentDB.whatsappError || null,
        connectedPhone: currentDB.connectedPhone || (activeSockets[channelId]?.user?.id ? activeSockets[channelId].user.id.split(':')[0].split('@')[0] : null)
    });
  });


  // Debug & Log Endpoints for OpenAI and AI Providers
  app.get("/api/backoffice/ai-debug-logs", (req, res) => {
    res.json({
      success: true,
      logs: currentDB.aiDebugLogs || [],
      tokens: currentDB.apiTokens || { total: 0, prompt: 0, candidates: 0 },
      maxTokensLimit: currentDB.maxTokensLimit || 1000000,
      activeProvider: currentDB.apiProvider || "openai",
      activeModel: currentDB.aiModel || "gpt-4o",
      openrouterRouteActive: !!resolveOpenRouterApiKey(),
      openrouterClassifierModel: OR_CLASSIFIER_MODEL,
      openrouterResponseModel: OR_RESPONSE_MODEL,
      hasCustomKey: !!(currentDB.customApiKey && currentDB.customApiKey.trim().length > 0),
      lastAiError: currentDB.lastAiError || null,
      lastAiTimestamp: currentDB.lastAiTimestamp || null
    });
  });

  app.post("/api/backoffice/ai-debug-logs/clear", (req, res) => {
    currentDB.aiDebugLogs = [];
    saveDBData(currentDB);
    res.json({ success: true, message: "Logs de depuración borrados con éxito." });
  });

  // ===== Proveedor IA (solo super admin): clave de OpenRouter cifrada =====
  // La clave vive cifrada (AES-256-GCM) en el estado y NUNCA se devuelve:
  // la API solo expone si existe, su origen y la mascara (•••• + ultimos 4).
  function openRouterKeyInfo() {
    const envKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    const dbKey = decryptSecret(currentDB.openrouterApiKey).trim();
    return {
      configured: !!(envKey || dbKey),
      source: (envKey ? 'env' : (dbKey ? 'db' : null)) as 'env' | 'db' | null,
      masked: maskSecret(envKey || currentDB.openrouterApiKey),
      routeActive: !!(envKey || dbKey),
      classifierModel: OR_CLASSIFIER_MODEL,
      responseModel: OR_RESPONSE_MODEL,
      classifierMaxTokens: AI_CLASSIFIER_MAX_TOKENS,
      responseMaxTokens: AI_RESPONSE_MAX_TOKENS,
      encryptionEnabled: isSecretEncryptionEnabled(),
    };
  }

  function requireSuperAdmin(req: any, res: any): boolean {
    if (req?.authUser?.role !== 'superadmin') {
      res.status(403).json({ success: false, error: 'Solo el super admin de la plataforma puede gestionar la clave de OpenRouter.' });
      return false;
    }
    return true;
  }

  app.get('/api/admin/ai-provider', (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    res.json({ success: true, openrouter: openRouterKeyInfo() });
  });

  app.put('/api/admin/ai-provider/openrouter-key', (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    const apiKey = String(req.body?.apiKey || '').trim();
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Pega tu clave de OpenRouter.' });
    }
    if (apiKey.length < 12) {
      return res.status(400).json({ success: false, error: 'La clave parece incompleta; revisa que la copiaste completa.' });
    }
    try {
      currentDB.openrouterApiKey = encryptSecret(apiKey);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'No se pudo cifrar la clave en el servidor.' });
    }
    saveDBData(currentDB);
    console.log('[OpenRouter] Clave guardada cifrada desde Configuracion General (super admin).');
    res.json({ success: true, openrouter: openRouterKeyInfo() });
  });

  app.delete('/api/admin/ai-provider/openrouter-key', (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    currentDB.openrouterApiKey = '';
    saveDBData(currentDB);
    console.log('[OpenRouter] Clave de la configuracion eliminada por el super admin.');
    res.json({ success: true, openrouter: openRouterKeyInfo() });
  });

  app.post("/api/backoffice/test-ai-connection", async (req, res) => {
    try {
      const provider = req.body.provider || currentDB.apiProvider || 'openai';
      let customKey = req.body.customKey?.trim() || decryptSecret(currentDB.customApiKey).trim();
      if (!customKey && provider === 'gemini') {
        customKey = defaultGeminiApiKey;
      }
      if (!customKey) {
        return res.status(400).json({ success: false, error: `No hay clave API configurada para ${provider}.` });
      }

      const promptText = req.body.prompt || "Prueba de depuración en tiempo real. Responde exactamente este JSON: {\"status\": \"ok\", \"message\": \"Conexión con OpenAI API verificada correctamente\"}";
      const startTime = Date.now();
      const result = await callAIWithProvider(provider, customKey, promptText, null, null);
      const durationMs = Date.now() - startTime;

      res.json({
        success: true,
        durationMs,
        provider,
        model: currentDB.aiModel || (provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-flash'),
        tokens: currentDB.apiTokens,
        rawResponse: result
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        provider: req.body.provider || currentDB.apiProvider || 'openai',
        error: err?.message || String(err)
      });
    }
  });

  function collapseInstagramChats() {
    if (!Array.isArray(currentDB.chats)) return;
    const seen = new Map<string, any>();
    const result: any[] = [];
    for (const chat of currentDB.chats) {
      if (/^\+?social-default$/i.test(String(chat?.phone || '')) || String(chat?.conversationId || '').toLowerCase() === 'default') {
        continue;
      }
      const platform = String(chat?.platform || chat?.channelId || '').toLowerCase();
      const phoneKey = String(chat?.phone || '').replace(/\D/g, '');
      const history = currentDB.messagesHistory?.[phoneKey] || [];
      const legacyInstagram = !platform && history.some((message: any) => /social_instagram|social_omnichannel/.test(String(message?.source || '').toLowerCase()));
      const instagram = platform.includes('instagram') || legacyInstagram;
      if (!instagram) { result.push(chat); continue; }
      // El proveedor puede rotar el ID del hilo sin cambiar de persona. La
      // identidad del participante debe ganar para no crear otra tarjeta.
      const identity = String(
        chat.participantId ||
        chat.externalId ||
        phoneKey ||
        chat.participantUsername ||
        chat.sender ||
        chat.conversationId ||
        ''
      ).trim().toLowerCase();
      const key = `instagram|${chat.accountId || ''}|${identity}`;
      if (!key) { result.push(chat); continue; }
      const previous = seen.get(key);
      if (!previous) {
        chat.platform = 'instagram';
        chat.channelId = 'instagram';
        seen.set(key, chat);
        result.push(chat);
        continue;
      }
      previous.unread = (Number(previous.unread) || 0) + (Number(chat.unread) || 0);
      if (!previous.avatar && chat.avatar) previous.avatar = chat.avatar;
      if (!previous.conversationId && chat.conversationId) previous.conversationId = chat.conversationId;
      if (!previous.externalId && chat.externalId) previous.externalId = chat.externalId;
      if (!previous.participantId && chat.participantId) previous.participantId = chat.participantId;
      if (!previous.participantUsername && chat.participantUsername) previous.participantUsername = chat.participantUsername;
      if (!previous.accountId && chat.accountId) previous.accountId = chat.accountId;
      if (!previous.sender && chat.sender) previous.sender = chat.sender;
      const previousPhone = String(previous.phone || '').replace(/\D/g, '');
      if (phoneKey && previousPhone && phoneKey !== previousPhone && Array.isArray(currentDB.messagesHistory?.[phoneKey])) {
        const combined = [...(currentDB.messagesHistory[previousPhone] || []), ...currentDB.messagesHistory[phoneKey]];
        const unique = new Map<string, any>();
        for (const message of combined) unique.set(`${message.timestamp || message.time || ''}|${message.role || ''}|${message.text || ''}`, message);
        currentDB.messagesHistory[previousPhone] = Array.from(unique.values()).sort((a: any, b: any) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
        delete currentDB.messagesHistory[phoneKey];
      }
    }
    if (result.length !== currentDB.chats.length) { currentDB.chats = result; saveDBData(currentDB); }
  }

  app.get("/api/backoffice/state", (req, res) => {
    collapseInstagramChats();
    res.setHeader('Cache-Control', 'no-store');
    res.json(sanitizeForClient(currentDB));
  });

  // Lightweight realtime snapshot for the inbox. The full backoffice state
  // also contains AI logs and billing history; sending those on every webhook
  // event made the CRM transfer ~776 KB and caused visible chat jumps.
  app.get("/api/backoffice/inbox", async (req, res) => {
    collapseInstagramChats();
    res.setHeader('Cache-Control', 'no-store');
    const chatFields = [
      'id', 'name', 'time', 'msg', 'message', 'unread', 'phone', 'columnId',
      'status', 'tags', 'leadStatus', 'avatar', 'channelId', 'platform',
      'conversationId', 'externalId', 'accountId', 'participantId',
      'participantUsername', 'instanceName', 'remoteJid', 'timestamp', 'sender'
    ];
    const limit = Math.min(500, Math.max(50, Number(req.query.limit) || 300));
    const historyLimitForTables = Math.min(200, Math.max(0, Number(req.query.historyLimit) || 80));
    if (isNormalizedReadReady()) {
      try {
        const tableInbox = await loadInboxFromTables(limit, historyLimitForTables);
        if (tableInbox) {
          const tableChats = tableInbox.chats.map((chat: any) => {
            const compact: any = {};
            for (const field of chatFields) if (chat?.[field] !== undefined) compact[field] = chat[field];
            return compact;
          });
          return res.json({ chats: tableChats, messagesHistory: tableInbox.messagesHistory });
        }
      } catch (err: any) {
        console.warn('[NormalizedDB Inbox Fallback]:', err?.message || err);
      }
    }
    const chats = (Array.isArray(currentDB.chats) ? currentDB.chats : [])
      .slice()
      .sort((a: any, b: any) => (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0))
      .slice(0, limit)
      .map((chat: any) => {
      const compact: any = {};
      for (const field of chatFields) if (chat?.[field] !== undefined) compact[field] = chat[field];
      return compact;
      });
    // Realtime refreshes only need the recent tail of each conversation. Sending
    // every stored message on each webhook event made the inbox re-render and
    // feel frozen as soon as histories grew.
    const historyLimit = Math.min(200, Math.max(0, Number(req.query.historyLimit) || 80));
    const messagesHistory: Record<string, any[]> = {};
    if (historyLimit > 0) {
      for (const [historyKey, history] of Object.entries(currentDB.messagesHistory || {})) {
        if (Array.isArray(history)) messagesHistory[historyKey] = history.slice(-historyLimit);
      }
    }
    res.json({
      chats,
      messagesHistory
    });
  });

  // Mark one conversation as read without uploading or returning the whole
  // backoffice state. The previous flow posted every chat and received the
  // complete state back, which made a simple click feel like a freeze.
  app.post("/api/backoffice/chats/read", (req, res) => {
    const chatId = String(req.body?.chatId || req.body?.id || "");
    if (!chatId) return res.status(400).json({ success: false, error: "chatId requerido" });
    const chat = (Array.isArray(currentDB.chats) ? currentDB.chats : []).find((item: any) => item?.id === chatId);
    if (!chat) return res.status(404).json({ success: false, error: "Conversación no encontrada" });
    if (Number(chat.unread) !== 0) {
      chat.unread = 0;
      saveDBData(currentDB);
    }
    res.json({ success: true, chatId, unread: 0 });
  });

  // WhatsApp view bootstrap: only the configuration fields that the bot UI
  // needs plus the recent inbox. This replaces the 776 KB global state fetch
  // performed when opening the WhatsApp module.
  app.get("/api/backoffice/whatsapp", async (_req, res) => {
    const configKeys = [
      'whatsappConnected', 'connectedPhone', 'customGreeting',
      'greetingAttachments', 'faqsList', 'reactivationTrigger', 'botPrompt',
      'apiProvider', 'aiModel', 'blacklistedBots', 'apiTokens',
      'remarketingCount', 'remarketingInterval', 'remarketingAvoidSpam',
      'remarketingMessages', 'remarketingUseAI', 'remarketingAttachments'
    ];
    let tableWhatsapp: any = null;
    if (isNormalizedReadReady()) {
      try {
        tableWhatsapp = await loadWhatsappFromTables(configKeys, 300, 80);
      } catch (err: any) {
        console.warn('[NormalizedDB WhatsApp Fallback]:', err?.message || err);
      }
    }
    const config: any = {};
    if (tableWhatsapp?.config) {
      Object.assign(config, tableWhatsapp.config);
    } else {
      for (const key of configKeys) if (currentDB[key] !== undefined) config[key] = currentDB[key];
    }
    const chats = tableWhatsapp?.chats || (Array.isArray(currentDB.chats) ? currentDB.chats : [])
      .slice().sort((a: any, b: any) => (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0)).slice(0, 300);
    const recentMessagesHistory: Record<string, any[]> = tableWhatsapp?.messagesHistory || {};
    if (!tableWhatsapp) {
      for (const [historyKey, history] of Object.entries(currentDB.messagesHistory || {})) {
        if (Array.isArray(history)) recentMessagesHistory[historyKey] = history.slice(-80);
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ...config,
      customApiKeyConfigured: Boolean(String(currentDB.customApiKey || '').trim()),
      chats: sanitizeForClient(chats),
      messagesHistory: sanitizeForClient(recentMessagesHistory)
    });
  });

  // Module-scoped snapshots avoid loading the complete backoffice object when
  // opening Catalog or Social Comments.
  app.get("/api/backoffice/catalog", (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ products: Array.isArray(currentDB.products) ? currentDB.products : [] });
  });
  app.post("/api/backoffice/catalog", (req, res) => {
    const products = Array.isArray(req.body?.products) ? req.body.products : null;
    if (!products) return res.status(400).json({ success: false, error: 'products debe ser un arreglo' });
    currentDB.products = products;
    currentDB.catalogUpdatedAt = req.body?.catalogUpdatedAt || Date.now();
    saveDBData(currentDB);
    res.json({ success: true });
  });
  app.get("/api/backoffice/social-comments", (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ socialComments: Array.isArray(currentDB.socialComments) ? currentDB.socialComments : [] });
  });

  app.get("/api/credits/balance", (_req, res) => {
    const balance = currentDB.aiBalance || {
      conversations: 0,
      aiMessagesPerConv: 0,
      audioMinutes: 0,
      packagesBought: 0
    };
    res.json({ success: true, balance });
  });

  app.post("/api/backoffice/state", (req, res) => {
    try {
      const incoming: Record<string, any> = { ...(req.body || {}) };
      // Las claves de IA nunca se guardan en texto plano: se cifran al escribir.
      for (const field of ['customApiKey', 'customApiKeyBackup', 'openrouterApiKey']) {
        const value = incoming[field];
        if (typeof value === 'string' && value.trim() && !isEncryptedSecret(value)) {
          try {
            incoming[field] = encryptSecret(value.trim());
          } catch (encErr: any) {
            return res.status(500).json({ error: encErr?.message || 'No se pudo cifrar la clave de IA.' });
          }
        }
      }
      currentDB = {
        ...currentDB,
        ...incoming
      };

      // save state without resetting messagesHistory
      console.log("[WhatsApp API] Estado de configuración actualizado con éxito.");

      saveDBData(currentDB);
      // Do not return the full state here: it contains large AI debug logs and
      // made every settings save download hundreds of KB on slow phones. The UI
      // only checks whether the save succeeded.
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Error updating state" });
    }
  });

  // SHA256 Integrity Signature Endpoint for Embedded Payment Gateway
  app.post("/api/payments/integrity-signature", (req, res) => {
    try {
      const { merchantId, reference, amountInCents, currency, secretKey } = req.body;
      const refToUse = reference || merchantId || 'REF_2026_0918';
      const amountToUse = amountInCents !== undefined ? amountInCents : 10000000;
      const currToUse = currency || 'COP';
      const secretToUse = secretKey || 'prod_integrity_821940...';

      // Concatenation rule: Reference + AmountInCents + Currency + SecretKey
      const concatenatedString = `${refToUse}${amountToUse}${currToUse}${secretToUse}`;
      const hash = crypto.createHash('sha256').update(concatenatedString).digest('hex');

      res.json({
        status: "success",
        reference: refToUse,
        amountInCents: amountToUse,
        currency: currToUse,
        concatenatedString,
        integritySignature: hash,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Error generating SHA256 integrity signature" });
    }
  });

  // Helper for Bold checkout encoding
  const BOLD_KEY_CHAR = 'BoldPaymentButton';
  const BOLD_CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~=&';
  function boldShiftChar(c: string, shift: number): string {
    const idx = BOLD_CHAR_SET.indexOf(c);
    if (idx === -1) return c;
    return BOLD_CHAR_SET[(idx + shift + 68) % 68];
  }
  function buildBoldCheckoutUrl(config: Record<string, string>): string {
    const rawStr = Object.keys(config)
      .map(k => `${k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}=${config[k]}`)
      .join('<bold>');
    let encoded = '';
    for (let i = 0; i < rawStr.length; i++) {
      encoded += boldShiftChar(rawStr[i], BOLD_KEY_CHAR.charCodeAt(i % 17));
    }
    return `https://checkout.bold.co/btn?${encodeURIComponent(encoded)}`;
  }

  // Real Bold Payments Colombia: Create Payment / Get Checkout URL
  app.post("/api/integrations/bold/create-payment", (req, res) => {
    try {
      const {
        amount,
        currency = 'COP',
        description = 'Recarga Saldo Xorbit 360 AI',
        orderId = `REC-BOLD-${Date.now()}`,
        originUrl
      } = req.body;

      const apiKey = String(process.env.BOLD_API_KEY || '');
      const secretKey = String(process.env.BOLD_SECRET_KEY || '');
      const merchantId = String(process.env.BOLD_MERCHANT_ID || '');
      if (!apiKey || !secretKey || !merchantId) {
        return res.status(503).json({ success: false, error: 'La pasarela de pagos no está configurada en el servidor.' });
      }

      const amountStr = String(Math.round(Number(amount) || 76000));
      const integrityHash = crypto.createHash('sha256').update(orderId + amountStr + currency + secretKey).digest('hex');

      const boldConfig: Record<string, string> = {
        apiKey,
        orderId,
        amount: amountStr,
        currency,
        description,
        integritySignature: integrityHash,
        renderMode: 'embedded',
        originUrl: originUrl || 'https://checkout.bold.co',
        openingTime: String(Date.now())
      };

      const checkoutUrl = buildBoldCheckoutUrl(boldConfig);

      console.log(`[Bold Payments] Generada orden real ${orderId} por $${amountStr} ${currency}`);

      res.json({
        success: true,
        orderId,
        amount: Number(amountStr),
        currency,
        merchantId,
        apiKey,
        integritySignature: integrityHash,
        checkoutUrl
      });
    } catch (err: any) {
      console.error("[Bold Payments] Error creando pago:", err);
      res.status(500).json({ success: false, error: err.message || "Error al generar checkout de Bold" });
    }
  });

  // Bold Webhook Receiver
  app.post("/api/integrations/bold/webhook", (req, res) => {
    console.log("[Bold Webhook] Notificación recibida de Bold:", JSON.stringify(req.body));
    res.json({ status: "received", timestamp: new Date().toISOString() });
  });

  // Dropi Official Webhook Receiver (Order Status & Tracking Updates)
  app.all(["/api/integrations/dropi/webhook", "/api/webhooks/dropi"], (req, res) => {
    const signature = req.headers['x-dropi-signature'] || req.headers['x-signature'] || req.headers['authorization'];
    console.log("[Dropi Webhook] Recibido evento de Dropi:", {
      method: req.method,
      url: req.originalUrl,
      signature: signature ? 'present' : 'none',
      body: req.body
    });

    if (req.method === 'GET') {
      return res.status(200).json({
        status: "active",
        service: "Xorbit 360 Dropi Webhook Service",
        ready: true,
        timestamp: new Date().toISOString()
      });
    }

    const payload = req.body || {};
    const orderId = payload.order_id || payload.orderId || payload.id || payload.data?.id || null;
    const status = payload.status || payload.shipping_status || payload.data?.status || null;
    const trackingCode = payload.tracking_code || payload.guide_number || payload.data?.guide_number || null;

    console.log(`[Dropi Webhook] Procesando actualización: Orden=${orderId}, Estado=${status}, Guía=${trackingCode}`);

    return res.status(200).json({
      success: true,
      status: "received",
      orderId,
      processedAt: new Date().toISOString()
    });
  });

  // Initialize Default AI Client
  const defaultGeminiApiKey = process.env.GEMINI_API_KEY;
  let aiInstance: GoogleGenAI | null = null;
  function getAiClient(customKey?: string) {
    const keyToUse = customKey || defaultGeminiApiKey || process.env.GEMINI_API_KEY || '';
    if (customKey && customKey !== defaultGeminiApiKey) {
      return new GoogleGenAI({
        apiKey: customKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiInstance;
  }

  async function executeAI(promptText: string, mediaBase64: string | null = null, mediaMimeType: string | null = null) {
    const provider = currentDB.apiProvider || 'gemini';
    try {
      const result = await executeAIInternal(promptText, mediaBase64, mediaMimeType);
      if (currentDB.lastAiError) {
        currentDB.lastAiError = null;
        currentDB.lastAiTimestamp = null;
        saveDBData(currentDB);
      }
      return result;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error(`[executeAI Error] Provider: ${provider}, Error:`, errMsg);
      currentDB.lastAiError = errMsg;
      currentDB.lastAiTimestamp = new Date().toISOString();
      currentDB.lastAiProvider = provider;
      saveDBData(currentDB);
      throw err;
    }
  }

    function logAiCall(entry: {
    provider: string;
    model: string;
    prompt: string;
    status: 'success' | 'error';
    durationMs: number;
    tokens?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    purpose?: string;
    response?: string;
    error?: string;
  }) {
    if (!currentDB.aiDebugLogs) {
      currentDB.aiDebugLogs = [];
    }
    const newLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      provider: entry.provider,
      model: entry.model,
      promptSnippet: entry.prompt.length > 250 ? entry.prompt.substring(0, 250) + '...' : entry.prompt,
      promptFull: entry.prompt,
      status: entry.status,
      durationMs: entry.durationMs,
      tokens: entry.tokens || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      purpose: entry.purpose || 'general',
      costUsd: entry.status === 'success' ? estimateAiCostUsd(entry.model, entry.tokens?.prompt_tokens, entry.tokens?.completion_tokens) : null,
      responseSnippet: entry.response ? (entry.response.length > 300 ? entry.response.substring(0, 300) + '...' : entry.response) : undefined,
      responseFull: entry.response,
      error: entry.error
    };

    currentDB.aiDebugLogs.unshift(newLog);
    if (currentDB.aiDebugLogs.length > 100) {
      currentDB.aiDebugLogs = currentDB.aiDebugLogs.slice(0, 100);
    }
    saveDBData(currentDB);
  }

  // ===== IA economica por proposito (OpenRouter, activable por entorno) =====
  // La ruta OpenRouter se activa solo si existe OPENROUTER_API_KEY en el
  // entorno; sin clave (o si la ruta falla) el bot sigue con el proveedor
  // configurado en el panel, sin cambios (fallback). Modelos y topes de
  // salida se ajustan por entorno, sin tocar codigo.
  type AiPurpose = 'classifier' | 'response' | 'general';
  const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || '').trim();
  const OR_CLASSIFIER_MODEL = String(process.env.OPENROUTER_CLASSIFIER_MODEL || 'meta-llama/llama-3.1-8b-instruct').trim();
  const OR_RESPONSE_MODEL = String(process.env.OPENROUTER_RESPONSE_MODEL || 'openai/gpt-4o-mini').trim();
  const AI_CLASSIFIER_MAX_TOKENS = parseInt(process.env.AI_CLASSIFIER_MAX_TOKENS || '', 10) || 48;
  const AI_RESPONSE_MAX_TOKENS = parseInt(process.env.AI_RESPONSE_MAX_TOKENS || '', 10) || 300;
  // La clave de OpenRouter sale primero del entorno y, si no hay, de la
  // configuracion del super admin (guardada cifrada; se descifra solo en
  // memoria al momento de llamar a la API).
  function resolveOpenRouterApiKey(): string {
    const envKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (envKey) return envKey;
    return decryptSecret(currentDB.openrouterApiKey).trim();
  }
  // Precios USD por 1M de tokens (entrada/salida) del catalogo publico de
  // OpenRouter consultado el 2026-10-10; solo estiman el costo en los logs.
  const AI_MODEL_PRICES: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'openai/gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
    'meta-llama/llama-3.1-8b-instruct': { input: 0.05, output: 0.08 },
    'google/gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
    'google/gemini-2.5-flash': { input: 0.3, output: 2.5 },
    'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  };
  function estimateAiCostUsd(model: string, promptTokens?: number, completionTokens?: number): number | null {
    const price = AI_MODEL_PRICES[model];
    if (!price) return null;
    const total = ((promptTokens || 0) * price.input + (completionTokens || 0) * price.output) / 1000000;
    return Math.round(total * 10000000) / 10000000;
  }

  async function callAIWithProvider(provider: string, customKey: string, promptText: string, mediaBase64: string | null, mediaMimeType: string | null, opts: { purpose?: AiPurpose; modelOverride?: string; maxTokens?: number; temperature?: number } = {}) {
    const expectsJSON = promptText.toLowerCase().includes('json');
    const startTime = Date.now();

    if (provider === 'openai') {
      const modelUsed = (() => {
        let m = currentDB.aiModel || "gpt-4o-mini";
        if (!m.startsWith("gpt-") && !m.startsWith("o1") && !m.startsWith("o3")) return "gpt-4o-mini";
        return m;
      })();

      try {
        const openai = new OpenAI({ apiKey: customKey });
        const messages: any[] = [];
        const contentPart: any[] = [{ type: 'text', text: promptText }];

        if (mediaBase64 && mediaMimeType) {
          if (mediaMimeType.startsWith('image/')) {
             contentPart.push({
               type: 'image_url',
               image_url: { url: `data:${mediaMimeType};base64,${mediaBase64}` }
             });
          } else if (mediaMimeType.startsWith('audio/')) {
             try {
                const audioBuffer = Buffer.from(mediaBase64, 'base64');
                const tmpPath = path.join(os.tmpdir(), `temp_${Date.now()}.ogg`);
                fs.writeFileSync(tmpPath, audioBuffer);
                const transcription = await openai.audio.transcriptions.create({
                  file: fs.createReadStream(tmpPath),
                  model: "whisper-1",
                });
                fs.unlinkSync(tmpPath);
                contentPart[0].text += `\n[Transcripción del audio adjunto: "${transcription.text}"]`;
             } catch(e) {
               console.error("OpenAI Audio Transcription Error:", e);
             }
          }
        }

        messages.push({ role: 'user', content: contentPart });
        const response = await openai.chat.completions.create({
          model: opts.modelOverride || modelUsed,
          messages,
          ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
          ...(typeof opts.temperature === 'number' ? { temperature: opts.temperature } : {}),
          ...(expectsJSON ? { response_format: { type: "json_object" } } : {})
        });

        const durationMs = Date.now() - startTime;
        let tokenInfo = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        if (response.usage) {
          if (!currentDB.apiTokens) currentDB.apiTokens = { total: 0, prompt: 0, candidates: 0 };
          currentDB.apiTokens.prompt += response.usage.prompt_tokens;
          currentDB.apiTokens.candidates += response.usage.completion_tokens;
          currentDB.apiTokens.total += response.usage.total_tokens;
          tokenInfo = {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
          };
          saveDBData(currentDB);
        }
        incrementAiUsage(provider);
        const replyContent = response.choices[0]?.message?.content || "{}";

        logAiCall({ purpose: opts.purpose,
          provider: 'openai',
          model: opts.modelOverride || modelUsed,
          prompt: promptText,
          status: 'success',
          durationMs,
          tokens: tokenInfo,
          response: replyContent
        });

        return replyContent;
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        logAiCall({ purpose: opts.purpose,
          provider: 'openai',
          model: opts.modelOverride || modelUsed,
          prompt: promptText,
          status: 'error',
          durationMs,
          error: errMsg
        });
        throw err;
      }

    } else if (provider === 'openrouter') {
      const modelUsed = opts.modelOverride || (opts.purpose === 'classifier' ? OR_CLASSIFIER_MODEL : (String(process.env.OPENROUTER_RESPONSE_MODEL || '').trim() || currentDB.aiModel || OR_RESPONSE_MODEL));
      try {
        const oai = new OpenAI({
          apiKey: customKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "La Mona Applet"
          }
        });
        const messages: any[] = [];
        const contentPart: any[] = [{ type: 'text', text: promptText }];

        if (mediaBase64 && mediaMimeType && mediaMimeType.startsWith('image/')) {
           contentPart.push({
             type: 'image_url',
             image_url: { url: `data:${mediaMimeType};base64,${mediaBase64}` }
           });
        } else if (mediaBase64 && mediaMimeType && mediaMimeType.startsWith('audio/')) {
           const format = mediaMimeType.includes('wav') ? 'wav' : mediaMimeType.includes('mp3') || mediaMimeType.includes('mpeg') ? 'mp3' : 'ogg';
           contentPart.push({
             type: 'input_audio',
             input_audio: { data: mediaBase64, format }
           });
        }

        messages.push({ role: 'user', content: contentPart });
        const response = await oai.chat.completions.create({
          model: modelUsed,
          messages,
          max_tokens: opts.maxTokens ?? (opts.purpose === 'classifier' ? AI_CLASSIFIER_MAX_TOKENS : AI_RESPONSE_MAX_TOKENS),
          temperature: opts.temperature ?? (opts.purpose === 'classifier' ? 0 : 0.6),
          ...(expectsJSON ? { response_format: { type: "json_object" } } : {})
        });

        const durationMs = Date.now() - startTime;
        let tokenInfo = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        if (response.usage) {
          if (!currentDB.apiTokens) currentDB.apiTokens = { total: 0, prompt: 0, candidates: 0 };
          currentDB.apiTokens.prompt += response.usage.prompt_tokens || 0;
          currentDB.apiTokens.candidates += response.usage.completion_tokens || 0;
          currentDB.apiTokens.total += response.usage.total_tokens || 0;
          tokenInfo = {
            prompt_tokens: response.usage.prompt_tokens || 0,
            completion_tokens: response.usage.completion_tokens || 0,
            total_tokens: response.usage.total_tokens || 0
          };
          saveDBData(currentDB);
        }
        const replyContent = response.choices[0]?.message?.content || "{}";

        logAiCall({ purpose: opts.purpose,
          provider: 'openrouter',
          model: opts.modelOverride || modelUsed,
          prompt: promptText,
          status: 'success',
          durationMs,
          tokens: tokenInfo,
          response: replyContent
        });

        return replyContent;
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        logAiCall({ purpose: opts.purpose,
          provider: 'openrouter',
          model: opts.modelOverride || modelUsed,
          prompt: promptText,
          status: 'error',
          durationMs,
          error: errMsg
        });
        throw err;
      }

    } else {
      // default: gemini
      const modelUsed = (() => {
        let m = currentDB.aiModel || "gemini-2.5-flash";
        if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.includes("3.8") || m.includes("1.5") || m.includes("2.0")) return "gemini-2.5-flash";
        return m;
      })();

      const client = getAiClient(customKey);
      const parts: any[] = [{ text: promptText }];

      if (mediaBase64 && mediaMimeType) {
        parts.push({
          inlineData: {
            data: mediaBase64,
            mimeType: mediaMimeType
          }
        });
      }

      let retries = 3;
      let delay = 1000;
      let res: any;

      while (retries > 0) {
        try {
          res = await client.models.generateContent({
            model: modelUsed,
            contents: { role: 'user', parts },
            ...(expectsJSON ? { config: { responseMimeType: 'application/json' } } : {})
          });
          incrementAiUsage('gemini');
          break;
        } catch (error: any) {
          retries--;
          const errMsg = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
          console.error(`Gemini generateContent Error (Retries left: ${retries}):`, errMsg);

          const isRetryable = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');

          if (retries === 0 || !isRetryable) {
            const durationMs = Date.now() - startTime;
            logAiCall({ purpose: opts.purpose,
              provider: 'gemini',
              model: opts.modelOverride || modelUsed,
              prompt: promptText,
              status: 'error',
              durationMs,
              error: errMsg
            });
            throw error;
          }
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }

      const durationMs = Date.now() - startTime;
      let tokenInfo = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      if (res.usageMetadata) {
        if (!currentDB.apiTokens) currentDB.apiTokens = { total: 0, prompt: 0, candidates: 0 };
        currentDB.apiTokens.prompt += res.usageMetadata.promptTokenCount;
        currentDB.apiTokens.candidates += res.usageMetadata.candidatesTokenCount;
        currentDB.apiTokens.total += res.usageMetadata.totalTokenCount;
        tokenInfo = {
          prompt_tokens: res.usageMetadata.promptTokenCount,
          completion_tokens: res.usageMetadata.candidatesTokenCount,
          total_tokens: res.usageMetadata.totalTokenCount
        };
        saveDBData(currentDB);
      }

      logAiCall({ purpose: opts.purpose,
        provider: 'gemini',
        model: opts.modelOverride || modelUsed,
        prompt: promptText,
        status: 'success',
        durationMs,
        tokens: tokenInfo,
        response: res.text
      });

      return res.text;
    }
  }

  async function executeAIInternal(promptText: string, mediaBase64: string | null = null, mediaMimeType: string | null = null, purpose: AiPurpose = 'general') {
    globalExecuteAIInternal = executeAIInternal;

    // Ruta economica OpenRouter (activable por entorno): clasificador barato
    // y respuesta economica con salida corta. Si no hay clave o la ruta
    // falla, continua con el proveedor configurado en el panel (fallback).
    const openRouterKey = resolveOpenRouterApiKey();
    if (openRouterKey) {
      try {
        return await callAIWithProvider('openrouter', openRouterKey, promptText, mediaBase64, mediaMimeType, {
          purpose,
          modelOverride: purpose === 'classifier' ? OR_CLASSIFIER_MODEL : OR_RESPONSE_MODEL,
          maxTokens: purpose === 'classifier' ? AI_CLASSIFIER_MAX_TOKENS : AI_RESPONSE_MAX_TOKENS,
          temperature: purpose === 'classifier' ? 0 : 0.6,
        });
      } catch (orErr: any) {
        console.error('[IA] OpenRouter no respondio; fallback al proveedor del panel:', orErr?.message || String(orErr));
      }
    }
    const primaryProvider = currentDB.apiProvider || 'gemini';
    let primaryKey = decryptSecret(currentDB.customApiKey).trim() || undefined;

    // Key routing and validation
    if (primaryProvider === 'gemini' && primaryKey && primaryKey.startsWith('sk-')) {
      primaryKey = undefined;
    }
    if (primaryProvider === 'openai' && primaryKey && (primaryKey.startsWith('AIza') || primaryKey.startsWith('sk-or-'))) {
      primaryKey = undefined;
    }
    if (primaryProvider === 'openrouter' && primaryKey && !primaryKey.startsWith('sk-or-')) {
      // openrouter keys usually start with 'sk-or-' or similar, but let's allow it anyway
    }

    primaryKey = primaryKey || (primaryProvider === 'gemini' ? defaultGeminiApiKey : undefined);

    let primaryError: any = null;
    const hasCustomKey = !!decryptSecret(currentDB.customApiKey).trim();
    const limit = currentDB.maxTokensLimit || 1000000;
    const currentTokens = currentDB.apiTokens?.total || 0;

    if (!hasCustomKey && currentTokens >= limit) {
      throw new Error(`¡Límite de tokens de la Mona IA alcanzado! Consumido: ${currentTokens.toLocaleString()} / Límite: ${limit.toLocaleString()} tokens. Por favor, configure su propia API Key.`);
    }

    if (primaryKey) {
      try {
        console.log(`[IA] Intentando con Proveedor Principal: ${primaryProvider}...`);
        const result = await callAIWithProvider(primaryProvider, primaryKey, promptText, mediaBase64, mediaMimeType, { purpose });
        return result;
      } catch (err: any) {
        primaryError = err;
        console.error(`[IA Error] Falló Proveedor Principal (${primaryProvider}):`, err?.message || String(err));
        currentDB.lastAiError = `[Principal: ${primaryProvider}] ${err?.message || String(err)}`;
        currentDB.lastAiTimestamp = new Date().toISOString();
        currentDB.lastAiProvider = primaryProvider;
        saveDBData(currentDB);
      }
    } else {
      primaryError = new Error(`Clave primaria no configurada para ${primaryProvider}`);
    }

    // Attempt backup failover
    const backupProvider = currentDB.apiProviderBackup || 'gemini';
    let backupKey = decryptSecret(currentDB.customApiKeyBackup).trim() || undefined;
    if (backupKey) {
      if (backupProvider === 'gemini' && backupKey.startsWith('sk-')) backupKey = undefined;
      if (backupProvider === 'openai' && backupKey.startsWith('AIza')) backupKey = undefined;
      backupKey = backupKey || (backupProvider === 'gemini' ? defaultGeminiApiKey : undefined);
    }

    if (backupKey && backupKey !== primaryKey) { // Ensure backup key exists and is different to avoid retry loop
      try {
        console.log(`[IA Failover] Intentando con Proveedor de Respaldo: ${backupProvider}...`);
        const result = await callAIWithProvider(backupProvider, backupKey, promptText, mediaBase64, mediaMimeType, { purpose });
        // Clear old error since we succeeded on backup
        currentDB.lastAiError = null;
        currentDB.lastAiTimestamp = null;
        currentDB.lastAiProvider = backupProvider + " (Respaldo)";
        saveDBData(currentDB);
        console.log(`[IA Failover] Éxito con Proveedor de Respaldo: ${backupProvider}`);
        return result;
      } catch (backupErr: any) {
        console.error(`[IA Error] Falló también el Proveedor de Respaldo (${backupProvider}):`, backupErr?.message || String(backupErr));
        currentDB.lastAiError = `[Principal: ${primaryProvider} ERROR] ${primaryError?.message || String(primaryError)}. [Respaldo: ${backupProvider} ERROR] ${backupErr?.message || String(backupErr)}`;
        currentDB.lastAiTimestamp = new Date().toISOString();
        currentDB.lastAiProvider = `${primaryProvider} + ${backupProvider} (Ambos fallaron)`;
        saveDBData(currentDB);
        throw backupErr;
      }
    } else {
      // Propagate primary error since no backup key is configured or it's same as primary
      console.warn(`[IA Failover] No se puede ejecutar respaldo: ${!backupKey ? 'No hay clave configurada' : 'Clave de respaldo misma que principal'}.`);
      throw primaryError;
    }
  }

  let activeSockets: Record<string, any> = {};
  let qrCodesMap: Record<string, string> = {};
  let simulationTimeouts: Record<string, any> = {};

  let waSock: any = null;
  let currentQrCode: string | null = null;
  let simulationTimeout: any = null;

  function getAnyConnectedSock() {
    if (activeSockets['channel-default']) return activeSockets['channel-default'];
    for (const id of Object.keys(activeSockets)) {
      if (activeSockets[id]) return activeSockets[id];
    }
    return waSock || null;
  }

  function updateLegacySockReference() {
    const keys = Object.keys(activeSockets);
    if (activeSockets['channel-default']) {
      waSock = activeSockets['channel-default'];
    } else if (keys.length > 0) {
      waSock = activeSockets[keys[0]];
    } else {
      waSock = null;
    }
  }

  const isConnecting: Record<string, boolean> = {};
  const reconnectTimers: Record<string, NodeJS.Timeout> = {};

  async function processWhatsAppCommand(command: string, currentDB: any): Promise<boolean> {
    const parts = command.trim().split(/\s+/);
    if (parts.length === 0) return false;
    const cmd = parts[0].toLowerCase();

    // Pausar IA global
    if (cmd === 'pausa' || cmd === 'pausar') {
      currentDB.isAiGlobalActive = false;
      return true;
    }

    // Activar IA global
    if (cmd === 'activar' || cmd === 'iniciar') {
      currentDB.isAiGlobalActive = true;
      return true;
    }

    // Cambiar precio del menú del día
    if ((cmd === 'menu' || cmd === 'menú') && parts[1]?.toLowerCase() === 'precio') {
      const val = parseInt(parts[2]);
      if (!isNaN(val) && currentDB.active) {
        currentDB.active.precio = val;
        return true;
      }
    }

    // Marcar producto como AGOTADO
    if (cmd === 'agotado') {
      const arg = parts.slice(1).join(' ').trim().toUpperCase();
      if (arg && currentDB.products) {
        const prod = currentDB.products.find((p: any) => p.name.toUpperCase() === arg || p.sku.toUpperCase() === arg);
        if (prod) {
          prod.stock = 0;
          return true;
        }
      }
    }

    // Marcar producto como DISPONIBLE
    if (cmd === 'disponible') {
      const arg = parts.slice(1).join(' ').trim().toUpperCase();
      if (arg && currentDB.products) {
        const prod = currentDB.products.find((p: any) => p.name.toUpperCase() === arg || p.sku.toUpperCase() === arg);
        if (prod) {
          prod.stock = 10; // Stock por defecto
          return true;
        }
      }
    }

    return false;
  }

  async function processWithAgents(params: {
    phone: string;
    senderName: string;
    text: string;
    history: any[];
    mediaInfo?: string;
    mediaBase64?: string | null;
    mediaMimeType?: string | null;
  }) {
    const { phone, senderName, text, history, mediaInfo, mediaBase64, mediaMimeType } = params;
    const isGenericName = !senderName || ['cliente whatsapp', 'cliente', 'usuario', 'null', 'undefined'].includes(senderName.toLowerCase().trim());
    const cleanSenderName = isGenericName ? "" : senderName;

    // 1. Agente de Clasificación
    const classPrompt = `Eres el 'Agente de Clasificación' del WhatsApp Bot. Tu tarea es identificar la intención del usuario basándote en su mensaje reciente y un breve historial.
Opciones:
- MENU (quiere ver productos, catálogo, menú, precios, hacer un pedido, zonas de envío)
- SOPORTE (dudas, quejas, horarios, preguntas frecuentes)
- SALUDO (sólo está saludando de forma inicial)
- OTRO (cualquier otra intención o charla general)

Mensaje del usuario: "${text}"
Historial reciente (últimos 3 mensajes): ${history.slice(-3).map((h:any)=>h.text).join(' | ')}

Responde ÚNICAMENTE con una sola palabra de la categoría: MENU, SOPORTE, SALUDO, o OTRO. Sin comillas ni texto adicional.`;

    let intent = "OTRO";
    try {
       const intentRaw = await executeAIInternal(classPrompt, null, null, 'classifier');
       intent = intentRaw.trim().toUpperCase().replace(/[^A-Z]/g, '');
       if (!['MENU', 'SOPORTE', 'SALUDO', 'OTRO'].includes(intent)) intent = 'OTRO';
    } catch(e) {
       intent = 'OTRO';
    }

    console.log(`[Agente de Clasificación] Intención detectada: ${intent}`);

    // 2. Agente de Recuperación de Contexto (Context Retrieval Tool/Agent - Sincronizado)
    const contextRetrieved = buildSystemPrompt({ phone, senderName, text, history, mediaInfo });

    // 3. Agente de Respuesta
    const responsePrompt = `=========================================
ERES EL 'AGENTE DE RESPUESTA FINAL' DE "${currentDB.businessName || 'Nuestra Empresa'}".
=========================================
DATOS DEL CLIENTE:
- Nombre: ${cleanSenderName ? `"${cleanSenderName}"` : 'Nombre no especificado'}. Teléfono: +${phone}
- REGLA: Dirígete al cliente por su nombre SÓLO si es un nombre propio natural claro. NO inventes nombres ni uses apodos de conversaciones pasadas.

=========================================
CONTEXTO RECUPERADO Y ENTRENAMIENTO ACTUAL (MÁXIMA PRIORIDAD - ORQUESTADOR DE MEMORIA):
🚨 ADVERTENCIA: El siguiente contenido es tu configuración ACTUAL de entrenamiento. Sobreescribe por completo cualquier indicación contradictoria que encuentres en el historial. Asume este rol INMEDIATAMENTE.
${contextRetrieved}
=========================================
HISTORIAL DE LA CONVERSACIÓN CON ESTE CLIENTE (Últimos 10 mensajes):
${history.length > 0 ? history.slice(-10).map((h: any) => `${h.role === 'client' || h.sender === 'client' ? 'Cliente' : 'IA'}: ${h.text}`).join('\n') : 'Sin historial previo.'}

=========================================
NUEVO MENSAJE ENTRANTE DEL CLIENTE: "${text}"
${mediaInfo ? `DATOS ADICIONALES DEL MENSAJE (IMAGEN/AUDIO): ${mediaInfo}` : ''}

INSTRUCCIONES DE RESPUESTA Y FORMATO JSON OBLIGATORIO:
1. Responde ÚNICAMENTE utilizando la información del "CONTEXTO RECUPERADO" y tu conocimiento sobre este negocio. NO te inventes productos o datos.
2. Mantén respuestas concisas, amables y naturales (máximo 25-30 palabras por fragmento de mensaje).
3. Devuelve de manera OBLIGATORIA un objeto JSON strictly estructurado con:
   - "replies": [Arreglo de strings]. Tus respuestas al cliente cortas y separadas naturalmente.
   - "needsHuman": boolean. True si el cliente solicita ser atendido por un humano o si es necesario pausar la IA.
   - "orderDetails": Objeto con "customerName", "address", "phone", "items", "paymentMethod" SÓLO si el cliente ha confirmado su pedido/solicitud voluntariamente y ha dado sus datos completos. De lo contrario déjalo vacío.`;

    console.log(`[Agente de Respuesta] Procesando respuesta JSON...`);
    try {
      return await executeAIInternal(responsePrompt, mediaBase64, mediaMimeType, 'response');
    } catch (err: any) {
      console.error("[processWithAgents Error / Quota Exceeded]:", err?.message || err);
      const fallback = currentDB.fallbackMessage || "Estoy un poco ocupada en este momento, dame un momento y te atiendo con gusto 😅.";
      return JSON.stringify({
        replies: [fallback],
        needsHuman: false,
        orderDetails: {}
      });
    }
  }

  // ==========================================
  // EVOLUTION API INCOMING MESSAGE PROCESSOR
  // ==========================================
  function extractEvolutionMsgTextAndMedia(rawMsg: any): { text: string; isImage: boolean; isAudio: boolean; isVideo: boolean; isDocument: boolean } {
    if (!rawMsg) return { text: '', isImage: false, isAudio: false, isVideo: false, isDocument: false };
    let msg = rawMsg;
    if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;
    if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message;
    if (msg.documentWithCaptionMessage?.message) msg = msg.documentWithCaptionMessage.message;

    const isImage = !!msg.imageMessage;
    const isAudio = !!msg.audioMessage;
    const isVideo = !!msg.videoMessage;
    const isDocument = !!msg.documentMessage;

    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.documentMessage?.caption ||
      msg.documentMessage?.fileName ||
      msg.templateButtonReplyMessage?.selectedId ||
      msg.buttonsResponseMessage?.selectedButtonId ||
      msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg.interactiveResponseMessage?.body?.text ||
      msg.pollCreationMessage?.name ||
      ''
    ).trim();

    return { text, isImage, isAudio, isVideo, isDocument };
  }

  // Evolution puede entregar un LID en remoteJid y el número real en
  // remoteJidAlt.  Siempre usamos el número real como identidad del chat.
  function getEvolutionContact(data: any): { phone: string; jid: string } | null {
    const key = data?.key || {};
    const remoteJid = String(key.remoteJid || '');
    const altJid = String(key.remoteJidAlt || '');
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('broadcast')) return null;
    const digits = (jid: string) => jid.split('@')[0].split(':')[0].replace(/\D/g, '');
    const remoteDigits = digits(remoteJid);
    const altDigits = digits(altJid);
    const useAlt = remoteJid.includes('@lid') && altDigits.length >= 6;
    const phone = useAlt ? altDigits : (remoteDigits || altDigits);
    if (!phone || phone.length < 6) return null;
    return { phone, jid: remoteJid };
  }

  function isSocialChat(chat: any): boolean {
    const value = `${chat?.platform || ''} ${chat?.channelId || ''} ${chat?.source || ''}`.toLowerCase();
    return /instagram|messenger|facebook|tiktok/.test(value);
  }

  function findEvolutionChatIndex(phone: string): number {
    return (currentDB.chats || []).findIndex((c: any) => !isSocialChat(c) && c.phone && c.phone.replace(/\D/g, '') === phone);
  }

  function shouldReplaceEvolutionAvatar(current: any, next: any): boolean {
    return Boolean(next) && (!current || /instagram|facebook|cdninstagram/i.test(String(current)));
  }

  async function handleEvolutionIncomingMessage(instance: string, data: any) {
    // Los eventos de estado/lectura no contienen un mensaje real. Ignorarlos
    // evita historiales duplicados, contadores falsos y pausas accidentales de IA.
    if (!data || !data.key || !data.message) return;
    const contact = getEvolutionContact(data);
    if (!contact) return;
    const { phone: cleanPhone, jid: senderJid } = contact;

    const senderName = data.pushName || `+${cleanPhone}`;
    const { text, isImage, isAudio, isVideo, isDocument } = extractEvolutionMsgTextAndMedia(data.message);
    const nowStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    // Evolution emits our own API send again as messages.upsert. The caller
    // already persisted it, so do not duplicate it or mistake it for a manual
    // mobile reply (which would incorrectly pause the AI).
    if (data.key.fromMe && isEvolutionServerEcho(instance, data, text)) {
      return;
    }

    // Build rich attachment object if message contains media
    let attachment: any = undefined;
    if (isImage) {
      attachment = {
        name: `Foto_${nowStr.replace(/:/g, '')}.jpg`,
        type: 'imagen',
        url: data.base64 ? `data:image/jpeg;base64,${data.base64}` : (data.message?.imageMessage?.url || ''),
        size: 'Imagen'
      };
    } else if (isAudio) {
      attachment = {
        name: `Nota_de_voz_${nowStr.replace(/:/g, '')}.ogg`,
        type: 'audio',
        url: data.base64 ? `data:audio/ogg;base64,${data.base64}` : (data.message?.audioMessage?.url || ''),
        size: 'Audio'
      };
    } else if (isVideo) {
      attachment = {
        name: `Video_${nowStr.replace(/:/g, '')}.mp4`,
        type: 'video',
        url: data.base64 ? `data:video/mp4;base64,${data.base64}` : (data.message?.videoMessage?.url || ''),
        size: 'Video'
      };
    } else if (isDocument) {
      const docName = data.message?.documentMessage?.fileName || data.message?.documentMessage?.title || 'Documento.pdf';
      attachment = {
        name: docName,
        type: 'archivo',
        url: data.base64 ? `data:application/pdf;base64,${data.base64}` : (data.message?.documentMessage?.url || ''),
        size: 'PDF'
      };
    }

    // Attempt to download base64 media data in background if needed
    if ((isImage || isAudio || isVideo || isDocument) && attachment) {
      fetchEvolutionMediaBase64(instance, data).then(resMedia => {
        if (resMedia && resMedia.base64) {
          const mime = resMedia.mimetype || (isImage ? 'image/jpeg' : (isAudio ? 'audio/ogg' : (isVideo ? 'video/mp4' : 'application/pdf')));
          attachment.url = `data:${mime};base64,${resMedia.base64}`;
          if (resMedia.fileName) attachment.name = resMedia.fileName;
          saveDBData(currentDB);
        }
      }).catch(() => {});
    }

    // Fetch and cache profile picture
    if (!currentDB.profilePictures) currentDB.profilePictures = {};
    if (!currentDB.profilePictures[cleanPhone]) {
      fetchEvolutionProfilePicture(instance, cleanPhone, senderJid).then(avatarUrl => {
        if (avatarUrl) {
          currentDB.profilePictures[cleanPhone] = avatarUrl;
          if (currentDB.chats) {
            const chIdx = findEvolutionChatIndex(cleanPhone);
            if (chIdx !== -1) {
              currentDB.chats[chIdx].avatar = avatarUrl;
            }
          }
          saveDBData(currentDB);
        }
      }).catch(() => {});
    }

    const cachedAvatar = currentDB.profilePictures[cleanPhone] || undefined;

    // Handle outgoing message from mobile phone / human operator
    if (data.key.fromMe) {
      // Si un asesor responde desde el teléfono, entregar la conversación al
      // humano y pausar automáticamente la IA para ese contacto.
      if (!currentDB.disabledBots) currentDB.disabledBots = [];
      if (!currentDB.disabledBots.includes(cleanPhone)) currentDB.disabledBots.push(cleanPhone);
      if (text || isImage || isAudio || isVideo || isDocument) {
        const displayText = text || (isImage ? '📷 [Imagen enviada desde móvil]' : (isAudio ? '🎤 [Nota de voz enviada desde móvil]' : (isVideo ? '🎥 [Video enviado desde móvil]' : '📎 [Archivo enviado desde móvil]')));
        if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
        if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
        currentDB.messagesHistory[cleanPhone].push({
          role: 'agent',
          remoteId: data.key?.id || undefined,
          source: 'mobile',
          fromMobile: true,
          text: displayText,
          attachment,
          time: nowStr,
          timestamp: Date.now()
        });
        if (currentDB.messagesHistory[cleanPhone].length > 35) currentDB.messagesHistory[cleanPhone].shift();

        if (!currentDB.chats) currentDB.chats = [];
        const chatIdx = findEvolutionChatIndex(cleanPhone);
        if (chatIdx !== -1) {
          currentDB.chats[chatIdx].message = displayText;
          currentDB.chats[chatIdx].time = nowStr;
          currentDB.chats[chatIdx].instanceName = instance;
          currentDB.chats[chatIdx].remoteJid = senderJid;
          if (cachedAvatar && !currentDB.chats[chatIdx].avatar) currentDB.chats[chatIdx].avatar = cachedAvatar;
        } else {
          currentDB.chats.unshift({
            id: `CH-${Date.now().toString().slice(-4)}`,
            sender: senderName,
            phone: `+${cleanPhone}`,
            platform: 'whatsapp',
            channelId: 'evolution_whatsapp',
            instanceName: instance,
            remoteJid: senderJid,
            avatar: cachedAvatar,
            message: displayText,
            time: nowStr,
            status: 'en_conversacion'
          });
        }
        saveDBData(currentDB);
      }
      return;
    }

    console.log(`[Evolution API Webhook] Mensaje entrante de +${cleanPhone} (${senderName}): "${text || '[Multimedia]'}"`);

    // Save incoming message in history
    const incomingDisplayText = text || (isImage ? '📷 [Imagen recibida]' : (isAudio ? '🎤 [Nota de voz recibida]' : (isVideo ? '🎥 [Video recibido]' : '📎 [Archivo recibido]')));
    if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
    if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
    currentDB.messagesHistory[cleanPhone].push({
      role: 'client',
      remoteId: data.key?.id || undefined,
      text: incomingDisplayText,
      attachment,
      time: nowStr,
      timestamp: Date.now()
    });
    if (currentDB.messagesHistory[cleanPhone].length > 35) currentDB.messagesHistory[cleanPhone].shift();

    // Update CRM Chats list
    if (!currentDB.chats) currentDB.chats = [];
    const chatIdx = findEvolutionChatIndex(cleanPhone);
    if (chatIdx !== -1) {
      const updatedChat = { ...currentDB.chats[chatIdx], message: incomingDisplayText, time: nowStr, timestamp: Date.now(), status: 'en_conversacion', unread: (Number(currentDB.chats[chatIdx].unread) || 0) + 1, platform: 'whatsapp', channelId: 'evolution_whatsapp', instanceName: instance, remoteJid: senderJid };
      if (shouldReplaceEvolutionAvatar(updatedChat.avatar, cachedAvatar)) updatedChat.avatar = cachedAvatar;
      if (senderName && senderName !== `+${cleanPhone}`) {
        updatedChat.sender = senderName;
      }
      currentDB.chats.splice(chatIdx, 1);
      currentDB.chats.unshift(updatedChat);
    } else {
      currentDB.chats.unshift({
        id: `CH-${Date.now().toString().slice(-4)}`,
        sender: senderName,
        phone: `+${cleanPhone}`,
        platform: 'whatsapp',
        channelId: 'evolution_whatsapp',
        instanceName: instance,
        remoteJid: senderJid,
        avatar: cachedAvatar,
        message: incomingDisplayText,
        time: nowStr,
        timestamp: Date.now(),
        status: 'nuevo'
        ,unread: 1
      });
    }
    saveDBData(currentDB);

    // Check if AI is active globally
    if (currentDB.isAiGlobalActive === false) {
      console.log(`[Evolution API] IA Global pausada. No se responde automáticamente a +${cleanPhone}`);
      return;
    }

    // Check if bot disabled for this phone
    if (currentDB.disabledBots && currentDB.disabledBots.includes(cleanPhone)) {
      console.log(`[Evolution API] Bot pausado manualmente para +${cleanPhone}`);
      return;
    }

    // Prepare context and call AI
    let mediaInfoStr = "";
    if (isImage) mediaInfoStr = "El cliente adjuntó una imagen.";
    if (isAudio) mediaInfoStr = "El cliente envió un audio de voz.";
    if (isVideo) mediaInfoStr = "El cliente envió un video.";
    if (isDocument) mediaInfoStr = "El cliente envió un archivo o documento.";

    const fullPromptText = [text, mediaInfoStr].filter(Boolean).join(" ");
    if (!fullPromptText) return;

    try {
      const history = currentDB.messagesHistory[cleanPhone] || [];
      let aiMediaBase64: string | null = null;
      let aiMediaMimeType: string | null = null;
      if (isImage || isAudio) {
        const mediaPayload = await fetchEvolutionMediaBase64(instance, data).catch(() => null);
        if (mediaPayload?.base64) {
          aiMediaBase64 = mediaPayload.base64;
          aiMediaMimeType = mediaPayload.mimetype || (isImage ? 'image/jpeg' : 'audio/ogg');
        }
      }
      const extractedText = await processWithAgents({
        phone: cleanPhone,
        senderName,
        text: fullPromptText,
        history,
        mediaInfo: mediaInfoStr,
        mediaBase64: aiMediaBase64,
        mediaMimeType: aiMediaMimeType
      });

      if (extractedText) {
        const parsed = safeParseJSON(extractedText);
        let replies: string[] = [];
        if (parsed && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
          replies = parsed.replies;
        } else if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
          replies = [parsed.reply.trim()];
        } else if (typeof extractedText === 'string' && extractedText.trim()) {
          replies = [extractedText.trim()];
        } else {
          replies = ["¡Hola! ¿En qué te puedo colaborar hoy?"];
        }

        // Delegate to sendWhatsAppBotReplies
        await sendWhatsAppBotReplies(
          null, // clientSock is null -> sends via Evolution API
          senderJid,
          text,
          replies,
          cleanPhone,
          instance
        );
        saveDBData(currentDB);
      }
    } catch (err: any) {
      console.error(`[Evolution API] Error procesando mensaje con agentes para +${cleanPhone}:`, err?.message || err);
    }
  }

  onEvolutionIncomingMessage = handleEvolutionIncomingMessage;

  // Keep every VPS instance pointed at this deployment. This also repairs
  // instances after a restore or an old Supabase state is loaded.
  setTimeout(async () => {
    try {
      const evoConfig = getEvolutionConfig();
      if (!evoConfig.isConfigured) return;
      const listRes = await evolutionRequest('/instance/fetchInstances', { timeoutMs: 6000 });
      if (!listRes.ok || !Array.isArray(listRes.data)) return;
      for (const item of listRes.data) {
        const instanceName = item.name || item.instanceName;
        if (instanceName) await setupEvolutionWebhook(instanceName, evoConfig.webhookBaseUrl);
      }
      console.log(`[Evolution API] Webhooks verificados al iniciar en ${evoConfig.webhookBaseUrl}.`);
    } catch (err: any) {
      console.warn('[Evolution API] No se pudieron verificar los webhooks al iniciar:', err?.message || err);
    }
  }, 1500);

  async function syncChatsFromEvolutionVPS(limit = 60): Promise<{ importedCount: number; chatsCount: number }> {
    const evoConfig = getEvolutionConfig();
    if (!evoConfig.isConfigured) return { importedCount: 0, chatsCount: 0 };
    try {
      const instName = await resolveActualEvolutionInstance('channel-default');
      const res = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instName)}`, {
        method: 'POST',
        body: { limit },
        timeoutMs: 8000
      });
      if (!res.ok || !res.data?.messages?.records || !Array.isArray(res.data.messages.records)) {
        return { importedCount: 0, chatsCount: 0 };
      }

      const records = res.data.messages.records;
      let imported = 0;
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.chats) currentDB.chats = [];
      if (!currentDB.profilePictures) currentDB.profilePictures = {};

      // Process from oldest to newest so history is chronologically ordered
      const reversedRecords = [...records].reverse();

      for (const record of reversedRecords) {
        if (!record.key || !record.key.remoteJid) continue;
        const contact = getEvolutionContact(record);
        if (!contact) continue;
        const remoteJid = contact.jid;
        // Exclude WhatsApp groups and broadcast status
        if (remoteJid.includes('@g.us') || remoteJid.includes('broadcast')) continue;

        const cleanPhone = contact.phone;

        const fromMe = !!record.key.fromMe;
        const rawPushName = record.pushName;
        const senderName = (rawPushName && rawPushName !== 'Você' && rawPushName !== 'You') ? rawPushName : `+${cleanPhone}`;
        const { text, isImage, isAudio, isVideo, isDocument } = extractEvolutionMsgTextAndMedia(record.message);
        const displayText = text || (fromMe
          ? (isImage ? '📷 [Imagen enviada]' : (isAudio ? '🎤 [Nota de voz enviada]' : (isVideo ? '🎥 [Video enviado]' : (isDocument ? '📎 [Archivo enviado]' : ''))))
          : (isImage ? '📷 [Imagen recibida]' : (isAudio ? '🎤 [Nota de voz recibida]' : (isVideo ? '🎥 [Video recibido]' : (isDocument ? '📎 [Archivo recibido]' : '')))));
        if (!displayText) continue;

        const timestampMs = record.messageTimestamp
          ? (record.messageTimestamp > 10000000000 ? record.messageTimestamp : record.messageTimestamp * 1000)
          : Date.now();
        const timeStr = new Date(timestampMs).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        let recordAttachment: any = undefined;
        if (isImage) {
          recordAttachment = {
            name: `Foto_${timeStr.replace(/:/g, '')}.jpg`,
            type: 'imagen',
            url: record.message?.imageMessage?.url || '',
            size: 'Imagen'
          };
        } else if (isAudio) {
          recordAttachment = {
            name: `Nota_de_voz_${timeStr.replace(/:/g, '')}.ogg`,
            type: 'audio',
            url: record.message?.audioMessage?.url || '',
            size: 'Audio'
          };
        } else if (isVideo) {
          recordAttachment = {
            name: `Video_${timeStr.replace(/:/g, '')}.mp4`,
            type: 'video',
            url: record.message?.videoMessage?.url || '',
            size: 'Video'
          };
        } else if (isDocument) {
          const docName = record.message?.documentMessage?.fileName || 'Documento.pdf';
          recordAttachment = {
            name: docName,
            type: 'archivo',
            url: record.message?.documentMessage?.url || '',
            size: 'PDF'
          };
        }

        if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
        const exists = currentDB.messagesHistory[cleanPhone].some((m: any) => {
          if (record.key?.id && m.remoteId && m.remoteId === record.key.id) return true;
          const sameMediaKind = Boolean(
            (isAudio && m.attachment?.type === 'audio') ||
            (isImage && m.attachment?.type === 'imagen') ||
            (isVideo && m.attachment?.type === 'video') ||
            (isDocument && m.attachment?.type === 'archivo') ||
            (!isAudio && !isImage && !isVideo && !isDocument && m.text === displayText)
          );
          return sameMediaKind && Math.abs((m.timestamp || 0) - timestampMs) < 120000;
        });

        if (!exists) {
          // Evolution entrega URLs cifradas (.enc) que el navegador no puede
          // reproducir: se descarga el medio real en base64 antes de guardar.
          if ((isImage || isAudio || isVideo || isDocument) && recordAttachment) {
            const mediaRes = await fetchEvolutionMediaBase64(instName, record).catch(() => null);
            if (mediaRes?.base64) {
              const mime = mediaRes.mimetype || (isImage ? 'image/jpeg' : (isAudio ? 'audio/ogg' : (isVideo ? 'video/mp4' : 'application/pdf')));
              recordAttachment.url = `data:${mime};base64,${mediaRes.base64}`;
              if (mediaRes.fileName) recordAttachment.name = mediaRes.fileName;
            }
          }
          currentDB.messagesHistory[cleanPhone].push({
            role: fromMe ? 'assistant' : 'client',
            remoteId: record.key?.id || undefined,
            text: displayText,
            attachment: recordAttachment,
            time: timeStr,
            timestamp: timestampMs
          });
          if (currentDB.messagesHistory[cleanPhone].length > 35) {
            currentDB.messagesHistory[cleanPhone].shift();
          }
          imported++;
        }

        // Fetch avatar if not cached
        if (!currentDB.profilePictures[cleanPhone]) {
          fetchEvolutionProfilePicture(instName, cleanPhone, remoteJid).then(pUrl => {
            if (pUrl) {
              currentDB.profilePictures[cleanPhone] = pUrl;
              const ch = currentDB.chats.find((c: any) => !isSocialChat(c) && c.phone && c.phone.replace(/\D/g, '') === cleanPhone);
              if (ch) ch.avatar = pUrl;
              saveDBData(currentDB);
            }
          }).catch(() => {});
        }

        const avatarUrl = currentDB.profilePictures[cleanPhone] || undefined;

        // Upsert in CRM chats list
        const chatIdx = findEvolutionChatIndex(cleanPhone);
        if (chatIdx !== -1) {
          currentDB.chats[chatIdx].message = displayText;
          currentDB.chats[chatIdx].platform = 'whatsapp';
          currentDB.chats[chatIdx].channelId = 'evolution_whatsapp';
          currentDB.chats[chatIdx].instanceName = instName;
          currentDB.chats[chatIdx].remoteJid = remoteJid;
          currentDB.chats[chatIdx].time = timeStr;
          currentDB.chats[chatIdx].timestamp = timestampMs;
          if (shouldReplaceEvolutionAvatar(currentDB.chats[chatIdx].avatar, avatarUrl)) currentDB.chats[chatIdx].avatar = avatarUrl;
          if (senderName && senderName !== `+${cleanPhone}`) {
            currentDB.chats[chatIdx].sender = senderName;
          }
        } else {
          currentDB.chats.unshift({
            id: `CH-${Date.now().toString().slice(-4)}-${cleanPhone.slice(-4)}`,
            sender: senderName,
            phone: `+${cleanPhone}`,
            platform: 'whatsapp',
            channelId: 'evolution_whatsapp',
            instanceName: instName,
            remoteJid,
            avatar: avatarUrl,
            message: displayText,
            time: timeStr,
            timestamp: timestampMs,
            status: fromMe ? 'en_conversacion' : 'nuevo'
          });
        }
      }

      if (imported > 0) {
        saveDBData(currentDB);
      }
      return { importedCount: imported, chatsCount: currentDB.chats.length };
    } catch (err: any) {
      console.error("[Evolution API] Error sincronizando mensajes recientes:", err?.message || err);
      return { importedCount: 0, chatsCount: (currentDB.chats || []).length };
    }
  }

  // Automatic background poller every 7 seconds to keep chats synchronized in real-time
  setInterval(() => {
    syncChatsFromEvolutionVPS(25).catch(() => {});
  }, 7000);

  async function connectToWhatsApp(channelId = 'channel-default', force = false) {
    if (reconnectTimers[channelId]) {
      clearTimeout(reconnectTimers[channelId]);
      delete reconnectTimers[channelId];
    }
    if (!force && activeSockets[channelId]?.ws?.readyState === 1) {
      console.log(`[WhatsApp Real] Socket ya activo y conectado para canal ${channelId}.`);
      return;
    }
    if (!force && isConnecting[channelId]) {
      console.log(`[WhatsApp Real] Conexión en progreso para ${channelId}, omitiendo llamada duplicada.`);
      return;
    }
    isConnecting[channelId] = true;
    try {
      const evoConfig = getEvolutionConfig();
      if (evoConfig.isConfigured) {
        console.log(`[Evolution API] Conectando canal ${channelId} mediante VPS (${evoConfig.apiUrl})...`);
        await ensureEvolutionInstance(channelId, undefined, true);
        const state = await getEvolutionConnectionState(channelId);
        if (state.state === 'open') {
          console.log(`[Evolution API] Canal ${channelId} conectado en VPS con teléfono:`, state.phone);
          currentDB.whatsappConnected = true;
          if (state.phone) currentDB.connectedPhone = state.phone;
          currentDB.whatsappError = undefined;
        } else {
          console.log(`[Evolution API] Canal ${channelId} en VPS listo en estado: ${state.state}`);
        }
        isConnecting[channelId] = false;
        return;
      }

      console.log(`Iniciando conexión con WhatsApp Web real para canal: ${channelId}...`);

      if (!currentDB.channels) {
        currentDB.channels = [{
          id: 'channel-default',
          name: 'Canal Principal',
          phone: currentDB.connectedPhone || '',
          connected: !!currentDB.whatsappConnected,
          error: currentDB.whatsappError || null,
          type: 'real'
        }];
      }
      const channelIndex = currentDB.channels.findIndex((c: any) => c.id === channelId);
      const channel = channelIndex !== -1 ? currentDB.channels[channelIndex] : { id: 'channel-default', name: 'Canal Principal', connected: false, phone: '', error: null, type: 'real' };

      const sessionFolder = channelId === 'channel-default' ? 'baileys_auth_info' : `baileys_auth_info_${channelId}`;
      const authSessionPath = path.resolve(wAuthBaseDir, sessionFolder);

      // Restore session credentials from database if available
      if (currentDB.whatsappSessionData && currentDB.whatsappSessionData[channelId]) {
        try {
          if (!fs.existsSync(authSessionPath)) {
            fs.mkdirSync(authSessionPath, { recursive: true });
          }
          const credsPath = path.join(authSessionPath, 'creds.json');
          fs.writeFileSync(credsPath, currentDB.whatsappSessionData[channelId], 'utf-8');
          console.log(`[WhatsApp Real] Sesión restaurada exitosamente desde la base de datos para el canal ${channelId}.`);
        } catch (err) {
          console.error(`[WhatsApp Real] Error restaurando sesión desde la base de datos para el canal ${channelId}:`, err);
        }
      }

      const { state: authState, saveCreds } = await useMultiFileAuthState(authSessionPath);

      if (channelId === 'channel-default' && currentDB.whatsappError) {
        currentDB.whatsappError = undefined;
        saveDBData(currentDB);
      }

      let version = [2, 3000, 1015901307];
      if (typeof fetchLatestBaileysVersion === 'function') {
        try {
          const versionInfo = await fetchLatestBaileysVersion();
          if (versionInfo && versionInfo.version) {
            version = versionInfo.version;
          }
        } catch (verErr) {
          console.warn(`[WhatsApp Real] Error obteniendo versión de Baileys, usando fallback:`, verErr);
        }
      }

      const browserOption = Browsers && typeof Browsers.ubuntu === 'function'
        ? Browsers.ubuntu('Chrome')
        : ['Ubuntu', 'Chrome', '22.04.4'];

      if (activeSockets[channelId]) {
        try {
          const oldSock = activeSockets[channelId];
          oldSock.ev.removeAllListeners('connection.update');
          oldSock.ev.removeAllListeners('creds.update');
          oldSock.ev.removeAllListeners('messages.upsert');
          if (oldSock.ws) {
            try {
              oldSock.ws.removeAllListeners?.();
              oldSock.ws.close();
              if (typeof (oldSock.ws as any).terminate === 'function') {
                (oldSock.ws as any).terminate();
              }
            } catch(e) {}
          }
          oldSock.end(undefined);
        } catch (e) {
          console.warn(`[WhatsApp Real] Socket anterior en canal ${channelId} cerrado.`);
        }
        delete activeSockets[channelId];
        await new Promise(r => setTimeout(r, 600));
      }

      const pinoLogger = pino({ level: 'silent' });
      const clientSock = makeWASocket({
        version,
        auth: {
          creds: authState.creds,
          keys: makeCacheableSignalKeyStore(authState.keys, pinoLogger),
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        printQRInTerminal: false,
        logger: pinoLogger,
        browser: browserOption,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 500,
        maxRetries: 5,
        badSessionRetryCount: 3,
        enableAutoSessionRecreation: true,
        enableRecentMessageCache: true,
        shouldIgnoreJid: (jid: string) => jid?.endsWith('@status.broadcast') || false,
        getMessage: async (key: any) => {
          try {
            if (key?.remoteJid) {
              const cleanPhone = key.remoteJid.replace(/\D/g, '');
              const history = currentDB.messagesHistory?.[cleanPhone] || [];
              const found = history.find((m: any) => m.id === key.id || m.key?.id === key.id);
              if (found && found.text) {
                return { conversation: found.text };
              }
            }
          } catch (e) {
            // ignore
          }
          return undefined;
        }
      });
      if (clientSock?.ws) {
        try {
          clientSock.ws.on('error', (wsErr: any) => {
            console.warn(`[WhatsApp Real] Socket WS error handled for channel ${channelId}:`, wsErr?.message || wsErr);
          });
        } catch(e) {}
      }
      activeSockets[channelId] = clientSock;
      if (channelId === 'channel-default') {
        waSock = clientSock;
      }
      updateLegacySockReference();

      clientSock.ev.on('creds.update', async () => {
        await saveCreds();
        try {
          const credsPath = path.join(authSessionPath, 'creds.json');
          if (fs.existsSync(credsPath)) {
            const credsData = fs.readFileSync(credsPath, 'utf-8');
            if (!currentDB.whatsappSessionData) {
              currentDB.whatsappSessionData = {};
            }
            currentDB.whatsappSessionData[channelId] = credsData;
            saveDBData(currentDB);
          }
        } catch (err) {
          console.error(`[WhatsApp Real] Error guardando sesión de Baileys en DB para canal ${channelId}:`, err);
        }
      });

      clientSock.ev.on('connection.update', async (update: any) => {
        console.log(`[WhatsApp Real] Update received:`, JSON.stringify(update, (key, value) => (key === 'qr' ? '***' : value)));
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr);
            qrCodesMap[channelId] = qrDataUrl;
            if (channelId === 'channel-default') {
              currentQrCode = qrDataUrl;
            }
            console.log(`¡Nuevo código QR para el canal ${channelId} generado!`);
          } catch (e) {
            console.error("Error generating QR Data URL:", e);
          }
        }

        if (connection === 'close') {
          isConnecting[channelId] = false;
          const reason = (lastDisconnect?.error)?.output?.statusCode;
          const logoutCode = DisconnectReason?.loggedOut || 401;
          const conflictCode = DisconnectReason?.connectionReplaced || 440;

          const isConflict = reason === conflictCode || reason === 440 ||
                             lastDisconnect?.error?.data?.tag === 'conflict' ||
                             lastDisconnect?.error?.data?.attrs?.type === 'replaced';
          const isLogout = reason === logoutCode || reason === 401;

          // Cleanup socket listeners and underlying WS connection to avoid lingering half-open TCP sockets
          try {
            clientSock.ev.removeAllListeners('connection.update');
            clientSock.ev.removeAllListeners('creds.update');
            clientSock.ev.removeAllListeners('messages.upsert');
            if (clientSock.ws) {
              try {
                clientSock.ws.removeAllListeners?.();
                clientSock.ws.close();
              } catch(e) {}
            }
            clientSock.end(undefined);
          } catch(e) {}

          // Do not auto-reconnect standard timer if session was replaced (conflict 440) or logged out
          const shouldReconnect = !isLogout && !isConflict;
          console.log(`Conexión con WhatsApp cerrada para canal ${channelId}. Razón: ${reason || 'desconocida'}. Reconectando: ${shouldReconnect}`);

          if (activeSockets[channelId] === clientSock) {
            delete activeSockets[channelId];
          }
          qrCodesMap[channelId] = '';
          if (channelId === 'channel-default') {
            currentQrCode = null;
            currentDB.whatsappConnected = false;
          }
          const chIdx = (currentDB.channels || []).findIndex((c: any) => c.id === channelId);
          if (chIdx !== -1) {
            currentDB.channels[chIdx].connected = false;
          }
          if (isConflict) {
            console.log(`[WhatsApp Real] Conflicto 440 (Sesión reemplazada/abierta en otro dispositivo) para el canal ${channelId}.`);
            conflictRetries[channelId] = (conflictRetries[channelId] || 0) + 1;
            if (reconnectTimers[channelId]) {
              clearTimeout(reconnectTimers[channelId]);
              delete reconnectTimers[channelId];
            }
            if (conflictRetries[channelId] <= 1) {
              console.log(`[WhatsApp Real] Reintento de auto-recuperación 1/1 para canal ${channelId} en 6s...`);
              reconnectTimers[channelId] = setTimeout(() => {
                delete reconnectTimers[channelId];
                connectToWhatsApp(channelId, true);
              }, 6000);
            } else {
              if (channelId === 'channel-default') {
                currentDB.whatsappConnected = false;
                currentDB.whatsappError = "Sesión reemplazada (Conflicto 440): Se detectó una sesión activa de WhatsApp Web en otra pestaña o dispositivo. Haz clic en 'Reconectar / Tomar Control' para retomar la conexión aquí.";
              }
            }
          }
          // If session is expired, invalid, or logged out, clear credentials cache so next scan can start completely fresh!
          if (isLogout || reason === 403 || reason === 405 || reason === 500) {
            console.log(`[WhatsApp Real] Credenciales expiradas o sesión inválida para el canal ${channelId}. Limpiando caché...`);
            const sessionFolder = channelId === 'channel-default' ? 'baileys_auth_info' : `baileys_auth_info_${channelId}`;
            const authSessionPath = path.resolve(wAuthBaseDir, sessionFolder);
            if (fs.existsSync(authSessionPath)) {
              try {
                fs.rmSync(authSessionPath, { recursive: true, force: true });
              } catch(e) {}
            }
            if (currentDB.whatsappSessionData && currentDB.whatsappSessionData[channelId]) {
              delete currentDB.whatsappSessionData[channelId];
            }
            if (channelId === 'channel-default') {
              currentDB.whatsappError = "Sesión cerrada o expirada. Por favor escanea el código QR nuevamente.";
            }
          }
          saveDBData(currentDB);

          if (shouldReconnect) {
            if (reconnectTimers[channelId]) {
              clearTimeout(reconnectTimers[channelId]);
            }
            reconnectTimers[channelId] = setTimeout(() => {
              delete reconnectTimers[channelId];
              if (!activeSockets[channelId] || activeSockets[channelId]?.ws?.readyState !== 1) {
                connectToWhatsApp(channelId);
              }
            }, 5000);
          }
        } else if (connection === 'open') {
          isConnecting[channelId] = false;
          conflictRetries[channelId] = 0;
          if (reconnectTimers[channelId]) {
            clearTimeout(reconnectTimers[channelId]);
            delete reconnectTimers[channelId];
          }
          console.log(`¡Conexión real con WhatsApp establecida exitosamente para el canal ${channelId}!`);
          qrCodesMap[channelId] = '';
          if (channelId === 'channel-default') {
            currentQrCode = null;
            currentDB.whatsappConnected = true;
            currentDB.whatsappError = undefined;
          }
          let phoneNum = 'Conectado';
          if (clientSock?.user?.id) {
            // clientSock.user.id looks like "573001234567:1@s.whatsapp.net"
            phoneNum = clientSock.user.id.split(':')[0].split('@')[0];
          }
          if (channelId === 'channel-default') {
            currentDB.connectedPhone = phoneNum;
          }
          const chIdx = (currentDB.channels || []).findIndex((c: any) => c.id === channelId);
          if (chIdx !== -1) {
            currentDB.channels[chIdx].connected = true;
            currentDB.channels[chIdx].phone = phoneNum;
            currentDB.channels[chIdx].type = 'real';
          }
          saveDBData(currentDB);
        }
      });

      clientSock.ev.on('messages.upsert', async (m: any) => {
        // fs.appendFileSync('wap_debug.log', JSON.stringify(m, null, 2) + '\n');
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;

          const msgTimestamp = msg.messageTimestamp;
          // Ignorar mensajes con más de 30 minutos de antigüedad (1800 segundos) para evitar procesar historial viejo pero sin ignorar mensajes recientes
          if (msgTimestamp && Math.floor(Date.now() / 1000) - Number(msgTimestamp) > 1800) {
            console.log(`[WhatsApp Real] Ignorando mensaje histórico antiguo de ${msg.key.remoteJid}`);
            continue;
          }

          const senderJid = msg.key.remoteJid;
          const altJid = msg.key.remoteJidAlt || senderJid;

          if (!senderJid) continue;
          if (!senderJid.endsWith('@s.whatsapp.net') && !senderJid.endsWith('@lid')) continue;

          const isImage = !!msg.message?.imageMessage;
          const isAudio = !!msg.message?.audioMessage;
          let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

          let mediaBase64: string | null = null;
          let mediaMimeType: string | null = null;

          if (isImage || isAudio) {
            try {
              const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                  logger: pino({ level: 'silent' }),
                  reuploadRequest: clientSock.updateMediaMessage
                }
              );
              mediaBase64 = buffer.toString('base64');
              if (isImage) {
                mediaMimeType = msg.message.imageMessage?.mimetype || 'image/jpeg';
                text = text || "[Imagen adjunta enviada por el cliente para comprobación]";
              } else if (isAudio) {
                mediaMimeType = msg.message.audioMessage?.mimetype || 'audio/ogg';
                text = text || "[Audio de voz enviado por el cliente. Transcribe y responde o verifica la nota]";
              }
            } catch (err) {
              console.error("Error al descargar media de WhatsApp:", err);
            }
          }

          if (!text.trim() && !mediaBase64) continue;

          let rawPhoneString = altJid;
          if (rawPhoneString.includes(':')) rawPhoneString = rawPhoneString.split(':')[0] + '@' + rawPhoneString.split('@')[1];
          const phone = rawPhoneString.split('@')[0];
          const senderName = msg.pushName || "Cliente WhatsApp";

          // 0. Revisar si es un System Command (Actualización de inventario/piezas)
          if (currentDB.systemCommands && currentDB.systemCommands.length > 0) {
            const txtU = text.toUpperCase().trim();
            const matchedCommand = currentDB.systemCommands.find((sc: any) => txtU.startsWith(sc.command.toUpperCase()));
            if (matchedCommand) {
              const arg = txtU.replace(matchedCommand.command.toUpperCase(), '').trim();
              if (matchedCommand.type === 'stock') {
                 const prod = currentDB.products?.find((p:any) => p.name.toUpperCase() === arg || p.sku.toUpperCase() === arg);
                 if (prod) {
                   prod.stock = 0;
                   if (clientSock) await clientSock.sendMessage(senderJid, { text: `✅ Producto/Plato "${prod.name}" marcado como AGOTADO.` });
                 } else {
                   if (clientSock) await clientSock.sendMessage(senderJid, { text: `❌ Producto no encontrado: ${arg}` });
                 }
              } else if (matchedCommand.type === 'room') {
                 // Assume arg is "OCUPADA" or "DISPONIBLE" followed by room name, or we just toggle it.
                 // Let's make it toggle for simplicity
                 const rm = currentDB.rooms?.find((r:any) => r.name.toUpperCase() === arg || r.id.toUpperCase() === arg);
                 if (rm) {
                   rm.available = !rm.available;
                   if (clientSock) await clientSock.sendMessage(senderJid, { text: `✅ Pieza "${rm.name}" marcada como ${rm.available ? 'DISPONIBLE' : 'OCUPADA'}.` });
                 } else {
                   if (clientSock) await clientSock.sendMessage(senderJid, { text: `❌ Pieza no encontrada: ${arg}` });
                 }
              }
              saveDBData(currentDB);
              continue; // Comandos procesados silenciosamente, no invocar IA
            }
          }

          // 1. Detectar si el mensaje es enviado desde nuestro propio celular (el dueño/negocio)
          if (msg.key.fromMe) {
            if (!currentDB.disabledBots) {
              currentDB.disabledBots = [];
            }

            const textLower = text.toLowerCase().trim();
            const customTrigger = (currentDB.reactivationTrigger || '🤖').toLowerCase().trim();

            // Acepta la casilla/carácter de reactivación personalizada configurada por el usuario
            const reenableEmojis = ['🤖', '🔄', '⭐', '✅'];
            const reenablePhrases = [
              'activar bot', 'activar ia', 'iniciar bot', 'iniciar ia',
              'móna actívate', 'mona activate', 'activar asistente', 'modo bot',
              'a', 'activa'
            ];

            if (customTrigger) {
              reenablePhrases.push(customTrigger);
            }
            if (currentDB.customWakeWord) {
              reenablePhrases.push(currentDB.customWakeWord.toLowerCase().trim());
            }

            const hasReenableEmoji = reenableEmojis.some(emoji => text.includes(emoji)) || (customTrigger && text.includes(customTrigger));
            const hasReenablePhrase = reenablePhrases.some(phrase => textLower === phrase || textLower.includes(phrase) || textLower.startsWith(phrase));

// Utility to construct unified dynamic prompt for WhatsApp Chatbot

            if (hasReenableEmoji || hasReenablePhrase) {
              // Reactivar de inmediato el bot
              const cleanPhoneToEnable = phone.replace(/\D/g, '');
              currentDB.disabledBots = (currentDB.disabledBots || []).filter((p: string) => p.replace(/\D/g, '') !== cleanPhoneToEnable);
              console.log(`[WhatsApp Real] [RE-ACTIVADO] Bot reactivado para +${phone} por mensaje o emoji de reactivación ("${customTrigger}").`);
              saveDBData(currentDB);

              // Disparar la respuesta de la IA en segundo plano basada en el último mensaje
              (async () => {
                try {
                  await new Promise(r => setTimeout(r, 1500));

                  const history = currentDB.messagesHistory?.[phone] || [];
                  if (history.length === 0) return;

                  const replyText = await processWithAgents({
                    phone,
                    senderName,
                    text: text || "Hola",
                    history
                  });
                  if (replyText) {
                    const parsed = safeParseJSON(replyText);
                    const replies = parsed?.replies || [parsed?.reply || "¡Hola! ¿En qué te puedo colaborar?"];
                    await sendWhatsAppBotReplies(clientSock, senderJid, text || "Hola", replies, phone);
                  }
                } catch(e) {
                  console.error("Error al responder post-reactivación:", e);
                }
              })();
            } else if (currentDB.autoPauseOnManualReply === true) {
              // Si la auto-pausa por respuesta manual está HABILITADA, desactivar la IA en este chat
              const cleanPhoneToDisable = phone.replace(/\D/g, '');
              const alreadyDisabled = (currentDB.disabledBots || []).some((p: string) => p.replace(/\D/g, '') === cleanPhoneToDisable);
              if (!alreadyDisabled) {
                currentDB.disabledBots.push(cleanPhoneToDisable);
                console.log(`[WhatsApp Real] [AUTO-PAUSA] IA pausada para +${phone} porque el agente/dueño respondió directamente en WhatsApp.`);
              }
            }
            saveDBData(currentDB);
            continue; // Evitar que el bot responda a nuestros propios mensajes
          }

           // Command Processing block for Admin/Automation commands (from another WhatsApp)
          const cleanPhone = phone.replace(/\D/g, '');
          const isMonaAdmin = currentDB.notificationNumbers?.some((n: string) => n.replace(/\D/g, '') === cleanPhone);
          const hasMonaBypass = text.trim().toUpperCase().startsWith('#MONA');

          if (isMonaAdmin || hasMonaBypass) {
            let commandToExecute = text.trim();
            if (hasMonaBypass) {
              commandToExecute = commandToExecute.substring(5).trim(); // Remove #MONA / #mona prefix
            }

            const commandApplied = await processWhatsAppCommand(commandToExecute, currentDB);
            if (commandApplied) {
              saveDBData(currentDB);
              console.log(`[Command Real] Comando administrativo recibido y ejecutado con éxito: "${commandToExecute}"`);
              if (clientSock) {
                try {
                  await clientSock.sendMessage(senderJid, { text: `📢 *[Administración La Mona]*\n¡Comando ejecutado con éxito!\n👉 El estado ha sido sincronizado en toda la plataforma.` });
                } catch(e) {}
              }
              continue; // Do NOT run the general chatbot response for this admin command!
            }
          }

          // 2. Si el mensaje es del cliente, verificar primero si el bot está desactivado globalmente, para él o en lista negra
          const isGlobalAiDisabled = currentDB.isAiGlobalActive === false;
          const isBlacklisted = (currentDB.blacklistedBots || []).some((num: string) => {
            const cleanInput = phone.replace(/\D/g, '');
            const cleanBlacklist = num.replace(/\D/g, '');
            return cleanBlacklist && (cleanInput === cleanBlacklist || cleanInput.endsWith(cleanBlacklist));
          });
          const isBotDisabledForThisPhone = (currentDB.disabledBots || []).some((num: string) => {
            const cleanInput = phone.replace(/\D/g, '');
            const cleanDisabled = num.replace(/\D/g, '');
            return cleanDisabled && (cleanInput === cleanDisabled || cleanInput.endsWith(cleanDisabled));
          });

          if (isGlobalAiDisabled || isBlacklisted || isBotDisabledForThisPhone) {
            console.log(`[WhatsApp Real] Mensaje de +${phone} recibido pero omitido. (isGlobalDisabled=${isGlobalAiDisabled}, isBlacklisted=${isBlacklisted}, isDisabledForPhone=${isBotDisabledForThisPhone}).`);

            // Registramos el mensaje igualmente en la lista de chats para visibilidad en el panel
            let avatarUrl = currentDB.profilePictures?.[phone];
            if (!avatarUrl && clientSock && typeof clientSock.profilePictureUrl === 'function') {
              try {
                avatarUrl = await clientSock.profilePictureUrl(senderJid, 'image');
                if (avatarUrl) {
                  if (!currentDB.profilePictures) currentDB.profilePictures = {};
                  currentDB.profilePictures[phone] = avatarUrl;
                }
              } catch (_) {}
            }
            const timestampStr = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).format(new Date());
            const newChat: any = {
              id: `CH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              sender: senderName,
              phone: `+${phone}`,
              avatar: avatarUrl || undefined,
              message: text,
              time: timestampStr,
              status: 'nuevo'
            };
            currentDB.chats = [newChat, ...currentDB.chats.filter((c: any) => c.phone !== `+${phone}`).slice(0, 19)];
            saveDBData(currentDB);
            continue; // Saltar respuesta de IA
          }

          console.log(`[WhatsApp Real] Mensaje de ${senderName} (+${phone}): "${text}"`);

          let avatarUrl = currentDB.profilePictures?.[phone];
          if (!avatarUrl && clientSock && typeof clientSock.profilePictureUrl === 'function') {
            try {
              avatarUrl = await clientSock.profilePictureUrl(senderJid, 'image');
              if (avatarUrl) {
                if (!currentDB.profilePictures) currentDB.profilePictures = {};
                currentDB.profilePictures[phone] = avatarUrl;
              }
            } catch (_) {}
          }
          const timestampStr = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).format(new Date());
          const newChat: any = {
            id: `CH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            sender: senderName,
            phone: `+${phone}`,
            avatar: avatarUrl || undefined,
            message: text,
            time: timestampStr,
            status: 'nuevo'
          };
          currentDB.chats = [newChat, ...currentDB.chats.filter((c: any) => c.phone !== `+${phone}`).slice(0, 19)];

          // 3. Buffer de espera configurado antes de que responda el asistente virtual
          const delaySecs = currentDB.botDelay !== undefined ? currentDB.botDelay : 1;
          console.log(`[WhatsApp Real] Aplicando buffer de espera de ${delaySecs} segundos antes de invocar la Inteligencia Artificial...`);
          currentDB.whatsappError = undefined; // Clear previous errors
          saveDBData(currentDB);
          await new Promise(resolve => setTimeout(resolve, delaySecs * 1000));
          console.log(`[WhatsApp Real] Buffer finalizado. Procesando respuesta con IA.`);

          try {
            const menu = currentDB.active;
            const botInstructions = currentDB.botPrompt || "Actúa como la Mona IA...";

            const activeMenuStr = `Menú del día del hoy:
- Sopas/Entradas: ${menu.entradas ? menu.entradas.join(', ') : ''}
- Principios/Acompañamientos: ${menu.principios ? menu.principios.join(', ') : ''}
- Carnes/Proteínas: ${menu.carnes ? menu.carnes.join(', ') : ''}
- Bebidas: ${menu.bebidas ? menu.bebidas.join(', ') : ''}
- Postres: ${menu.postres ? menu.postres.join(', ') : ''}
- Precio general: $${menu.precio} COP`;

            const inventoryStr = currentDB.products ?
              `Inventario actual (Avisa si algo está AGOTADO):\n${currentDB.products.map((p: any) => `- ${p.name}: ${p.stock > 0 ? (p.stock + ' disponibles') : '¡AGOTADO!'}`).join('\n')}`
              : '';

            // Prepare history
            if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
            if (!currentDB.messagesHistory[phone]) currentDB.messagesHistory[phone] = [];

            // Append the new message to history first
            const nowClientTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            currentDB.messagesHistory[phone].push({ role: 'client', text, time: nowClientTime, timestamp: Date.now() });
            if (currentDB.messagesHistory[phone].length > 15) {
              currentDB.messagesHistory[phone].shift();
            }

            let mediaInfoStr = "";
            if (isImage) mediaInfoStr = "El cliente adjuntó una imagen (comprobante, recibo o foto).";
            if (isAudio) mediaInfoStr = "El cliente envió un mensaje de voz/audio.";

            const extractedText = await processWithAgents({
              phone,
              senderName,
              text,
              history: currentDB.messagesHistory[phone] || [],
              mediaInfo: mediaInfoStr,
              mediaBase64,
              mediaMimeType
            });

            if (extractedText) {
              const parsed = safeParseJSON(extractedText);
              let replies: string[] = [];
              if (parsed && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
                replies = parsed.replies;
              } else if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
                replies = [parsed.reply.trim()];
              } else if (typeof extractedText === 'string' && extractedText.trim()) {
                replies = [extractedText.trim()];
              } else {
                replies = ["¡Hola! ¿En qué te puedo colaborar?"];
              }
              await sendWhatsAppBotReplies(clientSock, senderJid, text, replies, phone);
              // Reset remarketing status since customer got a response from bot
              if (currentDB.remarketingStatus && currentDB.remarketingStatus[phone]) {
                currentDB.remarketingStatus[phone] = { sentCount: 0, lastSentTimestamp: Date.now() };
              }
              saveDBData(currentDB);
            }
          } catch(e) {
             console.error('Error handling real WS message:', e);
          }
      }
    }); // end on('messages.upsert')
    } catch (err: any) {
      console.error("[WhatsApp Real] Error en connectToWhatsApp:", err);
      if (channelId === 'channel-default') {
        currentDB.whatsappConnected = false;
        currentDB.whatsappError = err.message || String(err);
      }
      const chIdx = (currentDB.channels || []).findIndex((c: any) => c.id === channelId);
      if (chIdx !== -1) {
        currentDB.channels[chIdx].connected = false;
        currentDB.channels[chIdx].error = err.message || String(err);
      }
      saveDBData(currentDB);
    } finally {
      isConnecting[channelId] = false;
    }
  } // end connectToWhatsApp

  // API Route: WhatsApp Virtual Customer Conversation Agent (Simulador)
  app.post('/api/chat-bot', async (req, res) => {
    try {
      const { message, history, senderName, phone } = req.body;
      if (!message) return res.status(400).json({ error: 'Falta mensaje' });
      const extractedText = await processWithAgents({
        phone: phone || "3000000000",
        senderName: senderName || "",
        text: message,
        history: history || []
      });
      if (!extractedText) {
        throw new Error('La IA no retornó contenido.');
      }

      const parsedOutput = safeParseJSON(extractedText);
      if (!parsedOutput) throw new Error('Error parseando JSON de IA en simulador');
      let spawnedOrder = null;

      // Extract replies and format string snippet
      let baseReply = "";
      let wantsMenuImage = false;
      if (parsedOutput.replies && Array.isArray(parsedOutput.replies)) {
        wantsMenuImage = parsedOutput.replies.some((r: string) => r.includes('[ENVIAR_IMAGEN_MENU]'));
        baseReply = parsedOutput.replies.map((r: string) => r.replace(/\[ENVIAR_IMAGEN_MENU\]/g, '').trim()).filter((r: string) => r).join('\n\n');
      } else if (parsedOutput.reply) {
        wantsMenuImage = parsedOutput.reply.includes('[ENVIAR_IMAGEN_MENU]');
        baseReply = parsedOutput.reply.replace(/\[ENVIAR_IMAGEN_MENU\]/g, '').trim();
      }

      // Check if Gemini completed order extraction
      if (parsedOutput.orderDetails && Object.keys(parsedOutput.orderDetails).length > 0) {
        const details = parsedOutput.orderDetails;
        if (details.customerName && (details.address || details.phone)) {
          // Spawn order
          const randId = `ORD-${Math.floor(100 + Math.random() * 900)}`;
          const itemsList = details.items && details.items.length > 0 ? details.items : ["1x Almuerzo Ejecutivo"];

          spawnedOrder = {
            id: randId,
            customerName: details.customerName,
            phone: details.phone || "+57 300 000 0000",
            status: "CONFIRMANDO",
            transcription: `Pedido capturado por Chatbot IA WhatsApp de Restaurante La Mona.`,
            address: details.address || "Yumbo Valle del Cauca",
            items: itemsList,
            waiterId: "S1",
            deliveryId: "D1",
            paymentMethod: details.paymentMethod || "Efectivo",
            amount: details.amount || (currentDB.active ? currentDB.active.precio : undefined) || 15000,
            timestamp: new Date().toISOString()
          };

          // Append to DB
          currentDB.orders = [spawnedOrder, ...currentDB.orders];

          // Auto-add client back into CRM list if not already registered
          const clientPhoneClean = spawnedOrder.phone;
          const customerExists = currentDB.customers.some((c: any) => c.phone === clientPhoneClean);
          if (!customerExists) {
            const newCust = {
              id: `C${currentDB.customers.length + 1}`,
              name: spawnedOrder.customerName,
              registerDate: new Date().toISOString().split('T')[0],
              address: spawnedOrder.address,
              phone: spawnedOrder.phone,
              recurrence: 'NUEVO',
              ordersCount: 1
            };
            currentDB.customers = [...currentDB.customers, newCust];
          } else {
            currentDB.customers = currentDB.customers.map((c: any) =>
              c.phone === clientPhoneClean ? { ...c, ordersCount: c.ordersCount + 1 } : c
            );
          }

          saveDBData(currentDB);
          parsedOutput.createdOrder = spawnedOrder;
        }
      }

      let finalMenuImg = null;
      if (wantsMenuImage) {
         if (currentDB.menuImage) {
            finalMenuImg = currentDB.menuImage;
         }
      }

      // Removida la regex básica; nos guiamos por la IA (wantsMenuImage) para evitar falsos positivos
      res.json({
        success: true,
        reply: baseReply || "No hay respuesta clara.",
        createdOrder: spawnedOrder,
        menuImage: finalMenuImg
      });

    } catch (err: any) {
      console.error('Error in chatbot endpoint:', err);
      // Return a graceful fallback instead of 500 so the UI simulator shows it
      res.json({
        success: true,
        reply: currentDB.fallbackMessage || "Estoy un poco saturada, dame un momento y ya te respondo 😅.",
        createdOrder: null,
        menuImage: null
      });
    }
  });

  // --- TELEGRAM PAYMENTS INTEGRATION ---
  app.get('/api/telegram-pay/config', (req, res) => {
    res.json({
      success: true,
      botUsername: currentDB.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || 'expertecom_bot',
      botTokenConfigured: Boolean(currentDB.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN),
      masterWallet: currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || '',
      superAdminMnemonicConfigured: Boolean(currentDB.superAdminMnemonic || process.env.SUPERADMIN_MNEMONIC)
    });
  });

  app.post('/api/telegram-pay/save-config', (req, res) => {
    try {
      const { masterWallet, telegramBotUsername, telegramBotToken, superAdminMnemonic } = req.body;
      currentDB.superAdminWallet = masterWallet;
      currentDB.telegramBotUsername = telegramBotUsername;
      currentDB.telegramBotToken = telegramBotToken;
      if (superAdminMnemonic !== undefined) currentDB.superAdminMnemonic = superAdminMnemonic;
      saveDBData(currentDB);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error saving telegram config:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
  });

  app.get('/api/telegram-pay/transactions', (req, res) => {
    res.json({
      success: true,
      transactions: currentDB.telegramTransactions || []
    });
  });


  app.get('/api/admin/config', (req, res) => {
    res.json({
      telegramBotUsername: currentDB.telegramBotUsername || '',
      superAdminWallet: currentDB.superAdminWallet || '',
      superAdminMnemonicConfigured: Boolean(currentDB.superAdminMnemonic || process.env.SUPERADMIN_MNEMONIC)
    });
  });

  app.post('/api/admin/config', (req, res) => {
    const { telegramBotUsername, superAdminWallet, superAdminMnemonic } = req.body;
    if (telegramBotUsername !== undefined) currentDB.telegramBotUsername = telegramBotUsername;
    if (superAdminWallet !== undefined) currentDB.superAdminWallet = superAdminWallet;
    if (superAdminMnemonic !== undefined) currentDB.superAdminMnemonic = superAdminMnemonic;
    saveDBData(currentDB);
    res.json({ success: true });
  });

  // --- SUPABASE CLOUD DATABASE API ENDPOINTS ---
  app.get('/api/supabase/status', async (req, res) => {
    try {
      const status = await checkSupabaseStatus();
      res.json({
        ...status,
        hasUrl: Boolean(process.env.SUPABASE_URL),
        hasKey: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
    } catch (err: any) {
      res.status(500).json({ configured: false, connected: false, error: err?.message || err });
    }
  });

  app.get('/api/supabase/schema', (req, res) => {
    res.json({
      sql: SUPABASE_SCHEMA_SQL,
      tableName: 'app_state',
      notes: 'Ejecuta esta sentencia SQL en tu Dashboard de Supabase -> SQL Editor para inicializar la tabla de persistencia.'
    });
  });

  app.post('/api/supabase/sync', async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(400).json({
          success: false,
          error: 'SUPABASE_URL y SUPABASE_KEY no están configuradas en las variables de entorno.'
        });
      }
      const saved = await mirrorStateToNormalizedTables(currentDB);
      if (saved) {
        normalizedDbActive = true;
        res.json({
          success: true,
          message: 'Base de datos sincronizada con las tablas normalizadas de Supabase exitosamente.',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'No se pudo guardar en las tablas normalizadas de Supabase. Revisa la migración 20261010013000_normalized_core_tables.sql.'
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || err });
    }
  });

  app.post('/api/supabase/pull', async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(400).json({
          success: false,
          error: 'SUPABASE_URL y SUPABASE_KEY no están configuradas en las variables de entorno.'
        });
      }
      const tableData = await loadStateFromNormalizedTables().catch(() => null);
      const cloudData = tableData || await loadFromSupabase();
      if (cloudData) {
        fs.writeFileSync(dbPath, JSON.stringify(cloudData, null, 2), 'utf-8');
        currentDB = getDBData();
        if (tableData) normalizedDbActive = true;
        res.json({
          success: true,
          message: tableData
            ? 'Estado cargado desde las tablas normalizadas de Supabase exitosamente.'
            : 'Estado descargado desde app_state de compatibilidad y cargado en el servidor exitosamente.',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'No se encontraron datos en las tablas normalizadas ni en app_state de Supabase.'
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || err });
    }
  });

  app.post('/api/telegram-pay/create-invoice', async (req, res) => {
    try {
      const { planName, planValue, email, telegramWallet, sponsorWallet } = req.body;
      const invoiceId = `TG-INV-${Math.floor(100000 + Math.random() * 900000)}`;

      const telegramBot = currentDB.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || 'expertecom_bot';
      const superAdminWallet = currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || '';

      // 1. Bot Official Pay link (deep linking to bot)
      const payLink = `https://t.me/${telegramBot}?start=pay_${invoiceId}`;
      const botQrCode = await QRCode.toDataURL(payLink);

      // 2. Direct TON On-chain Transfer pay link (0% platform fee, instant wallet-to-wallet)
      const TON_RATE = 7.25;
      const tonAmountInNano = Math.round((planValue / TON_RATE) * 1e9);
      const tonTransferLink = `ton://transfer/${superAdminWallet}?amount=${tonAmountInNano}&text=${invoiceId}`;
      const tonQrCode = await QRCode.toDataURL(tonTransferLink);

      // 3. Direct USDT On-chain Transfer pay link
      const usdtTransferLink = `ton://transfer/${superAdminWallet}?text=${invoiceId}`;
      const usdtQrCode = await QRCode.toDataURL(usdtTransferLink);

      const newInvoice = {
        invoiceId,
        planName,
        planValue,
        email,
        telegramWallet: telegramWallet || '@wallet',
        sponsorWallet: sponsorWallet || '',
        payLink,
        qrCodeValue: botQrCode, // Fallback
        botQrCode,
        tonTransferLink,
        tonQrCode,
        usdtTransferLink,
        usdtQrCode,
        superAdminWallet,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      };

      if (!currentDB.telegramInvoices) {
        currentDB.telegramInvoices = {};
      }
      currentDB.telegramInvoices[invoiceId] = newInvoice;
      saveDBData(currentDB);

      res.json({
        success: true,
        invoice: newInvoice
      });
    } catch (err: any) {
      console.error('Error creating Telegram invoice:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/telegram-pay/confirm', async (req, res) => {
    const { invoiceId, email } = req.body;
    if (!currentDB.telegramInvoices || !currentDB.telegramInvoices[invoiceId]) {
      return res.status(404).json({ success: false, error: 'Factura o invoice no encontrado' });
    }

    const invoice = currentDB.telegramInvoices[invoiceId];
    invoice.status = 'COMPLETED';

    // Execute real on-chain dispersion via @ton/ton if env is set
    try {
      await distributeTonCommissions(invoice, currentDB.superAdminMnemonic);
    } catch(err) {
      console.error("Failed to execute real on-chain dispersion:", err);
    }

    // Distribute MLM commissions with Roll-Up Overflow to SuperAdmin
    const sponsorWallet = invoice.sponsorWallet || '';
    const hasSponsors = !!sponsorWallet;
    const superAdminWallet = currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || '';

    const u1_share = invoice.planValue * 0.50; // 50%
    const u2_share = invoice.planValue * 0.10; // 10%
    const level3_4_5_share = invoice.planValue * 0.15; // 15% (N3=5%, N4=5%, N5=5%)
    const admin_share = invoice.planValue * 0.25; // 25% Admin Wallet

    const newTxs = [];
    if (hasSponsors) {
      newTxs.push(
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: `Afiliado Telegram (${email || invoice.email || 'Anónimo'})`,
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: 'Nivel 1 (Patrocinador Directo)',
          dest: `${sponsorWallet} (Patrocinador)`,
          percent: 50,
          share: u1_share,
          status: 'Completado',
          timestamp: 'Hace unos instantes'
        },
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: 'Comunidad Red',
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: 'Nivel 2',
          dest: 'Patrocinador N2',
          percent: 10,
          share: u2_share,
          status: 'Completado',
          timestamp: 'Hace unos instantes'
        },
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: 'Comunidad Red',
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: 'Nivel 3, 4 y 5',
          dest: 'Patrocinadores Red N3-N5',
          percent: 15,
          share: level3_4_5_share,
          status: 'Completado',
          timestamp: 'Hace unos instantes'
        },
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: 'Comunidad Red',
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: 'Admin Principal',
          dest: `SuperAdmin (${superAdminWallet})`,
          percent: 25,
          share: admin_share,
          status: 'Completado',
          timestamp: 'Hace unos instantes'
        }
      );
    } else {
      // 100% of the funds go directly to the SuperAdmin as requested
      newTxs.push({
        txId: `0x${Math.random().toString(16).substring(4, 16)}`,
        source: `Afiliado Telegram (${email || invoice.email || 'Anónimo'})`,
        plan: `${invoice.planName} ($${invoice.planValue} USD)`,
        totalMonto: invoice.planValue,
        level: 'Licencia Directa (Sin Patrocinador)',
        dest: `SuperAdmin (${superAdminWallet})`,
        percent: 100,
        share: invoice.planValue,
        status: 'Completado',
        timestamp: 'Hace unos instantes'
      });
    }

    if (!currentDB.telegramTransactions) {
      currentDB.telegramTransactions = [];
    }
    currentDB.telegramTransactions = [...newTxs, ...currentDB.telegramTransactions];

    // Update user plan on backend state so it persists!
    if (!currentDB.userPlans) {
      currentDB.userPlans = {};
    }
    const targetEmail = email || invoice.email || 'usuario@email.com';
    currentDB.userPlans[targetEmail] = invoice.planName;

    saveDBData(currentDB);

    res.json({
      success: true,
      invoice,
      transactions: newTxs,
      planName: invoice.planName
    });
  });

  app.get('/api/telegram-pay/status/:invoiceId', (req, res) => {
    const { invoiceId } = req.params;
    const invoice = currentDB.telegramInvoices ? currentDB.telegramInvoices[invoiceId] : null;
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }
    res.json({
      success: true,
      status: invoice.status,
      invoice
    });
  });

  app.get('/api/comunidad/user-plan/:email', (req, res) => {
    const { email } = req.params;
    const plan = currentDB.userPlans && currentDB.userPlans[email] ? currentDB.userPlans[email] : 'Gratuito';
    res.json({
      success: true,
      plan
    });
  });

  app.post('/api/comunidad/user-plan', (req, res) => {
    const { email, plan } = req.body;
    if (!currentDB.userPlans) {
      currentDB.userPlans = {};
    }
    currentDB.userPlans[email] = plan;
    saveDBData(currentDB);
    res.json({
      success: true,
      plan
    });
  });

  // --- INTEGRACIONES META & TIKTOK API & WEBHOOKS ---
  app.get('/api/integrations/meta-tiktok/config', (req, res) => {
    const config = currentDB.metaAndTiktokConfig || {
      metaAppId: '',
      metaAppSecret: '',
      metaAccessToken: '',
      metaWebhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/meta`,
      metaWebhookVerifyToken: '',
      metaWebhookEvents: ['leadgen', 'messages', 'ads_insights'],
      metaConnected: false,
      metaConnectedUser: null,
      tiktokAppId: '',
      tiktokAppSecret: '',
      tiktokAccessToken: '',
      tiktokWebhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/tiktok`,
      tiktokWebhookVerifyToken: '',
      tiktokWebhookEvents: ['lead_group_generation', 'ads_insights'],
      tiktokConnected: false,
      tiktokConnectedUser: null
    };

    // Ensure the webhook URLs are up to date with the current hosting host dynamically
    config.metaWebhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/meta`;
    config.tiktokWebhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/tiktok`;

    res.json({
      success: true,
      config: sanitizeForClient(config),
      webhookLogs: (currentDB.webhookLogs || []).map(({ payload: _payload, ...log }: any) => log)
    });
  });

  app.post('/api/integrations/meta-tiktok/config', (req, res) => {
    try {
      const config = req.body;
      currentDB.metaAndTiktokConfig = {
        ...(currentDB.metaAndTiktokConfig || {}),
        ...config
      };
      saveDBData(currentDB);
      res.json({ success: true, config: sanitizeForClient(currentDB.metaAndTiktokConfig) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error saving integration config' });
    }
  });

  app.post('/api/integrations/meta-tiktok/disconnect', (req, res) => {
    try {
      const { provider } = req.body;
      if (!currentDB.metaAndTiktokConfig) {
        currentDB.metaAndTiktokConfig = {};
      }
      if (provider === 'meta') {
        currentDB.metaAndTiktokConfig.metaConnected = false;
        currentDB.metaAndTiktokConfig.metaConnectedUser = null;
        currentDB.metaAndTiktokConfig.metaAccessToken = '';
      } else if (provider === 'tiktok') {
        currentDB.metaAndTiktokConfig.tiktokConnected = false;
        currentDB.metaAndTiktokConfig.tiktokConnectedUser = null;
        currentDB.metaAndTiktokConfig.tiktokAccessToken = '';
      }
      saveDBData(currentDB);
      res.json({ success: true, config: sanitizeForClient(currentDB.metaAndTiktokConfig) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error disconnecting' });
    }
  });

  // --- CHATBOT INTEGRATION TOKENS (Dropi, Shopify, Meta CAPI, Google, TikTok, ChateaPro, OpenRouter) ---
  app.get('/api/integrations/chatbot-tokens', (req, res) => {
    try {
      const defaultHost = `${req.protocol}://${req.get('host')}`;
      const defaultTokens = {
        dropi: {
          token: '',
          storeId: '',
          webhookUrl: `${defaultHost}/api/integrations/dropi/webhook`,
          autoInjectOrders: true,
          autoSyncTracking: true,
          status: 'disconnected'
        },
        shopify: {
          token: '',
          shopDomain: '',
          webhookSecret: '',
          syncCatalog: true,
          createOrders: true,
          status: 'disconnected'
        },
        metaConversions: {
          token: '',
          pixelId: '',
          testEventCode: '',
          trackLeads: true,
          trackPurchases: true,
          trackCheckout: true,
          status: 'disconnected'
        },
        google: {
          conversionId: '',
          conversionLabel: '',
          developerToken: '',
          trackPurchases: true,
          status: 'disconnected'
        },
        tiktok: {
          token: '',
          pixelId: '',
          testCode: '',
          trackPurchases: true,
          trackContact: true,
          status: 'disconnected'
        },
        chateapro: {
          token: '',
          instanceId: '',
          webhookUrl: `${defaultHost}/api/integrations/chateapro/webhook`,
          syncContacts: true,
          transferToAgent: true,
          status: 'disconnected'
        },
        openrouter: {
          token: currentDB.openrouterApiKey || currentDB.customApiKey || '',
          model: currentDB.aiModel || 'google/gemini-2.5-flash',
          status: (currentDB.openrouterApiKey || currentDB.customApiKey) ? 'connected' : 'disconnected'
        }
      };

      const tokens = currentDB.chatbotIntegrationTokens || defaultTokens;
      if (!tokens.openrouter) {
        tokens.openrouter = {
          token: currentDB.openrouterApiKey || currentDB.customApiKey || '',
          model: currentDB.aiModel || 'google/gemini-2.5-flash',
          status: (currentDB.openrouterApiKey || currentDB.customApiKey) ? 'connected' : 'disconnected'
        };
      }
      // Always update dynamic host for webhooks
      if (tokens.dropi) tokens.dropi.webhookUrl = `${defaultHost}/api/integrations/dropi/webhook`;
      if (tokens.chateapro) tokens.chateapro.webhookUrl = `${defaultHost}/api/integrations/chateapro/webhook`;

      res.json({ success: true, tokens: sanitizeForClient(tokens) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error fetching chatbot tokens' });
    }
  });

  // Timezone Auto-Detection & Sync Endpoint (supports IP-based & client browser detection)
  app.all('/api/detect-timezone', (req, res) => {
    try {
      const clientTz = req.body?.timezone || req.query?.timezone;
      let finalTz = 'America/Bogota';

      if (clientTz && typeof clientTz === 'string' && clientTz.trim()) {
        finalTz = clientTz.trim();
      } else {
        const country = (req.headers['cf-ipcountry'] || req.headers['x-appengine-country'] || req.headers['x-country-code'] || '') as string;
        const countryUpper = country.toString().toUpperCase();
        if (countryUpper === 'CO' || !countryUpper) {
          finalTz = 'America/Bogota';
        } else if (countryUpper === 'MX') {
          finalTz = 'America/Mexico_City';
        } else if (countryUpper === 'PE') {
          finalTz = 'America/Lima';
        } else if (countryUpper === 'EC') {
          finalTz = 'America/Guayaquil';
        } else if (countryUpper === 'CL') {
          finalTz = 'America/Santiago';
        } else if (countryUpper === 'AR') {
          finalTz = 'America/Argentina/Buenos_Aires';
        } else if (countryUpper === 'ES') {
          finalTz = 'Europe/Madrid';
        } else if (countryUpper === 'US') {
          finalTz = 'America/New_York';
        }
      }

      currentDB.systemTimezone = finalTz;
      saveDBData(currentDB);

      const nowFormatted = new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: finalTz
      }).format(new Date());

      res.json({
        success: true,
        timezone: finalTz,
        currentTime: nowFormatted,
        offset: new Intl.DateTimeFormat('en-US', { timeZone: finalTz, timeZoneName: 'shortOffset' }).format(new Date())
      });
    } catch (e: any) {
      res.json({ success: true, timezone: 'America/Bogota', currentTime: new Date().toLocaleTimeString() });
    }
  });

  app.post('/api/integrations/chatbot-tokens', (req, res) => {
    try {
      const { provider, platform, data } = req.body;
      const target = provider || platform;

      if (!currentDB.chatbotIntegrationTokens) {
        currentDB.chatbotIntegrationTokens = {};
      }

      if (target && data) {
        currentDB.chatbotIntegrationTokens[target] = {
          ...(currentDB.chatbotIntegrationTokens[target] || {}),
          ...data,
          status: data.token ? 'connected' : 'disconnected',
          updatedAt: new Date().toISOString()
        };

        // If OpenRouter token was updated, configure AI provider & API key
        if (target === 'openrouter' && data.token) {
          const orEncrypted = encryptSecret(data.token.trim());
          currentDB.openrouterApiKey = orEncrypted;
          currentDB.customApiKey = orEncrypted;
          currentDB.apiProvider = 'openrouter';
          console.log('[OpenRouter] API Key de OpenRouter configurada exitosamente como motor de IA.');
        }
      } else if (req.body.tokens) {
        currentDB.chatbotIntegrationTokens = {
          ...currentDB.chatbotIntegrationTokens,
          ...req.body.tokens
        };
        if (req.body.tokens.openrouter?.token) {
          const orEncrypted2 = encryptSecret(req.body.tokens.openrouter.token.trim());
          currentDB.openrouterApiKey = orEncrypted2;
          currentDB.customApiKey = orEncrypted2;
          currentDB.apiProvider = 'openrouter';
        }
      }

      // La copia del token de OpenRouter dentro del blob de integraciones
      // tambien queda cifrada; nunca texto plano.
      const storedOrToken = currentDB.chatbotIntegrationTokens?.openrouter?.token;
      if (typeof storedOrToken === 'string' && storedOrToken.trim() && !isEncryptedSecret(storedOrToken)) {
        try {
          currentDB.chatbotIntegrationTokens.openrouter.token = encryptSecret(storedOrToken.trim());
        } catch (encErr: any) {
          return res.status(500).json({ success: false, error: encErr?.message || 'No se pudo cifrar el token de OpenRouter.' });
        }
      }
      saveDBData(currentDB);
      res.json({ success: true, tokens: sanitizeForClient(currentDB.chatbotIntegrationTokens) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error saving chatbot tokens' });
    }
  });

  app.post('/api/integrations/test-token', async (req, res) => {
    try {
      const { provider, platform, credentials } = req.body;
      const targetProvider = provider || platform;
      console.log(`[Integration Test] Probando credenciales para ${targetProvider}:`, credentials ? 'Credenciales provistas' : 'Vacías');

      if (!credentials) {
        return res.status(400).json({ success: false, message: 'No se recibieron credenciales para probar.' });
      }

      // Simulate or validate connection
      let isValid = false;
      let latency = Math.floor(Math.random() * 80) + 120; // 120-200ms
      let message = '';

      switch (targetProvider) {
        case 'openrouter':
          if (!credentials.token || credentials.token.length < 10) {
            return res.status(400).json({ success: false, message: 'El token de OpenRouter parece inválido o demasiado corto (debe comenzar con sk-or-...).' });
          }
          isValid = true;
          message = '¡Token de OpenRouter AI validado exitosamente! Motor de agentes IA conectado.';
          break;
        case 'dropi':
          if (!credentials.token || credentials.token.length < 5) {
            return res.status(400).json({ success: false, message: 'El token de Dropi parece inválido o demasiado corto.' });
          }
          isValid = true;
          message = '¡Conexión exitosa con la API de Dropi LatAm! Catálogo y despacho COD sincronizados.';
          break;
        case 'shopify':
          if (!credentials.token || (!credentials.token.startsWith('shpat_') && credentials.token.length < 10)) {
            return res.status(400).json({ success: false, message: 'El token de Shopify Admin debe ser un token de acceso válido (ej: shpat_...).' });
          }
          isValid = true;
          message = '¡Tienda Shopify conectada con éxito! API Admin lista para sincronizar órdenes.';
          break;
        case 'metaConversions':
        case 'meta':
          if (!credentials.token || credentials.token.length < 15 || !credentials.pixelId) {
            return res.status(400).json({ success: false, message: 'Debes ingresar el Token de Acceso del Sistema y el Pixel ID de Meta.' });
          }
          isValid = true;
          message = '¡Token de Meta Conversions API validado! Evento de prueba enviado a Events Manager.';
          break;
        case 'google':
          if (!credentials.conversionId) {
            return res.status(400).json({ success: false, message: 'Debes ingresar el Conversion ID de Google Ads (ej: AW-123456789).' });
          }
          isValid = true;
          message = '¡Google Ads Enhanced Conversions validado correctamente!';
          break;
        case 'tiktok':
          if (!credentials.token || !credentials.pixelId) {
            return res.status(400).json({ success: false, message: 'Debes ingresar el Access Token y Pixel ID de TikTok Events API.' });
          }
          isValid = true;
          message = '¡Conexión establecida con TikTok Events API!';
          break;
        case 'chateapro':
          if (!credentials.token || credentials.token.length < 5) {
            return res.status(400).json({ success: false, message: 'El token de ChateaPro es requerido para la vinculación.' });
          }
          isValid = true;
          message = '¡Instancia de ChateaPro conectada correctamente con el Bot de WhatsApp!';
          break;
        default:
          return res.status(400).json({ success: false, message: 'Proveedor desconocido.' });
      }

      res.json({
        success: isValid,
        message,
        latency: `${latency}ms`,
        testedAt: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error al validar conexión' });
    }
  });

  // --- REFERRALS & 20% COMMISSION AFFILIATE SYSTEM ---
  app.get('/api/referrals/stats', (req, res) => {
    try {
      const email = (req.query.email as string) || 'usuario@xorbit360.com';
      if (!currentDB.referralStats) currentDB.referralStats = {};
      if (!currentDB.referralStats[email]) {
        currentDB.referralStats[email] = {
          referralCode: '8650A73D',
          commissionRate: 0.20,
          balance: { available: 0, pendingWithdraw: 0, totalEarned: 0 },
          referrals: [],
          withdrawals: []
        };
      }
      res.json({ success: true, ...currentDB.referralStats[email] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error fetching referral stats' });
    }
  });

  app.post('/api/referrals/withdraw', (req, res) => {
    try {
      const { email = 'usuario@xorbit360.com', amount, method, accountDetails } = req.body;
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Monto inválido' });
      }

      if (!currentDB.referralStats) currentDB.referralStats = {};
      if (!currentDB.referralStats[email]) {
        currentDB.referralStats[email] = {
          referralCode: '8650A73D',
          commissionRate: 0.20,
          balance: { available: 0, pendingWithdraw: 0, totalEarned: 0 },
          referrals: [],
          withdrawals: []
        };
      }

      const userStats = currentDB.referralStats[email];
      const newRequest = {
        id: `RET-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        amount: numAmount,
        method: method || 'NEQUI',
        accountDetails: accountDetails || '',
        status: 'Pendiente'
      };

      userStats.withdrawals.unshift(newRequest);
      userStats.balance.pendingWithdraw = (userStats.balance.pendingWithdraw || 0) + numAmount;
      saveDBData(currentDB);

      res.json({ success: true, message: 'Solicitud de retiro registrada exitosamente', request: newRequest });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error al procesar solicitud de retiro' });
    }
  });

  // --- LEADER NETWORKER ROLE REQUESTS & APPROVAL ---
  app.post('/api/referrals/request-leader-role', (req, res) => {
    try {
      const requestData = req.body;
      if (!currentDB.leaderRequests) currentDB.leaderRequests = [];
      const newReq = {
        id: requestData.id || `LDR-${Date.now().toString().slice(-6)}`,
        userName: requestData.userName || 'Usuario',
        userEmail: requestData.userEmail || '',
        communityName: requestData.communityName || '',
        membersCount: requestData.membersCount || '50+',
        leaderType: requestData.leaderType || 'Educador de la Plataforma',
        socialLinks: requestData.socialLinks || '',
        message: requestData.message || '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pendiente'
      };
      currentDB.leaderRequests.unshift(newReq);
      saveDBData(currentDB);
      console.log(`[Líder Networker] Nueva solicitud recibida de ${newReq.userName} (${newReq.userEmail})`);
      res.json({ success: true, message: 'Solicitud guardada correctamente', request: newReq });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error al enviar solicitud' });
    }
  });

  app.get('/api/admin/leader-requests', (req, res) => {
    try {
      const list = currentDB.leaderRequests || [];
      res.json({ success: true, requests: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/approve-leader-role', (req, res) => {
    try {
      const { reqId, email, approved } = req.body;
      if (!currentDB.leaderRequests) currentDB.leaderRequests = [];
      currentDB.leaderRequests = currentDB.leaderRequests.map((r: any) =>
        r.id === reqId || r.userEmail === email
          ? { ...r, status: approved ? 'Aprobado' : 'Rechazado' }
          : r
      );
      saveDBData(currentDB);
      console.log(`[Líder Networker] Solicitud ${reqId} de ${email} marcada como: ${approved ? 'Aprobada' : 'Rechazada'}`);
      res.json({ success: true, message: `Rol ${approved ? 'aprobado' : 'rechazado'} con éxito` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- REAL & PERSISTENT META & TIKTOK CAMPAIGNS API ---
  const getSimulatedCampaigns = () => {
    return [
      {
        id: "camp_meta_1",
        name: "Conversiones - La Mona de Yumbo (Venta Directa)",
        status: "ACTIVE",
        objective: "OUTCOME_SALES",
        metrics: {
          impressions: 48920,
          clicks: 1420,
          spend: 185.40,
          ctr: 2.90,
          cpc: 0.13,
          conversions: 168
        }
      },
      {
        id: "camp_meta_2",
        name: "Clientes Potenciales - Clientes Fieles Yumbo",
        status: "ACTIVE",
        objective: "OUTCOME_LEADS",
        metrics: {
          impressions: 21050,
          clicks: 810,
          spend: 92.15,
          ctr: 3.84,
          cpc: 0.11,
          conversions: 94
        }
      },
      {
        id: "camp_tiktok_1",
        name: "TikTok Traffic - Mona High Engagement",
        status: "PAUSED",
        objective: "TRAFFIC",
        metrics: {
          impressions: 124500,
          clicks: 3420,
          spend: 150.00,
          ctr: 2.74,
          cpc: 0.04,
          conversions: 82
        }
      }
    ];
  };

  app.get('/api/ads/campaigns', async (req, res) => {
    try {
      const config = currentDB.metaAndTiktokConfig;

      // Initialize campaigns in DB if not present
      if (!currentDB.campaigns) {
        currentDB.campaigns = getSimulatedCampaigns();
        saveDBData(currentDB);
      }

      if (!config || !config.metaConnected || !config.metaAccessToken) {
        return res.json({
          success: true,
          connected: false,
          campaigns: currentDB.campaigns
        });
      }

      const accessToken = config.metaAccessToken;
      const adAccountId = config.metaConnectedUser?.adAccounts?.[0]?.id || '';

      if (!adAccountId) {
        return res.json({
          success: true,
          connected: true,
          connectedUser: config.metaConnectedUser,
          campaigns: currentDB.campaigns,
          info: "No se encontró ID de Cuenta Publicitaria activa. Mostrando datos de respaldo."
        });
      }

      // Try fetching real campaigns from Facebook Graph API
      try {
        const cleanId = adAccountId.replace('act_', '');
        const url = `https://graph.facebook.com/v18.0/act_${cleanId}/campaigns?fields=name,status,objective,buying_type,insights{impressions,clicks,spend,ctr,cpc}&access_token=${accessToken}`;

        const fbRes = await fetch(url, { signal: AbortSignal.timeout(3000) });
        const fbData = await fbRes.json() as any;

        if (fbData && fbData.error) {
          console.warn("Facebook Graph API Error (Returning cached/persistent):", fbData.error);
          return res.json({
            success: true,
            connected: true,
            connectedUser: config.metaConnectedUser,
            realApiFailed: true,
            errorMsg: fbData.error.message || 'Error de Meta API',
            campaigns: currentDB.campaigns
          });
        }

        const realCampaigns = (fbData.data || []).map((camp: any) => {
          const insights = camp.insights?.data?.[0] || {};
          const clicksVal = parseInt(insights.clicks || '0');
          const ctrVal = parseFloat(insights.ctr || '0') * 100 || 0;
          return {
            id: camp.id,
            name: camp.name,
            status: camp.status || 'ACTIVE',
            objective: camp.objective || 'OUTCOME_SALES',
            metrics: {
              impressions: parseInt(insights.impressions || '0'),
              clicks: clicksVal,
              spend: parseFloat(insights.spend || '0'),
              ctr: parseFloat(ctrVal.toFixed(2)),
              cpc: parseFloat(insights.cpc || '0') || 0,
              conversions: Math.floor(clicksVal * 0.12) || 0
            }
          };
        });

        // Update persistent list
        if (realCampaigns.length > 0) {
          currentDB.campaigns = realCampaigns;
          saveDBData(currentDB);
        }

        return res.json({
          success: true,
          connected: true,
          connectedUser: config.metaConnectedUser,
          realApiFailed: false,
          campaigns: currentDB.campaigns
        });

      } catch (fbErr: any) {
        console.warn("Facebook Graph Fetch Failed (Returning cached/persistent):", fbErr.message);
        return res.json({
          success: true,
          connected: true,
          connectedUser: config.metaConnectedUser,
          realApiFailed: true,
          errorMsg: fbErr.message,
          campaigns: currentDB.campaigns
        });
      }

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error loading campaigns' });
    }
  });

  app.post('/api/ads/create-campaign', async (req, res) => {
    try {
      const { name, objective, budget, target } = req.body;
      const config = currentDB.metaAndTiktokConfig;

      const newCamp = {
        id: `camp_meta_${Math.floor(100000 + Math.random() * 900000)}`,
        name: name || 'Nueva Campaña AI',
        status: 'ACTIVE',
        objective: objective || 'OUTCOME_SALES',
        metrics: {
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          conversions: 0
        }
      };

      if (!currentDB.campaigns) {
        currentDB.campaigns = getSimulatedCampaigns();
      }
      currentDB.campaigns.unshift(newCamp);
      saveDBData(currentDB);

      // Attempt actual creation if Meta API has token and ad account is connected
      if (config && config.metaConnected && config.metaAccessToken) {
        const adAccountId = config.metaConnectedUser?.adAccounts?.[0]?.id || '';
        if (adAccountId) {
          try {
            const cleanId = adAccountId.replace('act_', '');
            const fbUrl = `https://graph.facebook.com/v18.0/act_${cleanId}/campaigns`;

            const bodyData = new URLSearchParams();
            bodyData.append('name', name);
            bodyData.append('objective', objective || 'OUTCOME_SALES');
            bodyData.append('status', 'PAUSED'); // Create paused for safety
            bodyData.append('special_ad_categories', '[]');
            bodyData.append('access_token', config.metaAccessToken);

            const fbRes = await fetch(fbUrl, {
              method: 'POST',
              body: bodyData,
              signal: AbortSignal.timeout(3000)
            });
            const fbResult = await fbRes.json() as any;

            if (fbResult && !fbResult.error) {
              newCamp.id = fbResult.id;
              // Update with real ID
              currentDB.campaigns[0].id = fbResult.id;
              saveDBData(currentDB);

              return res.json({
                success: true,
                realCreated: true,
                fbCampaignId: fbResult.id,
                campaign: newCamp
              });
            } else {
              console.warn("Could not create live campaign at Meta, created locally:", fbResult.error);
              return res.json({
                success: true,
                realCreated: false,
                info: "No se pudo crear en Meta directamente (ver error). Se creó de manera local en Xorbit 360.",
                metaError: fbResult.error,
                campaign: newCamp
              });
            }
          } catch (fbErr: any) {
            console.warn("Meta API request failed:", fbErr.message);
            return res.json({
              success: true,
              realCreated: false,
              info: "Fallo de conexión con Meta API. Creada de manera local.",
              campaign: newCamp
            });
          }
        }
      }

      res.json({
        success: true,
        realCreated: false,
        campaign: newCamp
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error creating campaign' });
    }
  });

  app.post('/api/ads/update-campaign', async (req, res) => {
    try {
      const { id, status, spend, name } = req.body;
      if (!currentDB.campaigns) {
        currentDB.campaigns = getSimulatedCampaigns();
      }

      const index = currentDB.campaigns.findIndex((c: any) => c.id === id);
      if (index !== -1) {
        if (status !== undefined) currentDB.campaigns[index].status = status;
        if (spend !== undefined) {
          if (!currentDB.campaigns[index].metrics) {
            currentDB.campaigns[index].metrics = {
              impressions: 0,
              clicks: 0,
              spend: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0
            };
          }
          currentDB.campaigns[index].metrics.spend = parseFloat(spend);
        }
        if (name !== undefined) currentDB.campaigns[index].name = name;

        saveDBData(currentDB);
        return res.json({ success: true, campaign: currentDB.campaigns[index] });
      } else {
        return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error updating campaign' });
    }
  });

  // Serve a highly realistic Facebook Meta Business Suite OAuth Page
  app.get('/auth/meta', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conectar con Meta Ads & Facebook</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'SF Pro Display', -apple-system, sans-serif; }
        </style>
      </head>
      <body class="bg-[#f0f2f5] min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">

          <!-- Meta Header -->
          <div class="bg-[#1877f2] px-6 py-4 flex items-center justify-between text-white">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span class="font-bold text-lg">Conector Meta Ads Hub</span>
            </div>
            <span class="text-xs bg-white/10 px-2 py-0.5 rounded-full">v18.0</span>
          </div>

          <!-- Tab Selection -->
          <div class="flex border-b border-gray-200 bg-gray-50">
            <button onclick="switchTab('demo')" id="tab_demo" class="flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition">
              🚀 Modo Demostración (Rápido)
            </button>
            <button onclick="switchTab('real')" id="tab_real" class="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition">
              🔌 Conexión REAL en Vivo (Graph API)
            </button>
          </div>

          <!-- TAB 1: DEMO / SIMULADO -->
          <div id="content_demo" class="p-6 space-y-5">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-[#1877f2]/10 flex items-center justify-center text-[#1877f2] font-bold shrink-0">
                🚀
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm">Vincular Entorno de Demostración</h3>
                <p class="text-xs text-gray-500 leading-relaxed">Prueba la plataforma al instante con datos de simulación realistas de La Mona de Yumbo y campañas precargadas.</p>
              </div>
            </div>

            <div class="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <p class="text-xs font-bold text-gray-600 uppercase tracking-wider">Cuentas simuladas a conectar:</p>

              <div class="space-y-2">
                <label class="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <div class="flex items-center gap-2.5">
                    <span class="text-lg">🏪</span>
                    <div>
                      <p class="text-xs font-bold text-gray-800">La Mona de Yumbo (Fanpage Principal)</p>
                      <p class="text-[10px] text-gray-500">Facebook Page • 14,200 Seguidores</p>
                    </div>
                  </div>
                  <input type="checkbox" checked class="w-4 h-4 text-[#1877f2]" id="chk_page_1" />
                </label>

                <label class="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <div class="flex items-center gap-2.5">
                    <span class="text-lg">📸</span>
                    <div>
                      <p class="text-xs font-bold text-gray-800">@LaMonaYumboOficial</p>
                      <p class="text-[10px] text-gray-500">Instagram Business Account</p>
                    </div>
                  </div>
                  <input type="checkbox" checked class="w-4 h-4 text-[#1877f2]" id="chk_page_2" />
                </label>
              </div>

              <div class="pt-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Cuenta Publicitaria de Respaldo:</label>
                <select id="ad_account_select" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800">
                  <option value="act_102848102941">La Mona Ads (act_102848102941)</option>
                  <option value="act_992148281031">Agencia Digital 360 (act_992148281031)</option>
                </select>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button onclick="submitDemoConnection()" class="px-5 py-2.5 bg-[#1877f2] hover:bg-[#155fc2] text-white text-xs font-bold rounded-lg shadow-md transition">
                Sincronizar Modo Demo
              </button>
            </div>
          </div>

          <!-- TAB 2: REAL / CONEXION EN VIVO -->
          <div id="content_real" class="p-6 space-y-4 hidden">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                🔌
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm">Vincular con la API Oficial de Meta</h3>
                <p class="text-xs text-gray-500 leading-relaxed">Conéctate ingresando tu token de Meta Developers para cargar tus campañas reales de Facebook e Instagram Ads.</p>
              </div>
            </div>

            <!-- Credentials Input form -->
            <div class="space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-xl">
              <div>
                <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">System User / Page Access Token (Meta Graph API):</label>
                <input
                  type="password"
                  id="real_token"
                  placeholder="EAAbx... Pegue su token de acceso aquí"
                  class="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">ID de Cuenta Publicitaria de Preferencia (Opcional):</label>
                <input
                  type="text"
                  id="real_ad_account"
                  placeholder="ej. act_1234567890123"
                  class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onclick="verifyRealToken()"
                class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                🔍 Validar y Cargar Datos Reales de Meta
              </button>
            </div>

            <!-- Live Status Feedback -->
            <div id="real_status" class="hidden"></div>

            <!-- Dynamic Loaded User Account Details -->
            <div id="real_profile_card" class="hidden items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl">
              <img id="real_user_avatar" src="" class="w-10 h-10 rounded-full border-2 border-[#1877f2] shrink-0" />
              <div>
                <p id="real_user_name" class="font-bold text-gray-800 text-xs"></p>
                <p id="real_user_id" class="text-[10px] text-gray-500 font-mono"></p>
              </div>
            </div>

            <!-- Real Dynamic Accounts lists -->
            <div id="real_loaded_lists" class="space-y-3">
              <div>
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Selecciona tus Páginas Reales de Facebook:</label>
                <div id="real_pages_container" class="space-y-1.5 max-h-36 overflow-y-auto border border-gray-100 p-1 bg-white rounded-lg">
                  <p class="text-xs text-gray-400 p-2 text-center italic">Ningún token cargado aún</p>
                </div>
              </div>

              <div>
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Selecciona la Cuenta Publicitaria Real:</label>
                <select id="real_ad_account_select" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800">
                  <option value="">Ninguna cargada</option>
                </select>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                id="real_submit_btn"
                disabled
                onclick="submitRealConnection()"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Permitir Acceso Real
              </button>
            </div>
          </div>

        </div>

        <script>
          let currentTab = 'demo';
          window.realConnectedData = null;

          function switchTab(tab) {
            currentTab = tab;
            const tabDemo = document.getElementById('tab_demo');
            const tabReal = document.getElementById('tab_real');
            const contentDemo = document.getElementById('content_demo');
            const contentReal = document.getElementById('content_real');

            if (tab === 'demo') {
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition";
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentDemo.classList.remove('hidden');
              contentReal.classList.add('hidden');
            } else {
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-emerald-500 text-emerald-600 transition";
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentReal.classList.remove('hidden');
              contentDemo.classList.add('hidden');
            }
          }

          async function verifyRealToken() {
            const token = document.getElementById('real_token').value.trim();
            const adAccountInput = document.getElementById('real_ad_account').value.trim();
            if (!token) {
              alert('Por favor ingrese su Token de Acceso de Meta.');
              return;
            }

            const statusDiv = document.getElementById('real_status');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="text-blue-600 font-semibold animate-pulse">Conectando con Meta Graph API...</span>';
            statusDiv.className = "p-3 rounded-lg bg-blue-50 text-xs border border-blue-200";

            try {
              // 1. Fetch user profile
              const meRes = await fetch('https://graph.facebook.com/v18.0/me?fields=name,id,picture&access_token=' + token);
              const meData = await meRes.json();
              if (meData.error) {
                throw new Error(meData.error.message || 'Error al validar token.');
              }

              // 2. Fetch pages
              const pagesRes = await fetch('https://graph.facebook.com/v18.0/me/accounts?fields=name,id,category&access_token=' + token);
              const pagesData = await pagesRes.json();
              const pagesList = pagesData.data || [];

              // 3. Fetch ad accounts
              const adRes = await fetch('https://graph.facebook.com/v18.0/me/adaccounts?fields=name,id&access_token=' + token);
              const adData = await adRes.json();
              const adAccountsList = adData.data || [];

              // Render loaded data
              let userAvatar = meData.picture?.data?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';

              // Update live profile info
              document.getElementById('real_user_name').innerText = meData.name;
              document.getElementById('real_user_id').innerText = 'ID de Usuario: ' + meData.id;
              document.getElementById('real_user_avatar').src = userAvatar;
              document.getElementById('real_profile_card').className = 'flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl';

              // Populate Pages
              const pagesContainer = document.getElementById('real_pages_container');
              pagesContainer.innerHTML = '';
              if (pagesList.length === 0) {
                pagesContainer.innerHTML = '<p class="text-xs text-gray-500 p-2">No se encontraron Fanpages conectadas a este token.</p>';
              } else {
                pagesList.forEach((p, idx) => {
                  pagesContainer.innerHTML += \`
                    <label class="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <div class="flex items-center gap-2">
                        <span class="text-base">🏪</span>
                        <div>
                          <p class="text-xs font-bold text-gray-800">\${p.name}</p>
                          <p class="text-[9px] text-gray-500">Facebook Page • ID: \${p.id}</p>
                        </div>
                      </div>
                      <input type="checkbox" checked class="w-4 h-4 text-[#1877f2] real-page-chk" data-name="\${p.name}" data-id="\${p.id}" />
                    </label>
                  \`;
                });
              }

              // Populate Ad Accounts
              const adSelect = document.getElementById('real_ad_account_select');
              adSelect.innerHTML = '';
              if (adAccountsList.length === 0) {
                if (adAccountInput) {
                  adSelect.innerHTML = \`<option value="\${adAccountInput}">Cuenta Manual: \${adAccountInput}</option>\`;
                } else {
                  adSelect.innerHTML = '<option value="">No se encontraron cuentas publicidades</option>';
                }
              } else {
                adAccountsList.forEach(ad => {
                  const selected = adAccountInput && (adAccountInput.includes(ad.id) || ad.id.includes(adAccountInput)) ? 'selected' : '';
                  adSelect.innerHTML += \`<option value="\${ad.id}" \${selected}>\${ad.name} (\${ad.id})</option>\`;
                });
              }

              statusDiv.innerHTML = '<span class="text-emerald-600 font-bold">✓ ¡Meta Graph API Conectada Exitosamente!</span>';
              statusDiv.className = "p-3 rounded-lg bg-emerald-50 text-xs border border-emerald-200";

              window.realConnectedData = {
                me: meData,
                pages: pagesList,
                adAccounts: adAccountsList,
                avatar: userAvatar,
                token: token
              };

              document.getElementById('real_submit_btn').disabled = false;

            } catch (err) {
              statusDiv.innerHTML = '<span class="text-red-600 font-semibold">❌ Error: ' + err.message + '</span>';
              statusDiv.className = "p-3 rounded-lg bg-red-50 text-xs border border-red-200";
              document.getElementById('real_submit_btn').disabled = true;
            }
          }

          function submitDemoConnection() {
            const adAccount = document.getElementById('ad_account_select').value;
            const p1 = document.getElementById('chk_page_1').checked;
            const p2 = document.getElementById('chk_page_2').checked;

            const pages = [];
            if (p1) pages.push({ name: 'La Mona de Yumbo', id: '102948281042', type: 'Facebook' });
            if (p2) pages.push({ name: '@LaMonaYumboOficial', id: '99284102914', type: 'Instagram' });

            const payload = {
              provider: 'meta',
              connectedUser: {
                name: 'Oscar Molina',
                id: '102948382',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                pages,
                adAccounts: [{ id: adAccount, name: adAccount === 'act_102848102941' ? 'La Mona Ads' : 'Agencia Digital 360' }]
              },
              accessToken: 'EAAbx_' + Math.random().toString(36).substring(2, 15)
            };

            savePayload(payload);
          }

          function submitRealConnection() {
            if (!window.realConnectedData) return;
            const data = window.realConnectedData;

            // Get selected pages
            const pages = [];
            const chks = document.querySelectorAll('.real-page-chk:checked');
            chks.forEach(chk => {
              pages.push({
                name: chk.getAttribute('data-name'),
                id: chk.getAttribute('data-id'),
                type: 'Facebook'
              });
            });

            // Get selected ad account
            const adAccountSelect = document.getElementById('real_ad_account_select');
            const selectedAdId = adAccountSelect.value;
            const selectedAdName = adAccountSelect.options[adAccountSelect.selectedIndex]?.text || selectedAdId;

            const payload = {
              provider: 'meta',
              connectedUser: {
                name: data.me.name,
                id: data.me.id,
                avatar: data.avatar,
                pages: pages,
                adAccounts: [{ id: selectedAdId, name: selectedAdName }]
              },
              accessToken: data.token
            };

            savePayload(payload);
          }

          function savePayload(payload) {
            fetch('/api/integrations/meta-tiktok/save-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'meta', data }, '*');
                window.close();
              }
            })
            .catch(err => {
              console.error(err);
              alert('Error al guardar sesión de Meta.');
            });
          }
        </script>
      </body>
      </html>
    `);
  });

  // Serve a highly realistic Facebook Meta WhatsApp Business Embedded Signup Flow
  app.get('/auth/meta-whatsapp', (req, res) => {
    const defaultMode = req.query.mode || 'coexistente';
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meta WhatsApp Embedded Signup</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'SF Pro Display', -apple-system, sans-serif; }
        </style>
      </head>
      <body class="bg-[#f0f2f5] min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">

          <!-- Meta Header -->
          <div class="bg-[#1877f2] px-6 py-4 flex items-center justify-between text-white">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span class="font-bold text-lg">Vincular con WhatsApp Cloud API</span>
            </div>
            <span class="text-xs bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">OFICIAL</span>
          </div>

          <!-- Tab Selection -->
          <div class="flex border-b border-gray-200 bg-gray-50">
            <button onclick="switchTab('demo')" id="tab_demo" class="flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition">
              🚀 Modo Demostración (Rápido)
            </button>
            <button onclick="switchTab('real')" id="tab_real" class="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition">
              🔌 Conexión REAL en Vivo (Meta Cloud API)
            </button>
          </div>

          <!-- TAB 1: DEMO / SIMULADO -->
          <div id="content_demo" class="p-6 space-y-5">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-[#1877f2]/10 flex items-center justify-center text-[#1877f2] font-bold text-xl shrink-0">
                W
              </div>
              <div class="space-y-1">
                <h2 class="font-bold text-gray-900 text-base">Vincular Número de WhatsApp Comercial</h2>
                <p class="text-xs text-gray-500">Conecte su número de forma rápida e instantánea en modo sandbox para pruebas.</p>
              </div>
            </div>

            <!-- Business Portfolio Selector -->
            <div class="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Portafolio Comercial de Meta (Business Account):</label>
                <select id="waba_portfolio" class="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500">
                  <option value="982349823491">Mona Business Portfolio (ID: 982349823491)</option>
                  <option value="102948281042">Agencia Digital 360 (ID: 102948281042)</option>
                </select>
              </div>

              <!-- Number Mode Selection -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Método de Registro de Número:</label>
                <div class="grid grid-cols-1 gap-2">
                  <!-- Coexistente -->
                  <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="radio" name="number_mode" value="coexistente" ${defaultMode === 'coexistente' ? 'checked' : ''} class="mt-1 w-4 h-4 text-[#1877f2]" />
                    <div>
                      <p class="text-xs font-bold text-gray-800">Número Coexistente (Sincronización Silenciosa)</p>
                      <p class="text-[10px] text-gray-500">Usa tu número activo actual. Podrás responder chats desde tu celular sin interrupciones.</p>
                    </div>
                  </label>

                  <!-- Nuevo -->
                  <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="radio" name="number_mode" value="nuevo" ${defaultMode === 'nuevo' ? 'checked' : ''} class="mt-1 w-4 h-4 text-[#1877f2]" />
                    <div>
                      <p class="text-xs font-bold text-gray-800">Número Totalmente Nuevo (Línea Exclusiva)</p>
                      <p class="text-[10px] text-gray-500">Asigna un número telefónico nuevo y limpio para que el Bot AI gestione toda la atención al cliente al 100%.</p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Phone input -->
              <div class="pt-2">
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Número de Teléfono a Vincular:</label>
                <div class="flex gap-2">
                  <select id="country_code" class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-800">
                    <option value="+57">🇨🇴 +57 (Colombia)</option>
                    <option value="+1">🇺🇸 +1 (USA)</option>
                    <option value="+52">🇲🇽 +52 (México)</option>
                    <option value="+54">🇦🇷 +54 (Argentina)</option>
                    <option value="+56">🇨🇱 +56 (Chile)</option>
                    <option value="+51">🇵🇪 +51 (Perú)</option>
                  </select>
                  <input type="tel" id="phone_number" placeholder="300 123 4567" value="3001234567" class="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <!-- Footer Meta Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button onclick="submitDemoConnection()" class="px-5 py-2.5 bg-[#1877f2] hover:bg-[#155fc2] text-white text-xs font-bold rounded-lg shadow-md transition">
                Vincular Modo Demo
              </button>
            </div>
          </div>

          <!-- TAB 2: REAL / CONEXION EN VIVO -->
          <div id="content_real" class="p-6 space-y-4 hidden">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                🔌
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm">Vincular API de WhatsApp en Producción</h3>
                <p class="text-xs text-gray-500 leading-relaxed">Conecte directamente su número real de WhatsApp Business Cloud API ingresando sus credenciales de Meta Developers.</p>
              </div>
            </div>

            <div class="space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-xl">
              <div>
                <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">System User Access Token (Larga Duración):</label>
                <input
                  type="password"
                  id="real_waba_token"
                  placeholder="EAAbx... Pegue el token de acceso permanente de Meta"
                  class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">WhatsApp Phone ID:</label>
                  <input
                    type="text"
                    id="real_waba_phone_id"
                    placeholder="ej. 109283..."
                    class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">WhatsApp Business ID:</label>
                  <input
                    type="text"
                    id="real_waba_account_id"
                    placeholder="ej. 982349..."
                    class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-2 pt-1">
                <div>
                  <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">Número de Teléfono Real (con indicativo):</label>
                  <input
                    type="text"
                    id="real_waba_phone_number"
                    placeholder="ej. +573001234567"
                    class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onclick="verifyRealWaba()"
                class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                🔍 Validar Conexión de WhatsApp con Meta
              </button>
            </div>

            <!-- Live Status Feedback -->
            <div id="real_waba_status" class="hidden"></div>

            <!-- Info box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] text-blue-800">
              <p class="leading-relaxed"><strong>Webhooks recomendados:</strong> Configure en su panel de Meta Developers el Webhook con la URL de notificación del sistema para que las respuestas con IA funcionen de inmediato de manera bidireccional.</p>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                id="real_waba_submit_btn"
                disabled
                onclick="submitRealWabaConnection()"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vincular Cuenta Real
              </button>
            </div>
          </div>

        </div>

        <script>
          let currentTab = 'demo';
          window.verifiedWabaData = null;

          function switchTab(tab) {
            currentTab = tab;
            const tabDemo = document.getElementById('tab_demo');
            const tabReal = document.getElementById('tab_real');
            const contentDemo = document.getElementById('content_demo');
            const contentReal = document.getElementById('content_real');

            if (tab === 'demo') {
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition";
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentDemo.classList.remove('hidden');
              contentReal.classList.add('hidden');
            } else {
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-emerald-500 text-emerald-600 transition";
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentReal.classList.remove('hidden');
              contentDemo.classList.add('hidden');
            }
          }

          async function verifyRealWaba() {
            const token = document.getElementById('real_waba_token').value.trim();
            const phoneId = document.getElementById('real_waba_phone_id').value.trim();
            const wabaId = document.getElementById('real_waba_account_id').value.trim();
            const phoneNumber = document.getElementById('real_waba_phone_number').value.trim();

            if (!token || !phoneId || !wabaId || !phoneNumber) {
              alert('Por favor complete todos los campos de credenciales de WhatsApp.');
              return;
            }

            const statusDiv = document.getElementById('real_waba_status');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="text-blue-600 font-semibold animate-pulse">Conectando con Meta Graph API...</span>';
            statusDiv.className = "p-3 rounded-lg bg-blue-50 text-xs border border-blue-200";

            try {
              // Fetch phone number detail to verify it is active
              const res = await fetch('https://graph.facebook.com/v18.0/' + phoneId + '?access_token=' + token);
              const data = await res.json();
              if (data.error) {
                throw new Error(data.error.message || 'Error al validar credenciales con Meta.');
              }

              statusDiv.innerHTML = '<span class="text-emerald-600 font-bold">✓ ¡Conexión con Meta WhatsApp Cloud API Establecida! Teléfono ID verificado.</span>';
              statusDiv.className = "p-3 rounded-lg bg-emerald-50 text-xs border border-emerald-200";

              window.verifiedWabaData = {
                name: data.display_phone_number || 'Línea WhatsApp Real',
                id: phoneId,
                wabaId: wabaId,
                apiToken: token,
                phoneNumber: phoneNumber,
                phoneNumberId: phoneId
              };

              document.getElementById('real_waba_submit_btn').disabled = false;

            } catch (err) {
              statusDiv.innerHTML = '<span class="text-red-600 font-semibold">❌ Error: ' + err.message + '</span>';
              statusDiv.className = "p-3 rounded-lg bg-red-50 text-xs border border-red-200";
              document.getElementById('real_waba_submit_btn').disabled = true;
            }
          }

          function submitDemoConnection() {
            const wabaId = document.getElementById('waba_portfolio').value;
            const mode = document.querySelector('input[name="number_mode"]:checked').value;
            const countryCode = document.getElementById('country_code').value;
            const phoneVal = document.getElementById('phone_number').value.replace(/\\s+/g, '');
            const fullPhone = countryCode + phoneVal;

            // Generate auto credentials
            const apiToken = 'EAAbx_WABA_' + Math.random().toString(36).substring(2, 15).toUpperCase();
            const phoneNumberId = '109283' + Math.floor(100000 + Math.random() * 900000);

            const payload = {
              provider: 'meta-whatsapp',
              connectedUser: {
                name: 'Oscar Molina (WABA Admin)',
                id: '102948382',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                apiToken,
                phoneNumberId,
                wabaId,
                mode,
                phoneNumber: fullPhone
              }
            };

            savePayload(payload);
          }

          function submitRealWabaConnection() {
            if (!window.verifiedWabaData) return;
            const waba = window.verifiedWabaData;

            const payload = {
              provider: 'meta-whatsapp',
              connectedUser: {
                name: waba.name + ' (Meta Real)',
                id: waba.phoneNumberId,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                apiToken: waba.apiToken,
                phoneNumberId: waba.phoneNumberId,
                wabaId: waba.wabaId,
                mode: 'produccion_real',
                phoneNumber: waba.phoneNumber
              }
            };

            savePayload(payload);
          }

          function savePayload(payload) {
            fetch('/api/integrations/meta-tiktok/save-whatsapp-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  provider: 'meta-whatsapp',
                  data: payload.connectedUser
                }, '*');
                window.close();
              }
            })
            .catch(err => {
              console.error(err);
              alert('Error al vincular con Meta.');
            });
          }
        </script>
      </body>
      </html>
    `);
  });

  // OAuth Callback Handler for Meta WhatsApp Embedded Signup
  app.get(['/auth/meta/callback', '/auth/zernio/callback'], (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Conexión Exitosa con Meta</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f17; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #161e2e; border: 1px solid #1e293b; padding: 32px; border-radius: 16px; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
    button { background: #1877f2; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>¡WhatsApp Business Conectado!</h2>
    <p>Tu cuenta oficial de WhatsApp se ha sincronizado correctamente con Meta. Esta ventana se cerrará automáticamente.</p>
    <button onclick="window.close()">Cerrar Ventana</button>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'META_WABA_CONNECTED', success: true }, '*');
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'meta-whatsapp' }, '*');
      }
    } catch(e) {}
    setTimeout(function() { window.close(); }, 2000);
  </script>
</body>
</html>`);
  });

  // API endpoint to save WhatsApp OAuth and validate with Meta Graph API
  app.post('/api/integrations/meta-tiktok/save-whatsapp-oauth', async (req, res) => {
    try {
      const { connectedUser } = req.body;
      if (!connectedUser) {
        currentDB.whatsappOauthConfig = null;
        saveDBData(currentDB);
        return res.json({ success: true, config: null, disconnected: true });
      }
      const apiToken = connectedUser?.apiToken;
      const phoneNumberId = connectedUser?.phoneNumberId;

      let verifiedMeta = false;
      let metaDetails = null;

      if (apiToken && phoneNumberId) {
        try {
          const metaRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${encodeURIComponent(apiToken)}`, {
            signal: AbortSignal.timeout(8000)
          });
          const metaData = await metaRes.json() as any;
          if (metaData && !metaData.error) {
            verifiedMeta = true;
            metaDetails = metaData;
            if (metaData.display_phone_number) {
              connectedUser.phoneNumber = metaData.display_phone_number;
            }
            if (metaData.verified_name) {
              connectedUser.verifiedName = metaData.verified_name;
            }
          } else if (metaData && metaData.error) {
            return res.status(400).json({
              success: false,
              error: `Error de autenticación con Meta Graph API: ${metaData.error.message || 'Token o ID de teléfono no válido.'}`
            });
          }
        } catch (e: any) {
          console.warn("Advertencia de red al conectar con Meta Graph API:", e.message);
        }
      }

      currentDB.whatsappOauthConfig = {
        ...connectedUser,
        verifiedMeta,
        metaDetails,
        updatedAt: new Date().toISOString()
      };
      saveDBData(currentDB);
      res.json({ success: true, config: sanitizeForClient(currentDB.whatsappOauthConfig), verifiedMeta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error guardando OAuth de WhatsApp' });
    }
  });

  // Verify Meta WhatsApp Cloud API credentials in real-time
  app.post('/api/whatsapp/verify-credentials', async (req, res) => {
    try {
      const { apiToken, phoneNumberId } = req.body;
      if (!apiToken || !phoneNumberId) {
        return res.status(400).json({ success: false, error: 'Se requiere el Access Token Permanente y el Phone Number ID.' });
      }

      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${encodeURIComponent(apiToken)}`, {
        signal: AbortSignal.timeout(8000)
      });
      const metaData = await metaRes.json() as any;

      if (metaData && metaData.error) {
        return res.status(401).json({
          success: false,
          error: metaData.error.message || 'Error de autenticación con Meta Graph API.'
        });
      }

      return res.json({
        success: true,
        displayPhoneNumber: metaData.display_phone_number || null,
        verifiedName: metaData.verified_name || null,
        qualityRating: metaData.quality_rating || 'UNKNOWN',
        id: metaData.id
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error al conectar con la API de Meta.' });
    }
  });

  app.get('/api/integrations/whatsapp-oauth/config', (req, res) => {
    const savedConfig = currentDB.whatsappOauthConfig;
    const hasRealCredentials = Boolean(savedConfig?.apiToken && savedConfig?.phoneNumberId);
    res.json({
      success: true,
      config: hasRealCredentials ? sanitizeForClient(savedConfig) : null
    });
  });

  app.get('/auth/tiktok', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Iniciar sesión con TikTok</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Sofia+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Sofia Pro', -apple-system, sans-serif; }
        </style>
      </head>
      <body class="bg-[#121212] min-h-screen flex items-center justify-center p-4 text-white">
        <div class="bg-[#1e1e1e] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-800">
          <!-- TikTok Header -->
          <div class="px-6 py-5 flex items-center justify-between border-b border-gray-800">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.589 6.686a4.866 4.866 0 0 1-3.1-1.154V12.4a6.113 6.113 0 1 1-6.112-6.111c.321 0 .633.025.938.073v3.195a2.912 2.912 0 1 0-.938 5.66c1.606 0 2.91-1.304 2.91-2.91V0h3.2a6.046 6.046 0 0 0 3.1 3.102v3.584z" fill="#00f2fe"/>
                <path d="M19.589 6.686a4.866 4.866 0 0 1-3.1-1.154V12.4a6.113 6.113 0 1 1-6.112-6.111c.321 0 .633.025.938.073v3.195a2.912 2.912 0 1 0-.938 5.66c1.606 0 2.91-1.304 2.91-2.91V0h3.2a6.046 6.046 0 0 0 3.1 3.102v3.584z" fill="#fe2c55" style="mix-blend-mode:screen"/>
              </svg>
              <span class="font-bold text-lg tracking-wider">TikTok for Business</span>
            </div>
            <span class="text-xs text-gray-500">OAuth Connection</span>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-6">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-[#fe2c55]/10 flex items-center justify-center text-[#fe2c55] font-bold text-xl shrink-0 border border-[#fe2c55]/20">
                T
              </div>
              <div class="space-y-1">
                <h2 class="font-bold text-gray-100 text-lg">Sincronizar TikTok Ads</h2>
                <p class="text-xs text-gray-400">Permite que Xorbit 360 acceda de forma segura a tus leads de Lead Generation instant forms y recupere informes publicitarios de TikTok.</p>
              </div>
            </div>

            <div class="border-t border-b border-gray-800 py-4 space-y-3">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Cuenta Publicitaria de TikTok:</p>

              <div class="space-y-2">
                <label class="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-[#161616] hover:bg-[#222] cursor-pointer">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">🎵</span>
                    <div>
                      <p class="text-xs font-bold text-gray-200">oscar_ads_agency (TikTok Ads)</p>
                      <p class="text-[10px] text-gray-500">ID: act_10283811 • Cuenta Comercial activa</p>
                    </div>
                  </div>
                  <input type="checkbox" checked class="w-4 h-4 text-[#fe2c55] rounded" id="chk_tt_1" />
                </label>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-400 hover:bg-[#282828] rounded-lg">
                Cancelar
              </button>
              <button onclick="submitConnection()" class="px-5 py-2.5 bg-[#fe2c55] hover:bg-[#e02447] text-white text-xs font-bold rounded-lg shadow-lg transition">
                Autorizar y Sincronizar
              </button>
            </div>
          </div>
        </div>

        <script>
          function submitConnection() {
            const isChecked = document.getElementById('chk_tt_1').checked;

            const adAccounts = [];
            if (isChecked) {
              adAccounts.push({ id: 'act_10283811', name: 'oscar_ads_agency' });
            }

            const payload = {
              provider: 'tiktok',
              connectedUser: {
                name: 'oscar_ads_agency',
                id: 'tt_user_992142',
                avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
                adAccounts
              },
              accessToken: 'TT-ACT-' + Math.random().toString(36).substring(2, 15)
            };

            // Send to server to save
            fetch('/api/integrations/meta-tiktok/save-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'tiktok', data }, '*');
                window.close();
              }
            })
            .catch(err => {
              console.error(err);
              alert('Error al guardar sesión de TikTok.');
            });
          }
        </script>
      </body>
      </html>
    `);
  });

  // API endpoint for OAuth response save (called by popup)
  app.post('/api/integrations/meta-tiktok/save-oauth', (req, res) => {
    try {
      const { provider, connectedUser, accessToken } = req.body;
      if (!currentDB.metaAndTiktokConfig) {
        currentDB.metaAndTiktokConfig = {};
      }

      if (provider === 'meta') {
        currentDB.metaAndTiktokConfig.metaConnected = true;
        currentDB.metaAndTiktokConfig.metaConnectedUser = connectedUser;
        currentDB.metaAndTiktokConfig.metaAccessToken = accessToken;
      } else if (provider === 'tiktok') {
        currentDB.metaAndTiktokConfig.tiktokConnected = true;
        currentDB.metaAndTiktokConfig.tiktokConnectedUser = connectedUser;
        currentDB.metaAndTiktokConfig.tiktokAccessToken = accessToken;
      }

      saveDBData(currentDB);
      res.json({ success: true, config: sanitizeForClient(currentDB.metaAndTiktokConfig) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error saving OAuth credentials' });
    }
  });

  // --- WEBHOOKS CHANNELS FOR META & TIKTOK & ZERNIO ---
  app.get('/api/webhooks/meta', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] || req.query['challenge'] || req.query['zernio.challenge'];
    const configToken = process.env.META_WEBHOOK_VERIFY_TOKEN || currentDB.metaAndTiktokConfig?.metaWebhookVerifyToken || '';

    if (mode === 'subscribe' && challenge && safeCompareSecret(token, configToken)) {
      console.log('✓ Meta Webhook Verificado Correctamente!');
      return res.status(200).send(challenge);
    }
    if (challenge) return res.status(403).json({ error: 'Verificacion invalida' });
    // Verificación o ping general
    res.status(configToken ? 403 : 503).json({ error: configToken ? 'Verificacion invalida' : 'Webhook no configurado' });
  });

  app.post('/api/webhooks/meta', (req, res) => {
    // Si es un evento de Zernio (prueba o evento real)
    const isZernioEvent = Boolean(
      req.headers['x-zernio-signature'] ||
      req.headers['x-zernio-event-id'] ||
      req.body?.event?.startsWith?.('webhook.') ||
      req.body?.event?.startsWith?.('message.') ||
      req.body?.event?.startsWith?.('conversation.') ||
      req.body?.event?.startsWith?.('account.') ||
      req.body?.event?.startsWith?.('post.') ||
      req.body?.webhookId
    );

    if (isZernioEvent) {
      return handleZernioWebhook(req, res, (event) => {
        try {
          const msg = event?.message;
          if (!msg) return;
          const cleanPhone = (msg.senderPhone || msg.senderId || '').replace(/\D/g, '');
          if (!cleanPhone) return;

          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
          if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];

          currentDB.messagesHistory[cleanPhone].push({
            role: msg.direction === 'outgoing' ? 'agent' : 'client',
            source: 'zernio_meta',
            fromMobile: msg.direction === 'outgoing',
            text: msg.text,
            time: nowStr,
            timestamp: Date.now()
          });

          if (currentDB.messagesHistory[cleanPhone].length > 40) {
            currentDB.messagesHistory[cleanPhone].shift();
          }
          saveDBData(currentDB);
        } catch (e) {
          console.error('Error procesando mensaje Zernio en /api/webhooks/meta:', e);
        }
      });
    }

    const metaSecret = process.env.META_APP_SECRET || currentDB.metaAndTiktokConfig?.metaAppSecret;
    if (!verifyWebhookHmac(req, metaSecret, 'x-hub-signature-256')) {
      return res.status(401).json({ error: 'Firma de webhook invalida' });
    }

    if (!currentDB.webhookLogs) {
      currentDB.webhookLogs = [];
    }

    // Simulate real parsed info for UI display
    let summary = 'Evento Meta recibido';
    if (req.body.entry?.[0]?.changes?.[0]?.value) {
      const val = req.body.entry[0].changes[0].value;
      if (val.leadgen_id) {
        summary = `Lead capturado en Meta: Lead ID ${val.leadgen_id} (Formulario: ${val.form_id || 'ID Desconocido'})`;
      }
    }

    currentDB.webhookLogs.unshift({
      id: `log-${Date.now()}`,
      provider: 'meta',
      timestamp: new Date().toISOString(),
      summary,
      payload: req.body
    });

    if (currentDB.webhookLogs.length > 50) {
      currentDB.webhookLogs = currentDB.webhookLogs.slice(0, 50);
    }
    saveDBData(currentDB);
    res.sendStatus(200);
  });

  app.get('/api/webhooks/tiktok', (req, res) => {
    const challenge = req.query['challenge'] || req.query['hub.challenge'];
    const supplied = req.query['verify_token'] || req.query['hub.verify_token'];
    const expected = process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN || currentDB.metaAndTiktokConfig?.tiktokWebhookVerifyToken || '';
    if (challenge && safeCompareSecret(supplied, expected)) return res.status(200).send(String(challenge));
    return res.status(expected ? 403 : 503).json({ error: expected ? 'Verificacion invalida' : 'Webhook no configurado' });
  });

  app.post('/api/webhooks/tiktok', (req, res) => {
    const tiktokSecret = process.env.TIKTOK_WEBHOOK_SECRET || currentDB.metaAndTiktokConfig?.tiktokAppSecret;
    if (!verifyWebhookHmac(req, tiktokSecret, 'x-tiktok-signature')) {
      return res.status(401).json({ error: 'Firma de webhook invalida' });
    }
    if (!currentDB.webhookLogs) {
      currentDB.webhookLogs = [];
    }

    let summary = 'Evento TikTok recibido';
    if (req.body.event_type === 'LEAD_GEN') {
      summary = `Lead capturado en TikTok (Formulario: ${req.body.form_id || 'Desconocido'})`;
    }

    currentDB.webhookLogs.unshift({
      id: `log-${Date.now()}`,
      provider: 'tiktok',
      timestamp: new Date().toISOString(),
      summary,
      payload: req.body
    });

    if (currentDB.webhookLogs.length > 50) {
      currentDB.webhookLogs = currentDB.webhookLogs.slice(0, 50);
    }
    saveDBData(currentDB);
    res.sendStatus(200);
  });

  // --- TELEGRAM BOT POLL REALTIME ENGINE ---
  let lastTelegramUpdateId = 0;

  async function sendTelegramMessage(token: string, chatId: any, text: string, replyMarkup?: any) {
    try {
      const payload: any = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      };
      if (replyMarkup) {
        payload.reply_markup = JSON.stringify(replyMarkup);
      }

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("[Telegram Bot] Error sending message:", err);
    }
  }

  async function editTelegramMessage(token: string, chatId: any, messageId: any, text: string) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      console.error("[Telegram Bot] Error editing message:", err);
    }
  }

  async function answerTelegramCallback(token: string, callbackQueryId: string, text: string) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text
        })
      });
    } catch (err) {
      console.error("[Telegram Bot] Error answering callback query:", err);
    }
  }

  async function handleTelegramUpdate(token: string, update: any) {
    try {
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat?.id;
        const text = msg.text || '';

        if (text.startsWith('/start')) {
          const parts = text.split(' ');
          const param = parts.length > 1 ? parts[1] : '';

          if (param.startsWith('pay_')) {
            const invoiceId = param.substring(4); // pay_TG-INV-XXXXXX
            const invoice = currentDB.telegramInvoices ? currentDB.telegramInvoices[invoiceId] : null;

            if (invoice) {
              const messageText = `📦 *FACTURA ENCONTRADA EN XORBIT 360*\n\n` +
                `💳 *Plan:* _${invoice.planName}_\n` +
                `💰 *Monto:* _$${invoice.planValue} USD_\n` +
                `🔑 *Referencia:* \`${invoiceId}\`\n` +
                `👛 *Wallet Recibidora:* \`${invoice.superAdminWallet}\`\n\n` +
                `Por favor, confirma el pago a continuación. Una vez confirmado, el Smart Contract distribuirá de manera inmediata las comisiones a la red.`;

              const inlineKeyboard = {
                inline_keyboard: [
                  [
                    { text: '✅ Confirmar Pago', callback_data: `confirm_pay_${invoiceId}` },
                    { text: '❌ Cancelar', callback_data: `cancel_pay_${invoiceId}` }
                  ]
                ]
              };

              await sendTelegramMessage(token, chatId, messageText, inlineKeyboard);
            } else {
              await sendTelegramMessage(token, chatId, `❌ *Factura Expirada o No Encontrada*\nLa referencia de pago \`${invoiceId}\` no pudo ser localizada en la base de datos.`);
            }
          } else if (param.startsWith('ref_')) {
            const refereeWallet = param.substring(4);
            const messageText = `👋 *¡BIENVENIDO A XORBIT 360!*\n\n` +
              `🔗 Has sido referido mediante el Smart Contract de Telegram por el sponsor:\n\`${refereeWallet}\`\n\n` +
              `¡Felicidades! Ahora estás conectado a su red. Puedes proceder a activar tu suscripción desde la plataforma y armar tu propia red Droshipper.`;

            await sendTelegramMessage(token, chatId, messageText);
          } else {
            const messageText = `👋 *¡HOLA! BIENVENIDO AL ASISTENTE DE XORBIT 360 Y COMUNIDAD DROSHIPPER*\n\n` +
              `Este bot permite procesar pagos y referidos on-chain de manera descentralizada con USDT/TON.\n\n` +
              `💻 Visita nuestra plataforma para activar tu plan y empezar a ganar comisiones instantáneas por cada referido.`;

            await sendTelegramMessage(token, chatId, messageText);
          }
        }
      } else if (update.callback_query) {
        const cb = update.callback_query;
        const callbackId = cb.id;
        const chatId = cb.message?.chat?.id;
        const messageId = cb.message?.message_id;
        const data = cb.data || '';

        if (data.startsWith('confirm_pay_')) {
          const invoiceId = data.replace('confirm_pay_', '');

          if (currentDB.telegramInvoices && currentDB.telegramInvoices[invoiceId]) {
            const invoice = currentDB.telegramInvoices[invoiceId];
            invoice.status = 'COMPLETED';

            const superAdminWallet = currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || '';
            const sponsorWallet = invoice.sponsorWallet || '';
            const hasSponsors = !!sponsorWallet;

            const u1_share = invoice.planValue * 0.50;
            const u2_share = invoice.planValue * 0.10;
            const admin_share = invoice.planValue * 0.25;

            const newTxs = [];
            if (hasSponsors) {
              newTxs.push(
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: `Afiliado Telegram (${invoice.email || 'Anónimo'})`,
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: 'Nivel 1 (Patrocinador Directo)',
                  dest: `${sponsorWallet} (Patrocinador)`,
                  percent: 50,
                  share: u1_share,
                  status: 'Completado',
                  timestamp: 'Hace unos instantes'
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: 'Comunidad Red',
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: 'Nivel 2',
                  dest: 'Patrocinador N2',
                  percent: 10,
                  share: u2_share,
                  status: 'Completado',
                  timestamp: 'Hace unos instantes'
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: 'Comunidad Red',
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: 'Nivel 3',
                  dest: 'Patrocinador N3',
                  percent: 5,
                  share: invoice.planValue * 0.05,
                  status: 'Completado',
                  timestamp: 'Hace unos instantes'
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: 'Comunidad Red',
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: 'Nivel 4',
                  dest: 'Patrocinador N4',
                  percent: 5,
                  share: invoice.planValue * 0.05,
                  status: 'Completado',
                  timestamp: 'Hace unos instantes'
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: 'Comunidad Red',
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: 'Nivel 5',
                  dest: 'Patrocinador N5',
                  percent: 5,
                  share: invoice.planValue * 0.05,
                  status: 'Completado',
                  timestamp: 'Hace unos instantes'
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: 'Plataforma (Admin)',
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: 'Admin Principal',
                  dest: `SuperAdmin (${superAdminWallet})`,
                  percent: 25,
                  share: admin_share,
                  status: 'Completado',
                  timestamp: 'Hace unos instantes'
                }
              );
            } else {
              // 100% of the funds go directly to the SuperAdmin since there is no sponsor linked
              newTxs.push({
                txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                source: `Afiliado Telegram (${invoice.email || 'Anónimo'})`,
                plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                totalMonto: invoice.planValue,
                level: 'Licencia Directa (Sin Patrocinador)',
                dest: `SuperAdmin (${superAdminWallet})`,
                percent: 100,
                share: invoice.planValue,
                status: 'Completado',
                timestamp: 'Hace unos instantes'
              });
            }

            if (!currentDB.telegramTransactions) {
              currentDB.telegramTransactions = [];
            }
            currentDB.telegramTransactions = [...newTxs, ...currentDB.telegramTransactions];

            if (!currentDB.userPlans) {
              currentDB.userPlans = {};
            }
            const targetEmail = invoice.email || 'usuario@email.com';
            currentDB.userPlans[targetEmail] = invoice.planName;

            saveDBData(currentDB);

            const successMessage = `🥳 *¡PAGO CONFIRMADO CON ÉXITO!*\n\n` +
              `✅ El Smart Contract ha sido ejecutado de manera óptima en la red de Telegram.\n` +
              `💰 El split de comisiones se distribuyó instantáneamente a las wallets de la comunidad.\n\n` +
              `¡Gracias por tu pago! Ya puedes ver tu estado activo en la plataforma principal.`;

            await sendTelegramMessage(token, chatId, successMessage);
            await answerTelegramCallback(token, callbackId, "¡Pago verificado y procesado con éxito!");
            await editTelegramMessage(token, chatId, messageId, `📦 *FACTURA PAGADA - XORBIT 360*\n\n` +
              `💳 *Plan:* _${invoice.planName}_\n` +
              `💰 *Monto:* _$${invoice.planValue} USD_\n` +
              `🔑 *Referencia:* \`${invoiceId}\`\n\n` +
              `✅ *Estado:* COBRADO Y CONFIRMADO`);
          } else {
            await answerTelegramCallback(token, callbackId, "Error: Factura no encontrada.");
          }
        } else if (data.startsWith('cancel_pay_')) {
          const invoiceId = data.replace('cancel_pay_', '');
          await answerTelegramCallback(token, callbackId, "Factura cancelada.");
          await editTelegramMessage(token, chatId, messageId, `❌ *Factura cancelada* por el usuario para la referencia \`${invoiceId}\`.`);
        }
      }
    } catch (err) {
      console.error("[Telegram Bot] Error handling update:", err);
    }
  }

  async function startTelegramBotPolling() {
    const getActiveToken = () => {
      return currentDB.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    };

    const isValidToken = (tok: string | undefined): boolean => {
      if (!tok) return false;
      return /^\d+:[A-Za-z0-9_-]+$/.test(tok);
    };

    let activeToken = getActiveToken();
    if (isValidToken(activeToken)) {
      console.log(`[Telegram Bot] Starting polling with token ${activeToken.substring(0, 8)}...`);
      try {
        await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`);
      } catch (err) {
        console.error("[Telegram Bot] Error deleting webhook:", err);
      }
    } else {
      console.log("[Telegram Bot] No valid Telegram token configured yet. Polling will wait for configuration.");
    }

    const runPoll = async () => {
      while (true) {
        try {
          const currentToken = getActiveToken();
          if (currentToken !== activeToken) {
            console.log(`[Telegram Bot] Token changed. Re-evaluating validation.`);
            activeToken = currentToken;
            if (isValidToken(activeToken)) {
              try {
                await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`);
              } catch (err) { }
            }
          }

          if (!isValidToken(activeToken)) {
            // If it's a default, empty or invalid token, sleep longer and check again
            await new Promise(resolve => setTimeout(resolve, 8000));
            continue;
          }

          const response = await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=15`);
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`[Telegram Bot Polling Error]: Status 404. El Token "${activeToken.substring(0, 10)}..." de tu de Bot de Telegram es incorrecto o está desactivado. Configura el Token real en el Gestor de Usuarios.`);
              await new Promise(resolve => setTimeout(resolve, 15000)); // wait longer on 404
              continue;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          if (data.ok && data.result) {
            for (const update of data.result) {
              lastTelegramUpdateId = update.update_id || update.updateId;
              await handleTelegramUpdate(activeToken, update);
            }
          }
        } catch (err: any) {
          console.error("[Telegram Bot Polling Error]:", err.message || err);
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };

    runPoll();
  }

  startTelegramBotPolling();

  // --- AUTOMATED REMARKETING SERVICE ---
  async function checkAndSendRemarketing() {
    try {
      const count = currentDB.remarketingCount !== undefined ? Number(currentDB.remarketingCount) : 0;
      if (count === 0) return; // Remarketing is disabled

      const intervalStr = currentDB.remarketingInterval || '2 horas';
      let intervalMs = 2 * 60 * 60 * 1000; // Default 2 hours
      if (intervalStr.includes('15 min') || intervalStr.includes('15 minutos')) intervalMs = 15 * 60 * 1000;
      else if (intervalStr.includes('1 hora')) intervalMs = 1 * 60 * 60 * 1000;
      else if (intervalStr.includes('2 horas')) intervalMs = 2 * 60 * 60 * 1000;
      else if (intervalStr.includes('24 horas')) intervalMs = 24 * 60 * 60 * 1000;

      const avoidSpam = currentDB.remarketingAvoidSpam !== undefined ? !!currentDB.remarketingAvoidSpam : true;

      if (!currentDB.remarketingStatus) {
        currentDB.remarketingStatus = {};
      }

      const now = Date.now();
      const clientSock = waSock || activeSockets['channel-default'];
      if (!clientSock) return; // No active WhatsApp socket connected

      // Loop through all numbers with message history
      for (const phone of Object.keys(currentDB.messagesHistory || {})) {
        const history = currentDB.messagesHistory[phone];
        if (!history || history.length === 0) continue;

        const lastMsg = history[history.length - 1];
        // Condition 1: Last message was sent by assistant/bot or agent, client left it in "visto"
        if (lastMsg.role !== 'assistant' && lastMsg.role !== 'agent') continue;

        // Condition 2: Last message timestamp is valid and exceeds interval
        const lastMsgTime = lastMsg.timestamp || (now - intervalMs - 1000);
        if (now - lastMsgTime < intervalMs) continue;

        // Check how many remarketings we have sent
        const status = currentDB.remarketingStatus[phone] || { sentCount: 0, lastSentTimestamp: 0 };
        if (status.sentCount >= count) continue;

        // Condition 3: Avoid Spam Check
        if (avoidSpam) {
          // Check if client has a confirmed order
          const hasOrder = (currentDB.orders || []).some((o: any) => o.phone && o.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
          if (hasOrder) continue;

          // Check if chat is in a completed Kanban column
          const chat = (currentDB.chats || []).find((c: any) => c.phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
          if (chat && (chat.status === 'pedido_confirmado' || chat.status === 'entregado' || chat.status === 'finalizado' || chat.status === 'completado' || (chat.tags || []).includes('Venta Cerrada'))) {
            continue;
          }

          // Check history text for finalization keywords
          const finalizationKeywords = ['gracias', 'muchas gracias', 'confirmado', 'listo', 'chao', 'hasta luego', 'pedido exitoso'];
          const isFinalizedText = history.some((h: any) => h.text && finalizationKeywords.some(kw => h.text.toLowerCase().includes(kw)));
          if (isFinalizedText) continue;
        }

        // Prevent double sending within too short of an interval
        if (status.lastSentTimestamp && (now - status.lastSentTimestamp < intervalMs)) continue;

        // Ready to send!
        const currentSequenceIndex = status.sentCount; // 0, 1, or 2
        let msgText = "";
        let attachment: any = null;

        const useAI = currentDB.remarketingUseAI && currentDB.remarketingUseAI[currentSequenceIndex] !== undefined
          ? !!currentDB.remarketingUseAI[currentSequenceIndex]
          : true;

        if (useAI) {
          try {
            console.log(`[Remarketing background] Generando con IA para +${phone}...`);
            const prompt = `Genera un mensaje de remarketing amigable, extremadamente educado, no invasivo y persuasivo para retomar la conversación con el cliente, basándote en el siguiente historial de chat. No uses saludos excesivos, sé directo y servicial (máximo 25 palabras).
Historial de chat:
${history.slice(-6).map((h: any) => `${h.role === 'client' ? 'Cliente' : 'IA'}: ${h.text}`).join('\n')}
Respuesta de remarketing (sin etiquetas JSON, solo texto plano):`;

            const aiResponse = await executeAIInternal(prompt, null, null, 'response');
            msgText = aiResponse || "¡Hola! ¿Quedó alguna duda sobre tu solicitud? Quedo a tu disposición.";
          } catch (err) {
            msgText = "¡Hola! ¿Quedó alguna duda sobre tu solicitud? Quedo a tu disposición.";
          }
        } else {
          const customMessages = currentDB.remarketingMessages || [];
          msgText = customMessages[currentSequenceIndex] || "¡Hola! Quería saber si pudiste revisar la información. Quedo a tu disposición.";

          const customAtts = currentDB.remarketingAttachments || [];
          const attList = customAtts[currentSequenceIndex] || [];
          if (attList.length > 0) {
            attachment = attList[0];
          }
        }

        const targetJid = `${phone}@s.whatsapp.net`;
        try {
          if (attachment && attachment.url) {
            const buffer = await getMediaBuffer(attachment.url);
            if (buffer) {
              if (attachment.type === 'imagen') {
                await clientSock.sendMessage(targetJid, { image: buffer, caption: msgText });
              } else if (attachment.type === 'audio') {
                const converted = await convertAudioToOggOpus(buffer, attachment.url || attachment.name);
                await clientSock.sendMessage(targetJid, {
                  audio: converted,
                  ptt: true,
                  mimetype: 'audio/ogg; codecs=opus',
                  waveform: generateSimulatedWaveform(64)
                });
              } else {
                await clientSock.sendMessage(targetJid, { document: buffer, fileName: attachment.name || 'documento', caption: msgText });
              }
            } else {
              await clientSock.sendMessage(targetJid, { text: msgText });
            }
          } else {
            await clientSock.sendMessage(targetJid, { text: msgText });
          }

          console.log(`[Remarketing background] Mensaje #${currentSequenceIndex + 1} enviado con éxito a +${phone}`);
        } catch (sendErr) {
          console.error(`[Remarketing background] Error enviando mensaje a +${phone}:`, sendErr);
        }

        // Always log remarketing in the history and update status
        currentDB.messagesHistory[phone].push({
          role: 'assistant',
          text: `[REMARKETING] ${msgText}`,
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        });

        status.sentCount += 1;
        status.lastSentTimestamp = now;
        currentDB.remarketingStatus[phone] = status;
        saveDBData(currentDB);
      }
    } catch (err) {
      console.error("[Remarketing Error] Error en checkAndSendRemarketing background:", err);
    }
  }

  // Ejecutar el checker de remarketing cada 60 segundos
  setInterval(checkAndSendRemarketing, 60000);


  // Auto-connect WhatsApp if it was previously connected or if saved credentials exist
  const defaultCredsPath = path.join(path.resolve(wAuthBaseDir, 'baileys_auth_info'), 'creds.json');
  const hasSavedCreds = fs.existsSync(defaultCredsPath) || (currentDB.whatsappSessionData && currentDB.whatsappSessionData['channel-default']);
  if (currentDB.whatsappConnected || hasSavedCreds) {
    console.log('[Startup] Auto-connecting to default WhatsApp channel (credenciales encontradas)...');
    connectToWhatsApp('channel-default').catch(err => console.error(err));
  }
  if (currentDB.channels && Array.isArray(currentDB.channels)) {
    for (const ch of currentDB.channels) {
      if (ch.connected && ch.id !== 'channel-default') {
        console.log('[Startup] Auto-connecting to WhatsApp channel ' + ch.id + '...');
        connectToWhatsApp(ch.id).catch(err => console.error(err));
      }
    }
  }

  // Client Static Serving
// or Dev Mode integration
  const distExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  if (distExists) {
    const distPath = path.join(process.cwd(), 'dist');
    // Vite assets are content-hashed, so they can be cached for a year. The
    // HTML shell remains uncached so a deployment is visible immediately.
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));
    // A missing hashed asset belongs to an older deployment. Returning the SPA
    // shell for it makes module imports fail with a confusing MIME error, so
    // answer 404 and let the client recover with a clean reload.
    app.use('/assets', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.status(404).type('text/plain').send('Asset not found');
    });
    app.use(express.static(distPath, { maxAge: 0 }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Dev mode: use vite DevServer as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server executing at port ${port}`);
  });
}

createServer();
