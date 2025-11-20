-- Add RLS policy for facility admins to view users in their facility

CREATE POLICY "Facility admins can view users in their facility"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN user_facilities uf_admin ON uf_admin.user_id = auth.uid()
      JOIN user_facilities uf_user ON uf_user.user_id = users.id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'facility_admin'
      AND uf_admin.facility_id = uf_user.facility_id
    )
  );

-- Verify all SELECT policies on users table
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'users'
AND cmd = 'SELECT'
ORDER BY policyname;
