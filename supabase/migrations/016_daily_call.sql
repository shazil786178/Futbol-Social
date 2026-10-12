-- The Call — one global football verdict per day. Run after 015.

create table if not exists public.daily_calls (
  id uuid primary key default gen_random_uuid(),
  day_key date not null unique,
  question text not null,
  option_a text not null,
  option_b text not null,
  match_id text references public.matches (id) on delete set null,
  clip_embed_url text,
  clip_title text,
  closes_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_call_votes (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.daily_calls (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  choice text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now(),
  unique (call_id, user_id)
);

create index if not exists daily_call_votes_call_idx
  on public.daily_call_votes (call_id, choice);

alter table public.daily_calls enable row level security;
alter table public.daily_call_votes enable row level security;

drop policy if exists "Calls public read" on public.daily_calls;
create policy "Calls public read"
  on public.daily_calls for select using (true);

drop policy if exists "Call votes public read" on public.daily_call_votes;
create policy "Call votes public read"
  on public.daily_call_votes for select using (true);

drop policy if exists "Call votes own insert" on public.daily_call_votes;
create policy "Call votes own insert"
  on public.daily_call_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Call votes own update" on public.daily_call_votes;
create policy "Call votes own update"
  on public.daily_call_votes for update
  using (auth.uid() = user_id);
