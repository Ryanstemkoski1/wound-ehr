-- Test 1 Setup: Create/Update RN Test User
-- Run this in Supabase Dashboard > SQL Editor

-- Option 1: Update existing user to RN
-- Replace 'your-email@example.com' with your actual test user email
UPDATE users 
SET credentials = 'RN'
WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT id, email, credentials, role 
FROM users 
WHERE email = 'your-email@example.com';
-- Expected: credentials should be 'RN'


-- Option 2: If you need to create a brand new test user (advanced)
-- This creates both auth and user records
-- Uncomment if needed:

/*
-- First, create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change_token,
  phone_change_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-rn@woundehr.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  ''
) RETURNING id;

-- Then create user record with RN credentials
-- Replace 'USER-ID-FROM-ABOVE' with the ID returned from previous query
INSERT INTO users (id, email, credentials, role)
VALUES (
  'USER-ID-FROM-ABOVE',
  'test-rn@woundehr.com',
  'RN',
  'user'
);
*/

-- Quick verification: Show all users and their credentials
SELECT email, credentials, role FROM users ORDER BY email;
