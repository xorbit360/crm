// server/social.ts
// Módulo Social unificado: Bandeja omnicanal + Automatizaciones + Contenido
// Usa Zernio Inbox API (/v1/inbox/*) con fallback a datos locales (webhooks).

import express from 'express';
import { zernioRequest } from './zernio/client.ts';
import { getSupabase } from './supabase.ts';
import { decryptSecret, isEncryptedSecret } from './secretBox.ts';

type AnyRow = Record<string, any>;

function getDB(): any {
  return (globalThis as any).currentDB || {};
}

function isSocialChat(c: AnyRow): boolean {
  const p = String(c.platform || c.channelId || '').toLowerCase();
  return ['instagram', 'facebook', 'messenger'].includes(p) || p.startsWith('social_');
}

function personKeyFromChat(c: AnyRow): string {
  return String(c.participantId || c.externalId || c.conversationId || c.phone || c.id || '').trim();
}

function personKeyFromComment(m: AnyRow): string {
  return String(m.authorId || m.authorName || m.id || '').trim();
}

/** Construye hilos unificados fusionando DMs sociales + comentarios por persona. */
/** Mensajes DM de un chat social: c.messages, messagesHistory[id] o historial del auto-bot. */
function collectSocialChatMessages(db: any, c: AnyRow): AnyRow[] {
  const out: AnyRow[] = [];
  const seen = new Set<string>();
  const push = (m: any) => {
    if (!m) return;
    const fromMe = m.fromMe !== undefined ? !!m.fromMe
      : (m.sender === 'agent' || m.role === 'agent' || m.role === 'assistant');
    const text = String(m.text || m.body || m.content || '');
    const at = m.timestamp || m.at || m.time || Date.now();
    const key = String(m.id || m.remoteId || (at + '|' + text)).trim();
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    out.push({
      id: m.id || m.remoteId || ('m-' + key),
      origin: 'dm',
      fromMe,
      text,
      at,
      authorName: m.authorName || undefined,
      attachment: m.attachment || undefined,
    });
  };
  if (Array.isArray((c as any).messages)) (c as any).messages.forEach(push);
  const hist = (db && (db as any).messagesHistory) || {};
  const platform = String((c as any).platform || '').toLowerCase();
  const candKeys = [
    (c as any).id,
    (c as any).conversationId ? 'social:' + platform + ':' + (c as any).conversationId : '',
    (c as any).participantId ? 'social:' + platform + ':' + (c as any).participantId : '',
    (c as any).externalId ? 'social:' + platform + ':' + (c as any).externalId : '',
  ].filter(Boolean);
  for (const k of candKeys) {
    const arr = (hist as any)[k];
    if (Array.isArray(arr)) arr.forEach(push);
  }
  return out;
}

export function buildSocialThreads(db: any): AnyRow[] {
  const map = new Map<string, AnyRow>();
  const chats: AnyRow[] = Array.isArray(db.chats) ? db.chats : [];
  const comments: AnyRow[] = Array.isArray(db.socialComments) ? db.socialComments : [];

  for (const c of chats) {
    if (!isSocialChat(c)) continue;
    const key = personKeyFromChat(c);
    if (!key) continue;
    const msgs: AnyRow[] = collectSocialChatMessages(db, c);
    const thread = map.get(key) || {
      id: `person:${key}`,
      personId: key,
      personName: c.name || c.pushName || 'Usuario',
      personAvatar: c.avatar || '',
      platform: String(c.platform || 'instagram').toLowerCase(),
      origins: new Set<string>(),
      messages: [] as AnyRow[],
      lastAt: 0,
      unread: 0,
      accountId: c.accountId || '',
      conversationId: c.conversationId || '',
    };
    thread.origins.add('dm');
    for (const m of msgs) {
      thread.messages.push({
        ...m,
        authorName: m.fromMe ? undefined : (m.authorName || thread.personName),
      });
    }
    const lastMsgAt = msgs.length ? Math.max(...msgs.map((m: any) => new Date(m.timestamp || m.at || 0).getTime() || 0)) : 0;
    thread.lastAt = Math.max(thread.lastAt, lastMsgAt);
    thread.unread += Number(c.unread || 0);
    if (!thread.conversationId && c.conversationId) thread.conversationId = c.conversationId;
    if (!thread.accountId && c.accountId) thread.accountId = c.accountId;
    map.set(key, thread);
  }

  for (const cm of comments) {
    const key = personKeyFromComment(cm);
    if (!key) continue;
    const thread = map.get(key) || {
      id: `person:${key}`,
      personId: key,
      personName: cm.authorName || 'Usuario de red social',
      personAvatar: cm.authorAvatar || '',
      platform: String(cm.platform || 'instagram').toLowerCase(),
      origins: new Set<string>(),
      messages: [] as AnyRow[],
      lastAt: 0,
      unread: 0,
      accountId: cm.accountId || '',
      conversationId: '',
    };
    thread.origins.add('comment');
    thread.messages.push({
      id: cm.id,
      origin: 'comment',
      fromMe: false,
      text: cm.text || '',
      at: cm.timestamp || new Date().toISOString(),
      authorName: cm.authorName,
      postRef: { postId: cm.postId || '', postTitle: cm.postTitle || '' },
      commentId: cm.id,
      postId: cm.postId || '',
      accountId: cm.accountId || thread.accountId || '',
    });
    const at = new Date(cm.timestamp || 0).getTime() || 0;
    if (at > thread.lastAt) thread.lastAt = at;
    if (cm.status === 'pendiente') thread.unread += 1;
    if (cm.authorAvatar && !thread.personAvatar) thread.personAvatar = cm.authorAvatar;
    map.set(key, thread);
  }

  const threads = [...map.values()].map((t) => ({
    ...t,
    origins: [...t.origins],
    messages: t.messages.sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime()),
  }));
  threads.sort((a, b) => b.lastAt - a.lastAt);
  return threads;
}

/** Espejo local de automatizaciones (para mostrar estado sin llamar a Zernio cada vez). */
function getAutomations(db: any): AnyRow[] {
  if (!Array.isArray(db.socialAutomations)) db.socialAutomations = [];
  return db.socialAutomations;
}

function saveDB(_db: any) {
  try {
    const fn = (globalThis as any).saveDB || (globalThis as any).persistDB;
    if (typeof fn === 'function') fn();
  } catch { /* noop */ }
}

/** Pausa el auto-bot social para el hilo (asesor respondio manualmente) y guarda historial. */
function pauseSocialBotForThread(db: any, thread: AnyRow, text: string): void {
  try {
    const platform = String(thread.platform || 'instagram').toLowerCase();
    const bases = [thread.conversationId, thread.personId].filter(Boolean).map(String);
    if (!Array.isArray(db.disabledBots)) db.disabledBots = [];
    const nowStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    for (const b of bases) {
      const key = 'social:' + platform + ':' + b;
      if (!db.disabledBots.includes(key)) db.disabledBots.push(key);
      if (!db.messagesHistory) db.messagesHistory = {};
      if (!Array.isArray(db.messagesHistory[key])) db.messagesHistory[key] = [];
      db.messagesHistory[key].push({
        role: 'agent', remoteId: 'crm-' + Date.now(), source: 'crm', fromSocial: true,
        text: text, time: nowStr, timestamp: Date.now(),
      });
    }
    saveDB(db);
  } catch { /* noop */ }
}

// ---------- Respuestas IA a comentarios (modo prompt) ----------
const SOCIAL_AI_WORKSPACE = 'default';

async function resolveSocialAiKey(): Promise<string> {
  const envKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  if (envKey) return envKey;
  try {
    const client = getSupabase();
    if (!client) return '';
    const { data } = await client
      .from('app_settings')
      .select('value')
      .eq('workspace_id', SOCIAL_AI_WORKSPACE)
      .eq('key', 'openrouterApiKey')
      .maybeSingle();
    const raw = data?.value ? String(data.value) : '';
    return String(isEncryptedSecret(raw) ? decryptSecret(raw) : raw).trim();
  } catch {
    return '';
  }
}

async function aiCommentReply(aiPrompt: string, commentText: string, authorName: string): Promise<string | null> {
  const key = await resolveSocialAiKey();
  if (!key) return null;
  const model = String(process.env.OPENROUTER_RESPONSE_MODEL || 'openai/gpt-4o-mini').trim();
  const prompt = [
    aiPrompt.trim(),
    '',
    `Comentario de ${authorName || 'un seguidor'}: "${commentText}"`,
    '',
    'Formato: responde en español, máximo 280 caracteres, tono natural de red social. Devuelve ÚNICAMENTE el texto de la respuesta, sin comillas ni explicaciones.',
  ].join('\n');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.7, max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json: any = await res.json().catch(() => null);
    const text = String(json?.choices?.[0]?.message?.content || '').trim();
    return text ? text.slice(0, 300) : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Procesa un comentario entrante (webhook comment.received) con automatizaciones IA activas. */
export async function handleIncomingSocialComment(event: any): Promise<void> {
  try {
    const raw = event?.raw || event || {};
    const data = raw?.data || {};
    const c = data?.comment || data?.payload || data?.message || data || {};
    const text = String(c?.text || c?.message || c?.body || data?.text || '').trim();
    if (!text) return;
    const accountId = String(data?.accountId || c?.accountId || raw?.accountId || '');
    const postId = String(c?.postId || c?.platformPostId || c?.mediaId || data?.postId || '');
    const commentId = String(c?.id || c?.commentId || c?.platformCommentId || data?.commentId || '');
    const author = String(c?.authorName || c?.username || c?.from?.name || c?.senderName || 'un seguidor');
    if (!accountId || !postId) return;

    const db = getDB();
    const list = getAutomations(db);
    const active = list.filter((a: AnyRow) => a.type === 'comment_ai' && a.isActive !== false && String(a.accountId) === accountId);
    if (!active.length) return;

    for (const auto of active) {
      const reply = await aiCommentReply(String(auto.aiPrompt || ''), text, author);
      if (!reply) continue;
      try {
        await zernioRequest({
          method: 'POST',
          path: `/v1/inbox/comments/${encodeURIComponent(postId)}`,
          body: { accountId, message: reply, commentId },
        });
        if (!Array.isArray((auto as any).logs)) (auto as any).logs = [];
        (auto as any).logs.unshift({ at: new Date().toISOString(), comment: text.slice(0, 120), reply: reply.slice(0, 120), ok: true });
        (auto as any).logs = (auto as any).logs.slice(0, 50);
      } catch (e: any) {
        console.error('[Social AI] No se pudo responder el comentario:', e?.message || e);
      }
    }
    saveDB(db);
  } catch (e: any) {
    console.error('[Social AI] Error procesando comentario:', e?.message || e);
  }
}

export function setupSocialRoutes(app: express.Express) {
  const router = express.Router();

  // ---------- Bandeja ----------
  router.get('/threads', async (_req, res) => {
    try {
      const db = getDB();
      const threads = buildSocialThreads(db);
      res.json({ success: true, threads, count: threads.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  // Responder: DM si hay conversación, comentario público si el hilo es solo-comentario
  router.post('/threads/:id/reply', async (req, res) => {
    try {
      const db = getDB();
      const threads = buildSocialThreads(db);
      const thread = threads.find((t) => t.id === req.params.id);
      if (!thread) return res.status(404).json({ success: false, error: 'Hilo no encontrado' });
      const text = String(req.body?.text || '').trim();
      if (!text) return res.status(400).json({ success: false, error: 'Mensaje vacío' });

      const hasDM = thread.origins.includes('dm') && thread.conversationId;
      if (hasDM) {
        // Responder por DM via Zernio
        const r = await zernioRequest({
          method: 'POST',
          path: `/v1/inbox/conversations/${encodeURIComponent(thread.conversationId)}/messages`,
          body: { accountId: thread.accountId, message: { type: 'text', text } },
        });
        if ((r as any).success === false) {
          return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó el envío' });
        }
      } else {
        // Responder como comentario público en el post
        const firstComment = thread.messages.find((m: any) => m.origin === 'comment');
        if (!firstComment?.postId) return res.status(400).json({ success: false, error: 'Sin post de referencia' });
        const r = await zernioRequest({
          method: 'POST',
          path: `/v1/inbox/comments/${encodeURIComponent(firstComment.postId)}`,
          body: { accountId: thread.accountId || firstComment.accountId, message: text, commentId: firstComment.commentId },
        });
        if ((r as any).success === false) {
          return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó el envío' });
        }
      }
      // Reflejar localmente
      thread.messages.push({ id: `local-${Date.now()}`, origin: hasDM ? 'dm' : 'comment', fromMe: true, text, at: new Date().toISOString() });
      // Auto-pausa del bot: el asesor respondio manualmente -> la IA no debe responder en este hilo
      pauseSocialBotForThread(db, thread, text);
      res.json({ success: true, via: hasDM ? 'dm' : 'comment' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  // Pasar un comentario a DM (private reply)
  router.post('/threads/:id/to-dm', async (req, res) => {
    try {
      const db = getDB();
      const threads = buildSocialThreads(db);
      const thread = threads.find((t) => t.id === req.params.id);
      if (!thread) return res.status(404).json({ success: false, error: 'Hilo no encontrado' });
      const text = String(req.body?.text || '').trim();
      if (!text) return res.status(400).json({ success: false, error: 'Mensaje vacío' });
      const firstComment = thread.messages.find((m: any) => m.origin === 'comment');
      if (!firstComment?.postId || !firstComment?.commentId) {
        return res.status(400).json({ success: false, error: 'Sin comentario de referencia' });
      }
      const r = await zernioRequest({
        method: 'POST',
        path: `/v1/inbox/comments/${encodeURIComponent(firstComment.postId)}/${encodeURIComponent(firstComment.commentId)}/private-reply`,
        body: { accountId: thread.accountId || firstComment.accountId, message: text },
      });
      if ((r as any).success === false) {
        return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó el envío' });
      }
      pauseSocialBotForThread(db, thread, text);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  router.get('/accounts', async (_req, res) => {
    try {
      const r = await zernioRequest({ method: 'GET', path: '/v1/accounts' });
      if ((r as any).success === false) {
        return res.status(502).json({ success: false, error: (r as any).error?.message || 'No se pudo listar cuentas' });
      }
      const data: any = (r as any).data;
      const accounts = (data?.accounts || data || []).filter((a: any) =>
        ['instagram', 'facebook'].includes(String(a.platform || '').toLowerCase()));
      res.json({ success: true, accounts });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  // ---------- Automatizaciones ----------
  router.get('/automations', (req, res) => {
    const db = getDB();
    const accountId = String(req.query.accountId || '');
    let list = getAutomations(db);
    if (accountId) list = list.filter((a) => a.accountId === accountId);
    res.json({ success: true, automations: list });
  });

  // Crear automatización: comment-to-DM | story_mention | story_reply | ice_breakers
  router.post('/automations', async (req, res) => {
    try {
      const db = getDB();
      const { type, accountId, name, keywords, dmMessage, commentReply, isActive } = req.body || {};
      if (!type || !accountId) return res.status(400).json({ success: false, error: 'Faltan type y accountId' });

      if (type === 'ice_breakers') {
        const prompts: string[] = Array.isArray(req.body.prompts) ? req.body.prompts.slice(0, 4) : [];
        const r = await zernioRequest({
          method: 'PUT', path: `/v1/accounts/${encodeURIComponent(accountId)}/instagram-ice-breakers`,
          body: { prompts: prompts.map((p) => ({ question: String(p).slice(0, 80) })) },
        });
        if ((r as any).success === false) {
          return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó los ice breakers' });
        }
        const item = { id: `ib-${accountId}`, type, accountId, name: name || 'Ice breakers', prompts, isActive: isActive !== false, updatedAt: new Date().toISOString() };
        const list = getAutomations(db);
        const idx = list.findIndex((a) => a.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        saveDB(db);
        return res.json({ success: true, automation: item });
      }

      if (type === 'comment_ai') {
        const aiPrompt = String((req.body as any)?.aiPrompt || '').trim();
        if (!aiPrompt) return res.status(400).json({ success: false, error: 'Escribe el prompt para la IA' });
        const item: AnyRow = {
          id: `cai-${accountId}-${Date.now()}`,
          type, accountId,
          name: name || 'Respuesta IA a comentarios',
          aiPrompt,
          isActive: isActive !== false,
          updatedAt: new Date().toISOString(),
        };
        const list2 = getAutomations(db);
        list2.push(item);
        saveDB(db);
        return res.json({ success: true, automation: item });
      }

      // comment-to-DM y autorespuestas de historias/menciones via comment-automations
      const trigger = type === 'comment_to_dm' ? 'comment' : type; // story_mention | story_reply | live_comment
      const body: AnyRow = {
        profileId: req.body.profileId,
        accountId,
        name: name || `Automatización ${type}`,
        trigger,
        dmMessage: dmMessage || '',
        isActive: isActive !== false,
      };
      if (trigger === 'comment') {
        body.keywords = Array.isArray(keywords) ? keywords : String(keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
        body.matchMode = 'word';
        if (commentReply) { body.commentReply = commentReply; body.publicReplyPolicy = 'after_dm'; }
      }
      const r = await zernioRequest({ method: 'POST', path: '/v1/comment-automations', body });
      if ((r as any).success === false) {
        return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó la automatización' });
      }
      const data: any = (r as any).data;
      const item = {
        id: data?.automation?.id || data?.id || `ca-${Date.now()}`,
        type, accountId, name: body.name, keywords: body.keywords || [],
        dmMessage: body.dmMessage, commentReply: body.commentReply || '',
        isActive: body.isActive, zernioId: data?.automation?.id || data?.id,
        createdAt: new Date().toISOString(),
      };
      getAutomations(db).push(item);
      saveDB(db);
      res.json({ success: true, automation: item });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  router.patch('/automations/:id', async (req, res) => {
    try {
      const db = getDB();
      const list = getAutomations(db);
      const item = list.find((a) => a.id === req.params.id);
      if (!item) return res.status(404).json({ success: false, error: 'No encontrada' });
      if (item.zernioId) {
        const r = await zernioRequest({ method: 'PATCH', path: `/v1/comment-automations/${encodeURIComponent(item.zernioId)}`, body: { isActive: req.body.isActive } });
        if ((r as any).success === false) {
          return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó el cambio' });
        }
      }
      if (typeof req.body.isActive === 'boolean') item.isActive = req.body.isActive;
      if (req.body.dmMessage) item.dmMessage = req.body.dmMessage;
      saveDB(db);
      res.json({ success: true, automation: item });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  router.delete('/automations/:id', async (req, res) => {
    try {
      const db = getDB();
      const list = getAutomations(db);
      const idx = list.findIndex((a) => a.id === req.params.id);
      if (idx < 0) return res.status(404).json({ success: false, error: 'No encontrada' });
      const item = list[idx];
      if (item.zernioId) {
        await zernioRequest({ method: 'DELETE', path: `/v1/comment-automations/${encodeURIComponent(item.zernioId)}` });
      }
      list.splice(idx, 1);
      saveDB(db);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  router.get('/accounts/:id/ice-breakers', async (req, res) => {
    const r = await zernioRequest({ method: 'GET', path: `/v1/accounts/${encodeURIComponent(req.params.id)}/instagram-ice-breakers` });
    if ((r as any).success === false) return res.status(502).json({ success: false, error: (r as any).error?.message || 'Error' });
    res.json({ success: true, data: (r as any).data });
  });

  // ---------- Contenido ----------
  router.post('/publish', async (req, res) => {
    try {
      const { content, accountIds, platforms, publishNow, scheduledFor, timezone, mediaUrls } = req.body || {};
      if (!content && !(mediaUrls || []).length) return res.status(400).json({ success: false, error: 'Contenido vacío' });
      const targets: AnyRow[] = (accountIds || []).map((accountId: string, i: number) => ({
        platform: (platforms || [])[i] || 'instagram', accountId,
      }));
      if (!targets.length) return res.status(400).json({ success: false, error: 'Sin cuentas destino' });
      const body: AnyRow = {
        content: content || '',
        platforms: targets,
        timezone: timezone || 'America/Bogota',
      };
      if (publishNow) body.publishNow = true;
      else if (scheduledFor) body.scheduledFor = scheduledFor;
      else body.publishNow = true;
      if (mediaUrls?.length) body.mediaUrls = mediaUrls;
      const r = await zernioRequest({ method: 'POST', path: '/v1/posts', body });
      if ((r as any).success === false) {
        return res.status(502).json({ success: false, error: (r as any).error?.message || 'El proveedor rechazó la publicación' });
      }
      res.json({ success: true, data: (r as any).data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  router.get('/scheduled', async (_req, res) => {
    const r = await zernioRequest({ method: 'GET', path: '/v1/posts?status=scheduled' });
    if ((r as any).success === false) return res.status(502).json({ success: false, error: (r as any).error?.message || 'Error' });
    res.json({ success: true, data: (r as any).data });
  });

  router.get('/analytics', async (req, res) => {
    const accountId = String(req.query.accountId || '');
    const period = String(req.query.period || '30d');
    const path = `/v1/analytics${accountId ? `?accountId=${encodeURIComponent(accountId)}&` : '?'}period=${encodeURIComponent(period)}`;
    const r = await zernioRequest({ method: 'GET', path });
    if ((r as any).success === false) return res.status(502).json({ success: false, error: (r as any).error?.message || 'Error' });
    res.json({ success: true, data: (r as any).data });
  });

  // Enlace ig.me de referido: crea workflow con trigger referral
  router.post('/reflinks', async (req, res) => {
    try {
      const { accountId, profileId, ref, name, message } = req.body || {};
      if (!accountId || !ref) return res.status(400).json({ success: false, error: 'Faltan accountId y ref' });
      const cleanRef = String(ref).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const wf = await zernioRequest({
        method: 'POST', path: '/v1/workflows',
        body: {
          profileId, accountId, platform: 'instagram',
          name: name || `Ref ${cleanRef}`,
          nodes: [
            { id: 'n_trigger', type: 'trigger', config: { triggerType: 'referral', referral: { ref: cleanRef, matchType: 'exact' } } },
            { id: 'n_msg', type: 'send_message', config: { messageType: 'text', text: message || '¡Hola! Gracias por tu interés 👋' } },
            { id: 'n_end', type: 'end' },
          ],
          edges: [
            { id: 'e1', source: 'n_trigger', target: 'n_msg' },
            { id: 'e2', source: 'n_msg', target: 'n_end' },
          ],
        },
      });
      if ((wf as any).success === false) {
        return res.status(502).json({ success: false, error: (wf as any).error?.message || 'El proveedor rechazó el workflow' });
      }
      const wfId = (wf as any).data?.workflow?.id || (wf as any).data?.id;
      if (wfId) await zernioRequest({ method: 'POST', path: `/v1/workflows/${encodeURIComponent(wfId)}/activate` });
      // El link ig.me usa el username de la cuenta
      const accts = await zernioRequest({ method: 'GET', path: '/v1/accounts' });
      const list: any[] = (accts as any).data?.accounts || (accts as any).data || [];
      const acct = list.find((a) => String(a.id || a.accountId) === String(accountId));
      const username = acct?.username || 'tu-negocio';
      res.json({ success: true, url: `https://ig.me/m/${username}?ref=${cleanRef}`, workflowId: wfId });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error' });
    }
  });

  app.use('/api/social', router);
}
