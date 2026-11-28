-- ============================================================
-- DMARC-rapporter (visas i /admin/dmarc)
-- Kör en gång i Supabase. Bara servern (service role) skriver, staff läser.
-- ============================================================
create table if not exists dmarc_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_id text not null,
  org_name text not null,
  domain text not null,
  date_begin timestamptz not null,
  date_end timestamptz not null,
  policy text,
  total int not null default 0,
  passed int not null default 0,
  failed int not null default 0,
  rows jsonb not null default '[]'::jsonb,
  unique (org_name, report_id)
);
create index if not exists dmarc_reports_end_idx on dmarc_reports (date_end desc);
alter table dmarc_reports enable row level security;
drop policy if exists "Staff kan läsa DMARC" on dmarc_reports;
create policy "Staff kan läsa DMARC" on dmarc_reports for select using (public.is_staff());
