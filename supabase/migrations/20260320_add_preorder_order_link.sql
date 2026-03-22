alter table public.preorders
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create index if not exists preorders_order_id_idx on public.preorders(order_id);
