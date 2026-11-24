-- Bokning: påminnelsemejl, avbokningsgräns och intern anteckning.
alter table booking_settings add column if not exists reminder_enabled boolean not null default true;
alter table booking_settings add column if not exists reminder_hours int not null default 24;
alter table booking_settings add column if not exists cancel_min_hours int not null default 0;
alter table bookings add column if not exists reminder_sent_at timestamptz;
alter table bookings add column if not exists owner_note text;
-- Befintliga framtida bokningar ska inte få en påminnelse retroaktivt.
update bookings set reminder_sent_at = now() where reminder_sent_at is null and starts_at < now() + interval '48 hours';
