import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import { decryptSecret, encryptSecret, isEncryptedSecret, maskSecret } from './secretBox.ts';

// ============================================================================
// Voces para el agente de llamadas IA — Xorbit 360
// Proveedor configurable (Google Live/Gemini por defecto: más barato).
// Hoy el módulo de Llamadas es prototipo UI; este módulo deja lista la
// configuración de voz y una prueba real de TTS con las voces "Live" de
// Google (las mismas de la Gemini Live API), para evaluar calidad/costo
// antes de construir el agente de voz real (telefonía + Live API).
// La clave de Google AI Studio vive cifrada en app_settings (workspace
// default); jamás se expone el valor en respuestas.
// ============================================================================

const WORKSPACE = 'default';
const SETTINGS_KEY = 'voice.settings';
const TTS_TIMEOUT_MS = 30_000;
const MAX_TEST_CHARS = 500;

// Voces prebuilt de Google (Gemini Live API / TTS). Curaduría inicial;
// el endpoint acepta cualquier nombre válido de la API.
export const GOOGLE_VOICES = [
  { id: 'Kore', label: 'Kore — firme y clara' },
  { id: 'Puck', label: 'Puck — alegre y enérgica' },
  { id: 'Charon', label: 'Charon — grave y seria' },
  { id: 'Fenrir', label: 'Fenrir — profunda' },
  { id: 'Aoede', label: 'Aoede — suave y ligera' },
  { id: 'Zephyr', label: 'Zephyr — cálida' },
  { id: 'Leda', label: 'Leda — juvenil' },
  { id: 'Orus', label: 'Orus — firme' },
  { id: 'Callirrhoe', label: 'Callirrhoe — amable' },
  { id: 'Autonoe', label: 'Autonoe — brillante' },
];

export type VoiceProvider = 'google' | 'elevenlabs' | 'vapi' | 'retell';

interface VoiceSettings {
  provider: VoiceProvider;
  voice: string;
  googleKey: string; // cifrada con encryptSecret
}

const DEFAULTS: VoiceSettings = { provider: 'google', voice: 'Kore', googleKey: '' };

function sendError(res: Response, err: any) {
  const status = Number(err?.status || 500);
  if (status >= 500) console.error('[Voice]', err?.message || err);
  res.status(status).json({ success: false, error: err?.message || 'Error interno' });
}
type Handler = (req: Request, res: Response) => Promise<void>;
function route(handler: Handler) {
  return (req: Request, res: Response) => { handler(req, res).catch((err) => sendError(res, err)); };
}

async function readVoiceSettings(): Promise<VoiceSettings> {
  const client = getSupabase();
  if (!client) return { ...DEFAULTS };
  const { data, error } = await (client
    .from('app_settings')
    .select('value')
    .eq('workspace_id', WORKSPACE)
    .eq('key', SETTINGS_KEY)
    .maybeSingle() as any);
  if (error) throw new Error(error.message);
  const raw = data?.value;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
  return { ...DEFAULTS, ...parsed };
}

async function writeVoiceSettings(settings: VoiceSettings): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no disponible');
  const { error } = await (client
    .from('app_settings')
    .upsert(
      { workspace_id: WORKSPACE, key: SETTINGS_KEY, value: JSON.stringify(settings), updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id,key' },
    ) as any);
  if (error) throw new Error(error.message);
}

function resolveGoogleKey(settings: VoiceSettings): string {
  const raw = String(settings.googleKey || '');
  if (!raw) return '';
  return (isEncryptedSecret(raw) ? decryptSecret(raw) : raw).trim();
}

function cleanText(v: unknown, max: number): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// PCM 16-bit mono 24kHz (lo que devuelve Gemini TTS) -> WAV en base64
function pcmToWavBase64(pcmB64: string, sampleRate = 24000): string {
  const pcm = Buffer.from(pcmB64, 'base64');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

async function geminiTts(apiKey: string, text: string, voiceName: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
    signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    let detail = `Google TTS HTTP ${res.status}`;
    try {
      const j = JSON.parse(bodyText);
      const msg = j?.error?.message;
      if (msg) detail += `: ${String(msg).slice(0, 160)}`;
    } catch { /* noop */ }
    // Traducir errores comunes a español amigable
    if (res.status === 400 && /API key/i.test(bodyText)) detail = 'La clave de Google no es válida. Revisa la clave en la configuración de voz.';
    if (res.status === 429) detail = 'Límite de Google alcanzado. Espera un minuto e intenta de nuevo.';
    throw new Error(detail);
  }
  let pcmB64 = '';
  try {
    const j = JSON.parse(bodyText);
    const parts = j?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p?.inlineData?.data) { pcmB64 = String(p.inlineData.data); break; }
    }
  } catch { /* noop */ }
  if (!pcmB64) throw new Error('Google no devolvió audio. Intenta con otro texto.');
  return pcmToWavBase64(pcmB64);
}

export function setupVoiceAdminRoutes(app: Express): void {
  // Vista pública (sin el valor de la clave)
  app.get('/api/voice/config', route(async (_req, res) => {
    const s = await readVoiceSettings();
    res.json({
      success: true,
      config: {
        provider: s.provider,
        voice: s.voice,
        voices: GOOGLE_VOICES,
        googleKeySet: Boolean(resolveGoogleKey(s)),
        googleKeyMasked: maskSecret(s.googleKey),
      },
    });
  }));

  app.put('/api/voice/config', route(async (req, res) => {
    const body = req.body || {};
    const current = await readVoiceSettings();
    const next: VoiceSettings = { ...current };
    const provider = cleanText(body.provider, 20).toLowerCase();
    if (provider) {
      if (!['google', 'elevenlabs', 'vapi', 'retell'].includes(provider)) {
        res.status(400).json({ success: false, error: 'Proveedor no válido.' });
        return;
      }
      next.provider = provider as VoiceProvider;
    }
    if (body.voice !== undefined) {
      const voice = cleanText(body.voice, 40);
      if (!voice) {
        res.status(400).json({ success: false, error: 'Elige una voz.' });
        return;
      }
      next.voice = voice;
    }
    if (body.googleKey !== undefined) {
      const key = cleanText(body.googleKey, 200);
      if (key) next.googleKey = encryptSecret(key);
    }
    if (body.clearGoogleKey === true) next.googleKey = '';
    await writeVoiceSettings(next);
    res.json({
      success: true,
      config: {
        provider: next.provider,
        voice: next.voice,
        googleKeySet: Boolean(resolveGoogleKey(next)),
        googleKeyMasked: maskSecret(next.googleKey),
      },
    });
  }));

  // Prueba real de TTS con la voz configurada (Google Live voices)
  app.post('/api/voice/test-tts', route(async (req, res) => {
    const body = req.body || {};
    const settings = await readVoiceSettings();
    const apiKey = resolveGoogleKey(settings);
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'Falta la clave de Google AI Studio. Guárdala primero en la configuración de voz.' });
      return;
    }
    const text = cleanText(body.text, MAX_TEST_CHARS);
    if (!text) {
      res.status(400).json({ success: false, error: 'Escribe un texto para probar la voz.' });
      return;
    }
    const voice = cleanText(body.voice, 40) || settings.voice || 'Kore';
    const audioBase64 = await geminiTts(apiKey, text, voice);
    res.json({ success: true, audioBase64, mimeType: 'audio/wav', voice });
  }));
}
