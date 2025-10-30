-- Wound EHR Initial Schema Migration
-- Created: 2025-10-30
-- Description: Complete database schema with all tables, RLS policies, auth triggers, and storage

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable the pgcrypto extension for UUID generation (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

-- Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Patients Table
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

-- Wounds Table
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

-- Visits Table
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('in_person', 'telemed')),
  location TEXT,
  status TEXT DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'complete')),
  number_of_addenda INTEGER DEFAULT 0,
  follow_up_type TEXT CHECK (follow_up_type IN ('appointment', 'discharge')),
  follow_up_date DATE,
  follow_up_notes TEXT,
  time_spent BOOLEAN DEFAULT false,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments Table (Wound Assessments)
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

-- Photos Table (Wound Photos)
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

-- Treatments Table
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

-- Billings Table
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
-- INDEXES
-- =====================================================

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON patients(facility_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_is_active ON patients(is_active);
CREATE INDEX IF NOT EXISTS idx_patients_last_name ON patients(last_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);

-- Wounds indexes
CREATE INDEX IF NOT EXISTS idx_wounds_patient_id ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_wounds_status ON wounds(status);

-- Visits indexes
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- Assessments indexes
CREATE INDEX IF NOT EXISTS idx_assessments_visit_id ON assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_assessments_wound_id ON assessments(wound_id);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_wound_id ON photos(wound_id);
CREATE INDEX IF NOT EXISTS idx_photos_visit_id ON photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_photos_assessment_id ON photos(assessment_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);

-- Treatments indexes
CREATE INDEX IF NOT EXISTS idx_treatments_visit_id ON treatments(visit_id);

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_billings_visit_id ON billings(visit_id);
CREATE INDEX IF NOT EXISTS idx_billings_patient_id ON billings(patient_id);

-- User facilities indexes
CREATE INDEX IF NOT EXISTS idx_user_facilities_user_id ON user_facilities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facilities_facility_id ON user_facilities(facility_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- Facilities policies
CREATE POLICY "Users can view their facilities"
  ON facilities FOR SELECT
  USING (
    id IN (
      SELECT facility_id FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their facilities"
  ON facilities FOR UPDATE
  USING (
    id IN (
      SELECT facility_id FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

-- Patients policies
CREATE POLICY "Users can view patients in their facilities"
  ON patients FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert patients in their facilities"
  ON patients FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT facility_id FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patients in their facilities"
  ON patients FOR UPDATE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete patients in their facilities"
  ON patients FOR DELETE
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities 
      WHERE user_id = auth.uid()
    )
  );

-- Wounds policies (inherit from patients)
CREATE POLICY "Users can view wounds for their patients"
  ON wounds FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage wounds for their patients"
  ON wounds FOR ALL
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Visits policies (inherit from patients)
CREATE POLICY "Users can view visits for their patients"
  ON visits FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage visits for their patients"
  ON visits FOR ALL
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Wound assessments policies (inherit from visits)
CREATE POLICY "Users can view assessments for their visits"
  ON assessments FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage assessments for their visits"
  ON assessments FOR ALL
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Photos policies (inherit from wounds)
CREATE POLICY "Users can view photos for their wounds"
  ON photos FOR SELECT
  USING (
    wound_id IN (
      SELECT w.id FROM wounds w
      INNER JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload photos for their wounds"
  ON photos FOR INSERT
  WITH CHECK (
    wound_id IN (
      SELECT w.id FROM wounds w
      INNER JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ) AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update photos for their wounds"
  ON photos FOR UPDATE
  USING (
    wound_id IN (
      SELECT w.id FROM wounds w
      INNER JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos for their wounds"
  ON photos FOR DELETE
  USING (
    wound_id IN (
      SELECT w.id FROM wounds w
      INNER JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Treatments policies (inherit from visits)
CREATE POLICY "Users can view treatments for their visits"
  ON treatments FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage treatments for their visits"
  ON treatments FOR ALL
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- Billing policies (inherit from visits)
CREATE POLICY "Users can view billing for their visits"
  ON billings FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage billing for their visits"
  ON billings FOR ALL
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- User facilities policies
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

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have updated_at column
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON facilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wounds_updated_at
  BEFORE UPDATE ON wounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billings_updated_at
  BEFORE UPDATE ON billings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTH TRIGGER (Handle New User Creation)
-- =====================================================

-- Create users table for public schema (synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only view and update their own record
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Function to handle new user creation (auto-sync from auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKETS & POLICIES
-- =====================================================

-- Create wound-photos storage bucket (public access for URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wound-photos', 'wound-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for wound-photos bucket
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wound-photos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wound-photos');

CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wound-photos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wound-photos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

