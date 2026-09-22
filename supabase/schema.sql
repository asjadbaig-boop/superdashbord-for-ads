-- AdsByAsjad Tracker schema
-- Run this in your Supabase project's SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  currency text not null default 'USD',
  cpl_good_max numeric not null default 30,   -- CPL <= this => green
  cpl_watch_max numeric not null default 60,  -- CPL <= this => amber, above => red
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  objective text,
  created_at timestamptz not null default now()
);

create table if not exists ad_sets (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  daily_budget numeric,
  created_at timestamptz not null default now()
);

create table if not exists ads (
  id uuid primary key default uuid_generate_v4(),
  ad_set_id uuid not null references ad_sets(id) on delete cascade,
  name text not null,
  first_active_date date not null default current_date,
  status text not null default 'active' check (status in ('active','paused','killed')),
  created_at timestamptz not null default now()
);

create table if not exists daily_entries (
  id uuid primary key default uuid_generate_v4(),
  ad_id uuid not null references ads(id) on delete cascade,
  date date not null,
  spend numeric not null default 0,
  results numeric not null default 0,
  clicks numeric not null default 0,
  impressions numeric not null default 0,
  landing_page_views numeric not null default 0,
  frequency numeric,
  created_at timestamptz not null default now(),
  unique (ad_id, date)
);

create index if not exists idx_campaigns_client on campaigns(client_id);
create index if not exists idx_adsets_campaign on ad_sets(campaign_id);
create index if not exists idx_ads_adset on ads(ad_set_id);
create index if not exists idx_entries_ad on daily_entries(ad_id);
create index if not exists idx_entries_date on daily_entries(date);

-- RLS: this app has no login screen and talks to Supabase with the anon
-- key, so policies grant full access to anon. Tighten this if you add auth.
alter table clients enable row level security;
alter table campaigns enable row level security;
alter table ad_sets enable row level security;
alter table ads enable row level security;
alter table daily_entries enable row level security;

create policy "anon full access" on clients for all using (true) with check (true);
create policy "anon full access" on campaigns for all using (true) with check (true);
create policy "anon full access" on ad_sets for all using (true) with check (true);
create policy "anon full access" on ads for all using (true) with check (true);
create policy "anon full access" on daily_entries for all using (true) with check (true);
