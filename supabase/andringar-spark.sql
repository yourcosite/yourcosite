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
-- slug = adressen www.yourcosite.com/<slug>. custom_domain = kundens egen
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

-- ============================================================
-- SKYDD: kunder får inte själva ändra publicering eller domän
-- Kolumnerna status, slug, custom_domain, custom_domain_status och
-- published_at får bara ändras av servern (service role), av personal eller
-- direkt i SQL-editorn. En kund som försöker ändra dem via sin egen
-- inloggning (till exempel för att kringgå en pausad sajt eller ta någon
-- annans domän) stoppas här, oavsett vad appen gör. Nya sajter blir alltid
-- utkast utan adress.
-- ============================================================
create or replace function public.protect_site_publishing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ingen inloggad kund (SQL-editor) eller servern med service role: tillåt.
  if auth.uid() is null or auth.role() = 'service_role' or public.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.slug := null;
    new.custom_domain := null;
    new.custom_domain_status := null;
    new.published_at := null;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.slug is distinct from old.slug
     or new.custom_domain is distinct from old.custom_domain
     or new.custom_domain_status is distinct from old.custom_domain_status
     or new.published_at is distinct from old.published_at then
    raise exception 'Publicering och domän kan inte ändras direkt.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_site_publishing on sites;
create trigger protect_site_publishing
  before insert or update on sites
  for each row execute function public.protect_site_publishing();
