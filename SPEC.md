# Flight Watch — Build Spec

A web app that watches flight prices for a route/date/airline preference, emails the user when the price drops, charts prices for nearby dates, and keeps a log of booked trips. Traditional Chinese (zh-TW, default) and English UI.

Cash fares only for now. Award/mileage search comes later (see "Later"). Keep the provider layer generic so it can be added without rewrites.

> The app name is **Flight Watch** (renamed from the working name "Fare Monitor"). It lives in one constant, `APP_NAME` in `src/config/app.ts`.

Related files: `CLAUDE.md` (shared rules for Claude Code sessions), `docs/design-summary.md` (bilingual overview), `docs/mockup/` (approved screens), `docs/setup-guide.zh-TW.md` (new contributor setup).

---

## 1. Decisions already made

| Topic | Decision |
|---|---|
| Fare data (polling) | **Ignav** — `https://ignav.com/api`, `X-Api-Key` header, $2 per 1,000 successful requests |
| Price insights | **SerpApi Google Flights** — `engine=google_flights`, once per watch per day, target dates only |
| Date window | Per watch: exact date, ±3 days, or ±7 days. Nearby dates keep the **same trip length** (shift the whole trip). |
| Check frequency | User setting per watch: 6 / **12 (default)** / 24 hours for the target dates. Nearby dates: once a day. |
| Currency | User picks per watch (USD, TWD, JPY, EUR, GBP, HKD, SGD, CAD, AUD, KRW). Default USD. |
| Languages | `zh-TW` (default) and `en`, every screen and every email. A 中文 / EN toggle in the header; bare `/` picks from the browser language and remembers a manual switch (cookie + `profiles.locale`). |
| Price history chart | Collapsed by default on the watch detail page |
| Delete | From the dashboard, with confirm and Undo (soft delete) |
| Travel log | "I booked this" turns a watch into a trip; trips can also be added by hand. Optional price watch after booking (default on, 12h, alert at $50 below price paid). See §7 screens 5–7 and phase 6. |
| Tooling (phase 1) | Next.js 16, Tailwind CSS v4 (tokens as CSS variables mapped to the theme), npm, Supabase CLI migrations in `supabase/migrations/` |

## 2. Stack (defaults — change here if needed)

- **Next.js (App Router) + TypeScript**, deployed on **Netlify**
- **Supabase**: Postgres + Auth (email magic link)
- **Resend** for email
- **next-intl** for i18n (`/en/...`, `/zh-TW/...`)
- Charts: hand-built SVG or Recharts; no heavy chart libs
- Tests: Vitest for the logic modules (date expansion, scheduling, alert rules, provider mapping)

Never commit API keys. All secrets come from environment variables (see §10).

---

## 3. Data model (Postgres)

```sql
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

create table alliance_carriers (       -- editable; membership changes over time
  alliance airline_pref not null check (alliance in ('star', 'oneworld', 'skyteam')),
  carrier_code char(2) not null,
  primary key (alliance, carrier_code)
);
```

Row Level Security: users can only read/write their own `watches` and the rows that hang off them. The scheduler uses the service role key.

Seed `alliance_carriers` with current members of the three alliances (verify against each alliance's official member list at build time; don't trust memory). Seed it in phase 3 and show the list to a person before committing the migration.

### Added in later migrations

The tables above are in the phase 1 migration. These come later, each as a **new** migration file (never edit an applied one):

```sql
-- phase 2: airports for autocomplete; lat/lng are needed for travel-log distances in phase 6
create table airports (
  iata char(3) primary key,
  name_en text not null,
  name_zh text,               -- Traditional Chinese name where known
  city_en text not null,
  city_zh text,
  country_code char(2) not null,
  lat double precision not null,
  lng double precision not null
);

-- phase 6: travel log
create type trip_status as enum ('upcoming', 'completed', 'cancelled');

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  watch_id uuid references watches(id) on delete set null,   -- set when created via "I booked this"
  name text not null,
  status trip_status not null default 'upcoming',
  price_paid numeric(12,2),
  currency char(3),
  booked_on date,
  booked_via text,            -- 'airline' | 'ota' | 'agent' | 'points'
  confirmation_code text,     -- optional; shown masked in the UI
  loyalty_program text,
  miles_credited integer,
  first_seen_price numeric(12,2),   -- copied from the watch, for "saved vs first seen"
  keep_watching boolean not null default false,
  rebook_threshold numeric(12,2) default 50,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table trip_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  seq smallint not null,              -- order within the trip
  airline_code char(2),
  flight_number text,
  origin char(3) not null,
  destination char(3) not null,
  depart_at timestamptz,
  arrive_at timestamptz,
  cabin cabin,
  seat text
);
```

Same RLS rule: users see only their own trips and segments. Miles flown = great-circle distance between `airports.lat/lng` of each segment. When a trip has `keep_watching = true`, its watch stays active until departure and also alerts when the price falls `rebook_threshold` below `price_paid`.

---

## 4. Provider layer

```ts
type FareQuery = {
  tripType: 'round' | 'oneway';
  origin: string; destination: string;
  departDate: string; returnDate?: string;   // YYYY-MM-DD
  cabin: 'economy' | 'premium_economy' | 'business' | 'first';
  adults: number;
  airlinePref: 'any' | 'star' | 'oneworld' | 'skyteam' | 'specific';
  airlines: string[];                         // resolved carrier codes
  maxStops: number | null;
  currency: string;
};

type FareResult = {
  source: 'ignav' | 'serpapi';
  price: number | null; currency: string | null;
  airline?: string; flightNumbers?: string; stops?: number;
  providerRef?: string; observedAt?: string; raw: unknown;
};

interface PriceProvider { searchLowest(q: FareQuery): Promise<FareResult>; }
interface InsightProvider { getInsights(q: FareQuery): Promise<Insights>; }
```

Also build a **MockProvider** (deterministic fake prices) and use it by default in development and tests, so building the app costs nothing in API calls. Switch with `PRICE_PROVIDER=mock|ignav`.

### IgnavProvider (all scheduled checks)

- Round trip: `POST /api/fares/round-trip`; one way: `POST /api/fares/one-way`.
- Map: `origin`, `destination`, `departure_date`, `return_date`, `adults`, `cabin_class`, `max_stops`.
- Alliances: Ignav only accepts carrier codes. Resolve `star|oneworld|skyteam` → `airlines_include` from `alliance_carriers`. `specific` → the user's codes.
- **Currency:** Ignav sets currency through `market` (2-letter country code), not a currency code. Keep a map (`USD→US`, `TWD→TW`, `JPY→JP`, `GBP→GB`, `HKD→HK`, `SGD→SG`, `CAD→CA`, `AUD→AU`, `KRW→KR`, `EUR→` a configurable default such as `DE`). Always store the currency the response actually returned; if it differs from the watch currency, keep the snapshot but flag it and exclude it from alert comparisons.
- Keep the cheapest itinerary only. Store `ignav_id` in `provider_ref`.
- Booking links: call `POST /api/fares/booking-links` **only when the user clicks Book** (it's a billed request). `ignav_id` is account-scoped and not stable across searches, so if it fails, re-run the search for that date pair first.
- Errors: 4xx/5xx aren't billed. Retry HTTP 424 `unable_to_complete_request` with backoff. An empty itinerary list is a valid result (`price = null`), not an error.

### SerpApiProvider (insights only)

- `GET https://serpapi.com/search?engine=google_flights` with `departure_id`, `arrival_id`, `outbound_date`, `return_date`, `type` (1 round / 2 one way), `travel_class` (1–4), `adults`, `stops`, `currency`, `hl`, `sort_by=2`.
- Alliances: pass `include_airlines=STAR_ALLIANCE|SKYTEAM|ONEWORLD` directly.
- Read `price_insights`: `lowest_price`, `price_level`, `typical_price_range`, `price_history`. Store in `price_insights`.
- On the **first** insight run for a watch, `price_history` backfills the history chart.
- Leave the default cache on (1h, free). Free tier is 250 searches/month; insights use ~30 per watch per month.

### The comparison rule (important)

Drop detection compares **Ignav snapshots to Ignav snapshots, in the same currency** only. Google's price level is a separate alert reason. If SerpApi ever fills in for a failed Ignav check, chart it but never use it for drop detection.

---

## 5. Scheduler

One Netlify **scheduled function** runs hourly. Scheduled functions have a short time limit, so it must not do the API calls itself: it selects due work and hands it to a **background function** (or processes a small batch and leaves the rest for the next run).

Per active, non-deleted watch whose depart date is in the future:

1. **Target dates** due when `next_target_check_at <= now()`. Interval = `check_every_hours`, but at least 24h when departure is more than 90 days away.
2. **Nearby dates** (only if `flex_days > 0`) due once a day (every 48h when departure is more than 90 days away). Expand to `2 × flex_days` extra date pairs, shifting depart and return together, skipping any date in the past.
3. **Insights** due when `next_insight_check_at` is more than 24h old. Target dates only.
4. After target-date snapshots are written, run the alert rules (§6).

Dedupe: if two watches share the exact same query in the same hour, call the provider once and write both snapshots.

Budget guard: `MAX_IGNAV_CALLS_PER_MONTH` env var. When 90% is used, skip nearby-date checks; at 100%, skip everything and log a warning.

Expected volume at the 12h default per watch: exact ≈ 60 calls/month, ±3 ≈ 240, ±7 ≈ 480.

---

## 6. Alert rules

Evaluated on each new Ignav target-date snapshot (same currency, non-null price). Any rule that fires adds a reason:

- `below_target`: price < `target_price`
- `dropped`: price ≤ last **alerted** price − `rule_drop_amount`, or a drop of ≥ `rule_drop_pct`% (first alert compares with the first snapshot)
- `lowest_seen`: price < every previous Ignav snapshot for these dates
- `google_low`: latest insight `price_level = 'low'` and not already alerted for this level today
- `nearby_cheaper` (optional): a nearby date pair is cheaper than the target by ≥ `rule_drop_amount`

Send at most one email per watch per `alert_cooldown_hours`. One email lists all reasons. Write an `alerts` row for each email sent.

Put this in a pure function (`evaluateAlerts(snapshot, history, insights, watch) → reasons[]`) with unit tests for each rule, the cooldown, and the currency mismatch case.

---

## 7. Screens

Both languages, Chinese by default, with a 中文 / EN toggle next to the app name in the header. Approved mockups for every screen are in `docs/mockup/` (`*Zh` = Chinese); match them. Header nav: 我的追蹤 Watches · 我的旅程 Trips · 通知紀錄 Alerts · 設定 Settings. Desktop-first, works at phone width. Visual style: navy `#14202B` header and dark panels, light ground `#F3F4F1`, amber `#E8A33D` primary action, blue `#1F5FBF`/`#DCE8FA` for "cheaper/low", orange `#A8530F`/`#FBE3CC` for "higher". Fonts: IBM Plex Sans (UI), IBM Plex Mono (prices, airport codes), Noto Sans TC (Chinese).

1. **Dashboard (`/`)**: summary tiles (active watches, drops in 7 days, best saving vs. first seen, checks used this month); latest alert banner; watch cards showing route, cities, dates, filter chips, window chip, 30-day sparkline, current price, change since last check, Google price level. Each card has a **delete** button → inline confirm ("You'll stop getting alerts and its price history will be removed") → soft delete → **Undo** bar. Empty state with a New watch button.
2. **New watch (`/watches/new`)**: trip type (round/one way); from/to (airport autocomplete); dates; date window (Exact / ±3 / ±7, with "1 / 7 / 15 dates"); airlines (Any / Star Alliance / oneworld / SkyTeam / Specific → code input); cabin; adults; stops; **currency**; **check frequency** (6 / 12 default / 24 h); optional target price (shows currency symbol). Side panel summarizes the watch and shows an estimated checks-per-month number.
3. **Watch detail (`/watches/[id]`)**: route header with chips; current lowest price, change since last check, Google price level + typical range, first/lowest/target; **nearby dates bar chart** with Exact / ±3 / ±7 toggle (your date dark, cheapest blue, others grey) plus one-line insight ("Leaving Dec 15 is $24 cheaper"); **price over time** line chart with Google typical-range band and dashed target line, **collapsed by default** with a summary line and Show/Hide button; alert rules form; table of cheapest itineraries with **Book** (fetches booking link on click); **I booked this** (opens screen 7); edit / pause / delete.
4. **Price-drop email**: subject `↓ SFO ⇄ TPE now $812 (−$86)`; price, old price struck through; "Why you're getting this" list of reasons; 3 nearest dates; buttons View price chart / Book; footer with cooldown, change rules, pause. Sent in the user's locale.
5. **Trips (`/trips`)**: tabs **Upcoming** (dark "next trip" card with days-to-go countdown, then other trips with price paid and a status chip such as "Now $798 · $14 below what you paid"), **Past** (grouped by year: dates, name, route, airline, miles, price paid), **Stats** (year switcher 2026 / 2025 / All time; tiles for trips, flights, miles flown with "≈ N× around the Earth", countries, spent, saved vs first seen; flights by airline bars; places visited). "Add trip" button for manual entry.
6. **Trip detail (`/trips/[id]`)**: name, status chips, countdown; flights (departure → arrival, duration, nonstop/stops, cabin, seat, miles); notes; booking card (price paid, saved vs first seen, booked date and channel, confirmation code masked with Show/Hide, loyalty program); **Price after booking** panel with on/off switch, current price vs paid, link to the watch; edit / mark cancelled / delete.
7. **I booked this (dialog from watch detail)**: pre-filled from the watch: trip name, price paid (live "saved vs first seen" line, orange if paid more), booked on (airline / OTA / agent / points), outbound and return flight from the cheapest option (editable), confirmation code and loyalty program (optional), **keep watching after booking** switch with threshold ($25 / $50 / $100). Save → trip detail.

Copy rules: prices are "from" prices; always say the final price is shown at checkout. zh-TW uses Taiwan terms (星空聯盟, 寰宇一家, 天合聯盟, 經濟艙, 豪華經濟艙, 直飛, 轉機, 12月18日, 週四).

---

## 8. Build order

Each phase ends with something that runs. Use the mock provider until phase 3.

1. **Scaffold** — Next.js + TS, next-intl (`en`, `zh-TW`), Supabase schema + RLS + magic-link auth, design tokens, layout/header. *Done when:* sign in, switch language, see an empty dashboard.
2. **Watches CRUD** — rename `APP_NAME` to "Flight Watch" and add the 中文 / EN header toggle; `airports` table + seed (with lat/lng) and airport autocomplete; new-watch form with validation (return after depart, dates in future, valid IATA), dashboard cards, detail page shell, soft delete + Undo, pause. *Done when:* create, view, pause, delete, undo, all in both languages.
3. **Ignav + scheduler** — IgnavProvider, alliance resolution, currency→market map, date-pair expansion, scheduled + background function, snapshots, budget guard. Detail page: current price, nearby-dates chart, cheapest itineraries, Book button. *Done when:* a real watch fills in its nearby-dates chart after one scheduler run.
4. **SerpApi insights** — SerpApiProvider, daily insight run, history backfill, price level badge, price-over-time chart (collapsed by default), sparkline on dashboard.
5. **Alerts** — `evaluateAlerts` with tests, cooldown, Resend email templates in both languages, latest-alert banner, alert rules form on detail page.
6. **Travel log** — `trips` + `trip_segments` migration and RLS; Trips page (Upcoming / Past / Stats), trip detail, manual "Add trip", "I booked this" dialog from the watch detail page, price watch after booking (scheduler keeps checking until departure; rebook alert rule), "next trip" card on the dashboard. UI can start early with mock data; wiring to watches waits for phases 3–5. *Done when:* booking a watch creates a trip with savings shown, a manual trip appears in Past with correct miles, and stats match the trips, in both languages.
7. **Polish** — loading/empty/error states, phone layout, purge job for soft-deleted watches and trips older than 7 days, "checks used this month" tile.

## 9. Later (don't build yet, don't block it)

- Award/mileage search via a third provider (Seats.aero API is for non-commercial use unless you have a written agreement — check terms before building).
- LINE / Telegram / web push notifications.
- Travel log extras: import bookings by forwarding confirmation emails, flight status on the day of travel, calendar (.ics) export, route map on the Stats tab.
- Multi-user product concerns: plans, per-user quotas, Terms/Privacy pages.

## 10. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IGNAV_API_KEY=
SERPAPI_API_KEY=
RESEND_API_KEY=
ALERT_FROM_EMAIL=
APP_BASE_URL=
PRICE_PROVIDER=mock            # mock | ignav
MAX_IGNAV_CALLS_PER_MONTH=2000
EUR_MARKET=DE
```

Provide `.env.example` with these names and no values.
