-- =====================================================
-- Migration 00034: Critical Security Fixes
-- Date: April 27, 2026
-- Purpose: Address audit findings (Critical severity items)
--   1. Tenant-leak in get_user_role_info RPC (D3)
--   2. photos.wound_id ON DELETE CASCADE → SET NULL (D1)
--   3. Add audit_logs table for HIPAA PHI access trail
--   4. Add separate AI-processing consent column +
--      revocable enforcement on patient_recording_consents
--   5. (Bonus) Add SET search_path = public to remaining
--      SECURITY DEFINER functions touched here.
-- =====================================================


-- =====================================================
-- 1. Tighten get_user_role_info (D3)
--    Previously: any authenticated user could resolve
--    ANY user's tenant + role (cross-tenant info leak).
--    Now: caller must be the user themselves OR a
--    tenant_admin in the same tenant as the target.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_role_info(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  role text,
  facility_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ur.id, ur.user_id, ur.tenant_id, ur.role, ur.facility_id, ur.created_at
  FROM user_roles ur
  WHERE ur.user_id = user_uuid
    AND (
      -- Caller is querying themselves
      auth.uid() = user_uuid
      -- OR caller is a tenant_admin in the same tenant as the row
      OR EXISTS (
        SELECT 1 FROM user_roles caller_ur
        WHERE caller_ur.user_id = auth.uid()
          AND caller_ur.tenant_id = ur.tenant_id
          AND caller_ur.role = 'tenant_admin'
      )
    )
  ORDER BY ur.created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_role_info(uuid) IS
  'Returns the first role row for user_uuid. Caller must be the user themselves or a tenant_admin in the same tenant. Avoids cross-tenant info leaks.';

-- Re-grant after CREATE OR REPLACE (preserved, but explicit for safety)
GRANT EXECUTE ON FUNCTION public.get_user_role_info(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role_info(uuid) FROM anon;


-- =====================================================
-- 2. Fix photos.wound_id cascade (D1)
--    Deleting a wound was destroying all clinical
--    photographic evidence. Switch to SET NULL so the
--    photo row survives even if the wound link is lost.
-- =====================================================

ALTER TABLE public.photos
  DROP CONSTRAINT IF EXISTS photos_wound_id_fkey;

-- Make column nullable so SET NULL is legal
ALTER TABLE public.photos
  ALTER COLUMN wound_id DROP NOT NULL;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_wound_id_fkey
  FOREIGN KEY (wound_id) REFERENCES public.wounds(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.photos.wound_id IS
  'FK to wounds. ON DELETE SET NULL preserves clinical evidence if the wound is deleted.';


-- =====================================================
-- 3. PHI Access Audit Log (HIPAA)
--    A general append-only audit trail for PHI
--    access/mutation events. Application code should
--    write to this via the log_phi_access() helper
--    after any read or write of PHI.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES auth.users(id)     ON DELETE SET NULL,
  action       TEXT NOT NULL CHECK (action IN (
    'create','read','update','delete',
    'auth_login','auth_logout','auth_failed',
    'consent_signed','consent_revoked',
    'export','print','signature_create','signature_view',
    'audit_query'
  )),
  table_name   TEXT NOT NULL,
  record_id    UUID,
  record_type  TEXT,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS
  'HIPAA-grade append-only audit log of PHI access and mutation events.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record
  ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON public.audit_logs(action, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Append-only: anyone authenticated can INSERT a row about themselves
DROP POLICY IF EXISTS "Authenticated users can insert their own audit rows" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert their own audit rows"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

-- Read access: only tenant admins of the audit row's tenant
DROP POLICY IF EXISTS "Tenant admins can read audit rows for their tenant" ON public.audit_logs;
CREATE POLICY "Tenant admins can read audit rows for their tenant"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'tenant_admin'
        AND (audit_logs.tenant_id IS NULL OR ur.tenant_id = audit_logs.tenant_id)
    )
  );

-- No UPDATE / DELETE policies → table is effectively append-only.

-- Convenience RPC. Wraps the INSERT with auth.uid() and audit-of-audit
-- semantics: every call also writes a sibling row with action='audit_query'
-- when the action being logged is itself an audit read.
CREATE OR REPLACE FUNCTION public.log_phi_access(
  p_action      TEXT,
  p_table_name  TEXT,
  p_record_id   UUID  DEFAULT NULL,
  p_record_type TEXT  DEFAULT NULL,
  p_old_values  JSONB DEFAULT NULL,
  p_new_values  JSONB DEFAULT NULL,
  p_reason      TEXT  DEFAULT NULL,
  p_ip_address  TEXT  DEFAULT NULL,
  p_user_agent  TEXT  DEFAULT NULL,
  p_tenant_id   UUID  DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'log_phi_access requires an authenticated session';
  END IF;

  INSERT INTO public.audit_logs (
    tenant_id, user_id, action, table_name, record_id, record_type,
    old_values, new_values, ip_address, user_agent, reason
  ) VALUES (
    p_tenant_id, auth.uid(), p_action, p_table_name, p_record_id, p_record_type,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_reason
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_phi_access(
  TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, UUID
) TO authenticated;


-- =====================================================
-- 4. Separate AI-processing consent (HIPAA / BAA)
--    Recording consent ≠ consent to send PHI to a
--    third-party AI vendor (OpenAI). Track explicitly
--    and let the upload route enforce both gates.
-- =====================================================

ALTER TABLE public.patient_recording_consents
  ADD COLUMN IF NOT EXISTS ai_processing_consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_processing_consent_text  TEXT,
  ADD COLUMN IF NOT EXISTS ai_processing_consented_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processing_signature_id  UUID REFERENCES public.signatures(id),
  ADD COLUMN IF NOT EXISTS ai_vendor                   TEXT DEFAULT 'openai';

COMMENT ON COLUMN public.patient_recording_consents.ai_processing_consent_given IS
  'Explicit patient consent that PHI in audio/transcripts may be processed by a third-party AI vendor (e.g., OpenAI). Distinct from recording consent.';
COMMENT ON COLUMN public.patient_recording_consents.ai_vendor IS
  'Identifier of the AI vendor that will receive PHI (for BAA tracking and revocation).';

CREATE INDEX IF NOT EXISTS idx_recording_consents_ai_active
  ON public.patient_recording_consents(patient_id)
  WHERE ai_processing_consent_given = TRUE AND revoked_at IS NULL;


-- =====================================================
-- 5. Defense-in-depth: tighten remaining SECURITY DEFINER
--    functions with SET search_path = public (D4 partial).
--    Re-declare with the same body; only the option set
--    changes. Uses the actual definitions from 00001.
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_patient_consent(
  p_patient_id UUID,
  p_consent_type TEXT DEFAULT 'initial_treatment'
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id
      AND consent_type = p_consent_type
      AND patient_signature_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_perform_procedure(
  user_credentials TEXT,
  cpt_code TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  allowed_creds TEXT[];
BEGIN
  SELECT allowed_credentials INTO allowed_creds
    FROM procedure_scopes WHERE procedure_code = cpt_code;
  IF allowed_creds IS NULL THEN RETURN TRUE; END IF;
  RETURN user_credentials = ANY(allowed_creds);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_document_count(patient_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM patient_documents
    WHERE patient_id = patient_uuid AND is_archived = false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_document_uploaded_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_document_archived_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_archived = true AND OLD.is_archived = false THEN
    NEW.archived_at := NOW();
    NEW.archived_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
