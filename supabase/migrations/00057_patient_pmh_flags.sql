-- =====================================================
-- Migration 00057: Patient Past Medical History (PMH) Flags
-- Phase 3 - Clinical intake / Dr. May artifact alignment
-- =====================================================
-- Adds a single JSONB column on patients to capture the PMH checkbox grid
-- from Dr. May's artifact (Hypertension, Type 2 Diabetes, CHF, COPD,
-- CKD/ESRD, PVD/PAD, Venous Insufficiency, Obesity, Malnutrition, Dementia,
-- CVA/TIA, CAD, Atrial Fibrillation, Hypothyroidism, Osteoporosis,
-- Contractures, Pressure Injury Hx, Wound Hx).
--
-- Why JSONB (vs N BOOLEAN columns):
--   * The PMH set is expected to grow as wound-care clinicians request
--     additional comorbidities. Adding a key to a JSONB blob is a no-op
--     deploy; adding a BOOLEAN column is another migration each time.
--   * Sparse by nature — most flags are false for most patients. Storing
--     only the set keys is cheaper than N boolean columns at scale.
--   * Application code treats unset / missing keys as false, so the default
--     '{}'::jsonb is semantically equivalent to "all flags false" without
--     having to seed every key.
--
-- Example stored value:
--   { "hypertension": true, "type_2_diabetes": true, "cad": false, ... }
--
-- RLS: no changes — patients table already enforces tenant isolation.
-- All statements are idempotent.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS pmh_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN patients.pmh_flags IS
  'Past Medical History checkbox flags from the clinical intake grid. Snake_case keys map 1:1 to the UI checklist (e.g. hypertension, type_2_diabetes, chf, copd, ckd_esrd, pvd_pad, venous_insufficiency, obesity, malnutrition, dementia, cva_tia, cad, atrial_fibrillation, hypothyroidism, osteoporosis, contractures, pressure_injury_hx, wound_hx). Missing keys are interpreted as false. JSONB chosen so new flags can be added without a schema migration.';

-- GIN index supports filtered patient lookups like
--   WHERE pmh_flags @> '{"type_2_diabetes": true}'
-- used by cohort / risk-stratification views.
CREATE INDEX IF NOT EXISTS idx_patients_pmh_flags
  ON patients
  USING GIN (pmh_flags);
