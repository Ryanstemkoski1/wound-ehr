-- Migration: Create default tenant and auto-assign roles to users without invites
-- This is for development/testing purposes to ensure all users have a role

-- =====================================================
-- CREATE DEFAULT TENANT
-- =====================================================

-- Insert default tenant (only if no tenants exist)
INSERT INTO tenants (id, name, subdomain, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Organization',
  'default',
  true
WHERE NOT EXISTS (SELECT 1 FROM tenants LIMIT 1);

-- =====================================================
-- AUTO-ASSIGN ROLE FUNCTION
-- =====================================================

-- Function to auto-assign user role when a new user is created
-- This assigns users to the default tenant with 'user' role if they don't have an invite
CREATE OR REPLACE FUNCTION auto_assign_user_role()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  default_facility_id UUID;
BEGIN
  -- Check if user already has a role (from invite)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = NEW.id
  ) THEN
    -- Get or create default facility
    SELECT id INTO default_facility_id
    FROM facilities
    WHERE tenant_id = default_tenant_id
    LIMIT 1;

    -- If no facility exists, create one
    IF default_facility_id IS NULL THEN
      INSERT INTO facilities (name, address, phone, tenant_id, is_active)
      VALUES ('Default Facility', '123 Main St', '555-0100', default_tenant_id, true)
      RETURNING id INTO default_facility_id;
    END IF;

    -- Assign user role
    INSERT INTO user_roles (user_id, tenant_id, role, facility_id)
    VALUES (NEW.id, default_tenant_id, 'user', default_facility_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER FOR AUTO-ASSIGN
-- =====================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_user_role();

-- =====================================================
-- BACKFILL EXISTING USERS
-- =====================================================

-- Assign roles to existing users who don't have one
DO $$
DECLARE
  default_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  default_facility_id UUID;
  user_record RECORD;
BEGIN
  -- Get or create default facility
  SELECT id INTO default_facility_id
  FROM facilities
  WHERE tenant_id = default_tenant_id
  LIMIT 1;

  -- If no facility exists, create one
  IF default_facility_id IS NULL THEN
    INSERT INTO facilities (name, address, phone, tenant_id, is_active)
    VALUES ('Default Facility', '123 Main St', '555-0100', default_tenant_id, true)
    RETURNING id INTO default_facility_id;
  END IF;

  -- Assign roles to users without roles
  FOR user_record IN
    SELECT id FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM user_roles)
  LOOP
    INSERT INTO user_roles (user_id, tenant_id, role, facility_id)
    VALUES (user_record.id, default_tenant_id, 'user', default_facility_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Backfill complete: Assigned roles to existing users';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION auto_assign_user_role() IS 
  'Auto-assigns new users to default tenant with user role if they sign up without an invite';

COMMENT ON TRIGGER on_auth_user_created_assign_role ON auth.users IS 
  'Automatically creates user_role entry for new users without invites';
