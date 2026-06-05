-- =====================================================
-- Migration 00051: Visit Kind (clinical purpose)
-- =====================================================
-- Adds visits.visit_kind to capture the *clinical purpose* of a visit:
--   - 'wound_care'        Wound Care (current product focus)
--   - 'skilled_nursing'   Skilled Nursing
--   - 'skin_sweep'        Skin Sweep
--   - 'patient_not_seen'  Patient Not Seen
--
-- This is DISTINCT from visits.visit_type (see 00001_complete_schema.sql:90),
-- which is the *modality* of the encounter ('in_person' vs 'telemed').
-- A single visit has both: e.g. visit_type='telemed' + visit_kind='wound_care'.
--
-- Additive, idempotent, no RLS changes (RLS on visits is already in place).

-- 1. Add column (nullable initially so we can backfill safely).
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS visit_kind TEXT;

-- 2. Add the CHECK constraint idempotently. We can't IF NOT EXISTS a
--    constraint directly in older Postgres, so we guard with a DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'visits_visit_kind_check'
      AND conrelid = 'visits'::regclass
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_visit_kind_check
      CHECK (visit_kind IN ('wound_care','skilled_nursing','skin_sweep','patient_not_seen'));
  END IF;
END
$$;

-- 3. Backfill existing rows to 'wound_care' (current product is wound-focused).
UPDATE visits
   SET visit_kind = 'wound_care'
 WHERE visit_kind IS NULL;

-- 4. Enforce NOT NULL now that all rows have a value.
ALTER TABLE visits
  ALTER COLUMN visit_kind SET NOT NULL;

-- 5. Default new rows to 'wound_care' going forward.
ALTER TABLE visits
  ALTER COLUMN visit_kind SET DEFAULT 'wound_care';

-- 6. Index for filtering by clinical purpose (dashboards, reports, queues).
CREATE INDEX IF NOT EXISTS idx_visits_visit_kind
  ON visits (visit_kind);

-- 7. Document the column so the distinction from visit_type is discoverable.
COMMENT ON COLUMN visits.visit_kind IS
  'Clinical purpose of the visit (wound_care | skilled_nursing | skin_sweep | patient_not_seen). '
  'Distinct from visit_type, which is the modality (in_person | telemed).';
