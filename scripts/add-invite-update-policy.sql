-- Add missing UPDATE policy for user_invites

-- Allow authenticated users to update invites (mark as accepted)
-- This is needed when a user accepts an invite
CREATE POLICY "Users can accept their own invites"
  ON user_invites FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Verify all policies are now in place
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read invites'
    WHEN cmd = 'INSERT' THEN 'Create invites'
    WHEN cmd = 'UPDATE' THEN 'Accept invites'
    WHEN cmd = 'DELETE' THEN 'Delete invites'
  END as purpose
FROM pg_policies
WHERE tablename = 'user_invites'
ORDER BY cmd, policyname;
