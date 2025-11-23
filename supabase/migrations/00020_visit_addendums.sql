-- Migration 00020: Visit Addendums
-- Phase 9.3.6: Allow post-signature notes on signed/submitted visits
-- Created: November 23, 2025

-- Make wound_id nullable (addendums aren't tied to specific wounds)
ALTER TABLE wound_notes 
ALTER COLUMN wound_id DROP NOT NULL;

-- Add note_type to wound_notes table
ALTER TABLE wound_notes 
ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'wound_note' 
CHECK (note_type IN ('wound_note', 'addendum'));

-- Add addendum_count to visits table for quick reference
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS addendum_count INTEGER DEFAULT 0;

-- Create index on note_type for filtering
CREATE INDEX IF NOT EXISTS idx_wound_notes_note_type ON wound_notes(note_type);

-- Update RLS policies to allow addendums (wound_id can be NULL)
DROP POLICY IF EXISTS "Users can create wound notes in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes in their tenant" ON wound_notes;

-- New INSERT policy: allows both wound notes AND addendums
CREATE POLICY "Users can create wound notes and addendums in their facilities"
  ON wound_notes FOR INSERT
  WITH CHECK (
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid())
      )
    ))
    OR
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid())
      )
    ))
  );

-- New SELECT policy: allows viewing both wound notes AND addendums
CREATE POLICY "Users can view wound notes and addendums in their tenant"
  ON wound_notes FOR SELECT
  USING (
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid())
      )
    ))
    OR
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN facilities f ON p.facility_id = f.id
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND tenant_id = f.tenant_id AND role = 'tenant_admin')
        OR f.id IN (SELECT facility_id FROM user_roles WHERE user_id = auth.uid())
      )
    ))
  );

-- Comments
COMMENT ON COLUMN wound_notes.note_type IS 'Type of note: wound_note (during visit) or addendum (post-signature)';
COMMENT ON COLUMN visits.addendum_count IS 'Number of addendums added after visit signing';
