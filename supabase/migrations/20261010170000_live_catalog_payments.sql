-- Xorbit 360 Live Selling: metodo de pago del pedido (contraentrega o
-- anticipado). El catalogo de productos y los metodos permitidos viven en
-- live_landings.config (JSON), por eso aqui solo se amplia live_orders.
-- El cobro anticipado NO usa pasarela: se coordina por WhatsApp y el
-- pedido queda marcado con payment_method = 'prepaid'.

alter table public.live_orders
  add column if not exists payment_method text not null default 'cod';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'live_orders_payment_method_check'
  ) then
    alter table public.live_orders
      add constraint live_orders_payment_method_check
      check (payment_method in ('cod', 'prepaid'));
  end if;
end $$;
