-- =====================================================================
-- 00059_admin_only_mutations.sql
--
-- Tighten RLS to enforce the four-rule client permission requirement:
--
--   1. Only admins may CREATE patients.
--   2. Only admins may DELETE patients.
--   3. Only admins may EDIT billing (insert / update / delete billings rows).
--   4. Non-admin clinicians retain READ access and may make narrow
--      patient-record edits (e.g. status / is_active), gated client-side
--      via the application's field-permission layer and the
--      createPatient / deletePatient guards in app code.
--
-- "Admin" means any of:
--   * user_roles.role IN ('tenant_admin', 'facility_admin')
--   * public.users.credentials = 'Admin'
--
-- All statements are idempotent (DROP ... IF EXISTS, CREATE OR REPLACE).
-- This migration is additive: it does not alter table schema, only RLS
-- policies and one SECURITY DEFINER helper.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Admin entitlement helper
-- ---------------------------------------------------------------------
-- SECURITY DEFINER + locked search_path so the function can read
-- user_roles / users while RLS prevents callers from reading them
-- directly. STABLE because results don't change within a single
-- statement for a given user_id.
CREATE OR REPLACE FUNCTION public.user_has_admin_entitlement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('tenant_admin', 'facility_admin')
  ) OR EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
      AND credentials = 'Admin'
  );
$$;

COMMENT ON FUNCTION public.user_has_admin_entitlement(UUID) IS
  'Returns TRUE when the user is a tenant_admin / facility_admin OR has the Admin clinical credential. Used by RLS policies to gate mutating operations on patients and billings.';

-- ---------------------------------------------------------------------
-- 2. Patients: admin-only INSERT
-- ---------------------------------------------------------------------
-- Replace the original facility-scoped INSERT policy with one that
-- additionally requires admin entitlement.
DROP POLICY IF EXISTS "Users can insert patients in their facilities" ON patients;
DROP POLICY IF EXISTS "Admins can insert patients" ON patients;

CREATE POLICY "Admins can insert patients"
  ON patients FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
    AND public.user_has_admin_entitlement(auth.uid())
  );

-- ---------------------------------------------------------------------
-- 3. Patients: admin-only DELETE
-- ---------------------------------------------------------------------
-- Replace the original facility-scoped DELETE policy with one that
-- additionally requires admin entitlement.
DROP POLICY IF EXISTS "Users can delete patients in their facilities" ON patients;
DROP POLICY IF EXISTS "Admins can delete patients" ON patients;

CREATE POLICY "Admins can delete patients"
  ON patients FOR DELETE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
    AND public.user_has_admin_entitlement(auth.uid())
  );

-- ---------------------------------------------------------------------
-- 4. Patients: UPDATE policy (facility-scoped, NOT admin-only)
-- ---------------------------------------------------------------------
-- TRADE-OFF: PostgreSQL RLS does not support per-column gates on UPDATE.
-- The client requirement is that non-admin clinicians may update only
-- narrow fields (e.g. status, is_active) and not full demographics or
-- billing-relevant fields. We keep the UPDATE policy facility-scoped
-- so authenticated facility members can hit the table, and we enforce
-- the per-field rules in the application layer:
--   * Server actions / route handlers check user_has_admin_entitlement
--     before writing protected columns.
--   * The shared field-permission module (see lib/permissions/*) gates
--     the UI and the mutation payload.
-- This policy is recreated here (rather than left untouched) so the
-- intent is captured in one place and the policy is idempotent across
-- environments.
DROP POLICY IF EXISTS "Users can update patients in their facilities" ON patients;

CREATE POLICY "Users can update patients in their facilities"
  ON patients FOR UPDATE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 5. Billings: split SELECT from write policies, admin-only writes
-- ---------------------------------------------------------------------
-- Drop both the singular ("billing") and plural ("billings") variants
-- of the legacy policies so this migration is idempotent regardless of
-- which name the environment currently has.
DROP POLICY IF EXISTS "Users can view billing for their visits" ON billings;
DROP POLICY IF EXISTS "Users can manage billing for their visits" ON billings;
DROP POLICY IF EXISTS "Users can view billings for visits they have access to" ON billings;
DROP POLICY IF EXISTS "Users can manage billings for visits they have access to" ON billings;
DROP POLICY IF EXISTS "Facility members can view billings" ON billings;
DROP POLICY IF EXISTS "Admins can write billings (insert)" ON billings;
DROP POLICY IF EXISTS "Admins can update billings" ON billings;
DROP POLICY IF EXISTS "Admins can delete billings" ON billings;

-- All authenticated facility members can SELECT (auditors / clinicians
-- read billing history for their patients).
CREATE POLICY "Facility members can view billings"
  ON billings FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

-- Only admins INSERT, and only within their facility scope.
CREATE POLICY "Admins can write billings (insert)"
  ON billings FOR INSERT
  WITH CHECK (
    visit_id IN (
      SELECT v.id
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
    AND public.user_has_admin_entitlement(auth.uid())
  );

-- Only admins UPDATE existing billings rows.
CREATE POLICY "Admins can update billings"
  ON billings FOR UPDATE
  USING (
    public.user_has_admin_entitlement(auth.uid())
  )
  WITH CHECK (
    public.user_has_admin_entitlement(auth.uid())
  );

-- Only admins DELETE billings rows.
CREATE POLICY "Admins can delete billings"
  ON billings FOR DELETE
  USING (
    public.user_has_admin_entitlement(auth.uid())
  );

-- =====================================================================
-- End 00059_admin_only_mutations.sql
-- =====================================================================
