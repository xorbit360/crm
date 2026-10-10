import { createHash } from 'crypto';
import { getSupabase, isSupabaseConfigured } from './supabase.ts';

export const NORMALIZED_WORKSPACE_ID = 'default';

const CORE_KEYS = new Set([
  'chats', 'messagesHistory', 'orders', 'products', 'customers', 'campaigns',
  'rechargeTransactions', 'channels', 'faqsList', 'rules', 'aiAutomationRules',
  'aiDebugLogs', 'staff',
]);

let latestDb: any = null;
let mirrorTimer: ReturnType<typeof setTimeout> | null = null;
let mirrorRunning = false;
let mirrorDirty = true;
let hasMirroredOnce = false;
let lastMirrorError = '';

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim();
  if (!/^-?[0-9]+(\.[0-9]+)?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function tsMs(value: unknown): number | null {
  const parsed = numericOrNull(value);
  if (parsed === null) return null;
  return Math.trunc(parsed);
}

function dateFromTsMs(value: number | null): string | null {
  if (!value) return null;
  const ms = value > 9999999999 ? value : value * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function jsonArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function idFor(item: any, fallbackSeed: string): string {
  const rawId = String(item?.id || '').trim();
  return rawId || md5(JSON.stringify(item ?? fallbackSeed));
}

async function upsertRows(client: any, table: string, rows: any[], onConflict: string): Promise<void> {
  if (!rows.length) return;
  const { error } = await client.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function deleteMissingRows(client: any, table: string, keepIds: Set<string>, idColumn = 'id'): Promise<void> {
  const { data, error } = await client
    .from(table)
    .select(idColumn)
    .eq('workspace_id', NORMALIZED_WORKSPACE_ID)
    .limit(5000);
  if (error) throw new Error(`${table} cleanup: ${error.message}`);
  const existing = (data || []).map((row: any) => String(row[idColumn] || ''));
  const stale = existing.filter((id: string) => id && !keepIds.has(id));
  for (let i = 0; i < stale.length; i += 200) {
    const batch = stale.slice(i, i + 200);
    const { error: deleteError } = await client.from(table).delete().eq('workspace_id', NORMALIZED_WORKSPACE_ID).in(idColumn, batch);
    if (deleteError) throw new Error(`${table} delete: ${deleteError.message}`);
  }
}

function buildMessageRows(db: any): { rows: any[]; ids: Set<string> } {
  const histories = db?.messagesHistory && typeof db.messagesHistory === 'object' ? db.messagesHistory : {};
  const rows: any[] = [];
  const ids = new Set<string>();
  const duplicateCounts = new Map<string, number>();

  for (const [historyKey, history] of Object.entries(histories)) {
    if (!Array.isArray(history)) continue;
    for (const message of history as any[]) {
      const timestamp = tsMs(message?.timestamp);
      const base = md5([
        NORMALIZED_WORKSPACE_ID,
        historyKey,
        String(message?.timestamp ?? message?.time ?? ''),
        String(message?.role ?? ''),
        String(message?.text ?? ''),
      ].join('|'));
      const duplicateNo = duplicateCounts.get(base) || 0;
      duplicateCounts.set(base, duplicateNo + 1);
      const id = duplicateNo > 0 ? `${base}-${duplicateNo}` : base;
      ids.add(id);
      rows.push({
        id,
        workspace_id: NORMALIZED_WORKSPACE_ID,
        conversation_id: null,
        history_key: historyKey,
        role: message?.role ?? null,
        body: message?.text ?? null,
        time_text: message?.time ?? null,
        ts_ms: timestamp,
        sent_at: dateFromTsMs(timestamp),
        raw: message || {},
      });
    }
  }
  return { rows, ids };
}

export async function mirrorStateToNormalizedTables(db: any): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabase();
  if (!client) return false;

  const now = new Date().toISOString();

  const settingsRows = Object.entries(db || {})
    .filter(([key, value]) => !CORE_KEYS.has(key) && value !== undefined)
    .map(([key, value]) => ({ workspace_id: NORMALIZED_WORKSPACE_ID, key, value, updated_at: now }));

  const channelRows = jsonArray(db?.channels).map((channel: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(channel, 'channel'),
    name: channel?.name ?? null,
    type: channel?.type ?? null,
    phone: channel?.phone ?? null,
    connected: Boolean(channel?.connected),
    error: channel?.error && typeof channel.error === 'object' ? channel.error : (channel?.error ?? null),
    raw: channel || {},
    updated_at: now,
  }));

  const conversationRows = jsonArray(db?.chats).map((chat: any) => {
    const timestamp = tsMs(chat?.timestamp);
    return {
      workspace_id: NORMALIZED_WORKSPACE_ID,
      id: idFor(chat, 'chat'),
      channel_id: chat?.channelId ?? null,
      platform: chat?.platform ?? null,
      external_id: chat?.externalId ?? null,
      participant_id: chat?.participantId ?? null,
      participant_username: chat?.participantUsername ?? null,
      account_id: chat?.accountId ?? null,
      conversation_id: chat?.conversationId ?? null,
      name: chat?.name ?? chat?.sender ?? null,
      phone: digits(chat?.phone || chat?.id),
      last_message: chat?.msg ?? chat?.message ?? null,
      last_time_text: chat?.time ?? null,
      unread: Number(chat?.unread) || 0,
      column_id: chat?.columnId ?? null,
      status: chat?.status ?? null,
      tags: Array.isArray(chat?.tags) ? chat.tags : [],
      lead_status: chat?.leadStatus ?? null,
      avatar: chat?.avatar ?? null,
      instance_name: chat?.instanceName ?? null,
      remote_jid: chat?.remoteJid ?? null,
      sender: chat?.sender ?? null,
      last_message_ts_ms: timestamp,
      last_message_at: dateFromTsMs(timestamp),
      raw: chat || {},
      updated_at: now,
    };
  });

  const { rows: messageRows, ids: messageIds } = buildMessageRows(db || {});

  const customerRows = jsonArray(db?.customers).map((customer: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(customer, 'customer'),
    name: customer?.name ?? null,
    phone: digits(customer?.phone),
    address: customer?.address ?? null,
    recurrence: customer?.recurrence ?? null,
    orders_count: numericOrNull(customer?.ordersCount),
    register_date: customer?.registerDate ?? null,
    raw: customer || {},
    updated_at: now,
  }));

  const productRows = jsonArray(db?.products).map((product: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(product, 'product'),
    name: product?.name ?? null,
    price: numericOrNull(product?.price),
    offer_price: numericOrNull(product?.offerPrice),
    stock: numericOrNull(product?.stock),
    is_active: boolOrNull(product?.isActive),
    is_available_for_bot: boolOrNull(product?.isAvailableForBot),
    product_type: product?.productType ?? null,
    raw: product || {},
    updated_at: now,
  }));

  const orderRows = jsonArray(db?.orders).map((order: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(order, 'order'),
    phone: digits(order?.phone),
    amount: numericOrNull(order?.amount),
    status: order?.status ?? null,
    address: order?.address ?? null,
    waiter_id: order?.waiterId ?? null,
    delivery_id: order?.deliveryId ?? null,
    customer_name: order?.customerName ?? null,
    payment_method: order?.paymentMethod ?? null,
    timestamp_text: order?.timestamp ?? null,
    raw: order || {},
    updated_at: now,
  }));

  const campaignRows = jsonArray(db?.campaigns).map((campaign: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(campaign, 'campaign'),
    name: campaign?.name ?? null,
    status: campaign?.status ?? null,
    objective: campaign?.objective ?? null,
    metrics: campaign?.metrics && typeof campaign.metrics === 'object' ? campaign.metrics : null,
    raw: campaign || {},
    updated_at: now,
  }));

  const rechargeRows = jsonArray(db?.rechargeTransactions).map((tx: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(tx, 'recharge'),
    bank: tx?.bank ?? null,
    date_text: tx?.date ?? null,
    amount: numericOrNull(tx?.amount),
    amount_cop: numericOrNull(tx?.amountCOP),
    status: tx?.status ?? null,
    gateway: tx?.gateway ?? null,
    reference: tx?.reference ?? null,
    timestamp_text: tx?.timestamp ?? null,
    completed_at_text: tx?.completedAt ?? null,
    package_name: tx?.packageName ?? null,
    package_type: tx?.packageType ?? null,
    payment_type: tx?.paymentType ?? null,
    credits_added: tx?.creditsAdded === undefined || tx?.creditsAdded === null ? null : String(tx.creditsAdded),
    customer_email: tx?.customerEmail ?? null,
    customer_phone: tx?.customerPhone ?? null,
    raw: tx || {},
    updated_at: now,
  }));

  const faqRows = jsonArray(db?.faqsList).map((faq: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: md5(`${faq?.question || ''}|${faq?.answer || ''}`),
    question: faq?.question ?? null,
    answer: faq?.answer ?? null,
    attachments: faq?.attachments && typeof faq.attachments === 'object' ? faq.attachments : null,
    raw: faq || {},
    updated_at: now,
  }));

  const ruleRows: any[] = [];
  for (const rule of jsonArray(db?.rules)) {
    if (typeof rule === 'string') {
      ruleRows.push({
        workspace_id: NORMALIZED_WORKSPACE_ID,
        id: md5(`rule_text|${rule}`),
        kind: 'rule_text',
        phrase: rule,
        action: null,
        value: null,
        active: null,
        raw: { text: rule },
        updated_at: now,
      });
    } else if (rule && typeof rule === 'object') {
      ruleRows.push({
        workspace_id: NORMALIZED_WORKSPACE_ID,
        id: idFor(rule, 'rule'),
        kind: 'rule_text',
        phrase: rule.phrase ?? rule.text ?? null,
        action: rule.action ?? null,
        value: rule.value ?? null,
        active: boolOrNull(rule.active),
        raw: rule,
        updated_at: now,
      });
    }
  }
  for (const rule of jsonArray(db?.aiAutomationRules)) {
    ruleRows.push({
      workspace_id: NORMALIZED_WORKSPACE_ID,
      id: idFor(rule, 'ai-rule'),
      kind: 'ai',
      phrase: rule?.phrase ?? null,
      action: rule?.action ?? null,
      value: rule?.value ?? null,
      active: boolOrNull(rule?.active),
      raw: rule || {},
      updated_at: now,
    });
  }

  const staffRows = jsonArray(db?.staff).map((member: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: idFor(member, 'staff'),
    name: member?.name ?? null,
    type: member?.type ?? null,
    status: member?.status ?? null,
    orders_count: numericOrNull(member?.ordersCount),
    raw: member || {},
    updated_at: now,
  }));

  const aiLogRows = jsonArray(db?.aiDebugLogs).map((log: any) => ({
    workspace_id: NORMALIZED_WORKSPACE_ID,
    id: md5(JSON.stringify(log || {})),
    model: log?.model ?? null,
    status: log?.status ?? null,
    prompt_tokens: numericOrNull(log?.promptTokens),
    completion_tokens: numericOrNull(log?.completionTokens),
    total_tokens: numericOrNull(log?.totalTokens),
    duration_ms: numericOrNull(log?.durationMs),
    raw: log || {},
  }));

  await upsertRows(client, 'tenants', [{ id: NORMALIZED_WORKSPACE_ID, name: 'Xorbit 360', data: {}, updated_at: now }], 'id');
  await upsertRows(client, 'app_settings', settingsRows, 'workspace_id,key');
  await upsertRows(client, 'channels', channelRows, 'workspace_id,id');
  await upsertRows(client, 'conversations', conversationRows, 'workspace_id,id');
  await upsertRows(client, 'messages', messageRows, 'id');
  await upsertRows(client, 'customers', customerRows, 'workspace_id,id');
  await upsertRows(client, 'products', productRows, 'workspace_id,id');
  await upsertRows(client, 'orders', orderRows, 'workspace_id,id');
  await upsertRows(client, 'campaigns', campaignRows, 'workspace_id,id');
  await upsertRows(client, 'recharge_transactions', rechargeRows, 'workspace_id,id');
  await upsertRows(client, 'faqs', faqRows, 'workspace_id,id');
  await upsertRows(client, 'automation_rules', ruleRows, 'workspace_id,kind,id');
  await upsertRows(client, 'staff_members', staffRows, 'workspace_id,id');
  await upsertRows(client, 'ai_debug_logs', aiLogRows, 'workspace_id,id');

  // Keep table reads honest after chat/message cleanup without scanning on
  // every save once histories become large.
  await deleteMissingRows(client, 'conversations', new Set(conversationRows.map((row: any) => row.id)));
  if (messageRows.length <= 5000) {
    await deleteMissingRows(client, 'messages', messageIds);
  }

  hasMirroredOnce = true;
  mirrorDirty = false;
  lastMirrorError = '';
  return true;
}

async function runQueuedMirror(): Promise<void> {
  if (mirrorRunning) return;
  mirrorRunning = true;
  try {
    if (latestDb) await mirrorStateToNormalizedTables(latestDb);
  } catch (err: any) {
    mirrorDirty = true;
    lastMirrorError = err?.message || String(err);
    console.warn('[NormalizedDB Mirror Warning]:', lastMirrorError);
  } finally {
    mirrorRunning = false;
    if (mirrorDirty && latestDb) {
      // One short retry cycle is enough; saveDBData fires often in this app.
      queueNormalizedMirror(latestDb, 2500);
    }
  }
}

export function queueNormalizedMirror(db: any, delayMs = 750): void {
  latestDb = db;
  mirrorDirty = true;
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    mirrorTimer = null;
    void runQueuedMirror();
  }, delayMs);
  if (typeof (mirrorTimer as any).unref === 'function') (mirrorTimer as any).unref();
}

export function isNormalizedReadReady(): boolean {
  return hasMirroredOnce && !mirrorDirty && !mirrorRunning;
}

export function getNormalizedMirrorError(): string {
  return lastMirrorError;
}

export async function loadInboxFromTables(limit: number, historyLimit: number): Promise<{ chats: any[]; messagesHistory: Record<string, any[]> } | null> {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabase();
  if (!client) return null;

  const { data: conversationData, error: conversationError } = await client
    .from('conversations')
    .select('raw,last_message_at,updated_at')
    .eq('workspace_id', NORMALIZED_WORKSPACE_ID)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (conversationError) throw new Error(conversationError.message);
  const chats = (conversationData || []).map((row: any) => row.raw).filter(Boolean);
  if (!chats.length) return null;

  const messagesHistory: Record<string, any[]> = {};
  if (historyLimit > 0) {
    const fetchLimit = Math.min(5000, Math.max(200, chats.length * historyLimit));
    const { data: messageData, error: messageError } = await client
      .from('messages')
      .select('history_key,raw,ts_ms')
      .eq('workspace_id', NORMALIZED_WORKSPACE_ID)
      .order('ts_ms', { ascending: false, nullsFirst: false })
      .limit(fetchLimit);
    if (messageError) throw new Error(messageError.message);
    const grouped = new Map<string, any[]>();
    for (const row of messageData || []) {
      const key = String((row as any).history_key || '');
      if (!key) continue;
      const list = grouped.get(key) || [];
      if (list.length < historyLimit) list.push((row as any).raw);
      grouped.set(key, list);
    }
    for (const [key, list] of grouped.entries()) {
      messagesHistory[key] = list.reverse();
    }
  }

  return { chats, messagesHistory };
}

export async function loadWhatsappFromTables(configKeys: string[], limit: number, historyLimit: number): Promise<any | null> {
  const inbox = await loadInboxFromTables(limit, historyLimit);
  if (!inbox) return null;
  const client = getSupabase();
  if (!client) return null;

  const config: any = {};
  const { data, error } = await client
    .from('app_settings')
    .select('key,value')
    .eq('workspace_id', NORMALIZED_WORKSPACE_ID)
    .in('key', configKeys);
  if (error) throw new Error(error.message);
  for (const row of data || []) config[(row as any).key] = (row as any).value;

  return {
    config,
    chats: inbox.chats,
    messagesHistory: inbox.messagesHistory,
  };
}

async function fetchAllRows(
  client: any,
  table: string,
  select: string,
  order?: { column: string; ascending: boolean; nullsFirst?: boolean },
): Promise<any[]> {
  const pageSize = 1000;
  const rows: any[] = [];
  for (let from = 0; from < 100000; from += pageSize) {
    let query = client
      .from(table)
      .select(select)
      .eq('workspace_id', NORMALIZED_WORKSPACE_ID);
    if (order) {
      query = query.order(order.column, {
        ascending: order.ascending,
        nullsFirst: Boolean(order.nullsFirst),
      });
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function rawRows(rows: any[]): any[] {
  return rows.map((row: any) => row.raw).filter((raw: any) => raw !== undefined && raw !== null);
}

/**
 * Rebuild the legacy in-memory state object from normalized Supabase tables.
 * Core collections come from their raw JSONB payloads and every remaining
 * top-level key comes from app_settings, so enabling tables as the boot
 * source does not drop fields that have not been columnized yet.
 */
export async function loadStateFromNormalizedTables(): Promise<any | null> {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabase();
  if (!client) return null;

  const [settings, channels, conversations, messages, customers, products, orders, campaigns, recharges, faqs, rules, staff, aiLogs] = await Promise.all([
    fetchAllRows(client, 'app_settings', 'key,value'),
    fetchAllRows(client, 'channels', 'raw'),
    fetchAllRows(client, 'conversations', 'raw,last_message_at,updated_at', { column: 'last_message_at', ascending: false }),
    fetchAllRows(client, 'messages', 'history_key,raw,ts_ms', { column: 'ts_ms', ascending: true }),
    fetchAllRows(client, 'customers', 'raw'),
    fetchAllRows(client, 'products', 'raw'),
    fetchAllRows(client, 'orders', 'raw'),
    fetchAllRows(client, 'campaigns', 'raw'),
    fetchAllRows(client, 'recharge_transactions', 'raw'),
    fetchAllRows(client, 'faqs', 'raw'),
    fetchAllRows(client, 'automation_rules', 'kind,raw'),
    fetchAllRows(client, 'staff_members', 'raw'),
    fetchAllRows(client, 'ai_debug_logs', 'raw'),
  ]);

  if (!settings.length && !conversations.length && !messages.length) return null;

  const state: any = {};
  for (const row of settings) {
    if (row?.key && !CORE_KEYS.has(String(row.key))) state[row.key] = row.value;
  }

  const messagesHistory: Record<string, any[]> = {};
  for (const row of messages) {
    const key = String(row?.history_key || '');
    if (!key || !row?.raw) continue;
    if (!messagesHistory[key]) messagesHistory[key] = [];
    messagesHistory[key].push(row.raw);
  }

  const textRules: any[] = [];
  const aiRules: any[] = [];
  for (const row of rules) {
    if (!row?.raw) continue;
    if (row.kind === 'ai') aiRules.push(row.raw);
    else if (row.raw && typeof row.raw === 'object' && typeof row.raw.text === 'string' && Object.keys(row.raw).length === 1) textRules.push(row.raw.text);
    else textRules.push(row.raw);
  }

  state.channels = rawRows(channels);
  state.chats = rawRows(conversations);
  state.messagesHistory = messagesHistory;
  state.customers = rawRows(customers);
  state.products = rawRows(products);
  state.orders = rawRows(orders);
  state.campaigns = rawRows(campaigns);
  state.rechargeTransactions = rawRows(recharges);
  state.faqsList = rawRows(faqs);
  state.rules = textRules;
  state.aiAutomationRules = aiRules;
  state.staff = rawRows(staff);
  state.aiDebugLogs = rawRows(aiLogs);

  hasMirroredOnce = true;
  mirrorDirty = false;
  lastMirrorError = '';
  return state;
}
