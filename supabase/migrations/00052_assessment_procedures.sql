-- =====================================================
-- Migration 00052: Assessment Procedures + Healing Sign Off
-- =====================================================
-- Extends the assessments table with two clinical capture fields:
--
-- 1. procedures_performed TEXT[] — multi-select tag of procedures the
--    clinician performed on this wound at this visit. Distinct from the
--    treatments table (which is per-visit, not per-wound) because the
--    same visit can touch multiple wounds and each can have its own set
--    of procedures (e.g. sharp debridement on wound A, biologic graft
--    on wound B).
--
-- 2. healing_sign_off BOOLEAN — flips to true when the clinician has
--    formally signed off on this wound (care transferred to another
--    provider, or the wound is healed and we are no longer following).
--    This is *separate* from healing_status because sign-off is an
--    explicit clinical act, not a derived state.
--
-- Additive, idempotent. assessments already has RLS (see 00001:1362),
-- so no policy changes are needed — the new columns inherit the
-- existing tenant-scoped policies.
--
-- Allowed procedure keys (must stay in sync with the UI tag list):
--   - sharp_debridement
--   - biologic_graft
--   - arobella
--   - feeding_tube_change
--   - urinary_catheter_replacement

-- 1. procedures_performed: array of procedure keys, empty by default.
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS procedures_performed TEXT[] NOT NULL DEFAULT '{}';

-- 2. healing_sign_off: explicit clinician sign-off flag.
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS healing_sign_off BOOLEAN NOT NULL DEFAULT false;

-- 3. CHECK constraint restricting procedures_performed to the allowed set.
--    Using `<@` (is contained by) so an empty array satisfies the constraint
--    and so unknown values are rejected. Guarded with a DO block because
--    Postgres has no IF NOT EXISTS for constraints.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessments_procedures_performed_check'
      AND conrelid = 'assessments'::regclass
  ) THEN
    ALTER TABLE assessments
      ADD CONSTRAINT assessments_procedures_performed_check
      CHECK (
        procedures_performed <@ ARRAY[
          'sharp_debridement',
          'biologic_graft',
          'arobella',
          'feeding_tube_change',
          'urinary_catheter_replacement'
        ]::TEXT[]
      );
  END IF;
END
$$;

-- 4. GIN index for "find wounds where any procedure was performed" queries
--    (e.g. dashboard filters, reports of biologic graft placements).
CREATE INDEX IF NOT EXISTS idx_assessments_procedures_performed
  ON assessments USING GIN (procedures_performed);

-- 5. Column documentation.
COMMENT ON COLUMN assessments.procedures_performed IS
  'Array of procedure keys tagged on this wound at this visit. '
  'Allowed: sharp_debridement, biologic_graft, arobella, '
  'feeding_tube_change, urinary_catheter_replacement. '
  'Empty array means no procedures performed.';

COMMENT ON COLUMN assessments.healing_sign_off IS
  'True when the clinician has signed off on this wound '
  '(care transferred or no longer following). Explicit clinical act, '
  'distinct from the derived healing_status field.';
