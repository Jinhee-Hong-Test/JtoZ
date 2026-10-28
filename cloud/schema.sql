-- Run the entire file in SQL Editor. Existing documents are preserved.
begin;
create table if not exists public.toz_allowed_users (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.toz_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  mutation_id uuid,
  payload jsonb not null default '{"version":3,"tasks":[],"projects":[],"projectColors":{},"projectDeadlines":{},"vacations":[],"projectCompletions":{}}',
  updated_at timestamptz not null default now(),
  constraint valid_payload check (
    jsonb_typeof(payload) = 'object' and
    payload ?& array['version','tasks','projects','vacations','projectColors','projectDeadlines','projectCompletions'] and
    jsonb_typeof(payload->'tasks') = 'array' and
    jsonb_typeof(payload->'projects') = 'array' and
    jsonb_typeof(payload->'vacations') = 'array' and
    octet_length(payload::text) <= 5000000
  )
);

alter table public.toz_allowed_users enable row level security;
alter table public.toz_documents enable row level security;
revoke all on public.toz_allowed_users, public.toz_documents from public, anon, authenticated;
drop policy if exists own_allowlist on public.toz_allowed_users;
drop policy if exists own_document on public.toz_documents;
drop function if exists public.toz_save(integer,jsonb,uuid);
commit;
-- Add your Auth UUID separately after creating your login account.
-- insert into public.toz_allowed_users(user_id) values ('YOUR-USER-UUID') on conflict do nothing;
