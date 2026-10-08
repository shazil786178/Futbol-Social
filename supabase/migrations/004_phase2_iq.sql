-- Futbol Social — Phase 2: live data + Futbol IQ
-- Run after 003_bundesliga_social.sql

alter table public.matches
  add column if not exists external_id text,
  add column if not exists iq_processed boolean not null default false,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists matches_external_id_idx
  on public.matches (external_id)
  where external_id is not null;

create table if not exists public.football_iq_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id text not null references public.matches (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists football_iq_events_user_idx
  on public.football_iq_events (user_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.football_iq_events enable row level security;
alter table public.notifications enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('football_iq_events', 'notifications')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      pol.policyname,
      pol.tablename
    );
  end loop;
end $$;

create policy "IQ events viewable by owner"
  on public.football_iq_events for select
  using (auth.uid() = user_id);

create policy "Notifications viewable by owner"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users mark own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id);
