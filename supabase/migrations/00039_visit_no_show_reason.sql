-- =====================================================
-- Migration 00039: Visit No-Show Reason
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Captures *why* a visit was marked no-show. Required by office staff to
-- triage rescheduling and patterns (per Alana 4/27).
-- Per docs/PROJECT_PLAN.md §7.2 (R-017).
--
-- Note: visits.status already includes 'no-show' (see 00001 line 95).
-- This column is only meaningful when status = 'no-show', enforced by
-- the partial CHECK constraint.

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS no_show_reason TEXT,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_recorded_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN visits.no_show_reason IS
  'Free-text reason recorded when status=no-show. NULL otherwise.';

-- Soft validation: if either no_show_* field is set, the row should be no-show.
-- Not a hard CHECK because legacy rows may not be backfilled; UI/server-action
-- enforces the invariant going forward.
CREATE INDEX IF NOT EXISTS idx_visits_no_show
  ON visits (status, visit_date DESC)
  WHERE status = 'no-show';
