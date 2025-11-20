-- Replace the complex RLS policy with a simpler one

-- Drop the existing policy
DROP POLICY IF EXISTS "Facility admins can view users in their facility" ON users;

-- Create a simpler policy that checks facility membership directly
CREATE POLICY "Facility admins can view users in their facility"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- User is viewing their own record
    auth.uid() = id
    OR
    -- Viewer is a facility admin and target user is in one of their facilities
    EXISTS (
      SELECT 1
      FROM user_roles ur_viewer
      WHERE ur_viewer.user_id = auth.uid()
      AND ur_viewer.role = 'facility_admin'
      AND ur_viewer.facility_id IN (
        SELECT uf.facility_id
        FROM user_facilities uf
        WHERE uf.user_id = users.id
      )
    )
  );

-- Verify the policy
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'users'
AND policyname = 'Facility admins can view users in their facility';
