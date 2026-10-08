-- Futbol Social — match hub
-- Run in Supabase Dashboard → SQL Editor after 001_profiles.sql

create table if not exists public.competitions (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  competition_id text not null references public.competitions (id),
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'live', 'finished')),
  home_score integer,
  away_score integer,
  venue text,
  created_at timestamptz not null default now()
);

create index if not exists matches_competition_kickoff_idx
  on public.matches (competition_id, kickoff_at);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  home_score integer not null check (home_score >= 0 and home_score <= 20),
  away_score integer not null check (away_score >= 0 and away_score <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index if not exists predictions_match_idx on public.predictions (match_id);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  title text not null,
  duration text not null default '0:30',
  thumbnail_label text not null default 'CLIP',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists highlights_match_idx on public.highlights (match_id, sort_order);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_match_created_idx
  on public.chat_messages (match_id, created_at desc);

alter table public.competitions enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.highlights enable row level security;
alter table public.chat_messages enable row level security;

-- Drop every existing policy on these tables (safe to re-run).
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'competitions',
        'matches',
        'highlights',
        'predictions',
        'chat_messages'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      pol.policyname,
      pol.tablename
    );
  end loop;
end $$;

create policy "Competitions are public"
  on public.competitions for select using (true);

create policy "Matches are public"
  on public.matches for select using (true);

create policy "Highlights are public"
  on public.highlights for select using (true);

create policy "Predictions are public"
  on public.predictions for select using (true);

create policy "Users upsert own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "Users update own predictions"
  on public.predictions for update
  using (auth.uid() = user_id);

create policy "Chat is public to read"
  on public.chat_messages for select using (true);

create policy "Users post own chat"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

drop trigger if exists predictions_updated_at on public.predictions;
create trigger predictions_updated_at
  before update on public.predictions
  for each row
  execute function public.set_updated_at();

insert into public.competitions (id, name) values
  ('laliga', 'La Liga'),
  ('epl', 'Premier League'),
  ('ligue1', 'Ligue 1'),
  ('ucl', 'UEFA Champions League')
on conflict (id) do nothing;

insert into public.matches (
  id, competition_id, home_team, away_team, kickoff_at, status, home_score, away_score, venue
) values
  ('epl-ars-liv', 'epl', 'Arsenal', 'Liverpool', '2026-08-22T16:30:00Z', 'upcoming', null, null, 'Emirates Stadium'),
  ('epl-mci-che', 'epl', 'Manchester City', 'Chelsea', '2026-08-23T15:00:00Z', 'upcoming', null, null, 'Etihad Stadium'),
  ('laliga-rm-bar', 'laliga', 'Real Madrid', 'Barcelona', '2026-08-30T19:00:00Z', 'upcoming', null, null, 'Santiago Bernabéu'),
  ('laliga-atm-sev', 'laliga', 'Atlético Madrid', 'Sevilla', '2026-08-16T17:15:00Z', 'finished', 2, 0, 'Cívitas Metropolitano'),
  ('ligue1-psg-om', 'ligue1', 'Paris Saint-Germain', 'Olympique Marseille', '2026-08-24T19:45:00Z', 'upcoming', null, null, 'Parc des Princes'),
  ('ligue1-lyo-mon', 'ligue1', 'Lyon', 'Monaco', '2026-08-17T15:00:00Z', 'finished', 1, 3, 'Groupama Stadium'),
  ('ucl-rma-mci', 'ucl', 'Real Madrid', 'Manchester City', '2026-09-16T19:00:00Z', 'upcoming', null, null, 'Santiago Bernabéu'),
  ('ucl-bay-int', 'ucl', 'Bayern Munich', 'Inter Milan', '2026-09-17T19:00:00Z', 'upcoming', null, null, 'Allianz Arena')
on conflict (id) do nothing;

insert into public.highlights (match_id, title, duration, thumbnail_label, sort_order)
select v.match_id, v.title, v.duration, v.thumbnail_label, v.sort_order
from (values
  ('epl-mci-che', 'Haaland equalizer — piledriver from the edge', '0:42', '1–1', 1),
  ('epl-mci-che', 'Palmer free-kick — Chelsea open the scoring', '0:38', '0–1', 2),
  ('laliga-atm-sev', 'Griezmann opener — classic Atleti counter', '0:51', '1–0', 1),
  ('laliga-atm-sev', 'Second goal — set-piece chaos', '0:33', '2–0', 2),
  ('ligue1-lyo-mon', 'Minamino brace — Monaco take over', '0:47', '1–2', 1),
  ('ucl-bay-int', 'Lautaro header — Inter lead in Munich', '0:29', '0–1', 1),
  ('epl-ars-liv', 'Preview: key battles to watch', '1:12', 'PRE', 1),
  ('laliga-rm-bar', 'El Clásico trailer — history in 60 seconds', '1:00', 'PRE', 1)
) as v(match_id, title, duration, thumbnail_label, sort_order)
where not exists (
  select 1
  from public.highlights h
  where h.match_id = v.match_id
    and h.title = v.title
);
