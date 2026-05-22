-- 00046_security_hardening.sql
-- Batch 1 — Identity & tenant-isolation hardening.
--
-- Closes the three critical privilege-escalation / cross-tenant vectors found
-- in the security review:
--   C-1  user_roles had RLS DISABLED (00001:1384) and authenticated retains the
--        default table grants -> any logged-in user could self-promote to
--        tenant_admin via the browser anon-key client.
--   C-2  user_facilities (the tenancy anchor) allowed self-service INSERT/UPDATE/
--        DELETE -> a user could grant themselves access to ANY facility's PHI.
--   C-3  the "Users can update own profile" policy + default table grants let a
--        user change their own users.credentials to 'Admin' -> self-grant of the
--        Operations-surface entitlement (proxy.ts treats credentials='Admin' as
--        admin entitlement).
--
-- Also: facility-scope two storage buckets whose SELECT policy only checked
-- authentication, add search_path to the two SECURITY DEFINER signature-audit
-- RPCs missed by 00034/00035, and stop auto-assigning unsolicited signups to
-- an arbitrary tenant (the product is invite-only).
--
-- IMPORTANT — application contract: user_roles and user_facilities have NO write
-- policy for the `authenticated` role on purpose. Their only legitimate writers
-- are (a) admin server actions, which use the service-role client AFTER an
-- app-level admin check (see app/actions/admin.ts), and (b) the SECURITY DEFINER
-- signup triggers. Do not add an authenticated write policy here without
-- re-introducing the self-promotion vector.

begin;

-- ============================================================
-- Helper functions.
-- SECURITY DEFINER + owned by postgres (table owner, not FORCE'd) -> they bypass
-- RLS, so they can read user_roles inside an RLS policy WITHOUT triggering the
-- "infinite recursion detected in policy" error that made the original author
-- disable RLS on user_roles in the first place.
-- ============================================================

create or replace function public.user_belongs_to_tenant(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
  );
$$;

create or replace function public.is_org_admin_for_facility(p_facility_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from user_roles ur
    join facilities f on f.tenant_id = ur.tenant_id
    where ur.user_id = auth.uid()
      and ur.role in ('tenant_admin', 'facility_admin')
      and f.id = p_facility_id
  );
$$;

revoke all on function public.user_belongs_to_tenant(uuid) from public, anon;
revoke all on function public.is_org_admin_for_facility(uuid) from public, anon;
grant execute on function public.user_belongs_to_tenant(uuid) to authenticated;
grant execute on function public.is_org_admin_for_facility(uuid) to authenticated;

-- ============================================================
-- C-1 — user_roles: re-enable RLS.
--   SELECT: own rows, plus co-tenant rows (so the admin policies on public.users
--           that test `ur2.user_id = <other user> AND ur2.tenant_id = ...` keep
--           working). Role membership within your own tenant is not PHI.
--   WRITE : no policy -> blocked for authenticated. (See application contract.)
-- ============================================================

alter table public.user_roles enable row level security;

drop policy if exists "read own or co-tenant roles" on public.user_roles;
create policy "read own or co-tenant roles"
  on public.user_roles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_belongs_to_tenant(tenant_id)
  );

-- ============================================================
-- C-2 — user_facilities: keep self SELECT (unchanged); replace the self-service
-- write policies with admin-gated ones. An org admin may manage associations for
-- any facility in their tenant (this preserves facilities.createFacility, where
-- the creating admin self-associates). The invitee self-insert in acceptInvite
-- now runs via the service-role client instead.
-- ============================================================

drop policy if exists "Users can create their own facility associations" on public.user_facilities;
drop policy if exists "Users can update their own facility associations" on public.user_facilities;
drop policy if exists "Users can delete their own facility associations" on public.user_facilities;

create policy "Org admins can create facility associations"
  on public.user_facilities
  for insert
  to authenticated
  with check (public.is_org_admin_for_facility(facility_id));

create policy "Org admins can update facility associations"
  on public.user_facilities
  for update
  to authenticated
  using (public.is_org_admin_for_facility(facility_id))
  with check (public.is_org_admin_for_facility(facility_id));

create policy "Org admins can delete facility associations"
  on public.user_facilities
  for delete
  to authenticated
  using (public.is_org_admin_for_facility(facility_id));

-- ============================================================
-- C-3 — users: prevent self-escalation of the credentials column.
-- A bare `REVOKE UPDATE (credentials)` is ineffective while the role holds the
-- table-level UPDATE grant, so revoke table-level UPDATE and re-grant only the
-- safe self-editable column(s). credentials is changed exclusively by admin
-- actions via the service-role client.
-- ============================================================

revoke update on public.users from authenticated, anon;
grant update (name) on public.users to authenticated;

-- ============================================================
-- search_path hardening for the SECURITY DEFINER signature-audit RPCs that the
-- 00034 / 00035 sweep missed.
-- ============================================================

alter function public.get_signature_audit_logs(uuid, uuid, uuid, text, timestamptz, timestamptz, integer, integer)
  set search_path = public;
alter function public.get_signature_audit_stats(uuid, uuid, timestamptz, timestamptz)
  set search_path = public;

-- ============================================================
-- Onboarding: the product is invite-only (roles are granted by acceptInvite).
-- The previous trigger auto-assigned EVERY new signup to whichever tenant was
-- created first, which leaks unsolicited signups into a real tenant. Keep the
-- auto-assign convenience ONLY for single-tenant deployments (dev / demo);
-- in multi-tenant deployments, a role must come from an explicit invite.
-- ============================================================

create or replace function public.auto_assign_user_role()
returns trigger as $$
declare
  tenant_count integer;
  default_tenant_id uuid;
  default_facility_id uuid;
begin
  if not exists (select 1 from public.user_roles where user_id = new.id) then
    select count(*) into tenant_count from public.tenants;

    -- Only auto-assign when exactly one tenant exists. Multi-tenant signups
    -- must be invited (acceptInvite assigns the role), never auto-placed.
    if tenant_count = 1 then
      select id into default_tenant_id from public.tenants limit 1;
      select id into default_facility_id
        from public.facilities
        where tenant_id = default_tenant_id
        limit 1;
      if default_facility_id is not null then
        insert into public.user_roles (user_id, tenant_id, role, facility_id)
        values (new.id, default_tenant_id, 'user', default_facility_id)
        on conflict (user_id, tenant_id) do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- Storage: facility-scope the two buckets whose SELECT policy only checked
-- authentication (any authenticated user could read any object by path =
-- cross-tenant PHI read). Mirrors the patient-documents bucket pattern.
-- ============================================================

-- wound-photos: object path is "{woundId}/{file}" -> scope via the wound's facility.
drop policy if exists "Authenticated users can view wound photos" on storage.objects;
create policy "Facility members can view wound photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'wound-photos'
    and (storage.foldername(name))[1] in (
      select w.id::text
      from wounds w
      join patients p on p.id = w.patient_id
      join user_facilities uf on uf.facility_id = p.facility_id
      where uf.user_id = auth.uid()
    )
  );

-- pdf-cache: object path is "{version}/{type}/{visitId}.pdf" -> scope via the
-- visit's facility. (CACHE_VERSION and pdfType contain no slash, so the visit id
-- is always the 3rd path segment.)
drop policy if exists "Authenticated users can read pdf cache" on storage.objects;
create policy "Facility members can read pdf cache"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pdf-cache'
    and replace(split_part(name, '/', 3), '.pdf', '') in (
      select v.id::text
      from visits v
      join patients p on p.id = v.patient_id
      join user_facilities uf on uf.facility_id = p.facility_id
      where uf.user_id = auth.uid()
    )
  );

commit;
