-- Verify the invite you just created

-- Show the full invite details
SELECT 
  id,
  email,
  role,
  credentials,
  tenant_id,
  facility_id,
  invite_token,
  accepted_at,
  expires_at,
  created_at,
  expires_at > NOW() as is_not_expired,
  accepted_at IS NULL as is_not_accepted,
  LENGTH(invite_token) as token_length
FROM user_invites
ORDER BY created_at DESC
LIMIT 1;

-- Check if the facility_id exists
SELECT 
  ui.email,
  ui.facility_id as invite_facility_id,
  f.id as actual_facility_id,
  f.name as facility_name,
  CASE 
    WHEN f.id IS NULL THEN 'FACILITY DOES NOT EXIST!'
    ELSE 'OK'
  END as facility_check
FROM user_invites ui
LEFT JOIN facilities f ON f.id = ui.facility_id
ORDER BY ui.created_at DESC
LIMIT 1;

-- Check if the tenant_id exists
SELECT 
  ui.email,
  ui.tenant_id as invite_tenant_id,
  t.id as actual_tenant_id,
  t.name as tenant_name,
  CASE 
    WHEN t.id IS NULL THEN 'TENANT DOES NOT EXIST!'
    ELSE 'OK'
  END as tenant_check
FROM user_invites ui
LEFT JOIN tenants t ON t.id = ui.tenant_id
ORDER BY ui.created_at DESC
LIMIT 1;
