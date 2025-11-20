-- Get the invite URL for the most recent invite

SELECT 
  email,
  role,
  credentials,
  expires_at,
  CASE 
    WHEN expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as status,
  'http://localhost:3000/auth/accept-invite?token=' || invite_token as invite_url
FROM user_invites
WHERE accepted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;
