-- Futbol Social — onboarding survey answers + Champions League fantasy
-- Run in Supabase SQL Editor after 014

alter table public.profiles
  add column if not exists favorite_player text,
  add column if not exists favorite_league text,
  add column if not exists watch_style text,
  add column if not exists fan_since text,
  add column if not exists onboarded_at timestamptz;

-- Existing accounts already chose a club; don't push them through the survey
update public.profiles
  set onboarded_at = now()
  where onboarded_at is null and supported_team is not null;

create table if not exists public.fantasy_squads (
  user_id uuid primary key references auth.users (id) on delete cascade,
  team_name text not null default 'My XI',
  -- [{ "slug": "kylian-mbappe", "added_at": "2026-10-07T12:00:00Z" }]
  picks jsonb not null default '[]'::jsonb,
  captain text,
  banked_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fantasy_squads enable row level security;

drop policy if exists "Fantasy squads public read" on public.fantasy_squads;
create policy "Fantasy squads public read"
  on public.fantasy_squads for select using (true);

drop policy if exists "Fantasy squads owner insert" on public.fantasy_squads;
create policy "Fantasy squads owner insert"
  on public.fantasy_squads for insert with check (auth.uid() = user_id);

drop policy if exists "Fantasy squads owner update" on public.fantasy_squads;
create policy "Fantasy squads owner update"
  on public.fantasy_squads for update using (auth.uid() = user_id);

drop trigger if exists fantasy_squads_updated_at on public.fantasy_squads;
create trigger fantasy_squads_updated_at
  before update on public.fantasy_squads
  for each row
  execute function public.set_updated_at();
