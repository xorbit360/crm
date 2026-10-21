-- Xorbit 360 Radar de Anuncios: persistencia de búsquedas, anuncios detectados,
-- tiendas analizadas y alertas. Mismo patron de seguridad: RLS habilitado y
-- solo service_role (el CRM/backend es el unico escritor).

create table if not exists public.radar_ads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'meta',
  external_id text,
  keyword text not null default '',
  country text not null default 'CO',
  page_name text not null default '',
  body text not null default '',
  image_url text not null default '',
  start_date text not null default '',
  active_days integer,
  platforms jsonb not null default '[]'::jsonb,
  url text not null default '',
  scraped_at timestamptz not null default now()
);

create table if not exists public.radar_stores (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  platform text not null default 'personalizada',
  title text not null default '',
  currency text not null default '',
  product_count integer not null default 0,
  analyzed_at timestamptz not null default now()
);

create table if not exists public.radar_searches (
  id uuid primary key default gen_random_uuid(),
  user_email text not null default '',
  kind text not null default 'ads',
  keyword text not null default '',
  country text not null default 'CO',
  source text not null default 'meta',
  created_at timestamptz not null default now()
);

create table if not exists public.radar_alerts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null default '',
  keyword text not null default '',
  country text not null default 'CO',
  whatsapp_number text not null default '',
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists radar_ads_keyword_country_idx
  on public.radar_ads (keyword, country, scraped_at desc);
create index if not exists radar_ads_source_idx
  on public.radar_ads (source, scraped_at desc);
create index if not exists radar_searches_email_idx
  on public.radar_searches (user_email, created_at desc);
create index if not exists radar_alerts_active_idx
  on public.radar_alerts (active, created_at desc);

alter table public.radar_ads enable row level security;
alter table public.radar_stores enable row level security;
alter table public.radar_searches enable row level security;
alter table public.radar_alerts enable row level security;

revoke all privileges on table public.radar_ads from anon, authenticated;
revoke all privileges on table public.radar_stores from anon, authenticated;
revoke all privileges on table public.radar_searches from anon, authenticated;
revoke all privileges on table public.radar_alerts from anon, authenticated;

grant select, insert, update, delete on table public.radar_ads to service_role;
grant select, insert, update, delete on table public.radar_stores to service_role;
grant select, insert, update, delete on table public.radar_searches to service_role;
grant select, insert, update, delete on table public.radar_alerts to service_role;
