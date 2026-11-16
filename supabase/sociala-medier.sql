-- Sociala medier: förslag på inlägg som du godkänner i adminvyn.
-- Kör i Supabase SQL Editor.
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  inbox_id text unique,
  caption text not null,
  first_comment text,
  image_url text not null,
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published', 'error')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references profiles (id) on delete set null,
  published_at timestamptz
);
create index if not exists social_posts_status_idx on social_posts (status, scheduled_at);
alter table social_posts enable row level security;
drop policy if exists "Staff kan läsa sociala inlägg" on social_posts;
create policy "Staff kan läsa sociala inlägg" on social_posts for select using (public.is_staff());
