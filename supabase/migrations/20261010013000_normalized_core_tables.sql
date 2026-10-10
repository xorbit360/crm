-- Xorbit 360 normalized core tables (phase 1)
-- Source of truth during transition: public.app_state(id='appState') JSONB.
-- This migration is non-destructive: it creates normalized tables, locks them
-- to service_role, and backfills from app_state. app_state stays as rollback.

create extension if not exists pgcrypto;

create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  counts jsonb not null default '{}'::jsonb,
  notes text
);

insert into public.migration_runs(status, notes)
values ('running', 'normalized core tables phase 1: backfill from app_state');

create table if not exists public.app_state_backup_pre_tables_20261010 (
  like public.app_state including all
);

insert into public.app_state_backup_pre_tables_20261010(id, data, updated_at)
select id, data, updated_at from public.app_state
on conflict (id) do update
set data = excluded.data, updated_at = excluded.updated_at;

create table if not exists public.tenants (
  id text primary key,
  name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tenants(id, name, data)
values ('default', 'Xorbit 360', '{}'::jsonb)
on conflict (id) do update set updated_at = now();

create table if not exists public.app_settings (
  workspace_id text not null default 'default',
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, key)
);

create table if not exists public.channels (
  workspace_id text not null default 'default',
  id text not null,
  name text,
  type text,
  phone text,
  connected boolean not null default false,
  error jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.conversations (
  workspace_id text not null default 'default',
  id text not null,
  channel_id text,
  platform text,
  external_id text,
  participant_id text,
  participant_username text,
  account_id text,
  conversation_id text,
  name text,
  phone text,
  last_message text,
  last_time_text text,
  unread integer not null default 0,
  column_id text,
  status text,
  tags jsonb not null default '[]'::jsonb,
  lead_status text,
  avatar text,
  instance_name text,
  remote_jid text,
  sender text,
  last_message_ts_ms bigint,
  last_message_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create index if not exists conversations_workspace_time_idx
  on public.conversations (workspace_id, last_message_at desc nulls last, updated_at desc);
create index if not exists conversations_workspace_phone_idx
  on public.conversations (workspace_id, phone);
create index if not exists conversations_workspace_external_idx
  on public.conversations (workspace_id, platform, external_id);

create table if not exists public.messages (
  id text primary key,
  workspace_id text not null default 'default',
  conversation_id text,
  history_key text not null,
  role text,
  body text,
  time_text text,
  ts_ms bigint,
  sent_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_workspace_history_time_idx
  on public.messages (workspace_id, history_key, ts_ms asc nulls last, sent_at asc nulls last);
create index if not exists messages_workspace_conversation_time_idx
  on public.messages (workspace_id, conversation_id, ts_ms asc nulls last);

create table if not exists public.customers (
  workspace_id text not null default 'default',
  id text not null,
  name text,
  phone text,
  address text,
  recurrence text,
  orders_count numeric,
  register_date text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);
create index if not exists customers_workspace_phone_idx on public.customers (workspace_id, phone);

create table if not exists public.products (
  workspace_id text not null default 'default',
  id text not null,
  name text,
  price numeric,
  offer_price numeric,
  stock numeric,
  is_active boolean,
  is_available_for_bot boolean,
  product_type text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.orders (
  workspace_id text not null default 'default',
  id text not null,
  phone text,
  amount numeric,
  status text,
  address text,
  waiter_id text,
  delivery_id text,
  customer_name text,
  payment_method text,
  timestamp_text text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);
create index if not exists orders_workspace_phone_idx on public.orders (workspace_id, phone);

create table if not exists public.campaigns (
  workspace_id text not null default 'default',
  id text not null,
  name text,
  status text,
  objective text,
  metrics jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.recharge_transactions (
  workspace_id text not null default 'default',
  id text not null,
  bank text,
  date_text text,
  amount numeric,
  amount_cop numeric,
  status text,
  gateway text,
  reference text,
  timestamp_text text,
  completed_at_text text,
  package_name text,
  package_type text,
  payment_type text,
  credits_added text,
  customer_email text,
  customer_phone text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);
create index if not exists recharge_workspace_status_idx on public.recharge_transactions (workspace_id, status);

create table if not exists public.faqs (
  workspace_id text not null default 'default',
  id text not null,
  question text,
  answer text,
  attachments jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.automation_rules (
  workspace_id text not null default 'default',
  id text not null,
  kind text not null,
  phrase text,
  action text,
  value text,
  active boolean,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, kind, id)
);

create table if not exists public.staff_members (
  workspace_id text not null default 'default',
  id text not null,
  name text,
  type text,
  status text,
  orders_count numeric,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.ai_debug_logs (
  workspace_id text not null default 'default',
  id text not null,
  model text,
  status text,
  prompt_tokens numeric,
  completion_tokens numeric,
  total_tokens numeric,
  duration_ms numeric,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

-- Backfill from app_state. Every row keeps the original object in raw so no
-- field is lost while columns are introduced gradually.
with state as (
  select data, updated_at from public.app_state where id = 'appState'
)
insert into public.app_settings(workspace_id, key, value, updated_at)
select 'default', key, value, coalesce(updated_at, now())
from state, jsonb_each(data)
where key not in (
  'chats','messagesHistory','orders','products','customers','campaigns',
  'rechargeTransactions','channels','faqsList','rules','aiAutomationRules',
  'aiDebugLogs','staff'
)
on conflict (workspace_id, key) do update
set value = excluded.value, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (
  select elem from state, jsonb_array_elements(coalesce(data->'channels', '[]'::jsonb)) as elem
)
insert into public.channels(workspace_id, id, name, type, phone, connected, error, raw, updated_at)
select 'default',
  coalesce(nullif(elem->>'id',''), md5(elem::text)),
  elem->>'name', elem->>'type', elem->>'phone',
  coalesce((elem->>'connected')::boolean, false),
  case when jsonb_typeof(elem->'error') in ('object','array') then elem->'error' else to_jsonb(elem->>'error') end,
  elem, now()
from items
on conflict (workspace_id, id) do update set
  name = excluded.name, type = excluded.type, phone = excluded.phone,
  connected = excluded.connected, error = excluded.error, raw = excluded.raw,
  updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (
  select elem from state, jsonb_array_elements(coalesce(data->'chats', '[]'::jsonb)) as elem
), parsed as (
  select elem,
    case when (elem->>'timestamp') ~ '^[0-9]+(\.[0-9]+)?$' then ((elem->>'timestamp')::numeric)::bigint end as ts_ms
  from items
)
insert into public.conversations(
  workspace_id, id, channel_id, platform, external_id, participant_id,
  participant_username, account_id, conversation_id, name, phone, last_message,
  last_time_text, unread, column_id, status, tags, lead_status, avatar,
  instance_name, remote_jid, sender, last_message_ts_ms, last_message_at, raw, updated_at
)
select 'default',
  coalesce(nullif(elem->>'id',''), md5(elem::text)),
  elem->>'channelId', elem->>'platform', elem->>'externalId', elem->>'participantId',
  elem->>'participantUsername', elem->>'accountId', elem->>'conversationId',
  coalesce(elem->>'name', elem->>'sender'),
  regexp_replace(coalesce(elem->>'phone', elem->>'id', ''), '\D', '', 'g'),
  coalesce(elem->>'msg', elem->>'message'), elem->>'time',
  coalesce(nullif(elem->>'unread','')::integer, 0),
  elem->>'columnId', elem->>'status',
  case when jsonb_typeof(elem->'tags') = 'array' then elem->'tags' else '[]'::jsonb end,
  elem->>'leadStatus', elem->>'avatar', elem->>'instanceName', elem->>'remoteJid', elem->>'sender',
  ts_ms,
  case when ts_ms is null then null when ts_ms > 9999999999 then to_timestamp(ts_ms / 1000.0) else to_timestamp(ts_ms) end,
  elem, now()
from parsed
on conflict (workspace_id, id) do update set
  channel_id = excluded.channel_id, platform = excluded.platform,
  external_id = excluded.external_id, participant_id = excluded.participant_id,
  participant_username = excluded.participant_username, account_id = excluded.account_id,
  conversation_id = excluded.conversation_id, name = excluded.name, phone = excluded.phone,
  last_message = excluded.last_message, last_time_text = excluded.last_time_text,
  unread = excluded.unread, column_id = excluded.column_id, status = excluded.status,
  tags = excluded.tags, lead_status = excluded.lead_status, avatar = excluded.avatar,
  instance_name = excluded.instance_name, remote_jid = excluded.remote_jid,
  sender = excluded.sender, last_message_ts_ms = excluded.last_message_ts_ms,
  last_message_at = excluded.last_message_at, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
expanded as (
  select hk.key as history_key, msg.elem as elem, msg.ord as ord
  from state,
    jsonb_each(coalesce(data->'messagesHistory', '{}'::jsonb)) as hk(key, value),
    jsonb_array_elements(case when jsonb_typeof(hk.value) = 'array' then hk.value else '[]'::jsonb end) with ordinality as msg(elem, ord)
), based as (
  select *,
    case when (elem->>'timestamp') ~ '^[0-9]+(\.[0-9]+)?$' then ((elem->>'timestamp')::numeric)::bigint end as ts_ms,
    md5('default|' || history_key || '|' || coalesce(elem->>'timestamp', elem->>'time', '') || '|' || coalesce(elem->>'role','') || '|' || coalesce(elem->>'text','')) as base_id
  from expanded
), dedup as (
  select *, (row_number() over (partition by base_id order by ord) - 1) as dup_no from based
)
insert into public.messages(id, workspace_id, conversation_id, history_key, role, body, time_text, ts_ms, sent_at, raw)
select base_id || case when dup_no > 0 then '-' || dup_no::text else '' end,
  'default', null, history_key, elem->>'role', elem->>'text', elem->>'time', ts_ms,
  case when ts_ms is null then null when ts_ms > 9999999999 then to_timestamp(ts_ms / 1000.0) else to_timestamp(ts_ms) end,
  elem
from dedup
on conflict (id) do update set
  conversation_id = excluded.conversation_id, history_key = excluded.history_key,
  role = excluded.role, body = excluded.body, time_text = excluded.time_text,
  ts_ms = excluded.ts_ms, sent_at = excluded.sent_at, raw = excluded.raw;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'customers', '[]'::jsonb)) as elem)
insert into public.customers(workspace_id, id, name, phone, address, recurrence, orders_count, register_date, raw, updated_at)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)), elem->>'name',
  regexp_replace(coalesce(elem->>'phone',''), '\D', '', 'g'), elem->>'address', elem->>'recurrence',
  case when (elem->>'ordersCount') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'ordersCount')::numeric end,
  elem->>'registerDate', elem, now()
from items
on conflict (workspace_id, id) do update set name = excluded.name, phone = excluded.phone,
  address = excluded.address, recurrence = excluded.recurrence, orders_count = excluded.orders_count,
  register_date = excluded.register_date, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'products', '[]'::jsonb)) as elem)
insert into public.products(workspace_id, id, name, price, offer_price, stock, is_active, is_available_for_bot, product_type, raw, updated_at)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)), elem->>'name',
  case when (elem->>'price') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'price')::numeric end,
  case when (elem->>'offerPrice') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'offerPrice')::numeric end,
  case when (elem->>'stock') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'stock')::numeric end,
  case when elem->>'isActive' in ('true','false') then (elem->>'isActive')::boolean end,
  case when elem->>'isAvailableForBot' in ('true','false') then (elem->>'isAvailableForBot')::boolean end,
  elem->>'productType', elem, now()
from items
on conflict (workspace_id, id) do update set name = excluded.name, price = excluded.price,
  offer_price = excluded.offer_price, stock = excluded.stock, is_active = excluded.is_active,
  is_available_for_bot = excluded.is_available_for_bot, product_type = excluded.product_type,
  raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'orders', '[]'::jsonb)) as elem)
insert into public.orders(workspace_id, id, phone, amount, status, address, waiter_id, delivery_id, customer_name, payment_method, timestamp_text, raw, updated_at)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)),
  regexp_replace(coalesce(elem->>'phone',''), '\D', '', 'g'),
  case when (elem->>'amount') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'amount')::numeric end,
  elem->>'status', elem->>'address', elem->>'waiterId', elem->>'deliveryId', elem->>'customerName',
  elem->>'paymentMethod', elem->>'timestamp', elem, now()
from items
on conflict (workspace_id, id) do update set phone = excluded.phone, amount = excluded.amount,
  status = excluded.status, address = excluded.address, waiter_id = excluded.waiter_id,
  delivery_id = excluded.delivery_id, customer_name = excluded.customer_name,
  payment_method = excluded.payment_method, timestamp_text = excluded.timestamp_text,
  raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'campaigns', '[]'::jsonb)) as elem)
insert into public.campaigns(workspace_id, id, name, status, objective, metrics, raw, updated_at)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)), elem->>'name', elem->>'status',
  elem->>'objective', case when jsonb_typeof(elem->'metrics') = 'object' then elem->'metrics' end,
  elem, now()
from items
on conflict (workspace_id, id) do update set name = excluded.name, status = excluded.status,
  objective = excluded.objective, metrics = excluded.metrics, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'rechargeTransactions', '[]'::jsonb)) as elem)
insert into public.recharge_transactions(
  workspace_id, id, bank, date_text, amount, amount_cop, status, gateway, reference,
  timestamp_text, completed_at_text, package_name, package_type, payment_type,
  credits_added, customer_email, customer_phone, raw, updated_at
)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)), elem->>'bank', elem->>'date',
  case when (elem->>'amount') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'amount')::numeric end,
  case when (elem->>'amountCOP') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'amountCOP')::numeric end,
  elem->>'status', elem->>'gateway', elem->>'reference', elem->>'timestamp', elem->>'completedAt',
  elem->>'packageName', elem->>'packageType', elem->>'paymentType', elem->>'creditsAdded',
  elem->>'customerEmail', elem->>'customerPhone', elem, now()
from items
on conflict (workspace_id, id) do update set bank = excluded.bank, date_text = excluded.date_text,
  amount = excluded.amount, amount_cop = excluded.amount_cop, status = excluded.status,
  gateway = excluded.gateway, reference = excluded.reference, timestamp_text = excluded.timestamp_text,
  completed_at_text = excluded.completed_at_text, package_name = excluded.package_name,
  package_type = excluded.package_type, payment_type = excluded.payment_type,
  credits_added = excluded.credits_added, customer_email = excluded.customer_email,
  customer_phone = excluded.customer_phone, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'faqsList', '[]'::jsonb)) as elem)
insert into public.faqs(workspace_id, id, question, answer, attachments, raw, updated_at)
select 'default', md5(coalesce(elem->>'question','') || '|' || coalesce(elem->>'answer','')),
  elem->>'question', elem->>'answer',
  case when jsonb_typeof(elem->'attachments') in ('object','array') then elem->'attachments' end,
  elem, now()
from items
on conflict (workspace_id, id) do update set question = excluded.question, answer = excluded.answer,
  attachments = excluded.attachments, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'rules', '[]'::jsonb)) as elem)
insert into public.automation_rules(workspace_id, id, kind, phrase, raw, updated_at)
select 'default', md5('rule_text|' || coalesce(elem #>> '{}','')), 'rule_text', elem #>> '{}',
  jsonb_build_object('text', elem #>> '{}'), now()
from items
on conflict (workspace_id, kind, id) do update set phrase = excluded.phrase, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'aiAutomationRules', '[]'::jsonb)) as elem)
insert into public.automation_rules(workspace_id, id, kind, phrase, action, value, active, raw, updated_at)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)), 'ai', elem->>'phrase',
  elem->>'action', elem->>'value',
  case when elem->>'active' in ('true','false') then (elem->>'active')::boolean end,
  elem, now()
from items
on conflict (workspace_id, kind, id) do update set phrase = excluded.phrase, action = excluded.action,
  value = excluded.value, active = excluded.active, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'staff', '[]'::jsonb)) as elem)
insert into public.staff_members(workspace_id, id, name, type, status, orders_count, raw, updated_at)
select 'default', coalesce(nullif(elem->>'id',''), md5(elem::text)), elem->>'name', elem->>'type', elem->>'status',
  case when (elem->>'ordersCount') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'ordersCount')::numeric end,
  elem, now()
from items
on conflict (workspace_id, id) do update set name = excluded.name, type = excluded.type,
  status = excluded.status, orders_count = excluded.orders_count, raw = excluded.raw, updated_at = excluded.updated_at;

with state as (select data from public.app_state where id = 'appState'),
items as (select elem from state, jsonb_array_elements(coalesce(data->'aiDebugLogs', '[]'::jsonb)) as elem)
insert into public.ai_debug_logs(workspace_id, id, model, status, prompt_tokens, completion_tokens, total_tokens, duration_ms, raw)
select 'default', md5(elem::text), elem->>'model', elem->>'status',
  case when (elem->>'promptTokens') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'promptTokens')::numeric end,
  case when (elem->>'completionTokens') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'completionTokens')::numeric end,
  case when (elem->>'totalTokens') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'totalTokens')::numeric end,
  case when (elem->>'durationMs') ~ '^-?[0-9]+(\.[0-9]+)?$' then (elem->>'durationMs')::numeric end,
  elem
from items
on conflict (workspace_id, id) do update set model = excluded.model, status = excluded.status,
  prompt_tokens = excluded.prompt_tokens, completion_tokens = excluded.completion_tokens,
  total_tokens = excluded.total_tokens, duration_ms = excluded.duration_ms, raw = excluded.raw;

-- Lock normalized tables to the backend service role. Browser roles get no
-- direct access; the CRM API remains the only reader/writer.
alter table public.migration_runs enable row level security;
alter table public.app_state_backup_pre_tables_20261010 enable row level security;
alter table public.tenants enable row level security;
alter table public.app_settings enable row level security;
alter table public.channels enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.campaigns enable row level security;
alter table public.recharge_transactions enable row level security;
alter table public.faqs enable row level security;
alter table public.automation_rules enable row level security;
alter table public.staff_members enable row level security;
alter table public.ai_debug_logs enable row level security;

revoke all privileges on table public.migration_runs from anon, authenticated;
revoke all privileges on table public.app_state_backup_pre_tables_20261010 from anon, authenticated;
revoke all privileges on table public.tenants from anon, authenticated;
revoke all privileges on table public.app_settings from anon, authenticated;
revoke all privileges on table public.channels from anon, authenticated;
revoke all privileges on table public.conversations from anon, authenticated;
revoke all privileges on table public.messages from anon, authenticated;
revoke all privileges on table public.customers from anon, authenticated;
revoke all privileges on table public.products from anon, authenticated;
revoke all privileges on table public.orders from anon, authenticated;
revoke all privileges on table public.campaigns from anon, authenticated;
revoke all privileges on table public.recharge_transactions from anon, authenticated;
revoke all privileges on table public.faqs from anon, authenticated;
revoke all privileges on table public.automation_rules from anon, authenticated;
revoke all privileges on table public.staff_members from anon, authenticated;
revoke all privileges on table public.ai_debug_logs from anon, authenticated;

grant select, insert, update, delete on table public.migration_runs to service_role;
grant select, insert, update, delete on table public.app_state_backup_pre_tables_20261010 to service_role;
grant select, insert, update, delete on table public.tenants to service_role;
grant select, insert, update, delete on table public.app_settings to service_role;
grant select, insert, update, delete on table public.channels to service_role;
grant select, insert, update, delete on table public.conversations to service_role;
grant select, insert, update, delete on table public.messages to service_role;
grant select, insert, update, delete on table public.customers to service_role;
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.campaigns to service_role;
grant select, insert, update, delete on table public.recharge_transactions to service_role;
grant select, insert, update, delete on table public.faqs to service_role;
grant select, insert, update, delete on table public.automation_rules to service_role;
grant select, insert, update, delete on table public.staff_members to service_role;
grant select, insert, update, delete on table public.ai_debug_logs to service_role;

update public.migration_runs
set finished_at = now(), status = 'completed', counts = jsonb_build_object(
  'settings', (select count(*) from public.app_settings where workspace_id = 'default'),
  'channels', (select count(*) from public.channels where workspace_id = 'default'),
  'conversations', (select count(*) from public.conversations where workspace_id = 'default'),
  'messages', (select count(*) from public.messages where workspace_id = 'default'),
  'customers', (select count(*) from public.customers where workspace_id = 'default'),
  'products', (select count(*) from public.products where workspace_id = 'default'),
  'orders', (select count(*) from public.orders where workspace_id = 'default'),
  'campaigns', (select count(*) from public.campaigns where workspace_id = 'default'),
  'recharge_transactions', (select count(*) from public.recharge_transactions where workspace_id = 'default'),
  'faqs', (select count(*) from public.faqs where workspace_id = 'default'),
  'automation_rules', (select count(*) from public.automation_rules where workspace_id = 'default'),
  'staff_members', (select count(*) from public.staff_members where workspace_id = 'default'),
  'ai_debug_logs', (select count(*) from public.ai_debug_logs where workspace_id = 'default')
)
where status = 'running' and notes like 'normalized core tables phase 1%';
