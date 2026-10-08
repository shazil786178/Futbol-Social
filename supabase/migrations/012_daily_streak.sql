-- Daily streak / missions — run after 011
alter table public.profiles
  add column if not exists streak_count integer not null default 0;

alter table public.profiles
  add column if not exists streak_best integer not null default 0;

alter table public.profiles
  add column if not exists last_active_date date;

alter table public.profiles
  add column if not exists daily_progress jsonb not null default '{}'::jsonb;

comment on column public.profiles.daily_progress is
  'JSON map of YYYY-MM-DD -> { predict, chat, clip, react } booleans';
