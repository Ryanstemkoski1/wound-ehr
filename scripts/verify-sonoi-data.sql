-- Verify Sonoi's user data

SELECT 
  id,
  email,
  name,
  credentials,
  created_at
FROM users
WHERE email = 'ogbuefisonoi@gmail.com';

-- Check if there's a different user with that ID
SELECT 
  id,
  email,
  name,
  credentials
FROM users
WHERE id = '7323c631-4296-419d-8e06-05e9fe0a5468';
