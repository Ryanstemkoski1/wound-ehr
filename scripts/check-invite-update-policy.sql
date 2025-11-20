-- Check if user_invites has an UPDATE policy for marking invites as accepted

SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'user_invites'
AND cmd = 'UPDATE'
ORDER BY policyname;
