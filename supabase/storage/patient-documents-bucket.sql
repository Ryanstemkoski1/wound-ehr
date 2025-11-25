-- Supabase Storage Setup for Patient Documents
-- Run this in Supabase Dashboard > Storage > SQL Editor
-- OR run via scripts/setup-document-storage.js

-- Note: Storage buckets are managed via Supabase Dashboard UI or Management API
-- This file documents the configuration needed

/*
MANUAL STEPS (Supabase Dashboard):

1. Navigate to Storage in left sidebar
2. Click "Create new bucket"
3. Bucket name: patient-documents
4. Settings:
   - Public bucket: NO (keep private)
   - File size limit: 10 MB
   - Allowed MIME types: application/pdf, image/jpeg, image/png, image/gif, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
   
5. Click "Create bucket"
*/

-- Storage RLS Policies (Run these after bucket is created)

-- Policy 1: Users can upload documents for patients in their facilities
CREATE POLICY "Users can upload patient documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM patients p
    INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE uf.user_id = auth.uid()
  )
);

-- Policy 2: Users can view documents for patients in their facilities
CREATE POLICY "Users can view patient documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM patients p
    INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE uf.user_id = auth.uid()
  )
);

-- Policy 3: Users can delete their own uploaded documents
CREATE POLICY "Users can delete their uploaded documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND owner = auth.uid()
);

-- Policy 4: Admins can manage all documents in their tenant
CREATE POLICY "Admins can manage patient documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND EXISTS (
    SELECT 1
    FROM patients p
    INNER JOIN facilities f ON p.facility_id = f.id
    INNER JOIN user_facilities uf ON f.id = uf.facility_id
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND uf.user_id = auth.uid()
      AND (SELECT role FROM get_user_role_info(auth.uid())) IN ('tenant_admin', 'facility_admin')
  )
);

-- Verify bucket exists (returns error if not created yet)
SELECT * FROM storage.buckets WHERE name = 'patient-documents';
