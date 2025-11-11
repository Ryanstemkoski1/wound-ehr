# Scripts Directory

Utility scripts for managing the Wound EHR application.

## Core Scripts (Root Level)

### Type Generation
- `generate-types.js` - Generate TypeScript types from Supabase database schema
  ```bash
  npm run db:types
  ```

### Database Migrations
- `run-migration.ts` - Generic migration runner
- `run-migration-00005.js` - Setup default tenant (one-time)
- `run-migration-00006.js` - Update visit status enum (one-time)
- `create-default-tenant.js` - Create initial tenant setup

## Debug Scripts (`debug/`)

Diagnostic and troubleshooting utilities:

- `debug-patients.js` - Debug patient data and relationships
- `debug-specific-patient.js` - Debug a specific patient by ID
- `diagnose-login.js` - Diagnose login and authentication issues

**Usage:**
```bash
node scripts/debug/diagnose-login.js user@example.com
node scripts/debug/debug-specific-patient.js <patient-id>
```

## Admin Scripts (`admin/`)

Administrative utilities for user and data management:

### User Management
- `assign-role.js` - Assign role to a user
- `update-user-role.ts` - Update user role
- `delete-user.js` - Remove user from system (includes auth deletion)
- `confirm-user.js` - Manually confirm user email

### Data Management
- `check-duplicate-wounds.ts` - Check for duplicate wound records
- `check-user-facilities.ts` - Verify user-facility associations
- `sync-user-facilities.ts` - Synchronize user-facility relationships
- `fix-user-roles.ts` - Fix role assignment issues
- `cleanup-invites.ts` - Clean up expired or invalid invitations

**Usage:**
```bash
node scripts/admin/delete-user.js user@example.com
node scripts/admin/assign-role.js user@example.com tenant_admin
```

---

## Script Organization

### Root Level
- Core utilities used regularly (type generation, migrations)
- Scripts that are part of the build/dev workflow

### `debug/`
- Temporary or one-off diagnostic scripts
- Troubleshooting utilities
- Can be removed or archived after issues are resolved

### `admin/`
- Administrative tasks
- User management
- Data verification and cleanup
- Should be used carefully with proper credentials

---

## Best Practices

1. **Always backup data** before running admin scripts that modify the database
2. **Use service role key** for admin scripts (stored in `.env.local`)
3. **Test scripts** on non-production data first
4. **Document usage** when creating new scripts

---

## Environment Variables Required

Most scripts require these environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Service role key is required for admin operations.
