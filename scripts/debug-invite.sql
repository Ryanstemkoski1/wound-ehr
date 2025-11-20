-- Debug invite system

-- 1. Check the most recent invite you created
SELECT 
  id,
  email,
  role,
  credentials,
  facility_id,
  invited_by,
  invite_token,
  accepted_at,
  expires_at,
  created_at
FROM user_invites
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if there are any facility_id mismatches
SELECT 
  ui.email,
  ui.facility_id as invite_facility_id,
  f.id as actual_facility_id,
  f.name as facility_name
FROM user_invites ui
LEFT JOIN facilities f ON f.id = ui.facility_id
WHERE ui.accepted_at IS NULL
ORDER BY ui.created_at DESC
LIMIT 5;

-- 3. Check the invite sending action logs (if any errors occurred)
-- Show the last invite details with actual token
SELECT 
  'Last invite details:' as status,
  email,
  role,
  credentials,
  LEFT(invite_token, 20) || '...' as token_preview,
  expires_at > NOW() as is_valid,
  expires_at
FROM user_invites
ORDER BY created_at DESC
LIMIT 1;
