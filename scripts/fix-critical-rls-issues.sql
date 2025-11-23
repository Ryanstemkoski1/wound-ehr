-- CRITICAL RLS SECURITY FIXES
-- Discovered: November 23, 2025
-- Priority: IMMEDIATE - Fixes multi-tenant isolation vulnerabilities

-- =====================================================
-- FIX 1: WOUND_NOTES TABLE
-- Issue: Conflicting policies between migration 00020 (user_roles) and fix script (user_facilities)
-- Solution: Consolidate to user_facilities approach (matches rest of schema)
-- =====================================================

-- Drop ALL wound_notes policies (clean slate)
DROP POLICY IF EXISTS "Users can view wound notes in their tenant" ON wound_notes;
DROP POLICY IF EXISTS "Users can create wound notes in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes and addendums in their tenant" ON wound_notes;
DROP POLICY IF EXISTS "Users can create wound notes and addendums in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes and addendums in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can create wound notes and addendums in their facilities v2" ON wound_notes;
DROP POLICY IF EXISTS "Users can update their own wound notes" ON wound_notes;
DROP POLICY IF EXISTS "Users can delete their own wound notes" ON wound_notes;
DROP POLICY IF EXISTS "Users can update their own wound notes and addendums" ON wound_notes;
DROP POLICY IF EXISTS "Users can delete their own wound notes and addendums" ON wound_notes;

-- Create correct policies using user_facilities (NOT user_roles)
CREATE POLICY "Users can view wound notes and addendums in their facilities"
  ON wound_notes FOR SELECT
  USING (
    -- Regular wound notes: check wound_id access via user_facilities
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ))
    OR
    -- Addendums: check visit_id access via user_facilities
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create wound notes and addendums in their facilities"
  ON wound_notes FOR INSERT
  WITH CHECK (
    -- Regular wound notes: check wound_id access via user_facilities
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ) AND created_by = auth.uid())
    OR
    -- Addendums: check visit_id access via user_facilities
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ) AND created_by = auth.uid())
  );

CREATE POLICY "Users can update their own wound notes and addendums"
  ON wound_notes FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own wound notes and addendums"
  ON wound_notes FOR DELETE
  USING (created_by = auth.uid());

COMMENT ON POLICY "Users can view wound notes and addendums in their facilities" ON wound_notes IS
  'Users can view wound notes and addendums for patients in facilities they have access to via user_facilities table';

COMMENT ON POLICY "Users can create wound notes and addendums in their facilities" ON wound_notes IS
  'Users can create wound notes for wounds and addendums for visits in facilities they have access to';

-- =====================================================
-- FIX 2: TENANTS TABLE
-- Issue: RLS DISABLED - All users can see ALL tenants (multi-tenant isolation broken)
-- Solution: Re-enable RLS using SECURITY DEFINER RPC function
-- =====================================================

-- Re-enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view tenants" ON tenants;

-- Allow users to view only their tenant
CREATE POLICY "Users can view their tenant"
  ON tenants FOR SELECT
  USING (
    id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
  );

-- Allow tenant admins to update their tenant
CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
    AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
  )
  WITH CHECK (
    id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
  );

COMMENT ON POLICY "Users can view their tenant" ON tenants IS
  'Users can only view their own tenant using RPC function to avoid RLS recursion';

COMMENT ON POLICY "Tenant admins can update their tenant" ON tenants IS
  'Tenant admins can update their own tenant settings';

-- =====================================================
-- FIX 3: USER_INVITES TABLE
-- Issue: RLS DISABLED - All users can see ALL invites across ALL tenants
-- Solution: Re-enable RLS using SECURITY DEFINER RPC function
-- =====================================================

-- Re-enable RLS
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Tenant admins can view invites in their tenant" ON user_invites;
DROP POLICY IF EXISTS "Tenant admins can create invites in their tenant" ON user_invites;
DROP POLICY IF EXISTS "Facility admins can create user invites in their facility" ON user_invites;
DROP POLICY IF EXISTS "Users can view invites in their tenant" ON user_invites;
DROP POLICY IF EXISTS "Tenant admins can create invites" ON user_invites;
DROP POLICY IF EXISTS "Facility admins can create user invites for their facility" ON user_invites;

-- Allow admins to view invites in their tenant
CREATE POLICY "Admins can view invites in their tenant"
  ON user_invites FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
    AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) IN ('tenant_admin', 'facility_admin')
  );

-- Allow tenant admins to create invites
CREATE POLICY "Tenant admins can create invites"
  ON user_invites FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
    AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
  );

-- Allow facility admins to create user invites for their facility
CREATE POLICY "Facility admins can create user invites for their facility"
  ON user_invites FOR INSERT
  WITH CHECK (
    role = 'user'
    AND facility_id = (SELECT facility_id FROM get_user_role_info(auth.uid()) LIMIT 1)
    AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'facility_admin'
    AND tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
  );

-- Allow admins to update invites in their tenant (for resending, etc.)
CREATE POLICY "Admins can update invites in their tenant"
  ON user_invites FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
    AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) IN ('tenant_admin', 'facility_admin')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
  );

COMMENT ON POLICY "Admins can view invites in their tenant" ON user_invites IS
  'Tenant and facility admins can view invites in their tenant using RPC function to avoid RLS recursion';

COMMENT ON POLICY "Tenant admins can create invites" ON user_invites IS
  'Tenant admins can invite users to any role in their tenant';

COMMENT ON POLICY "Facility admins can create user invites for their facility" ON user_invites IS
  'Facility admins can only invite regular users to their specific facility';

-- =====================================================
-- FIX 4: PROCEDURE_SCOPES TABLE (Low Priority)
-- Issue: Uses user_roles directly instead of RPC function
-- Solution: Use RPC function for consistency
-- =====================================================

DROP POLICY IF EXISTS "Tenant admins can manage procedure scopes" ON procedure_scopes;

CREATE POLICY "Tenant admins can manage procedure scopes"
  ON procedure_scopes FOR ALL
  USING (
    (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
  );

COMMENT ON POLICY "Tenant admins can manage procedure scopes" ON procedure_scopes IS
  'Only tenant admins can manage procedure scope definitions using RPC function to avoid potential RLS issues';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tenants RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tenants', 'user_invites', 'wound_notes', 'procedure_scopes', 'user_roles')
ORDER BY tablename;

-- List all policies for critical tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('tenants', 'user_invites', 'wound_notes', 'procedure_scopes')
ORDER BY tablename, policyname;

-- Success message
SELECT '✓ All critical RLS security fixes applied successfully!' as status;
SELECT '⚠️ IMPORTANT: user_roles table still has RLS DISABLED by design to avoid recursion' as warning;
SELECT '⚠️ Always use get_user_role_info() RPC function to check roles in RLS policies' as warning;
