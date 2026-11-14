-- Kunden får inte själv sätta bilden som visas på YourCoSites startsida
-- (sites.showcase_image_url). Bara servern (service role) skapar den.
-- Samma skydd som för publicering och domän i andringar-spark.sql.
create or replace function public.protect_site_publishing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ingen inloggad kund (SQL-editor) eller servern med service role: tillåt.
  if auth.uid() is null or auth.role() = 'service_role' or public.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.slug := null;
    new.custom_domain := null;
    new.custom_domain_status := null;
    new.published_at := null;
    new.showcase_image_url := null;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.slug is distinct from old.slug
     or new.custom_domain is distinct from old.custom_domain
     or new.custom_domain_status is distinct from old.custom_domain_status
     or new.published_at is distinct from old.published_at
     or new.showcase_image_url is distinct from old.showcase_image_url then
    raise exception 'Publicering och domän kan inte ändras direkt.' using errcode = '42501';
  end if;
  return new;
end;
$$;
