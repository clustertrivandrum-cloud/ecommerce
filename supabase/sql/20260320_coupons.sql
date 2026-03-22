create table if not exists coupons (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    description text null,
    discount_amount numeric not null default 0 check (discount_amount >= 0),
    discount_percent numeric null check (discount_percent >= 0 and discount_percent <= 100),
    max_uses int null check (max_uses >= 0),
    uses int not null default 0,
    starts_at timestamptz null,
    expires_at timestamptz null,
    stackable boolean not null default false,
    min_order_value numeric null,
    created_at timestamptz not null default now()
);

create index if not exists coupons_code_idx on coupons(lower(code));
