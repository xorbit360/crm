-- Phase 0 containment: app_state is a server-only compatibility table.
-- The backend uses a service-role key, which bypasses RLS. Browser roles get no grants.
alter table if exists public.app_state enable row level security;

drop policy if exists "Allow full access to app_state" on public.app_state;
revoke all privileges on table public.app_state from anon, authenticated;
grant select, insert, update, delete on table public.app_state to service_role;
