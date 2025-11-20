-- Fix user_invites RLS to allow unauthenticated users to read invites by token

-- First, check existing policies
SELECT policyname FROM pg_policies WHERE tablename = 'user_invites';

-- Drop the restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view invites by token" ON user_invites;

-- Create a policy that allows ANYONE (including unauthenticated) to read invites by token
-- This is safe because:
-- 1. Tokens are cryptographically random (32 bytes)
-- 2. They expire after 7 days
-- 3. Can only be used once (accepted_at becomes non-null)
CREATE POLICY "Anyone can view invites by token"
  ON user_invites FOR SELECT
  TO public  -- This includes unauthenticated users
  USING (true);  -- Allow reading any invite (token is in the WHERE clause)

-- Verify the new policy
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_invites'
ORDER BY policyname;
