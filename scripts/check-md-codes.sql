-- Check procedure_scopes table for all sharp debridement codes

-- 1. Show all codes 11042-11047
SELECT 
  procedure_code,
  procedure_name,
  allowed_credentials,
  category
FROM procedure_scopes
WHERE procedure_code BETWEEN '11042' AND '11047'
ORDER BY procedure_code;

-- 2. Check if MD is in the allowed_credentials array for these codes
SELECT 
  procedure_code,
  procedure_name,
  allowed_credentials,
  'MD' = ANY(allowed_credentials) as md_is_allowed
FROM procedure_scopes
WHERE procedure_code BETWEEN '11042' AND '11047'
ORDER BY procedure_code;

-- 3. Check the MD user's credentials
SELECT id, email, credentials
FROM users
WHERE credentials = 'MD'
ORDER BY created_at DESC
LIMIT 5;
