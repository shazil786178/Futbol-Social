-- Tribunal vote counts via trigger (avoids RLS update issues on tribunals table)

create or replace function public.increment_tribunal_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vote = 'yes' then
    update public.tribunals
    set yes_count = yes_count + 1
    where id = new.tribunal_id;
  else
    update public.tribunals
    set no_count = no_count + 1
    where id = new.tribunal_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tribunal_vote_count on public.tribunal_votes;
create trigger tribunal_vote_count
  after insert on public.tribunal_votes
  for each row
  execute function public.increment_tribunal_vote();
