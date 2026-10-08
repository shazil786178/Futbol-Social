-- Futbol Social — MLS + Friendlies competitions, purge demo seed fixtures
-- Run after 008_production.sql

insert into public.competitions (id, name) values
  ('mls', 'MLS'),
  ('friendlies', 'Friendlies'),
  ('epl', 'Premier League'),
  ('laliga', 'La Liga'),
  ('bundesliga', 'Bundesliga'),
  ('ucl', 'Champions League')
on conflict (id) do update set name = excluded.name;

-- Remove hardcoded demo seed matches (wrong dates / fake live status).
-- Real fixtures come from the sync job (football-data.org + ESPN).
delete from public.highlights
where match_id in (
  'epl-ars-liv', 'epl-mci-che', 'laliga-rm-bar', 'laliga-atm-sev',
  'bund-bay-dor', 'bund-lei-rbl', 'ucl-rma-mci', 'ucl-bay-int'
);

delete from public.matches
where id in (
  'epl-ars-liv', 'epl-mci-che', 'laliga-rm-bar', 'laliga-atm-sev',
  'bund-bay-dor', 'bund-lei-rbl', 'ucl-rma-mci', 'ucl-bay-int'
)
or id ~ '^(epl|laliga|bund|ucl)-[a-z]+-[a-z]+$';
