-- 00047_backfill_facility_tenant.sql
-- facilities.tenant_id is nullable and createFacility historically never set it,
-- so facilities created through the UI could have tenant_id = NULL. Those rows
-- still "worked" because PHI scoping flows through user_facilities, but a NULL
-- tenant breaks tenant-scoped logic — including the is_org_admin_for_facility
-- policy added in 00046. Backfill any NULL rows.
--
-- (createFacility now sets tenant_id explicitly; this repairs historical data.)

begin;

-- 1. Derive tenant from a user already associated with the facility.
update public.facilities f
set tenant_id = sub.tenant_id
from (
  select uf.facility_id, min(ur.tenant_id::text)::uuid as tenant_id
  from public.user_facilities uf
  join public.user_roles ur on ur.user_id = uf.user_id
  group by uf.facility_id
) sub
where f.tenant_id is null
  and f.id = sub.facility_id;

-- 2. Fallback for orphan facilities (no associations) in single-tenant
--    deployments: assign the sole tenant.
update public.facilities f
set tenant_id = (select id from public.tenants limit 1)
where f.tenant_id is null
  and (select count(*) from public.tenants) = 1;

commit;
