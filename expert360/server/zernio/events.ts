// server/zernio/events.ts
// Normalizador de Eventos de Zernio (Prompt 5)
// Adaptadores defensivos para Webhook vs REST, BSUID, Atribución y Deduplicación

import { findMatchingOutbound } from './messaging';

export interface NormalizedMessage {
  id: string;
  platformMessageId?: string;
  conversationId: string;
  senderId: string;
  senderPhone?: string;
  senderBusinessScopedUserId?: string;
  senderName?: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: number;
  status?: 'received' | 'sent' | 'delivered' | 'read' | 'failed';
  isSelfEcho?: boolean;
  attribution?: {
    ctwaClid?: string;
    metaAdId?: string;
    headline?: string;
    sourceUrl?: string;
  };
  raw: any;
}

export function normalizeWebhookEvent(envelope: any): {
  eventType: string;
  eventId: string;
  message?: NormalizedMessage;
  raw: any;
} {
  const event = String(envelope?.event || envelope?.type || 'unknown');
  const eventId = String(envelope?.id || envelope?.eventId || '');
  const rawMsg = envelope?.message || envelope?.data?.message || envelope?.data || {};
  const rawConv = envelope?.conversation || envelope?.data?.conversation || {};
  const rawSender = rawMsg?.sender || {};
  const rawMetadata = envelope?.metadata || rawMsg?.metadata || {};

  const direction: 'incoming' | 'outgoing' = 
    event === 'message.received' ? 'incoming' :
    event === 'message.sent' ? 'outgoing' :
    (rawMsg?.direction === 'outgoing' ? 'outgoing' : 'incoming');

  const text = String(
    rawMsg?.text || 
    rawMsg?.message || 
    rawMsg?.caption || 
    rawMsg?.body || 
    rawMsg?.content || ''
  );

  const id = String(rawMsg?.id || rawMsg?.platformMessageId || rawMsg?.wamid || eventId);
  const platformMessageId = rawMsg?.platformMessageId || rawMsg?.wamid;

  // Manejo de BSUID (WhatsApp Business Scoped User ID cuando sender.phone es null)
  const phone = rawSender?.phone || rawSender?.phoneNumber || rawMsg?.from;
  const bsuid = rawSender?.businessScopedUserId || rawSender?.bsuid;

  // Atribución Click To WhatsApp Ads (CTWA)
  const attribution = {
    ctwaClid: rawMetadata?.ctwa_clid || rawMetadata?.ctwaClid,
    metaAdId: rawMetadata?.meta_ad_id || rawMetadata?.ad_id,
    headline: rawMetadata?.ctwa_headline || rawMetadata?.headline,
    sourceUrl: rawMetadata?.ctwa_source_url || rawMetadata?.source_url
  };

  // Deduplicación del eco propio de message.sent
  let isSelfEcho = false;
  if (direction === 'outgoing') {
    const matching = findMatchingOutbound(text, phone);
    if (matching) {
      isSelfEcho = true;
    }
  }

  const normalizedMessage: NormalizedMessage = {
    id,
    platformMessageId,
    conversationId: String(rawConv?.id || envelope?.conversationId || rawMsg?.conversationId || phone || 'default'),
    senderId: String(rawSender?.id || bsuid || phone || 'unknown'),
    senderPhone: phone,
    senderBusinessScopedUserId: bsuid,
    senderName: rawSender?.name || rawSender?.pushname,
    direction,
    text,
    timestamp: envelope?.timestamp ? new Date(envelope.timestamp).getTime() : Date.now(),
    status: 
      event === 'message.delivered' ? 'delivered' :
      event === 'message.read' ? 'read' :
      event === 'message.failed' ? 'failed' :
      (direction === 'incoming' ? 'received' : 'sent'),
    isSelfEcho,
    attribution,
    raw: envelope
  };

  return {
    eventType: event,
    eventId,
    message: normalizedMessage,
    raw: envelope
  };
}
