-- Fix RLS infinite recursion for user_roles queries
-- Create a function that bypasses RLS to get user role information

-- Drop function if exists
DROP FUNCTION IF EXISTS get_user_role_info(uuid);

-- Create function to get user role without triggering RLS recursion
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role_info(uuid) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_user_role_info IS 'Bypasses RLS to fetch user role information without infinite recursion';

-- Create function to get all user roles for a tenant
DROP FUNCTION IF EXISTS get_tenant_user_roles(uuid);

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_tenant_user_roles(uuid) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_tenant_user_roles IS 'Bypasses RLS to fetch all user roles for a tenant without infinite recursion';
