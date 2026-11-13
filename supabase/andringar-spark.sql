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

-- Tillägget gäller en sajt (varje sajt har egna 30 ändringar). Kör även för
-- redan skapad tabell. Rader utan site_id gäller kontots alla sajter.
alter table change_addons add column if not exists site_id uuid references sites (id) on delete cascade;

-- Paketet innehåller en sajt. Fler sajter beställs (150 kr/mån) och läggs in
-- av admin här: antal EXTRA sajter utöver den första.
alter table profiles add column if not exists extra_sites integer not null default 0;

-- Kostnadsfria konton (faktureras inte) och antal extra språk (0, 1 eller 2:
-- tillägget 39 kr resp. 59 kr per månad). Sätts av admin på kundsidan och
-- används av fakturaunderlaget (/api/admin/billing-export).
alter table profiles add column if not exists billing_exempt boolean not null default false;
alter table profiles add column if not exists extra_languages integer not null default 0;

-- ============================================================
-- PUBLICERING OCH EGEN DOMÄN
-- slug = adressen www.yourcosite.com/s/<slug>. custom_domain = kundens egen
-- domän (utan www). custom_domain_status: 'pending' (väntar på DNS) eller
-- 'active' (pekar rätt). Spärren "en live-sajt per konto" tas bort eftersom
-- extra sajter (tillägg) ska kunna vara live samtidigt.
-- ============================================================
alter table sites add column if not exists slug text;
create unique index if not exists sites_slug_key on sites (lower(slug)) where slug is not null;
alter table sites add column if not exists custom_domain text;
create unique index if not exists sites_custom_domain_key on sites (lower(custom_domain)) where custom_domain is not null;
alter table sites add column if not exists custom_domain_status text;
alter table sites add column if not exists published_at timestamptz;
drop index if exists one_live_site_per_owner;
