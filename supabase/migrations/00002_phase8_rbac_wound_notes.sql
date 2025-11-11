-- Phase 8.1: Multi-Tenant RBAC & Wound Notes Migration
-- Created: 2025-11-04
-- Description: Adds multi-tenant support, role-based access control, and per-wound notes system

-- =====================================================
-- NEW TABLES
-- =====================================================

-- Tenants Table (Multi-Tenant SaaS)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles Table (RBAC)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'facility_admin', 'user')),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Wound Notes Table (Per-Wound Timestamped Notes)
CREATE TABLE IF NOT EXISTS wound_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_id UUID NOT NULL REFERENCES wounds(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Invites Table (Email-Based Invites)
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'facility_admin', 'user')),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ALTER EXISTING TABLES
-- =====================================================

-- Add tenant_id to facilities
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index on tenant_id for facilities
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_id ON facilities(tenant_id);

-- =====================================================
-- INDEXES
-- =====================================================

-- User Roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_facility_id ON user_roles(facility_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Wound Notes indexes
CREATE INDEX IF NOT EXISTS idx_wound_notes_wound_id ON wound_notes(wound_id);
CREATE INDEX IF NOT EXISTS idx_wound_notes_visit_id ON wound_notes(visit_id);
CREATE INDEX IF NOT EXISTS idx_wound_notes_created_by ON wound_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_wound_notes_created_at ON wound_notes(created_at);

-- User Invites indexes
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_tenant_id ON user_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_invite_token ON user_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON user_invites(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wound_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Tenants Policies
CREATE POLICY "Users can view their tenant"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- User Roles Policies
CREATE POLICY "Users can view roles in their tenant"
  ON user_roles FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage all roles in their tenant"
  ON user_roles FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

CREATE POLICY "Facility admins can manage users in their facility"
  ON user_roles FOR INSERT
  WITH CHECK (
    role = 'user' AND
    facility_id IN (
      SELECT facility_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'facility_admin'
    )
  );

-- Wound Notes Policies
CREATE POLICY "Users can view wound notes in their tenant"
  ON wound_notes FOR SELECT
  USING (
    wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (
        SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
      )
      AND (
        -- Tenant admin: see all facilities
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND tenant_id = f.tenant_id 
          AND role = 'tenant_admin'
        )
        OR
        -- Facility admin/user: see only assigned facilities
        f.id IN (
          SELECT facility_id FROM user_roles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create wound notes in their facilities"
  ON wound_notes FOR INSERT
  WITH CHECK (
    wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (
        SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
      )
      AND (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND tenant_id = f.tenant_id 
          AND role = 'tenant_admin'
        )
        OR
        f.id IN (
          SELECT facility_id FROM user_roles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update their own wound notes"
  ON wound_notes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own wound notes"
  ON wound_notes FOR DELETE
  USING (created_by = auth.uid());

-- User Invites Policies
CREATE POLICY "Tenant admins can view invites in their tenant"
  ON user_invites FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin')
    )
  );

CREATE POLICY "Tenant admins can create invites in their tenant"
  ON user_invites FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

CREATE POLICY "Facility admins can create user invites in their facility"
  ON user_invites FOR INSERT
  WITH CHECK (
    role = 'user' AND
    facility_id IN (
      SELECT facility_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'facility_admin'
    )
  );

-- =====================================================
-- UPDATE EXISTING RLS POLICIES FOR TENANT ISOLATION
-- =====================================================

-- Drop existing facilities policies
DROP POLICY IF EXISTS "Users can view their facilities" ON facilities;
DROP POLICY IF EXISTS "Users can insert facilities" ON facilities;
DROP POLICY IF EXISTS "Users can update their facilities" ON facilities;

-- New facilities policies with tenant isolation
CREATE POLICY "Users can view facilities in their tenant"
  ON facilities FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND (
      -- Tenant admin: see all facilities
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND tenant_id = facilities.tenant_id 
        AND role = 'tenant_admin'
      )
      OR
      -- Facility admin/user: see only assigned facilities
      id IN (
        SELECT facility_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tenant admins can insert facilities in their tenant"
  ON facilities FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant admins can update facilities in their tenant"
  ON facilities FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM user_roles 
  WHERE user_id = p_user_id 
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND role = 'tenant_admin'
  );
$$ LANGUAGE SQL STABLE;

-- Function to check if user is facility admin
CREATE OR REPLACE FUNCTION is_facility_admin(p_user_id UUID, p_facility_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id 
    AND facility_id = p_facility_id 
    AND role = 'facility_admin'
  );
$$ LANGUAGE SQL STABLE;

-- Function to check if user has access to facility
CREATE OR REPLACE FUNCTION has_facility_access(p_user_id UUID, p_facility_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN facilities f ON ur.tenant_id = f.tenant_id
    WHERE ur.user_id = p_user_id 
    AND (
      ur.role = 'tenant_admin' 
      OR ur.facility_id = p_facility_id
    )
    AND f.id = p_facility_id
  );
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wound_notes_updated_at
  BEFORE UPDATE ON wound_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations (SaaS isolation)';
COMMENT ON TABLE user_roles IS 'User roles and facility assignments (RBAC)';
COMMENT ON TABLE wound_notes IS 'Per-wound timestamped notes (can be added anytime)';
COMMENT ON TABLE user_invites IS 'Email-based user invitations with role assignment';

COMMENT ON COLUMN user_roles.role IS 'tenant_admin: full access | facility_admin: single facility | user: basic access';
COMMENT ON COLUMN wound_notes.visit_id IS 'Optional: links note to specific visit if added during visit';
