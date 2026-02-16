-- Migration 00025: Note Approval Workflow
-- Created: February 13, 2026
-- Description: Add note approval fields and statuses to visits table, create addendum_notifications table

-- =====================================================
-- ADD NOTE APPROVAL FIELDS TO VISITS TABLE
-- =====================================================

-- Add correction notes (JSONB array for tracking multiple correction requests)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS correction_notes JSONB DEFAULT '[]'::jsonb;

-- Add approval tracking fields
ALTER TABLE visits ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Add void tracking fields
ALTER TABLE visits ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Add sent_to_office timestamp
ALTER TABLE visits ADD COLUMN IF NOT EXISTS sent_to_office_at TIMESTAMPTZ;

-- =====================================================
-- UPDATE VISIT STATUS ENUM CONSTRAINT
-- =====================================================

-- Drop existing status check constraint
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;

-- Add updated constraint with new approval statuses
ALTER TABLE visits ADD CONSTRAINT visits_status_check
CHECK (status IN (
  'draft',
  'sent_to_office',
  'needs_correction',
  'being_corrected',
  'approved',
  'ready_for_signature',
  'signed',
  'submitted',
  'voided',
  'scheduled',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
  'incomplete',
  'complete'
));

-- =====================================================
-- CREATE ADDENDUM NOTIFICATIONS TABLE
-- =====================================================

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_addendum_notifications_visit ON addendum_notifications(visit_id);
CREATE INDEX IF NOT EXISTS idx_addendum_notifications_reviewed ON addendum_notifications(reviewed);
CREATE INDEX IF NOT EXISTS idx_addendum_notifications_created_by ON addendum_notifications(created_by);

-- =====================================================
-- ADD INDEXES FOR APPROVAL WORKFLOW QUERIES
-- =====================================================

-- Index for office inbox queries (status = 'sent_to_office')
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- Index for sorting inbox by sent_to_office_at
CREATE INDEX IF NOT EXISTS idx_visits_sent_to_office_at ON visits(sent_to_office_at);

-- Index for filtering by approved_by
CREATE INDEX IF NOT EXISTS idx_visits_approved_by ON visits(approved_by);

-- Note: Clinician correction queries will join with wound_notes table
-- (visits.primary_clinician_id will be added in Phase 10.2.2)

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on addendum_notifications
ALTER TABLE addendum_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view addendum notifications for their tenant
CREATE POLICY "Users can view addendum notifications for their tenant"
  ON addendum_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE v.id = addendum_notifications.visit_id
        AND uf.user_id = auth.uid()
    )
  );

-- Policy: Users can create addendum notifications for visits they can access
CREATE POLICY "Users can create addendum notifications"
  ON addendum_notifications
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE v.id = addendum_notifications.visit_id
        AND uf.user_id = auth.uid()
    )
  );

-- Policy: Admins can update addendum notifications (mark as reviewed)
CREATE POLICY "Admins can update addendum notifications"
  ON addendum_notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('tenant_admin', 'facility_admin')
    )
  );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN visits.correction_notes IS 'JSONB array of correction requests from office admin with timestamps and notes';
COMMENT ON COLUMN visits.approved_at IS 'Timestamp when office admin approved the note';
COMMENT ON COLUMN visits.approved_by IS 'User ID of office admin who approved the note';
COMMENT ON COLUMN visits.voided_at IS 'Timestamp when note was voided (wrong patient/data)';
COMMENT ON COLUMN visits.voided_by IS 'User ID of admin who voided the note';
COMMENT ON COLUMN visits.void_reason IS 'Reason for voiding the note (audit trail)';
COMMENT ON COLUMN visits.sent_to_office_at IS 'Timestamp when clinician sent note to office for approval';

COMMENT ON TABLE addendum_notifications IS 'Tracks addendums added to approved notes that need office review';
