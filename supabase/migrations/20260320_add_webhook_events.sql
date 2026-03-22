create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  delivery_id text not null,
  event_type text not null,
  status text not null check (status in ('processing', 'processed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  first_seen_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  unique (provider, delivery_id)
);

create index if not exists idx_webhook_events_provider_seen_at
  on public.webhook_events(provider, first_seen_at desc);
