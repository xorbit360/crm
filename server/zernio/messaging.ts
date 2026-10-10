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
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

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
  attachmentUrl?: string;
  attachmentType?: 'audio' | 'image' | 'video' | 'file';
  // Nota de voz grabada en el CRM (base64 o data URL): se sube al canal antes de enviar
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
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

  // Nota de voz: si llega el audio en base64, se sube primero al
  // almacenamiento del canal para obtener una URL pública reproducible.
  let attachmentUrl = params.attachmentUrl;
  let attachmentType = params.attachmentType;
  if (conversationId && !attachmentUrl && params.mediaBase64) {
    const uploaded = await uploadMediaToZernio({
      mediaBase64: params.mediaBase64,
      mediaMimeType: params.mediaMimeType,
      mediaFileName: params.mediaFileName,
      needsM4a: isMetaSocial
    });
    if (uploaded.error || !uploaded.publicUrl) {
      return { success: false, error: uploaded.error || 'No se pudo preparar la nota de voz' };
    }
    attachmentUrl = uploaded.publicUrl;
    attachmentType = 'audio';
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

    if (attachmentUrl) {
      body.attachmentUrl = attachmentUrl;
      body.attachmentType = attachmentType || 'audio';
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


// ---------------------------------------------------------------------------
// Subida de notas de voz al almacenamiento del canal (Zernio presign + PUT)
// Instagram/Messenger solo aceptan audio en contenedor MP4 (M4A/AAC), por lo
// que las grabaciones webm/ogg del navegador se convierten con ffmpeg.
// ---------------------------------------------------------------------------

async function convertAudioToM4a(input: Buffer): Promise<Buffer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xorbit-audio-'));
  const inPath = path.join(dir, 'input.audio');
  const outPath = path.join(dir, 'output.m4a');
  try {
    await fs.promises.writeFile(inPath, input);
    await new Promise<void>((resolve, reject) => {
      execFile('ffmpeg', ['-y', '-i', inPath, '-vn', '-c:a', 'aac', '-b:a', '64k', outPath], { timeout: 45000 }, (err) => (err ? reject(err) : resolve()));
    });
    return await fs.promises.readFile(outPath);
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function uploadMediaToZernio(params: {
  mediaBase64: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  needsM4a: boolean;
}): Promise<{ publicUrl?: string; error?: string }> {
  try {
    let mime = String(params.mediaMimeType || '').toLowerCase();
    let base64 = String(params.mediaBase64 || '');
    if (base64.startsWith('data:')) {
      const match = base64.match(/^data:([^;]+);base64,/);
      if (match && !mime) mime = match[1].toLowerCase();
      base64 = base64.split(',')[1] || '';
    }
    if (!base64) return { error: 'La nota de voz llegó sin contenido de audio' };
    if (!mime) mime = 'audio/webm';

    let buffer: Buffer;
    const looksLikePath = base64.startsWith('/uploads/') || base64.includes('/uploads/');
    const looksLikeUrl = /^https?:\/\//i.test(base64);
    if (looksLikePath || looksLikeUrl) {
      try {
        if (looksLikePath) {
          const fileName = base64.split('/uploads/')[1]?.split(/[?#]/)[0] || '';
          buffer = await fs.promises.readFile(path.join(process.cwd(), 'uploads', fileName));
          if (fileName.endsWith('.ogg')) mime = 'audio/ogg';
          else if (fileName.endsWith('.mp3')) mime = 'audio/mpeg';
          else if (fileName.endsWith('.wav')) mime = 'audio/wav';
          else if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4')) mime = 'audio/mp4';
        } else {
          const fetched = await fetch(base64);
          if (!fetched.ok) return { error: 'No se pudo leer la nota de voz grabada' };
          buffer = Buffer.from(await fetched.arrayBuffer());
        }
      } catch {
        return { error: 'No se pudo leer la nota de voz grabada' };
      }
    } else {
      buffer = Buffer.from(base64, 'base64');
    }
    let ext = mime.includes('mp4') || mime.includes('m4a')
      ? 'm4a'
      : mime.includes('mpeg') || mime.includes('mp3')
        ? 'mp3'
        : mime.includes('ogg')
          ? 'ogg'
          : mime.includes('wav')
            ? 'wav'
            : mime.includes('aac')
              ? 'aac'
              : 'webm';

    if (params.needsM4a && !/audio\/(mp4|m4a|aac|x-m4a)/.test(mime)) {
      try {
        buffer = await convertAudioToM4a(buffer);
        mime = 'audio/mp4';
        ext = 'm4a';
      } catch (convErr: any) {
        console.error('[Zernio] Error convirtiendo la nota de voz a M4A:', convErr?.message || convErr);
        return { error: 'No se pudo convertir la nota de voz al formato que acepta Instagram (M4A).' };
      }
    }

    const fileName = (params.mediaFileName || `nota_de_voz_${Date.now()}`).replace(/\.[a-z0-9]+$/i, '') + `.${ext}`;
    const presign = await zernioRequest<any>({
      method: 'POST',
      path: '/v1/media/presign',
      body: { filename: fileName, contentType: mime, size: buffer.length }
    });
    if ((presign as any).success === false) {
      return { error: (presign as any).error?.message || 'El canal no aceptó la subida del audio' };
    }
    const presignData: any = (presign as any).data?.data || (presign as any).data || {};
    const uploadUrl = presignData.uploadUrl;
    const publicUrl = presignData.publicUrl;
    if (!uploadUrl || !publicUrl) return { error: 'El canal no devolvió la dirección de subida del audio' };

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mime },
      body: new Uint8Array(buffer)
    });
    if (!put.ok) return { error: `La subida del audio falló (${put.status})` };
    return { publicUrl };
  } catch (e: any) {
    return { error: e?.message || 'Error subiendo la nota de voz' };
  }
}
