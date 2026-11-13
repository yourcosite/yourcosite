-- Vilken sajt som visas först när kunden klickar på "Bokningar" i menyn.
-- Körs en gång i Supabase (SQL Editor). Säker att köra flera gånger.
alter table profiles add column if not exists default_booking_site uuid references sites (id) on delete set null;
