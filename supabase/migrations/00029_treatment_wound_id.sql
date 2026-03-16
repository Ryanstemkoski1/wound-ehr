-- =====================================================
-- Migration 00029: Treatment Order Builder Schema Update
-- Phase 11.6 - Treatment Order Builder
-- Date: March 16, 2026
-- Purpose: Add wound_id FK to treatments table for
--          per-wound treatment orders, and add
--          treatment_tab column for the 4-tab UI
-- =====================================================

-- 1. ADD wound_id COLUMN (nullable — allows visit-wide orders too)
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS wound_id UUID REFERENCES wounds(id) ON DELETE CASCADE;

-- 2. ADD treatment_tab COLUMN (which tab was used to create this order)
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS treatment_tab TEXT
    CHECK (treatment_tab IN (
      'topical',
      'compression_npwt',
      'skin_moisture',
      'rash_dermatitis'
    ));

-- 3. ADD cleanser COLUMN (the cleansing agent selected)
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS cleanser TEXT;

-- 4. ADD coverage COLUMN (dressing/coverage selected)
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS coverage TEXT;

-- 5. ADD secondary_treatment COLUMN (optional second treatment line)
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS secondary_treatment JSONB;

-- 6. ADD generated_order_text COLUMN (the auto-generated order sentence)
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS generated_order_text TEXT;

-- 7. COMPOSITE INDEX for per-wound lookups
CREATE INDEX IF NOT EXISTS idx_treatments_visit_wound
  ON treatments(visit_id, wound_id);

-- 8. INDEX on wound_id for cascading deletes
CREATE INDEX IF NOT EXISTS idx_treatments_wound_id
  ON treatments(wound_id);

-- 9. COMMENT documentation
COMMENT ON COLUMN treatments.wound_id IS 'FK to wounds table — nullable, enables per-wound treatment orders (Phase 11.6)';
COMMENT ON COLUMN treatments.treatment_tab IS 'Which tab was used: topical, compression_npwt, skin_moisture, rash_dermatitis';
COMMENT ON COLUMN treatments.cleanser IS 'Cleansing agent (saline, water, Dakins, etc.)';
COMMENT ON COLUMN treatments.coverage IS 'Dressing/coverage type (dry_dressing, open_air, duoderm, film, hydrocolloid)';
COMMENT ON COLUMN treatments.secondary_treatment IS 'Optional secondary treatment line as JSONB (same structure as primary)';
COMMENT ON COLUMN treatments.generated_order_text IS 'Auto-generated treatment order sentence from the sentence builder UI';
