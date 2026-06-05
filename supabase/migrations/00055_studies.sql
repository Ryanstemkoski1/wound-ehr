-- =====================================================
-- Migration 00055: Studies (Orders + Results)
-- Phase 3 - Clinical UX
-- =====================================================
-- Adds the Studies tab data model. Two tables:
--   * visit_studies_orders  -- what was ordered for the visit
--   * visit_studies_results -- what came back (with normal/abnormal/critical flag)
--
-- Both tables are scoped to a visit. RLS follows the standard
-- visit -> patient -> facility -> user_facilities chain so a user only
-- ever sees rows for patients at facilities they are assigned to.
--
-- Idempotent: safe to re-run (CREATE TABLE IF NOT EXISTS, CREATE INDEX
-- IF NOT EXISTS, DROP POLICY IF EXISTS before each CREATE POLICY).

-- =====================================================
-- 1. visit_studies_orders
-- =====================================================
CREATE TABLE IF NOT EXISTS public.visit_studies_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'lab', 'vascular_imaging', 'pathology_procedure', 'tissue_culture', 'biopsy'
  )),
  test_code TEXT NOT NULL,           -- e.g. 'CBC', 'HbA1c', 'ABI'
  test_name TEXT,                    -- friendly label
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ordered_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visit_studies_orders_unique_per_visit
    UNIQUE (visit_id, category, test_code)
);

COMMENT ON TABLE public.visit_studies_orders IS
  'Studies ordered during a visit (labs, imaging, pathology, cultures, biopsies).';

CREATE INDEX IF NOT EXISTS idx_visit_studies_orders_visit
  ON public.visit_studies_orders (visit_id);

-- =====================================================
-- 2. visit_studies_results
-- =====================================================
CREATE TABLE IF NOT EXISTS public.visit_studies_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  test_code TEXT NOT NULL,
  test_name TEXT,
  result_date DATE,
  result_value TEXT,
  flag TEXT NOT NULL DEFAULT 'normal'
    CHECK (flag IN ('normal', 'abnormal', 'critical')),
  document_path TEXT,                -- optional supabase storage path for upload
  notes TEXT,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.visit_studies_results IS
  'Study results returned for a visit. Flag drives red/yellow highlighting in the UI.';

CREATE INDEX IF NOT EXISTS idx_visit_studies_results_visit
  ON public.visit_studies_results (visit_id);

-- =====================================================
-- 3. RLS
-- =====================================================
-- Both tables follow the visit -> patient -> facility -> user_facilities chain.

ALTER TABLE public.visit_studies_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_studies_results ENABLE ROW LEVEL SECURITY;

-- ---- visit_studies_orders policies ----
DROP POLICY IF EXISTS visit_studies_orders_select ON public.visit_studies_orders;
CREATE POLICY visit_studies_orders_select ON public.visit_studies_orders
  FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS visit_studies_orders_insert ON public.visit_studies_orders;
CREATE POLICY visit_studies_orders_insert ON public.visit_studies_orders
  FOR INSERT
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS visit_studies_orders_update ON public.visit_studies_orders;
CREATE POLICY visit_studies_orders_update ON public.visit_studies_orders
  FOR UPDATE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS visit_studies_orders_delete ON public.visit_studies_orders;
CREATE POLICY visit_studies_orders_delete ON public.visit_studies_orders
  FOR DELETE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

-- ---- visit_studies_results policies ----
DROP POLICY IF EXISTS visit_studies_results_select ON public.visit_studies_results;
CREATE POLICY visit_studies_results_select ON public.visit_studies_results
  FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS visit_studies_results_insert ON public.visit_studies_results;
CREATE POLICY visit_studies_results_insert ON public.visit_studies_results
  FOR INSERT
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS visit_studies_results_update ON public.visit_studies_results;
CREATE POLICY visit_studies_results_update ON public.visit_studies_results
  FOR UPDATE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS visit_studies_results_delete ON public.visit_studies_results;
CREATE POLICY visit_studies_results_delete ON public.visit_studies_results
  FOR DELETE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );
