-- Sparar följarsiffror från varje veckorapport, så att nästa rapport kan visa
-- hur många följare som tillkommit. Bara servern (service role) kommer åt den.
create table if not exists weekly_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table weekly_report_snapshots enable row level security;
