# Migration Analysis

## Migration Files Review

### ✅ ESSENTIAL - Keep these:

1. **00001_initial_schema.sql** - Core tables, initial RLS policies, triggers
   - Creates all base tables (facilities, patients, wounds, visits, etc.)
   - Initial RLS policies
   - Auth trigger (handle_new_user)

2. **00002_phase8_rbac_wound_notes.sql** - RBAC system, tenant support
   - Adds tenants, user_roles, wound_notes, user_invites tables
   - Adds tenant_id to facilities ⚠️
   - Creates tenant-based RLS policies (some are BROKEN)

3. **00008_add_credentials_system.sql** - Phase 9.1 Credentials
   - Adds credentials column to users and user_invites
   - Creates procedure_scopes table
   - Essential for current feature

4. **00009_fix_user_creation_trigger.sql** - Fix signup bug
   - Updates handle_new_user() to include credentials
   - Prevents "Database error saving new user"

5. **00010_add_users_update_policy.sql** - Allow admins to edit users
   - Adds UPDATE RLS policies for users table
   - Required for credentials update feature

6. **00011_fix_facilities_rls.sql** - Fix facilities query
   - Replaces broken tenant-based policies with user_facilities based
   - This is why facilities weren't showing

7. **00013_comprehensive_fix.sql** - Cleanup and verification
   - Sets tenant_id on all facilities
   - Re-applies correct RLS policies
   - Verification checks

---

### ⚠️ PROBLEMATIC - May need review:

8. **00003_default_tenant_and_auto_role.sql** - Auto-assign roles
   - Creates default tenant
   - Auto-assigns users without invites to default tenant
   - May conflict with real tenant setup

9. **00003_fix_rls_policies.sql** - ⚠️ DUPLICATE NAME with #8
   - Fixes RLS recursion issues
   - Re-enables RLS after 00004

10. **00004_emergency_disable_rls.sql** - Emergency fix
    - Disables RLS to stop recursion
    - Should be superseded by 00003_fix_rls_policies.sql

11. **00005_setup_default_tenant.sql** - Another default tenant setup
    - Possibly duplicate of 00003_default_tenant_and_auto_role.sql
    - Need to check

12. **00006_update_visit_status_enum.sql** - Minor update
    - Updates visit status enum values
    - Safe but check if needed

13. **00007_fix_users_rls_for_admins.sql** - Users table SELECT policy
    - Allows admins to view users in tenant
    - Required for admin panel

---

## ⚠️ ISSUES FOUND:

1. **Two files named `00003_*`** - Migration naming conflict
2. **00004 disables RLS** then **00003_fix re-enables** - Order matters!
3. **00002 creates tenant_id policies** but **00011 replaces them** - Redundant
4. **00013 is a cleanup** that should be run LAST

---

## 🔧 RECOMMENDED ACTIONS:

### Option A: Keep all, but rename for clarity
- Rename `00003_default_tenant_and_auto_role.sql` → `00003a_default_tenant_and_auto_role.sql`
- Rename `00003_fix_rls_policies.sql` → `00003b_fix_rls_policies.sql`
- This preserves history but clarifies order

### Option B: Consolidate (risky)
- Merge 00002, 00003a, 00003b, 00004, 00005 into single RBAC migration
- Keep 00001 as base schema
- Keep 00006-00013 as incremental fixes
- **NOT RECOMMENDED** - could break existing databases

### Option C: Status quo + documentation (SAFEST)
- Keep all files as-is
- Add README.md in migrations folder explaining:
  - Which migrations are superseded
  - Correct execution order
  - What each migration does
- For fresh database setup, provide single consolidated script

---

## ✅ MINIMUM REQUIRED (Fresh Setup):

For a fresh database, you only need:
1. 00001 - Base schema
2. 00002 - RBAC + tenants (with tenant_id column)
3. 00008 - Credentials system
4. 00009 - User trigger fix
5. 00010 - Users UPDATE policy
6. 00011 - Facilities RLS fix
7. 00013 - Set tenant_id values + verification

**Migrations 00003, 00004, 00005, 00006, 00007** were debugging steps that are superseded by later fixes.
