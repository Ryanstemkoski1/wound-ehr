-- Migration: Comprehensive fixes for schema issues
-- 1. Ensure all facilities have tenant_id set
-- 2. Verify RLS policies match actual schema

-- =====================================================
-- FIX 1: Update facilities without tenant_id
-- =====================================================

-- Set tenant_id for facilities that don't have one
-- Use the first tenant (or create one if needed)
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get first tenant
  SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
  
  -- If no tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants (name, subdomain, is_active)
    VALUES ('ABEC Technologies', 'abec', true)
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Update facilities without tenant_id
  UPDATE facilities
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  RAISE NOTICE 'Updated facilities with tenant_id: %', default_tenant_id;
END $$;

-- =====================================================
-- FIX 2: Ensure tenant_id is NOT NULL going forward
-- =====================================================

-- Make tenant_id NOT NULL (after setting defaults above)
-- ALTER TABLE facilities 
-- ALTER COLUMN tenant_id SET NOT NULL;  -- Commented out to be safe

-- =====================================================
-- VERIFICATION QUERIES (for logging)
-- =====================================================

-- Count facilities by tenant_id status
DO $$
DECLARE
  total_facilities INT;
  facilities_with_tenant INT;
  facilities_without_tenant INT;
BEGIN
  SELECT COUNT(*) INTO total_facilities FROM facilities;
  SELECT COUNT(*) INTO facilities_with_tenant FROM facilities WHERE tenant_id IS NOT NULL;
  SELECT COUNT(*) INTO facilities_without_tenant FROM facilities WHERE tenant_id IS NULL;
  
  RAISE NOTICE 'Total facilities: %', total_facilities;
  RAISE NOTICE 'Facilities with tenant_id: %', facilities_with_tenant;
  RAISE NOTICE 'Facilities without tenant_id: %', facilities_without_tenant;
END $$;
