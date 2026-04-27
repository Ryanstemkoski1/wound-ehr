-- =====================================================
-- Migration 00036: Performance & FK Indexes
-- Date: April 27, 2026
-- Purpose: Cover missing foreign-key indexes flagged by
--   Postgres' index advisor and the audit. FK columns
--   without an index force seq scans on cascade / join.
--   All indexes are CONCURRENTLY-safe equivalents using
--   IF NOT EXISTS to keep the migration idempotent.
-- =====================================================

-- Signatures referenced from visits and patient_consents.
-- These are non-trivially populated (every signed visit) and
-- frequently joined when rendering visit detail pages.
CREATE INDEX IF NOT EXISTS idx_visits_provider_signature_id
  ON public.visits (provider_signature_id)
  WHERE provider_signature_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_patient_signature_id
  ON public.visits (patient_signature_id)
  WHERE patient_signature_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_consents_provider_sig
  ON public.patient_consents (provider_signature_id)
  WHERE provider_signature_id IS NOT NULL;

-- created_by columns used by RLS policies (auth.uid() check).
-- Without an index, every RLS filter does a seq scan.
CREATE INDEX IF NOT EXISTS idx_gtube_procedures_created_by
  ON public.gtube_procedures (created_by);

CREATE INDEX IF NOT EXISTS idx_grafting_assessments_created_by
  ON public.grafting_assessments (created_by);

CREATE INDEX IF NOT EXISTS idx_skin_sweep_assessments_created_by
  ON public.skin_sweep_assessments (created_by);

CREATE INDEX IF NOT EXISTS idx_debridement_assessments_created_by
  ON public.debridement_assessments (created_by);

-- Retention scan in delete_expired_audio() filters
-- visit_transcripts WHERE audio_url IS NOT NULL AND created_at < NOW()-90d.
-- Partial index keeps it small (only un-purged rows).
CREATE INDEX IF NOT EXISTS idx_visit_transcripts_retention
  ON public.visit_transcripts (created_at)
  WHERE audio_url IS NOT NULL;

-- Patient recording consent lookup happens on every audio upload.
-- Already has a partial index from 00034; add a covering version
-- for the (patient_id, ai_processing_consent_given) projection used
-- by the upload route.
CREATE INDEX IF NOT EXISTS idx_recording_consents_patient_active
  ON public.patient_recording_consents (patient_id)
  INCLUDE (ai_processing_consent_given)
  WHERE consent_given = true AND revoked_at IS NULL;
