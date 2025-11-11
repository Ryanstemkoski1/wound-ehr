-- EMERGENCY FIX: Disable RLS on new tables to stop infinite recursion
-- Run this in Supabase SQL Editor immediately

ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites DISABLE ROW LEVEL SECURITY;

-- Keep RLS on wound_notes (it's safe)
-- This allows the app to work while we design better policies

SELECT 'RLS temporarily disabled on user_roles, tenants, user_invites' as status;
