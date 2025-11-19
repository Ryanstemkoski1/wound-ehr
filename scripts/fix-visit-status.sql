-- Fix visit status check constraint for Phase 9.2 signature workflow

-- Drop the old check constraint
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;

-- Add new check constraint with all required status values
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
