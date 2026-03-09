-- Supabase Storage Setup for Visit Audio Recordings
-- Phase 11.1.2 - AI Transcription Storage
-- Date: March 7, 2026
--
-- Note: Storage buckets are managed via Supabase Dashboard UI or Management API
-- This file documents the configuration and RLS policies needed

/*
MANUAL STEPS (Supabase Dashboard):

1. Navigate to Storage in left sidebar
2. Click "Create new bucket"
3. Bucket name: visit-audio
4. Settings:
   - Public bucket: NO (keep private — PHI)
   - File size limit: 500 MB (supports ~1 hour of audio at 128kbps)
   - Allowed MIME types:
     - audio/webm
     - audio/mp4
     - audio/wav
     - audio/mpeg
     - audio/ogg

5. Click "Create bucket"

FOLDER STRUCTURE:
  visit-audio/
    {visitId}/
      {timestamp}_{filename}.webm

RETENTION:
  - Audio files auto-deleted after 90 days (cron job / Edge Function)
  - Transcripts and clinical notes kept permanently (medical record)
*/

-- Storage RLS Policies (Run these after bucket is created)

-- Policy 1: Authenticated users can upload audio for visits in their facilities
CREATE POLICY "Users can upload visit audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'visit-audio'
  AND EXISTS (
    SELECT 1 FROM visits v
    INNER JOIN patients p ON v.patient_id = p.id
    INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE v.id = ((storage.foldername(name))[1])::uuid
    AND uf.user_id = auth.uid()
  )
);

-- Policy 2: Assigned clinician + admins can view/download audio
CREATE POLICY "Users can view visit audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'visit-audio'
  AND (
    -- Admins can access all audio in their facilities
    EXISTS (
      SELECT 1 FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      INNER JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE v.id = ((storage.foldername(name))[1])::uuid
      AND uf.user_id = auth.uid()
      AND ur.role IN ('tenant_admin', 'facility_admin')
    )
    OR
    -- Assigned clinician or visit performer can access
    EXISTS (
      SELECT 1 FROM visits v
      WHERE v.id = ((storage.foldername(name))[1])::uuid
      AND (v.primary_clinician_id = auth.uid() OR v.clinician_id = auth.uid())
    )
  )
);

-- Policy 3: Only admins can delete audio files (for retention management)
CREATE POLICY "Admins can delete visit audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'visit-audio'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('tenant_admin')
  )
);

-- Verify bucket exists
-- SELECT * FROM storage.buckets WHERE name = 'visit-audio';
