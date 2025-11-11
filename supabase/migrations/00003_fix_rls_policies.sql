-- Fix: Remove problematic RLS policies on user_roles table
-- Run this in Supabase SQL Editor to fix the infinite recursion

-- Drop existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can view all roles in their tenant" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can delete roles" ON user_roles;

-- Disable RLS on user_roles temporarily (we'll use service_role key for admin operations)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simpler policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can view their own roles only
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admin operations will be done via service actions (bypassing RLS)
-- This prevents the infinite recursion issue

-- Also simplify tenants table policies
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;

ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenants"
  ON tenants FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Success message
SELECT 'RLS policies fixed! Infinite recursion resolved.' as status;
