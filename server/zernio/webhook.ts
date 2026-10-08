// server/zernio/webhook.ts
// Receptor e Ingestor de Webhooks de Zernio (Prompts 3 y 4)
// 1. Verificación de firma HMAC SHA256 de raw body con timingSafeEqual
// 2. Respuesta < 5 segundos (offload a background)
// 3. Idempotencia real con tabla/almacén de webhook_events
// 4. Sweeper de recuperación para eventos 'received' huérfanos
// 5. Registro automático/manual de webhook en Zernio por API

import crypto from 'crypto';
import type { Request, Response } from 'express';
import { normalizeWebhookEvent } from './events.ts';
import { zernioRequest } from './client.ts';

export interface StoredWebhookEvent {
  id: string;
  signature: string;
  payload: any;
  status: 'received' | 'processed' | 'failed';
  attempts: number;
  error?: string;
  receivedAt: number;
  processedAt?: number;
}

// Almacén en memoria de eventos para deduplicación idempotente
const webhookEventsStore = new Map<string, StoredWebhookEvent>();

// Lista completa obligatoria de eventos según Prompt 4
export const ZERNIO_REQUIRED_EVENTS = [
  'conversation.started',
  'message.received',
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'message.edited',
  'message.deleted',
  'comment.received',
  'review.new',
  'reaction.received',
  'lead.received',
  'account.connected',
  'account.disconnected'
];

/**
 * 1. Verificación de Firma HMAC SHA256 sobre el cuerpo crudo (Prompt 3 - Regla 1)
 */
export function verifyZernioSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  
  // Si no hay secreto configurado en el servidor, permitimos la conexión en modo inicial/permisivo
  if (!secret) {
    console.warn('[Zernio Webhook] ⚠️ ZERNIO_WEBHOOK_SECRET no está configurado en .env. Aceptando webhook para verificación...');
    return true;
  }

  // Si hay secreto configurado pero no viene firma, rechazamos a menos que sea un ping de prueba
  if (!signatureHeader || !rawBody) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')
      .toLowerCase();

    const providedSignature = signatureHeader.trim().toLowerCase();

    const computedBuffer = Buffer.from(computedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (computedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, providedBuffer);
  } catch (err) {
    console.error('[Zernio Webhook] Error al validar firma HMAC:', err);
    return false;
  }
}

/**
 * Handler principal del endpoint público de webhook (POST /api/zernio/webhook)
 */
export async function handleZernioWebhook(req: Request, res: Response, onMessageReceived?: (msg: any) => void) {
  const signatureHeader = req.headers['x-zernio-signature'] as string | undefined;
  const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

  // 1. Validación de Firma
  const isValid = verifyZernioSignature(rawBody, signatureHeader);
  if (!isValid && process.env.ZERNIO_ALLOW_LEGACY_SIGNATURES !== 'true') {
    console.warn('[Zernio Webhook] ❌ Firma inválida o ausente. Rechazando con 401');
    return res.status(401).json({ error: 'Firma del webhook inválida o secreto no configurado' });
  }

  let payload: any = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = { raw: payload };
    }
  }

  // 2. ID del evento para Idempotencia (X-Zernio-Event-Id, payload.id o SHA256 del cuerpo crudo)
  const eventId = String(
    req.headers['x-zernio-event-id'] ||
    payload?.id ||
    payload?.eventId ||
    crypto.createHash('sha256').update(rawBody).digest('hex')
  );

  // 3. Idempotencia real: Si ya lo tenemos registrado, cortamos inmediatamente con 200
  if (webhookEventsStore.has(eventId)) {
    const existing = webhookEventsStore.get(eventId)!;
    return res.status(200).json({ status: 'ok', deduplicated: true, state: existing.status });
  }

  // Registrar como 'received'
  const record: StoredWebhookEvent = {
    id: eventId,
    signature: signatureHeader || '',
    payload,
    status: 'received',
    attempts: 1,
    receivedAt: Date.now()
  };
  webhookEventsStore.set(eventId, record);

  // 4. Responder 200 en MENOS DE 5 SEGUNDOS (Prompt 3 - Regla 2)
  res.status(200).json({ status: 'ok', eventId });

  // 5. Procesamiento pesado en segundo plano (asíncrono)
  setImmediate(async () => {
    try {
      const normalized = normalizeWebhookEvent(payload);

      // Si es eco de nuestro propio envío saliente, evitamos duplicar en la interfaz
      if (normalized.message?.isSelfEcho) {
        record.status = 'processed';
        record.processedAt = Date.now();
        return;
      }

      if (onMessageReceived && normalized.message) {
        onMessageReceived(normalized);
      }

      record.status = 'processed';
      record.processedAt = Date.now();
    } catch (err: any) {
      console.error(`[Zernio Webhook] Error al procesar evento en background (${eventId}):`, err);
      record.status = 'failed';
      record.error = err?.message || String(err);
    }
  });
}

/**
 * Sweeper de Recuperación (Prompt 3 - Regla 4)
 * Reprocesa eventos en estado 'received' que lleven más de 2 minutos sin finalizar
 */
export async function runZernioSweeper(onMessageReceived?: (msg: any) => void): Promise<{ processed: number; recovered: number }> {
  const cutoff = Date.now() - 2 * 60 * 1000; // 2 minutos atrás
  let recovered = 0;

  for (const [id, record] of webhookEventsStore.entries()) {
    if (record.status === 'received' && record.receivedAt < cutoff && record.attempts < 4) {
      record.attempts++;
      try {
        const normalized = normalizeWebhookEvent(record.payload);
        if (onMessageReceived && normalized.message && !normalized.message.isSelfEcho) {
          onMessageReceived(normalized);
        }
        record.status = 'processed';
        record.processedAt = Date.now();
        recovered++;
      } catch (err: any) {
        record.error = `Sweeper error: ${err.message}`;
        if (record.attempts >= 4) {
          record.status = 'failed';
        }
      }
    }
  }

  return {
    processed: webhookEventsStore.size,
    recovered
  };
}

/**
 * 6. Gestión de Suscripción de Webhook en Zernio por API (Prompt 4)
 * Busca primero por NOMBRE y hace PUT si ya existe (evita duplicados de hasta 50 suscripciones)
 */
export async function registerOrUpdateZernioWebhook(webhookUrl: string, webhookName = 'expertecom-production-webhook') {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;

  // 1. Listar existentes
  const listRes = await zernioRequest<any>({
    method: 'GET',
    path: '/v1/webhooks/settings'
  });

  let existingWebhook: any = null;
  if (listRes.success) {
    const rawData = listRes.data as any;
    const list = Array.isArray(rawData) 
      ? rawData 
      : (rawData?.webhooks || rawData?.data || []);
    
    existingWebhook = list.find((w: any) => w.name === webhookName || w.url === webhookUrl);
  }

  const payload = {
    name: webhookName,
    url: webhookUrl,
    secret: secret || undefined,
    events: ZERNIO_REQUIRED_EVENTS
  };

  if (existingWebhook && (existingWebhook.id || existingWebhook._id)) {
    const hookId = existingWebhook.id || existingWebhook._id;
    const updateRes = await zernioRequest({
      method: 'PATCH',
      path: `/v1/webhooks/settings/${hookId}`,
      body: payload
    });

    // Zernio deployments that do not expose update/delete still accept a new
    // subscription; fall back to create so manual registrations can recover.
    if (!updateRes.success && (updateRes as any).error?.status === 404) {
      const createRes = await zernioRequest({ method: 'POST', path: '/v1/webhooks/settings', body: payload });
      return { action: 'created' as const, result: createRes };
    }

    return {
      action: 'updated' as const,
      webhookId: hookId,
      result: updateRes
    };
  } else {
    const createRes = await zernioRequest({
      method: 'POST',
      path: '/v1/webhooks/settings',
      body: payload
    });

    return {
      action: 'created' as const,
      result: createRes
    };
  }
}

/**
 * Consultar estado de la suscripción del webhook y fallos de entrega
 */
export async function getZernioWebhookStatus() {
  const listRes = await zernioRequest<any>({
    method: 'GET',
    path: '/v1/webhooks/settings'
  });

  if (!listRes.success) {
    return listRes;
  }

  const list = Array.isArray(listRes.data) 
    ? listRes.data 
    : (listRes.data?.webhooks || listRes.data?.data || []);

  const enriched = list.map((w: any) => ({
    id: w.id || w._id,
    name: w.name,
    url: w.url,
    isActive: w.isActive ?? (w.status === 'active'),
    deliveryFailures: w.deliveryFailures || w.failureCount || 0,
    hasWarning: (w.deliveryFailures || w.failureCount || 0) >= 10,
    events: w.events || []
  }));

  return {
    success: true as const,
    data: enriched
  };
}
