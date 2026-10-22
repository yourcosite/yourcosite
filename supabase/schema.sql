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
  -- När kunden bockade i att AI-skapat innehåll (inkl. exempelcitat/siffror)
  -- är deras ansvar att granska — obligatorisk ruta när kontot skapas
  -- (app/skapa-konto), sätts av handle_new_user nedan.
  -- För befintlig databas: alter table profiles add column if not exists content_terms_accepted_at timestamptz;
  content_terms_accepted_at timestamptz,
  role text not null default 'customer'
    check (role in ('customer', 'support', 'admin', 'superadmin')),
  -- Gränssnittsspråk + e-postnotisinställningar, se /installningar
  -- (app/installningar/NotificationsTab.tsx). Bara "sv" används faktiskt
  -- någonstans ännu (själva produkttexterna är inte översatta till
  -- engelska) — "en" går att välja och sparas, men ändrar inget synligt än.
  language text not null default 'sv' check (language in ('sv', 'en')),
  notify_changes_published boolean not null default true,
  notify_billing boolean not null default true,
  notify_tips boolean not null default false,
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
  -- Chatthistoriken med Millie (senaste 40 meddelandena), app/api/sites/chat.
  -- För befintlig databas: alter table sites add column if not exists chat_history jsonb;
  chat_history jsonb,
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
-- SITE_FORM_SUBMISSIONS
-- Inskick från en "contactForm"-sektion (lib/contentModel.ts) på kundens
-- sajt — ett RIKTIGT ifyllbart kontaktformulär, till skillnad från
-- "contact"-sektionen som bara visar kontaktuppgifter. Skrivs av en
-- publik rutt (/api/public/form-submit) med service role, exakt samma
-- mönster som site_pageviews ovan — besökare på en kundsajt är aldrig
-- inloggade hos oss. Visas för kunden på /statistik.
-- ============================================================
create table if not exists site_form_submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  page_path text not null,
  section_id text not null,
  name text,
  email text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_form_submissions_site_id_idx
  on site_form_submissions (site_id, created_at desc);

alter table site_form_submissions enable row level security;

create policy "Ägare kan läsa sina formulärsvar"
  on site_form_submissions for select using (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );
create policy "Staff kan läsa alla formulärsvar"
  on site_form_submissions for select using (public.is_staff());

-- ============================================================
-- SITE_NEWS_ARTICLES
-- Kundens egna nyhetsartiklar, skrivna och publicerade på /nyheter i
-- panelen (app/nyheter/page.tsx) — INTE av Millie i chattredigeraren.
-- Visas på kundens sajt via sektionstypen "newsList"
-- (lib/contentModel.ts) som ett rutnät av bara de PUBLICERADE
-- artiklarna; klick på en öppnar en egen läsvy (se
-- components/SitePreview.tsx) med hela texten och bilden.
-- "published = false" = utkast, syns bara för ägaren själv.
-- ============================================================
create table if not exists site_news_articles (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  title text not null,
  slug text not null,
  excerpt text,
  body text not null,
  image_url text,
  -- Fri text, men appen erbjuder bara "Nyheter"/"Erbjudanden"/"Evenemang"
  -- (se NEWS_CATEGORIES i lib/newsArticles.ts) — ingen databas-begränsning
  -- så listan kan utökas senare utan migrering.
  category text not null default 'Nyheter',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);

create index if not exists site_news_articles_site_id_idx
  on site_news_articles (site_id, created_at desc);

alter table site_news_articles enable row level security;

create policy "Ägare kan läsa sina nyheter"
  on site_news_articles for select using (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );
create policy "Ägare kan skapa nyheter"
  on site_news_articles for insert with check (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );
create policy "Ägare kan uppdatera sina nyheter"
  on site_news_articles for update using (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );
create policy "Ägare kan ta bort sina nyheter"
  on site_news_articles for delete using (
    exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid())
  );
create policy "Staff kan läsa alla nyheter"
  on site_news_articles for select using (public.is_staff());
-- Besökare på kundens sajt är aldrig inloggade hos oss (samma princip som
-- site_pageviews/site_form_submissions) men ska kunna LÄSA publicerade
-- artiklar — bara publicerade, utkast förblir bara synliga för ägaren.
create policy "Alla kan läsa publicerade nyheter"
  on site_news_articles for select using (published = true);

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
    address_street, address_postal_code, address_city, billing_email,
    content_terms_accepted_at
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
    new.raw_user_meta_data->>'billing_email',
    nullif(new.raw_user_meta_data->>'content_terms_accepted_at', '')::timestamptz
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


-- ============================================================
-- Delningslänkar till förhandsvisningen (kan stängas av)
-- ============================================================
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
alter table share_links enable row level security;
drop policy if exists "Ägare kan läsa sina delningslänkar" on share_links;
create policy "Ägare kan läsa sina delningslänkar"
  on share_links for select using (auth.uid() = owner_id);
drop policy if exists "Ägare kan skapa delningslänkar" on share_links;
create policy "Ägare kan skapa delningslänkar"
  on share_links for insert with check (auth.uid() = owner_id);
drop policy if exists "Ägare kan stänga av delningslänkar" on share_links;
create policy "Ägare kan stänga av delningslänkar"
  on share_links for update using (auth.uid() = owner_id);


-- ============================================================
-- BOKNING (egen kalender i systemet, ingen koppling till Google)
-- Ägaren sköter allt på /bokningar i panelen. Besökare på kundsajten
-- bokar via publika rutter (/api/public/booking/*) som använder service
-- role, samma mönster som site_form_submissions.
-- Tider lagras som timestamptz (UTC). Veckoschemat räknas om i sajtens
-- tidszon (booking_settings.timezone).
-- ============================================================
create extension if not exists btree_gist;

create table if not exists booking_settings (
  site_id uuid primary key references sites (id) on delete cascade,
  notify_email text,
  min_notice_hours int not null default 12,
  max_days_ahead int not null default 60,
  timezone text not null default 'Europe/Stockholm',
  created_at timestamptz not null default now()
);

create table if not exists booking_packages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  name text not null,
  description text,
  duration_min int not null check (duration_min between 5 and 1440),
  price_sek int check (price_sek is null or price_sek >= 0),
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists booking_packages_site_idx on booking_packages (site_id, sort_order);

-- Veckoschema: återkommande öppettider. package_id null = gäller alla paket.
create table if not exists booking_rules (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  package_id uuid references booking_packages (id) on delete cascade,
  weekday int not null check (weekday between 1 and 7), -- 1 = måndag ... 7 = söndag
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists booking_rules_site_idx on booking_rules (site_id);

-- Enskilda extra tider (utöver veckoschemat). package_id null = alla paket.
create table if not exists booking_slots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  package_id uuid references booking_packages (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists booking_slots_site_idx on booking_slots (site_id, starts_at);

-- Stängda tider (semester, sjukdag ...). Ingen kan boka här.
create table if not exists booking_blocks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists booking_blocks_site_idx on booking_blocks (site_id, starts_at);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  package_id uuid references booking_packages (id) on delete set null,
  package_name text not null,
  duration_min int not null,
  price_sek int,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  message text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancel_token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Skydd mot dubbelbokning: en kalender per sajt, två bekräftade bokningar
  -- får aldrig överlappa.
  constraint bookings_no_overlap exclude using gist (
    site_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed')
);
create index if not exists bookings_site_idx on bookings (site_id, starts_at);
create unique index if not exists bookings_cancel_token_idx on bookings (cancel_token);

-- RLS: ägaren hanterar allt för sina egna sajter. Publika flödet går via
-- service role och behöver inga policyer.
alter table booking_settings enable row level security;
alter table booking_packages enable row level security;
alter table booking_rules enable row level security;
alter table booking_slots enable row level security;
alter table booking_blocks enable row level security;
alter table bookings enable row level security;

drop policy if exists "Ägare hanterar bokningsinställningar" on booking_settings;
create policy "Ägare hanterar bokningsinställningar" on booking_settings for all
  using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));

drop policy if exists "Ägare hanterar bokningspaket" on booking_packages;
create policy "Ägare hanterar bokningspaket" on booking_packages for all
  using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));

drop policy if exists "Ägare hanterar bokningsregler" on booking_rules;
create policy "Ägare hanterar bokningsregler" on booking_rules for all
  using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));

drop policy if exists "Ägare hanterar extra tider" on booking_slots;
create policy "Ägare hanterar extra tider" on booking_slots for all
  using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));

drop policy if exists "Ägare hanterar stängda tider" on booking_blocks;
create policy "Ägare hanterar stängda tider" on booking_blocks for all
  using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));

drop policy if exists "Ägare läser och ändrar bokningar" on bookings;
create policy "Ägare läser och ändrar bokningar" on bookings for all
  using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));

drop policy if exists "Staff kan läsa bokningar" on bookings;
create policy "Staff kan läsa bokningar" on bookings for select using (public.is_staff());


-- Valfri bild per bokningspaket (körs en gång på sajter som redan har bokningstabellerna).
alter table booking_packages add column if not exists image_url text;

-- Egna mejltexter för bokningsbekräftelse och avbokning (körs en gång).
alter table booking_settings add column if not exists confirm_subject text;
alter table booking_settings add column if not exists confirm_intro text;
alter table booking_settings add column if not exists confirm_extra text;
alter table booking_settings add column if not exists cancel_intro text;


-- Spärr mot missbruk (rate limiting). Körs en gång. Ingen policy behövs:
-- bara servern (service role) når tabellen.
create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_key_idx on rate_limit_hits (key, created_at desc);
alter table rate_limit_hits enable row level security;

-- ============================================================
-- Flera språk, länder och valutor + supportens översättning/historik.
-- Kör hela filen EN gång i Supabase (SQL Editor). Den går att köra om
-- utan att något går sönder.
-- ============================================================

-- 1. Kundens språk och land (profilen) -------------------------------------
alter table profiles drop constraint if exists profiles_language_check;
alter table profiles
  add constraint profiles_language_check
  check (language in ('sv', 'en', 'da', 'fi', 'de', 'fr', 'es'));

-- Landet styr vilken valuta vi fakturerar i (SEK i Sverige, EUR i övriga)
-- och vilka företagsuppgifter vi frågar efter.
alter table profiles add column if not exists country text not null default 'SE'
  check (country in ('SE', 'DK', 'FI', 'DE', 'FR', 'ES', 'OTHER'));

-- Företagsuppgifter som varierar per land (org.nr finns redan i org_number).
alter table profiles add column if not exists vat_number text;
alter table profiles add column if not exists legal_form text;
alter table profiles add column if not exists company_register text;
alter table profiles add column if not exists company_capital text;
alter table profiles add column if not exists company_representative text;

-- 2. Sajtens språk och valuta ----------------------------------------------
-- Språket kundens besökare ser (cookiebanner, bokning, formulär, bokningsmejl).
alter table sites add column if not exists language text not null default 'sv'
  check (language in ('sv', 'en', 'da', 'fi', 'de', 'fr', 'es'));
-- Valutan för kundens egna priser (bokningspaket m.m.).
alter table sites add column if not exists currency text not null default 'SEK'
  check (currency in ('SEK', 'EUR', 'DKK'));

-- 3. Nya konton: ta med land, språk och företagsuppgifter -------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  lang text := coalesce(nullif(new.raw_user_meta_data->>'language', ''), 'sv');
  ctry text := coalesce(nullif(new.raw_user_meta_data->>'country', ''), 'SE');
begin
  if lang not in ('sv', 'en', 'da', 'fi', 'de', 'fr', 'es') then lang := 'sv'; end if;
  if ctry not in ('SE', 'DK', 'FI', 'DE', 'FR', 'ES', 'OTHER') then ctry := 'SE'; end if;
  insert into public.profiles (
    id, email, full_name, phone, company_name, org_number,
    address_street, address_postal_code, address_city, billing_email,
    content_terms_accepted_at, language, country,
    vat_number, legal_form, company_register, company_capital, company_representative
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
    new.raw_user_meta_data->>'billing_email',
    nullif(new.raw_user_meta_data->>'content_terms_accepted_at', '')::timestamptz,
    lang, ctry,
    nullif(new.raw_user_meta_data->>'vat_number', ''),
    nullif(new.raw_user_meta_data->>'legal_form', ''),
    nullif(new.raw_user_meta_data->>'company_register', ''),
    nullif(new.raw_user_meta_data->>'company_capital', ''),
    nullif(new.raw_user_meta_data->>'company_representative', '')
  );
  return new;
end;
$$;

-- 4. Support: språk, översättning och svar ----------------------------------
-- language    = språket kunden skrev på
-- message_sv  = svensk översättning som personalen läser (null om kunden skrev svenska)
alter table support_messages add column if not exists language text not null default 'sv';
alter table support_messages add column if not exists message_sv text;

-- Personalens svar. body_sv = vad personalen skrev (svenska),
-- body_sent = det kunden fick (översatt till kundens språk, eller samma text).
create table if not exists support_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references support_messages (id) on delete cascade,
  -- Kunden svaret gäller: gör historiken per kund enkel att hämta.
  user_id uuid not null references profiles (id) on delete cascade,
  staff_id uuid references profiles (id) on delete set null,
  language text not null default 'sv',
  body_sv text not null,
  body_sent text not null,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_replies_user_idx on support_replies (user_id, created_at);
create index if not exists support_replies_message_idx on support_replies (message_id, created_at);

alter table support_replies enable row level security;

drop policy if exists "Staff kan läsa svar" on support_replies;
create policy "Staff kan läsa svar"
  on support_replies for select using (public.is_staff());

-- Kunden får läsa sina egna meddelanden och svar (historiken i kundzonen).
drop policy if exists "Kunden kan läsa egna svar" on support_replies;
create policy "Kunden kan läsa egna svar"
  on support_replies for select using (user_id = auth.uid());

drop policy if exists "Kunden kan läsa egna meddelanden" on support_messages;
create policy "Kunden kan läsa egna meddelanden"
  on support_messages for select using (user_id = auth.uid());


-- Tid till nästa bokning (paus efter varje tid) och manuella bokningar (körs en gång).
alter table booking_packages add column if not exists buffer_min int not null default 0 check (buffer_min between 0 and 240);
alter table bookings add column if not exists buffer_min int not null default 0;


-- Schemalagd publicering och automatisk avpublicering av nyheter (körs en gång).
alter table site_news_articles add column if not exists scheduled_at timestamptz;
alter table site_news_articles add column if not exists unpublish_at timestamptz;

-- Egna bokningsvillkor (t.ex. avbokningsvillkor). Ägaren skriver texten och
-- kryssar i att hen ansvarar för den (terms_ack_at). Besökaren godkänner
-- villkoren vid bokning; den godkända texten sparas på bokningen. Körs en gång.
alter table booking_settings add column if not exists terms_text text;
alter table booking_settings add column if not exists terms_ack_at timestamptz;
alter table bookings add column if not exists terms_accepted_at timestamptz;
alter table bookings add column if not exists terms_snapshot text;

-- Verklig AI-förbrukning per anrop (generate, edit, news, terms, translate),
-- så admin kan se vad varje kund kostar. Bara servern skriver (service role);
-- personal får läsa. Körs en gång.
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  site_id uuid references sites (id) on delete set null,
  kind text not null,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0
);
create index if not exists ai_usage_created_idx on ai_usage (created_at desc);
create index if not exists ai_usage_user_idx on ai_usage (user_id, created_at desc);
alter table ai_usage enable row level security;
drop policy if exists "Staff kan läsa AI-förbrukning" on ai_usage;
create policy "Staff kan läsa AI-förbrukning" on ai_usage for select using (public.is_staff());

-- ============================================================
-- Felövervakning: fel från servern och webbläsaren (sidan /admin/fel).
-- Kör en gång. Bara servern (service role) skriver, staff läser.
-- ============================================================
create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client')),
  fingerprint text not null,
  message text not null,
  stack text,
  url text,
  user_id uuid,
  user_agent text,
  context text,
  alerted boolean not null default false
);
create index if not exists error_log_created_idx on error_log (created_at desc);
create index if not exists error_log_fp_idx on error_log (fingerprint, created_at desc);
alter table error_log enable row level security;
drop policy if exists "Staff kan läsa fel" on error_log;
create policy "Staff kan läsa fel" on error_log for select using (public.is_staff());
