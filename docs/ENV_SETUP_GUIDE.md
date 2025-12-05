# Environment Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your `wound-ehr` project
3. Click **Settings** (gear icon in left sidebar)
4. Click **API** under Project Settings
5. You'll see these values:

   - **Project URL** - Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key - Long string starting with `eyJ...`
   - **service_role** key - Another long string (⚠️ Keep this secret!)

## Step 2: Create .env.local File

In the project root (`g:\Ryan\wound-ehr`), create a file named `.env.local`:

```bash
# Copy the example file
Copy-Item .env.example .env.local
```

Or create manually with this content:

```dotenv
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-ACTUAL-KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-SERVICE-KEY

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Optional - skip for now)
RESEND_API_KEY=
FROM_EMAIL=
```

**⚠️ IMPORTANT:**
- Replace `YOUR-PROJECT-ID` with your actual Supabase project ID
- Replace `YOUR-ACTUAL-KEY` with your anon key from Supabase dashboard
- Replace `YOUR-SERVICE-KEY` with your service_role key
- **Never commit this file to git** (it's already in `.gitignore`)

## Step 3: Verify Environment File

```powershell
# Check file exists
Test-Path .env.local

# Should output: True
```

## Step 4: Run Migration Script

Now you can run the automated migration:

```powershell
node --loader tsx scripts/run-migration-00018.ts
```

Expected output:
```
🚀 Running migration 00018: Add procedure_scopes table
   Phase 9.3.1 - Credential-based procedure restrictions

📝 Migration file loaded successfully

⚡ Executing migration SQL...
✅ Migration executed successfully!

🔍 Verifying procedure_scopes table...
✅ Table exists with 17 rows

🧪 Testing helper functions...
   ✓ can_perform_procedure(RN, 11042): false ✅ CORRECT
   ✓ can_perform_procedure(MD, 11042): true ✅ CORRECT
   ✓ can_perform_procedure(RN, 97597): true ✅ CORRECT

✅ Migration 00018 completed successfully!
```

---

## Alternative: Manual Deployment (No .env.local needed)

If you prefer not to set up `.env.local`, use the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **SQL Editor** → **New Query**
3. Open `supabase/migrations/00018_add_procedure_scopes.sql` in VS Code
4. Copy the ENTIRE file contents (all ~220 lines)
5. Paste into SQL Editor
6. Click **Run** (or Ctrl+Enter)
7. Wait for "Success" message

Then verify:
```sql
-- Check table created
SELECT COUNT(*) FROM procedure_scopes;
-- Should return: 17

-- Test RN restriction
SELECT can_perform_procedure(ARRAY['RN']::text[], '11042');
-- Should return: false

-- Test MD access
SELECT can_perform_procedure(ARRAY['MD']::text[], '11042');
-- Should return: true
```

---

## After Migration Deployed

Generate TypeScript types:

```powershell
npm run db:types
```

This updates `lib/database.types.ts` with the new `procedure_scopes` table.

---

## Troubleshooting

### Error: "Cannot find module 'dotenv'"
```powershell
npm install
```

### Error: "Missing Supabase credentials"
Double-check your `.env.local` file has correct values from Supabase dashboard.

### Error: "exec_sql function does not exist"
Use manual deployment method via Supabase Dashboard instead.
