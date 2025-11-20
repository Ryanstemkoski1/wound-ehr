-- Add facility_admin role for Frank Ann at Chicago Wound Care Clinic
-- This gives Frank Ann administrative privileges (Users/Invite tabs, etc.)

INSERT INTO user_roles (user_id, tenant_id, role, facility_id)
VALUES (
  'd129d00f-5b1a-4c97-b4d3-24a5360d5164',  -- Frank Ann
  '8ec9598a-6bf6-4910-9eb3-dd52fbfd8898',  -- Tenant
  'facility_admin',
  'a0db8fb4-a23d-4d67-a597-25e171dd746d'   -- Chicago Wound Care Clinic
);

-- Verify the role was added
SELECT ur.user_id, ur.role, ur.tenant_id, ur.facility_id, u.email, f.name as facility_name
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
LEFT JOIN facilities f ON f.id = ur.facility_id
WHERE u.email = 'astsunshine1117@gmail.com';
