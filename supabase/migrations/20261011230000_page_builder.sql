-- Xorbit 360 Constructor de Páginas: landings, sitios web y product pages por bloques.
-- RLS bloqueado a service_role; el CRM (API) es el único escritor/lector.

create extension if not exists pgcrypto;

create table if not exists public.builder_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'default',
  slug text not null unique,
  name text not null,
  page_type text not null default 'landing' check (page_type in ('landing', 'website', 'product')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  blocks jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  conversion_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_pages_tenant_status_idx
  on public.builder_pages (tenant_id, status, updated_at desc);
create index if not exists builder_pages_slug_idx
  on public.builder_pages (slug);

-- RLS: solo service_role (las claves anon/authenticated no leen ni escriben)
alter table public.builder_pages enable row level security;
drop policy if exists builder_pages_service_all on public.builder_pages;
create policy builder_pages_service_all on public.builder_pages
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
