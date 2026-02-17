-- Wound EHR - Complete Database Schema
-- Consolidated Migration (replaces 00001-00027)
-- Created: February 17, 2026
-- Description: All tables, indexes, RLS policies, functions, triggers, and seed data

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- Tenants (Multi-Tenant SaaS)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Multi-tenant organizations (SaaS isolation)';

-- Facilities
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  fax TEXT,
  contact_person TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  mrn TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  insurance_info JSONB,
  emergency_contact JSONB,
  allergies JSONB DEFAULT '[]'::jsonb,
  medical_history JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(facility_id, mrn)
);

-- Wounds
CREATE TABLE IF NOT EXISTS wounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  wound_number TEXT NOT NULL,
  location TEXT NOT NULL,
  wound_type TEXT NOT NULL,
  onset_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'healed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('in_person', 'telemed')),
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent_to_office', 'needs_correction', 'being_corrected',
    'approved', 'ready_for_signature', 'signed', 'submitted', 'voided',
    'scheduled', 'in-progress', 'completed', 'cancelled', 'no-show',
    'incomplete', 'complete'
  )),
  number_of_addenda INTEGER DEFAULT 0,
  follow_up_type TEXT CHECK (follow_up_type IN ('appointment', 'discharge')),
  follow_up_date DATE,
  follow_up_notes TEXT,
  time_spent BOOLEAN DEFAULT false,
  additional_notes TEXT,
  -- Signature workflow (Phase 9.2)
  requires_patient_signature BOOLEAN DEFAULT false,
  provider_signature_id UUID,
  patient_signature_id UUID,
  clinician_name TEXT,
  clinician_credentials TEXT,
  -- Addendums (Phase 9.3.6)
  addendum_count INTEGER DEFAULT 0,
  -- Note approval workflow (Phase 10.1)
  correction_notes JSONB DEFAULT '[]'::jsonb,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  sent_to_office_at TIMESTAMPTZ,
  -- Clinician assignment (Phase 10.2)
  clinician_id UUID REFERENCES auth.users(id),
  primary_clinician_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN visits.status IS 'Visit workflow: draft → sent_to_office → approved/needs_correction → signed → submitted';
COMMENT ON COLUMN visits.requires_patient_signature IS 'TRUE for RN/LVN visits. Auto-set based on provider credentials.';
COMMENT ON COLUMN visits.correction_notes IS 'JSONB array of correction requests from office admin';
COMMENT ON COLUMN visits.clinician_id IS 'Clinician who performed this visit';
COMMENT ON COLUMN visits.primary_clinician_id IS 'Primary clinician for patient at time of visit (reporting)';

-- Assessments (Wound Assessments)
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  wound_id UUID NOT NULL REFERENCES wounds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  wound_type TEXT,
  pressure_stage TEXT,
  healing_status TEXT,
  at_risk_reopening BOOLEAN DEFAULT false,
  length NUMERIC(5, 2),
  width NUMERIC(5, 2),
  depth NUMERIC(5, 2),
  area NUMERIC(7, 2),
  undermining TEXT,
  tunneling TEXT,
  epithelial_percent INTEGER,
  granulation_percent INTEGER,
  slough_percent INTEGER,
  exudate_amount TEXT,
  exudate_type TEXT,
  odor TEXT,
  periwound_condition TEXT,
  pain_level INTEGER,
  infection_signs JSONB,
  assessment_notes TEXT
);

-- Photos (Wound Photos)
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_id UUID NOT NULL REFERENCES wounds(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treatments
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  primary_dressings JSONB,
  secondary_dressings JSONB,
  antimicrobials JSONB,
  debridement JSONB,
  advanced_therapies JSONB,
  compression JSONB,
  moisture_management JSONB,
  npwt_pressure INTEGER,
  npwt_frequency TEXT,
  preventive_orders JSONB,
  chair_cushion_type TEXT,
  frequency_days INTEGER,
  prn BOOLEAN DEFAULT false,
  treatment_orders TEXT,
  special_instructions TEXT
);

-- Billings
CREATE TABLE IF NOT EXISTS billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cpt_codes JSONB NOT NULL,
  icd10_codes JSONB NOT NULL,
  modifiers JSONB,
  time_spent BOOLEAN DEFAULT false,
  notes TEXT
);

-- User Facilities Junction Table (many-to-many)
CREATE TABLE IF NOT EXISTS user_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, facility_id)
);

-- =====================================================
-- 2. AUTH & RBAC TABLES
-- =====================================================

-- Users (public profile synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  credentials TEXT NOT NULL DEFAULT 'Admin'
    CHECK (credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.users.credentials IS
  'Clinical credentials: RN, LVN, MD, DO, PA, NP, CNA, Admin';

-- User Roles (RBAC)
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

COMMENT ON COLUMN user_roles.role IS 'tenant_admin: full access | facility_admin: single facility | user: basic access';

-- User Invites (Email-Based)
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'facility_admin', 'user')),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  credentials TEXT NOT NULL DEFAULT 'Admin'
    CHECK (credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN user_invites.credentials IS
  'Clinical credentials assigned to user upon accepting invite';

-- =====================================================
-- 3. CLINICAL NOTES & SIGNATURES
-- =====================================================

-- Wound Notes (per-wound timestamped notes + addendums)
CREATE TABLE IF NOT EXISTS wound_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_id UUID REFERENCES wounds(id) ON DELETE CASCADE, -- nullable for addendums
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'wound_note' CHECK (note_type IN ('wound_note', 'addendum')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN wound_notes.note_type IS 'wound_note (during visit) or addendum (post-signature)';

-- Signatures (Electronic)
CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_type TEXT NOT NULL CHECK (signature_type IN ('patient', 'provider', 'consent')),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT,
  signature_data TEXT NOT NULL,
  signature_method TEXT NOT NULL CHECK (signature_method IN ('draw', 'type', 'upload')),
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.signatures IS
  'Electronic signatures for consent, patient, and provider signing. Immutable after creation.';

-- Add foreign keys from visits to signatures (after both tables exist)
ALTER TABLE visits ADD CONSTRAINT visits_provider_signature_fk
  FOREIGN KEY (provider_signature_id) REFERENCES signatures(id);
ALTER TABLE visits ADD CONSTRAINT visits_patient_signature_fk
  FOREIGN KEY (patient_signature_id) REFERENCES signatures(id);

-- Patient Consents
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'initial_treatment',
  consent_text TEXT NOT NULL,
  patient_signature_id UUID REFERENCES signatures(id),
  witness_signature_id UUID REFERENCES signatures(id),
  consent_document_url TEXT,
  consent_document_name TEXT,
  consent_document_size INTEGER,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_patient_consent UNIQUE(patient_id, consent_type)
);

COMMENT ON COLUMN patient_consents.consent_document_url IS
  'Supabase Storage URL for scanned/uploaded consent documents';

-- Addendum Notifications (Phase 10.1)
CREATE TABLE IF NOT EXISTS addendum_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  addendum_id UUID NOT NULL REFERENCES wound_notes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE addendum_notifications IS
  'Tracks addendums added to approved notes that need office review';

-- Patient-Clinician Assignments (Phase 10.2)
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

COMMENT ON TABLE patient_clinicians IS
  'Assigns clinicians to patients for calendar filtering and access control';

-- =====================================================
-- 4. PROCEDURE SCOPES (Credential-Based Restrictions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.procedure_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT NOT NULL UNIQUE,
  procedure_name TEXT NOT NULL,
  allowed_credentials TEXT[] NOT NULL,
  category TEXT CHECK (category IN (
    'debridement', 'wound_care', 'diagnostic',
    'preventive', 'advanced_therapy', 'other'
  )),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.procedure_scopes IS
  'Maps CPT codes to allowed credentials. Enforces scope of practice restrictions.';

-- =====================================================
-- 5. PATIENT DOCUMENTS (Phase 9.4.1)
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'face_sheet', 'lab_results', 'radiology', 'insurance', 'referral',
    'discharge_summary', 'medication_list', 'history_physical',
    'progress_note', 'consent_form', 'other'
  )),
  document_category TEXT,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_date DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE patient_documents IS
  'Patient document attachments (face sheets, labs, radiology, etc.)';

-- =====================================================
-- 6. SPECIALIZED ASSESSMENTS (Phase 9.4.2-9.4.3)
-- =====================================================

-- Skilled Nursing Assessments (RN/LVN)
CREATE TABLE IF NOT EXISTS skilled_nursing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Header
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
  edema_grade TEXT,
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
  nebulizer_type TEXT,
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
  catheter_type TEXT,
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
  gi_constipation TEXT,
  gi_incontinence BOOLEAN DEFAULT false,
  bowel_sounds TEXT,
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
  tube_feeding_type TEXT,
  tube_feeding_rate_cc_hr INTEGER,
  tube_feeding_method TEXT,
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
  skin_turgor TEXT,

  -- MD Notification / Education / Problems
  md_notification TEXT,
  education_given TEXT,
  education_source TEXT,
  problems_issues TEXT,

  -- Metadata
  is_draft BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ
);

-- Skilled Nursing Wounds (sub-table)
CREATE TABLE IF NOT EXISTS skilled_nursing_wounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES skilled_nursing_assessments(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  wound_id UUID REFERENCES wounds(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  location TEXT NOT NULL,
  onset_date DATE,
  size TEXT,
  drainage TEXT,
  odor TEXT,
  etiology TEXT,
  stage TEXT,
  has_undermining BOOLEAN DEFAULT false,
  has_inflammation BOOLEAN DEFAULT false,
  treatment TEXT,
  photo_obtained BOOLEAN DEFAULT false,
  comments TEXT,
  diagram_x INTEGER,
  diagram_y INTEGER
);

-- G-tube Procedures
CREATE TABLE IF NOT EXISTS gtube_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  procedure_date TIMESTAMPTZ NOT NULL,
  is_new_patient BOOLEAN DEFAULT false,
  to_pmd TEXT,
  snf_bed_room TEXT,
  provider TEXT,
  -- Comorbidities
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
  last_gtube_placed_date DATE,
  -- Replacement Tube
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
  -- Verification
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
  comments TEXT,
  is_draft BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ
);

-- Grafting Assessments (Phase 9.4.3)
CREATE TABLE IF NOT EXISTS grafting_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  procedure_date TIMESTAMPTZ NOT NULL,
  postop_day INTEGER,
  procedure_type TEXT NOT NULL CHECK (procedure_type IN (
    'initial_grafting', 'regrafting', 'touch_up', 'donor_site_check'
  )),
  graft_type TEXT NOT NULL CHECK (graft_type IN (
    'split_thickness', 'full_thickness', 'dermal_substitute',
    'skin_substitute', 'acellular_matrix', 'composite_graft', 'mesh_graft'
  )),
  graft_location TEXT NOT NULL,
  graft_size_length NUMERIC(5,2),
  graft_size_width NUMERIC(5,2),
  graft_size_area NUMERIC(7,2),
  mesh_ratio TEXT,
  graft_adherence_percent INTEGER CHECK (graft_adherence_percent BETWEEN 0 AND 100),
  graft_adherence_notes TEXT,
  graft_viable BOOLEAN DEFAULT true,
  graft_color TEXT CHECK (graft_color IN (
    'pink', 'red', 'pale', 'dusky', 'purple', 'white', 'mottled'
  )),
  graft_texture TEXT CHECK (graft_texture IN (
    'supple', 'firm', 'tense', 'edematous', 'dry', 'fragile'
  )),
  signs_of_rejection BOOLEAN DEFAULT false,
  signs_of_infection BOOLEAN DEFAULT false,
  infection_signs TEXT[],
  has_hematoma BOOLEAN DEFAULT false,
  has_seroma BOOLEAN DEFAULT false,
  has_blistering BOOLEAN DEFAULT false,
  graft_separation BOOLEAN DEFAULT false,
  graft_necrosis BOOLEAN DEFAULT false,
  necrosis_percent INTEGER CHECK (necrosis_percent BETWEEN 0 AND 100),
  donor_site TEXT,
  donor_site_size_length NUMERIC(5,2),
  donor_site_size_width NUMERIC(5,2),
  donor_site_condition TEXT CHECK (donor_site_condition IN (
    'healing_well', 'epithelializing', 'dry', 'moist',
    'drainage', 'infection', 'delayed_healing'
  )),
  donor_site_dressing TEXT,
  donor_site_notes TEXT,
  fixation_method TEXT CHECK (fixation_method IN (
    'sutures', 'staples', 'steri_strips', 'tissue_glue',
    'bolster', 'negative_pressure', 'combination'
  )),
  fixation_details TEXT,
  sutures_removed BOOLEAN DEFAULT false,
  sutures_removal_date TIMESTAMPTZ,
  graft_dressing_type TEXT,
  graft_dressing_intact BOOLEAN DEFAULT true,
  dressing_change_frequency TEXT,
  topical_treatment TEXT,
  moisture_management TEXT,
  activity_restrictions TEXT,
  elevation_instructions TEXT,
  weight_bearing_status TEXT CHECK (weight_bearing_status IN (
    'non_weight_bearing', 'partial_weight_bearing', 'full_weight_bearing',
    'as_tolerated', 'not_applicable'
  )),
  bathing_instructions TEXT,
  postop_instructions TEXT,
  patient_education_provided TEXT,
  follow_up_plan TEXT,
  next_dressing_change_date TIMESTAMPTZ,
  complications TEXT,
  interventions_performed TEXT,
  provider_notes TEXT,
  overall_assessment TEXT CHECK (overall_assessment IN (
    'excellent', 'good', 'fair', 'poor', 'concerning'
  ))
);

-- Skin Sweep Assessments (Phase 9.4.3)
CREATE TABLE IF NOT EXISTS skin_sweep_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assessment_date TIMESTAMPTZ NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'admission', 'routine', 'discharge', 'post_fall', 'concern_identified'
  )),
  areas_inspected TEXT[] NOT NULL,
  skin_condition_overall TEXT CHECK (skin_condition_overall IN (
    'intact', 'dry', 'fragile', 'edematous', 'compromised', 'clammy', 'diaphoretic'
  )),
  skin_temperature TEXT CHECK (skin_temperature IN (
    'warm', 'cool', 'hot', 'cold', 'normal'
  )),
  skin_color TEXT CHECK (skin_color IN (
    'normal', 'pale', 'flushed', 'cyanotic', 'jaundiced', 'mottled'
  )),
  skin_turgor TEXT CHECK (skin_turgor IN ('good', 'fair', 'poor', 'tenting')),
  total_wounds_found INTEGER DEFAULT 0,
  new_wounds_documented INTEGER DEFAULT 0,
  wounds_unchanged INTEGER DEFAULT 0,
  wounds_improved INTEGER DEFAULT 0,
  wounds_worsened INTEGER DEFAULT 0,
  at_risk_areas TEXT[],
  at_risk_notes TEXT,
  head_neck_findings TEXT,
  head_neck_has_wounds BOOLEAN DEFAULT false,
  trunk_findings TEXT,
  trunk_has_wounds BOOLEAN DEFAULT false,
  upper_extremities_findings TEXT,
  upper_extremities_has_wounds BOOLEAN DEFAULT false,
  lower_extremities_findings TEXT,
  lower_extremities_has_wounds BOOLEAN DEFAULT false,
  sacral_findings TEXT,
  sacral_has_wounds BOOLEAN DEFAULT false,
  perineal_findings TEXT,
  perineal_has_wounds BOOLEAN DEFAULT false,
  devices_identified TEXT[],
  device_related_injuries BOOLEAN DEFAULT false,
  device_injury_details TEXT,
  has_incontinence BOOLEAN DEFAULT false,
  incontinence_type TEXT CHECK (incontinence_type IN (
    'urinary', 'bowel', 'both', 'none'
  )),
  moisture_associated_dermatitis BOOLEAN DEFAULT false,
  skin_breakdown_from_moisture BOOLEAN DEFAULT false,
  risk_factors TEXT[],
  braden_scale_score INTEGER CHECK (braden_scale_score BETWEEN 6 AND 23),
  risk_level TEXT CHECK (risk_level IN (
    'no_risk', 'mild_risk', 'moderate_risk', 'high_risk', 'severe_risk'
  )),
  current_prevention_measures JSONB,
  recommended_prevention_measures JSONB,
  equipment_recommendations TEXT[],
  equipment_currently_in_use TEXT[],
  equipment_ordered TEXT[],
  education_provided BOOLEAN DEFAULT false,
  education_topics TEXT[],
  education_method TEXT CHECK (education_method IN (
    'verbal', 'written', 'demonstration', 'video', 'combination'
  )),
  patient_understanding TEXT CHECK (patient_understanding IN (
    'verbalizes_understanding', 'demonstrates_understanding',
    'requires_reinforcement', 'language_barrier', 'cognitive_impairment'
  )),
  caregiver_education_provided BOOLEAN DEFAULT false,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_frequency TEXT,
  referrals_made TEXT[],
  significant_findings TEXT,
  interventions_implemented TEXT,
  provider_assessment TEXT,
  notes TEXT
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

-- Facilities
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_id ON facilities(tenant_id);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON patients(facility_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_is_active ON patients(is_active);
CREATE INDEX IF NOT EXISTS idx_patients_last_name ON patients(last_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);
CREATE INDEX IF NOT EXISTS idx_patients_last_name_lower ON patients(LOWER(last_name));
CREATE INDEX IF NOT EXISTS idx_patients_facility_name ON patients(facility_id, LOWER(last_name), LOWER(first_name));

-- Wounds
CREATE INDEX IF NOT EXISTS idx_wounds_patient_id ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_wounds_status ON wounds(status);
CREATE INDEX IF NOT EXISTS idx_wounds_patient_status ON wounds(patient_id, status);

-- Visits
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_clinician_id ON visits(clinician_id);
CREATE INDEX IF NOT EXISTS idx_visits_primary_clinician_id ON visits(primary_clinician_id);
CREATE INDEX IF NOT EXISTS idx_visits_clinician_date ON visits(clinician_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_sent_to_office_at ON visits(sent_to_office_at);
CREATE INDEX IF NOT EXISTS idx_visits_approved_by ON visits(approved_by);
CREATE INDEX IF NOT EXISTS idx_visits_provider_signature ON visits(provider_signature_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_signature ON visits(patient_signature_id);

-- Assessments
CREATE INDEX IF NOT EXISTS idx_assessments_visit_id ON assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_assessments_wound_id ON assessments(wound_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);

-- Photos
CREATE INDEX IF NOT EXISTS idx_photos_wound_id ON photos(wound_id);
CREATE INDEX IF NOT EXISTS idx_photos_visit_id ON photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_photos_assessment_id ON photos(assessment_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at DESC);

-- Treatments
CREATE INDEX IF NOT EXISTS idx_treatments_visit_id ON treatments(visit_id);

-- Billings
CREATE INDEX IF NOT EXISTS idx_billings_visit_id ON billings(visit_id);
CREATE INDEX IF NOT EXISTS idx_billings_patient_id ON billings(patient_id);

-- User Facilities
CREATE INDEX IF NOT EXISTS idx_user_facilities_user_id ON user_facilities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facilities_facility_id ON user_facilities(facility_id);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_credentials ON public.users(credentials);

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_facility_id ON user_roles(facility_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- User Invites
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_tenant_id ON user_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_invite_token ON user_invites(invite_token);

-- Wound Notes
CREATE INDEX IF NOT EXISTS idx_wound_notes_wound_id ON wound_notes(wound_id);
CREATE INDEX IF NOT EXISTS idx_wound_notes_visit_id ON wound_notes(visit_id);
CREATE INDEX IF NOT EXISTS idx_wound_notes_created_by ON wound_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_wound_notes_created_at ON wound_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wound_notes_note_type ON wound_notes(note_type);

-- Signatures
CREATE INDEX IF NOT EXISTS idx_signatures_visit_id ON signatures(visit_id);
CREATE INDEX IF NOT EXISTS idx_signatures_patient_id ON signatures(patient_id);
CREATE INDEX IF NOT EXISTS idx_signatures_type ON signatures(signature_type);
CREATE INDEX IF NOT EXISTS idx_signatures_created_by ON signatures(created_by);

-- Patient Consents
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON patient_consents(consent_type);

-- Addendum Notifications
CREATE INDEX IF NOT EXISTS idx_addendum_notifications_visit ON addendum_notifications(visit_id);
CREATE INDEX IF NOT EXISTS idx_addendum_notifications_reviewed ON addendum_notifications(reviewed);
CREATE INDEX IF NOT EXISTS idx_addendum_notifications_created_by ON addendum_notifications(created_by);

-- Patient Clinicians
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_patient ON patient_clinicians(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_user ON patient_clinicians(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_role ON patient_clinicians(role);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_patient_active ON patient_clinicians(patient_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patient_clinicians_user_active ON patient_clinicians(user_id, is_active);

-- Procedure Scopes
CREATE INDEX IF NOT EXISTS idx_procedure_scopes_code ON procedure_scopes(procedure_code);
CREATE INDEX IF NOT EXISTS idx_procedure_scopes_category ON procedure_scopes(category);

-- Patient Documents
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_type ON patient_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_documents_active ON patient_documents(patient_id, is_archived) WHERE is_archived = false;

-- Specialized Assessments
CREATE INDEX IF NOT EXISTS idx_skilled_nursing_assessments_visit ON skilled_nursing_assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_skilled_nursing_assessments_patient ON skilled_nursing_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_skilled_nursing_assessments_facility ON skilled_nursing_assessments(facility_id);
CREATE INDEX IF NOT EXISTS idx_skilled_nursing_assessments_date ON skilled_nursing_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_skilled_nursing_wounds_assessment ON skilled_nursing_wounds(assessment_id);
CREATE INDEX IF NOT EXISTS idx_skilled_nursing_wounds_visit ON skilled_nursing_wounds(visit_id);
CREATE INDEX IF NOT EXISTS idx_gtube_procedures_patient ON gtube_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_gtube_procedures_facility ON gtube_procedures(facility_id);
CREATE INDEX IF NOT EXISTS idx_gtube_procedures_date ON gtube_procedures(procedure_date);
CREATE INDEX IF NOT EXISTS idx_grafting_assessments_visit_id ON grafting_assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_grafting_assessments_patient_id ON grafting_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_grafting_assessments_facility_id ON grafting_assessments(facility_id);
CREATE INDEX IF NOT EXISTS idx_grafting_assessments_procedure_date ON grafting_assessments(procedure_date DESC);
CREATE INDEX IF NOT EXISTS idx_skin_sweep_assessments_visit_id ON skin_sweep_assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_skin_sweep_assessments_patient_id ON skin_sweep_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_skin_sweep_assessments_facility_id ON skin_sweep_assessments(facility_id);
CREATE INDEX IF NOT EXISTS idx_skin_sweep_assessments_date ON skin_sweep_assessments(assessment_date DESC);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE wounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE wound_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE addendum_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_clinicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE skilled_nursing_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skilled_nursing_wounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtube_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE grafting_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_sweep_assessments ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Disable RLS on user_roles (use RPC functions to avoid recursion)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- ── Tenants ──
CREATE POLICY "Users can view tenants"
  ON tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- ── Facilities ──
CREATE POLICY "Users can view their facilities"
  ON facilities FOR SELECT
  USING (id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert facilities"
  ON facilities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin')
  ));

CREATE POLICY "Admins can update facilities"
  ON facilities FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid())
  );

-- ── Patients ──
CREATE POLICY "Users can view patients in their facilities"
  ON patients FOR SELECT
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert patients in their facilities"
  ON patients FOR INSERT
  WITH CHECK (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can update patients in their facilities"
  ON patients FOR UPDATE
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete patients in their facilities"
  ON patients FOR DELETE
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

-- ── Wounds ──
CREATE POLICY "Users can view wounds for their patients"
  ON wounds FOR SELECT
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage wounds for their patients"
  ON wounds FOR ALL
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

-- ── Visits ──
CREATE POLICY "Users can view visits for their patients"
  ON visits FOR SELECT
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage visits for their patients"
  ON visits FOR ALL
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

-- ── Assessments ──
CREATE POLICY "Users can view assessments for their visits"
  ON assessments FOR SELECT
  USING (visit_id IN (
    SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage assessments for their visits"
  ON assessments FOR ALL
  USING (visit_id IN (
    SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

-- ── Photos ──
CREATE POLICY "Users can view photos for their wounds"
  ON photos FOR SELECT
  USING (wound_id IN (
    SELECT w.id FROM wounds w JOIN patients p ON w.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload photos for their wounds"
  ON photos FOR INSERT
  WITH CHECK (
    wound_id IN (
      SELECT w.id FROM wounds w JOIN patients p ON w.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
    ) AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update photos for their wounds"
  ON photos FOR UPDATE
  USING (wound_id IN (
    SELECT w.id FROM wounds w JOIN patients p ON w.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete photos for their wounds"
  ON photos FOR DELETE
  USING (wound_id IN (
    SELECT w.id FROM wounds w JOIN patients p ON w.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

-- ── Treatments ──
CREATE POLICY "Users can view treatments for their visits"
  ON treatments FOR SELECT
  USING (visit_id IN (
    SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage treatments for their visits"
  ON treatments FOR ALL
  USING (visit_id IN (
    SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

-- ── Billings ──
CREATE POLICY "Users can view billing for their visits"
  ON billings FOR SELECT
  USING (visit_id IN (
    SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage billing for their visits"
  ON billings FOR ALL
  USING (visit_id IN (
    SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

-- ── User Facilities ──
CREATE POLICY "Users can view their own facility associations"
  ON user_facilities FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own facility associations"
  ON user_facilities FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own facility associations"
  ON user_facilities FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own facility associations"
  ON user_facilities FOR DELETE
  USING (user_id = auth.uid());

-- ── Users ──
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view users in their tenant"
  ON public.users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('tenant_admin', 'facility_admin')
    AND EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = users.id AND ur2.tenant_id = ur.tenant_id)
  ));

CREATE POLICY "Tenant admins can update users in their tenant"
  ON public.users FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = users.id AND ur2.tenant_id = ur.tenant_id)
  ));

CREATE POLICY "Facility admins can update users in their facility"
  ON public.users FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN user_facilities uf ON uf.user_id = auth.uid()
    WHERE ur.user_id = auth.uid() AND ur.role = 'facility_admin'
    AND EXISTS (SELECT 1 FROM user_facilities uf2 WHERE uf2.user_id = users.id AND uf2.facility_id = uf.facility_id)
  ));

-- ── User Invites ──
CREATE POLICY "Admins can view invites in their tenant"
  ON user_invites FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin')
  ));

CREATE POLICY "Tenant admins can create invites"
  ON user_invites FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role = 'tenant_admin'
  ));

CREATE POLICY "Facility admins can create user invites"
  ON user_invites FOR INSERT
  WITH CHECK (
    role = 'user' AND facility_id IN (
      SELECT facility_id FROM user_roles WHERE user_id = auth.uid() AND role = 'facility_admin'
    )
  );

-- ── Wound Notes ──
CREATE POLICY "Users can view wound notes and addendums in their tenant"
  ON wound_notes FOR SELECT
  USING (
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w JOIN patients p ON w.patient_id = p.id JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid()))
    ))
    OR
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid()))
    ))
  );

CREATE POLICY "Users can create wound notes and addendums"
  ON wound_notes FOR INSERT
  WITH CHECK (
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w JOIN patients p ON w.patient_id = p.id JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid()))
    ))
    OR
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid()))
    ))
  );

CREATE POLICY "Users can update their own wound notes"
  ON wound_notes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own wound notes"
  ON wound_notes FOR DELETE
  USING (created_by = auth.uid());

-- ── Signatures (immutable - no UPDATE/DELETE) ──
CREATE POLICY "Users can view signatures"
  ON signatures FOR SELECT
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON uf.facility_id = p.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can create signatures"
  ON signatures FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- ── Patient Consents (immutable - no UPDATE/DELETE) ──
CREATE POLICY "Users can view patient consents"
  ON patient_consents FOR SELECT
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON uf.facility_id = p.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can create patient consents"
  ON patient_consents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- ── Addendum Notifications ──
CREATE POLICY "Users can view addendum notifications"
  ON addendum_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE v.id = addendum_notifications.visit_id AND uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can create addendum notifications"
  ON addendum_notifications FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM visits v JOIN patients p ON v.patient_id = p.id JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE v.id = addendum_notifications.visit_id AND uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update addendum notifications"
  ON addendum_notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin')
  ));

-- ── Patient Clinicians ──
CREATE POLICY "Users can view patient clinician assignments"
  ON patient_clinicians FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE p.id = patient_clinicians.patient_id AND uf.user_id = auth.uid()
  ));

CREATE POLICY "Admins can create patient clinician assignments"
  ON patient_clinicians FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND EXISTS (SELECT 1 FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE p.id = patient_clinicians.patient_id AND uf.user_id = auth.uid())
  );

CREATE POLICY "Admins can update patient clinician assignments"
  ON patient_clinicians FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND EXISTS (SELECT 1 FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE p.id = patient_clinicians.patient_id AND uf.user_id = auth.uid())
  );

CREATE POLICY "Admins can delete patient clinician assignments"
  ON patient_clinicians FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'facility_admin'))
    AND EXISTS (SELECT 1 FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE p.id = patient_clinicians.patient_id AND uf.user_id = auth.uid())
  );

-- ── Procedure Scopes ──
CREATE POLICY "Users can view procedure scopes"
  ON procedure_scopes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Tenant admins can manage procedure scopes"
  ON procedure_scopes FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'tenant_admin'));

-- ── Patient Documents ──
CREATE POLICY "Users can view patient documents in their facilities"
  ON patient_documents FOR SELECT
  USING (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload patient documents"
  ON patient_documents FOR INSERT
  WITH CHECK (patient_id IN (
    SELECT p.id FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id WHERE uf.user_id = auth.uid()
  ));

CREATE POLICY "Users can archive their own documents"
  ON patient_documents FOR UPDATE
  USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage patient documents"
  ON patient_documents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM patients p JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE p.id = patient_documents.patient_id AND uf.user_id = auth.uid()
    AND (SELECT role FROM get_user_role_info(auth.uid())) IN ('tenant_admin', 'facility_admin')
  ));

-- ── Specialized Assessments (facility-based) ──
-- Skilled Nursing Assessments
CREATE POLICY "Users can view skilled nursing assessments" ON skilled_nursing_assessments FOR SELECT
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));
CREATE POLICY "Users can create skilled nursing assessments" ON skilled_nursing_assessments FOR INSERT
  WITH CHECK (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));
CREATE POLICY "Users can update skilled nursing assessments" ON skilled_nursing_assessments FOR UPDATE
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete skilled nursing assessments" ON skilled_nursing_assessments FOR DELETE
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

-- Skilled Nursing Wounds
CREATE POLICY "Users can view skilled nursing wounds" ON skilled_nursing_wounds FOR SELECT
  USING (visit_id IN (SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id WHERE p.facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid())));
CREATE POLICY "Users can create skilled nursing wounds" ON skilled_nursing_wounds FOR INSERT
  WITH CHECK (visit_id IN (SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id WHERE p.facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid())));
CREATE POLICY "Users can update skilled nursing wounds" ON skilled_nursing_wounds FOR UPDATE
  USING (visit_id IN (SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id WHERE p.facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid())));
CREATE POLICY "Users can delete skilled nursing wounds" ON skilled_nursing_wounds FOR DELETE
  USING (visit_id IN (SELECT v.id FROM visits v JOIN patients p ON v.patient_id = p.id WHERE p.facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid())));

-- G-tube Procedures
CREATE POLICY "Users can view gtube procedures" ON gtube_procedures FOR SELECT
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));
CREATE POLICY "Users can create gtube procedures" ON gtube_procedures FOR INSERT
  WITH CHECK (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));
CREATE POLICY "Users can update gtube procedures" ON gtube_procedures FOR UPDATE
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete gtube procedures" ON gtube_procedures FOR DELETE
  USING (facility_id IN (SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()));

-- Grafting Assessments
CREATE POLICY "Users can view grafting assessments" ON grafting_assessments FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_facilities WHERE user_id = auth.uid() AND facility_id = grafting_assessments.facility_id));
CREATE POLICY "Users can create grafting assessments" ON grafting_assessments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_facilities WHERE user_id = auth.uid() AND facility_id = grafting_assessments.facility_id) AND created_by = auth.uid());
CREATE POLICY "Users can update grafting assessments" ON grafting_assessments FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can delete grafting assessments" ON grafting_assessments FOR DELETE
  USING (created_by = auth.uid());

-- Skin Sweep Assessments
CREATE POLICY "Users can view skin sweep assessments" ON skin_sweep_assessments FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_facilities WHERE user_id = auth.uid() AND facility_id = skin_sweep_assessments.facility_id));
CREATE POLICY "Users can create skin sweep assessments" ON skin_sweep_assessments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_facilities WHERE user_id = auth.uid() AND facility_id = skin_sweep_assessments.facility_id) AND created_by = auth.uid());
CREATE POLICY "Users can update skin sweep assessments" ON skin_sweep_assessments FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can delete skin sweep assessments" ON skin_sweep_assessments FOR DELETE
  USING (created_by = auth.uid());

-- =====================================================
-- 9. FUNCTIONS
-- =====================================================

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user creation (sync auth.users → public.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, credentials, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'Admin',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-assign user role (default tenant)
CREATE OR REPLACE FUNCTION auto_assign_user_role()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
  default_facility_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.id) THEN
    SELECT id INTO default_tenant_id FROM tenants ORDER BY created_at LIMIT 1;
    IF default_tenant_id IS NOT NULL THEN
      SELECT id INTO default_facility_id FROM facilities WHERE tenant_id = default_tenant_id LIMIT 1;
      IF default_facility_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, tenant_id, role, facility_id)
        VALUES (NEW.id, default_tenant_id, 'user', default_facility_id)
        ON CONFLICT (user_id, tenant_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM user_roles WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND role = 'tenant_admin'
  );
$$ LANGUAGE SQL STABLE;

-- Check if user has facility access
CREATE OR REPLACE FUNCTION has_facility_access(p_user_id UUID, p_facility_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN facilities f ON ur.tenant_id = f.tenant_id
    WHERE ur.user_id = p_user_id AND (ur.role = 'tenant_admin' OR ur.facility_id = p_facility_id) AND f.id = p_facility_id
  );
$$ LANGUAGE SQL STABLE;

-- Get user role info (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role_info(user_uuid uuid)
RETURNS TABLE (id uuid, user_id uuid, tenant_id uuid, role text, facility_id uuid, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT ur.id, ur.user_id, ur.tenant_id, ur.role, ur.facility_id, ur.created_at
  FROM user_roles ur WHERE ur.user_id = user_uuid ORDER BY ur.created_at ASC LIMIT 1;
$$;

-- Get all roles for a tenant (bypasses RLS)
CREATE OR REPLACE FUNCTION get_tenant_user_roles(tenant_uuid uuid)
RETURNS TABLE (id uuid, user_id uuid, tenant_id uuid, role text, facility_id uuid, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT ur.id, ur.user_id, ur.tenant_id, ur.role, ur.facility_id, ur.created_at
  FROM user_roles ur WHERE ur.tenant_id = tenant_uuid ORDER BY ur.created_at DESC;
$$;

-- Check if patient has consent
CREATE OR REPLACE FUNCTION has_patient_consent(p_patient_id UUID, p_consent_type TEXT DEFAULT 'initial_treatment')
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id AND consent_type = p_consent_type AND patient_signature_id IS NOT NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if credentials allow a procedure
CREATE OR REPLACE FUNCTION can_perform_procedure(user_credentials TEXT, cpt_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE allowed_creds TEXT[];
BEGIN
  SELECT allowed_credentials INTO allowed_creds FROM procedure_scopes WHERE procedure_code = cpt_code;
  IF allowed_creds IS NULL THEN RETURN TRUE; END IF;
  RETURN user_credentials = ANY(allowed_creds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get allowed procedures for credential
CREATE OR REPLACE FUNCTION get_allowed_procedures(user_credentials TEXT)
RETURNS TABLE (procedure_code TEXT, procedure_name TEXT, category TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT ps.procedure_code, ps.procedure_name, ps.category
    FROM procedure_scopes ps WHERE user_credentials = ANY(ps.allowed_credentials) ORDER BY ps.category, ps.procedure_code;
END;
$$;

-- Get restricted procedures for credential
CREATE OR REPLACE FUNCTION get_restricted_procedures(user_credentials TEXT)
RETURNS TABLE (procedure_code TEXT, procedure_name TEXT, category TEXT, required_credentials TEXT[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT ps.procedure_code, ps.procedure_name, ps.category, ps.allowed_credentials
    FROM procedure_scopes ps WHERE NOT (user_credentials = ANY(ps.allowed_credentials)) ORDER BY ps.category, ps.procedure_code;
END;
$$;

-- Get patient document count
CREATE OR REPLACE FUNCTION get_patient_document_count(patient_uuid UUID)
RETURNS INTEGER AS $$
BEGIN RETURN (SELECT COUNT(*)::INTEGER FROM patient_documents WHERE patient_id = patient_uuid AND is_archived = false); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set document uploaded_by
CREATE OR REPLACE FUNCTION set_document_uploaded_by()
RETURNS TRIGGER AS $$
BEGIN IF NEW.uploaded_by IS NULL THEN NEW.uploaded_by := auth.uid(); END IF; RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set document archived metadata
CREATE OR REPLACE FUNCTION set_document_archived_metadata()
RETURNS TRIGGER AS $$
BEGIN IF NEW.is_archived = true AND OLD.is_archived = false THEN NEW.archived_at := NOW(); NEW.archived_by := auth.uid(); END IF; RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Signature audit logs
CREATE OR REPLACE FUNCTION get_signature_audit_logs(
  p_tenant_id UUID DEFAULT NULL, p_facility_id UUID DEFAULT NULL, p_user_id UUID DEFAULT NULL,
  p_signature_type TEXT DEFAULT NULL, p_start_date TIMESTAMPTZ DEFAULT NULL, p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  signature_id UUID, signature_type TEXT, signature_method TEXT, signed_at TIMESTAMPTZ, ip_address TEXT,
  visit_id UUID, visit_date TIMESTAMPTZ, visit_type TEXT, visit_status TEXT,
  patient_id UUID, patient_name TEXT, patient_mrn TEXT,
  facility_id UUID, facility_name TEXT,
  signer_user_id UUID, signer_name TEXT, signer_role TEXT, signer_credentials TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.signature_type, s.signature_method, s.signed_at, s.ip_address,
    v.id, v.visit_date, v.visit_type, v.status, p.id, (p.first_name || ' ' || p.last_name),
    p.mrn, f.id, f.name, u.id, u.name, s.signer_role, u.credentials, s.created_at
  FROM signatures s
  LEFT JOIN visits v ON v.id = s.visit_id LEFT JOIN patients p ON p.id = s.patient_id
  LEFT JOIN facilities f ON f.id = p.facility_id LEFT JOIN users u ON u.id = s.created_by
  WHERE (p_tenant_id IS NULL OR f.id IN (SELECT uf.facility_id FROM user_facilities uf WHERE uf.user_id IN (SELECT ur.user_id FROM user_roles ur WHERE ur.tenant_id = p_tenant_id)))
    AND (p_facility_id IS NULL OR f.id = p_facility_id) AND (p_user_id IS NULL OR s.created_by = p_user_id)
    AND (p_signature_type IS NULL OR s.signature_type = p_signature_type)
    AND (p_start_date IS NULL OR s.signed_at >= p_start_date) AND (p_end_date IS NULL OR s.signed_at <= p_end_date)
  ORDER BY s.signed_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Signature audit stats
CREATE OR REPLACE FUNCTION get_signature_audit_stats(
  p_tenant_id UUID DEFAULT NULL, p_facility_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL, p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_signatures BIGINT, consent_signatures BIGINT, patient_signatures BIGINT, provider_signatures BIGINT,
  drawn_signatures BIGINT, typed_signatures BIGINT, uploaded_signatures BIGINT,
  total_visits_signed BIGINT, unique_signers BIGINT
) AS $$
BEGIN
  RETURN QUERY WITH filtered AS (
    SELECT s.*, p.facility_id AS patient_facility_id FROM signatures s LEFT JOIN patients p ON p.id = s.patient_id
    WHERE (p_tenant_id IS NULL OR p.facility_id IN (SELECT uf.facility_id FROM user_facilities uf WHERE uf.user_id IN (SELECT ur.user_id FROM user_roles ur WHERE ur.tenant_id = p_tenant_id)))
      AND (p_facility_id IS NULL OR p.facility_id = get_signature_audit_stats.p_facility_id)
      AND (p_start_date IS NULL OR s.signed_at >= p_start_date) AND (p_end_date IS NULL OR s.signed_at <= p_end_date)
  )
  SELECT COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE signature_type = 'consent')::BIGINT,
    COUNT(*) FILTER (WHERE signature_type = 'patient')::BIGINT, COUNT(*) FILTER (WHERE signature_type = 'provider')::BIGINT,
    COUNT(*) FILTER (WHERE signature_method = 'draw')::BIGINT, COUNT(*) FILTER (WHERE signature_method = 'type')::BIGINT,
    COUNT(*) FILTER (WHERE signature_method = 'upload')::BIGINT,
    COUNT(DISTINCT visit_id) FILTER (WHERE visit_id IS NOT NULL)::BIGINT,
    COUNT(DISTINCT created_by) FILTER (WHERE created_by IS NOT NULL)::BIGINT
  FROM filtered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get skilled nursing assessment with wounds
CREATE OR REPLACE FUNCTION get_skilled_nursing_assessment_with_wounds(assessment_id_param UUID)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'assessment', row_to_json(sna.*),
    'wounds', COALESCE((SELECT json_agg(row_to_json(snw.*)) FROM skilled_nursing_wounds snw WHERE snw.assessment_id = assessment_id_param), '[]'::json)
  ) INTO result FROM skilled_nursing_assessments sna WHERE sna.id = assessment_id_param;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- updated_at triggers
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wounds_updated_at BEFORE UPDATE ON wounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON treatments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billings_updated_at BEFORE UPDATE ON billings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wound_notes_updated_at BEFORE UPDATE ON wound_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_procedure_scopes_updated_at BEFORE UPDATE ON procedure_scopes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skilled_nursing_assessments_updated_at BEFORE UPDATE ON skilled_nursing_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skilled_nursing_wounds_updated_at BEFORE UPDATE ON skilled_nursing_wounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gtube_procedures_updated_at BEFORE UPDATE ON gtube_procedures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grafting_assessments_updated_at BEFORE UPDATE ON grafting_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skin_sweep_assessments_updated_at BEFORE UPDATE ON skin_sweep_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_clinicians_updated_at BEFORE UPDATE ON patient_clinicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION auto_assign_user_role();

-- Document triggers
CREATE TRIGGER trigger_set_document_uploaded_by BEFORE INSERT ON patient_documents FOR EACH ROW EXECUTE FUNCTION set_document_uploaded_by();
CREATE TRIGGER trigger_set_document_archived_metadata BEFORE UPDATE ON patient_documents FOR EACH ROW WHEN (NEW.is_archived IS DISTINCT FROM OLD.is_archived) EXECUTE FUNCTION set_document_archived_metadata();

-- =====================================================
-- 11. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_role_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_info(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_tenant_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_user_roles(uuid) TO anon;
GRANT EXECUTE ON FUNCTION can_perform_procedure TO authenticated;
GRANT EXECUTE ON FUNCTION get_allowed_procedures TO authenticated;
GRANT EXECUTE ON FUNCTION get_restricted_procedures TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_document_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_signature_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_signature_audit_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON patient_documents TO authenticated;

-- =====================================================
-- 12. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('wound-photos', 'wound-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wound-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'wound-photos');

CREATE POLICY "Users can update their own photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'wound-photos' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'wound-photos' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================
-- 13. SEED DATA: Procedure Scopes
-- =====================================================

-- Sharp Debridement (MD/DO/PA/NP ONLY)
INSERT INTO procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('11042', 'Debridement, subcutaneous tissue; first 20 sq cm or less', ARRAY['MD','DO','PA','NP'], 'debridement', 'Sharp surgical debridement'),
  ('11043', 'Debridement, muscle and/or fascia; first 20 sq cm or less', ARRAY['MD','DO','PA','NP'], 'debridement', 'Sharp surgical debridement'),
  ('11044', 'Debridement, bone; first 20 sq cm or less', ARRAY['MD','DO','PA','NP'], 'debridement', 'Sharp surgical debridement'),
  ('11045', 'Debridement, subcutaneous tissue; each additional 20 sq cm', ARRAY['MD','DO','PA','NP'], 'debridement', 'Sharp surgical debridement'),
  ('11046', 'Debridement, muscle and/or fascia; each additional 20 sq cm', ARRAY['MD','DO','PA','NP'], 'debridement', 'Sharp surgical debridement'),
  ('11047', 'Debridement, bone; each additional 20 sq cm', ARRAY['MD','DO','PA','NP'], 'debridement', 'Sharp surgical debridement')
ON CONFLICT (procedure_code) DO NOTHING;

-- Selective Debridement (ALL credentials)
INSERT INTO procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('97597', 'Selective debridement, first 20 sq cm', ARRAY['MD','DO','PA','NP','RN','LVN'], 'debridement', 'Selective debridement - all credentials'),
  ('97598', 'Selective debridement, each additional 20 sq cm', ARRAY['MD','DO','PA','NP','RN','LVN'], 'debridement', 'Selective debridement - all credentials')
ON CONFLICT (procedure_code) DO NOTHING;

-- Negative Pressure Wound Therapy (ALL credentials)
INSERT INTO procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('97605', 'NPWT - ≤50 sq cm', ARRAY['MD','DO','PA','NP','RN','LVN'], 'advanced_therapy', 'NPWT application'),
  ('97606', 'NPWT - >50 sq cm', ARRAY['MD','DO','PA','NP','RN','LVN'], 'advanced_therapy', 'NPWT application'),
  ('97607', 'NPWT dressing change - ≤50 sq cm', ARRAY['MD','DO','PA','NP','RN','LVN'], 'advanced_therapy', 'NPWT dressing change'),
  ('97608', 'NPWT dressing change - >50 sq cm', ARRAY['MD','DO','PA','NP','RN','LVN'], 'advanced_therapy', 'NPWT dressing change')
ON CONFLICT (procedure_code) DO NOTHING;

-- Non-selective debridement (ALL credentials)
INSERT INTO procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('97602', 'Non-selective debridement', ARRAY['MD','DO','PA','NP','RN','LVN'], 'wound_care', 'Non-selective debridement')
ON CONFLICT (procedure_code) DO NOTHING;

-- Skin Substitute Grafts (MD/DO/PA/NP ONLY)
INSERT INTO procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('15271', 'Skin substitute graft, trunk/arms/legs ≤100 sq cm; first 25 sq cm', ARRAY['MD','DO','PA','NP'], 'advanced_therapy', 'Graft application'),
  ('15272', 'Skin substitute graft, trunk/arms/legs ≤100 sq cm; each additional 25 sq cm', ARRAY['MD','DO','PA','NP'], 'advanced_therapy', 'Graft application'),
  ('15273', 'Skin substitute graft, trunk/arms/legs ≥100 sq cm; first 100 sq cm', ARRAY['MD','DO','PA','NP'], 'advanced_therapy', 'Graft application'),
  ('15274', 'Skin substitute graft, trunk/arms/legs ≥100 sq cm; each additional 100 sq cm', ARRAY['MD','DO','PA','NP'], 'advanced_therapy', 'Graft application')
ON CONFLICT (procedure_code) DO NOTHING;

-- E&M Codes (ALL credentials)
INSERT INTO procedure_scopes (procedure_code, procedure_name, allowed_credentials, category, description) VALUES
  ('99211', 'Established patient visit - minimal', ARRAY['MD','DO','PA','NP','RN','LVN'], 'wound_care', 'Established patient visit'),
  ('99212', 'Established patient visit - straightforward', ARRAY['MD','DO','PA','NP','RN','LVN'], 'wound_care', 'Established patient visit')
ON CONFLICT (procedure_code) DO NOTHING;
