-- Migration: Add electronic signatures system
-- Version: 4.0
-- Date: November 18, 2025
-- Purpose: Implement consent, patient, and provider signature workflows for compliance

-- =====================================================
-- TABLE: signatures
-- =====================================================
CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_type TEXT NOT NULL CHECK (signature_type IN ('patient', 'provider', 'consent')),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT, -- 'RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Patient', 'Guardian'
  signature_data TEXT NOT NULL, -- Base64 encoded signature image OR typed name
  signature_method TEXT NOT NULL CHECK (signature_method IN ('draw', 'type', 'upload')),
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.signatures IS 
  'Electronic signatures for consent, patient, and provider signing. Stores base64 image data with audit trail.';

COMMENT ON COLUMN public.signatures.signature_type IS 
  'Type of signature: consent (initial consent-to-treat), patient (end-of-visit signature for RN/LVN), provider (clinician signature on all visits)';

COMMENT ON COLUMN public.signatures.signature_data IS 
  'Base64 encoded PNG image of signature OR plain text typed name (with signature_method indicating which)';

-- Indexes for performance
CREATE INDEX idx_signatures_visit_id ON public.signatures(visit_id);
CREATE INDEX idx_signatures_patient_id ON public.signatures(patient_id);
CREATE INDEX idx_signatures_type ON public.signatures(signature_type);
CREATE INDEX idx_signatures_created_by ON public.signatures(created_by);

-- =====================================================
-- TABLE: patient_consents
-- =====================================================
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'initial_treatment',
  consent_text TEXT NOT NULL, -- Full consent form text shown to patient at time of signing
  patient_signature_id UUID REFERENCES signatures(id),
  witness_signature_id UUID REFERENCES signatures(id), -- Optional witness signature
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_patient_consent UNIQUE(patient_id, consent_type)
);

COMMENT ON TABLE public.patient_consents IS 
  'Patient consent forms with signatures. Initial consent-to-treat is required before first visit.';

COMMENT ON COLUMN public.patient_consents.consent_text IS 
  'Complete consent form text that was shown to patient. Stored for legal/audit purposes.';

-- Index for looking up patient consent
CREATE INDEX idx_patient_consents_patient_id ON public.patient_consents(patient_id);
CREATE INDEX idx_patient_consents_type ON public.patient_consents(consent_type);

-- =====================================================
-- UPDATE TABLE: visits (Add signature columns)
-- =====================================================

-- Add visit status column (default to draft for new visits)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
  CHECK (status IN ('draft', 'ready_for_signature', 'signed', 'submitted', 'incomplete', 'complete'));

-- Add flag for whether patient signature is required (auto-set based on provider credentials)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS requires_patient_signature BOOLEAN DEFAULT false;

-- Add foreign keys to signature records
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS provider_signature_id UUID REFERENCES signatures(id);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS patient_signature_id UUID REFERENCES signatures(id);

-- Add clinician info for PDF printing
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS clinician_name TEXT;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS clinician_credentials TEXT;

COMMENT ON COLUMN public.visits.status IS 
  'Visit workflow status: draft (being edited), ready_for_signature (assessments done), signed (provider signed), submitted (final, sent to office)';

COMMENT ON COLUMN public.visits.requires_patient_signature IS 
  'TRUE if visit requires patient signature (RN/LVN visits only). Auto-set based on provider credentials.';

COMMENT ON COLUMN public.visits.clinician_name IS 
  'Full name of clinician who documented this visit. For printing on PDFs.';

COMMENT ON COLUMN public.visits.clinician_credentials IS 
  'Clinical credentials of documenting clinician (RN, LVN, MD, etc). For printing on PDFs.';

-- Indexes for visit queries
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_provider_signature ON public.visits(provider_signature_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_signature ON public.visits(patient_signature_id);

-- =====================================================
-- RLS POLICIES: signatures
-- =====================================================
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Users can view signatures for patients in their accessible facilities
CREATE POLICY "Users can view signatures"
  ON public.signatures FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON uf.facility_id = p.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Users can create signatures
CREATE POLICY "Users can create signatures"
  ON public.signatures FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
  );

-- Cannot update or delete signatures (immutable for audit trail)
-- No UPDATE or DELETE policies intentionally

COMMENT ON POLICY "Users can view signatures" ON public.signatures IS
  'Users can view signatures for patients in facilities they have access to';

COMMENT ON POLICY "Users can create signatures" ON public.signatures IS
  'Authenticated users can create signatures. Signatures are immutable after creation.';

-- =====================================================
-- RLS POLICIES: patient_consents
-- =====================================================
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- Users can view consents for patients in their accessible facilities
CREATE POLICY "Users can view patient consents"
  ON public.patient_consents FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON uf.facility_id = p.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Users can create consents
CREATE POLICY "Users can create patient consents"
  ON public.patient_consents FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
  );

-- Cannot update or delete consents (immutable)
-- No UPDATE or DELETE policies intentionally

COMMENT ON POLICY "Users can view patient consents" ON public.patient_consents IS
  'Users can view consents for patients in facilities they have access to';

COMMENT ON POLICY "Users can create patient consents" ON public.patient_consents IS
  'Authenticated users can create consents. Consents are immutable after creation.';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if patient has valid consent
CREATE OR REPLACE FUNCTION has_patient_consent(
  p_patient_id UUID,
  p_consent_type TEXT DEFAULT 'initial_treatment'
) RETURNS BOOLEAN AS $$
DECLARE
  consent_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id
    AND consent_type = p_consent_type
    AND patient_signature_id IS NOT NULL
  ) INTO consent_exists;
  
  RETURN consent_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_patient_consent IS 
  'Check if patient has a valid signed consent form';

-- Function to check if visit is ready for signature
CREATE OR REPLACE FUNCTION is_visit_ready_for_signature(
  p_visit_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  has_assessments BOOLEAN;
  visit_status TEXT;
BEGIN
  -- Check if visit has at least one assessment
  SELECT EXISTS(
    SELECT 1 FROM assessments
    WHERE visit_id = p_visit_id
  ) INTO has_assessments;
  
  -- Get visit status
  SELECT status INTO visit_status FROM visits WHERE id = p_visit_id;
  
  -- Ready if has assessments and status is draft or ready_for_signature
  RETURN has_assessments AND visit_status IN ('draft', 'ready_for_signature');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_visit_ready_for_signature IS 
  'Check if visit has assessments and is in correct status for signing';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
DO $$
DECLARE
  signatures_count INT;
  consents_count INT;
  visits_with_status INT;
BEGIN
  SELECT COUNT(*) INTO signatures_count FROM signatures;
  SELECT COUNT(*) INTO consents_count FROM patient_consents;
  SELECT COUNT(*) INTO visits_with_status FROM visits WHERE status IS NOT NULL;
  
  RAISE NOTICE '=== MIGRATION 00014 VERIFICATION ===';
  RAISE NOTICE 'Signatures table: % records', signatures_count;
  RAISE NOTICE 'Patient consents table: % records', consents_count;
  RAISE NOTICE 'Visits with status: %', visits_with_status;
  RAISE NOTICE '✓ Electronic signatures system installed';
END $$;

SELECT '✓ Migration 00014 completed successfully' as status;
