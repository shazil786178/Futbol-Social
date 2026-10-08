-- Official highlight embeds (ScoreBat) + nullable match link fields
alter table public.highlights
  add column if not exists embed_html text,
  add column if not exists embed_url text,
  add column if not exists thumbnail_url text,
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists competition_label text;

create unique index if not exists highlights_external_id_uidx
  on public.highlights (external_id)
  where external_id is not null;

create index if not exists highlights_source_created_idx
  on public.highlights (source, created_at desc);

-- Allow highlights to exist before a local match row is linked
alter table public.highlights
  alter column match_id drop not null;
