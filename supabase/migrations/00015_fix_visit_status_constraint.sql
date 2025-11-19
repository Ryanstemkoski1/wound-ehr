-- Migration: Fix visit status check constraint for Phase 9.2 signature workflow
-- Drop the old check constraint that doesn't include signature workflow statuses
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;

-- Add new check constraint with all required status values
-- Legacy statuses: scheduled, in-progress, completed, cancelled, no-show, incomplete, complete
-- Phase 9.2 statuses: draft, ready_for_signature, signed, submitted
ALTER TABLE visits ADD CONSTRAINT visits_status_check 
  CHECK (status IN (
    'draft', 
    'ready_for_signature', 
    'signed', 
    'submitted',
    'scheduled', 
    'in-progress', 
    'completed', 
    'cancelled', 
    'no-show', 
    'incomplete', 
    'complete'
  ));

-- Update default to 'draft' for signature workflow
ALTER TABLE visits ALTER COLUMN status SET DEFAULT 'draft';

-- Add comment explaining the status workflow
COMMENT ON COLUMN visits.status IS 
  'Visit workflow status - Phase 9.2 signature workflow: draft → ready_for_signature → signed → submitted. Legacy: scheduled, in-progress, completed, cancelled, no-show';

SELECT '✓ Migration 00015: Fixed visit status constraint for signature workflow' as status;
