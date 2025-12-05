# RLS Security Audit Report - Wound EHR
**Date:** November 23, 2025  
**Auditor:** GitHub Copilot  
**Scope:** Comprehensive RLS policy review across all 18 database tables

## Executive Summary

A thorough security audit of Row Level Security (RLS) policies revealed **3 critical security vulnerabilities** affecting multi-tenant isolation, plus several medium and low-priority issues. The core clinical data tables (patients, wounds, visits, assessments, etc.) are correctly configured, but admin-related tables have RLS disabled, exposing sensitive data across tenant boundaries.

### Risk Assessment
- **Critical Issues:** 3 (tenants, user_invites, wound_notes)
- **Medium Priority:** 2 (user_roles documented risk, users table mixed policies)
- **Low Priority:** 1 (procedure_scopes inconsistency)
- **Tables Correctly Configured:** 10/18 (56%)

### Immediate Actions Required
1. **Run `scripts/fix-critical-rls-issues.sql`** - Fixes multi-tenant isolation
2. Verify wound_notes policies use user_facilities (not user_roles)
3. Document that user_roles must never be queried in RLS policies

---

## Critical Vulnerabilities (IMMEDIATE FIX REQUIRED)

### 1. 🚨 TENANTS TABLE - Multi-Tenant Isolation Broken
**Severity:** CRITICAL  
**Impact:** All authenticated users can view ALL tenants in the database

**Current State:**
- RLS: DISABLED (Migration 00017)
- Reason: Disabled to avoid infinite recursion when other policies queried user_roles
- Security Impact: Users can see tenant names, subdomains, and status for competitors

**Example Attack:**
```sql
-- Any authenticated user can run this:
SELECT * FROM tenants; -- Returns ALL tenants, not just theirs
```

**Fix:** Re-enable RLS using SECURITY DEFINER RPC function `get_user_role_info()` to avoid recursion. See `scripts/fix-critical-rls-issues.sql` line 90-115.

---

### 2. 🚨 USER_INVITES TABLE - Invitation Data Exposed
**Severity:** CRITICAL  
**Impact:** All authenticated users can view ALL pending invites across ALL tenants

**Current State:**
- RLS: DISABLED (Migration 00004)
- Reason: Original policies used user_roles, causing recursion
- Security Impact: Users can see email addresses, roles, and facility assignments for pending invites in other tenants

**Example Attack:**
```sql
-- Any authenticated user can run this:
SELECT email, role, facility_id FROM user_invites WHERE accepted_at IS NULL;
-- Returns ALL pending invites across ALL tenants
```

**Fix:** Re-enable RLS using RPC functions. See `scripts/fix-critical-rls-issues.sql` line 134-182.

---

### 3. 🚨 WOUND_NOTES TABLE - Conflicting Policies
**Severity:** CRITICAL  
**Impact:** Uncertain which authorization model is active (user_roles vs user_facilities)

**Current State:**
- RLS: ENABLED
- Problem: Migration 00020 created policies using `user_roles` table
- Conflict: Script `fix-all-wound-notes-rls.sql` created policies using `user_facilities` table
- Risk: If user_roles policies are active, they won't work (user_roles has RLS disabled)

**Analysis:**
Migration 00020 policies (INCORRECT - uses user_roles):
```sql
WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
```

Fix script policies (CORRECT - uses user_facilities):
```sql
INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
WHERE uf.user_id = auth.uid()
```

**Fix:** Consolidate to user_facilities approach. See `scripts/fix-critical-rls-issues.sql` line 20-72.

---

## Medium Priority Issues

### 4. ⚠️ USER_ROLES TABLE - RLS Disabled by Design
**Severity:** MEDIUM  
**Impact:** All authenticated users can query role assignments for all users

**Current State:**
- RLS: DISABLED (Migration 00017 - intentional)
- Reason: Prevents infinite recursion when other policies check roles
- Workaround: Two SECURITY DEFINER RPC functions created:
  - `get_user_role_info(user_uuid)` - Get single user's role
  - `get_tenant_user_roles(tenant_uuid)` - Get all roles for a tenant

**Security Implication:**
```sql
-- Any authenticated user can run this:
SELECT * FROM user_roles; -- Returns ALL role assignments across ALL tenants
```

**Mitigation:**
- ✅ Documented: Never query user_roles in RLS policies
- ✅ RPC functions exist for safe role checks
- ⚠️ Application code must use RPC functions exclusively
- ⚠️ No policy prevents direct queries to user_roles table

**Long-term Solution:** Consider re-enabling RLS with policies that use a different authorization mechanism (not user_roles itself).

---

### 5. ⚠️ USERS TABLE - Mixed Authorization Models
**Severity:** MEDIUM  
**Impact:** Inconsistent policies using both user_roles and user_facilities

**Current State:**
- RLS: ENABLED
- Multiple policies from different migrations:
  1. "Users can view users in their facilities" (NEW - uses user_facilities) ✅
  2. "Admins can view users in their tenant" (Migration 00007 - uses user_roles) ⚠️
  3. "Tenant admins can update users" (Migration 00010 - uses user_roles) ⚠️
  4. "Facility admins can update users" (Migration 00010 - uses user_roles + user_facilities) ⚠️

**Analysis:**
The new policy (from `fix-users-rls-comprehensive.sql`) is correct and should handle most cases. The admin policies work because user_roles has RLS disabled, but this creates architectural inconsistency.

**Recommendation:** Consolidate to only use the new policy and RPC functions for admin checks. Low priority because it currently works.

---

## Low Priority Issues

### 6. ℹ️ PROCEDURE_SCOPES TABLE - Inconsistent Pattern
**Severity:** LOW  
**Impact:** Works but doesn't follow RPC function pattern

**Current State:**
- RLS: ENABLED
- Policy queries user_roles directly:
```sql
CREATE POLICY "Tenant admins can manage procedure scopes"
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'tenant_admin')
  );
```

**Issue:** This works (user_roles RLS is disabled), but doesn't follow the pattern used in fixed policies.

**Fix:** Update to use RPC function for consistency. See `scripts/fix-critical-rls-issues.sql` line 200-210.

---

## Tables Correctly Configured ✅

The following tables use the correct authorization model (user_facilities via joins):

1. **patients** - 4 policies (SELECT, INSERT, UPDATE, DELETE)
2. **wounds** - 2 policies (SELECT, ALL)
3. **visits** - 2 policies (SELECT, ALL)
4. **assessments** - 2 policies (SELECT, ALL)
5. **photos** - 4 policies (SELECT, INSERT, UPDATE, DELETE)
6. **treatments** - 2 policies (SELECT, ALL)
7. **billings** - 2 policies (SELECT, ALL)
8. **user_facilities** - 4 policies (self-reference: user_id = auth.uid())
9. **signatures** - 2 policies (SELECT, INSERT - immutable by design)
10. **patient_consents** - 2 policies (SELECT, INSERT - immutable by design)

**Pattern (Example from patients table):**
```sql
CREATE POLICY "Users can view patients in their facilities"
  ON patients FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );
```

---

## Architectural Analysis

### The Two Authorization Models

#### Model 1: user_facilities (CORRECT ✅)
- **Usage:** 10/18 tables
- **Pattern:** Direct join to user_facilities table
- **Advantages:**
  - No RLS recursion issues
  - Simple and performant
  - Clear authorization path
- **Example:**
  ```sql
  facility_id IN (
    SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
  )
  ```

#### Model 2: user_roles (PROBLEMATIC ⚠️)
- **Usage:** Attempted in migrations 00002, 00020, admin features
- **Pattern:** Query user_roles to check tenant_id and role
- **Problems:**
  - Causes infinite recursion (policies query same table they protect)
  - Required disabling RLS on user_roles (security risk)
  - Created tenant isolation vulnerabilities
  - Inconsistent with rest of schema
- **Example (INCORRECT):**
  ```sql
  WHERE f.tenant_id IN (
    SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
  )
  ```

### Root Cause Timeline

1. **Migration 00001:** Original schema correctly used user_facilities ✅
2. **Migration 00002:** Introduced user_roles for RBAC and multi-tenancy
   - Added tenant_id to facilities
   - Tried to use user_roles in RLS policies
   - Caused infinite recursion ❌
3. **Migration 00004:** Emergency RLS disable on multiple tables
4. **Migration 00017:** Permanent RLS disable on user_roles with RPC functions
5. **Migration 00020:** Wound notes policies still used user_roles (didn't get the memo) ❌
6. **Fix Scripts:** Corrected to use user_facilities ✅

---

## Recommended Actions

### Phase 1: IMMEDIATE (Security Critical)
Priority: **TODAY**

1. **Run `scripts/fix-critical-rls-issues.sql` in Supabase SQL Editor**
   - Fixes wound_notes policies (use user_facilities)
   - Re-enables RLS on tenants table
   - Re-enables RLS on user_invites table
   - Updates procedure_scopes to use RPC function

2. **Verify Fix Success**
   ```sql
   -- Check RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('tenants', 'user_invites');
   -- Both should show rowsecurity = true
   
   -- Test tenant isolation
   SELECT * FROM tenants; -- Should only return YOUR tenant
   
   -- Test invite isolation
   SELECT * FROM user_invites; -- Should only return YOUR tenant's invites
   ```

3. **Test Application Functionality**
   - Login as different roles (tenant_admin, facility_admin, user)
   - Verify admin panel works
   - Verify wound notes and addendums display
   - Verify invites are sent correctly

### Phase 2: MEDIUM (Architecture Documentation)
Priority: **This Week**

4. **Document RLS Architecture**
   - Add section to `SYSTEM_DESIGN.md` explaining:
     - user_facilities is the PRIMARY authorization model
     - user_roles RLS must remain disabled
     - Always use RPC functions for role checks in policies
     - Never query user_roles in new RLS policies

5. **Code Review Guidelines**
   - Update PR template to check for user_roles in RLS policies
   - Add linting rule to flag "FROM user_roles" in migration files

6. **Clean Up Users Table Policies**
   - Remove old admin policies that use user_roles
   - Keep only the new "Users can view users in their facilities" policy
   - Update admin functions to use RPC functions if needed

### Phase 3: LOW (Code Quality)
Priority: **Next Sprint**

7. **Audit Application Code**
   - Search for direct queries to user_roles (should use RPC functions)
   - Search for direct queries to tenants (should use RPC functions or current_tenant helper)

8. **Performance Testing**
   - Profile RPC function usage in policies
   - Consider caching tenant_id in session if performance issues

9. **Security Audit**
   - Consider re-enabling RLS on user_roles with alternative auth mechanism
   - Evaluate if SECURITY DEFINER functions need additional security checks

---

## Verification Checklist

After running the fix script, verify each fix:

- [ ] **Tenants Table**
  - [ ] RLS enabled (SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenants';)
  - [ ] Policies exist (SELECT count(*) FROM pg_policies WHERE tablename = 'tenants';)
  - [ ] Test: `SELECT * FROM tenants;` returns only YOUR tenant
  - [ ] Test: Tenant admin can update tenant name

- [ ] **User Invites Table**
  - [ ] RLS enabled
  - [ ] Policies exist (should have 4: SELECT, 2x INSERT, UPDATE)
  - [ ] Test: `SELECT * FROM user_invites;` returns only YOUR tenant's invites
  - [ ] Test: Tenant admin can create invite
  - [ ] Test: Facility admin can create user invite

- [ ] **Wound Notes Table**
  - [ ] Policies use user_facilities (SELECT pg_get_policydef(oid) FROM pg_policy WHERE polname LIKE '%wound%' AND polrelid = 'wound_notes'::regclass;)
  - [ ] Test: Create wound note (regular)
  - [ ] Test: Create addendum (post-signature)
  - [ ] Test: View addendums on visit page
  - [ ] Test: Export PDF with addendums

- [ ] **Procedure Scopes Table**
  - [ ] Policy uses RPC function
  - [ ] Test: View procedure scopes as user
  - [ ] Test: Edit procedure scopes as tenant admin

---

## Security Impact Analysis

### Before Fix
- **Tenant Isolation:** BROKEN ❌
  - Any user could see all tenants
  - Any user could see all invites across tenants
- **Data Exposure:** HIGH
  - Email addresses exposed
  - Role assignments visible
  - Facility structures visible
- **Compliance Risk:** HIGH
  - HIPAA: PHI could be accessed by unauthorized tenants
  - SOC 2: Access controls ineffective

### After Fix
- **Tenant Isolation:** RESTORED ✅
  - Users can only see their own tenant
  - Admins can only see invites in their tenant
- **Data Exposure:** LOW
  - Email addresses protected by tenant boundary
  - Role assignments only visible within tenant
- **Compliance Risk:** MEDIUM
  - HIPAA: Tenant isolation restored
  - SOC 2: Access controls functional
  - Note: user_roles still has RLS disabled (documented risk)

---

## Key Takeaways

1. **user_facilities is the correct authorization model** for this application
2. **user_roles RLS must remain disabled** to avoid infinite recursion
3. **Always use RPC functions** (get_user_role_info, get_tenant_user_roles) for role checks
4. **Never add user_roles queries to RLS policies** on other tables
5. **Test multi-tenant isolation** after every schema change

---

## Support Information

**Fix Script Location:** `scripts/fix-critical-rls-issues.sql`  
**Audit Date:** November 23, 2025  
**Next Audit:** Recommended after any schema changes  
**Contact:** Review with database administrator before production deployment

---

## Appendix: SQL Policy Examples

### ✅ CORRECT - Using user_facilities
```sql
CREATE POLICY "Users can view patients"
  ON patients FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM user_facilities WHERE user_id = auth.uid()
    )
  );
```

### ❌ INCORRECT - Using user_roles (causes issues)
```sql
CREATE POLICY "Users can view patients"
  ON patients FOR SELECT
  USING (
    facility_id IN (
      SELECT f.id FROM facilities f
      WHERE f.tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
    )
  );
```

### ✅ CORRECT - Using RPC function for role checks
```sql
CREATE POLICY "Tenant admins only"
  ON procedure_scopes FOR ALL
  USING (
    (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
  );
```
