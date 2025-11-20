-- Debug: Check what get_tenant_user_roles returns vs what users exist

-- 1. Show all user_roles (what the RPC returns)
SELECT 
  ur.id as role_id,
  ur.user_id,
  ur.role,
  ur.facility_id,
  ur.tenant_id
FROM user_roles ur
WHERE ur.tenant_id = '8ec9598a-6bf6-4910-9eb3-dd52fbfd8898'
ORDER BY ur.created_at DESC;

-- 2. Show if there are any user_roles without matching users
SELECT 
  ur.id as role_id,
  ur.user_id,
  ur.role,
  u.email,
  u.name,
  CASE 
    WHEN u.id IS NULL THEN '❌ USER MISSING'
    ELSE '✅ User exists'
  END as user_status
FROM user_roles ur
LEFT JOIN users u ON u.id = ur.user_id
WHERE ur.tenant_id = '8ec9598a-6bf6-4910-9eb3-dd52fbfd8898'
ORDER BY ur.created_at DESC;

-- 3. Clean up orphaned user_roles (roles without users)
DELETE FROM user_roles
WHERE user_id NOT IN (SELECT id FROM users);
