-- =====================================================
-- Migration 00037: Facility Type
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Adds a facility_type classifier so the UI can vary intake/scheduling
-- behavior per facility (e.g. SNF vs home health vs outpatient clinic).
-- All existing facilities default to 'snf' (matches the current customer
-- base — SNF is by far the dominant deployment).
-- Per docs/PROJECT_PLAN.md §7.2 (R-014).

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS facility_type TEXT
  NOT NULL DEFAULT 'snf'
  CHECK (facility_type IN (
    'snf',          -- Skilled Nursing Facility
    'alf',          -- Assisted Living Facility
    'home_health',  -- Home Health Agency partner
    'outpatient',   -- Outpatient wound clinic
    'hospital',     -- Inpatient
    'other'
  ));

COMMENT ON COLUMN facilities.facility_type IS
  'Drives intake/scheduling defaults. Default snf matches existing tenant base.';

-- Index supports filtering facility lists by type in admin views.
CREATE INDEX IF NOT EXISTS idx_facilities_facility_type
  ON facilities (tenant_id, facility_type)
  WHERE is_active = true;
