-- Test 3: Verify server-side validation blocks RN user from using restricted codes
-- This simulates what happens if someone tries to bypass the UI

-- 1. Verify Frank Ann is an RN user
SELECT id, email, credentials
FROM users
WHERE email = 'astsunshine1117@gmail.com';

-- 2. Check if there are any visits with restricted codes created by Frank Ann
-- If server validation is working, there should be NONE with codes 11042-11047
SELECT 
  v.id as visit_id,
  v.visit_date,
  v.created_by,
  u.email as created_by_email,
  u.credentials,
  b.cpt_codes,
  CASE 
    WHEN b.cpt_codes && ARRAY['11042','11043','11044','11045','11046','11047']::text[] 
    THEN '❌ SECURITY BREACH - RN created visit with restricted codes!'
    ELSE '✅ OK - No restricted codes'
  END as validation_check
FROM visits v
JOIN users u ON u.id = v.created_by
LEFT JOIN billings b ON b.visit_id = v.id
WHERE u.credentials = 'RN'
AND v.created_at > NOW() - INTERVAL '1 hour'  -- Recent visits
ORDER BY v.created_at DESC;

-- 3. Alternative: Check all billings for credential violations
SELECT 
  b.id,
  b.visit_id,
  b.cpt_codes,
  u.email,
  u.credentials,
  CASE 
    WHEN u.credentials = 'RN' AND b.cpt_codes && ARRAY['11042','11043','11044','11045','11046','11047']::text[]
    THEN '❌ VIOLATION: RN user has restricted codes'
    WHEN u.credentials = 'LVN' AND b.cpt_codes && ARRAY['11042','11043','11044','11045','11046','11047']::text[]
    THEN '❌ VIOLATION: LVN user has restricted codes'
    ELSE '✅ OK'
  END as compliance_status
FROM billings b
JOIN visits v ON v.id = b.visit_id
JOIN users u ON u.id = v.created_by
WHERE b.created_at > NOW() - INTERVAL '24 hours'
ORDER BY b.created_at DESC;
