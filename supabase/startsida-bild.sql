-- Skärmdump av sajten som visas på YourCoSites startsida.
alter table sites add column if not exists showcase_image_url text;
