// server/zernio/messaging.ts
// Motor unificado de envío de mensajes vía Zernio (Prompt 6)
// Reglas estrictas:
// 1. Un solo camino de salida: enviarMensajeZernio()
// 2. Control de ventana de 24 horas (last_inbound_at). Fuera de ventana en WhatsApp exige plantilla.
// 3. POST /v1/inbox/conversations/{id}/messages (existente) vs POST /v1/inbox/conversations (nuevo)
// 4. Extracción de ID en data.messageId / data.messageIds[0]
// 5. Idempotencia con Idempotency-Key
// 6. Caché de salida reciente para deduplicar el eco de message.sent

import { zernioRequest } from './client.ts';
import { flattenComponentsToParams } from './templates.ts';

export interface OutboundMessageParams {
  accountId?: string;
  // Conversación existente
  conversationId?: string;
  // O destinatario para abrir conversación nueva
  recipientPhone?: string; // Para WhatsApp
  participantId?: string; // Instagram / Messenger
  participantUsername?: string;
  platform?: 'whatsapp' | 'instagram' | 'messenger' | 'facebook';
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

function cleanIdentifier(value: unknown): string {
  return String(value || '').trim();
}

function cleanUsername(value: unknown): string {
  return cleanIdentifier(value).replace(/^@/, '').toLowerCase();
}

/**
 * Instagram/Facebook only allow replies to an existing thread. Webhook-created
 * CRM cards can temporarily be missing the conversation or account identifier,
 * so recover both from the inbox before sending.
 */
async function resolveExistingSocialConversation(params: OutboundMessageParams): Promise<{
  conversationId?: string;
  accountId?: string;
  error?: string;
}> {
  const suppliedConversationId = cleanIdentifier(params.conversationId);
  const suppliedAccountId = cleanIdentifier(params.accountId);

  if (suppliedConversationId && suppliedAccountId) {
    return { conversationId: suppliedConversationId, accountId: suppliedAccountId };
  }

  const query = new URLSearchParams({ limit: '100' });
  if (suppliedAccountId) query.set('accountId', suppliedAccountId);
  const lookup = await zernioRequest<any>({
    method: 'GET',
    path: `/v1/inbox/conversations?${query.toString()}`
  });

  if (lookup.success === false) {
    return { error: lookup.error?.message || 'No fue posible consultar la conversación del canal conectado' };
  }

  const payload: any = lookup.data || {};
  const conversations: any[] = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload.data) ? payload.data : (Array.isArray(payload.conversations) ? payload.conversations : []));
  const participantId = cleanIdentifier(params.participantId || params.recipientPhone);
  const participantUsername = cleanUsername(params.participantUsername);
  const expectedPlatform = params.platform === 'messenger' ? 'facebook' : String(params.platform || '').toLowerCase();

  const matching = conversations
    .filter((conversation: any) => {
      const candidatePlatform = String(conversation?.platform || '').toLowerCase();
      if (expectedPlatform && candidatePlatform && candidatePlatform !== expectedPlatform) return false;

      const candidateIds = [
        conversation?.id,
        conversation?._id,
        conversation?.participantId,
        conversation?.externalId,
        conversation?.platformConversationId,
        conversation?.contact?.id
      ].map(cleanIdentifier).filter(Boolean);
      const candidateUsernames = [
        conversation?.participantUsername,
        conversation?.username,
        conversation?.contact?.username
      ].map(cleanUsername).filter(Boolean);

      return Boolean(
        (suppliedConversationId && candidateIds.includes(suppliedConversationId)) ||
        (participantId && candidateIds.includes(participantId)) ||
        (participantUsername && candidateUsernames.includes(participantUsername))
      );
    })
    .sort((a: any, b: any) => {
      const aTime = new Date(a?.lastMessageAt || a?.updatedTime || a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.lastMessageAt || b?.updatedTime || b?.updatedAt || 0).getTime();
      return bTime - aTime;
    })[0];

  if (!matching) {
    return { error: 'No se encontró una conversación activa para este contacto. Sincroniza el canal e inténtalo nuevamente.' };
  }

  return {
    conversationId: cleanIdentifier(matching.id || matching._id),
    accountId: cleanIdentifier(matching.accountId || suppliedAccountId)
  };
}

/**
 * Función principal unificada de envío (Prompt 6)
 */
export async function enviarMensajeZernio(params: OutboundMessageParams): Promise<OutboundMessageResult> {
  const platform = params.platform || 'whatsapp';
  const isMetaSocial = platform === 'instagram' || platform === 'messenger' || platform === 'facebook';
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

  let conversationId = cleanIdentifier(params.conversationId);
  let accountId = cleanIdentifier(params.accountId);

  // Avoid falling through to the create-conversation endpoint when a social
  // chat imported from a webhook is missing one of its identifiers.
  if (isMetaSocial && (!conversationId || !accountId)) {
    const resolved = await resolveExistingSocialConversation(params);
    if (resolved.error || !resolved.conversationId || !resolved.accountId) {
      return {
        success: false,
        error: resolved.error || 'No se pudo identificar la conversación del canal conectado'
      };
    }
    conversationId = resolved.conversationId;
    accountId = resolved.accountId;
  }

  // CASO A: Conversación existente (POST /v1/inbox/conversations/{id}/messages)
  if (conversationId) {
    const body: any = {};
    if (accountId) body.accountId = accountId;
    if (params.platform) body.platform = params.platform;
    if (isMetaSocial) {
      const participantId = cleanIdentifier(params.participantId || params.recipientPhone);
      const participantUsername = cleanIdentifier(params.participantUsername);
      if (participantId) body.participantId = participantId;
      if (participantUsername) body.participantUsername = participantUsername;
    }
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
      if (params.text) {
        body.text = params.text;
        body.message = params.text;
      }
    } else {
      body.text = params.text;
      body.message = params.text;
    }

    const res = await zernioRequest({
      method: 'POST',
      path: `/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`,
      body,
      idempotencyKey
    });

    if (res.success === false) {
      return {
        success: false,
        error: (res as any).error?.message || 'Error al enviar mensaje por el canal conectado'
      };
    }

    const data = res.data?.data || res.data || {};
    const messageId = data.messageId || (data.messageIds && data.messageIds[0]);

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

  // Meta does not allow cold-starting an Instagram/Facebook DM through this
  // API. Only an existing conversation can be answered.
  if (isMetaSocial) {
    return {
      success: false,
      error: 'No se encontró una conversación activa para responder. Sincroniza el canal e inténtalo nuevamente.'
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
  if (accountId) body.accountId = accountId;

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
    body.message = params.text;
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
      error: (res as any).error?.message || 'Error al abrir la conversación del canal conectado'
    };
  }

  const data = res.data?.data || res.data || {};
  const messageId = data.messageId || (data.messageIds && data.messageIds[0]);
  const createdConversationId = data.conversationId;

  if (messageId) {
    recordRecentOutbound({
      messageId,
      conversationId: createdConversationId,
      text: params.text,
      phone: params.recipientPhone,
      timestamp: Date.now()
    });
  }

  return {
    success: true,
    messageId,
    conversationId: createdConversationId
  };
}
