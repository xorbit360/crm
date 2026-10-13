-- Xorbit 360 Agente Telefónico de Confirmación COD: campañas y registro de llamadas.
-- RLS bloqueado a service_role; el CRM (API) es el único escritor/lector.
-- (Si no puedes aplicar esto en el SQL Editor, el backend usa app_settings como respaldo.)

create extension if not exists pgcrypto;

create table if not exists public.voice_call_campaigns (
  id text primary key,
  tenant_id text not null default 'default',
  name text not null,
  active boolean not null default true,
  delay_min integer not null default 15,
  schedule_start text not null default '09:00',
  schedule_end text not null default '20:00',
  max_attempts integer not null default 2,
  whatsapp_first boolean not null default true,
  system_prompt text not null default '',
  voice text not null default 'Kore',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_call_campaigns_tenant_idx
  on public.voice_call_campaigns (tenant_id, active);

create table if not exists public.voice_calls (
  id text primary key,
  tenant_id text not null default 'default',
  campaign_id text references public.voice_call_campaigns(id) on delete set null,
  order_id text,
  customer_name text not null default '',
  phone text not null,
  status text not null default 'programada'
    check (status in ('programada','en_curso','confirmada','no_contesto','cancelada','fallida')),
  whatsapp_sent_at timestamptz,
  whatsapp_replied boolean not null default false,
  attempts integer not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer not null default 0,
  transcript jsonb not null default '[]'::jsonb,
  recording_url text,
  cost_usd numeric(10,4) not null default 0,
  twilio_sid text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_calls_tenant_status_idx
  on public.voice_calls (tenant_id, status, created_at desc);
create index if not exists voice_calls_phone_idx
  on public.voice_calls (phone);

-- RLS: solo service_role
alter table public.voice_call_campaigns enable row level security;
drop policy if exists voice_call_campaigns_service_all on public.voice_call_campaigns;
create policy voice_call_campaigns_service_all on public.voice_call_campaigns
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

alter table public.voice_calls enable row level security;
drop policy if exists voice_calls_service_all on public.voice_calls;
create policy voice_calls_service_all on public.voice_calls
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Columnas adicionales que usa el backend (idempotentes por si la migración
-- base ya fue aplicada):
alter table public.voice_calls add column if not exists order_summary text not null default '';
alter table public.voice_calls add column if not exists order_total numeric not null default 0;
alter table public.voice_calls add column if not exists whatsapp_failed boolean not null default false;
alter table public.voice_calls add column if not exists customer_replied boolean not null default false;
alter table public.voice_calls add column if not exists scheduled_for timestamptz;

-- 'llamando' no se usa; el backend usa 'en_curso' para llamada en progreso.
