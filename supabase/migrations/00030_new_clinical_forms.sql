-- Migration: 00030_new_clinical_forms
-- Date: March 16, 2026
-- Description: New tables for Arobella debridement assessments, patient-not-seen reports,
--              and incident reports. Consent-to-treatment and photo/video consent use the
--              existing patient_consents table with new consent_type values.

-- ============================================================================
-- 1. Debridement Assessments (Arobella Dictation Guide)
-- ============================================================================

CREATE TABLE IF NOT EXISTS debridement_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  created_by UUID REFERENCES users(id),

  -- Header
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  place_of_service TEXT CHECK (place_of_service IN (
    'patient_home', 'assisted_living', 'nursing_home', 'physician_office', 'other'
  )),

  -- Pre-Debridement Wound Assessment
  wound_location TEXT,
  wound_duration_years INTEGER,
  wound_duration_months INTEGER,
  wound_duration_weeks INTEGER,
  wound_type TEXT CHECK (wound_type IN (
    'diabetic', 'venous', 'arterial', 'pressure', 'surgical', 'trauma', 'other'
  )),
  wound_type_other TEXT,
  wound_depth TEXT CHECK (wound_depth IN ('full_thickness', 'partial_thickness')),
  pre_size_length DECIMAL(6,2),
  pre_size_width DECIMAL(6,2),
  pre_size_depth DECIMAL(6,2),
  has_undermining BOOLEAN DEFAULT FALSE,
  has_tunneling BOOLEAN DEFAULT FALSE,
  tunneling_cm DECIMAL(4,1),
  tunneling_clock_position TEXT,
  pre_granulation_percent INTEGER CHECK (pre_granulation_percent BETWEEN 0 AND 100),
  pre_fibrotic_percent INTEGER CHECK (pre_fibrotic_percent BETWEEN 0 AND 100),
  pre_slough_percent INTEGER CHECK (pre_slough_percent BETWEEN 0 AND 100),
  pre_eschar_percent INTEGER CHECK (pre_eschar_percent BETWEEN 0 AND 100),
  visible_structures TEXT[] DEFAULT '{}',
  wound_edges TEXT[] DEFAULT '{}',
  periwound_skin TEXT[] DEFAULT '{}',
  periwound_skin_other TEXT,
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  pain_description TEXT,

  -- Post-Debridement Wound Assessment
  post_size_length DECIMAL(6,2),
  post_size_width DECIMAL(6,2),
  post_size_depth DECIMAL(6,2),
  debridement_type TEXT DEFAULT 'selective_non_contact',
  anesthetic_used TEXT,
  method_used TEXT DEFAULT 'ultrasonic_non_contact',
  device_frequency TEXT DEFAULT '35_khz',
  device_mode TEXT CHECK (device_mode IN ('contact', 'non_contact')),
  instrument_used TEXT DEFAULT 'arobella_qurette',
  solution TEXT[] DEFAULT '{}',
  solution_other TEXT,
  tissue_removed TEXT[] DEFAULT '{}',
  depth_of_tissue_removed TEXT CHECK (depth_of_tissue_removed IN (
    'superficial', 'into_dermis', 'into_subcutaneous', 'muscle', 'bone'
  )),
  area_debrided DECIMAL(6,2),
  hemostasis_achieved BOOLEAN,
  hemostasis_method TEXT,
  estimated_blood_loss TEXT,
  post_granulation_percent INTEGER CHECK (post_granulation_percent BETWEEN 0 AND 100),
  post_fibrotic_percent INTEGER CHECK (post_fibrotic_percent BETWEEN 0 AND 100),
  post_slough_percent INTEGER CHECK (post_slough_percent BETWEEN 0 AND 100),
  post_eschar_percent INTEGER CHECK (post_eschar_percent BETWEEN 0 AND 100),

  -- Procedure Notes
  procedure_notes TEXT,

  -- Goals of Care
  goals_of_care TEXT[] DEFAULT '{}',

  -- Plan
  next_debridement_days INTEGER,
  dressing_change_days INTEGER,
  referrals TEXT[] DEFAULT '{}',
  referral_other TEXT,

  -- Additional Interventions
  additional_interventions TEXT[] DEFAULT '{}',

  -- Medical Necessity
  include_medical_necessity BOOLEAN DEFAULT TRUE,
  medical_necessity_custom TEXT,

  -- Status
  is_draft BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debridement_assessments_visit ON debridement_assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_debridement_assessments_patient ON debridement_assessments(patient_id);

-- RLS
ALTER TABLE debridement_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view debridement assessments for their facilities"
  ON debridement_assessments FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage debridement assessments for their facilities"
  ON debridement_assessments FOR ALL
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 2. Patient Not Seen Reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_not_seen_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  created_by UUID REFERENCES users(id),

  scheduled_date DATE NOT NULL,
  clinician_name TEXT,

  reason TEXT NOT NULL CHECK (reason IN (
    'patient_refused', 'doctors_appointment', 'hospitalized',
    'not_available', 'scheduling_error', 'duplicate_referral', 'other'
  )),
  reason_other TEXT,

  pertinent_notes TEXT,

  -- Follow-Up Plan
  follow_up_rescheduled BOOLEAN DEFAULT FALSE,
  follow_up_new_date DATE,
  facility_notified BOOLEAN DEFAULT FALSE,
  family_notified BOOLEAN DEFAULT FALSE,
  referral_source_notified BOOLEAN DEFAULT FALSE,
  no_further_action BOOLEAN DEFAULT FALSE,
  follow_up_other TEXT,

  -- Signature
  clinician_signature_id UUID REFERENCES signatures(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_not_seen_patient ON patient_not_seen_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_not_seen_visit ON patient_not_seen_reports(visit_id);

-- RLS
ALTER TABLE patient_not_seen_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view not-seen reports for their facilities"
  ON patient_not_seen_reports FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage not-seen reports for their facilities"
  ON patient_not_seen_reports FOR ALL
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 3. Incident Reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id),
  created_by UUID REFERENCES users(id),

  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_time TIME,
  incident_location TEXT,

  -- Employee Info
  employee_name TEXT NOT NULL,
  employee_role TEXT,
  employee_contact TEXT,

  -- Patient (optional)
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT,
  patient_dob DATE,
  patient_facility_agency TEXT,

  -- Incident Details
  description TEXT NOT NULL,
  immediate_actions TEXT,

  -- Signature
  signature_id UUID REFERENCES signatures(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_facility ON incident_reports(facility_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_date ON incident_reports(report_date);

-- RLS
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incident reports for their facilities"
  ON incident_reports FOR SELECT
  USING (
    facility_id IN (
      SELECT uf.facility_id FROM user_facilities uf
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage incident reports for their facilities"
  ON incident_reports FOR ALL
  USING (
    facility_id IN (
      SELECT uf.facility_id FROM user_facilities uf
      WHERE uf.user_id = auth.uid()
    )
  );
