-- Migration: Make wound-photos bucket private (HIPAA compliance)
-- Previously public with "Anyone can view" policy — PHI exposure risk

-- 1. Make the bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'wound-photos';

-- 2. Drop the overly permissive "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;

-- 3. Create a restrictive SELECT policy — only authenticated users can view
CREATE POLICY "Authenticated users can view wound photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wound-photos'
    AND auth.role() = 'authenticated'
  );

-- Note: INSERT/UPDATE/DELETE policies already require authentication
-- and are unchanged by this migration.
