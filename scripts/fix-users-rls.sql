-- Fix infinite recursion in users table RLS policies
-- Allow authenticated users to view their own user record without checking user_roles

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Admins can view users in their tenant" ON users;

-- Create simple policy: users can view their own record
CREATE POLICY "Users can view own record"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all users (using simplified check)
CREATE POLICY "Tenant admins can view users"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'tenant_admin'
  )
);
