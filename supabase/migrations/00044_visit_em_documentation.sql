-- =====================================================
-- Migration 00044: Visit E/M Documentation
-- Phase 3 - Clinical UX Slice 5 (R-065)
-- =====================================================
-- Free-form Evaluation & Management sub-section storage on the visit.
-- Per the 4/27 client meeting we explicitly chose sub-sections over
-- adding 11 new tabs (docs/PROJECT_PLAN.md §7.6 / §3.3). One JSONB
-- column keeps the schema flexible: clinicians fill any combination of
-- vitals / chief complaint / HPI / ROS / PE without us having to alter
-- the schema each time the requested fields evolve.
--
-- Shape (all keys optional, all values strings):
--   {
--     "vitals":     "BP 132/84, HR 78, T 98.4, RR 16, SpO2 97% RA",
--     "cc_hpi":     "Chief complaint and HPI narrative...",
--     "ros":        "ROS narrative or template...",
--     "pe":         "Physical exam narrative..."
--   }
-- Additional keys are tolerated (forward-compatible).

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS em_documentation JSONB;

COMMENT ON COLUMN visits.em_documentation IS
  'Optional E/M sub-section narratives (vitals, cc_hpi, ros, pe). NULL when unused.';

-- No new indexes / RLS changes — column inherits the existing visits
-- row-level policies. No backfill — existing rows simply have NULL.
