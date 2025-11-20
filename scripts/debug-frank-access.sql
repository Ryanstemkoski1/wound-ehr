-- Check what's actually happening with Frank Ann's facility associations

-- 1. What facilities is Frank Ann associated with in user_facilities?
SELECT 'user_facilities entries:' as check_type;
SELECT uf.user_id, uf.facility_id, f.name as facility_name
FROM user_facilities uf
JOIN facilities f ON f.id = uf.facility_id
WHERE uf.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
ORDER BY f.name;

-- 2. What role does Frank Ann have?
SELECT 'user_roles entries:' as check_type;
SELECT ur.user_id, ur.role, ur.facility_id, f.name as facility_name
FROM user_roles ur
LEFT JOIN facilities f ON f.id = ur.facility_id
WHERE ur.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164';

-- 3. Check if there's a policy that gives admins access to all facilities
-- This will show the actual RLS policies on patients table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'patients'
ORDER BY policyname;

-- 4. Is Frank Ann accidentally a tenant_admin? (tenant admins can see everything)
SELECT 'Check if tenant_admin:' as check_type;
SELECT * FROM user_roles WHERE user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164';
