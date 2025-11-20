-- Test 1: Verify Migration Deployed
-- Run this in Supabase Dashboard > SQL Editor

-- Check 1: Does procedure_scopes table exist?
SELECT COUNT(*) as total_procedures FROM procedure_scopes;
-- Expected: 17

-- Check 2: Test RN restriction on sharp debridement
SELECT can_perform_procedure(ARRAY['RN']::text[], '11042') as rn_can_do_sharp_debridement;
-- Expected: false

-- Check 3: Test RN can do selective debridement  
SELECT can_perform_procedure(ARRAY['RN']::text[], '97597') as rn_can_do_selective_debridement;
-- Expected: true

-- Check 4: Test MD can do sharp debridement
SELECT can_perform_procedure(ARRAY['MD']::text[], '11042') as md_can_do_sharp_debridement;
-- Expected: true

-- Check 5: List all restricted procedures for RN
SELECT * FROM get_restricted_procedures(ARRAY['RN']::text[]);
-- Expected: Should show 11042-11047 (sharp debridement codes)
