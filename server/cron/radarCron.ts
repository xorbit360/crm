/**
 * radarCron.ts — Cron diario del Radar de Anuncios.
 *
 * 1. Toma una muestra de keywords en tendencia por región (keywords semilla ×
 *    países) con trendsRelated (./radar.ts) y la guarda en la tabla Supabase
 *    'radar_ads' (best-effort: cada guardado en su propio try/catch).
 * 2. Revisa las alertas activas de los usuarios: checkAlertSpikes (./radarAlerts.ts)
 *    dispara WhatsApp + push ante picos de tendencia (dedupe 24h).
 * 3. Suspende suscripciones Radar vencidas: suspendExpiredRadar (./billing.ts).
 *
 * Se ejecuta una vez al día desde server.ts (junto al cron de mantenimiento).
 * Log de resumen en consola.
 *
 * DEPENDENCIAS (agente de billing, ya entregadas en server/billing.ts):
 * - suspendExpiredRadar(getDB, saveDB) → string[] (emails con suscripción suspendida).
 * - ./radar.ts: trendsRelated(keyword, country) (ya exportada).
 * - Migración backend: tabla Supabase 'radar_ads'. Mientras no exista, los
 *   guardados fallan de forma aislada y el cron sigue con lo demás.
 */
import { trendsRelated } from '../radar.ts';
import { checkAlertSpikes } from '../radarAlerts.ts';
import { suspendExpiredRadar } from '../billing.ts';
import { getSupabase } from '../supabase.ts';

type AnyRow = Record<string, any>;

const SEED_KEYWORDS = ['freidora de aire', 'serum', 'faja', 'mascotas', 'cocina'];
const SEED_COUNTRIES = ['CO', 'MX', 'US', 'ES'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Best-effort: guarda una muestra de trends en la tabla Supabase 'radar_ads'. */
async function saveSampleToRadarAds(keyword: string, country: string, data: { rising: AnyRow[]; top: AnyRow[] }): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;
  try {
    const sb = getSupabase();
    if (!sb) return { saved, errors };
    const rows: AnyRow[] = [
      ...(data.rising || []).map((r: AnyRow) => ({
        keyword,
        country,
        kind: 'rising',
        query: String(r.query || '').slice(0, 200),
        value: String(r.value ?? ''),
        label: String(r.label || '').slice(0, 60),
        sampled_at: new Date().toISOString(),
      })),
      ...(data.top || []).map((t: AnyRow) => ({
        keyword,
        country,
        kind: 'top',
        query: String(t.query || '').slice(0, 200),
        value: String(t.value ?? ''),
        label: String(t.label || '').slice(0, 60),
        sampled_at: new Date().toISOString(),
      })),
    ].filter((r) => r.query);
    for (const row of rows) {
      try {
        const { error } = await sb.from('radar_ads').upsert(row, { onConflict: 'keyword,country,kind,query' });
        if (error) throw new Error(error.message);
        saved++;
      } catch (e: any) {
        errors++;
        console.log('[RadarCron] radar_ads omitido:', e?.message || e);
      }
    }
  } catch (e: any) {
    errors++;
    console.log('[RadarCron] Error guardando muestra radar_ads:', e?.message || e);
  }
  return { saved, errors };
}

export async function runRadarCron(
  getDB: () => any,
  saveDB: (db: any) => void
): Promise<{ samples: number; saved: number; saveErrors: number; spikesChecked: number; spikesTriggered: number; suspended: number }> {
  const started = Date.now();
  const result = { samples: 0, saved: 0, saveErrors: 0, spikesChecked: 0, spikesTriggered: 0, suspended: 0 };

  // 1. Muestra de tendencias por región → radar_ads (best-effort).
  for (const country of SEED_COUNTRIES) {
    for (const keyword of SEED_KEYWORDS) {
      result.samples++;
      try {
        const data = await trendsRelated(keyword, country);
        const { saved, errors } = await saveSampleToRadarAds(keyword, country, data);
        result.saved += saved;
        result.saveErrors += errors;
      } catch (e: any) {
        console.log(`[RadarCron] trendsRelated falló (${keyword}/${country}):`, e?.message || e);
      }
      // Pausa corta entre consultas: Google Trends limita agresivo por IP.
      await sleep(1500);
    }
  }

  // 2. Alertas de picos de los usuarios (WhatsApp + push, dedupe 24h).
  try {
    const spikes = await checkAlertSpikes(getDB, saveDB);
    result.spikesChecked = spikes.checked;
    result.spikesTriggered = spikes.triggered;
  } catch (e: any) {
    console.log('[RadarCron] checkAlertSpikes falló:', e?.message || e);
  }

  // 3. Suspender suscripciones Radar vencidas.
  try {
    const suspended = suspendExpiredRadar(getDB, saveDB);
    result.suspended = Array.isArray(suspended) ? suspended.length : 0;
  } catch (e: any) {
    console.log('[RadarCron] suspendExpiredRadar falló:', e?.message || e);
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[RadarCron] Resumen: ${result.samples} muestras de tendencias, ${result.saved} filas guardadas en radar_ads ` +
      `(${result.saveErrors} errores), alertas revisadas=${result.spikesChecked} disparadas=${result.spikesTriggered}, ` +
      `suscripciones Radar suspendidas=${result.suspended}, ${secs}s.`
  );
  return result;
}

export default runRadarCron;
