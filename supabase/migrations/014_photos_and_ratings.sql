-- Fan photo gallery (Instagram-style) + player/team ratings
-- Safe to re-run.

create table if not exists public.photo_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  caption text not null default '',
  image_url text not null,
  storage_path text,
  match_id text references public.matches (id) on delete set null,
  player_key text,
  player_label text,
  team_key text,
  team_label text,
  created_at timestamptz not null default now()
);

create index if not exists photo_posts_created_idx
  on public.photo_posts (created_at desc);

create index if not exists photo_posts_player_idx
  on public.photo_posts (player_key)
  where player_key is not null;

create index if not exists photo_posts_team_idx
  on public.photo_posts (team_key)
  where team_key is not null;

alter table public.photo_posts enable row level security;

drop policy if exists "Photo posts public read" on public.photo_posts;
create policy "Photo posts public read"
  on public.photo_posts for select using (true);

drop policy if exists "Users insert own photo posts" on public.photo_posts;
create policy "Users insert own photo posts"
  on public.photo_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own photo posts" on public.photo_posts;
create policy "Users delete own photo posts"
  on public.photo_posts for delete
  using (auth.uid() = user_id);

-- Fan ratings for players & teams (1–10)
create table if not exists public.entity_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('player', 'team')),
  entity_key text not null,
  entity_label text not null,
  rating integer not null check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_key)
);

create index if not exists entity_ratings_lookup_idx
  on public.entity_ratings (entity_type, entity_key);

alter table public.entity_ratings enable row level security;

drop policy if exists "Entity ratings public read" on public.entity_ratings;
create policy "Entity ratings public read"
  on public.entity_ratings for select using (true);

drop policy if exists "Users upsert own entity ratings" on public.entity_ratings;
create policy "Users upsert own entity ratings"
  on public.entity_ratings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own entity ratings" on public.entity_ratings;
create policy "Users update own entity ratings"
  on public.entity_ratings for update
  using (auth.uid() = user_id);

-- Storage bucket for high-res fan photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read photos" on storage.objects;
create policy "Public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "Auth upload photos" on storage.objects;
create policy "Auth upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Auth update own photos" on storage.objects;
create policy "Auth update own photos"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Auth delete own photos" on storage.objects;
create policy "Auth delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
