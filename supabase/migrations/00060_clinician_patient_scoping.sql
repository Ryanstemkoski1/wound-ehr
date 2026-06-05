-- =====================================================
-- 00060_clinician_patient_scoping.sql
-- =====================================================
-- Purpose:
--   Tighten the SELECT RLS policy on `patients` so that clinical
--   credentialed users (RN, LVN, MD, DO, PA, NP, CNA) who are NOT
--   administrators can only see patients that have been explicitly
--   assigned to them via the `patient_clinicians` table.
--
--   Admins (users with an admin entitlement -- see helper
--   `public.user_has_admin_entitlement` defined in 00059) continue
--   to see all patients within their facilities (no change in
--   behavior for them).
--
-- Rule (in plain English):
--   A user can SELECT a patient row when ALL of the following hold:
--     1. The patient's facility is one of the user's facilities
--        (preserves the existing facility-scoping invariant), AND
--     2. EITHER the user is NOT a clinical-only user (i.e. admin
--        entitlement present, or non-clinical credentials), OR
--        the user has an active assignment in `patient_clinicians`
--        for that patient.
--
-- Notes:
--   * `user_is_clinical_only` is SECURITY DEFINER + STABLE with
--     `search_path = public` so it can be safely used inside RLS
--     USING clauses without recursion risk.
--   * All statements are idempotent and safe to re-run.
-- =====================================================

-- -----------------------------------------------------
-- 1. Helper: is this user "clinical-only" (clinician,
--    NOT an admin)?
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_clinical_only(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = p_user_id
      AND u.credentials IN ('RN','LVN','MD','DO','PA','NP','CNA')
  ) AND NOT public.user_has_admin_entitlement(p_user_id);
$$;

COMMENT ON FUNCTION public.user_is_clinical_only(UUID) IS
  'TRUE when the user has clinical credentials (RN/LVN/MD/DO/PA/NP/CNA) AND does NOT hold an admin entitlement. Used by patients SELECT RLS to restrict clinicians to their assigned patients.';

GRANT EXECUTE ON FUNCTION public.user_is_clinical_only(UUID) TO authenticated;

-- -----------------------------------------------------
-- 2. Replace the patients SELECT policy
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view patients in their facilities" ON patients;
DROP POLICY IF EXISTS "Patients visibility scoped by clinician assignment" ON patients;

CREATE POLICY "Patients visibility scoped by clinician assignment"
  ON patients
  FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
    AND (
      -- Admins (and any non-clinical-only users) see all facility patients
      NOT public.user_is_clinical_only(auth.uid())
      -- Clinicians only see patients they're actively assigned to
      OR EXISTS (
        SELECT 1
        FROM patient_clinicians pc
        WHERE pc.patient_id = patients.id
          AND pc.user_id = auth.uid()
          AND pc.is_active = true
      )
    )
  );
