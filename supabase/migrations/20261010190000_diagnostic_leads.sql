-- Diagnóstico de Conversión (Xorbit 360): leads capturados en la página
-- pública /diagnostico. Tabla nueva aditiva; RLS habilitada con acceso solo
-- para service_role (la API pública y el panel pasan por el servidor).
create table if not exists public.diagnostic_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'default',
  store_url text,
  domain text,
  name text,
  whatsapp text,
  score_total integer,
  scores jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  ai_summary jsonb,
  status text not null default 'nuevo',
  preferred_at timestamptz,
  source text not null default 'web-publica',
  notify_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostic_leads_tenant_created_idx
  on public.diagnostic_leads (tenant_id, created_at desc);

alter table public.diagnostic_leads enable row level security;

drop policy if exists diagnostic_leads_service_role_all on public.diagnostic_leads;
create policy diagnostic_leads_service_role_all
  on public.diagnostic_leads
  for all
  to service_role
  using (true)
  with check (true);
