-- Futbol Social — Production: media storage, match incidents, oracle season, realtime
-- Safe to re-run. Prefer skipping if 008 already succeeded once.

-- Ensure tribunals exists (normally created by 006)
create table if not exists public.tribunals (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  question text not null,
  incident_type text not null default 'other',
  status text not null default 'open' check (status in ('open', 'closed')),
  yes_count integer not null default 0,
  no_count integer not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Video URLs on skits & highlights
alter table public.skits
  add column if not exists video_url text,
  add column if not exists storage_path text;

alter table public.highlights
  add column if not exists video_url text,
  add column if not exists storage_path text,
  add column if not exists user_id uuid references auth.users (id) on delete set null;

drop policy if exists "Users upload highlights" on public.highlights;
create policy "Users upload highlights"
  on public.highlights for insert
  with check (auth.uid() = user_id);

-- Track processed live incidents (tribunal auto-open)
create table if not exists public.match_incidents (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  external_event_id text not null unique,
  incident_type text not null,
  description text not null,
  tribunal_id uuid references public.tribunals (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists match_incidents_match_idx
  on public.match_incidents (match_id, created_at desc);

alter table public.match_incidents enable row level security;

drop policy if exists "Match incidents public read" on public.match_incidents;
create policy "Match incidents public read"
  on public.match_incidents for select using (true);

-- Oracle season results
create table if not exists public.oracle_season_results (
  id uuid primary key default gen_random_uuid(),
  season_label text not null unique,
  ucl_winner text,
  top_scorer text,
  scored_at timestamptz,
  badges_awarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'skits',
    'skits',
    true,
    52428800,
    array['video/mp4', 'video/webm', 'video/quicktime']
  ),
  (
    'highlights',
    'highlights',
    true,
    104857600,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read skits" on storage.objects;
drop policy if exists "Auth upload skits" on storage.objects;
drop policy if exists "Auth update own skits" on storage.objects;
drop policy if exists "Public read highlights" on storage.objects;
drop policy if exists "Auth upload highlights" on storage.objects;
drop policy if exists "Auth update own highlights" on storage.objects;

create policy "Public read skits"
  on storage.objects for select
  using (bucket_id = 'skits');

create policy "Auth upload skits"
  on storage.objects for insert
  with check (
    bucket_id = 'skits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth update own skits"
  on storage.objects for update
  using (
    bucket_id = 'skits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read highlights"
  on storage.objects for select
  using (bucket_id = 'highlights');

create policy "Auth upload highlights"
  on storage.objects for insert
  with check (
    bucket_id = 'highlights'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth update own highlights"
  on storage.objects for update
  using (
    bucket_id = 'highlights'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
end $$;
