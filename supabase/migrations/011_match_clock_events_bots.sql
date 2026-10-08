-- Match clock, events/lineups cache, bot-friendly notes
-- Run in Supabase SQL Editor after 010

alter table public.matches
  add column if not exists minute integer;

alter table public.matches
  add column if not exists period text;

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  external_event_id text not null,
  event_type text not null
    check (event_type in ('goal', 'own_goal', 'penalty', 'penalty_miss', 'yellow', 'red', 'subst')),
  minute integer,
  team_side text check (team_side in ('home', 'away', null)),
  player_name text,
  assist_name text,
  detail text,
  created_at timestamptz not null default now(),
  unique (match_id, external_event_id)
);

create index if not exists match_events_match_minute_idx
  on public.match_events (match_id, minute);

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  formation text,
  player_name text not null,
  shirt_number integer,
  position text,
  is_starter boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists match_lineups_match_side_idx
  on public.match_lineups (match_id, team_side, is_starter);

alter table public.match_events enable row level security;
alter table public.match_lineups enable row level security;

drop policy if exists "Match events public read" on public.match_events;
create policy "Match events public read"
  on public.match_events for select using (true);

drop policy if exists "Match lineups public read" on public.match_lineups;
create policy "Match lineups public read"
  on public.match_lineups for select using (true);
