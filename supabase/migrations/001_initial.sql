create extension if not exists pgcrypto;

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  location text not null check (char_length(location) between 1 and 200),
  property_type text not null default 'either' check (property_type in ('home', 'land', 'either')),
  min_price integer check (min_price is null or min_price >= 0),
  max_price integer check (max_price is null or max_price >= 0),
  min_beds numeric check (min_beds is null or min_beds >= 0),
  min_acres numeric check (min_acres is null or min_acres >= 0),
  must_haves text not null default '',
  deal_breakers text not null default '',
  alert_email text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (min_price is null or max_price is null or min_price <= max_price)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches(id) on delete cascade,
  status text not null check (status in ('running', 'complete', 'failed')),
  found_count integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  title text not null,
  address text not null default '',
  price numeric,
  currency text not null default 'USD',
  property_type text not null default '',
  beds numeric,
  baths numeric,
  acres numeric,
  summary text not null default '',
  score integer not null check (score between 0 and 100),
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  url text not null,
  image_url text,
  source text not null,
  status text not null default 'new' check (status in ('new', 'saved', 'passed')),
  alerted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (search_id, url)
);

create index listings_score_idx on public.listings (score desc);
create index listings_status_idx on public.listings (status);
create index runs_search_started_idx on public.runs (search_id, started_at desc);

alter table public.searches enable row level security;
alter table public.runs enable row level security;
alter table public.listings enable row level security;

-- This single-owner app uses the service-role key only on the server.
-- No browser or anonymous database policy is required.
