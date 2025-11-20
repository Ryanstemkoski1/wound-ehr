-- Quick verification: Is the migration complete?

-- 1. Check if table exists and has data
SELECT COUNT(*) as total_procedures FROM procedure_scopes;
-- Expected: 17

-- 2. Check if we have sharp debridement codes (restricted)
SELECT procedure_code, procedure_name, allowed_credentials 
FROM procedure_scopes 
WHERE procedure_code IN ('11042', '11043', '11044')
ORDER BY procedure_code;
-- Expected: 3 rows with allowed_credentials = {MD,DO,PA,NP}

-- 3. Check if functions exist - Test RN restriction
SELECT can_perform_procedure('RN', '11042') as rn_sharp_debridement;
-- Expected: false

-- 4. Test MD access
SELECT can_perform_procedure('MD', '11042') as md_sharp_debridement;
-- Expected: true

-- 5. Test RN can do selective debridement
SELECT can_perform_procedure('RN', '97597') as rn_selective_debridement;
-- Expected: true
