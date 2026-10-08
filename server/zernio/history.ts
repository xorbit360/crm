// server/zernio/history.ts
// Importador de Historial de Conversaciones (Prompt 7)
// Reglas estrictas:
// - Paginación por cursor con tope duro y protección de loop infinito
// - Validación de meta.failedAccounts
// - Distinción entre cuenta vacía y API caída
// - Salvaguarda: AI Agent safety flag para evitar responder a chats históricos

import { zernioRequest } from './client.ts';

export interface ImportOptions {
  accountId?: string;
  maxPages?: number; // Tope duro de páginas (por defecto 15)
  isAiAgentActive?: boolean; // Advertencia si el bot está activo
  limitPerPage?: number;
}

export interface ImportedConversation {
  id: string;
  externalId?: string;
  recipientPhone?: string;
  platform: string;
  lastMessageAt?: string;
  messagesCount?: number;
  unreadCount?: number;
  avatar?: string;
  accountId?: string;
  messages?: any[];
  participantName?: string;
  participantUsername?: string;
  participantId?: string;
  lastMessage?: string;
}

export async function importZernioConversations(options: ImportOptions = {}) {
  // SALVAGUARDA VITAL: Si el bot está activo, advertir o requerir confirmación
  if (options.isAiAgentActive) {
    console.warn('[Zernio History] ⚠️ ADVERTENCIA CRÍTICA: Se intentó importar historial con el Agente de IA activo. Se recomienda apagar el agente para evitar disparar respuestas a clientes históricos.');
  }

  const maxPages = options.maxPages || 15;
  const limit = options.limitPerPage || 50;
  let nextCursor: string | undefined = undefined;
  let page = 0;
  const allConversations: ImportedConversation[] = [];
  const failedAccounts: string[] = [];

  while (page < maxPages) {
    page++;
    const query = new URLSearchParams();
    query.set('limit', String(limit));
    if (nextCursor) query.set('cursor', nextCursor);
    if (options.accountId) query.set('accountId', options.accountId);

    const res = await zernioRequest<{
      data?: any[];
      conversations?: any[];
      pagination?: { hasMore: boolean; nextCursor?: string };
      meta?: { failedAccounts?: string[] };
    }>({
      method: 'GET',
      path: `/v1/inbox/conversations?${query.toString()}`
    });

    if (res.success === false) {
      return {
        success: false,
        error: `Fallo al importar página ${page}: ${(res as any).error?.message || 'Error desconocido'}`,
        importedSoFar: allConversations
      };
    }

    const resData = res.data;
    // Mirar meta.failedAccounts (Prompt 7)
    if (resData?.meta?.failedAccounts && Array.isArray(resData.meta.failedAccounts)) {
      failedAccounts.push(...resData.meta.failedAccounts);
    }

    // La lista de conversaciones usa "data" o "conversations"
    const items = resData?.data || resData?.conversations || [];
    if (!Array.isArray(items) || items.length === 0) {
      break;
    }

    for (const raw of items) {
      const conversationId = String(raw.id || raw._id);
      const accountId = String(raw.accountId || options.accountId || '');
      let recentMessages: any[] = [];
      if (accountId && conversationId) {
        const messageResult = await zernioRequest<any>({ method: 'GET', path: `/v1/inbox/conversations/${conversationId}/messages?accountId=${encodeURIComponent(accountId)}&limit=100&sortOrder=asc` });
        if (messageResult.success) recentMessages = (messageResult.data as any)?.messages || (messageResult.data as any)?.data?.messages || [];
      }
      allConversations.push({
        id: conversationId,
        accountId,
        externalId: raw.externalId || raw.platformConversationId,
        participantName: raw.participantName || raw.contact?.name || raw.name,
        participantUsername: raw.participantUsername || raw.contact?.username || raw.username,
        participantId: raw.participantId || raw.contact?.id,
        lastMessage: raw.lastMessage || raw.lastMessageText || '',
        recipientPhone: raw.recipient?.phone || raw.phone || raw.contact?.phone,
        platform: raw.platform || 'whatsapp',
        lastMessageAt: raw.lastMessageAt || raw.updatedTime || raw.updatedAt,
        messagesCount: raw.messagesCount || 0,
        unreadCount: raw.unreadCount || 0
        ,avatar: raw.participantPicture || raw.contact?.profilePicture || raw.contact?.profile_picture || raw.contact?.profile_image_url || raw.contact?.avatar || raw.participantProfilePicture || raw.participantAvatar || raw.profilePictureUrl || raw.profilePicture || raw.avatar || ''
        ,messages: recentMessages
      });
    }

    const hasMore = Boolean(resData?.pagination?.hasMore);
    const newCursor = resData?.pagination?.nextCursor;

    // Condición de parada segura contra loop infinito
    if (!hasMore || !newCursor || newCursor === nextCursor) {
      break;
    }

    nextCursor = newCursor;
  }

  return {
    success: true,
    totalImported: allConversations.length,
    pagesLoaded: page,
    failedAccounts: Array.from(new Set(failedAccounts)),
    hasAccountDegradation: failedAccounts.length > 0,
    conversations: (() => {
      const grouped = new Map<string, ImportedConversation>();
      for (const conversation of allConversations) {
        const platform = String(conversation.platform || '').toLowerCase();
        const participant = String(
          conversation.participantId || conversation.participantUsername ||
          conversation.externalId || conversation.recipientPhone || conversation.participantName || conversation.id
        ).trim().toLowerCase();
        const key = `${platform}|${conversation.accountId || ''}|${participant}`;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, { ...conversation, messages: [...(conversation.messages || [])] });
          continue;
        }
        const combined = [...(existing.messages || []), ...(conversation.messages || [])];
        const unique = new Map<string, any>();
        for (const message of combined) {
          const messageKey = String(message.id || message.messageId || `${message.timestamp || message.createdAt || ''}|${message.text || message.message || message.body || ''}`);
          unique.set(messageKey, message);
        }
        existing.messages = Array.from(unique.values()).sort((a: any, b: any) =>
          new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime()
        );
        existing.unreadCount = (Number(existing.unreadCount) || 0) + (Number(conversation.unreadCount) || 0);
        const currentTime = new Date(existing.lastMessageAt || 0).getTime();
        const nextTime = new Date(conversation.lastMessageAt || 0).getTime();
        if (nextTime >= currentTime) {
          existing.id = conversation.id;
          existing.lastMessage = conversation.lastMessage;
          existing.lastMessageAt = conversation.lastMessageAt;
        }
        if (!existing.avatar && conversation.avatar) existing.avatar = conversation.avatar;
      }
      return Array.from(grouped.values());
    })()
  };
}
