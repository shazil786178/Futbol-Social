-- Futbol Social — Phase 3: Rival, Tribunal, Verdicts, Oracle, Country rooms
-- Run after 004_phase2_iq.sql

alter table public.profiles
  add column if not exists supported_team text;

create table if not exists public.rival_pairs (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  team_a text not null,
  team_b text not null,
  winner_user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (match_id, user_a_id),
  unique (match_id, user_b_id)
);

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

create index if not exists tribunals_match_status_idx
  on public.tribunals (match_id, status);

create table if not exists public.tribunal_votes (
  id uuid primary key default gen_random_uuid(),
  tribunal_id uuid not null references public.tribunals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote text not null check (vote in ('yes', 'no')),
  created_at timestamptz not null default now(),
  unique (tribunal_id, user_id)
);

create table if not exists public.structured_verdicts (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  match_rating integer not null check (match_rating between 1 and 10),
  referee_rating integer not null check (referee_rating between 1 and 10),
  home_team_rating integer not null check (home_team_rating between 1 and 10),
  away_team_rating integer not null check (away_team_rating between 1 and 10),
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create table if not exists public.oracle_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  ucl_winner text not null,
  top_scorer text not null,
  dark_horse text,
  locked_at timestamptz not null default now(),
  accuracy_score integer,
  created_at timestamptz not null default now()
);

create table if not exists public.country_room_posts (
  id uuid primary key default gen_random_uuid(),
  room_slug text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists country_room_posts_slug_idx
  on public.country_room_posts (room_slug, created_at desc);

alter table public.rival_pairs enable row level security;
alter table public.tribunals enable row level security;
alter table public.tribunal_votes enable row level security;
alter table public.structured_verdicts enable row level security;
alter table public.oracle_predictions enable row level security;
alter table public.country_room_posts enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'rival_pairs', 'tribunals', 'tribunal_votes',
        'structured_verdicts', 'oracle_predictions', 'country_room_posts'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

create policy "Rival pairs public read"
  on public.rival_pairs for select using (true);

create policy "Users create rival pair"
  on public.rival_pairs for insert with check (auth.uid() in (user_a_id, user_b_id));

create policy "Tribunals public read"
  on public.tribunals for select using (true);

create policy "Users open tribunals"
  on public.tribunals for insert with check (auth.uid() is not null);

create policy "Tribunal votes public read"
  on public.tribunal_votes for select using (true);

create policy "Users vote once"
  on public.tribunal_votes for insert with check (auth.uid() = user_id);

create policy "Structured verdicts public read"
  on public.structured_verdicts for select using (true);

create policy "Users submit verdict"
  on public.structured_verdicts for insert with check (auth.uid() = user_id);

create policy "Oracle public read"
  on public.oracle_predictions for select using (true);

create policy "Users submit oracle"
  on public.oracle_predictions for insert with check (auth.uid() = user_id);

create policy "Country room posts public read"
  on public.country_room_posts for select using (true);

create policy "Users post in rooms"
  on public.country_room_posts for insert with check (auth.uid() = user_id);
