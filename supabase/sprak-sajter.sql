-- Fler språk på kundens sajt (Inställningar > Språk i redigeraren).
-- Körs manuellt i Supabase SQL-editorn. Säker att köra flera gånger.
-- Kolumnen håller en översättning per extra språk:
--   { "en": { "memo": { "<hash av originaltext>": "<översatt text>" }, "translatedAt": "..." } }
alter table sites add column if not exists translations jsonb not null default '{}'::jsonb;
