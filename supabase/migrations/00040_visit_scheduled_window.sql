-- =====================================================
-- Migration 00040: Visit Scheduled Time Window
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Adds explicit scheduled_start_at / scheduled_end_at so the calendar can
-- display + drag-resize visit windows distinct from the actual visit_date
-- (which historically conflates "scheduled" and "performed" timestamps).
-- Per docs/PROJECT_PLAN.md §7.2 (R-015).
--
-- Migration strategy:
--   - scheduled_start_at defaults to visits.visit_date for legacy rows
--   - scheduled_end_at defaults to visits.visit_date + 30 minutes
--   - New visits created via NewVisitDialog populate both columns explicitly

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440);

COMMENT ON COLUMN visits.scheduled_start_at IS
  'Planned visit start. Distinct from visit_date which is when work was performed.';

COMMENT ON COLUMN visits.scheduled_end_at IS
  'Planned visit end (exclusive). Used for calendar block sizing.';

-- Backfill legacy rows so the calendar doesn't break.
UPDATE visits
SET
  scheduled_start_at = COALESCE(scheduled_start_at, visit_date),
  scheduled_end_at   = COALESCE(scheduled_end_at, visit_date + INTERVAL '30 minutes'),
  duration_minutes   = COALESCE(duration_minutes, 30)
WHERE scheduled_start_at IS NULL OR scheduled_end_at IS NULL;

-- Calendar lookups by clinician + date range.
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_start
  ON visits (clinician_id, scheduled_start_at)
  WHERE clinician_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_scheduled_window
  ON visits (scheduled_start_at, scheduled_end_at)
  WHERE scheduled_start_at IS NOT NULL;

-- Ordering invariant
ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_scheduled_window_chk;
ALTER TABLE visits
  ADD CONSTRAINT visits_scheduled_window_chk
  CHECK (
    scheduled_start_at IS NULL
    OR scheduled_end_at IS NULL
    OR scheduled_end_at > scheduled_start_at
  );
