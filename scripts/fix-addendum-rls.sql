-- Run this in Supabase SQL Editor to fix RLS policies for addendums

DROP POLICY IF EXISTS "Users can create wound notes in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can create wound notes and addendums in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes in their tenant" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes and addendums in their tenant" ON wound_notes;

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
