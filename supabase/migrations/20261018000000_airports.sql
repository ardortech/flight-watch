-- Phase 2: airports for autocomplete; lat/lng are needed for travel-log distances in phase 6 (SPEC §3).
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

-- Reference data: anyone may read it (the sign-in page doesn't need it, but there is nothing private here).
-- Writes only through new migrations or the service role.
alter table airports enable row level security;
create policy "airports: read" on airports
  for select to anon, authenticated using (true);
