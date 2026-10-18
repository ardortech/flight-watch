-- Fare Monitor initial schema (SPEC §3), RLS, and profile auto-creation.

create extension if not exists pgcrypto;

create type trip_type as enum ('round', 'oneway');
create type cabin as enum ('economy', 'premium_economy', 'business', 'first');
create type airline_pref as enum ('any', 'star', 'oneworld', 'skyteam', 'specific');
create type price_source as enum ('ignav', 'serpapi');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  locale text not null default 'en' check (locale in ('en', 'zh-TW')),
  created_at timestamptz not null default now()
);

create table watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  trip_type trip_type not null,
  origin char(3) not null,            -- IATA
  destination char(3) not null,
  depart_date date not null,
  return_date date,                   -- null for one-way
  cabin cabin not null default 'economy',
  adults smallint not null default 1 check (adults between 1 and 9),
  airline_pref airline_pref not null default 'any',
  airlines text[] not null default '{}',   -- only for 'specific'
  max_stops smallint,                 -- null = any, 0 = nonstop, 1 = ≤1 stop
  flex_days smallint not null default 0 check (flex_days in (0, 3, 7)),
  currency char(3) not null default 'USD',
  check_every_hours smallint not null default 12 check (check_every_hours in (6, 12, 24)),
  target_price numeric(12,2),
  -- alert rules
  rule_drop_amount numeric(12,2) default 50,
  rule_drop_pct numeric(5,2) default 5,
  rule_lowest_seen boolean not null default true,
  rule_google_low boolean not null default true,
  rule_nearby_cheaper boolean not null default false,
  alert_cooldown_hours smallint not null default 12,
  -- scheduling
  status text not null default 'active' check (status in ('active', 'paused')),
  next_target_check_at timestamptz not null default now(),
  next_nearby_check_at timestamptz not null default now(),
  next_insight_check_at timestamptz not null default now(),
  deleted_at timestamptz,             -- soft delete (Undo); purge after 7 days
  created_at timestamptz not null default now()
);
create index on watches (user_id);

create table price_snapshots (
  id bigserial primary key,
  watch_id uuid not null references watches(id) on delete cascade,
  source price_source not null,
  depart_date date not null,
  return_date date,
  price numeric(12,2),                -- null when no itinerary matched
  currency char(3),
  airline text,
  flight_numbers text,
  stops smallint,
  provider_ref text,                  -- Ignav ignav_id (account-scoped, short-lived)
  observed_at timestamptz,            -- provider's freshness timestamp if given
  checked_at timestamptz not null default now(),
  raw jsonb
);
create index on price_snapshots (watch_id, depart_date, checked_at desc);

create table price_insights (
  id bigserial primary key,
  watch_id uuid not null references watches(id) on delete cascade,
  checked_at timestamptz not null default now(),
  lowest_price numeric(12,2),
  price_level text,                   -- 'low' | 'typical' | 'high'
  typical_low numeric(12,2),
  typical_high numeric(12,2),
  history jsonb,                      -- [[unix_ts, price], ...] from SerpApi
  currency char(3)
);
create index on price_insights (watch_id, checked_at desc);

create table alerts (
  id bigserial primary key,
  watch_id uuid not null references watches(id) on delete cascade,
  snapshot_id bigint references price_snapshots(id),
  reasons text[] not null,            -- 'below_target','dropped','lowest_seen','google_low','nearby_cheaper'
  price numeric(12,2) not null,
  previous_price numeric(12,2),
  currency char(3) not null,
  sent_at timestamptz not null default now()
);
create index on alerts (watch_id, sent_at desc);

create table alliance_carriers (       -- editable; membership changes over time
  alliance airline_pref not null check (alliance in ('star', 'oneworld', 'skyteam')),
  carrier_code char(2) not null,
  primary key (alliance, carrier_code)
);
-- Seeded in phase 3 from the alliances' official member lists.

-- ---------------------------------------------------------------------------
-- Profile auto-creation: one profiles row per auth user.
-- The sign-in form passes the UI locale as user metadata.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, locale)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data ->> 'locale' in ('en', 'zh-TW')
         then new.raw_user_meta_data ->> 'locale'
         else 'en' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security. Users reach only their own rows; the scheduler uses the
-- service role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table watches enable row level security;
alter table price_snapshots enable row level security;
alter table price_insights enable row level security;
alter table alerts enable row level security;
alter table alliance_carriers enable row level security;

-- profiles: read and update own row (insert comes from the trigger; delete cascades from auth.users).
create policy "profiles: read own" on profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- watches: full CRUD on own rows.
create policy "watches: read own" on watches
  for select to authenticated using (user_id = (select auth.uid()));
create policy "watches: insert own" on watches
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "watches: update own" on watches
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "watches: delete own" on watches
  for delete to authenticated using (user_id = (select auth.uid()));

-- Rows hanging off a watch: readable by the watch owner (the subquery is itself
-- filtered by the watches policy). Written only by the scheduler (service role).
create policy "price_snapshots: read own" on price_snapshots
  for select to authenticated using (watch_id in (select id from watches));
create policy "price_insights: read own" on price_insights
  for select to authenticated using (watch_id in (select id from watches));
create policy "alerts: read own" on alerts
  for select to authenticated using (watch_id in (select id from watches));

-- alliance_carriers: reference data, readable by signed-in users, edited by admins/service role.
create policy "alliance_carriers: read" on alliance_carriers
  for select to authenticated using (true);
