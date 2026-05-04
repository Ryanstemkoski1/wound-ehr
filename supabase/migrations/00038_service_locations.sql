-- =====================================================
-- Migration 00038: Service Locations
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Per-facility named locations (e.g. "Wound Clinic Suite A", "Patient Room",
-- "Telehealth"). Replaces the freeform visits.location TEXT with a
-- structured FK. visits.location stays in place (additive migration) so
-- existing rows are unaffected; new visits should populate service_location_id
-- via the unified NewVisitDialog (Phase 2 UI).
-- Per docs/PROJECT_PLAN.md §7.2 (R-016).

CREATE TABLE IF NOT EXISTS service_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_locations_unique_name_per_facility UNIQUE (facility_id, name)
);

COMMENT ON TABLE service_locations IS
  'Named visit locations per facility. Used by NewVisitDialog to drive a structured location dropdown.';

CREATE INDEX IF NOT EXISTS idx_service_locations_facility_active
  ON service_locations (facility_id, is_active, sort_order);

-- Add structured FK on visits. visits.location TEXT stays for backward compat.
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS service_location_id UUID
  REFERENCES service_locations(id) ON DELETE SET NULL;

COMMENT ON COLUMN visits.service_location_id IS
  'Structured replacement for visits.location TEXT. NULL on legacy rows.';

CREATE INDEX IF NOT EXISTS idx_visits_service_location
  ON visits (service_location_id)
  WHERE service_location_id IS NOT NULL;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user assigned to the facility.
DROP POLICY IF EXISTS service_locations_select ON service_locations;
CREATE POLICY service_locations_select ON service_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_facilities uf
      WHERE uf.facility_id = service_locations.facility_id
        AND uf.user_id = auth.uid()
    )
  );

-- Write (insert/update/delete): admins of the facility's tenant only.
DROP POLICY IF EXISTS service_locations_write ON service_locations;
CREATE POLICY service_locations_write ON service_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN facilities f ON f.tenant_id = ur.tenant_id
      WHERE f.id = service_locations.facility_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('tenant_admin', 'facility_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN facilities f ON f.tenant_id = ur.tenant_id
      WHERE f.id = service_locations.facility_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('tenant_admin', 'facility_admin')
    )
  );

-- Touch updated_at on writes
CREATE OR REPLACE FUNCTION public.touch_service_locations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_locations_touch_updated_at ON service_locations;
CREATE TRIGGER service_locations_touch_updated_at
  BEFORE UPDATE ON service_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_service_locations_updated_at();
