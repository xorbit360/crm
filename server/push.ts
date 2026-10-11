import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import { getSession, requireRole } from './auth.ts';
import { encryptSecret, decryptSecret, isEncryptedSecret } from './secretBox.ts';

// ============================================================================
// Notificaciones Push (Web Push / PWA) + Difusiones del Super Admin.
//
// - Las claves VAPID se generan solas en el primer arranque y se guardan
//   cifradas en app_settings (clave 'push_vapid_keys'). Nunca van a Git.
// - Cada celular/navegador suscrito queda en 'push_subscriptions' con su rol.
// - El Super Admin difunde desde la vista "Difusiones": título + mensaje +
//   enlace opcional, audiencia = todos o por rol.
// ============================================================================

type AnyRow = Record<string, any>;

function db(): any {
  const client = getSupabase();
  if (!client) {
    const err: any = new Error('Supabase no está configurado en el servidor');
    err.status = 503;
    throw err;
  }
  return client;
}

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error('[Push]', err?.message || err);
      const status = err?.status || 500;
      res.status(status).json({ success: false, error: err?.message || 'Error interno' });
    }
  };
}

async function getAppSetting(key: string): Promise<string | null> {
  try {
    const { data } = await db().from('app_settings').select('value').eq('key', key).maybeSingle();
    return (data as AnyRow)?.value ?? null;
  } catch {
    return null;
  }
}

async function setAppSetting(key: string, value: string): Promise<void> {
  await db().from('app_settings').upsert({ key, value }, { onConflict: 'key' });
}

// Las claves VAPID se generan una sola vez y viven en la base de datos.
async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const stored = await getAppSetting('push_vapid_keys');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const privateKey = isEncryptedSecret(parsed.privateKey)
        ? decryptSecret(parsed.privateKey)
        : parsed.privateKey;
      if (parsed.publicKey && privateKey) return { publicKey: parsed.publicKey, privateKey };
    } catch { /* regenerar abajo */ }
  }
  // Generar con web-push (viene en dependencies).
  const webpush = await import('web-push');
  const keys = webpush.generateVAPIDKeys();
  await setAppSetting('push_vapid_keys', JSON.stringify({
    publicKey: keys.publicKey,
    privateKey: encryptSecret(keys.privateKey),
  }));
  console.log('[Push] Claves VAPID generadas y guardadas en app_settings.');
  return keys;
}

async function getWebPush(): Promise<any> {
  const webpush = await import('web-push');
  const keys = await getVapidKeys();
  webpush.setVapidDetails('mailto:admin@xorbit360.com', keys.publicKey, keys.privateKey);
  return webpush;
}

const VALID_ROLES = new Set(['superadmin', 'admin', 'tester']);

export function setupPushRoutes(app: Express): void {
  // Clave pública VAPID para que el navegador se suscriba (no es secreta).
  app.get('/api/push/vapid-public-key', route(async (_req, res) => {
    const keys = await getVapidKeys();
    res.json({ success: true, publicKey: keys.publicKey });
  }));

  // Suscribir este dispositivo/navegador.
  app.post('/api/push/subscribe', route(async (req, res) => {
    const { endpoint, keys } = (req.body || {}) as AnyRow;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ success: false, error: 'Suscripción incompleta' });
      return;
    }
    const session = getSession(req as any);
    const role = String(session?.role || 'user');
    const label = String((session as any)?.email || (session as any)?.name || role);
    const { error } = await db().from('push_subscriptions').upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, user_role: role, user_label: label },
      { onConflict: 'endpoint' }
    );
    if (error) throw new Error(error.message);
    res.json({ success: true });
  }));

  // Quitar suscripción de este dispositivo.
  app.post('/api/push/unsubscribe', route(async (req, res) => {
    const { endpoint } = (req.body || {}) as AnyRow;
    if (endpoint) {
      await db().from('push_subscriptions').delete().eq('endpoint', String(endpoint));
    }
    res.json({ success: true });
  }));

  // Cuántos dispositivos suscritos (para mostrar en el panel).
  app.get('/api/push/stats', requireRole('superadmin'), route(async (_req, res) => {
    const { data, error } = await db().from('push_subscriptions').select('user_role');
    if (error) throw new Error(error.message);
    const byRole: Record<string, number> = {};
    for (const row of (data || []) as AnyRow[]) {
      const r = String(row.user_role || 'user');
      byRole[r] = (byRole[r] || 0) + 1;
    }
    res.json({ success: true, total: (data || []).length, byRole });
  }));

  // Historial de difusiones.
  app.get('/api/push/broadcasts', requireRole('superadmin'), route(async (_req, res) => {
    const { data, error } = await db()
      .from('push_broadcasts')
      .select('id, title, body, url, audience, sent_count, failed_count, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    res.json({ success: true, broadcasts: data || [] });
  }));

  // Difundir: solo superadmin. Audiencia: 'all' o un rol.
  app.post('/api/push/broadcast', requireRole('superadmin'), route(async (req, res) => {
    const { title, body, url, audience } = (req.body || {}) as AnyRow;
    const cleanTitle = String(title || '').trim().slice(0, 80);
    const cleanBody = String(body || '').trim().slice(0, 240);
    const cleanUrl = String(url || '').trim().slice(0, 500);
    const cleanAudience = String(audience || 'all').trim();
    if (!cleanTitle || !cleanBody) {
      res.status(400).json({ success: false, error: 'Título y mensaje son obligatorios' });
      return;
    }
    if (cleanAudience !== 'all' && !VALID_ROLES.has(cleanAudience)) {
      res.status(400).json({ success: false, error: 'Audiencia inválida' });
      return;
    }

    let query = db().from('push_subscriptions').select('endpoint, p256dh, auth');
    if (cleanAudience !== 'all') query = query.eq('user_role', cleanAudience);
    const { data: subs, error } = await query;
    if (error) throw new Error(error.message);

    const webpush = await getWebPush();
    const payload = JSON.stringify({
      title: cleanTitle,
      body: cleanBody,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: cleanUrl || '/' },
    });

    let sent = 0;
    let failed = 0;
    const deadEndpoints: string[] = [];
    await Promise.all((subs || []).map(async (sub: AnyRow) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 }
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = suscripción vencida o revocada: limpiarla.
        if (err?.statusCode === 404 || err?.statusCode === 410) deadEndpoints.push(sub.endpoint);
      }
    }));
    if (deadEndpoints.length) {
      await db().from('push_subscriptions').delete().in('endpoint', deadEndpoints);
    }

    await db().from('push_broadcasts').insert({
      title: cleanTitle,
      body: cleanBody,
      url: cleanUrl || null,
      audience: cleanAudience,
      sent_count: sent,
      failed_count: failed,
    });

    console.log(`[Push] Difusión "${cleanTitle}" -> audiencia=${cleanAudience} enviadas=${sent} fallidas=${failed}`);
    res.json({ success: true, sent, failed, audience: cleanAudience });
  }));


  console.log('[Push] Rutas de notificaciones push registradas.');
}
// Notificación push a TODOS los dispositivos suscritos (uso interno: piloto automático, alertas).
export async function pushNotifyAll(title: string, body: string, url?: string): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  try {
    const webpush = await getWebPush();
    const { data: subs } = await db().from('push_subscriptions').select('endpoint, p256dh, auth');
    const payload = JSON.stringify({ title: String(title).slice(0, 80), body: String(body).slice(0, 240), url: url || '/' });
    const dead: string[] = [];
    await Promise.all((subs || []).map(async (sub: any) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400 });
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(sub.endpoint);
      }
    }));
    if (dead.length) await db().from('push_subscriptions').delete().in('endpoint', dead);
  } catch (e: any) {
    console.log('[Push] pushNotifyAll falló:', e?.message || e);
  }
  return { sent, failed };
}

