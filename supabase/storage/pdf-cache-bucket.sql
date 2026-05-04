-- Supabase Storage Setup for PDF Cache
-- Run this in Supabase Dashboard > Storage > SQL Editor
-- OR apply via Supabase migrations before deploying pdf-cache functionality.
--
-- The pdf-cache bucket MUST exist before pdf-cache.ts is used.
-- It is intentionally NOT created at runtime to keep service-role
-- permissions narrow and avoid race conditions.

/*
MANUAL STEPS (Supabase Dashboard):

1. Navigate to Storage in left sidebar
2. Click "Create new bucket"
3. Bucket name: pdf-cache
4. Settings:
   - Public bucket: NO (keep private)
   - File size limit: 10 MB
   - Allowed MIME types: application/pdf

5. Click "Create bucket"
*/

-- Storage RLS Policies (Run these after bucket is created)

-- Policy 1: Authenticated users can read cached PDFs
CREATE POLICY "Authenticated users can read pdf cache"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdf-cache');

-- Policy 2: Service role can write/delete cached PDFs (server-side only)
-- The application server uses the anon/service key to upload via server actions
-- so no INSERT policy is needed for the authenticated role.
-- If using server-side uploads with the service role key, no RLS applies.
