-- =====================================================
-- Migration 00027: AI Transcription Tables
-- Phase 11.1.2 - Database Schema & Storage Setup
-- Date: March 7, 2026
-- Purpose: Support AI-powered clinical note generation
--          using OpenAI Whisper + GPT-4
-- =====================================================

-- 1. VISIT TRANSCRIPTS TABLE
-- Stores transcription data, AI-generated notes, and processing state
CREATE TABLE IF NOT EXISTS visit_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,

  -- Audio file metadata
  audio_url TEXT,                    -- Supabase Storage path (visit-audio/{visitId}/...)
  audio_filename TEXT,
  audio_size_bytes INTEGER,
  audio_duration_seconds INTEGER,

  -- Transcription data
  transcript_raw TEXT,               -- Full verbatim transcript from Whisper
  transcript_clinical TEXT,          -- AI-generated clinical note from GPT-4
  transcript_metadata JSONB,         -- Timestamps, language, confidence, etc.

  -- Processing status
  ai_service TEXT DEFAULT 'openai',  -- Which AI service used
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN (
      'pending',      -- Audio uploaded, waiting for processing
      'processing',   -- Whisper/GPT-4 currently working
      'completed',    -- Transcription + clinical note ready
      'failed',       -- Error occurred during processing
      'deleted'       -- Soft-deleted (audio removed, transcript kept)
    )),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Clinician review workflow
  clinician_edited BOOLEAN DEFAULT FALSE,   -- Did clinician modify AI note?
  clinician_approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  final_note TEXT,                          -- Final clinician-approved version

  -- Cost tracking
  cost_transcription DECIMAL(10, 4),  -- Whisper cost in USD
  cost_llm DECIMAL(10, 4),           -- GPT-4 cost in USD

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE visit_transcripts IS
  'AI transcription records: audio → Whisper transcript → GPT-4 clinical note → clinician review';
COMMENT ON COLUMN visit_transcripts.transcript_raw IS
  'Verbatim transcript from OpenAI Whisper. Contains full conversation text.';
COMMENT ON COLUMN visit_transcripts.transcript_clinical IS
  'AI-generated structured clinical note from GPT-4. Draft until clinician approves.';
COMMENT ON COLUMN visit_transcripts.final_note IS
  'Clinician-approved note. May differ from AI draft if edited.';
COMMENT ON COLUMN visit_transcripts.processing_status IS
  'Workflow: pending → processing → completed/failed. deleted = soft-delete.';

-- Indexes
CREATE INDEX idx_visit_transcripts_visit_id
  ON visit_transcripts(visit_id);
CREATE INDEX idx_visit_transcripts_status
  ON visit_transcripts(processing_status);
CREATE INDEX idx_visit_transcripts_created_at
  ON visit_transcripts(created_at DESC);
CREATE INDEX idx_visit_transcripts_approved
  ON visit_transcripts(clinician_approved_at)
  WHERE clinician_approved_at IS NOT NULL;


-- 2. PATIENT RECORDING CONSENTS TABLE
-- One-time consent per patient for audio recording during visits
CREATE TABLE IF NOT EXISTS patient_recording_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Consent details
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_text TEXT NOT NULL,          -- Full consent form text shown to patient
  consent_version TEXT NOT NULL DEFAULT '1.0',

  -- Signature (reuse existing signature system)
  signature_id UUID REFERENCES signatures(id),
  consented_at TIMESTAMPTZ,

  -- Expiration and revocation
  expires_at TIMESTAMPTZ,              -- Optional: annual renewal
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One active consent record per patient
  UNIQUE(patient_id)
);

COMMENT ON TABLE patient_recording_consents IS
  'Patient consent for audio recording during visits. Required before AI transcription.';
COMMENT ON COLUMN patient_recording_consents.consent_version IS
  'Track consent form versions for compliance. Increment when consent language changes.';

-- Indexes
CREATE INDEX idx_patient_recording_consents_patient_id
  ON patient_recording_consents(patient_id);
CREATE INDEX idx_patient_recording_consents_active
  ON patient_recording_consents(consent_given, revoked_at)
  WHERE consent_given = TRUE AND revoked_at IS NULL;


-- 3. ADD AI TRANSCRIPT COLUMNS TO VISITS TABLE
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS has_ai_transcript BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_transcript_id UUID REFERENCES visit_transcripts(id),
  ADD COLUMN IF NOT EXISTS ai_note_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clinician_notes_manual TEXT;

COMMENT ON COLUMN visits.has_ai_transcript IS
  'TRUE if this visit has an AI-generated transcript/note';
COMMENT ON COLUMN visits.ai_transcript_id IS
  'FK to visit_transcripts. The active transcript record for this visit.';
COMMENT ON COLUMN visits.ai_note_approved IS
  'TRUE if clinician has reviewed and approved the AI-generated note';
COMMENT ON COLUMN visits.clinician_notes_manual IS
  'Manual notes field for clinicians who opt out of AI recording';


-- 4. ROW LEVEL SECURITY
ALTER TABLE visit_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_recording_consents ENABLE ROW LEVEL SECURITY;

-- RLS: Only assigned clinician, visit creator, and admins can access transcripts
CREATE POLICY "Users can access their visit transcripts"
ON visit_transcripts FOR ALL
USING (
  -- Admins can access all
  auth.uid() IN (
    SELECT user_id FROM user_roles
    WHERE role IN ('tenant_admin', 'facility_admin')
  )
  OR
  -- Assigned clinician can access
  auth.uid() IN (
    SELECT primary_clinician_id FROM visits
    WHERE id = visit_transcripts.visit_id
  )
  OR
  -- Visit creator / performing clinician can access
  auth.uid() IN (
    SELECT clinician_id FROM visits
    WHERE id = visit_transcripts.visit_id
  )
);

-- RLS: Users can manage consents for patients in their facilities
CREATE POLICY "Users can manage recording consents for their patients"
ON patient_recording_consents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM patients p
    INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE p.id = patient_recording_consents.patient_id
    AND uf.user_id = auth.uid()
  )
);


-- 5. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_visit_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_visit_transcripts_updated_at
  BEFORE UPDATE ON visit_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_transcripts_updated_at();

CREATE OR REPLACE FUNCTION update_patient_recording_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_patient_recording_consents_updated_at
  BEFORE UPDATE ON patient_recording_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_recording_consents_updated_at();
