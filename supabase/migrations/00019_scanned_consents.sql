-- Migration: Add support for scanned/uploaded consent documents
-- Version: 00019
-- Date: November 21, 2025
-- Phase: 9.3.5 - Upload Scanned Paper Consents

-- =============================================================================
-- PATIENT CONSENTS TABLE UPDATES
-- =============================================================================

-- Add columns for uploaded consent documents
ALTER TABLE patient_consents 
ADD COLUMN IF NOT EXISTS consent_document_url TEXT,
ADD COLUMN IF NOT EXISTS consent_document_name TEXT,
ADD COLUMN IF NOT EXISTS consent_document_size INTEGER;

-- Add comment explaining the new columns
COMMENT ON COLUMN patient_consents.consent_document_url IS 
'Supabase Storage URL for scanned/uploaded consent documents (alternative to electronic signature)';

COMMENT ON COLUMN patient_consents.consent_document_name IS 
'Original filename of uploaded consent document';

COMMENT ON COLUMN patient_consents.consent_document_size IS 
'File size in bytes of uploaded consent document';

-- =============================================================================
-- SIGNATURES TABLE UPDATES
-- =============================================================================

-- Drop existing constraint if exists
ALTER TABLE signatures 
DROP CONSTRAINT IF EXISTS signatures_signature_method_check;

-- Add new constraint to support 'upload' method
ALTER TABLE signatures 
ADD CONSTRAINT signatures_signature_method_check 
CHECK (signature_method IN ('draw', 'type', 'upload'));

-- Update comment to reflect new method
COMMENT ON COLUMN signatures.signature_method IS 
'Method used for signature: draw (canvas), type (typed name), upload (scanned document)';

-- =============================================================================
-- STORAGE BUCKET (Note: This needs to be created via Supabase Dashboard or API)
-- =============================================================================

-- Create storage bucket for patient consents
-- Bucket name: patient-consents
-- Public: false (authenticated access only)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, image/jpeg, image/png

-- This SQL is for documentation - actual bucket creation via Dashboard:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('patient-consents', 'patient-consents', false)
-- ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS POLICIES FOR STORAGE
-- =============================================================================

-- Users can upload consents for their facility's patients
-- (To be configured in Supabase Dashboard Storage Policies)

-- Policy: Allow authenticated users to upload
-- INSERT policy on storage.objects for patient-consents bucket
-- Check: user is authenticated and has access to the facility

-- Policy: Allow users to read consents for their patients
-- SELECT policy on storage.objects for patient-consents bucket
-- Check: user has access to the patient's facility

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify columns added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'patient_consents' 
  AND column_name IN ('consent_document_url', 'consent_document_name', 'consent_document_size')
ORDER BY ordinal_position;

-- Verify constraint updated
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'signatures_signature_method_check';
