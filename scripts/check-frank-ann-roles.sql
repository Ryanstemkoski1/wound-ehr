-- Check Frank Ann's user information and roles

-- 1. Check basic user info
SELECT id, email, credentials, created_at
FROM users
WHERE email = 'astsunshine1117@gmail.com';

-- 2. Check user_roles (administrative roles)
SELECT ur.user_id, ur.role, ur.tenant_id, ur.facility_id, u.email
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
WHERE u.email = 'astsunshine1117@gmail.com';

-- 3. Check user_facilities (facility associations)
SELECT uf.user_id, uf.facility_id, f.name as facility_name, u.email
FROM user_facilities uf
JOIN users u ON u.id = uf.user_id
JOIN facilities f ON f.id = uf.facility_id
WHERE u.email = 'astsunshine1117@gmail.com';

-- 4. List all facilities to see what exists
SELECT id, name, created_at
FROM facilities
ORDER BY name;

-- 5. Check what role is needed for admin access
-- (Facility admins should have role = 'facility_admin' in user_roles)
SELECT * FROM user_roles WHERE role = 'facility_admin';

-- 6. Check if Frank Ann should be tenant_admin instead
SELECT * FROM user_roles WHERE role = 'tenant_admin';
