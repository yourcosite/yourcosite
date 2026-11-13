-- Bokningar: ägaren väljer om e-post och telefon är obligatoriska.
-- Körs en gång i Supabase (SQL Editor). Säker att köra flera gånger.
alter table booking_settings add column if not exists require_email boolean not null default true;
alter table booking_settings add column if not exists require_phone boolean not null default true;
-- E-post får saknas på en bokning när ägaren valt att den inte är obligatorisk.
alter table bookings alter column customer_email drop not null;
