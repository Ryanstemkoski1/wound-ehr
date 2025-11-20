-- Remove Frank Ann from all facilities except Chicago Wound Care Clinic

-- Before: Show all current associations
SELECT 'BEFORE - All facility associations:' as status;
SELECT uf.user_id, uf.facility_id, f.name as facility_name
FROM user_facilities uf
JOIN facilities f ON f.id = uf.facility_id
WHERE uf.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
ORDER BY f.name;

-- Delete all associations EXCEPT Chicago
DELETE FROM user_facilities
WHERE user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
AND facility_id != 'a0db8fb4-a23d-4d67-a597-25e171dd746d';  -- Keep Chicago only

-- After: Show remaining associations (should be only Chicago)
SELECT 'AFTER - Remaining facility associations:' as status;
SELECT uf.user_id, uf.facility_id, f.name as facility_name
FROM user_facilities uf
JOIN facilities f ON f.id = uf.facility_id
WHERE uf.user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
ORDER BY f.name;

-- Verify: Count patients Frank Ann should now see (should be 13 from Chicago only)
SELECT 'Patient count by facility (Frank Ann should see):' as status;
SELECT COUNT(*) as patient_count, f.name as facility_name
FROM patients p
JOIN facilities f ON f.id = p.facility_id
WHERE p.facility_id IN (
  SELECT facility_id 
  FROM user_facilities 
  WHERE user_id = 'd129d00f-5b1a-4c97-b4d3-24a5360d5164'
)
GROUP BY f.name;
