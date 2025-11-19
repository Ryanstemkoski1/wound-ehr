-- Test and create get_user_role_info function
-- Run this in Supabase SQL Editor

-- First check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_user_role_info';

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.get_user_role_info(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role_info(user_uuid uuid)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_info(uuid) TO anon;

-- Test the function with your user ID
-- Replace with your actual user ID from auth.users
SELECT * FROM public.get_user_role_info('18aed806-f100-48f8-80a5-34aedb083583'::uuid);

-- Check again if function exists
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_user_role_info';
