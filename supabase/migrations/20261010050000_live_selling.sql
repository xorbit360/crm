-- Xorbit 360 Live Selling: multi-tenant landings, simulated comments,
-- real visitor comments, COD orders/leads and WhatsApp click tracking.
-- RLS stays locked to service_role; the CRM/public API is the only writer.

create extension if not exists pgcrypto;

create or replace function public.live_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.live_landings (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'default',
  slug text not null unique,
  custom_domain text unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  title text not null,
  live_label text,
  disclosure_text text not null default 'Transmisión pregrabada',
  title_background text not null default '#e898db',
  button_text text not null default '¡COMPRAR!',
  button_color text not null default '#e11d48',
  product_name text,
  product_image_url text,
  product_price numeric not null default 0,
  product_compare_price numeric,
  shipping_price numeric not null default 0,
  shipping_text text,
  coupon_code text,
  coupon_discount_percent numeric not null default 0,
  video_provider text check (video_provider in ('youtube', 'vimeo')),
  video_id text,
  video_url text,
  allow_loop boolean not null default true,
  whatsapp_number text,
  whatsapp_text text,
  comment_mode text not null default 'sequence' check (comment_mode in ('sequence', 'countdown')),
  viewers_min integer not null default 40,
  viewers_max integer not null default 60,
  domain_verified boolean not null default false,
  domain_status text not null default 'not_configured',
  domain_verified_at timestamptz,
  domain_check jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_landings_tenant_status_idx
  on public.live_landings (tenant_id, status, updated_at desc);
create index if not exists live_landings_domain_idx
  on public.live_landings (custom_domain);

create table if not exists public.live_fake_comments (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid not null references public.live_landings(id) on delete cascade,
  tenant_id text not null default 'default',
  author text not null,
  content text not null,
  avatar_url text,
  at_second integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_fake_comments_landing_order_idx
  on public.live_fake_comments (landing_id, sort_order, at_second, created_at);

create table if not exists public.live_visitor_comments (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid not null references public.live_landings(id) on delete cascade,
  tenant_id text not null default 'default',
  visitor_id text,
  content text not null,
  phone text,
  utm jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists live_visitor_comments_landing_time_idx
  on public.live_visitor_comments (landing_id, created_at desc);
create index if not exists live_visitor_comments_tenant_time_idx
  on public.live_visitor_comments (tenant_id, created_at desc);

create table if not exists public.live_orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  landing_id uuid not null references public.live_landings(id) on delete cascade,
  tenant_id text not null default 'default',
  status text not null default 'order' check (status in ('lead', 'order', 'confirmed', 'ready', 'delivered', 'cancelled')),
  product_snapshot jsonb not null default '{}'::jsonb,
  product_name text,
  product_price numeric not null default 0,
  quantity integer not null default 1,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  coupon_code text,
  customer_name text,
  phone text,
  address text,
  department text,
  city text,
  email text,
  visitor_id text,
  event_id text,
  utm jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_orders_landing_time_idx
  on public.live_orders (landing_id, created_at desc);
create index if not exists live_orders_tenant_time_idx
  on public.live_orders (tenant_id, status, created_at desc);
create index if not exists live_orders_phone_idx
  on public.live_orders (landing_id, phone);

create table if not exists public.live_whatsapp_clicks (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid not null references public.live_landings(id) on delete cascade,
  tenant_id text not null default 'default',
  visitor_id text,
  utm jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists live_whatsapp_clicks_landing_time_idx
  on public.live_whatsapp_clicks (landing_id, created_at desc);

drop trigger if exists live_landings_set_updated_at on public.live_landings;
create trigger live_landings_set_updated_at
before update on public.live_landings
for each row execute function public.live_set_updated_at();

drop trigger if exists live_fake_comments_set_updated_at on public.live_fake_comments;
create trigger live_fake_comments_set_updated_at
before update on public.live_fake_comments
for each row execute function public.live_set_updated_at();

drop trigger if exists live_orders_set_updated_at on public.live_orders;
create trigger live_orders_set_updated_at
before update on public.live_orders
for each row execute function public.live_set_updated_at();

alter table public.live_landings enable row level security;
alter table public.live_fake_comments enable row level security;
alter table public.live_visitor_comments enable row level security;
alter table public.live_orders enable row level security;
alter table public.live_whatsapp_clicks enable row level security;

revoke all privileges on table public.live_landings from anon, authenticated;
revoke all privileges on table public.live_fake_comments from anon, authenticated;
revoke all privileges on table public.live_visitor_comments from anon, authenticated;
revoke all privileges on table public.live_orders from anon, authenticated;
revoke all privileges on table public.live_whatsapp_clicks from anon, authenticated;

grant select, insert, update, delete on table public.live_landings to service_role;
grant select, insert, update, delete on table public.live_fake_comments to service_role;
grant select, insert, update, delete on table public.live_visitor_comments to service_role;
grant select, insert, update, delete on table public.live_orders to service_role;
grant select, insert, update, delete on table public.live_whatsapp_clicks to service_role;
