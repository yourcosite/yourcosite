-- Stripe: kopplingsfält på kundens profil, och skydd så att kunder inte själva
-- kan ändra roll, betalstatus, tillägg eller Stripe-fält. Kör i Supabase SQL Editor.

alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists billing_status text; -- active, past_due, canceled
create unique index if not exists profiles_stripe_customer_key on profiles (stripe_customer_id) where stripe_customer_id is not null;

-- Tidigare fick en inloggad kund uppdatera ALLA kolumner på sin egen profil
-- (policyn tillåter det), inklusive role. Det här stoppar det.
-- Tillåtet: SQL-editorn, servern (service role), och
--   role: bara superadmin, billing- och tilläggsfält: personal.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin') then
      raise exception 'Rollen kan inte ändras.' using errcode = '42501';
    end if;
  end if;

  if (new.billing_exempt, new.extra_sites, new.extra_languages, new.billing_setup_complete,
      new.stripe_customer_id, new.stripe_subscription_id, new.billing_status)
     is distinct from
     (old.billing_exempt, old.extra_sites, old.extra_languages, old.billing_setup_complete,
      old.stripe_customer_id, old.stripe_subscription_id, old.billing_status) then
    if not public.is_staff() then
      raise exception 'Betalning och tillägg kan inte ändras direkt.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_columns on profiles;
create trigger protect_profile_columns
  before update on profiles
  for each row execute function public.protect_profile_columns();
