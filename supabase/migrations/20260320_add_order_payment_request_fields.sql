alter table public.orders
  add column if not exists payment_request_token text unique,
  add column if not exists payment_request_created_at timestamp with time zone;

create unique index if not exists orders_payment_request_token_idx
  on public.orders(payment_request_token)
  where payment_request_token is not null;
