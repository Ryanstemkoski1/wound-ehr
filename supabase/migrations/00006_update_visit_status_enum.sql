-- Migration: Update visit status enum to support calendar statuses
-- Drop the old check constraint
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;

-- Add new check constraint with expanded status values
ALTER TABLE visits ADD CONSTRAINT visits_status_check 
  CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show', 'incomplete', 'complete'));

-- Update existing 'incomplete' values to 'scheduled' for better semantics
UPDATE visits SET status = 'scheduled' WHERE status = 'incomplete';

-- Update existing 'complete' values to 'completed' for consistency
UPDATE visits SET status = 'completed' WHERE status = 'complete';

-- Set default to 'scheduled' instead of 'incomplete'
ALTER TABLE visits ALTER COLUMN status SET DEFAULT 'scheduled';
