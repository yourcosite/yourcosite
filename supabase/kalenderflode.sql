-- Kalenderlänk (iCal) för bokningar. Varje sajt får en hemlig länk som kunden
-- lägger in i Google Kalender, Apple Kalender eller Outlook. Kör i Supabase SQL Editor.
alter table sites add column if not exists calendar_token text;
update sites set calendar_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') where calendar_token is null;
create unique index if not exists sites_calendar_token_key on sites (calendar_token) where calendar_token is not null;
