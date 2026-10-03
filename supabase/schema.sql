-- YourCoSite — grundschema för databasen
-- Körs i Supabase: Project → SQL Editor → klistra in hela filen → Run

-- ============================================================
-- PROFILES
-- En rad per inloggad användare. Skapas automatiskt vid registrering
-- via triggern längst ner. role avgör behörighet:
--   customer   — vanlig kund
--   support    — kan se kunder, ingen ekonomi/team
--   admin      — hanterar kunder, ser ekonomi, ingen team-hantering
--   superadmin — allt, inklusive att bjuda in/ta bort andra admins
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  company_name text,
  org_number text,
  address_street text,
  address_postal_code text,
  address_city text,
  billing_email text,
  role text not null default 'customer'
    check (role in ('customer', 'support', 'admin', 'superadmin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Hjälpfunktion för att kolla om den inloggade användaren är "staff"
-- (support/admin/superadmin), dvs. får läsa alla kunders profiler/sajter.
-- security definer gör att funktionen kringgår RLS internt, så att
-- policyn nedan inte triggar sig själv i en oändlig loop. Finare
-- behörighetsgränser (vem får ändra vad) hanteras i applikationskoden,
-- inte här.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('support', 'admin', 'superadmin')
  );
$$;

create policy "Användare kan läsa sin egen profil"
  on profiles for select
  using (auth.uid() = id);

create policy "Användare kan uppdatera sin egen profil"
  on profiles for update
  using (auth.uid() = id);

create policy "Staff kan läsa alla profiler"
  on profiles for select
  using (public.is_staff());

-- ============================================================
-- SITES
-- En rad per sajt en kund bygger. company_name/industry/tone kommer
-- från onboarding-flödet. status: draft (under uppbyggnad) eller live.
-- ============================================================
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  tone text,
  status text not null default 'draft' check (status in ('draft', 'live')),
  accent_color text default '#C6FF5E',
  secondary_colors text[] default '{}',
  plan text not null default 'bas' check (plan in ('bas', 'standard', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sites enable row level security;

create policy "Ägare kan läsa sina sajter"
  on sites for select using (auth.uid() = owner_id);
create policy "Ägare kan skapa sajter"
  on sites for insert with check (auth.uid() = owner_id);
create policy "Ägare kan uppdatera sina sajter"
  on sites for update using (auth.uid() = owner_id);
create policy "Ägare kan ta bort sina sajter"
  on sites for delete using (auth.uid() = owner_id);
create policy "Staff kan läsa alla sajter"
  on sites for select using (public.is_staff());

-- ============================================================
-- SITE_PAGES
-- Sidorna som hör till en sajt (Startsida, Om oss, Kontakt, osv).
-- ============================================================
create table if not exists site_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  label text not null,
  path text not null,
  status text not null default 'utkast' check (status in ('utkast', 'live')),
  locked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table site_pages enable row level security;

create policy "Ägare kan hantera sina sidor"
  on site_pages for all using (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );

-- ============================================================
-- Trigger: skapa automatiskt en profilrad när ett nytt konto registreras
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, company_name, org_number,
    address_street, address_postal_code, address_city, billing_email
  )
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'org_number',
    new.raw_user_meta_data->>'address_street',
    new.raw_user_meta_data->>'address_postal_code',
    new.raw_user_meta_data->>'address_city',
    new.raw_user_meta_data->>'billing_email'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Gör dig själv till superadmin (kör detta EN gång, efter att du
-- registrerat ett konto på sajten med din egen e-post):
--
--   update profiles set role = 'superadmin' where email = 'hej@cskb.se';
-- ============================================================
