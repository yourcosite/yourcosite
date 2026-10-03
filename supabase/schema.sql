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
-- från onboarding-flödet. status: draft (under uppbyggnad), live
-- eller pausad (admin har pausat kontot, t.ex. vid utebliven betalning).
-- ============================================================
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  description text,
  tone text,
  style_id text,
  inspiration_links text[] default '{}',
  logo_url text,
  -- Kundens eget val av huvudbild (hero) i onboarding steg 3 — vinner
  -- alltid över startsidans hero i assignUploadedImages, istället för att
  -- bara bli "den som råkar lottas först" bland de allmänna fotona.
  hero_image_url text,
  -- Kundens länkar till sina sociala medier (steg 2 i onboardingen), t.ex.
  -- [{"platform":"instagram","url":"https://instagram.com/..."}]. Läggs in
  -- deterministiskt i sajten (sidfot + kontaktsida) av kod, inte av AI:n.
  social_links jsonb not null default '[]',
  -- Styr hur fri AI:n är att skriva text där kunden inte angett något i sin
  -- brief. true (förval) = AI:n skriver genuin copy ändå. false = AI:n ska
  -- hålla sig nära det kunden faktiskt skrivit och undvika att hitta på
  -- egna konkreta påståenden/detaljer. Se app/api/sites/generate/route.ts.
  allow_ai_text_fill boolean not null default true,
  -- Innehållsmodellen (se lib/contentModel.ts) för sajten, satt av AI:n när
  -- förstagenereringen är klar. null tills onboardingen har byggt sajten.
  content jsonb,
  status text not null default 'draft' check (status in ('draft', 'live', 'pausad')),
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

-- Ett konto får bara ha EN publicerad (live) sajt samtidigt — oavsett
-- vilken kod som försöker sätta status till 'live', stoppar databasen
-- det om kontot redan har en. (Utkast är inte begränsade på samma sätt
-- här — det styrs i applikationskoden, se MAX_SITES_PER_ACCOUNT i
-- lib/supabase/onboardingSite.ts.)
create unique index if not exists one_live_site_per_owner
  on sites (owner_id)
  where (status = 'live');

-- ============================================================
-- SITE_PAGES
-- Sidorna som hör till en sajt (Startsida, Om oss, Kontakt, osv).
-- ============================================================
create table if not exists site_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  label text not null,
  path text not null,
  -- Kundens egen brief ("vad ska sidan innehålla?") från onboardingens steg 3.
  -- Skickas med till AI:n som underlag när den skriver sidans innehåll.
  brief text,
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
-- SITE_ASSETS
-- Egna foton/dokument kunden laddar upp i onboardingens steg 3. "kind"
-- styr var filen kan användas: bilder kan placeras i sajtens design,
-- dokument (Word/PDF) är bara referensmaterial AI:n får läsa senare.
-- ============================================================
create table if not exists site_assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text not null,
  kind text not null check (kind in ('image', 'document')),
  created_at timestamptz not null default now()
);

alter table site_assets enable row level security;

create policy "Ägare kan hantera sina filer"
  on site_assets for all using (owner_id = auth.uid());
create policy "Staff kan läsa alla filer"
  on site_assets for select using (public.is_staff());

-- Kunden laddar upp direkt till Storage från webbläsaren (inte via vår
-- egen server) — annars kör vi fast i Vercels gräns för hur stor en
-- request-body får vara (~4.5 MB), vilket är exakt vad som hände när
-- flera bilder skickades i samma anrop. Policyn släpper bara in filer i
-- kundens EGEN mapp (uploads/<user-id>/...).
create policy "Kunder kan ladda upp egna filer i uploads"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Kunder kan ta bort egna filer i uploads"
  on storage.objects for delete
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- CUSTOMER_NOTES
-- Interna anteckningar om en kund, synliga bara för staff. Skrivs
-- alltid via admin-klienten i API-rutterna (service role), så det
-- räcker med en läs-policy här.
-- ============================================================
create table if not exists customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  author_name text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table customer_notes enable row level security;

create policy "Staff kan läsa anteckningar"
  on customer_notes for select using (public.is_staff());

-- ============================================================
-- ADMIN_ACTIVITY_LOG
-- Vem i teamet gjorde vad och när. Skrivs via admin-klienten i
-- API-rutterna, så bara en läs-policy behövs.
-- ============================================================
create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  actor_name text,
  action text not null,
  target_type text,
  target_id uuid,
  target_label text,
  created_at timestamptz not null default now()
);

alter table admin_activity_log enable row level security;

create policy "Staff kan läsa aktivitetsloggen"
  on admin_activity_log for select using (public.is_staff());

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
