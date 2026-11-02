-- Versionshistorik för sajtens innehåll: en kopia av det gamla innehållet
-- sparas varje gång något ändras, så en felaktig ändring alltid går att
-- återställa. De 50 senaste per sajt behålls (rensas i koden).
create table if not exists site_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  owner_id uuid not null,
  content jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists site_versions_site_idx on site_versions (site_id, created_at desc);

alter table site_versions enable row level security;

drop policy if exists "Ägaren ser sina versioner" on site_versions;
create policy "Ägaren ser sina versioner"
  on site_versions for select using (owner_id = auth.uid());

drop policy if exists "Ägaren sparar sina versioner" on site_versions;
create policy "Ägaren sparar sina versioner"
  on site_versions for insert with check (owner_id = auth.uid());

drop policy if exists "Ägaren rensar sina versioner" on site_versions;
create policy "Ägaren rensar sina versioner"
  on site_versions for delete using (owner_id = auth.uid());
