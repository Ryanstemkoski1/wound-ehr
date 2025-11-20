-- Check RLS policies on users table

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Test: Can Frank Ann see Sonoi's user record?
-- Run this as Frank Ann's user (simulate the query)
SELECT id, email, name, credentials
FROM users
WHERE id = '7323c631-4296-419d-8e06-05e9fe0a5468';

-- Show which users Frank Ann should be able to see based on user_facilities
SELECT 
  u.id,
  u.email,
  u.name,
  u.credentials,
  uf.facility_id,
  f.name as facility_name
FROM users u
JOIN user_facilities uf ON uf.user_id = u.id
JOIN facilities f ON f.id = uf.facility_id
WHERE uf.facility_id = 'a0db8fb4-a23d-4d67-a597-25e171dd746d'  -- Chicago
ORDER BY u.name;
