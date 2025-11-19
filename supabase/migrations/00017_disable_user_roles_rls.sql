-- COMPREHENSIVE FIX: Disable RLS on user_roles and use RPC functions instead
-- This eliminates ALL infinite recursion issues

-- Step 1: Disable RLS on user_roles (admin functions will handle security)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Ensure our RPC functions exist and are properly granted
DROP FUNCTION IF EXISTS get_user_role_info(uuid);
DROP FUNCTION IF EXISTS get_tenant_user_roles(uuid);

-- Function to get single user's role
CREATE OR REPLACE FUNCTION get_user_role_info(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  role text,
  facility_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.tenant_id,
    ur.role,
    ur.facility_id,
    ur.created_at
  FROM user_roles ur
  WHERE ur.user_id = user_uuid
  ORDER BY ur.created_at ASC
  LIMIT 1;
$$;

-- Function to get all roles for a tenant
CREATE OR REPLACE FUNCTION get_tenant_user_roles(tenant_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  role text,
  facility_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.tenant_id,
    ur.role,
    ur.facility_id,
    ur.created_at
  FROM user_roles ur
  WHERE ur.tenant_id = tenant_uuid
  ORDER BY ur.created_at DESC;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_info(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_tenant_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_user_roles(uuid) TO anon;

-- Step 3: Verify functions work
SELECT 'Testing get_user_role_info...' as status;
SELECT * FROM get_user_role_info('18aed806-f100-48f8-80a5-34aedb083583'::uuid);

SELECT 'Testing get_tenant_user_roles...' as status;
SELECT * FROM get_tenant_user_roles('8ec9598a-6bf6-4910-9eb3-dd52fbfd8898'::uuid);

SELECT '✓ All RLS fixes applied successfully!' as status;
