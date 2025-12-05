# Procedure Restrictions Integration Guide

## Overview

This guide documents the **Phase 9.3.1: Procedure Restrictions** implementation for credential-based filtering of medical procedures. The system prevents RN/LVN clinicians from documenting procedures outside their scope of practice (specifically sharp debridement CPT codes 11042-11047).

**Status:** ⚠️ 50% Complete - Database, utilities, and UI components ready; integration and testing pending.

## Components Created

### 1. Database Layer ✅ Complete

**File:** `supabase/migrations/00018_add_procedure_scopes.sql`

- Creates `procedure_scopes` table mapping CPT codes to allowed credentials
- Seeds 17 common wound care procedures with restrictions
- Sharp debridement (11042-11047): **MD/DO/PA/NP only**
- Selective debridement (97597-97598): **All credentials allowed**
- NPWT (97605-97608): **All credentials allowed**
- RLS policies: Read for all authenticated, modify for tenant_admins only
- Helper functions:
  - `can_perform_procedure(credentials, cpt_code)` → boolean
  - `get_allowed_procedures(credentials)` → table
  - `get_restricted_procedures(credentials)` → table

**Deployment Status:** Not yet deployed (migration file created but not run)

### 2. Business Logic Layer ✅ Complete

**File:** `lib/procedures.ts`

TypeScript utilities for procedure validation:

#### Key Functions

```typescript
// Check if user can perform a specific procedure
canPerformProcedure(credentials, procedureCode): Promise<boolean>

// Get all allowed procedures for user
getAllowedProcedures(credentials): Promise<Procedure[]>

// Get all blocked procedures with reasons
getRestrictedProcedures(credentials): Promise<RestrictedProcedure[]>

// Validate array of billing codes (server-side)
validateBillingCodes(credentials, codes): Promise<ValidationResult>

// Batch validation for multiple procedures
checkMultipleProcedures(credentials, codes): Promise<ProcedureCheckResult[]>

// Check if user has full access (MD/DO/PA/NP)
hasFullProcedureAccess(credentials): boolean

// Check if user has restrictions (RN/LVN/CNA)
hasLimitedProcedureAccess(credentials): boolean

// Get credential display name
getCredentialsDisplayName(credentials): string

// Get fallback credentials if null
getDefaultCredentials(): Credentials
```

#### Types

```typescript
type Credentials = 'RN' | 'LVN' | 'MD' | 'DO' | 'PA' | 'NP' | 'CNA' | 'Admin';

type Procedure = {
  cptCode: string;
  procedureName: string;
  allowedCredentials: Credentials[];
};

type RestrictedProcedure = Procedure & {
  requiredCredentials: Credentials[];
};

type ValidationResult = {
  allowed: boolean;
  errors: string[];
  restrictedCodes: string[];
};
```

### 3. UI Components ✅ Complete

#### 3.1 Client Component: BillingFormWithCredentials

**File:** `components/billing/billing-form-with-credentials.tsx`

Credential-aware billing form that replaces original `billing-form.tsx`.

**Features:**
- Filters CPT code dropdown to show only allowed procedures
- Visual indicators for restricted codes:
  - Red badges with `AlertCircle` icon
  - Warning alert banners when restricted codes selected
  - Tooltips explaining required credentials
- Client-side validation prevents adding restricted codes
- Shows alert dialog if user tries to add restricted procedure

**Props:**
```typescript
type BillingFormWithCredentialsProps = {
  visitId: string;
  patientId: string;
  userCredentials: Credentials | null;
  allowedCPTCodes: string[];
  restrictedCPTCodes: Array<{
    cptCode: string;
    procedureName: string;
    requiredCredentials: Credentials[];
  }>;
  existingBilling?: {
    id: string;
    cptCodes: string[];
    icd10Codes: string[];
    modifiers: string[];
    timeSpent: boolean;
    notes: string | null;
  } | null;
};
```

#### 3.2 Server Component Wrapper: BillingFormServerWrapper

**File:** `components/billing/billing-form-server-wrapper.tsx`

Server component that fetches user credentials and procedure data, then passes to client component.

**Usage:**
```tsx
import { BillingFormServerWrapper } from "@/components/billing/billing-form-server-wrapper";

// In server component (e.g., visit details page)
<BillingFormServerWrapper
  visitId={visitId}
  patientId={patientId}
  existingBilling={billingData}
/>
```

**What it does:**
1. Fetches authenticated user
2. Queries user credentials from `users` table
3. Calls `getAllowedProcedures()` and `getRestrictedProcedures()`
4. Extracts CPT code arrays
5. Passes all data to `BillingFormWithCredentials` client component

### 4. Server Actions ✅ Complete

**File:** `app/actions/billing.ts` (updated)

Added credential validation to billing actions:

#### `createBilling()` Changes
- Fetches user credentials before insert
- Calls `validateBillingCodes(credentials, cptCodes)`
- Returns error with restricted codes if validation fails
- Only inserts if validation passes

#### `updateBilling()` Changes
- Fetches user credentials before update
- Validates CPT codes if they're being updated
- Returns error with restricted codes if validation fails
- Only updates if validation passes

**Error Response:**
```typescript
{
  success: false,
  error: "Credential restriction: Sharp Debridement (11042) requires MD/DO/PA/NP credentials",
  restrictedCodes: ["11042", "11043"]
}
```

## Integration Steps (Pending)

### Step 1: Deploy Database Migration ❌ Pending

```bash
# Run migration script
npm run db:migrate

# Or manually apply migration
psql -h <host> -U postgres -d <database> -f supabase/migrations/00018_add_procedure_scopes.sql
```

**Verification:**
```sql
-- Check table created
SELECT * FROM procedure_scopes LIMIT 5;

-- Test helper function
SELECT can_perform_procedure(ARRAY['RN'], '11042'); -- Should return false
SELECT can_perform_procedure(ARRAY['MD'], '11042'); -- Should return true
```

### Step 2: Update Visit Details Page ❌ Pending

**Files to Update:**
- `app/dashboard/patients/[id]/visits/[visitId]/page.tsx`

**Changes:**
1. Remove old `BillingForm` import
2. Import `BillingFormServerWrapper` instead
3. Replace `<BillingForm />` with `<BillingFormServerWrapper />`

**Example:**
```tsx
// Before
import { BillingForm } from "@/components/billing/billing-form";

<BillingForm
  visitId={visitId}
  patientId={patientId}
  existingBilling={billingData}
/>

// After
import { BillingFormServerWrapper } from "@/components/billing/billing-form-server-wrapper";

<BillingFormServerWrapper
  visitId={visitId}
  patientId={patientId}
  existingBilling={billingData}
/>
```

### Step 3: Update Billing Reports Page ❌ Pending

**File:** `app/dashboard/billing/page.tsx`

If billing codes are displayed or edited in reports:
1. Show credential badges next to procedure names
2. Filter available procedures when creating/editing billing records
3. Add tooltips explaining restrictions

### Step 4: Testing ❌ Pending

#### Test Scenario 1: RN User
1. Log in as RN
2. Navigate to patient visit
3. Open billing form
4. Verify CPT 11042-11047 are NOT in dropdown
5. Verify CPT 97597-97598 ARE in dropdown
6. Try to submit form with restricted code (should fail server-side if bypassed)

#### Test Scenario 2: MD User
1. Log in as MD
2. Navigate to patient visit
3. Open billing form
4. Verify ALL CPT codes are in dropdown
5. Verify no restriction warnings appear
6. Submit form with CPT 11042 (should succeed)

#### Test Scenario 3: API Bypass Attempt
1. Use browser dev tools or API client
2. Attempt to POST billing with RN credentials and CPT 11042
3. Verify server returns error: "Credential restriction: Sharp Debridement (11042) requires MD/DO/PA/NP credentials"
4. Verify billing record NOT created in database

#### Test Scenario 4: Null Credentials
1. Test with user who has no credentials set
2. Verify form shows "Credentials not set" message
3. Verify restricted procedures are blocked
4. Verify validation uses fallback logic

### Step 5: Treatment Form Updates ❌ Pending

**When treatments UI is built, apply same pattern:**

1. Create `treatments` actions with credential validation
2. Create `TreatmentFormWithCredentials` component
3. Filter debridement options based on credentials:
   - Hide "Sharp Debridement" for RN/LVN
   - Show "Selective Debridement" for all
4. Add server-side validation in treatment actions
5. Test with different credentials

**Example Treatment Validation:**
```typescript
// In app/actions/treatments.ts (when created)
export async function createTreatment(data: TreatmentInput) {
  const supabase = await createClient();
  
  // Get user credentials
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users")
    .select("credentials")
    .eq("id", user.id)
    .single();
  
  // Validate debridement procedures if included
  if (data.debridement && data.debridement.type === "sharp") {
    const hasAccess = await canPerformProcedure(
      userData?.credentials,
      "11042" // Example sharp debridement CPT
    );
    
    if (!hasAccess) {
      return {
        success: false,
        error: "Sharp debridement requires MD/DO/PA/NP credentials"
      };
    }
  }
  
  // Continue with insert...
}
```

### Step 6: Assessment Form Updates ❌ Pending

**File:** `components/assessments/assessment-form.tsx`

If assessment form includes procedure/treatment options:
1. Conditionally render debridement type based on credentials
2. Filter procedure options using `getAllowedProcedures()`
3. Add visual indicators for restricted options
4. Validate on server before saving

## Configuration

### Adding New Procedure Restrictions

To add new restricted procedures:

1. **Update procedure_scopes table:**
```sql
INSERT INTO procedure_scopes (cpt_code, procedure_name, allowed_credentials)
VALUES ('12345', 'New Restricted Procedure', ARRAY['MD','DO','PA','NP']);
```

2. **No code changes needed** - validation functions query database dynamically

### Modifying Credential Requirements

To change which credentials can perform a procedure:

```sql
UPDATE procedure_scopes
SET allowed_credentials = ARRAY['MD','DO','PA','NP','RN']
WHERE cpt_code = '97597'; -- Allow RN for selective debridement
```

### Adding New Credentials

If new credential types are added to system:

1. Update `Credentials` type in `lib/database.types.ts`
2. Update procedures.ts validation functions if needed
3. Update procedure_scopes entries to include new credentials where appropriate

## Error Handling

### Client-Side Errors

**Scenario:** User tries to select restricted CPT code

**Handling:**
- Alert dialog shows: "This procedure requires [credentials]. Current credentials: [user's credentials]."
- Code is not added to selected list
- Form remains in valid state

### Server-Side Errors

**Scenario:** Validation fails during save

**Handling:**
```typescript
const result = await createBilling(data);

if (!result.success && result.restrictedCodes) {
  // Show error toast or alert
  toast.error(result.error);
  
  // Optionally highlight restricted codes in UI
  setRestrictedCodesInForm(result.restrictedCodes);
}
```

### Database Errors

**Scenario:** procedure_scopes table not found (migration not run)

**Handling:**
- `getAllowedProcedures()` catches error and returns all procedures (fail-open)
- Logs error to console
- Shows warning message in UI: "Unable to verify procedure restrictions"

## Security Considerations

### Client-Side Security
- UI filtering is convenience only, NOT security boundary
- Client can be modified to bypass UI restrictions
- **Always validate server-side**

### Server-Side Security
- All actions validate credentials before insert/update
- Database RLS prevents direct manipulation (tenant_admin only)
- Audit trail in billings table shows who created/modified records

### Audit Trail

Existing audit fields in billings table:
- `created_at` - When billing created
- `updated_at` - When billing modified (auto-updated via trigger)

To track who performed billing:
```sql
-- Add created_by column if needed
ALTER TABLE billings ADD COLUMN created_by UUID REFERENCES auth.users(id);
```

## Performance Considerations

### Caching Strategies

**Current:** No caching implemented

**Future Optimization:**
```typescript
// Cache procedure data at app level (revalidate every hour)
export const getProcedureData = unstable_cache(
  async (credentials: Credentials) => {
    const allowed = await getAllowedProcedures(credentials);
    const restricted = await getRestrictedProcedures(credentials);
    return { allowed, restricted };
  },
  ['procedure-data'],
  { revalidate: 3600 } // 1 hour
);
```

### Query Optimization

Current queries are already optimized:
- `get_allowed_procedures()` uses indexed `cpt_code` column
- `can_perform_procedure()` uses single row lookup with index
- No N+1 queries

## Compliance & Legal Notes

### Why This Feature Exists

**Legal Background:**
- Sharp debridement (CPT 11042-11047) is surgical procedure
- RN/LVN cannot legally perform surgical debridement in most states
- Allowing RN/LVN to document sharp debridement creates liability
- System must enforce scope of practice restrictions

**Compliance Requirements:**
- Procedure restrictions must match state scope of practice laws
- Audit trail must show who documented procedures
- System must prevent (not just warn) unauthorized documentation

### Scope of Practice by Credential

| Credential | Sharp Debridement | Selective Debridement | NPWT | Wound Assessment |
|------------|-------------------|----------------------|------|------------------|
| MD         | ✅ Yes            | ✅ Yes               | ✅ Yes | ✅ Yes          |
| DO         | ✅ Yes            | ✅ Yes               | ✅ Yes | ✅ Yes          |
| PA         | ✅ Yes            | ✅ Yes               | ✅ Yes | ✅ Yes          |
| NP         | ✅ Yes            | ✅ Yes               | ✅ Yes | ✅ Yes          |
| RN         | ❌ No             | ✅ Yes               | ✅ Yes | ✅ Yes          |
| LVN        | ❌ No             | ✅ Yes               | ✅ Yes | ✅ Yes          |
| CNA        | ❌ No             | ⚠️ Supervised        | ❌ No  | ⚠️ Supervised   |
| Admin      | ❌ No             | ❌ No                | ❌ No  | ❌ No           |

**Note:** Actual scope of practice varies by state. Procedure restrictions should be configurable per facility.

## Troubleshooting

### Issue: Dropdown shows no CPT codes

**Cause:** User credentials not set or `procedure_scopes` table empty

**Solution:**
1. Check user credentials: `SELECT credentials FROM users WHERE id = '<user-id>';`
2. Check procedure_scopes populated: `SELECT COUNT(*) FROM procedure_scopes;`
3. Verify migration 00018 was applied

### Issue: Restricted codes still appear in dropdown

**Cause:** Client component not receiving filtered codes

**Solution:**
1. Check BillingFormServerWrapper is fetching data correctly
2. Verify `allowedCPTCodes` prop is being passed to client component
3. Check browser console for errors in data fetching

### Issue: Server allows restricted codes

**Cause:** Server-side validation not implemented or failing

**Solution:**
1. Verify `validateBillingCodes()` is called in `createBilling()` and `updateBilling()`
2. Check validation is returning correct results
3. Verify credentials are fetched before validation

### Issue: All users see all procedures

**Cause:** `procedure_scopes` table empty or migration not applied

**Solution:**
1. Run migration: `npm run db:migrate` or manually apply 00018
2. Verify seed data: `SELECT * FROM procedure_scopes;`
3. Check RLS policies enabled: `SELECT * FROM pg_policies WHERE tablename = 'procedure_scopes';`

## Next Steps

1. ✅ Complete Phase 9.3.1 implementation:
   - ❌ Deploy migration 00018
   - ❌ Update visit details page with BillingFormServerWrapper
   - ❌ Test with RN and MD users
   - ❌ Test server-side validation with API bypass attempts

2. 🔲 Phase 9.3.2: Implement autosave functionality

3. 🔲 Phase 9.3.3: Enhance photo labeling in PDFs

4. 🔲 Future: Add procedure restrictions to treatment forms when built

## Related Documentation

- `SYSTEM_DESIGN.md` - Phase 9.3.1 requirements
- `CLIENT_REQUIREMENTS_ANALYSIS.md` - Original client requirement
- `PROJECT_STATUS.md` - Current implementation status
- `lib/procedures.ts` - Validation utilities documentation
- `supabase/migrations/00018_add_procedure_scopes.sql` - Database schema

## Support

For questions or issues:
1. Check this integration guide first
2. Review SYSTEM_DESIGN.md Phase 9.3.1 section
3. Check Supabase logs for database errors
4. Review browser console for client-side errors
5. Test validation functions in isolation using `lib/procedures.ts`
