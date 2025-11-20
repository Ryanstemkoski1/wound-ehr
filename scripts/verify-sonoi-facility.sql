-- Final check: Does Sonoi have a user_facilities entry?

SELECT 
  u.id,
  u.email,
  u.name,
  uf.facility_id,
  f.name as facility_name,
  CASE 
    WHEN uf.facility_id IS NULL THEN '❌ NO user_facilities entry!'
    ELSE '✅ Has facility association'
  END as status
FROM users u
LEFT JOIN user_facilities uf ON uf.user_id = u.id
LEFT JOIN facilities f ON f.id = uf.facility_id
WHERE u.email = 'ogbuefisonoi@gmail.com';

-- If Sonoi is missing user_facilities entry, add it
INSERT INTO user_facilities (user_id, facility_id)
SELECT 
  '7323c631-4296-419d-8e06-05e9fe0a5468',  -- Sonoi's ID
  'a0db8fb4-a23d-4d67-a597-25e171dd746d'   -- Chicago
WHERE NOT EXISTS (
  SELECT 1 FROM user_facilities 
  WHERE user_id = '7323c631-4296-419d-8e06-05e9fe0a5468'
  AND facility_id = 'a0db8fb4-a23d-4d67-a597-25e171dd746d'
);

-- Verify
SELECT 'After fix:' as label, u.email, uf.facility_id, f.name
FROM users u
JOIN user_facilities uf ON uf.user_id = u.id
JOIN facilities f ON f.id = uf.facility_id
WHERE u.email = 'ogbuefisonoi@gmail.com';
