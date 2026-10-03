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
  -- Paketet kunden valde i registreringens betalsteg (app/skapa-konto/paket)
  -- — null tills de väljer ett (det steget går att hoppa över helt för nu,
  -- se billing_setup_complete). Separat från sites.plan: det här är vad
  -- kunden SA att de ville ha, sites.plan är vad en given sajt faktiskt
  -- körs på — de sätts lika när första sajten skapas, men kan gå isär om
  -- kunden byter plan på en specifik sajt senare.
  chosen_plan text check (chosen_plan in ('bas', 'standard', 'premium')),
  -- true bara när kundens betalkort faktiskt är kopplat (riktig
  -- betalintegration finns inte än — se app/skapa-konto/paket/page.tsx,
  -- som alltid lämnar den här false). Låter staff se i adminportalen vilka
  -- kunder som hoppade över kortuppgifterna och behöver kontaktas.
  billing_setup_complete boolean not null default false,
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
  -- Skärmdumpar/bilder kunden laddar upp som inspiration (onboarding steg
  -- 2) — ett komplement till inspiration_links för referenser som inte går
  -- att länka till (Pinterest-urklipp, ett foto av en skylt de gillar,
  -- en sajt bakom inloggning, eller en modern sajt vars innehåll byggs med
  -- JavaScript så att vår länk-hämtning inte ser något). Skickas som
  -- bilder direkt till AI:n vid genereringen (se app/api/sites/generate),
  -- aldrig använda som bilder I sajten.
  inspiration_image_urls text[] default '{}',
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
  -- Kundens egen integritetspolicy för SIN sajt (onboarding steg 5) — skild
  -- från YourCoSites egna juridiska sidor. "uploaded" = kunden laddade upp
  -- en egen fil (t.ex. en PDF från sin jurist) och sidfoten länkar direkt
  -- till den. "generated" = kunden hade ingen egen och fick en enkel
  -- textpolicy skriven åt sig utifrån de uppgifter de angav nedan — ett
  -- fast kodtemplate (se lib/privacyPolicyTemplate.ts), ALDRIG fritt
  -- AI-skrivet, eftersom juridiskt grundinnehåll inte ska vara kreativ
  -- copy. null = inget valt, ingen policy-länk visas i sidfoten.
  privacy_policy_mode text check (privacy_policy_mode in ('uploaded', 'generated')),
  privacy_policy_file_url text,
  privacy_policy_text text,
  privacy_policy_org_number text,
  privacy_policy_address text,
  privacy_policy_email text,
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
-- SITE_PAGEVIEWS
-- Vår egen, cookiefria besöksstatistik — en rad per sidvisning, skriven av
-- PageviewBeacon i components/SitePreview.tsx via /api/analytics/track
-- (publik rutt, service role, se den filen). Medvetet MINIMAL: inget
-- besökar-id, ingen cookie, ingen IP sparas — bara vilken sida, varifrån
-- (referrer) och när. Kan inte kopplas till en enskild person, så den
-- behöver inget cookiesamtycke (till skillnad från Google Analytics/Meta
-- Pixel, se SiteContent.gaMeasurementId i lib/contentModel.ts). Visas för
-- kunden på /statistik.
-- ============================================================
create table if not exists site_pageviews (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  path text not null,
  referrer text,
  visited_at timestamptz not null default now()
);

create index if not exists site_pageviews_site_id_idx on site_pageviews (site_id, visited_at desc);

alter table site_pageviews enable row level security;

create policy "Ägare kan läsa sin egen statistik"
  on site_pageviews for select using (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );
create policy "Staff kan läsa all statistik"
  on site_pageviews for select using (public.is_staff());

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
-- SUPPORT_MESSAGES
-- Meddelanden kunder skickar in direkt via kundportalen — antingen via
-- "Kontakta oss" i kontomenyn, eller via knappen Millie visar i
-- chattredigeraren när ett önskemål inte går att utföra inom
-- innehållsmodellen (se "unsupported" i app/api/sites/edit/route.ts).
-- Ersätter mejl hit och dit med en delad inkorg staff kan se i
-- adminportalen (/admin/meddelanden). Skrivs alltid via admin-klienten i
-- API-rutterna (service role), så det räcker med en läs-policy här, på
-- samma sätt som customer_notes ovan.
-- ============================================================
create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  site_id uuid references sites (id) on delete set null,
  -- "konto" = Kontakta oss-knappen i kontomenyn. "chattredigerare" =
  -- knappen Millie visar när hon inte kan utföra önskemålet. "ovrigt" =
  -- reserverat för framtida källor.
  source text not null default 'konto' check (source in ('konto', 'chattredigerare', 'ovrigt')),
  -- Sammanhang vi fyller i automatiskt (t.ex. kundens ursprungliga prompt
  -- och Millies förklaring) — staff ser det, men kunden skrev det inte.
  context text,
  message text not null,
  status text not null default 'ny' check (status in ('ny', 'laser', 'klar')),
  created_at timestamptz not null default now()
);

alter table support_messages enable row level security;

create policy "Staff kan läsa meddelanden"
  on support_messages for select using (public.is_staff());

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
