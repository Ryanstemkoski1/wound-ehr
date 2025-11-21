-- Create Test Users for Phase 9 Client Testing
-- Date: November 21, 2025
-- Purpose: Provide comprehensive test accounts for client validation

-- ============================================
-- 1. TENANT ADMIN TEST USER
-- ============================================
-- Email: tenant-admin@woundehr-test.com
-- Password: WoundEHR2025!Admin
-- Role: tenant_admin
-- Access: Full system access, can manage all facilities

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'tenant-admin@woundehr-test.com',
  crypt('WoundEHR2025!Admin', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Tenant Admin Test"}',
  NOW(),
  NOW()
);

-- Get the user ID for tenant admin
DO $$
DECLARE
  v_tenant_admin_id UUID;
BEGIN
  SELECT id INTO v_tenant_admin_id 
  FROM auth.users 
  WHERE email = 'tenant-admin@woundehr-test.com';

  -- Create user record
  INSERT INTO users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    v_tenant_admin_id,
    'tenant-admin@woundehr-test.com',
    'Tenant Admin Test',
    'tenant_admin',
    NOW(),
    NOW()
  );
END $$;

-- ============================================
-- 2. FACILITY ADMIN TEST USER
-- ============================================
-- Email: facility-admin@woundehr-test.com
-- Password: WoundEHR2025!FacAdmin
-- Role: facility_admin
-- Access: Can manage assigned facilities, users, patients

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'facility-admin@woundehr-test.com',
  crypt('WoundEHR2025!FacAdmin', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Facility Admin Test"}',
  NOW(),
  NOW()
);

-- Get the user ID and assign to test facility
DO $$
DECLARE
  v_facility_admin_id UUID;
  v_test_facility_id UUID;
BEGIN
  SELECT id INTO v_facility_admin_id 
  FROM auth.users 
  WHERE email = 'facility-admin@woundehr-test.com';

  -- Create user record
  INSERT INTO users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    v_facility_admin_id,
    'facility-admin@woundehr-test.com',
    'Facility Admin Test',
    'facility_admin',
    NOW(),
    NOW()
  );

  -- Get first available facility or create test facility
  SELECT id INTO v_test_facility_id FROM facilities LIMIT 1;

  IF v_test_facility_id IS NULL THEN
    INSERT INTO facilities (name, address, city, state, zip, phone, email)
    VALUES (
      'Test Wound Care Clinic',
      '123 Medical Plaza Dr',
      'Los Angeles',
      'CA',
      '90001',
      '(310) 555-0100',
      'test@woundcare-clinic.com'
    )
    RETURNING id INTO v_test_facility_id;
  END IF;

  -- Associate facility admin with facility
  INSERT INTO user_facilities (user_id, facility_id, created_at)
  VALUES (v_facility_admin_id, v_test_facility_id, NOW())
  ON CONFLICT (user_id, facility_id) DO NOTHING;
END $$;

-- ============================================
-- 3. REGULAR USER (CLINICIAN) TEST USER
-- ============================================
-- Email: clinician@woundehr-test.com
-- Password: WoundEHR2025!User
-- Role: user
-- Access: Can view/edit patients, create visits and assessments

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'clinician@woundehr-test.com',
  crypt('WoundEHR2025!User', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Clinician Test User"}',
  NOW(),
  NOW()
);

-- Get the user ID and assign to test facility
DO $$
DECLARE
  v_user_id UUID;
  v_test_facility_id UUID;
BEGIN
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'clinician@woundehr-test.com';

  -- Create user record
  INSERT INTO users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    v_user_id,
    'clinician@woundehr-test.com',
    'Clinician Test User',
    'user',
    NOW(),
    NOW()
  );

  -- Get test facility
  SELECT id INTO v_test_facility_id FROM facilities LIMIT 1;

  -- Associate user with facility
  INSERT INTO user_facilities (user_id, facility_id, created_at)
  VALUES (v_user_id, v_test_facility_id, NOW())
  ON CONFLICT (user_id, facility_id) DO NOTHING;
END $$;

-- ============================================
-- 4. READ-ONLY USER TEST USER
-- ============================================
-- Email: readonly@woundehr-test.com
-- Password: WoundEHR2025!ReadOnly
-- Role: user (with restricted permissions)
-- Access: Can only view patients and reports

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'readonly@woundehr-test.com',
  crypt('WoundEHR2025!ReadOnly', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Read Only Test User"}',
  NOW(),
  NOW()
);

-- Get the user ID and assign to test facility
DO $$
DECLARE
  v_user_id UUID;
  v_test_facility_id UUID;
BEGIN
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'readonly@woundehr-test.com';

  -- Create user record
  INSERT INTO users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    v_user_id,
    'readonly@woundehr-test.com',
    'Read Only Test User',
    'user',
    NOW(),
    NOW()
  );

  -- Get test facility
  SELECT id INTO v_test_facility_id FROM facilities LIMIT 1;

  -- Associate user with facility
  INSERT INTO user_facilities (user_id, facility_id, created_at)
  VALUES (v_user_id, v_test_facility_id, NOW())
  ON CONFLICT (user_id, facility_id) DO NOTHING;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all test users were created
SELECT 
  u.email,
  u.full_name,
  u.role,
  array_agg(f.name) as facilities
FROM users u
LEFT JOIN user_facilities uf ON u.id = uf.user_id
LEFT JOIN facilities f ON uf.facility_id = f.id
WHERE u.email LIKE '%@woundehr-test.com'
GROUP BY u.id, u.email, u.full_name, u.role
ORDER BY u.role DESC, u.email;

-- Display credentials summary
SELECT 
  'Test Users Created Successfully!' as status,
  COUNT(*) as total_test_users
FROM users
WHERE email LIKE '%@woundehr-test.com';
