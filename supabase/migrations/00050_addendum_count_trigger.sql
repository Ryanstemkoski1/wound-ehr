-- 00050_addendum_count_trigger.sql
-- visits.addendum_count was maintained by app code with a non-atomic
-- read-modify-write (createAddendum), so concurrent addenda could lose
-- increments and the count could drift. Maintain it with a DB trigger instead:
-- always correct, atomic, and robust to any insert/delete path. The app code
-- no longer touches the counter.

begin;

create or replace function public.sync_visit_addendum_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.note_type = 'addendum' then
    update visits
       set addendum_count = coalesce(addendum_count, 0) + 1
     where id = new.visit_id;
  elsif tg_op = 'DELETE' and old.note_type = 'addendum' then
    update visits
       set addendum_count = greatest(coalesce(addendum_count, 0) - 1, 0)
     where id = old.visit_id;
  elsif tg_op = 'UPDATE' then
    -- Handle a note_type flip or a visit reassignment (rare, but keep correct).
    if old.note_type = 'addendum' and old.visit_id is not null then
      update visits
         set addendum_count = greatest(coalesce(addendum_count, 0) - 1, 0)
       where id = old.visit_id;
    end if;
    if new.note_type = 'addendum' and new.visit_id is not null then
      update visits
         set addendum_count = coalesce(addendum_count, 0) + 1
       where id = new.visit_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_visit_addendum_count on public.wound_notes;
create trigger trg_sync_visit_addendum_count
  after insert or update or delete on public.wound_notes
  for each row execute function public.sync_visit_addendum_count();

-- One-time backfill so existing counts match reality.
update public.visits v
set addendum_count = sub.cnt
from (
  select visit_id, count(*) as cnt
  from public.wound_notes
  where note_type = 'addendum' and visit_id is not null
  group by visit_id
) sub
where v.id = sub.visit_id
  and coalesce(v.addendum_count, 0) <> sub.cnt;

-- Visits with no addendums should read 0, not stale/NULL.
update public.visits v
set addendum_count = 0
where coalesce(v.addendum_count, 0) <> 0
  and not exists (
    select 1 from public.wound_notes wn
    where wn.visit_id = v.id and wn.note_type = 'addendum'
  );

commit;
