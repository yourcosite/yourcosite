-- Kunden kan välja att sajten får visas på YourCoSites startsida (reklam).
alter table sites add column if not exists show_on_homepage boolean not null default false;
