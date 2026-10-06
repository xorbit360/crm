// server/zernio/messaging.ts
// Motor unificado de envío de mensajes vía Zernio (Prompt 6)
// Reglas estrictas:
// 1. Un solo camino de salida: enviarMensajeZernio()
// 2. Control de ventana de 24 horas (last_inbound_at). Fuera de ventana en WhatsApp exige plantilla.
// 3. POST /v1/inbox/conversations/{id}/messages (existente) vs POST /v1/inbox/conversations (nuevo)
// 4. Extracción de ID en data.messageId / data.messageIds[0]
// 5. Idempotencia con Idempotency-Key
// 6. Caché de salida reciente para deduplicar el eco de message.sent

import { zernioRequest } from './client';
import { flattenComponentsToParams } from './templates';

export interface OutboundMessageParams {
  accountId?: string;
  // Conversación existente
  conversationId?: string;
  // O destinatario para abrir conversación nueva
  recipientPhone?: string; // Para WhatsApp
  platform?: 'whatsapp' | 'instagram' | 'messenger';
  // Contenido
  text?: string;
  // Si se usa plantilla
  template?: {
    name: string;
    language?: string;
    components?: any[];
    params?: string[]; // Array plano si ya está calculado
  };
  // Metadata & Logística
  lastInboundAt?: string | number | Date;
  idempotencyKey?: string;
  orderId?: string;
  platformSource?: 'dropi' | 'mastershop' | 'effix' | 'crm' | 'personalizado';
}

export interface OutboundMessageResult {
  success: boolean;
  messageId?: string;
  conversationId?: string;
  error?: string;
  outside24hWindow?: boolean;
}

// Registro en memoria de mensajes salientes recientes (para deduplicación de eco webhook)
interface RecentOutbound {
  messageId: string;
  conversationId?: string;
  text?: string;
  phone?: string;
  timestamp: number;
}
const recentOutbounds: RecentOutbound[] = [];

export function recordRecentOutbound(item: RecentOutbound) {
  recentOutbounds.push(item);
  // Limpiar mayores a 5 minutos
  const cutoff = Date.now() - 5 * 60 * 1000;
  while (recentOutbounds.length > 0 && recentOutbounds[0].timestamp < cutoff) {
    recentOutbounds.shift();
  }
}

export function findMatchingOutbound(text: string, phone?: string): RecentOutbound | undefined {
  const cutoff = Date.now() - 2 * 60 * 1000; // últimos 2 minutos
  return recentOutbounds.find(m => 
    m.timestamp >= cutoff && 
    (!text || m.text === text) && 
    (!phone || m.phone === phone)
  );
}

/**
 * Valida si un contacto está dentro de la ventana de atención al cliente de 24 horas
 */
export function isWithin24Hours(lastInboundAt?: string | number | Date): boolean {
  if (!lastInboundAt) return false;
  const time = new Date(lastInboundAt).getTime();
  if (isNaN(time)) return false;
  const elapsed = Date.now() - time;
  return elapsed <= 24 * 60 * 60 * 1000;
}

/**
 * Función principal unificada de envío (Prompt 6)
 */
export async function enviarMensajeZernio(params: OutboundMessageParams): Promise<OutboundMessageResult> {
  const platform = params.platform || 'whatsapp';
  const inside24h = isWithin24Hours(params.lastInboundAt);

  // Validación de ventana de 24 horas en WhatsApp
  if (platform === 'whatsapp' && !inside24h && !params.template) {
    return {
      success: false,
      outside24hWindow: true,
      error: 'La ventana de 24 horas ha expirado. Para escribir a este cliente por WhatsApp es obligatorio enviar una Plantilla Aprobada (Template).'
    };
  }

  const idempotencyKey = params.idempotencyKey || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // CASO A: Conversación existente (POST /v1/inbox/conversations/{id}/messages)
  if (params.conversationId) {
    const body: any = {};
    if (params.template) {
      body.template = {
        elements: [
          {
            name: params.template.name,
            language: params.template.language || 'es',
            components: params.template.components || []
          }
        ]
      };
      if (params.text) body.text = params.text;
    } else {
      body.text = params.text;
    }

    const res = await zernioRequest({
      method: 'POST',
      path: `/v1/inbox/conversations/${params.conversationId}/messages`,
      body,
      idempotencyKey
    });

    if (res.success === false) {
      return {
        success: false,
        error: (res as any).error?.message || 'Error al enviar mensaje a Zernio'
      };
    }

    const data = res.data?.data || res.data || {};
    const messageId = data.messageId || (data.messageIds && data.messageIds[0]);

    if (messageId) {
      recordRecentOutbound({
        messageId,
        conversationId: params.conversationId,
        text: params.text,
        phone: params.recipientPhone,
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      messageId,
      conversationId: params.conversationId
    };
  }

  // CASO B: Abrir conversación nueva (POST /v1/inbox/conversations)
  if (!params.recipientPhone) {
    return {
      success: false,
      error: 'Se requiere conversationId o recipientPhone para enviar el mensaje'
    };
  }

  const body: any = {
    platform,
    recipient: params.recipientPhone
  };
  if (params.accountId) {
    body.accountId = params.accountId;
  }

  if (platform === 'whatsapp') {
    if (!params.template) {
      return {
        success: false,
        outside24hWindow: true,
        error: 'TEMPLATE_REQUIRED: WhatsApp no permite abrir un hilo nuevo con texto libre. Debes usar una plantilla.'
      };
    }

    body.templateName = params.template.name;
    body.templateLanguage = params.template.language || 'es';
    // templateParams debe ser un array plano de valores
    body.templateParams = params.template.params || 
      (params.template.components ? flattenComponentsToParams(params.template.components) : []);
  } else {
    body.text = params.text;
  }

  const res = await zernioRequest({
    method: 'POST',
    path: '/v1/inbox/conversations',
    body,
    idempotencyKey
  });

  if (res.success === false) {
    return {
      success: false,
      error: (res as any).error?.message || 'Error al abrir conversación en Zernio'
    };
  }

  const data = res.data?.data || res.data || {};
  const messageId = data.messageId || (data.messageIds && data.messageIds[0]);
  const conversationId = data.conversationId;

  if (messageId) {
    recordRecentOutbound({
      messageId,
      conversationId,
      text: params.text,
      phone: params.recipientPhone,
      timestamp: Date.now()
    });
  }

  return {
    success: true,
    messageId,
    conversationId
  };
}
