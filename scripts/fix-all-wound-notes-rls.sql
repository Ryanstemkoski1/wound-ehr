-- Comprehensive RLS Policy Fix for Addendums
-- This fixes ALL wound_notes policies to handle NULL wound_id for addendums
-- Uses user_facilities table (not user_roles)

-- Drop all existing wound_notes policies
DROP POLICY IF EXISTS "Users can create wound notes in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can create wound notes and addendums in their facilities" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes in their tenant" ON wound_notes;
DROP POLICY IF EXISTS "Users can view wound notes and addendums in their tenant" ON wound_notes;
DROP POLICY IF EXISTS "Users can update their own wound notes" ON wound_notes;
DROP POLICY IF EXISTS "Users can update their own wound notes and addendums" ON wound_notes;
DROP POLICY IF EXISTS "Users can delete their own wound notes" ON wound_notes;
DROP POLICY IF EXISTS "Users can delete their own wound notes and addendums" ON wound_notes;

-- SELECT Policy: View wound notes AND addendums
CREATE POLICY "Users can view wound notes and addendums in their facilities"
  ON wound_notes FOR SELECT
  USING (
    -- For wound notes (has wound_id)
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ))
    OR
    -- For addendums (no wound_id, but has visit_id)
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ))
  );

-- INSERT Policy: Create wound notes AND addendums
CREATE POLICY "Users can create wound notes and addendums in their facilities"
  ON wound_notes FOR INSERT
  WITH CHECK (
    -- For wound notes (has wound_id)
    (wound_id IS NOT NULL AND wound_id IN (
      SELECT w.id FROM wounds w
      JOIN patients p ON w.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ))
    OR
    -- For addendums (no wound_id, but has visit_id)
    (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
      WHERE uf.user_id = auth.uid()
    ))
  );

-- UPDATE Policy: Users can update their own wound notes AND addendums
CREATE POLICY "Users can update their own wound notes and addendums"
  ON wound_notes FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE Policy: Users can delete their own wound notes AND addendums
CREATE POLICY "Users can delete their own wound notes and addendums"
  ON wound_notes FOR DELETE
  USING (created_by = auth.uid());
