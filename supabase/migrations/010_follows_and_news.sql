-- Futbol Social — Follow teams/players + football news threads
-- Run after 009_mls_friendlies_real_fixtures.sql

create table if not exists public.followed_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, team_name)
);

create index if not exists followed_teams_user_idx
  on public.followed_teams (user_id);

create table if not exists public.followed_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  player_name text not null,
  team_name text,
  created_at timestamptz not null default now(),
  unique (user_id, player_name)
);

create index if not exists followed_players_user_idx
  on public.followed_players (user_id);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  summary text,
  body text,
  source_name text not null default 'ESPN',
  source_url text,
  image_url text,
  league_hint text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists news_articles_published_idx
  on public.news_articles (published_at desc);

create table if not exists public.news_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.news_articles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.news_comments (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists news_comments_article_idx
  on public.news_comments (article_id, created_at);

alter table public.followed_teams enable row level security;
alter table public.followed_players enable row level security;
alter table public.news_articles enable row level security;
alter table public.news_comments enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'followed_teams', 'followed_players',
        'news_articles', 'news_comments'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

create policy "Users see own followed teams"
  on public.followed_teams for select using (auth.uid() = user_id);

create policy "Users follow teams"
  on public.followed_teams for insert with check (auth.uid() = user_id);

create policy "Users unfollow teams"
  on public.followed_teams for delete using (auth.uid() = user_id);

create policy "Users see own followed players"
  on public.followed_players for select using (auth.uid() = user_id);

create policy "Users follow players"
  on public.followed_players for insert with check (auth.uid() = user_id);

create policy "Users unfollow players"
  on public.followed_players for delete using (auth.uid() = user_id);

create policy "News public read"
  on public.news_articles for select using (true);

create policy "News comments public read"
  on public.news_comments for select using (true);

create policy "Users comment on news"
  on public.news_comments for insert with check (auth.uid() = user_id);

create policy "Users delete own news comments"
  on public.news_comments for delete using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.news_comments;
exception when duplicate_object then null;
end $$;
