-- =====================================================
-- Migration 00053: Procedure Documentation
-- Phase 3 - Procedure chip inline detail capture
-- =====================================================
-- Consolidates the previously per-procedure tables
-- (debridement_assessments, grafting_assessments, gtube_procedures, ...)
-- into a single parent/child shape hung off `assessments`. When a
-- clinician tags a procedure chip on an assessment, the matching
-- per-procedure detail is captured here as a typed JSONB payload —
-- one row per (assessment_id, procedure_type).
--
-- Rationale (see PHASE3_NOTE_TYPE_DATA_MODEL.md):
--   * Adding a new procedure type no longer means a new table + new
--     RLS policies + new triggers; it is a new enum value and a new
--     payload shape validated at the application layer.
--   * RLS is uniform across procedure types: access derives from the
--     parent assessment -> visit -> patient -> facility chain, so a
--     single predicate covers every procedure_type.
--   * UNIQUE (assessment_id, procedure_type) enforces one detail
--     record per chip per assessment; re-tagging upserts the payload.
--
-- Forward path: existing per-procedure tables remain readable for
-- historical data; new captures land here. A later migration will
-- backfill / retire the legacy tables once the UI is fully migrated.

-- ---------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedure_documentation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  procedure_type  TEXT NOT NULL CHECK (procedure_type IN (
    'sharp_debridement',
    'biologic_graft',
    'arobella',
    'feeding_tube_change',
    'urinary_catheter_replacement'
  )),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, procedure_type)
);

COMMENT ON TABLE public.procedure_documentation IS
  'Per-procedure detail captured inline when a procedure chip is tagged on an assessment. One row per (assessment_id, procedure_type); payload shape varies by procedure_type and is validated at the application layer.';

COMMENT ON COLUMN public.procedure_documentation.procedure_type IS
  'Discriminator for payload shape. Add new values by altering the CHECK constraint in a later migration.';

COMMENT ON COLUMN public.procedure_documentation.payload IS
  'JSONB detail blob. Shape depends on procedure_type — see app/lib/procedure-documentation schemas.';

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_procedure_documentation_assessment
  ON public.procedure_documentation(assessment_id);

-- ---------------------------------------------------------------
-- updated_at trigger (reuses function defined in 00001_complete_schema.sql)
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS update_procedure_documentation_updated_at
  ON public.procedure_documentation;
CREATE TRIGGER update_procedure_documentation_updated_at
  BEFORE UPDATE ON public.procedure_documentation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
ALTER TABLE public.procedure_documentation ENABLE ROW LEVEL SECURITY;

-- Mirrors the assessments policy: access if the parent assessment's
-- visit belongs to a patient in one of the user's facilities. The
-- same predicate gates SELECT/INSERT/UPDATE/DELETE so re-tagging,
-- editing and untagging all use the same chain.

DROP POLICY IF EXISTS "Users can view procedure documentation for their visits"
  ON public.procedure_documentation;
CREATE POLICY "Users can view procedure documentation for their visits"
  ON public.procedure_documentation
  FOR SELECT
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN visits v ON v.id = a.visit_id
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert procedure documentation for their visits"
  ON public.procedure_documentation;
CREATE POLICY "Users can insert procedure documentation for their visits"
  ON public.procedure_documentation
  FOR INSERT
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN visits v ON v.id = a.visit_id
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update procedure documentation for their visits"
  ON public.procedure_documentation;
CREATE POLICY "Users can update procedure documentation for their visits"
  ON public.procedure_documentation
  FOR UPDATE
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN visits v ON v.id = a.visit_id
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN visits v ON v.id = a.visit_id
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete procedure documentation for their visits"
  ON public.procedure_documentation;
CREATE POLICY "Users can delete procedure documentation for their visits"
  ON public.procedure_documentation
  FOR DELETE
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN visits v ON v.id = a.visit_id
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );
