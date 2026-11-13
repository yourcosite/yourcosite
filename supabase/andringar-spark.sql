-- Spärr på antal ändringar per månad (30 ingår i paketet) och tillägg.
-- Kör i Supabase SQL Editor. Utan de här tabellerna är spärren avstängd
-- (koden släpper då igenom allt), så det är säkert att köra i efterhand.

-- En rad för varje ändring Millie faktiskt gjort på kundens sajt.
create table if not exists site_changes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  site_id uuid not null references sites (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists site_changes_owner_idx on site_changes (owner_id, created_at desc);

alter table site_changes enable row level security;

drop policy if exists "Ägaren ser sina ändringar" on site_changes;
create policy "Ägaren ser sina ändringar"
  on site_changes for select using (owner_id = auth.uid());

drop policy if exists "Ägaren sparar sina ändringar" on site_changes;
create policy "Ägaren sparar sina ändringar"
  on site_changes for insert with check (owner_id = auth.uid());

-- Extra ändringar som lagts till för en månad (t.ex. "50 extra ändringar").
-- Läggs in av admin när tillägget beställts. month = 'ÅÅÅÅ-MM'.
create table if not exists change_addons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  month text not null,
  amount integer not null,
  created_at timestamptz not null default now()
);
create index if not exists change_addons_owner_idx on change_addons (owner_id, month);

alter table change_addons enable row level security;

drop policy if exists "Ägaren ser sina tillägg" on change_addons;
create policy "Ägaren ser sina tillägg"
  on change_addons for select using (owner_id = auth.uid());
-- Skrivning sker bara via adminportalen (service role), ingen policy för insert.
