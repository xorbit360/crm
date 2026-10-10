-- Live Selling: interruptor para mostrar el aviso de transmision pregrabada.
-- Apagado por defecto (decision expresa de Oscar, 2026-10-10): la pagina
-- publica no muestra el rotulo salvo que el dueno lo active por landing.
alter table public.live_landings add column if not exists show_disclosure boolean not null default false;
