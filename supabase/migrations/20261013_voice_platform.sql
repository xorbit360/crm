-- Xorbit 360 Telefonía integrada: números verificados por tenant, billetera de voz y ledger.
-- RLS bloqueado a service_role; el CRM (API) es el único escritor/lector.
-- (Si no puedes aplicar esto en el SQL Editor, el backend usa app_settings como respaldo.)

create table if not exists public.voice_tenant_numbers (
  id text primary key,
  tenant_id text not null default 'default',
  phone text not null,
  label text not null default '',
  verified boolean not null default false,
  is_primary boolean not null default false,
  twilio_sid text,
  created_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index if not exists voice_tenant_numbers_tenant_idx
  on public.voice_tenant_numbers (tenant_id);

create table if not exists public.voice_wallets (
  tenant_id text primary key,
  balance_usd numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_wallet_ledger (
  id text primary key,
  tenant_id text not null default 'default',
  kind text not null default 'charge'
    check (kind in ('topup','charge','manual','refund')),
  amount_usd numeric(12,4) not null default 0,
  cost_usd numeric(12,4) not null default 0,
  margin_usd numeric(12,4) not null default 0,
  minutes numeric(10,2),
  reference text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists voice_wallet_ledger_tenant_idx
  on public.voice_wallet_ledger (tenant_id, created_at desc);

-- RLS: solo service_role
alter table public.voice_tenant_numbers enable row level security;
drop policy if exists voice_tenant_numbers_service_all on public.voice_tenant_numbers;
create policy voice_tenant_numbers_service_all on public.voice_tenant_numbers
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

alter table public.voice_wallets enable row level security;
drop policy if exists voice_wallets_service_all on public.voice_wallets;
create policy voice_wallets_service_all on public.voice_wallets
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

alter table public.voice_wallet_ledger enable row level security;
drop policy if exists voice_wallet_ledger_service_all on public.voice_wallet_ledger;
create policy voice_wallet_ledger_service_all on public.voice_wallet_ledger
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
