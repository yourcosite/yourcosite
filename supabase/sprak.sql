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
