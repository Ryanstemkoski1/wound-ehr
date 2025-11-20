-- Check users table for incomplete records

-- Show all users with their details
SELECT 
  id,
  email,
  name,
  credentials,
  created_at,
  CASE 
    WHEN email IS NULL OR email = '' THEN '❌ No email'
    WHEN name IS NULL OR name = '' THEN '⚠️ No name'
    ELSE '✅ OK'
  END as status
FROM users
ORDER BY created_at DESC;

-- Show users that Frank Ann (facility admin) should see
-- Facility admins should only see users in their facility
SELECT 
  u.id,
  u.email,
  u.name,
  u.credentials,
  ur.role,
  f.name as facility_name
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN facilities f ON f.id = ur.facility_id
ORDER BY u.created_at DESC;

-- Check for orphaned auth.users (users in auth but not in public.users)
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN u.id IS NULL THEN '❌ Missing in public.users table'
    ELSE '✅ OK'
  END as sync_status
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
ORDER BY au.created_at DESC;
