-- Reservkoder för tvåstegsverifiering. Sparas bara som hash, och bara servern
-- (service role) kommer åt tabellen.
create table if not exists mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mfa_backup_codes_user_idx on mfa_backup_codes (user_id);
alter table mfa_backup_codes enable row level security;
