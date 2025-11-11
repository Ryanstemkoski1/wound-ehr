-- Setup: Create default tenant and link existing facilities
-- Run this in Supabase SQL Editor after disabling RLS

-- Create a default tenant
INSERT INTO tenants (name, subdomain, is_active)
VALUES ('Default Clinic', 'default', true)
ON CONFLICT DO NOTHING
RETURNING id;

-- Get the tenant ID (replace with actual ID from above)
-- If you see an ID like: 12345678-1234-1234-1234-123456789abc
-- Use it in the next query

-- Update all existing facilities to belong to default tenant
-- REPLACE 'YOUR-TENANT-ID-HERE' with the actual ID from above
UPDATE facilities 
SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- Verify
SELECT 
  f.id, 
  f.name, 
  f.tenant_id, 
  t.name as tenant_name 
FROM facilities f 
LEFT JOIN tenants t ON f.tenant_id = t.id;

SELECT 'Setup complete! All facilities linked to default tenant.' as status;
