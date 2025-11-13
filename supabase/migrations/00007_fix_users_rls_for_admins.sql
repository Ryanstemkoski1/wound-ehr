-- Migration: Fix RLS policies on users table to allow admins to view users in their tenant
-- This fixes the issue where invited users don't appear in the admin panel

-- Add policy to allow admins to view all users in their tenant
CREATE POLICY "Admins can view users in their tenant"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('tenant_admin', 'facility_admin')
      AND EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = users.id
        AND ur2.tenant_id = ur.tenant_id
      )
    )
  );

COMMENT ON POLICY "Admins can view users in their tenant" ON public.users IS
  'Allows tenant admins and facility admins to view all users in their tenant for user management';
