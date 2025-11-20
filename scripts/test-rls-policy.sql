-- Test if the RLS policy is working for Frank Ann viewing Sonoi

-- Simulate Frank Ann's session and query
SET LOCAL "request.jwt.claims" = '{"sub": "d129d00f-5b1a-4c97-b4d3-24a5360d5164"}';

-- This simulates what happens when Frank Ann queries the users table
SELECT id, email, name, credentials
FROM users
WHERE id IN (
  '7323c631-4296-419d-8e06-05e9fe0a5468',  -- Sonoi
  'd129d00f-5b1a-4c97-b4d3-24a5360d5164'   -- Frank Ann
);

-- Reset
RESET "request.jwt.claims";

-- Alternative: Check if the policy condition is true for Sonoi
-- This checks if Frank Ann and Sonoi share a facility
SELECT 
  'Can Frank Ann see Sonoi?' as question,
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN user_facilities uf_admin ON uf_admin.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'  -- Frank Ann
    JOIN user_facilities uf_user ON uf_user.user_id = '7323c631-4296-419d-8e06-05e9fe0a5468'    -- Sonoi
    WHERE ur.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'  -- Frank Ann
    AND ur.role = 'facility_admin'
    AND uf_admin.facility_id = uf_user.facility_id
  ) as can_see;

-- Show the facility associations that should match
SELECT 
  'Frank Ann facilities' as label,
  uf.facility_id,
  f.name
FROM user_facilities uf
JOIN facilities f ON f.id = uf.facility_id
WHERE uf.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'

UNION ALL

SELECT 
  'Sonoi facilities' as label,
  uf.facility_id,
  f.name
FROM user_facilities uf
JOIN facilities f ON f.id = uf.facility_id
WHERE uf.user_id = '7323c631-4296-419d-8e06-05e9fe0a5468';
