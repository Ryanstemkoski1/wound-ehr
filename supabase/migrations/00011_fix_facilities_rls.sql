-- Migration: Fix facilities RLS policies
-- The current policy checks facilities.tenant_id which doesn't exist
-- Replace with user_facilities based policies

-- Drop broken policies
DROP POLICY IF EXISTS "Users can view facilities in their tenant" ON facilities;
DROP POLICY IF EXISTS "Tenant admins can insert facilities in their tenant" ON facilities;
DROP POLICY IF EXISTS "Tenant admins can update facilities in their tenant" ON facilities;

-- Simple policy: Users can view facilities they're associated with
CREATE POLICY "Users can view their facilities"
  ON facilities FOR SELECT
  USING (
    id IN (
      SELECT facility_id 
      FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

-- Admins can insert facilities (will be auto-associated)
CREATE POLICY "Admins can insert facilities"
  ON facilities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('tenant_admin', 'facility_admin')
    )
  );

-- Admins can update their facilities
CREATE POLICY "Admins can update facilities"
  ON facilities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('tenant_admin', 'facility_admin')
    )
    AND id IN (
      SELECT facility_id 
      FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view their facilities" ON facilities IS
  'Users can view facilities they are associated with via user_facilities table';

COMMENT ON POLICY "Admins can insert facilities" ON facilities IS
  'Tenant admins and facility admins can create new facilities';

COMMENT ON POLICY "Admins can update facilities" ON facilities IS
  'Admins can update facilities they have access to';
