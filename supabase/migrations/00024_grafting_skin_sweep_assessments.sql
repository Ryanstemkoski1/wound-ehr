-- Migration 00024: Grafting and Skin Sweep Assessment Types
-- Phase 9.4.3: Additional specialized assessment forms
-- Date: December 5, 2025

-- ============================================================================
-- 1. GRAFTING ASSESSMENTS TABLE
-- ============================================================================
-- Tracks skin graft procedures, graft site, donor site, and healing progress

CREATE TABLE IF NOT EXISTS grafting_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Procedure Information
  procedure_date TIMESTAMPTZ NOT NULL,
  postop_day INTEGER, -- Days since procedure
  procedure_type TEXT NOT NULL CHECK (procedure_type IN (
    'initial_grafting',
    'regrafting',
    'touch_up',
    'donor_site_check'
  )),
  
  -- Graft Details
  graft_type TEXT NOT NULL CHECK (graft_type IN (
    'split_thickness',
    'full_thickness',
    'dermal_substitute',
    'skin_substitute',
    'acellular_matrix',
    'composite_graft',
    'mesh_graft'
  )),
  graft_location TEXT NOT NULL, -- e.g., "Left lower leg, lateral aspect"
  graft_size_length NUMERIC(5,2), -- cm
  graft_size_width NUMERIC(5,2), -- cm
  graft_size_area NUMERIC(7,2), -- cm² (calculated)
  mesh_ratio TEXT, -- e.g., "1:1.5", "3:1" for mesh grafts
  
  -- Graft Site Assessment
  graft_adherence_percent INTEGER CHECK (graft_adherence_percent BETWEEN 0 AND 100),
  graft_adherence_notes TEXT,
  graft_viable BOOLEAN DEFAULT true,
  graft_color TEXT CHECK (graft_color IN (
    'pink', 'red', 'pale', 'dusky', 'purple', 'white', 'mottled'
  )),
  graft_texture TEXT CHECK (graft_texture IN (
    'supple', 'firm', 'tense', 'edematous', 'dry', 'fragile'
  )),
  
  -- Signs of Complications
  signs_of_rejection BOOLEAN DEFAULT false,
  signs_of_infection BOOLEAN DEFAULT false,
  infection_signs TEXT[], -- ['increased_warmth', 'purulent_drainage', 'odor', 'erythema']
  has_hematoma BOOLEAN DEFAULT false,
  has_seroma BOOLEAN DEFAULT false,
  has_blistering BOOLEAN DEFAULT false,
  graft_separation BOOLEAN DEFAULT false,
  graft_necrosis BOOLEAN DEFAULT false,
  necrosis_percent INTEGER CHECK (necrosis_percent BETWEEN 0 AND 100),
  
  -- Donor Site Information
  donor_site TEXT, -- e.g., "Right thigh, anterior"
  donor_site_size_length NUMERIC(5,2), -- cm
  donor_site_size_width NUMERIC(5,2), -- cm
  donor_site_condition TEXT CHECK (donor_site_condition IN (
    'healing_well',
    'epithelializing',
    'dry',
    'moist',
    'drainage',
    'infection',
    'delayed_healing'
  )),
  donor_site_dressing TEXT,
  donor_site_notes TEXT,
  
  -- Fixation Method
  fixation_method TEXT CHECK (fixation_method IN (
    'sutures',
    'staples',
    'steri_strips',
    'tissue_glue',
    'bolster',
    'negative_pressure',
    'combination'
  )),
  fixation_details TEXT,
  sutures_removed BOOLEAN DEFAULT false,
  sutures_removal_date TIMESTAMPTZ,
  
  -- Dressing & Treatment
  graft_dressing_type TEXT,
  graft_dressing_intact BOOLEAN DEFAULT true,
  dressing_change_frequency TEXT,
  topical_treatment TEXT, -- e.g., "Silver sulfadiazine", "Bacitracin"
  moisture_management TEXT,
  
  -- Patient Instructions
  activity_restrictions TEXT,
  elevation_instructions TEXT,
  weight_bearing_status TEXT CHECK (weight_bearing_status IN (
    'non_weight_bearing',
    'partial_weight_bearing',
    'full_weight_bearing',
    'as_tolerated',
    'not_applicable'
  )),
  bathing_instructions TEXT,
  
  -- Follow-up & Education
  postop_instructions TEXT,
  patient_education_provided TEXT,
  follow_up_plan TEXT,
  next_dressing_change_date TIMESTAMPTZ,
  
  -- Clinical Notes
  complications TEXT,
  interventions_performed TEXT,
  provider_notes TEXT,
  overall_assessment TEXT CHECK (overall_assessment IN (
    'excellent', 'good', 'fair', 'poor', 'concerning'
  ))
);

-- Indexes for grafting_assessments
CREATE INDEX idx_grafting_assessments_visit_id ON grafting_assessments(visit_id);
CREATE INDEX idx_grafting_assessments_patient_id ON grafting_assessments(patient_id);
CREATE INDEX idx_grafting_assessments_facility_id ON grafting_assessments(facility_id);
CREATE INDEX idx_grafting_assessments_created_by ON grafting_assessments(created_by);
CREATE INDEX idx_grafting_assessments_procedure_date ON grafting_assessments(procedure_date DESC);

-- RLS policies for grafting_assessments
ALTER TABLE grafting_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view grafting assessments for their facilities
CREATE POLICY "Users can view grafting assessments for their facilities"
  ON grafting_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_facilities
      WHERE user_facilities.user_id = auth.uid()
      AND user_facilities.facility_id = grafting_assessments.facility_id
    )
  );

-- Users can create grafting assessments for their facilities
CREATE POLICY "Users can create grafting assessments for their facilities"
  ON grafting_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_facilities
      WHERE user_facilities.user_id = auth.uid()
      AND user_facilities.facility_id = grafting_assessments.facility_id
    )
    AND created_by = auth.uid()
  );

-- Users can update grafting assessments they created
CREATE POLICY "Users can update their own grafting assessments"
  ON grafting_assessments FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete grafting assessments they created
CREATE POLICY "Users can delete their own grafting assessments"
  ON grafting_assessments FOR DELETE
  USING (created_by = auth.uid());


-- ============================================================================
-- 2. SKIN SWEEP ASSESSMENTS TABLE
-- ============================================================================
-- Documents comprehensive skin inspections, body area assessments, at-risk identification

CREATE TABLE IF NOT EXISTS skin_sweep_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Assessment Information
  assessment_date TIMESTAMPTZ NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'admission',
    'routine',
    'discharge',
    'post_fall',
    'concern_identified'
  )),
  
  -- Body Areas Inspected (checkboxes - stored as array)
  areas_inspected TEXT[] NOT NULL, -- ['head', 'neck', 'shoulders', 'back', 'chest', etc.]
  
  -- Overall Skin Condition
  skin_condition_overall TEXT CHECK (skin_condition_overall IN (
    'intact',
    'dry',
    'fragile',
    'edematous',
    'compromised',
    'clammy',
    'diaphoretic'
  )),
  skin_temperature TEXT CHECK (skin_temperature IN (
    'warm', 'cool', 'hot', 'cold', 'normal'
  )),
  skin_color TEXT CHECK (skin_color IN (
    'normal', 'pale', 'flushed', 'cyanotic', 'jaundiced', 'mottled'
  )),
  skin_turgor TEXT CHECK (skin_turgor IN (
    'good', 'fair', 'poor', 'tenting'
  )),
  
  -- Wound Findings
  total_wounds_found INTEGER DEFAULT 0,
  new_wounds_documented INTEGER DEFAULT 0,
  wounds_unchanged INTEGER DEFAULT 0,
  wounds_improved INTEGER DEFAULT 0,
  wounds_worsened INTEGER DEFAULT 0,
  
  -- At-Risk Areas (body locations requiring monitoring)
  at_risk_areas TEXT[], -- ['sacrum', 'heels', 'elbows', 'occiput', etc.]
  at_risk_notes TEXT,
  
  -- Specific Body Area Findings
  -- Head & Neck
  head_neck_findings TEXT,
  head_neck_has_wounds BOOLEAN DEFAULT false,
  
  -- Trunk (Chest, Abdomen, Back)
  trunk_findings TEXT,
  trunk_has_wounds BOOLEAN DEFAULT false,
  
  -- Upper Extremities
  upper_extremities_findings TEXT,
  upper_extremities_has_wounds BOOLEAN DEFAULT false,
  
  -- Lower Extremities
  lower_extremities_findings TEXT,
  lower_extremities_has_wounds BOOLEAN DEFAULT false,
  
  -- Sacral/Coccyx Area
  sacral_findings TEXT,
  sacral_has_wounds BOOLEAN DEFAULT false,
  
  -- Genitalia/Perineum (if applicable)
  perineal_findings TEXT,
  perineal_has_wounds BOOLEAN DEFAULT false,
  
  -- Medical Devices (causing pressure)
  devices_identified TEXT[], -- ['oxygen_tubing', 'catheter', 'ng_tube', 'iv_line', etc.]
  device_related_injuries BOOLEAN DEFAULT false,
  device_injury_details TEXT,
  
  -- Moisture-Related Issues
  has_incontinence BOOLEAN DEFAULT false,
  incontinence_type TEXT CHECK (incontinence_type IN (
    'urinary', 'bowel', 'both', 'none'
  )),
  moisture_associated_dermatitis BOOLEAN DEFAULT false,
  skin_breakdown_from_moisture BOOLEAN DEFAULT false,
  
  -- Risk Factors Identified
  risk_factors TEXT[], -- ['diabetes', 'poor_nutrition', 'immobility', 'incontinence', etc.]
  braden_scale_score INTEGER CHECK (braden_scale_score BETWEEN 6 AND 23),
  risk_level TEXT CHECK (risk_level IN (
    'no_risk', 'mild_risk', 'moderate_risk', 'high_risk', 'severe_risk'
  )),
  
  -- Prevention Measures (current and recommended)
  current_prevention_measures JSONB, -- {"repositioning": "q2h", "support_surface": "foam", "barrier_cream": true}
  recommended_prevention_measures JSONB,
  
  -- Equipment Recommendations
  equipment_recommendations TEXT[], -- ['pressure_relief_mattress', 'heel_protectors', 'chair_cushion']
  equipment_currently_in_use TEXT[],
  equipment_ordered TEXT[],
  
  -- Patient/Caregiver Education
  education_provided BOOLEAN DEFAULT false,
  education_topics TEXT[], -- ['repositioning', 'nutrition', 'skin_care', 'moisture_management']
  education_method TEXT CHECK (education_method IN (
    'verbal', 'written', 'demonstration', 'video', 'combination'
  )),
  patient_understanding TEXT CHECK (patient_understanding IN (
    'verbalizes_understanding',
    'demonstrates_understanding',
    'requires_reinforcement',
    'language_barrier',
    'cognitive_impairment'
  )),
  caregiver_education_provided BOOLEAN DEFAULT false,
  
  -- Follow-up & Referrals
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_frequency TEXT,
  referrals_made TEXT[], -- ['wound_care_specialist', 'dietitian', 'pt', 'ot', 'social_work']
  
  -- Clinical Notes
  significant_findings TEXT,
  interventions_implemented TEXT,
  provider_assessment TEXT,
  notes TEXT
);

-- Indexes for skin_sweep_assessments
CREATE INDEX idx_skin_sweep_assessments_visit_id ON skin_sweep_assessments(visit_id);
CREATE INDEX idx_skin_sweep_assessments_patient_id ON skin_sweep_assessments(patient_id);
CREATE INDEX idx_skin_sweep_assessments_facility_id ON skin_sweep_assessments(facility_id);
CREATE INDEX idx_skin_sweep_assessments_created_by ON skin_sweep_assessments(created_by);
CREATE INDEX idx_skin_sweep_assessments_date ON skin_sweep_assessments(assessment_date DESC);

-- RLS policies for skin_sweep_assessments
ALTER TABLE skin_sweep_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view skin sweep assessments for their facilities
CREATE POLICY "Users can view skin sweep assessments for their facilities"
  ON skin_sweep_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_facilities
      WHERE user_facilities.user_id = auth.uid()
      AND user_facilities.facility_id = skin_sweep_assessments.facility_id
    )
  );

-- Users can create skin sweep assessments for their facilities
CREATE POLICY "Users can create skin sweep assessments for their facilities"
  ON skin_sweep_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_facilities
      WHERE user_facilities.user_id = auth.uid()
      AND user_facilities.facility_id = skin_sweep_assessments.facility_id
    )
    AND created_by = auth.uid()
  );

-- Users can update skin sweep assessments they created
CREATE POLICY "Users can update their own skin sweep assessments"
  ON skin_sweep_assessments FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete skin sweep assessments they created
CREATE POLICY "Users can delete their own skin sweep assessments"
  ON skin_sweep_assessments FOR DELETE
  USING (created_by = auth.uid());


-- ============================================================================
-- 3. UPDATE TRIGGER FOR TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_specialized_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grafting_assessments_updated_at
  BEFORE UPDATE ON grafting_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_specialized_assessment_updated_at();

CREATE TRIGGER update_skin_sweep_assessments_updated_at
  BEFORE UPDATE ON skin_sweep_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_specialized_assessment_updated_at();
