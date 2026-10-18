create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_key_idx on rate_limit_hits (key, created_at desc);
alter table rate_limit_hits enable row level security;
