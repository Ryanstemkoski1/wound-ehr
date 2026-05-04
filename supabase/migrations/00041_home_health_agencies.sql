-- =====================================================
-- Migration 00041: Home Health Agencies
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Tracks the Home Health Agency a patient is associated with (when applicable).
-- Multi-tenant scoped — agencies belong to a tenant so they don't leak across
-- customers.
-- Per docs/PROJECT_PLAN.md §7.2 (R-018).

CREATE TABLE IF NOT EXISTS home_health_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  npi TEXT,            -- National Provider Identifier (optional)
  phone TEXT,
  fax TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT home_health_agencies_unique_name_per_tenant UNIQUE (tenant_id, name)
);

COMMENT ON TABLE home_health_agencies IS
  'Home Health Agency partners. Tenant-scoped to avoid cross-customer leakage.';

CREATE INDEX IF NOT EXISTS idx_hha_tenant_active
  ON home_health_agencies (tenant_id, is_active, name);

-- Patient FK
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS home_health_agency_id UUID
  REFERENCES home_health_agencies(id) ON DELETE SET NULL;

COMMENT ON COLUMN patients.home_health_agency_id IS
  'Optional. Set when the patient receives home health services.';

CREATE INDEX IF NOT EXISTS idx_patients_hha
  ON patients (home_health_agency_id)
  WHERE home_health_agency_id IS NOT NULL;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE home_health_agencies ENABLE ROW LEVEL SECURITY;

-- Read: any user belonging to the tenant.
DROP POLICY IF EXISTS hha_select ON home_health_agencies;
CREATE POLICY hha_select ON home_health_agencies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = home_health_agencies.tenant_id
    )
  );

-- Write: tenant_admin or facility_admin only.
DROP POLICY IF EXISTS hha_write ON home_health_agencies;
CREATE POLICY hha_write ON home_health_agencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = home_health_agencies.tenant_id
        AND ur.role IN ('tenant_admin', 'facility_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = home_health_agencies.tenant_id
        AND ur.role IN ('tenant_admin', 'facility_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.touch_hha_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hha_touch_updated_at ON home_health_agencies;
CREATE TRIGGER hha_touch_updated_at
  BEFORE UPDATE ON home_health_agencies
  FOR EACH ROW EXECUTE FUNCTION public.touch_hha_updated_at();
