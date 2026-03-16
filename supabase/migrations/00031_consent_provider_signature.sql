-- Migration: 00031_consent_provider_signature
-- Description: Add provider_signature_id column to patient_consents table
--              so the provider/clinician signature for consent-to-treatment
--              is properly persisted alongside patient and witness signatures.

ALTER TABLE patient_consents
  ADD COLUMN IF NOT EXISTS provider_signature_id UUID REFERENCES signatures(id);

CREATE INDEX IF NOT EXISTS idx_patient_consents_provider_sig
  ON patient_consents(provider_signature_id);
