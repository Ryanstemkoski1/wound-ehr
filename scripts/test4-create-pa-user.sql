-- Test 4: Create PA user to verify full access to procedures

-- Create invite for PA user at Chicago Wound Care Clinic
INSERT INTO user_invites (
  email,
  role,
  credentials,
  tenant_id,
  facility_id,
  invited_by,
  invite_token,
  expires_at
)
VALUES (
  'patest@example.com',  -- Change to your test email
  'user',
  'PA',
  '8ec9598a-6bf6-4910-9eb3-dd52fbfd8898',  -- Tenant ID
  'a0db8fb4-a23d-4d67-a597-25e171dd746d',  -- Chicago Wound Care Clinic
  'd129d00f-5b1a-4c97-b4d3-24a5360d5164',  -- Frank Ann (invited_by)
  encode(gen_random_bytes(32), 'hex'),      -- Random token
  NOW() + INTERVAL '7 days'                  -- Expires in 7 days
)
RETURNING id, email, invite_token;

-- Get the invite URL
SELECT 
  'PA User Invite URL:' as label,
  'http://localhost:3000/auth/accept-invite?token=' || invite_token as invite_url
FROM user_invites
WHERE email = 'patest@example.com'
AND accepted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;
