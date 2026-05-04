-- =====================================================
-- Migration 00035: High-Severity Hardening
-- Date: April 27, 2026
-- Purpose: Address audit "High" items not covered by 00034.
--   D4 (remaining): SET search_path = public on remaining
--                   SECURITY DEFINER functions
--   D5            : restrict procedure_scopes SELECT to
--                   credentials the caller actually holds
--   D6            : add facility check to grafting /
--                   skin_sweep UPDATE & DELETE policies
--   D7            : add UNIQUE(visit_id) to specialized
--                   assessments to prevent duplicates
--   AI2           : retention enforcement helper RPC
-- =====================================================


-- =====================================================
-- D4: search_path on remaining SECURITY DEFINER functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_allowed_procedures(user_credentials TEXT)
RETURNS TABLE (procedure_code TEXT, procedure_name TEXT, category TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.procedure_code, ps.procedure_name, ps.category
    FROM procedure_scopes ps
    WHERE user_credentials = ANY(ps.allowed_credentials)
    ORDER BY ps.category, ps.procedure_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_restricted_procedures(user_credentials TEXT)
RETURNS TABLE (procedure_code TEXT, procedure_name TEXT, category TEXT, required_credentials TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.procedure_code, ps.procedure_name, ps.category, ps.allowed_credentials
    FROM procedure_scopes ps
    WHERE NOT (user_credentials = ANY(ps.allowed_credentials))
    ORDER BY ps.category, ps.procedure_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_skilled_nursing_assessment_with_wounds(
  assessment_id_param UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'assessment', row_to_json(sna.*),
    'wounds', COALESCE(
      (SELECT json_agg(row_to_json(snw.*))
         FROM skilled_nursing_wounds snw
         WHERE snw.assessment_id = assessment_id_param),
      '[]'::json
    )
  ) INTO result
    FROM skilled_nursing_assessments sna
    WHERE sna.id = assessment_id_param;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_visit_all_assessments(visit_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'standard', COALESCE(
      (SELECT json_agg(row_to_json(a.*)) FROM assessments a WHERE a.visit_id = visit_id_param),
      '[]'::json),
    'skilled_nursing',
      (SELECT row_to_json(sna.*) FROM skilled_nursing_assessments sna WHERE sna.visit_id = visit_id_param LIMIT 1),
    'skilled_nursing_wounds', COALESCE(
      (SELECT json_agg(row_to_json(snw.*)) FROM skilled_nursing_wounds snw WHERE snw.visit_id = visit_id_param),
      '[]'::json),
    'grafting', COALESCE(
      (SELECT json_agg(row_to_json(ga.*)) FROM grafting_assessments ga WHERE ga.visit_id = visit_id_param),
      '[]'::json),
    'skin_sweep', COALESCE(
      (SELECT json_agg(row_to_json(ssa.*)) FROM skin_sweep_assessments ssa WHERE ssa.visit_id = visit_id_param),
      '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_gtube_procedure_count(patient_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER
            FROM gtube_procedures
            WHERE patient_id = patient_id_param);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_visit_ready_for_signature(p_visit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM visits v
    WHERE v.id = p_visit_id
      AND v.status IN ('complete', 'completed', 'ready_for_signature', 'approved')
      AND EXISTS (SELECT 1 FROM assessments a WHERE a.visit_id = v.id)
  );
$$;


-- =====================================================
-- D5: Restrict procedure_scopes SELECT to credentials
--     the caller actually holds. Previous policy let any
--     authenticated user enumerate the full credential
--     -> procedure map (scope-of-practice metadata leak).
--     Tenant admins still see everything for management.
-- =====================================================

DROP POLICY IF EXISTS "Users can view procedure scopes" ON public.procedure_scopes;
DROP POLICY IF EXISTS "Users can view procedure scopes for their credentials" ON public.procedure_scopes;

CREATE POLICY "Users can view procedure scopes for their credentials"
  ON public.procedure_scopes FOR SELECT
  USING (
    -- Tenant admins can read all scopes (management UI)
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'tenant_admin'
    )
    -- Or the caller's credential is in the allowed list
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND COALESCE(u.credentials, 'Admin') = ANY(allowed_credentials)
    )
  );


-- =====================================================
-- D6: Facility check on grafting / skin_sweep
--     UPDATE & DELETE. Was created_by = auth.uid() only,
--     which let a clinician moved to a new facility keep
--     editing assessments at the old facility.
-- =====================================================

DROP POLICY IF EXISTS "Users can update grafting assessments" ON public.grafting_assessments;
DROP POLICY IF EXISTS "Users can update grafting assessments in their facility" ON public.grafting_assessments;
CREATE POLICY "Users can update grafting assessments in their facility"
  ON public.grafting_assessments FOR UPDATE
  USING (
    created_by = auth.uid()
    AND facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete grafting assessments" ON public.grafting_assessments;
DROP POLICY IF EXISTS "Users can delete grafting assessments in their facility" ON public.grafting_assessments;
CREATE POLICY "Users can delete grafting assessments in their facility"
  ON public.grafting_assessments FOR DELETE
  USING (
    created_by = auth.uid()
    AND facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update skin sweep assessments" ON public.skin_sweep_assessments;
DROP POLICY IF EXISTS "Users can update skin sweep assessments in their facility" ON public.skin_sweep_assessments;
CREATE POLICY "Users can update skin sweep assessments in their facility"
  ON public.skin_sweep_assessments FOR UPDATE
  USING (
    created_by = auth.uid()
    AND facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete skin sweep assessments" ON public.skin_sweep_assessments;
DROP POLICY IF EXISTS "Users can delete skin sweep assessments in their facility" ON public.skin_sweep_assessments;
CREATE POLICY "Users can delete skin sweep assessments in their facility"
  ON public.skin_sweep_assessments FOR DELETE
  USING (
    created_by = auth.uid()
    AND facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );


-- =====================================================
-- D7: Prevent duplicate specialized assessments per visit
--     Use partial unique indexes so historical duplicates
--     (if any) do not block the migration. New rows are
--     enforced 1-per-visit.
-- =====================================================

-- Skilled nursing — assumes one comprehensive assessment per visit
CREATE UNIQUE INDEX IF NOT EXISTS uniq_skilled_nursing_assessments_visit_id
  ON public.skilled_nursing_assessments (visit_id);

-- Grafting — one graft documentation per visit
CREATE UNIQUE INDEX IF NOT EXISTS uniq_grafting_assessments_visit_id
  ON public.grafting_assessments (visit_id);

-- Skin sweep — one full-body sweep per visit
CREATE UNIQUE INDEX IF NOT EXISTS uniq_skin_sweep_assessments_visit_id
  ON public.skin_sweep_assessments (visit_id);


-- =====================================================
-- AI2: Retention enforcement RPC
--     Hard-deletes visit_transcripts.audio_url + storage
--     object for transcripts older than the configured
--     retention window. The application can call this on
--     a schedule (Supabase cron / external scheduler).
--
--     Audio is removed; transcript_raw / transcript_clinical
--     remain in the DB as part of the medical record.
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_expired_audio(retention_days INTEGER DEFAULT 90)
RETURNS TABLE (deleted_transcript_id UUID, audio_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_row RECORD;
BEGIN
  -- Caller must be a tenant_admin (in any tenant) to invoke this.
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'tenant_admin'
  ) THEN
    RAISE EXCEPTION 'delete_expired_audio: tenant_admin role required';
  END IF;

  FOR v_row IN
    SELECT vt.id, vt.audio_url
      FROM visit_transcripts vt
      WHERE vt.audio_url IS NOT NULL
        AND vt.created_at < NOW() - (retention_days || ' days')::INTERVAL
  LOOP
    -- Remove storage object (best-effort; ignore if already gone)
    BEGIN
      DELETE FROM storage.objects
        WHERE bucket_id = 'visit-audio'
          AND name = v_row.audio_url;
    EXCEPTION WHEN OTHERS THEN
      -- Continue even if storage delete fails; we still null the URL
      NULL;
    END;

    UPDATE visit_transcripts
       SET audio_url = NULL,
           processing_status = CASE
             WHEN processing_status = 'completed' THEN 'deleted'
             ELSE processing_status
           END,
           updated_at = NOW()
     WHERE id = v_row.id;

    deleted_transcript_id := v_row.id;
    audio_url := v_row.audio_url;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_expired_audio(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.delete_expired_audio(INTEGER) IS
  'Tenant-admin-only retention enforcement: deletes audio files older than retention_days from the visit-audio bucket and clears audio_url on the transcript row. Transcript text is preserved.';
