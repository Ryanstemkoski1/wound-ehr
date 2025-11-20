-- Fix Frank Ann's facility access
-- The issue: Frank Ann has a user_roles entry (facility_admin) but NO user_facilities entry
-- The patients RLS policy checks user_facilities, not user_roles

-- Check current state
SELECT 'Current user_facilities for Frank Ann:' as status;
SELECT uf.user_id, uf.facility_id, f.name as facility_name, u.email
FROM user_facilities uf
JOIN users u ON u.id = uf.user_id
JOIN facilities f ON f.id = uf.facility_id
WHERE u.email = 'astsunshine1117@gmail.com';

-- Add Frank Ann to user_facilities for Chicago Wound Care Clinic
INSERT INTO user_facilities (user_id, facility_id)
VALUES (
  'd129d00f-5b1a-4c97-b4d3-24a5360d5164',  -- Frank Ann
  'a0db8fb4-a23d-4d67-a597-25e171dd746d'   -- Chicago Wound Care Clinic
)
ON CONFLICT (user_id, facility_id) DO NOTHING;

-- Verify the fix
SELECT 'After insert:' as status;
SELECT uf.user_id, uf.facility_id, f.name as facility_name, u.email
FROM user_facilities uf
JOIN users u ON u.id = uf.user_id
JOIN facilities f ON f.id = uf.facility_id
WHERE u.email = 'astsunshine1117@gmail.com';

-- Test what patients Frank Ann should now see
SELECT 'Patients Frank Ann should see:' as status;
SELECT COUNT(*) as patient_count, f.name as facility_name
FROM patients p
JOIN facilities f ON f.id = p.facility_id
WHERE p.facility_id IN (
  SELECT facility_id 
  FROM user_facilities 
  WHERE user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
)
GROUP BY f.name;
