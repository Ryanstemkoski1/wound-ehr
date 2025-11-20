-- Check the current state of user_invites

-- Show all invites
SELECT 
  id,
  email,
  role,
  credentials,
  accepted_at,
  expires_at,
  created_at,
  CASE 
    WHEN accepted_at IS NOT NULL THEN '✅ Accepted'
    WHEN expires_at < NOW() THEN '❌ Expired'
    ELSE '⏳ Pending'
  END as status
FROM user_invites
ORDER BY created_at DESC;

-- Show which emails have corresponding user accounts
SELECT 
  ui.email,
  ui.accepted_at,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ User exists'
    ELSE '❌ No user account'
  END as user_status,
  u.credentials as user_credentials
FROM user_invites ui
LEFT JOIN users u ON u.email = ui.email
WHERE ui.accepted_at IS NULL
ORDER BY ui.created_at DESC;

-- Clean up accepted invites that weren't marked properly
-- (Invites where user exists but accepted_at is still null)
UPDATE user_invites ui
SET accepted_at = NOW()
FROM users u
WHERE u.email = ui.email
AND ui.accepted_at IS NULL
RETURNING ui.email, ui.accepted_at;
