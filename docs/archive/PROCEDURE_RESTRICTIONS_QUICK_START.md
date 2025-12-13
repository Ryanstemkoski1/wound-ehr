# Procedure Restrictions - Quick Integration Guide

## 🚀 Quick Start (5 Steps)

### Step 1: Deploy Database Migration (5 min)
```bash
cd g:\Ryan\wound-ehr
npm run db:migrate
```

Or manually:
```bash
psql -h <supabase-host> -U postgres -d postgres -f supabase/migrations/00018_add_procedure_scopes.sql
```

**Verify:**
```sql
SELECT COUNT(*) FROM procedure_scopes; -- Should return 17
SELECT can_perform_procedure(ARRAY['RN'], '11042'); -- Should return false
SELECT can_perform_procedure(ARRAY['MD'], '11042'); -- Should return true
```

### Step 2: Update Visit Page (10 min)

**File:** `app/dashboard/patients/[id]/visits/[visitId]/page.tsx`

**Find:**
```tsx
import { BillingForm } from "@/components/billing/billing-form";

// ... in JSX ...
<BillingForm
  visitId={visitId}
  patientId={patientId}
  existingBilling={billingData}
/>
```

**Replace with:**
```tsx
import { BillingFormServerWrapper } from "@/components/billing/billing-form-server-wrapper";

// ... in JSX ...
<BillingFormServerWrapper
  visitId={visitId}
  patientId={patientId}
  existingBilling={billingData}
/>
```

### Step 3: Test with RN User (15 min)

1. Create test user:
```sql
-- Insert test RN user (or update existing)
INSERT INTO users (id, email, credentials, role)
VALUES (
  'test-rn-user-id',
  'rn.test@example.com',
  'RN',
  'user'
);
```

2. Log in as RN
3. Navigate to any patient visit
4. Open billing form
5. **Verify:** CPT codes 11042-11047 NOT in dropdown
6. **Verify:** CPT codes 97597-97598 ARE in dropdown
7. **Verify:** Red badges and warnings appear for restricted codes

### Step 4: Test with MD User (15 min)

1. Create test user:
```sql
-- Insert test MD user (or update existing)
INSERT INTO users (id, email, credentials, role)
VALUES (
  'test-md-user-id',
  'md.test@example.com',
  'MD',
  'user'
);
```

2. Log in as MD
3. Navigate to any patient visit
4. Open billing form
5. **Verify:** ALL CPT codes in dropdown (including 11042-11047)
6. **Verify:** No restriction warnings
7. **Verify:** Can save billing with CPT 11042

### Step 5: Test Server Validation (10 min)

Use browser dev tools or API client:

```javascript
// Attempt to bypass UI validation
fetch('/api/billing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visitId: 'visit-id',
    patientId: 'patient-id',
    cptCodes: ['11042'], // Restricted for RN
    icd10Codes: [],
    modifiers: []
  })
});

// Expected response for RN user:
{
  success: false,
  error: "Credential restriction: Sharp Debridement (11042) requires MD/DO/PA/NP credentials",
  restrictedCodes: ["11042"]
}
```

**Verify:** Billing record NOT created in database.

---

## 📋 Pre-Flight Checklist

Before deploying to production:

- [ ] Database migration tested in dev/staging
- [ ] `procedure_scopes` table has 17 rows
- [ ] Helper functions tested with SQL queries
- [ ] RN user created for testing
- [ ] MD user created for testing
- [ ] Visit page updated with new component
- [ ] UI displays credential badges correctly
- [ ] Dropdown filters CPT codes by credentials
- [ ] Server validation blocks restricted codes
- [ ] Error messages are clear and helpful
- [ ] No console errors or TypeScript warnings
- [ ] Performance acceptable (< 500ms page load)

---

## 🔧 Troubleshooting

### Issue: Migration fails

**Error:** `relation "procedure_scopes" already exists`

**Solution:** Migration already applied. Skip or modify migration to be idempotent.

---

### Issue: No CPT codes in dropdown

**Cause 1:** User credentials not set

**Solution:**
```sql
-- Check user credentials
SELECT id, email, credentials FROM users WHERE email = 'user@example.com';

-- Update if null
UPDATE users SET credentials = 'RN' WHERE email = 'user@example.com';
```

**Cause 2:** `procedure_scopes` table empty

**Solution:**
```sql
-- Check table
SELECT COUNT(*) FROM procedure_scopes;

-- Re-run seed portion of migration if needed
```

---

### Issue: All codes blocked for all users

**Cause:** `procedure_scopes` table not found or migration not applied

**Solution:** Deploy migration 00018 and verify table exists.

---

### Issue: RN can still save restricted codes

**Cause:** Server validation not working

**Solution:**
1. Check `app/actions/billing.ts` has validation code
2. Verify `validateBillingCodes()` is imported and called
3. Check credentials are fetched before validation
4. Review server logs for errors

---

## 📝 Validation Rules

| Credential | Sharp Debridement (11042-11047) | Selective Debridement (97597-97598) | NPWT (97605-97608) |
|------------|----------------------------------|-------------------------------------|---------------------|
| MD         | ✅ Allowed                       | ✅ Allowed                          | ✅ Allowed          |
| DO         | ✅ Allowed                       | ✅ Allowed                          | ✅ Allowed          |
| PA         | ✅ Allowed                       | ✅ Allowed                          | ✅ Allowed          |
| NP         | ✅ Allowed                       | ✅ Allowed                          | ✅ Allowed          |
| RN         | ❌ Blocked                       | ✅ Allowed                          | ✅ Allowed          |
| LVN        | ❌ Blocked                       | ✅ Allowed                          | ✅ Allowed          |
| CNA        | ❌ Blocked                       | ❌ Blocked                          | ❌ Blocked          |
| Admin      | ❌ Blocked                       | ❌ Blocked                          | ❌ Blocked          |

---

## 🎯 Success Criteria

Phase 9.3.1 is complete when:

✅ Migration deployed successfully  
✅ UI integrated into visit workflow  
✅ RN users cannot document CPT 11042-11047  
✅ MD users can document all procedures  
✅ Server validation prevents API bypass  
✅ Error messages are clear  
✅ No console errors  
✅ Performance is acceptable  

---

## 📚 Reference Files

- **Integration Guide:** `docs/PROCEDURE_RESTRICTIONS_INTEGRATION.md`
- **Status Tracker:** `docs/PHASE_9.3.1_STATUS.md`
- **Progress Report:** `docs/PHASE_9.3.1_PROGRESS_REPORT.md`
- **Migration:** `supabase/migrations/00018_add_procedure_scopes.sql`
- **Utilities:** `lib/procedures.ts`
- **UI Component:** `components/billing/billing-form-with-credentials.tsx`
- **Server Wrapper:** `components/billing/billing-form-server-wrapper.tsx`
- **Server Actions:** `app/actions/billing.ts`

---

## 🆘 Support

For issues or questions:

1. Check **troubleshooting** section above
2. Review `PROCEDURE_RESTRICTIONS_INTEGRATION.md` for detailed docs
3. Check Supabase logs for database errors
4. Check browser console for client errors
5. Verify credentials in users table

---

**Last Updated:** November 19, 2025  
**Status:** Ready for Integration  
**Estimated Time:** 1 hour total
