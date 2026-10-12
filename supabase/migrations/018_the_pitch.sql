-- The Pitch — one ball, one street, the whole planet. One touch per person per UTC day.
-- Run in Supabase SQL Editor after 017.

create table if not exists public.pitch_state (
  id text primary key default 'earth',
  ball_x numeric not null default 52.5,
  ball_y numeric not null default 34,
  mint_score integer not null default 0,
  gold_score integer not null default 0,
  move_number integer not null default 0,
  last_touch_at timestamptz,
  last_touch_user uuid references auth.users (id) on delete set null,
  last_goal_at timestamptz,
  last_goal_side text,
  updated_at timestamptz not null default now()
);

insert into public.pitch_state (id)
values ('earth')
on conflict (id) do nothing;

create table if not exists public.pitch_shirts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  side text not null check (side in ('mint', 'gold')),
  created_at timestamptz not null default now()
);

create table if not exists public.pitch_touches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_key text not null,
  side text not null check (side in ('mint', 'gold')),
  angle numeric not null,
  power numeric not null,
  from_x numeric not null,
  from_y numeric not null,
  to_x numeric not null,
  to_y numeric not null,
  result text not null,
  move_number integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, day_key, move_number)
);

create index if not exists pitch_touches_recent_idx
  on public.pitch_touches (created_at desc);
create index if not exists pitch_touches_move_idx
  on public.pitch_touches (move_number desc);

alter table public.pitch_state enable row level security;
alter table public.pitch_shirts enable row level security;
alter table public.pitch_touches enable row level security;

drop policy if exists "Pitch state public read" on public.pitch_state;
create policy "Pitch state public read" on public.pitch_state for select using (true);
drop policy if exists "Pitch state signed update" on public.pitch_state;
create policy "Pitch state signed update" on public.pitch_state for update
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Pitch shirts public read" on public.pitch_shirts;
create policy "Pitch shirts public read" on public.pitch_shirts for select using (true);
drop policy if exists "Pitch shirts own write" on public.pitch_shirts;
create policy "Pitch shirts own write" on public.pitch_shirts for insert
  with check (auth.uid() = user_id);
drop policy if exists "Pitch shirts own update" on public.pitch_shirts;
create policy "Pitch shirts own update" on public.pitch_shirts for update
  using (auth.uid() = user_id);

drop policy if exists "Pitch touches public read" on public.pitch_touches;
create policy "Pitch touches public read" on public.pitch_touches for select using (true);
drop policy if exists "Pitch touches own insert" on public.pitch_touches;
create policy "Pitch touches own insert" on public.pitch_touches for insert
  with check (auth.uid() = user_id);
