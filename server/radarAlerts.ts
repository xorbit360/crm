/**
 * radarAlerts.ts — Alertas de picos de tendencia del "Radar de Anuncios".
 *
 * - CRUD de alertas del usuario: GET/POST/DELETE /api/radar/alerts
 *   (crear requiere suscripción Radar activa; si no, 402 paywall).
 * - checkAlertSpikes(getDB, saveDB): el cron diario la llama para revisar cada
 *   alerta activa contra Google Trends (trendsRelated de ./radar.ts). Si hay
 *   pico (rising >= 5000% o query nueva en top vs baseline guardado), notifica
 *   por WhatsApp (Evolution API) + push del CRM, con dedupe de 24h.
 *
 * DEPENDENCIAS (agente de billing, ya entregadas en server/billing.ts):
 * - getRadarTier(getDB, userEmail) → 'none' | 'basico' | 'pro' | 'elite'
 *   ('none' si no tiene suscripción Radar activa; superadmin/admin → 'elite').
 * - getRadarAlertLimit(getDB, userEmail) → number (máx. alertas activas del tier).
 * - suspendExpiredRadar(getDB, saveDB) → string[] (la llama el cron).
 * - ./radar.ts: trendsRelated(keyword, country) → { rising, top } (ya exportada).
 * - Migración backend: tabla Supabase 'radar_alerts'. Mientras no exista, las
 *   alertas viven en memoria en db.radar.alerts (globalThis.currentDB) y la
 *   sincronización con Supabase es best-effort (try/catch).
 */
import type { Express, Request, Response } from 'express';
import { getSession } from './auth.ts';
import { trendsRelated } from './radar.ts';
import { getRadarTier, getRadarAlertLimit } from './billing.ts';
import { getSupabase } from './supabase.ts';

type AnyRow = Record<string, any>;

const DEDUPE_MS = 24 * 60 * 60 * 1000; // no repetir la misma alerta en 24h

function getGlobalDB(): any {
  return (globalThis as any).currentDB || {};
}

function saveGlobalDB(): void {
  try {
    const fn = (globalThis as any).saveDB || (globalThis as any).persistDB;
    if (typeof fn === 'function') fn();
  } catch { /* noop */ }
}

export function alertsStore(db: any): AnyRow[] {
  if (!db.radar || typeof db.radar !== 'object') db.radar = {};
  if (!Array.isArray(db.radar.alerts)) db.radar.alerts = [];
  return db.radar.alerts;
}

function normEmail(v: any): string {
  return String(v || '').trim().toLowerCase();
}

/** Valor numérico de un rising de Trends ("+5,000%", 5000, "Breakout"→0). */
export function risingValue(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const digits = String(v || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/** Best-effort: sincroniza una alerta a la tabla Supabase 'radar_alerts' (si existe). */
async function syncAlertToSupabase(alert: AnyRow, deleted = false): Promise<void> {
  try {
    const sb = getSupabase();
    if (!sb) return;
    if (deleted) {
      await sb.from('radar_alerts').delete().eq('id', alert.id);
      return;
    }
    await sb.from('radar_alerts').upsert(
      {
        id: alert.id,
        user_email: alert.userEmail,
        keyword: alert.keyword,
        country: alert.country,
        whatsapp_number: alert.whatsappNumber || null,
        active: alert.active !== false,
        baseline_queries: alert.baselineQueries || [],
        last_triggered_at: alert.lastTriggeredAt || null,
        last_triggered_query: alert.lastTriggeredQuery || null,
        created_at: alert.createdAt,
      },
      { onConflict: 'id' }
    );
  } catch (e: any) {
    console.log('[RadarAlerts] Sync Supabase omitido:', e?.message || e);
  }
}

async function sendWhatsapp(db: any, to: string, text: string): Promise<boolean> {
  try {
    const apiUrl = String(
      db.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'https://whatsapp.xorbit360.com'
    ).replace(/\/+$/, '');
    const apiKey = String(db.evolutionApiKey || process.env.EVOLUTION_API_KEY || '');
    // Instancia por defecto: '+573192392853_admin' (conectada).
    // 'channel-default' quedó desconectada (401 desde 2026-10-10). Para reconectarla:
    // Evolution API → Instances → channel-default → QRCode → escanear con WhatsApp.
    const instance = String(db.evolutionDefaultInstance || '+573192392853_admin');
    const num = String(to || '').replace(/\D/g, '');
    if (!apiUrl || !apiKey || !num) {
      console.log('[RadarAlerts] WhatsApp omitido: falta configuración o número.');
      return false;
    }
    const res = await fetch(`${apiUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: num, text }),
    });
    if (!res.ok) {
      console.log('[RadarAlerts] WhatsApp no enviado, status', res.status);
      return false;
    }
    return true;
  } catch (e: any) {
    console.log('[RadarAlerts] WhatsApp falló:', e?.message || e);
    return false;
  }
}

async function sendPush(title: string, body: string): Promise<void> {
  try {
    const { pushNotifyAll } = await import('./push.ts');
    await pushNotifyAll(title, body, '/radar');
  } catch (e: any) {
    console.log('[RadarAlerts] Push falló:', e?.message || e);
  }
}

/**
 * Revisa todas las alertas activas y dispara notificación cuando detecta pico:
 * - algún rising con value >= 5000 (p. ej. "+5,000%"), o
 * - un query nuevo en top que no estaba en la baseline guardada (alert.baselineQueries).
 * Dedupe: la misma alerta no se repite dentro de 24h (lastTriggeredAt).
 */
export async function checkAlertSpikes(
  getDB: () => any,
  saveDB: (db: any) => void
): Promise<{ checked: number; triggered: number }> {
  const db = getDB();
  const alerts = alertsStore(db).filter((a: AnyRow) => a.active !== false);
  let triggered = 0;
  const now = Date.now();

  for (const alert of alerts) {
    try {
      const last = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).getTime() : 0;
      if (last && now - last < DEDUPE_MS) continue; // dedupe 24h

      const { rising, top } = await trendsRelated(String(alert.keyword), String(alert.country || 'CO'));
      const baseline: string[] = Array.isArray(alert.baselineQueries) ? alert.baselineQueries : [];

      // 1) Pico fuerte en rising: "+5,000%" o más.
      const hotRising = (rising || []).find((r: AnyRow) => risingValue(r.value) >= 5000);
      // 2) Query nuevo en top que no existía en la baseline.
      let newTop: AnyRow | null = null;
      if (baseline.length > 0) {
        const known = new Set(baseline.map((q) => String(q).toLowerCase()));
        newTop = (top || []).find((t: AnyRow) => !known.has(String(t.query || '').toLowerCase())) || null;
      }

      const spike = hotRising || newTop;
      if (spike) {
        const query = String(spike.query || '');
        const label = hotRising && spike.label ? ` (${spike.label})` : '';
        const text =
          `📡 *Radar de Anuncios*\n\n🔥 Pico de tendencia: ${alert.keyword} en ${alert.country}: ${query}${label}`;
        await sendWhatsapp(db, alert.whatsappNumber, text);
        await sendPush('Radar de Anuncios — pico de tendencia', `${alert.keyword} en ${alert.country}: ${query}`);
        alert.lastTriggeredAt = new Date().toISOString();
        alert.lastTriggeredQuery = query;
        triggered++;
        console.log(`[RadarAlerts] Pico disparado: ${alert.keyword}/${alert.country} → ${query} (usuario ${alert.userEmail})`);
      }

      // Actualizar baseline con el top actual (no dispara en la primera corrida).
      alert.baselineQueries = (top || []).map((t: AnyRow) => String(t.query || '')).filter(Boolean);
      syncAlertToSupabase(alert).catch(() => {});
    } catch (e: any) {
      console.log(`[RadarAlerts] Error revisando alerta ${alert.id}:`, e?.message || e);
    }
  }

  if (triggered > 0) saveDB(db);
  return { checked: alerts.length, triggered };
}

export function setupRadarAlertRoutes(app: Express): void {
  // Lista de alertas del usuario en sesión.
  app.get('/api/radar/alerts', (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });
    const alerts = alertsStore(getGlobalDB()).filter(
      (a: AnyRow) => normEmail(a.userEmail) === normEmail(session.email)
    );
    res.json({ success: true, alerts });
  });

  // Crear alerta (requiere suscripción Radar activa + respetar límite del tier).
  app.post('/api/radar/alerts', (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });

    try {
      const db = getGlobalDB();
      const email = normEmail(session.email);
      const tier = getRadarTier(() => getGlobalDB(), email);
      if (tier === 'none') {
        return res.status(402).json({
          success: false,
          paywall: true,
          product: 'radar',
          error: 'Las alertas del Radar requieren una suscripción activa del Radar de Anuncios.',
        });
      }

      const limit = getRadarAlertLimit(() => getGlobalDB(), email);
      const mine = alertsStore(db).filter(
        (a: AnyRow) => normEmail(a.userEmail) === email && a.active !== false
      );
      if (mine.length >= limit) {
        return res.status(403).json({
          success: false,
          error: `Llegaste al límite de ${limit} alerta(s) activas de tu suscripción Radar.`,
        });
      }

      const keyword = String(req.body?.keyword || '').trim().slice(0, 80);
      const country = String(req.body?.country || 'CO').trim().toUpperCase().slice(0, 4);
      const whatsappNumber = String(req.body?.whatsappNumber || '').replace(/\D/g, '').slice(0, 20);
      if (!keyword) return res.status(400).json({ success: false, error: 'Indica la palabra clave de la alerta.' });
      if (!whatsappNumber) {
        return res.status(400).json({ success: false, error: 'Indica tu número de WhatsApp para recibir el aviso.' });
      }

      const alert: AnyRow = {
        id: `ral-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        userEmail: normEmail(session.email),
        keyword,
        country,
        whatsappNumber,
        active: true,
        baselineQueries: [],
        lastTriggeredAt: null,
        lastTriggeredQuery: null,
        createdAt: new Date().toISOString(),
      };
      alertsStore(db).unshift(alert);
      saveGlobalDB();
      syncAlertToSupabase(alert).catch(() => {});
      res.json({ success: true, alert });
    } catch (e: any) {
      console.error('[RadarAlerts] Error creando alerta:', e);
      res.status(500).json({ success: false, error: 'No se pudo crear la alerta.' });
    }
  });

  // Eliminar alerta del usuario.
  app.delete('/api/radar/alerts/:id', (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });
    try {
      const db = getGlobalDB();
      const store = alertsStore(db);
      const idx = store.findIndex(
        (a: AnyRow) => String(a.id) === String(req.params.id) && normEmail(a.userEmail) === normEmail(session.email)
      );
      if (idx === -1) return res.status(404).json({ success: false, error: 'Alerta no encontrada.' });
      const [removed] = store.splice(idx, 1);
      saveGlobalDB();
      syncAlertToSupabase(removed, true).catch(() => {});
      res.json({ success: true });
    } catch (e: any) {
      console.error('[RadarAlerts] Error eliminando alerta:', e);
      res.status(500).json({ success: false, error: 'No se pudo eliminar la alerta.' });
    }
  });

  console.log('[RadarAlerts] Rutas de alertas del Radar registradas.');
}

export default setupRadarAlertRoutes;
