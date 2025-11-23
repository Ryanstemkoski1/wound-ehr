-- Migration: Signature Audit Logs
-- Phase 9.3.7: Admin reporting view for all signatures with comprehensive filtering
-- Date: November 23, 2025

-- =====================================================
-- RPC FUNCTION: Get Signature Audit Logs
-- =====================================================
-- Purpose: Admin-only function to fetch all signatures with user/patient/visit details
-- Returns comprehensive data for compliance reporting and audit trails

CREATE OR REPLACE FUNCTION get_signature_audit_logs(
  p_tenant_id UUID DEFAULT NULL,
  p_facility_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_signature_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  -- Signature data
  signature_id UUID,
  signature_type TEXT,
  signature_method TEXT,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  
  -- Visit data
  visit_id UUID,
  visit_date TIMESTAMPTZ,
  visit_type TEXT,
  visit_status TEXT,
  
  -- Patient data
  patient_id UUID,
  patient_name TEXT,
  patient_mrn TEXT,
  
  -- Facility data
  facility_id UUID,
  facility_name TEXT,
  
  -- Signer data (user who created signature)
  signer_user_id UUID,
  signer_name TEXT,
  signer_role TEXT,
  signer_credentials TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS signature_id,
    s.signature_type,
    s.signature_method,
    s.signed_at,
    s.ip_address,
    
    v.id AS visit_id,
    v.visit_date,
    v.visit_type,
    v.status AS visit_status,
    
    p.id AS patient_id,
    (p.first_name || ' ' || p.last_name) AS patient_name,
    p.mrn AS patient_mrn,
    
    f.id AS facility_id,
    f.name AS facility_name,
    
    u.id AS signer_user_id,
    u.name AS signer_name,
    s.signer_role,
    u.credentials AS signer_credentials,
    
    s.created_at
  FROM signatures s
  LEFT JOIN visits v ON v.id = s.visit_id
  LEFT JOIN patients p ON p.id = s.patient_id
  LEFT JOIN facilities f ON f.id = p.facility_id
  LEFT JOIN users u ON u.id = s.created_by
  WHERE
    -- Tenant filter (if specified)
    (p_tenant_id IS NULL OR f.id IN (
      SELECT uf.facility_id FROM user_facilities uf
      WHERE uf.user_id IN (
        SELECT ur.user_id FROM user_roles ur WHERE ur.tenant_id = p_tenant_id
      )
    ))
    -- Facility filter
    AND (p_facility_id IS NULL OR f.id = p_facility_id)
    -- User filter (who created the signature)
    AND (p_user_id IS NULL OR s.created_by = p_user_id)
    -- Signature type filter
    AND (p_signature_type IS NULL OR s.signature_type = p_signature_type)
    -- Date range filter
    AND (p_start_date IS NULL OR s.signed_at >= p_start_date)
    AND (p_end_date IS NULL OR s.signed_at <= p_end_date)
  ORDER BY s.signed_at DESC, s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_signature_audit_logs IS 
  'Admin function to retrieve comprehensive signature audit logs with filtering. Returns all signatures with user, patient, visit, and facility details.';

-- Grant execute to authenticated users (RLS will be checked in calling code)
GRANT EXECUTE ON FUNCTION get_signature_audit_logs TO authenticated;

-- =====================================================
-- RPC FUNCTION: Get Signature Audit Stats
-- =====================================================
-- Purpose: Get summary statistics for signature audit dashboard

CREATE OR REPLACE FUNCTION get_signature_audit_stats(
  p_tenant_id UUID DEFAULT NULL,
  p_facility_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_signatures BIGINT,
  consent_signatures BIGINT,
  patient_signatures BIGINT,
  provider_signatures BIGINT,
  drawn_signatures BIGINT,
  typed_signatures BIGINT,
  uploaded_signatures BIGINT,
  total_visits_signed BIGINT,
  unique_signers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_signatures AS (
    SELECT 
      s.*,
      p.facility_id AS patient_facility_id
    FROM signatures s
    LEFT JOIN patients p ON p.id = s.patient_id
    WHERE
      (p_tenant_id IS NULL OR p.facility_id IN (
        SELECT uf.facility_id FROM user_facilities uf
        WHERE uf.user_id IN (
          SELECT ur.user_id FROM user_roles ur WHERE ur.tenant_id = p_tenant_id
        )
      ))
      AND (p_facility_id IS NULL OR p.facility_id = get_signature_audit_stats.p_facility_id)
      AND (p_start_date IS NULL OR s.signed_at >= p_start_date)
      AND (p_end_date IS NULL OR s.signed_at <= p_end_date)
  )
  SELECT 
    COUNT(*)::BIGINT AS total_signatures,
    COUNT(*) FILTER (WHERE signature_type = 'consent')::BIGINT AS consent_signatures,
    COUNT(*) FILTER (WHERE signature_type = 'patient')::BIGINT AS patient_signatures,
    COUNT(*) FILTER (WHERE signature_type = 'provider')::BIGINT AS provider_signatures,
    COUNT(*) FILTER (WHERE signature_method = 'draw')::BIGINT AS drawn_signatures,
    COUNT(*) FILTER (WHERE signature_method = 'type')::BIGINT AS typed_signatures,
    COUNT(*) FILTER (WHERE signature_method = 'upload')::BIGINT AS uploaded_signatures,
    COUNT(DISTINCT visit_id) FILTER (WHERE visit_id IS NOT NULL)::BIGINT AS total_visits_signed,
    COUNT(DISTINCT created_by) FILTER (WHERE created_by IS NOT NULL)::BIGINT AS unique_signers
  FROM filtered_signatures;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_signature_audit_stats IS 
  'Get summary statistics for signature audit dashboard. Returns counts by type, method, and unique metrics.';

GRANT EXECUTE ON FUNCTION get_signature_audit_stats TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the RPC functions work correctly
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test get_signature_audit_logs (no filters)
  SELECT COUNT(*) AS log_count
  INTO test_result
  FROM get_signature_audit_logs(
    p_limit := 1
  );
  
  RAISE NOTICE 'Signature audit logs function test: % rows returned', test_result.log_count;
  
  -- Test get_signature_audit_stats (no filters)
  SELECT *
  INTO test_result
  FROM get_signature_audit_stats();
  
  RAISE NOTICE 'Signature audit stats function test: % total signatures', test_result.total_signatures;
END $$;
