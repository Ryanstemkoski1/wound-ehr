-- Migration: Add procedure scopes for credential-based restrictions
-- Version: 4.2
-- Date: November 19, 2025
-- Purpose: Enforce RN/LVN cannot document sharp debridement procedures

-- =====================================================
-- TABLE: procedure_scopes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.procedure_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT NOT NULL UNIQUE,
  procedure_name TEXT NOT NULL,
  allowed_credentials TEXT[] NOT NULL,
  category TEXT CHECK (category IN ('debridement', 'wound_care', 'diagnostic', 'preventive', 'advanced_therapy', 'other')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.procedure_scopes IS 
  'Maps CPT procedure codes to allowed clinical credentials. Enforces scope of practice restrictions.';

COMMENT ON COLUMN public.procedure_scopes.procedure_code IS 
  'CPT code for the procedure (e.g., 11042, 97597)';

COMMENT ON COLUMN public.procedure_scopes.allowed_credentials IS 
  'Array of credentials allowed to perform/document this procedure. Example: {MD, DO, PA, NP} for sharp debridement';

COMMENT ON COLUMN public.procedure_scopes.category IS 
  'Procedure category for filtering and grouping';

-- Indexes for performance
CREATE INDEX idx_procedure_scopes_code ON public.procedure_scopes(procedure_code);
CREATE INDEX idx_procedure_scopes_category ON public.procedure_scopes(category);

-- =====================================================
-- SEED DATA: Initial procedure scope definitions
-- =====================================================

-- Sharp Debridement (RESTRICTED: MD/DO/PA/NP ONLY)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('11042', 'Debridement, subcutaneous tissue (including epidermis and dermis, if performed); first 20 sq cm or less', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 
   'Sharp surgical debridement - requires MD/DO/PA/NP credentials'),
  
  ('11043', 'Debridement, muscle and/or fascia (includes epidermis, dermis, and subcutaneous tissue, if performed); first 20 sq cm or less', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 
   'Sharp surgical debridement - requires MD/DO/PA/NP credentials'),
  
  ('11044', 'Debridement, bone (includes epidermis, dermis, subcutaneous tissue, muscle and/or fascia, if performed); first 20 sq cm or less', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 
   'Sharp surgical debridement - requires MD/DO/PA/NP credentials'),
  
  ('11045', 'Debridement, subcutaneous tissue (including epidermis and dermis, if performed); each additional 20 sq cm', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 
   'Sharp surgical debridement - requires MD/DO/PA/NP credentials'),
  
  ('11046', 'Debridement, muscle and/or fascia (includes epidermis, dermis, and subcutaneous tissue, if performed); each additional 20 sq cm', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 
   'Sharp surgical debridement - requires MD/DO/PA/NP credentials'),
  
  ('11047', 'Debridement, bone (includes epidermis, dermis, subcutaneous tissue, muscle and/or fascia, if performed); each additional 20 sq cm', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 
   'Sharp surgical debridement - requires MD/DO/PA/NP credentials');

-- Selective Debridement (ALL credentials)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('97597', 'Debridement (eg, high pressure waterjet with/without suction, sharp selective debridement with scissors, scalpel and forceps), open wound, (eg, fibrin, devitalized epidermis and/or dermis, exudate, debris, biofilm), including topical application(s), wound assessment, use of a whirlpool, when performed and instruction(s) for ongoing care, per session, total wound(s) surface area; first 20 sq cm or less', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'debridement', 
   'Selective debridement - all credentials allowed'),
  
  ('97598', 'Debridement (eg, high pressure waterjet with/without suction, sharp selective debridement with scissors, scalpel and forceps), open wound, (eg, fibrin, devitalized epidermis and/or dermis, exudate, debris, biofilm), including topical application(s), wound assessment, use of a whirlpool, when performed and instruction(s) for ongoing care, per session, total wound(s) surface area; each additional 20 sq cm or part thereof', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'debridement', 
   'Selective debridement - all credentials allowed');

-- Negative Pressure Wound Therapy (ALL credentials)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('97605', 'Negative pressure wound therapy (eg, vacuum assisted drainage collection), utilizing durable medical equipment (DME), including topical application(s), wound assessment, and instruction(s) for ongoing care, per session; total wound(s) surface area less than or equal to 50 square centimeters', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'advanced_therapy', 
   'NPWT application - all credentials allowed'),
  
  ('97606', 'Negative pressure wound therapy (eg, vacuum assisted drainage collection), utilizing durable medical equipment (DME), including topical application(s), wound assessment, and instruction(s) for ongoing care, per session; total wound(s) surface area greater than 50 square centimeters', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'advanced_therapy', 
   'NPWT application - all credentials allowed'),
  
  ('97607', 'Negative pressure wound therapy, (eg, vacuum assisted drainage collection), utilizing disposable, non-durable medical equipment including provision of exudate management collection system, topical application(s), wound assessment, and instructions for ongoing care, per session; total wound(s) surface area less than or equal to 50 square centimeters', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'advanced_therapy', 
   'NPWT application (disposable) - all credentials allowed'),
  
  ('97608', 'Negative pressure wound therapy, (eg, vacuum assisted drainage collection), utilizing disposable, non-durable medical equipment including provision of exudate management collection system, topical application(s), wound assessment, and instructions for ongoing care, per session; total wound(s) surface area greater than 50 square centimeters', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'advanced_therapy', 
   'NPWT application (disposable) - all credentials allowed');

-- Active Wound Care Management (ALL credentials)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('97602', 'Removal of devitalized tissue from wound(s), non-selective debridement, without anesthesia (eg, wet-to-moist dressings, enzymatic, abrasion, larval therapy), including topical application(s), wound assessment, and instruction(s) for ongoing care, per session', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 
   'Non-selective debridement - all credentials allowed');

-- Application of Skin Substitute Grafts (RESTRICTED: MD/DO/PA/NP)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('15271', 'Application of skin substitute graft to trunk, arms, legs, total wound surface area up to 100 sq cm; first 25 sq cm or less wound surface area', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'advanced_therapy', 
   'Graft application - requires MD/DO/PA/NP credentials'),
  
  ('15272', 'Application of skin substitute graft to trunk, arms, legs, total wound surface area up to 100 sq cm; each additional 25 sq cm wound surface area', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'advanced_therapy', 
   'Graft application - requires MD/DO/PA/NP credentials'),
  
  ('15273', 'Application of skin substitute graft to trunk, arms, legs, total wound surface area greater than or equal to 100 sq cm; first 100 sq cm wound surface area, or 1% of body area of infants and children', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'advanced_therapy', 
   'Graft application - requires MD/DO/PA/NP credentials'),
  
  ('15274', 'Application of skin substitute graft to trunk, arms, legs, total wound surface area greater than or equal to 100 sq cm; each additional 100 sq cm wound surface area', 
   ARRAY['MD', 'DO', 'PA', 'NP'], 'advanced_therapy', 
   'Graft application - requires MD/DO/PA/NP credentials');

-- Wound Care Evaluation and Management (ALL credentials)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('99211', 'Office or other outpatient visit for the evaluation and management of an established patient, that may not require the presence of a physician or other qualified health care professional', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 
   'Established patient visit - all credentials allowed'),
  
  ('99212', 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and straightforward medical decision making', 
   ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 
   'Established patient visit - all credentials allowed');

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.procedure_scopes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read procedure scopes
CREATE POLICY "Users can view procedure scopes"
  ON public.procedure_scopes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only tenant admins can modify procedure scopes
CREATE POLICY "Tenant admins can manage procedure scopes"
  ON public.procedure_scopes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'tenant_admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user's credentials allow a specific procedure
CREATE OR REPLACE FUNCTION can_perform_procedure(
  user_credentials TEXT,
  cpt_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed_creds TEXT[];
BEGIN
  -- Get allowed credentials for this procedure
  SELECT allowed_credentials INTO allowed_creds
  FROM procedure_scopes
  WHERE procedure_code = cpt_code;
  
  -- If procedure not found in scopes, allow (default permissive)
  IF allowed_creds IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user's credentials are in the allowed list
  RETURN user_credentials = ANY(allowed_creds);
END;
$$;

COMMENT ON FUNCTION can_perform_procedure IS 
  'Check if a user with given credentials can perform a specific CPT procedure. Returns TRUE if allowed, FALSE if restricted.';

-- Function to get all allowed procedures for a credential
CREATE OR REPLACE FUNCTION get_allowed_procedures(
  user_credentials TEXT
)
RETURNS TABLE (
  procedure_code TEXT,
  procedure_name TEXT,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.procedure_code,
    ps.procedure_name,
    ps.category
  FROM procedure_scopes ps
  WHERE user_credentials = ANY(ps.allowed_credentials)
  ORDER BY ps.category, ps.procedure_code;
END;
$$;

COMMENT ON FUNCTION get_allowed_procedures IS 
  'Get all procedures that a user with given credentials is allowed to perform/document.';

-- Function to get restricted procedures for a credential
CREATE OR REPLACE FUNCTION get_restricted_procedures(
  user_credentials TEXT
)
RETURNS TABLE (
  procedure_code TEXT,
  procedure_name TEXT,
  category TEXT,
  required_credentials TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.procedure_code,
    ps.procedure_name,
    ps.category,
    ps.allowed_credentials
  FROM procedure_scopes ps
  WHERE NOT (user_credentials = ANY(ps.allowed_credentials))
  ORDER BY ps.category, ps.procedure_code;
END;
$$;

COMMENT ON FUNCTION get_restricted_procedures IS 
  'Get all procedures that a user with given credentials is NOT allowed to perform/document.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_perform_procedure TO authenticated;
GRANT EXECUTE ON FUNCTION get_allowed_procedures TO authenticated;
GRANT EXECUTE ON FUNCTION get_restricted_procedures TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table created
-- SELECT * FROM procedure_scopes ORDER BY category, procedure_code;

-- Test function: Check if RN can perform sharp debridement
-- SELECT can_perform_procedure('RN', '11042'); -- Should return FALSE

-- Test function: Check if MD can perform sharp debridement
-- SELECT can_perform_procedure('MD', '11042'); -- Should return TRUE

-- Test function: Check if RN can perform selective debridement
-- SELECT can_perform_procedure('RN', '97597'); -- Should return TRUE

-- Get all allowed procedures for RN
-- SELECT * FROM get_allowed_procedures('RN');

-- Get all restricted procedures for RN
-- SELECT * FROM get_restricted_procedures('RN');
