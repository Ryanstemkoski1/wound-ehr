-- Migration 00026: Patient-Clinician Assignments
-- Created: February 16, 2026
-- Description: Add patient-clinician assignment system for calendar filtering and access control

-- =====================================================
-- CREATE PATIENT_CLINICIANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'supervisor', 'covering')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_patient ON patient_clinicians(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_user ON patient_clinicians(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_role ON patient_clinicians(role);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_active ON patient_clinicians(is_active);

-- Composite index for filtering active assignments
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_patient_active ON patient_clinicians(patient_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_user_active ON patient_clinicians(user_id, is_active);

-- =====================================================
-- ADD CLINICIAN_ID TO VISITS TABLE
-- =====================================================

-- Add clinician_id to visits for tracking who performed the visit
ALTER TABLE visits ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES auth.users(id);

-- Create index for clinician visits queries
CREATE INDEX IF NOT EXISTS idx_visits_clinician_id ON visits(clinician_id);

-- =====================================================
-- ADD PRIMARY_CLINICIAN_ID TO VISITS TABLE
-- =====================================================

-- This will be used for reporting and calendar filtering
ALTER TABLE visits ADD COLUMN IF NOT EXISTS primary_clinician_id UUID REFERENCES auth.users(id);

-- Create index for primary clinician queries
CREATE INDEX IF NOT EXISTS idx_visits_primary_clinician_id ON visits(primary_clinician_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on patient_clinicians
ALTER TABLE patient_clinicians ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view patient-clinician assignments for their tenant
CREATE POLICY "Users can view patient clinician assignments for their tenant"
  ON patient_clinicians
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN facilities f ON p.facility_id = f.id
      JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE p.id = patient_clinicians.patient_id
        AND uf.user_id = auth.uid()
    )
  );

-- Policy: Admins can create patient-clinician assignments
CREATE POLICY "Admins can create patient clinician assignments"
  ON patient_clinicians
  FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('tenant_admin', 'facility_admin')
    )
    AND EXISTS (
      SELECT 1 FROM patients p
      JOIN facilities f ON p.facility_id = f.id
      JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE p.id = patient_clinicians.patient_id
        AND uf.user_id = auth.uid()
    )
  );

-- Policy: Admins can update patient-clinician assignments
CREATE POLICY "Admins can update patient clinician assignments"
  ON patient_clinicians
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('tenant_admin', 'facility_admin')
    )
    AND EXISTS (
      SELECT 1 FROM patients p
      JOIN facilities f ON p.facility_id = f.id
      JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE p.id = patient_clinicians.patient_id
        AND uf.user_id = auth.uid()
    )
  );

-- Policy: Admins can delete patient-clinician assignments
CREATE POLICY "Admins can delete patient clinician assignments"
  ON patient_clinicians
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('tenant_admin', 'facility_admin')
    )
    AND EXISTS (
      SELECT 1 FROM patients p
      JOIN facilities f ON p.facility_id = f.id
      JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE p.id = patient_clinicians.patient_id
        AND uf.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_clinicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_clinicians_updated_at
  BEFORE UPDATE ON patient_clinicians
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_clinicians_updated_at();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE patient_clinicians IS 'Assigns clinicians to patients for calendar filtering and access control';
COMMENT ON COLUMN patient_clinicians.role IS 'Clinician role: primary (main provider), supervisor (oversight), covering (temporary)';
COMMENT ON COLUMN patient_clinicians.is_active IS 'Whether this assignment is currently active (soft delete)';
COMMENT ON COLUMN patient_clinicians.assigned_by IS 'Admin who created this assignment';

COMMENT ON COLUMN visits.clinician_id IS 'Clinician who performed this specific visit';
COMMENT ON COLUMN visits.primary_clinician_id IS 'Primary clinician for patient at time of visit (for reporting)';
