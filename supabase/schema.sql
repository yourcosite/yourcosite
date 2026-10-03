-- YourCoSite — grundschema för databasen
-- Körs i Supabase: Project → SQL Editor → klistra in hela filen → Run

-- ============================================================
-- PROFILES
-- En rad per inloggad användare. Skapas automatiskt vid registrering
-- via triggern längst ner. role avgör om man är vanlig kund eller admin.
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Användare kan läsa sin egen profil"
  on profiles for select
  using (auth.uid() = id);

create policy "Användare kan uppdatera sin egen profil"
  on profiles for update
  using (auth.uid() = id);

create policy "Admin kan läsa alla profiler"
  on profiles for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

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
create policy "Admin kan läsa alla sajter"
  on sites for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

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
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Gör dig själv till admin (kör detta EN gång, efter att du registrerat
-- ett konto på sajten med din egen e-post):
--
--   update profiles set role = 'admin' where email = 'hej@cskb.se';
-- ============================================================
