-- Migration 00022: Patient Documents
-- Phase 9.4.1 - Document attachment system for patient records
-- Date: November 25, 2025

-- Create patient_documents table
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Document metadata
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'face_sheet',
    'lab_results',
    'radiology',
    'insurance',
    'referral',
    'discharge_summary',
    'medication_list',
    'history_physical',
    'progress_note',
    'consent_form',
    'other'
  )),
  document_category TEXT, -- Optional grouping (e.g., "Labs - CBC", "Imaging - X-Ray")
  
  -- File storage
  storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
  file_size INTEGER NOT NULL, -- File size in bytes
  mime_type TEXT NOT NULL, -- MIME type (application/pdf, image/jpeg, etc.)
  
  -- Optional metadata
  document_date DATE, -- Date of the document (e.g., lab date, imaging date)
  notes TEXT, -- Additional notes about the document
  
  -- Audit fields
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete support
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_type ON patient_documents(document_type);
CREATE INDEX idx_patient_documents_uploaded_at ON patient_documents(uploaded_at DESC);
CREATE INDEX idx_patient_documents_active ON patient_documents(patient_id, is_archived) WHERE is_archived = false;

-- Add helpful comments
COMMENT ON TABLE patient_documents IS 'Stores metadata for patient document attachments (face sheets, labs, radiology, etc.)';
COMMENT ON COLUMN patient_documents.document_type IS 'Type of document for categorization and filtering';
COMMENT ON COLUMN patient_documents.storage_path IS 'Path to file in Supabase Storage bucket (patient-documents/)';
COMMENT ON COLUMN patient_documents.document_date IS 'Date relevant to the document content (not upload date)';
COMMENT ON COLUMN patient_documents.is_archived IS 'Soft delete flag - archived documents are hidden but not deleted';

-- Enable Row Level Security
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view documents for patients in their facilities
CREATE POLICY "Users can view patient documents in their facilities"
  ON patient_documents FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can upload documents for patients in their facilities
CREATE POLICY "Users can upload patient documents in their facilities"
  ON patient_documents FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT p.id FROM patients p
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update documents they uploaded (mark as archived)
CREATE POLICY "Users can archive their own patient documents"
  ON patient_documents FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- RLS Policy: Admins can manage all documents in their tenant
CREATE POLICY "Admins can manage patient documents in their tenant"
  ON patient_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      INNER JOIN facilities f ON p.facility_id = f.id
      INNER JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE p.id = patient_documents.patient_id
        AND uf.user_id = auth.uid()
        AND (
          -- Check admin role via RPC function
          (SELECT role FROM get_user_role_info(auth.uid())) IN ('tenant_admin', 'facility_admin')
        )
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON patient_documents TO authenticated;

-- Add trigger to update uploaded_by automatically
CREATE OR REPLACE FUNCTION set_document_uploaded_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_document_uploaded_by
  BEFORE INSERT ON patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_uploaded_by();

-- Add trigger to set archived_at and archived_by
CREATE OR REPLACE FUNCTION set_document_archived_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_archived = true AND OLD.is_archived = false THEN
    NEW.archived_at := NOW();
    NEW.archived_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_document_archived_metadata
  BEFORE UPDATE ON patient_documents
  FOR EACH ROW
  WHEN (NEW.is_archived IS DISTINCT FROM OLD.is_archived)
  EXECUTE FUNCTION set_document_archived_metadata();

-- RPC function to get document count by patient
CREATE OR REPLACE FUNCTION get_patient_document_count(patient_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM patient_documents
    WHERE patient_id = patient_uuid
      AND is_archived = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_patient_document_count IS 'Returns count of active (non-archived) documents for a patient';
GRANT EXECUTE ON FUNCTION get_patient_document_count TO authenticated;
