-- 00048_audio_retention_cron.sql
-- Automate the 90-day audio-retention deletion promised in the patient AI
-- consent text. The existing delete_expired_audio() (00035) checks auth.uid()
-- for a tenant_admin, so it can only run from an admin request — it CANNOT run
-- from a scheduler (no auth context). This adds a scheduler-safe variant and a
-- pg_cron job. The manual admin RPC stays for on-demand purges.

begin;

-- Scheduler-safe deletion. SECURITY DEFINER, no auth.uid() check, and NOT
-- callable by app clients (revoked from anon/authenticated) — only the cron
-- job (running as the table owner) invokes it.
create or replace function public.delete_expired_audio_cron(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select vt.id, vt.audio_url
      from visit_transcripts vt
      where vt.audio_url is not null
        and vt.created_at < now() - (retention_days || ' days')::interval
  loop
    -- Remove the storage object (best-effort; ignore if already gone).
    begin
      delete from storage.objects
        where bucket_id = 'visit-audio'
          and name = v_row.audio_url;
    exception when others then
      null;
    end;

    update visit_transcripts
       set audio_url = null,
           processing_status = case
             when processing_status = 'completed' then 'deleted'
             else processing_status
           end,
           updated_at = now()
     where id = v_row.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.delete_expired_audio_cron(integer)
  from public, anon, authenticated;

comment on function public.delete_expired_audio_cron(integer) is
  'Scheduler-only retention enforcement (no auth gate; not client-callable). Deletes visit-audio objects older than retention_days and clears audio_url. Transcript text is preserved.';

-- Schedule a daily run at 03:00 UTC if pg_cron is available. If it is not
-- enabled in this project, the migration still succeeds and prints how to
-- finish wiring it.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Drop any prior schedule of the same name first (unschedule raises if the
    -- job is absent, so guard it), then create.
    begin
      perform cron.unschedule('woundnote-delete-expired-audio');
    exception when others then
      null;
    end;

    perform cron.schedule(
      'woundnote-delete-expired-audio',
      '0 3 * * *',
      $cron$ select public.delete_expired_audio_cron(90); $cron$
    );
  else
    raise notice 'pg_cron is not installed. Enable it (Dashboard > Database > Extensions), then schedule public.delete_expired_audio_cron(90) to run daily.';
  end if;
end
$do$;

commit;
