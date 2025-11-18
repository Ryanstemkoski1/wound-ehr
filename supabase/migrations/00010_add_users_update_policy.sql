-- Migration: Add RLS policy to allow admins to update users in their tenant
-- This fixes the issue where credential updates don't persist to the database

-- Add policy to allow tenant admins to update users in their tenant
CREATE POLICY "Tenant admins can update users in their tenant"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'tenant_admin'
      AND EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = users.id
        AND ur2.tenant_id = ur.tenant_id
      )
    )
  );

-- Add policy to allow facility admins to update users in their facilities
CREATE POLICY "Facility admins can update users in their facility"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_facilities uf ON uf.user_id = auth.uid()
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'facility_admin'
      AND EXISTS (
        SELECT 1 FROM user_facilities uf2
        WHERE uf2.user_id = users.id
        AND uf2.facility_id = uf.facility_id
      )
    )
  );

COMMENT ON POLICY "Tenant admins can update users in their tenant" ON public.users IS
  'Allows tenant admins to update user credentials and profiles for users in their tenant';

COMMENT ON POLICY "Facility admins can update users in their facility" ON public.users IS
  'Allows facility admins to update user credentials and profiles for users in their facilities';
