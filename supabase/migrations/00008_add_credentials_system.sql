-- Migration: Add credentials system to support clinical role enforcement
-- Version: 4.0
-- Date: November 18, 2025
-- Purpose: Enable procedure restrictions and signature requirements based on credentials

-- Add credentials column to users table
ALTER TABLE public.users ADD COLUMN credentials TEXT;

-- Add constraint for valid credentials
ALTER TABLE public.users ADD CONSTRAINT users_credentials_check 
  CHECK (credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin'));

-- Add index for credential-based queries
CREATE INDEX idx_users_credentials ON public.users(credentials);

-- Add comment explaining the credentials system
COMMENT ON COLUMN public.users.credentials IS 
  'Clinical credentials of the user. Required field. Options: RN (Registered Nurse), LVN (Licensed Vocational Nurse), MD (Medical Doctor), DO (Doctor of Osteopathic Medicine), PA (Physician Assistant), NP (Nurse Practitioner), CNA (Certified Nursing Assistant), Admin (Administrative staff with no clinical privileges)';

-- Update existing users to have Admin credentials (for safety)
-- This ensures no existing users are locked out
UPDATE public.users SET credentials = 'Admin' WHERE credentials IS NULL;

-- Make credentials NOT NULL after setting defaults
ALTER TABLE public.users ALTER COLUMN credentials SET NOT NULL;

-- Add credentials to user_invites table for invite flow
ALTER TABLE public.user_invites ADD COLUMN credentials TEXT;

-- Update existing invites to have Admin credentials (for safety)
-- This ensures no existing pending invites are broken
UPDATE public.user_invites SET credentials = 'Admin' WHERE credentials IS NULL;

-- Add constraint for valid credentials in invites
ALTER TABLE public.user_invites ADD CONSTRAINT user_invites_credentials_check 
  CHECK (credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin'));

-- Make credentials required for new invites
ALTER TABLE public.user_invites ALTER COLUMN credentials SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.user_invites.credentials IS 
  'Clinical credentials that will be assigned to the user upon accepting the invite';

-- =====================================================
-- PROCEDURE SCOPES TABLE
-- =====================================================

-- Table to define which credentials can perform which procedures
CREATE TABLE IF NOT EXISTS public.procedure_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT NOT NULL UNIQUE,
  procedure_name TEXT NOT NULL,
  allowed_credentials TEXT[] NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.procedure_scopes IS 
  'Defines which clinical credentials can perform specific procedures. Used to filter treatment options and enforce scope of practice.';

-- Indexes
CREATE INDEX idx_procedure_scopes_code ON public.procedure_scopes(procedure_code);
CREATE INDEX idx_procedure_scopes_category ON public.procedure_scopes(category);

-- Enable RLS
ALTER TABLE public.procedure_scopes ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view (needed for filtering)
CREATE POLICY "Authenticated users can view procedure scopes"
  ON public.procedure_scopes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only tenant admins can modify
CREATE POLICY "Tenant admins can manage procedure scopes"
  ON public.procedure_scopes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'tenant_admin'
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_procedure_scopes_updated_at
  BEFORE UPDATE ON public.procedure_scopes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED PROCEDURE SCOPE DATA
-- =====================================================

-- Sharp Debridement (MD/DO/PA/NP ONLY - NOT RN/LVN)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
('11042', 'Debridement - Subcutaneous Tissue', ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 'Sharp debridement of subcutaneous tissue (first 20 sq cm or less)'),
('11043', 'Debridement - Muscle/Fascia', ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 'Sharp debridement of muscle and/or fascia (first 20 sq cm or less)'),
('11044', 'Debridement - Bone', ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 'Sharp debridement of bone (first 20 sq cm or less)'),
('11045', 'Debridement - Subcutaneous (Add-on)', ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 'Sharp debridement of subcutaneous tissue (each additional 20 sq cm)'),
('11046', 'Debridement - Muscle/Fascia (Add-on)', ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 'Sharp debridement of muscle and/or fascia (each additional 20 sq cm)'),
('11047', 'Debridement - Bone (Add-on)', ARRAY['MD', 'DO', 'PA', 'NP'], 'debridement', 'Sharp debridement of bone (each additional 20 sq cm)');

-- Selective Debridement (ALL CREDENTIALS including RN/LVN)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
('97597', 'Selective Debridement - First 20 sq cm', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'debridement', 'Selective debridement (e.g., high pressure waterjet, sharp selective debridement with scissors, scalpel and tweezers)'),
('97598', 'Selective Debridement - Each Additional 20 sq cm', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'debridement', 'Selective debridement, each additional 20 sq cm');

-- Negative Pressure Wound Therapy (ALL CREDENTIALS)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
('97605', 'NPWT - ≤50 sq cm', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 'Negative pressure wound therapy (vacuum assisted drainage), total wound surface area ≤50 sq cm'),
('97606', 'NPWT - >50 sq cm', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 'Negative pressure wound therapy, total wound surface area >50 sq cm'),
('97607', 'NPWT Dressing Change - ≤50 sq cm', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 'Negative pressure wound therapy dressing change, total wound surface area ≤50 sq cm'),
('97608', 'NPWT Dressing Change - >50 sq cm', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 'Negative pressure wound therapy dressing change, total wound surface area >50 sq cm');

-- Active Wound Care Management (ALL CREDENTIALS)
INSERT INTO public.procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
('97602', 'Non-Selective Debridement', ARRAY['MD', 'DO', 'PA', 'NP', 'RN', 'LVN'], 'wound_care', 'Removal of devitalized tissue, non-selective debridement (wet-to-moist dressings, enzymatic, abrasion)');

-- Note: More procedures will be added once RN/LVN workflow templates are received from Alvin's team

-- =====================================================
-- HELPER FUNCTION
-- =====================================================

-- Function to check if credentials allow a procedure
CREATE OR REPLACE FUNCTION can_perform_procedure(
  user_credentials TEXT,
  procedure_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  allowed_credentials TEXT[];
BEGIN
  SELECT ps.allowed_credentials INTO allowed_credentials
  FROM procedure_scopes ps
  WHERE ps.procedure_code = can_perform_procedure.procedure_code;
  
  -- If procedure not found, allow by default
  IF allowed_credentials IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user's credentials are in allowed list
  RETURN user_credentials = ANY(allowed_credentials);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_perform_procedure IS 
  'Checks if user credentials allow performing a specific procedure. Returns TRUE if allowed.';

