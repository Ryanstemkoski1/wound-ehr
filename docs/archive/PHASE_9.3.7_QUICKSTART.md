# Phase 9.3.7: Signature Audit Logs - Quick Start

## Overview
Admin-only compliance reporting interface for viewing comprehensive audit trail of all electronic signatures in the system.

## Features Implemented

### 1. Database Layer (`supabase/migrations/00021_signature_audit_logs.sql`)
- **RPC Function**: `get_signature_audit_logs()` - Comprehensive query with joins across signatures, users, patients, visits, facilities
- **RPC Function**: `get_signature_audit_stats()` - Summary statistics (counts by type, method, unique signers)
- **Filtering**: Tenant, facility, user, signature type, date range
- **Security**: SECURITY DEFINER for admin access, RLS enforcement via calling code

### 2. Server Actions (`app/actions/signature-audit.ts`)
- **getSignatureAuditLogs()** - Fetch audit logs with filtering and pagination
- **getSignatureAuditStats()** - Fetch summary statistics
- **exportSignatureAuditLogs()** - Export logs as CSV file
- **Admin Guard**: Requires `tenant_admin` or `facility_admin` role

### 3. Admin UI (`app/dashboard/admin/signatures/page.tsx`)
- **Stats Dashboard**: 4 cards showing total signatures, visits signed, unique signers, method breakdown
- **Advanced Filters**: Signature type, date range, search by patient/MRN/signer
- **Audit Log Table**: Comprehensive timeline with all signature details
- **CSV Export**: Download complete audit trail
- **Pagination**: Handle large datasets efficiently

## Migration Steps

### 1. Apply Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/00021_signature_audit_logs.sql`
3. Copy entire contents
4. Paste into SQL Editor and run
5. Verify: Check for success message

**Option B: Supabase CLI**
```bash
supabase migration up
```

### 2. Test Migration
```bash
# Set environment variables
$env:NEXT_PUBLIC_SUPABASE_URL="https://jxmxhnfyujqeukltsxti.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run test script
node scripts\run-migration-00021.js
```

Expected output:
```
✅ Success: X logs returned
✅ Success: Stats retrieved
   Total signatures: X
   Consent: X
   Patient: X
   Provider: X
   Unique signers: X
```

### 3. Access Admin UI

1. Login as admin user (tenant_admin or facility_admin role)
2. Navigate to: **Dashboard → Admin → Signature Audit Logs**
3. URL: `http://localhost:3000/dashboard/admin/signatures`

## UI Features

### Stats Cards
- **Total Signatures**: Count by type (consent, patient, provider)
- **Visits Signed**: Number of completed visit documents
- **Unique Signers**: Active clinical staff count
- **Signature Methods**: Breakdown by draw, type, upload

### Filters
- **Signature Type**: Filter by consent, patient, or provider signatures
- **Date Range**: Start and end date pickers
- **Search**: Real-time search by patient name, MRN, signer name, facility
- **Clear/Refresh**: Reset filters or reload data

### Audit Log Table Columns
1. **Date/Time**: When signature was created (formatted)
2. **Type**: Badge showing signature type
3. **Patient**: Name + MRN
4. **Facility**: Facility name
5. **Signer**: Name + credentials
6. **Method**: Draw, type, or upload
7. **Visit**: Visit date and type (if applicable)
8. **IP Address**: For audit trail

### Export
- **CSV Export**: Downloads all filtered logs as CSV
- Filename format: `signature-audit-logs-2025-11-23-143022.csv`
- Includes all columns with proper escaping

## RPC Function Details

### get_signature_audit_logs()
```sql
Parameters:
- p_tenant_id UUID (optional)
- p_facility_id UUID (optional)
- p_user_id UUID (optional, created_by filter)
- p_signature_type TEXT (optional: 'consent', 'patient', 'provider')
- p_start_date TIMESTAMPTZ (optional)
- p_end_date TIMESTAMPTZ (optional)
- p_limit INTEGER (default 100)
- p_offset INTEGER (default 0)

Returns: TABLE with 20 columns including signature details, patient info, facility data, signer info
```

### get_signature_audit_stats()
```sql
Parameters:
- p_tenant_id UUID (optional)
- p_facility_id UUID (optional)
- p_start_date TIMESTAMPTZ (optional)
- p_end_date TIMESTAMPTZ (optional)

Returns: TABLE with summary counts (9 columns)
```

## Security Notes

- Admin-only access enforced via `requireAdmin()` in server actions
- RPC functions use SECURITY DEFINER but calling code checks RLS
- Tenant admins see all facilities in their tenant
- Facility admins see only their facilities
- Regular users cannot access this page (redirected)

## Testing Checklist

- [ ] Migration applied successfully
- [ ] RPC functions return data
- [ ] Admin can access `/dashboard/admin/signatures`
- [ ] Non-admin users are blocked
- [ ] Stats cards display correct counts
- [ ] Filters work (type, date, search)
- [ ] Table displays signature data correctly
- [ ] Pagination works
- [ ] CSV export downloads successfully
- [ ] Data matches database records

## Next Steps

After verification:
1. Update PROJECT_STATUS.md (Phase 9.3.7 complete)
2. Update SYSTEM_DESIGN.md (v4.7, 100% Phase 9.3 complete)
3. Create completion documentation
4. Git commit and push
5. Celebrate Phase 9.3 completion! 🎉

## Troubleshooting

**RPC function not found:**
- Migration not applied yet
- Run SQL via Supabase dashboard

**Access denied:**
- User doesn't have admin role
- Check `user_roles` table
- Verify `getUserRole()` returns 'tenant_admin' or 'facility_admin'

**No data showing:**
- No signatures in database yet
- Create test signatures via visit workflow
- Check RLS policies on signatures table

**CSV export empty:**
- Filters too restrictive
- Clear filters and try again
- Check browser console for errors
