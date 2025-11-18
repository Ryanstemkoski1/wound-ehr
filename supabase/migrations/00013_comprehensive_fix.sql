-- =====================================================
-- COMPREHENSIVE SCHEMA FIX
-- Run this in Supabase SQL Editor to fix all issues
-- =====================================================

-- FIX 1: Ensure all facilities have tenant_id
-- =====================================================
DO $$
DECLARE
  default_tenant_id UUID;
  facilities_updated INT;
BEGIN
  -- Get first tenant (should be ABEC Technologies)
  SELECT id INTO default_tenant_id FROM tenants ORDER BY created_at LIMIT 1;
  
  -- If no tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants (name, subdomain, is_active)
    VALUES ('ABEC Technologies', 'abec', true)
    RETURNING id INTO default_tenant_id;
    RAISE NOTICE 'Created tenant: %', default_tenant_id;
  ELSE
    RAISE NOTICE 'Using existing tenant: %', default_tenant_id;
  END IF;
  
  -- Update facilities without tenant_id
  UPDATE facilities
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  GET DIAGNOSTICS facilities_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % facilities with tenant_id', facilities_updated;
END $$;

-- FIX 2: Verify and fix facilities RLS policies
-- =====================================================

-- Drop the broken tenant-based policy if it exists
DROP POLICY IF EXISTS "Users can view facilities in their tenant" ON facilities;
DROP POLICY IF EXISTS "Tenant admins can insert facilities in their tenant" ON facilities;
DROP POLICY IF EXISTS "Tenant admins can update facilities in their tenant" ON facilities;

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Users can view their facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can insert facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can update facilities" ON facilities;

-- Recreate simple user_facilities-based policies
CREATE POLICY "Users can view their facilities"
  ON facilities FOR SELECT
  USING (
    id IN (
      SELECT facility_id 
      FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert facilities"
  ON facilities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('tenant_admin', 'facility_admin')
    )
  );

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

-- FIX 3: Ensure RLS is enabled on all tables
-- =====================================================
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE wounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- FIX 4: Verification
-- =====================================================
DO $$
DECLARE
  total_facilities INT;
  facilities_with_tenant INT;
  total_user_facilities INT;
  total_patients INT;
BEGIN
  SELECT COUNT(*) INTO total_facilities FROM facilities;
  SELECT COUNT(*) INTO facilities_with_tenant FROM facilities WHERE tenant_id IS NOT NULL;
  SELECT COUNT(*) INTO total_user_facilities FROM user_facilities;
  SELECT COUNT(*) INTO total_patients FROM patients;
  
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  RAISE NOTICE 'Total facilities: %', total_facilities;
  RAISE NOTICE 'Facilities with tenant_id: %', facilities_with_tenant;
  RAISE NOTICE 'User-Facility associations: %', total_user_facilities;
  RAISE NOTICE 'Total patients: %', total_patients;
  
  IF facilities_with_tenant = total_facilities THEN
    RAISE NOTICE '✓ All facilities have tenant_id';
  ELSE
    RAISE WARNING '✗ Some facilities missing tenant_id';
  END IF;
END $$;

SELECT '✓ Schema fixes applied successfully' as status;
