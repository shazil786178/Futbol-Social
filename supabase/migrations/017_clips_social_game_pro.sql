-- Futbol Social — Clips algorithm (likes/views), friends, Top Bins game, Pro tier
-- Run in Supabase SQL Editor after 016

-- ---------- Clips: richer metadata for ranking ----------
alter table public.highlights
  add column if not exists published_at timestamptz not null default now(),
  add column if not exists category text not null default 'highlights',
  add column if not exists team_tags text[] not null default '{}',
  add column if not exists caption text;

create index if not exists highlights_published_idx
  on public.highlights (published_at desc);
create index if not exists highlights_user_idx
  on public.highlights (user_id, published_at desc);

-- Likes + watch events keyed by clip_key (DB uuid as text, or external id such
-- as "youtube-abc123") so live clips can be liked before they are stored.
create table if not exists public.clip_likes (
  clip_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clip_key, user_id)
);

create table if not exists public.clip_views (
  id uuid primary key default gen_random_uuid(),
  clip_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  watched_ms integer not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists clip_views_key_idx on public.clip_views (clip_key, created_at desc);
create index if not exists clip_views_user_idx on public.clip_views (user_id, created_at desc);

create or replace view public.clip_stats as
  select
    k.clip_key,
    coalesce(l.likes, 0)::integer as likes,
    coalesce(v.views, 0)::integer as views,
    coalesce(v.completes, 0)::integer as completes,
    coalesce(v.watched_ms, 0)::bigint as watched_ms
  from (
    select clip_key from public.clip_likes
    union
    select clip_key from public.clip_views
  ) k
  left join (
    select clip_key, count(*) as likes from public.clip_likes group by clip_key
  ) l on l.clip_key = k.clip_key
  left join (
    select
      clip_key,
      count(*) as views,
      count(*) filter (where completed) as completes,
      sum(watched_ms) as watched_ms
    from public.clip_views
    group by clip_key
  ) v on v.clip_key = k.clip_key;

alter table public.clip_likes enable row level security;
alter table public.clip_views enable row level security;

drop policy if exists "Clip likes public read" on public.clip_likes;
create policy "Clip likes public read" on public.clip_likes for select using (true);
drop policy if exists "Clip likes own insert" on public.clip_likes;
create policy "Clip likes own insert" on public.clip_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Clip likes own delete" on public.clip_likes;
create policy "Clip likes own delete" on public.clip_likes for delete using (auth.uid() = user_id);

drop policy if exists "Clip views public read" on public.clip_views;
create policy "Clip views public read" on public.clip_views for select using (true);
drop policy if exists "Clip views insert" on public.clip_views;
create policy "Clip views insert" on public.clip_views for insert
  with check (user_id is null or auth.uid() = user_id);

-- ---------- Friends (people you follow) ----------
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists user_follows_followee_idx on public.user_follows (followee_id);

alter table public.user_follows enable row level security;
drop policy if exists "User follows public read" on public.user_follows;
create policy "User follows public read" on public.user_follows for select using (true);
drop policy if exists "User follows own insert" on public.user_follows;
create policy "User follows own insert" on public.user_follows for insert with check (auth.uid() = follower_id);
drop policy if exists "User follows own delete" on public.user_follows;
create policy "User follows own delete" on public.user_follows for delete using (auth.uid() = follower_id);

-- ---------- Games (Top Bins daily free kick) ----------
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  day_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null default 0,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game, day_key, user_id)
);

create index if not exists game_scores_board_idx on public.game_scores (game, day_key, score desc);

alter table public.game_scores enable row level security;
drop policy if exists "Game scores public read" on public.game_scores;
create policy "Game scores public read" on public.game_scores for select using (true);
drop policy if exists "Game scores own insert" on public.game_scores;
create policy "Game scores own insert" on public.game_scores for insert with check (auth.uid() = user_id);
drop policy if exists "Game scores own update" on public.game_scores;
create policy "Game scores own update" on public.game_scores for update using (auth.uid() = user_id);

drop trigger if exists game_scores_updated_at on public.game_scores;
create trigger game_scores_updated_at
  before update on public.game_scores
  for each row execute function public.set_updated_at();

-- ---------- Pro tier ----------
alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists pro_since timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists pundit_uses integer not null default 0,
  add column if not exists pundit_uses_date date;

create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);
