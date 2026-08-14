-- =====================================================
-- 00061_field_notes.sql
-- =====================================================
-- Field Ops rebuild, data layer (2026-08-14).
--
-- 1. Breaks the patients <-> patient_clinicians RLS policy cycle
--    (00060's patients SELECT policy subqueries patient_clinicians,
--    whose own policies subquery patients -- a 42P17 infinite-recursion
--    hazard for every patient-scoped read) by moving both cross-table
--    checks into SECURITY DEFINER helpers.
-- 2. Adds visits.scheduled_by (provenance: which office user scheduled
--    the visit; visits.clinician_id remains the performing nurse).
--    Deliberately NOT named created_by: legacy autosaveVisitDraft
--    inserts a created_by column and must keep failing until removed.
-- 3. Creates field_notes (one per visit) + field_note_events
--    (append-only edit history) with RLS that makes finalized notes
--    immutable at the database layer.
-- 4. Adds merge_field_note_section(): atomic per-section JSONB merge
--    so concurrent saves of different sections can never wipe each
--    other (the legacy em_documentation whole-blob-replace bug class).
--
-- All statements are idempotent and safe to re-run.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1a. Helper: active clinician assignment for a patient.
--     SECURITY DEFINER so evaluating it inside patients RLS
--     does NOT invoke patient_clinicians RLS (breaks the cycle).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_patient(p_patient_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_clinicians pc
    WHERE pc.patient_id = p_patient_id
      AND pc.user_id = p_user_id
      AND pc.is_active = true
  );
$$;

COMMENT ON FUNCTION public.user_is_assigned_to_patient(UUID, UUID) IS
  'TRUE when the user has an active patient_clinicians assignment for the patient. SECURITY DEFINER: safe inside patients RLS without recursing into patient_clinicians policies.';

GRANT EXECUTE ON FUNCTION public.user_is_assigned_to_patient(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_is_assigned_to_patient(UUID, UUID) FROM anon;

-- -----------------------------------------------------
-- 1b. Helper: facility-membership check for a patient.
--     SECURITY DEFINER so patient_clinicians policies can check the
--     patient's facility without invoking patients RLS (reverse edge
--     of the same cycle).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_in_patient_facility(p_patient_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM patients p
    JOIN user_facilities uf ON uf.facility_id = p.facility_id
    WHERE p.id = p_patient_id
      AND uf.user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.user_in_patient_facility(UUID, UUID) IS
  'TRUE when the patient''s facility is one of the user''s facilities. SECURITY DEFINER: safe inside patient_clinicians (and other child-table) RLS without recursing into patients policies.';

GRANT EXECUTE ON FUNCTION public.user_in_patient_facility(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_in_patient_facility(UUID, UUID) FROM anon;

-- -----------------------------------------------------
-- 1c. Recreate the patients SELECT policy (same semantics as 00060,
--     assignment check now via the definer helper).
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Patients visibility scoped by clinician assignment" ON patients;

CREATE POLICY "Patients visibility scoped by clinician assignment"
  ON patients
  FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
    AND (
      NOT public.user_is_clinical_only(auth.uid())
      OR public.user_is_assigned_to_patient(patients.id, auth.uid())
    )
  );

-- -----------------------------------------------------
-- 1d. Recreate patient_clinicians policies with the definer
--     facility check (semantics unchanged from 00001).
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view patient clinician assignments" ON patient_clinicians;
CREATE POLICY "Users can view patient clinician assignments"
  ON patient_clinicians FOR SELECT
  USING (public.user_in_patient_facility(patient_clinicians.patient_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can create patient clinician assignments" ON patient_clinicians;
CREATE POLICY "Admins can create patient clinician assignments"
  ON patient_clinicians FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND public.user_in_patient_facility(patient_clinicians.patient_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update patient clinician assignments" ON patient_clinicians;
CREATE POLICY "Admins can update patient clinician assignments"
  ON patient_clinicians FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND public.user_in_patient_facility(patient_clinicians.patient_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete patient clinician assignments" ON patient_clinicians;
CREATE POLICY "Admins can delete patient clinician assignments"
  ON patient_clinicians FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND public.user_in_patient_facility(patient_clinicians.patient_id, auth.uid())
  );

-- -----------------------------------------------------
-- 2. visits.scheduled_by (provenance only; nullable).
-- -----------------------------------------------------
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS scheduled_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN visits.scheduled_by IS
  'Office user who scheduled/created this visit (Field Ops). Distinct from clinician_id (the performing nurse). NOT named created_by on purpose -- the legacy autosave path inserts created_by and must keep failing.';

-- -----------------------------------------------------
-- 3a. field_notes: one Wound Care Field Visit Note per visit.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS field_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('initial_evaluation', 'follow_up')),
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_sections TEXT[] NOT NULL DEFAULT '{}',
  prepped_at TIMESTAMPTZ,
  prepped_by UUID REFERENCES auth.users(id),
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  room TEXT,
  signature_id UUID REFERENCES signatures(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE field_notes IS
  'Wound Care Field Visit Note (Field Ops rebuild). One per visit. Lifecycle rides visits.status (scheduled/in-progress -> submitted -> sent_to_office -> approved | needs_correction); "Prepped" is prepped_at metadata, not a status.';
COMMENT ON COLUMN field_notes.sections IS
  'Note payload: { section_key: { field_key: value } }. Real JSONB sub-objects keyed by the section registry (lib/field-note/registry.ts). Never JSON-encoded strings. Written ONLY via merge_field_note_section().';
COMMENT ON COLUMN field_notes.sections_meta IS
  'Per-section metadata: { section_key: { last_edited_by, last_edited_by_name, last_edited_at, not_assessed, attestation } }.';
COMMENT ON COLUMN field_notes.added_sections IS
  'Section keys manually added to a follow_up note beyond its default set.';

CREATE INDEX IF NOT EXISTS idx_field_notes_patient ON field_notes (patient_id, created_at DESC);

-- -----------------------------------------------------
-- 3b. field_note_events: append-only edit history.
--     Powers section attribution, QA delta review, HIPAA audit.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS field_note_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES field_notes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'section_save'
    CHECK (event_type IN ('section_save','not_assessed','prepped','start_visit','sign','correction_request','correction_resolved','approve','reopen','reassign','cancel','no_show')),
  section_key TEXT,
  payload JSONB,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE field_note_events IS
  'Append-only Field Ops event log (no UPDATE/DELETE policies by design).';

CREATE INDEX IF NOT EXISTS idx_field_note_events_note ON field_note_events (note_id, edited_at);

-- -----------------------------------------------------
-- 3c. RLS.
-- -----------------------------------------------------
ALTER TABLE field_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_note_events ENABLE ROW LEVEL SECURITY;

-- SELECT: facility-scoped via the patient (patients RLS applies inside,
-- so post-00060 clinician scoping carries over automatically).
DROP POLICY IF EXISTS "Users can view field notes for their patients" ON field_notes;
CREATE POLICY "Users can view field notes for their patients"
  ON field_notes FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create field notes for their patients" ON field_notes;
CREATE POLICY "Users can create field notes for their patients"
  ON field_notes FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- UPDATE: facility scope AND the parent visit is in an editable status.
-- This is the DB-level lock: once a note is signed (submitted /
-- sent_to_office / approved / voided), no row update can touch it;
-- QA reopening sets the visit to needs_correction first.
DROP POLICY IF EXISTS "Field notes editable while visit is open" ON field_notes;
CREATE POLICY "Field notes editable while visit is open"
  ON field_notes FOR UPDATE
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM visits v
      WHERE v.id = field_notes.visit_id
        AND v.status IN ('scheduled', 'in-progress', 'needs_correction')
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- No DELETE policy: notes are never deleted (cancelled visits keep a
-- read-only note; visit deletion cascades at the system level).

DROP POLICY IF EXISTS "Users can view field note events for their patients" ON field_note_events;
CREATE POLICY "Users can view field note events for their patients"
  ON field_note_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM field_notes fn WHERE fn.id = field_note_events.note_id)
  );

DROP POLICY IF EXISTS "Users can append field note events" ON field_note_events;
CREATE POLICY "Users can append field note events"
  ON field_note_events FOR INSERT
  WITH CHECK (
    edited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM field_notes fn WHERE fn.id = field_note_events.note_id)
    AND (
      -- Low-stakes event types: any facility member who can see the note.
      event_type IN ('section_save', 'not_assessed', 'start_visit', 'correction_resolved')
      -- Privileged lifecycle events: office admins…
      OR public.user_has_admin_entitlement(auth.uid())
      -- …or the visit's assigned nurse (sign).
      OR EXISTS (
        SELECT 1 FROM field_notes fn
        JOIN visits v ON v.id = fn.visit_id
        WHERE fn.id = field_note_events.note_id
          AND v.clinician_id = auth.uid()
      )
    )
  );
-- (SELECT/INSERT reference field_notes, so its facility-scoped RLS
--  applies transitively. No UPDATE/DELETE policies: append-only.
--  The event-type gate stops a non-privileged facility member from
--  forging sign/approve/reopen entries in the operational log.)

-- -----------------------------------------------------
-- 4. Atomic per-section merge. SECURITY INVOKER (default): the UPDATE
--    runs under the caller's RLS, so facility scope + the editable-
--    status lock above are enforced inside the function too.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_field_note_section(
  p_note_id UUID,
  p_section_key TEXT,
  p_payload JSONB,
  p_meta JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Defense-in-depth for direct (non-server-action) calls: sane key
  -- shape and bounded payload/meta sizes. Schema-level validation
  -- stays in the server action (zod from the registry).
  IF p_section_key !~ '^[a-z0-9_]{1,40}$' THEN
    RAISE EXCEPTION 'invalid section key';
  END IF;
  IF p_payload IS NOT NULL AND pg_column_size(p_payload) > 262144 THEN
    RAISE EXCEPTION 'section payload too large';
  END IF;
  IF p_meta IS NOT NULL AND pg_column_size(p_meta) > 16384 THEN
    RAISE EXCEPTION 'section meta too large';
  END IF;

  -- p_payload NULL = meta-only update (Not assessed / attestation /
  -- nudge). Leaves sections untouched so a meta toggle can never race
  -- and overwrite an in-flight autosave of the section's content.
  UPDATE field_notes
     SET sections = CASE
           WHEN p_payload IS NULL THEN sections
           ELSE sections || jsonb_build_object(p_section_key, p_payload)
         END,
         sections_meta = CASE
           WHEN p_meta IS NULL THEN sections_meta
           ELSE sections_meta || jsonb_build_object(p_section_key,
                  COALESCE(sections_meta -> p_section_key, '{}'::jsonb) || p_meta)
         END,
         updated_at = NOW()
   WHERE id = p_note_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'field note not found or not editable';
  END IF;

  IF p_payload IS NOT NULL THEN
    INSERT INTO field_note_events (note_id, event_type, section_key, payload, edited_by)
    VALUES (p_note_id, 'section_save', p_section_key, p_payload, auth.uid());
  END IF;
END;
$$;

COMMENT ON FUNCTION public.merge_field_note_section(UUID, TEXT, JSONB, JSONB) IS
  'Atomic per-section save: sections || jsonb_build_object(key, payload) in one statement, plus meta merge and an append-only event. SECURITY INVOKER so RLS (facility scope + editable-status lock) applies. App code must never read-modify-write the sections blob.';

GRANT EXECUTE ON FUNCTION public.merge_field_note_section(UUID, TEXT, JSONB, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.merge_field_note_section(UUID, TEXT, JSONB, JSONB) FROM anon;

-- -----------------------------------------------------
-- 5. updated_at touch trigger (reuses the shared helper if present).
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_field_notes_updated_at') THEN
      CREATE TRIGGER set_field_notes_updated_at
        BEFORE UPDATE ON field_notes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END
$$;

commit;
