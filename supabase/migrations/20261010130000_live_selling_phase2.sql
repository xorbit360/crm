-- Xorbit 360 Live Selling fase 2: checkout por landing (CRM / Shopify / solo
-- WhatsApp), link de WhatsApp pegado completo, metricas de visitas y clics
-- de checkout. Mismo patron de seguridad: RLS solo service_role.

alter table public.live_landings
  add column if not exists checkout_mode text not null default 'crm';
alter table public.live_landings
  add column if not exists shopify_url text;
alter table public.live_landings
  add column if not exists whatsapp_link text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'live_landings_checkout_mode_check'
  ) then
    alter table public.live_landings
      add constraint live_landings_checkout_mode_check
      check (checkout_mode in ('crm', 'shopify', 'whatsapp'));
  end if;
end $$;

create table if not exists public.live_pageviews (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid not null references public.live_landings(id) on delete cascade,
  tenant_id text not null default 'default',
  visitor_id text,
  utm jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists live_pageviews_landing_time_idx
  on public.live_pageviews (landing_id, created_at desc);
create index if not exists live_pageviews_tenant_time_idx
  on public.live_pageviews (tenant_id, created_at desc);

create table if not exists public.live_checkout_clicks (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid not null references public.live_landings(id) on delete cascade,
  tenant_id text not null default 'default',
  mode text not null default 'crm',
  visitor_id text,
  utm jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists live_checkout_clicks_landing_time_idx
  on public.live_checkout_clicks (landing_id, created_at desc);
create index if not exists live_checkout_clicks_tenant_time_idx
  on public.live_checkout_clicks (tenant_id, created_at desc);

alter table public.live_pageviews enable row level security;
alter table public.live_checkout_clicks enable row level security;

revoke all privileges on table public.live_pageviews from anon, authenticated;
revoke all privileges on table public.live_checkout_clicks from anon, authenticated;

grant select, insert, update, delete on table public.live_pageviews to service_role;
grant select, insert, update, delete on table public.live_checkout_clicks to service_role;
