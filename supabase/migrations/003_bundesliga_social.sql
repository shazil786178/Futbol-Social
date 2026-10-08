-- Futbol Social — Bundesliga focus, posts, skits (run after 002_match_hub.sql)

insert into public.competitions (id, name) values
  ('bundesliga', 'Bundesliga')
on conflict (id) do nothing;

delete from public.highlights where match_id like 'ligue1%';
delete from public.matches where competition_id = 'ligue1';
delete from public.competitions where id = 'ligue1';

insert into public.matches (
  id, competition_id, home_team, away_team, kickoff_at, status, home_score, away_score, venue
) values
  ('bund-bay-dor', 'bundesliga', 'Bayern Munich', 'Borussia Dortmund', '2026-08-24T16:30:00Z', 'upcoming', null, null, 'Allianz Arena'),
  ('bund-lei-rbl', 'bundesliga', 'RB Leipzig', 'Bayer Leverkusen', '2026-08-17T13:30:00Z', 'finished', 2, 2, 'Red Bull Arena')
on conflict (id) do nothing;

insert into public.highlights (match_id, title, duration, thumbnail_label, sort_order)
select 'bund-lei-rbl', 'Last-minute equalizer — chaos in the box', '0:44', '2–2', 1
where not exists (
  select 1 from public.highlights
  where match_id = 'bund-lei-rbl' and title = 'Last-minute equalizer — chaos in the box'
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('reaction', 'opinion', 'verdict')),
  content text not null check (char_length(content) >= 1 and char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists posts_match_created_idx
  on public.posts (match_id, created_at desc);

create table if not exists public.skits (
  id uuid primary key default gen_random_uuid(),
  match_id text references public.matches (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  duration text not null default '0:45',
  tag text not null default 'fan',
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.skits enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('posts', 'skits')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      pol.policyname,
      pol.tablename
    );
  end loop;
end $$;

create policy "Posts are public"
  on public.posts for select using (true);

create policy "Users post own content"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Skits are public"
  on public.skits for select using (true);

create policy "Users upload own skits"
  on public.skits for insert
  with check (auth.uid() = user_id);
