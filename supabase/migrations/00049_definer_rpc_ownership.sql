-- 00049_definer_rpc_ownership.sql
-- Three SECURITY DEFINER RPCs read PHI by id and bypass RLS, so an
-- authenticated user could read another tenant's data by guessing a UUID. Add
-- an explicit facility-ownership guard (auth.uid() must share the row's
-- facility via user_facilities). The functions stay SECURITY DEFINER (needed
-- for the cross-table joins) but now self-enforce tenant isolation.

begin;

-- Skilled-nursing assessment + its wounds. Returns NULL when the caller has no
-- access to the assessment's facility.
create or replace function public.get_skilled_nursing_assessment_with_wounds(
  assessment_id_param uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'assessment', row_to_json(sna.*),
    'wounds', coalesce(
      (select json_agg(row_to_json(snw.*))
         from skilled_nursing_wounds snw
         where snw.assessment_id = assessment_id_param),
      '[]'::json
    )
  ) into result
    from skilled_nursing_assessments sna
    where sna.id = assessment_id_param
      and sna.facility_id in (
        select facility_id from user_facilities where user_id = auth.uid()
      );
  return result;
end;
$$;

-- All assessments for a visit. Returns NULL when the caller has no access to
-- the visit's patient/facility.
create or replace function public.get_visit_all_assessments(visit_id_param uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not exists (
    select 1
      from visits v
      join patients p on p.id = v.patient_id
      where v.id = visit_id_param
        and p.facility_id in (
          select facility_id from user_facilities where user_id = auth.uid()
        )
  ) then
    return null;
  end if;

  select json_build_object(
    'standard', coalesce(
      (select json_agg(row_to_json(a.*)) from assessments a where a.visit_id = visit_id_param),
      '[]'::json),
    'skilled_nursing',
      (select row_to_json(sna.*) from skilled_nursing_assessments sna where sna.visit_id = visit_id_param limit 1),
    'skilled_nursing_wounds', coalesce(
      (select json_agg(row_to_json(snw.*)) from skilled_nursing_wounds snw where snw.visit_id = visit_id_param),
      '[]'::json),
    'grafting', coalesce(
      (select json_agg(row_to_json(ga.*)) from grafting_assessments ga where ga.visit_id = visit_id_param),
      '[]'::json),
    'skin_sweep', coalesce(
      (select json_agg(row_to_json(ssa.*)) from skin_sweep_assessments ssa where ssa.visit_id = visit_id_param),
      '[]'::json)
  ) into result;
  return result;
end;
$$;

-- G-tube procedure count for a patient. Returns 0 when the caller has no access
-- to the patient's facility.
create or replace function public.get_patient_gtube_procedure_count(patient_id_param uuid)
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from patients p
      where p.id = patient_id_param
        and p.facility_id in (
          select facility_id from user_facilities where user_id = auth.uid()
        )
  ) then
    return 0;
  end if;

  return (select count(*)::integer
            from gtube_procedures
            where patient_id = patient_id_param);
end;
$$;

commit;
