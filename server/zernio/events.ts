// server/zernio/events.ts
// Normalizador de Eventos de Zernio (Prompt 5)
// Adaptadores defensivos para Webhook vs REST, BSUID, Atribución y Deduplicación

import { findMatchingOutbound } from './messaging.ts';

export interface NormalizedMessage {
  id: string;
  platformMessageId?: string;
  conversationId: string;
  senderId: string;
  senderPhone?: string;
  senderBusinessScopedUserId?: string;
  senderName?: string;
  senderAvatar?: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  attachment?: {
    type: 'audio' | 'imagen' | 'video' | 'archivo';
    url: string;
    name?: string;
  };
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

function extractZernioAttachment(rawMsg: any): NormalizedMessage['attachment'] {
  const candidates: any[] = [];
  if (Array.isArray(rawMsg?.attachments)) candidates.push(...rawMsg.attachments);
  if (rawMsg?.attachment) candidates.push(rawMsg.attachment);
  if (Array.isArray(rawMsg?.message?.attachments)) candidates.push(...rawMsg.message.attachments);
  if (rawMsg?.mediaUrl) candidates.push({ url: rawMsg.mediaUrl, type: rawMsg.type || rawMsg.mediaType });
  if (Array.isArray(rawMsg?.media)) candidates.push(...rawMsg.media);
  else if (rawMsg?.media) candidates.push(rawMsg.media);

  for (const candidate of candidates) {
    const url = candidate?.url || candidate?.payload?.url || candidate?.mediaUrl || candidate?.href || '';
    if (!url) continue;
    const rawType = String(candidate?.type || candidate?.mediaType || candidate?.kind || '').toLowerCase();
    const type = /audio|voice|ptt/.test(rawType)
      ? 'audio'
      : /image|photo|sticker|gif/.test(rawType)
        ? 'imagen'
        : /video|reel|mp4/.test(rawType)
          ? 'video'
          : 'archivo';
    return { type, url: String(url), name: candidate?.name || candidate?.fileName || undefined };
  }

  if (rawMsg?.attachmentUrl) {
    const rawType = String(rawMsg.attachmentType || '').toLowerCase();
    const type = rawType === 'audio' ? 'audio' : rawType === 'image' ? 'imagen' : rawType === 'video' ? 'video' : 'archivo';
    return { type, url: String(rawMsg.attachmentUrl) };
  }

  return undefined;
}

export function normalizeWebhookEvent(envelope: any): {
  eventType: string;
  eventId: string;
  message?: NormalizedMessage;
  raw: any;
} {
  const event = String(envelope?.event || envelope?.type || envelope?.data?.event || envelope?.data?.type || 'unknown');
  const eventId = String(envelope?.id || envelope?.eventId || '');
  const rawMsg = envelope?.message || envelope?.data?.message || envelope?.payload?.message || envelope?.data?.payload || envelope?.data || {};
  const rawConv = envelope?.conversation || envelope?.data?.conversation || {};
  const rawSender = rawMsg?.sender || rawMsg?.from || envelope?.sender || envelope?.data?.sender || {};
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

  const attachment = extractZernioAttachment(rawMsg);

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
    senderAvatar:
      rawSender?.profilePicture ||
      rawSender?.profilePictureUrl ||
      rawSender?.profile_picture ||
      rawSender?.profile_image_url ||
      rawSender?.avatar ||
      rawConv?.participantPicture ||
      rawConv?.participantProfilePicture ||
      rawConv?.participantAvatar,
    direction,
    text,
    attachment,
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
