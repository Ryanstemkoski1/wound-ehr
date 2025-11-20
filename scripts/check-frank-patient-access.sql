-- Debug patient access for Frank Ann

-- 1. Check Frank Ann's user_facilities associations
SELECT uf.user_id, uf.facility_id, f.name as facility_name, u.email
FROM user_facilities uf
JOIN users u ON u.id = uf.user_id
JOIN facilities f ON f.id = uf.facility_id
WHERE u.email = 'astsunshine1117@gmail.com';

-- 2. Check what patients exist and their facilities
SELECT p.id, p.first_name, p.last_name, f.name as facility_name, p.facility_id
FROM patients p
JOIN facilities f ON f.id = p.facility_id
ORDER BY f.name, p.last_name;

-- 3. Check the RLS policy on patients table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'patients'
ORDER BY policyname;

-- 4. Test what Frank Ann should see (simulate the RLS check)
-- This shows patients where Frank Ann has facility access
SELECT p.id, p.first_name, p.last_name, f.name as facility_name
FROM patients p
JOIN facilities f ON f.id = p.facility_id
WHERE p.facility_id IN (
  SELECT facility_id 
  FROM user_facilities 
  WHERE user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
)
ORDER BY f.name, p.last_name;
