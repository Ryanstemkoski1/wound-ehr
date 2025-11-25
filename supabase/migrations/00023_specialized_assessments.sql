-- Migration 00023: Specialized Assessment Types
-- Phase 9.4.2: RN/LVN Skilled Nursing Visit & G-tube Documentation
-- Date: November 25, 2025

-- ============================================================================
-- 1. SKILLED NURSING VISIT ASSESSMENTS TABLE
-- ============================================================================
-- Comprehensive nursing assessment based on RN/LVN Cheat Sheet template
-- Tied to visits, includes full systems review + wound section

CREATE TABLE IF NOT EXISTS skilled_nursing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Header Information
  assessment_date TIMESTAMPTZ NOT NULL,
  has_pain BOOLEAN DEFAULT false,
  pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),
  pain_location TEXT,
  pain_quality TEXT,
  pain_management TEXT,
  pain_aggravating_factors TEXT,
  
  -- Vitals
  temp NUMERIC(4, 1),
  heart_rate INTEGER,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  respiratory_rate INTEGER,
  oxygen_saturation INTEGER,
  blood_sugar INTEGER,
  
  -- Cardiovascular
  cardiovascular_wnl BOOLEAN DEFAULT false,
  chest_pain BOOLEAN DEFAULT false,
  heart_murmur BOOLEAN DEFAULT false,
  heart_gallop BOOLEAN DEFAULT false,
  heart_click BOOLEAN DEFAULT false,
  heart_irregular BOOLEAN DEFAULT false,
  peripheral_pulses TEXT,
  cap_refill_under_3sec BOOLEAN DEFAULT true,
  dizziness BOOLEAN DEFAULT false,
  has_edema BOOLEAN DEFAULT false,
  edema_grade TEXT, -- '+1', '+2', '+3', '+4'
  neck_vein_distention BOOLEAN DEFAULT false,
  
  -- Respiratory
  lung_sounds_cta BOOLEAN DEFAULT false,
  lung_sounds_rales BOOLEAN DEFAULT false,
  lung_sounds_rhonchi BOOLEAN DEFAULT false,
  lung_sounds_wheezes BOOLEAN DEFAULT false,
  lung_sounds_crackles BOOLEAN DEFAULT false,
  lung_sounds_absent BOOLEAN DEFAULT false,
  lung_sounds_diminished BOOLEAN DEFAULT false,
  lung_sounds_stridor BOOLEAN DEFAULT false,
  has_cough BOOLEAN DEFAULT false,
  cough_productive BOOLEAN DEFAULT false,
  has_sputum BOOLEAN DEFAULT false,
  sputum_description TEXT,
  on_oxygen BOOLEAN DEFAULT false,
  oxygen_lpm NUMERIC(4, 1),
  on_nebulizer BOOLEAN DEFAULT false,
  nebulizer_type TEXT, -- 'intermittent' or 'continuous'
  nebulizer_time TEXT,
  
  -- Orientation / Neuro
  oriented_person BOOLEAN DEFAULT true,
  oriented_place BOOLEAN DEFAULT true,
  oriented_time BOOLEAN DEFAULT true,
  disoriented BOOLEAN DEFAULT false,
  forgetful BOOLEAN DEFAULT false,
  lethargic BOOLEAN DEFAULT false,
  perrl BOOLEAN DEFAULT true,
  has_seizures BOOLEAN DEFAULT false,
  
  -- Sensory
  sensory_wnl BOOLEAN DEFAULT false,
  hearing_impaired_left BOOLEAN DEFAULT false,
  hearing_impaired_right BOOLEAN DEFAULT false,
  hearing_deaf BOOLEAN DEFAULT false,
  speech_impaired BOOLEAN DEFAULT false,
  vision_wnl BOOLEAN DEFAULT false,
  vision_glasses BOOLEAN DEFAULT false,
  vision_contacts BOOLEAN DEFAULT false,
  vision_blurred BOOLEAN DEFAULT false,
  vision_cataracts BOOLEAN DEFAULT false,
  vision_glaucoma BOOLEAN DEFAULT false,
  vision_blind BOOLEAN DEFAULT false,
  vision_macular_degeneration BOOLEAN DEFAULT false,
  decreased_sensation TEXT,
  
  -- GU (Genitourinary)
  gu_wnl BOOLEAN DEFAULT false,
  gu_incontinence BOOLEAN DEFAULT false,
  gu_distention BOOLEAN DEFAULT false,
  gu_burning BOOLEAN DEFAULT false,
  gu_frequency BOOLEAN DEFAULT false,
  gu_dysuria BOOLEAN DEFAULT false,
  gu_retention BOOLEAN DEFAULT false,
  gu_urgency BOOLEAN DEFAULT false,
  gu_urostomy TEXT,
  catheter_type TEXT, -- 'foley', 'suprapubic', or null
  catheter_size_fr INTEGER,
  catheter_balloon_cc INTEGER,
  catheter_last_changed DATE,
  urine_cloudy BOOLEAN DEFAULT false,
  urine_odorous BOOLEAN DEFAULT false,
  urine_sediment BOOLEAN DEFAULT false,
  urine_hematuria BOOLEAN DEFAULT false,
  urine_other TEXT,
  external_genitalia_normal BOOLEAN DEFAULT true,
  external_genitalia_notes TEXT,
  
  -- Digestive / GI
  gi_wnl BOOLEAN DEFAULT false,
  gi_nausea_vomiting BOOLEAN DEFAULT false,
  gi_npo BOOLEAN DEFAULT false,
  gi_reflux BOOLEAN DEFAULT false,
  gi_diarrhea BOOLEAN DEFAULT false,
  gi_constipation TEXT, -- 'chronic', 'acute', 'occasional'
  gi_incontinence BOOLEAN DEFAULT false,
  bowel_sounds TEXT, -- 'hyperactive', 'hypoactive', 'normal'
  last_bm DATE,
  stool_wnl BOOLEAN DEFAULT false,
  stool_gray BOOLEAN DEFAULT false,
  stool_tarry BOOLEAN DEFAULT false,
  stool_fresh_blood BOOLEAN DEFAULT false,
  stool_black BOOLEAN DEFAULT false,
  has_ostomy BOOLEAN DEFAULT false,
  ostomy_stoma_appearance TEXT,
  ostomy_stool_appearance TEXT,
  ostomy_surrounding_skin TEXT,
  
  -- Nutrition
  nutrition_wnl BOOLEAN DEFAULT false,
  dysphagia BOOLEAN DEFAULT false,
  decreased_appetite BOOLEAN DEFAULT false,
  weight_change TEXT,
  meals_prepared_appropriately BOOLEAN DEFAULT true,
  adequate_intake BOOLEAN DEFAULT true,
  chewing_swallowing_issues BOOLEAN DEFAULT false,
  dentures BOOLEAN DEFAULT false,
  dental_problems TEXT,
  tube_feeding BOOLEAN DEFAULT false,
  tube_feeding_formula TEXT,
  tube_feeding_type TEXT, -- 'bolus' or 'continuous'
  tube_feeding_rate_cc_hr INTEGER,
  tube_feeding_method TEXT, -- 'pump' or 'gravity'
  tube_feeding_placement_checked BOOLEAN DEFAULT false,
  
  -- Medications
  med_changes_since_last_visit BOOLEAN DEFAULT false,
  med_compliant BOOLEAN DEFAULT true,
  medication_notes TEXT,
  
  -- Psychosocial
  poor_home_environment BOOLEAN DEFAULT false,
  poor_coping_skills BOOLEAN DEFAULT false,
  agitated BOOLEAN DEFAULT false,
  depressed_mood BOOLEAN DEFAULT false,
  impaired_decision_making BOOLEAN DEFAULT false,
  anxiety BOOLEAN DEFAULT false,
  inappropriate_behavior BOOLEAN DEFAULT false,
  irritability BOOLEAN DEFAULT false,
  
  -- Musculoskeletal
  musculoskeletal_wnl BOOLEAN DEFAULT false,
  weakness BOOLEAN DEFAULT false,
  ambulation_difficulty BOOLEAN DEFAULT false,
  limited_mobility TEXT,
  joint_pain BOOLEAN DEFAULT false,
  balance_issues BOOLEAN DEFAULT false,
  grip_strength_equal BOOLEAN DEFAULT true,
  bedbound BOOLEAN DEFAULT false,
  chairbound BOOLEAN DEFAULT false,
  contracture BOOLEAN DEFAULT false,
  paralysis BOOLEAN DEFAULT false,
  
  -- Integumentary
  integumentary_wnl BOOLEAN DEFAULT false,
  skin_dry BOOLEAN DEFAULT false,
  skin_clammy BOOLEAN DEFAULT false,
  skin_warm BOOLEAN DEFAULT false,
  skin_cool BOOLEAN DEFAULT false,
  skin_pallor BOOLEAN DEFAULT false,
  skin_turgor TEXT, -- 'good', 'decreased', 'poor'
  
  -- MD Notification
  md_notification TEXT,
  
  -- Education
  education_given TEXT,
  education_source TEXT,
  
  -- Problems/Issues
  problems_issues TEXT,
  
  -- Metadata
  is_draft BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. SKILLED NURSING WOUND RECORDS TABLE
-- ============================================================================
-- Multiple wounds can be documented per skilled nursing visit
-- This is the "Wound Care Worksheet" section

CREATE TABLE IF NOT EXISTS skilled_nursing_wounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES skilled_nursing_assessments(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  wound_id UUID REFERENCES wounds(id) ON DELETE SET NULL, -- Link to existing wound if applicable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Wound Details
  location TEXT NOT NULL,
  onset_date DATE,
  size TEXT, -- Free text (e.g., "2cm x 3cm x 1cm")
  drainage TEXT,
  odor TEXT,
  etiology TEXT,
  stage TEXT,
  has_undermining BOOLEAN DEFAULT false,
  has_inflammation BOOLEAN DEFAULT false,
  treatment TEXT,
  photo_obtained BOOLEAN DEFAULT false,
  comments TEXT,
  
  -- Optional: Body diagram coordinates
  diagram_x INTEGER,
  diagram_y INTEGER
);

-- ============================================================================
-- 3. G-TUBE PROCEDURE DOCUMENTATION TABLE
-- ============================================================================
-- Standalone procedure documentation (MEND template)
-- Not tied to wounds, procedure-specific

CREATE TABLE IF NOT EXISTS gtube_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Patient and Facility Info
  procedure_date TIMESTAMPTZ NOT NULL,
  is_new_patient BOOLEAN DEFAULT false,
  to_pmd TEXT, -- Provider name
  snf_bed_room TEXT,
  provider TEXT,
  
  -- Comorbidities (checkboxes)
  comorbidity_inanition BOOLEAN DEFAULT false,
  comorbidity_obesity BOOLEAN DEFAULT false,
  comorbidity_hypermobility BOOLEAN DEFAULT false,
  comorbidity_encephalopathy BOOLEAN DEFAULT false,
  comorbidity_neuropathy BOOLEAN DEFAULT false,
  comorbidity_dysphagia BOOLEAN DEFAULT false,
  comorbidity_cva BOOLEAN DEFAULT false,
  comorbidity_diabetes BOOLEAN DEFAULT false,
  comorbidity_resp_failure BOOLEAN DEFAULT false,
  comorbidity_weakness BOOLEAN DEFAULT false,
  comorbidity_htn BOOLEAN DEFAULT false,
  comorbidity_atherosclerosis BOOLEAN DEFAULT false,
  comorbidity_limited_mobility BOOLEAN DEFAULT false,
  comorbidity_contracture BOOLEAN DEFAULT false,
  comorbidity_anemia TEXT,
  
  -- Discussion / Interim History
  discussion TEXT,
  
  -- Procedure Performed
  procedure_emergent_replacement_contrast BOOLEAN DEFAULT false,
  procedure_replacement_contrast BOOLEAN DEFAULT false,
  procedure_emergent_replacement_no_contrast BOOLEAN DEFAULT false,
  procedure_replacement_no_contrast BOOLEAN DEFAULT false,
  procedure_dc_removal BOOLEAN DEFAULT false,
  procedure_other TEXT,
  
  -- Abdominal Exam
  abdomen_soft BOOLEAN DEFAULT false,
  abdomen_non_distended BOOLEAN DEFAULT false,
  abdomen_distended BOOLEAN DEFAULT false,
  abdomen_tender BOOLEAN DEFAULT false,
  abdomen_nontender BOOLEAN DEFAULT false,
  abdomen_other TEXT,
  
  -- Tube Type
  tube_type_peg BOOLEAN DEFAULT false,
  tube_type_balloon BOOLEAN DEFAULT false,
  tube_type_other TEXT,
  
  -- Peri-Tube Findings
  peritube_bleeding BOOLEAN DEFAULT false,
  peritube_ulceration BOOLEAN DEFAULT false,
  peritube_erythema BOOLEAN DEFAULT false,
  peritube_tenderness BOOLEAN DEFAULT false,
  peritube_leakage BOOLEAN DEFAULT false,
  peritube_purulence BOOLEAN DEFAULT false,
  peritube_hypergranulation BOOLEAN DEFAULT false,
  peritube_other TEXT,
  
  -- Last G-Tube Placed On
  last_gtube_placed_date DATE,
  
  -- Replacement Tube Details
  replacement_tube_size_fr INTEGER,
  replacement_tube_balloon BOOLEAN DEFAULT false,
  replacement_tube_balloon_capacity_cc INTEGER,
  replacement_tube_other_type TEXT,
  
  -- Reason for Replacement
  reason_dislodgement BOOLEAN DEFAULT false,
  reason_damage_malfunction BOOLEAN DEFAULT false,
  reason_infection BOOLEAN DEFAULT false,
  reason_leakage BOOLEAN DEFAULT false,
  reason_deterioration_age BOOLEAN DEFAULT false,
  reason_obstruction BOOLEAN DEFAULT false,
  reason_other TEXT,
  
  -- Verification of Placement
  verification_auscultation BOOLEAN DEFAULT false,
  verification_gastrografin BOOLEAN DEFAULT false,
  verification_xray BOOLEAN DEFAULT false,
  verification_other TEXT,
  
  -- Procedure Note
  consent_obtained BOOLEAN DEFAULT false,
  consent_previously_obtained BOOLEAN DEFAULT false,
  urgent_consent_reason TEXT,
  site_cleansing TEXT,
  analgesia_used TEXT,
  removal_resistance TEXT,
  removal_bleeding TEXT,
  placement_resistance TEXT,
  balloon_inflation TEXT,
  post_procedure_bleeding BOOLEAN DEFAULT false,
  tolerated_well BOOLEAN DEFAULT true,
  
  -- Instructions
  dressing_order TEXT,
  wait_for_radiology BOOLEAN DEFAULT false,
  feeding_restart_instructions TEXT,
  
  -- Comments / Recommendations
  comments TEXT,
  
  -- Metadata
  is_draft BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX idx_skilled_nursing_assessments_visit ON skilled_nursing_assessments(visit_id);
CREATE INDEX idx_skilled_nursing_assessments_patient ON skilled_nursing_assessments(patient_id);
CREATE INDEX idx_skilled_nursing_assessments_facility ON skilled_nursing_assessments(facility_id);
CREATE INDEX idx_skilled_nursing_assessments_date ON skilled_nursing_assessments(assessment_date);

CREATE INDEX idx_skilled_nursing_wounds_assessment ON skilled_nursing_wounds(assessment_id);
CREATE INDEX idx_skilled_nursing_wounds_visit ON skilled_nursing_wounds(visit_id);
CREATE INDEX idx_skilled_nursing_wounds_wound ON skilled_nursing_wounds(wound_id);

CREATE INDEX idx_gtube_procedures_patient ON gtube_procedures(patient_id);
CREATE INDEX idx_gtube_procedures_facility ON gtube_procedures(facility_id);
CREATE INDEX idx_gtube_procedures_date ON gtube_procedures(procedure_date);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE skilled_nursing_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skilled_nursing_wounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtube_procedures ENABLE ROW LEVEL SECURITY;

-- Skilled Nursing Assessments Policies
CREATE POLICY "Users can view skilled nursing assessments in their facilities"
  ON skilled_nursing_assessments FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create skilled nursing assessments in their facilities"
  ON skilled_nursing_assessments FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update skilled nursing assessments in their facilities"
  ON skilled_nursing_assessments FOR UPDATE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete skilled nursing assessments in their facilities"
  ON skilled_nursing_assessments FOR DELETE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

-- Skilled Nursing Wounds Policies
CREATE POLICY "Users can view skilled nursing wounds in their facilities"
  ON skilled_nursing_wounds FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create skilled nursing wounds in their facilities"
  ON skilled_nursing_wounds FOR INSERT
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update skilled nursing wounds in their facilities"
  ON skilled_nursing_wounds FOR UPDATE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete skilled nursing wounds in their facilities"
  ON skilled_nursing_wounds FOR DELETE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE p.facility_id IN (
        SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
      )
    )
  );

-- G-tube Procedures Policies
CREATE POLICY "Users can view gtube procedures in their facilities"
  ON gtube_procedures FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create gtube procedures in their facilities"
  ON gtube_procedures FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update gtube procedures in their facilities"
  ON gtube_procedures FOR UPDATE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete gtube procedures in their facilities"
  ON gtube_procedures FOR DELETE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_specialized_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skilled_nursing_assessments_updated_at
  BEFORE UPDATE ON skilled_nursing_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_specialized_assessments_updated_at();

CREATE TRIGGER update_skilled_nursing_wounds_updated_at
  BEFORE UPDATE ON skilled_nursing_wounds
  FOR EACH ROW
  EXECUTE FUNCTION update_specialized_assessments_updated_at();

CREATE TRIGGER update_gtube_procedures_updated_at
  BEFORE UPDATE ON gtube_procedures
  FOR EACH ROW
  EXECUTE FUNCTION update_specialized_assessments_updated_at();

-- ============================================================================
-- 7. RPC FUNCTIONS
-- ============================================================================

-- Get skilled nursing assessment with wounds
CREATE OR REPLACE FUNCTION get_skilled_nursing_assessment_with_wounds(assessment_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'assessment', row_to_json(sna.*),
    'wounds', COALESCE(
      (SELECT json_agg(row_to_json(snw.*))
       FROM skilled_nursing_wounds snw
       WHERE snw.assessment_id = assessment_id_param),
      '[]'::json
    )
  ) INTO result
  FROM skilled_nursing_assessments sna
  WHERE sna.id = assessment_id_param;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all assessments for a visit
CREATE OR REPLACE FUNCTION get_visit_all_assessments(visit_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'standard_assessments', COALESCE(
      (SELECT json_agg(row_to_json(a.*))
       FROM assessments a
       WHERE a.visit_id = visit_id_param),
      '[]'::json
    ),
    'skilled_nursing_assessments', COALESCE(
      (SELECT json_agg(row_to_json(sna.*))
       FROM skilled_nursing_assessments sna
       WHERE sna.visit_id = visit_id_param),
      '[]'::json
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get G-tube procedure count for patient
CREATE OR REPLACE FUNCTION get_patient_gtube_procedure_count(patient_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  procedure_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO procedure_count
  FROM gtube_procedures
  WHERE patient_id = patient_id_param;
  
  RETURN procedure_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
