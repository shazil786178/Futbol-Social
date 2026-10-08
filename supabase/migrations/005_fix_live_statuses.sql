-- Fix demo seed rows that were incorrectly marked "live"
-- Run once in Supabase SQL Editor

update public.matches
set
  status = 'upcoming',
  home_score = null,
  away_score = null
where id in ('epl-mci-che', 'ucl-bay-int')
  and kickoff_at > now();

update public.matches
set status = 'finished'
where status = 'live'
  and kickoff_at < now() - interval '105 minutes';

update public.matches
set status = 'upcoming'
where status = 'live'
  and kickoff_at > now();
