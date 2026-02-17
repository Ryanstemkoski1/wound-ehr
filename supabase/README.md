# Supabase Schema Management

This directory contains the consolidated SQL schema for the Wound EHR database.

## Schema File

**`migrations/00001_complete_schema.sql`** — Complete database schema including all 25 tables, indexes, RLS policies, functions, triggers, storage buckets, and seed data.

## Applying the Schema

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/00001_complete_schema.sql`
4. Paste and click **Run**

### Option 2: Via Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## Creating New Migrations

When modifying the schema:

1. Create a new file: `supabase/migrations/00002_description.sql`
2. Write your SQL changes (ALTER TABLE, CREATE INDEX, etc.)
3. Apply via Supabase Dashboard SQL Editor or `db push` command

## Current Schema

- **25 tables** with Row Level Security
- **RLS enabled** on all tables (user_roles uses RPC functions instead)
- **Comprehensive indexes** on all foreign keys and frequently queried columns
- **Triggers** for automatic `updated_at` timestamps and auth user sync
- **Storage bucket**: `wound-photos` for wound photo uploads
- **Procedure scopes** seed data for credential-based restrictions

## Generating TypeScript Types

```bash
npm run db:types
```

This creates `lib/database.types.ts` with full TypeScript definitions.

## Seeding the Database

The `seed.ts` script populates the database with realistic test data for development and demos.

### Prerequisites

**IMPORTANT**: Before running the seed script, you MUST:

1. **Apply the schema** (using one of the methods above)
2. **Sign up** at least one user via the app (http://localhost:3000/signup)
   - The seed script uses the first user from `auth.users`
   - Without this, the script will exit with an error

### Running the Seed Script

```bash
# Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local
npm run seed
```

### What Gets Created

The seed script generates:

- **3-5 facilities** - Medical centers with realistic names and addresses
- **50-100 patients** - Unique MRNs per facility, realistic demographics
  - First/last names, DOB (ages 18-95)
  - Contact information (phone, email, address)
  - Insurance (90% primary, 30% secondary)
  - Emergency contacts
  - Allergies (30% none, 1-3 allergies for others)
  - Medical history (20% none, 1-4 conditions for others)
- **~65-150 wounds** - 65% of patients have 1-3 wounds each
  - Types: pressure injury, diabetic, surgical, venous, arterial, traumatic
  - Locations: sacrum, heels, feet, legs, etc.
  - Status: 75% active, 25% healed
- **~150-300 visits** - 1-4 visits per patient with wounds
  - Visit types: in-person (66%), telemed (33%)
  - Status: 66% complete, 33% incomplete
  - Realistic dates (within last 90 days) and times (8am-5pm)
  - Follow-up plans (~50% have follow-up)
- **~120-240 assessments** - 80% of wounds get assessed
  - Realistic measurements (length, width, depth, area)
  - Tissue percentages (epithelial, granulation, slough)
  - Exudate, odor, periwound condition
  - Pain levels (0-10)
  - Infection signs (0-3 signs)

### Idempotent Design

The seed script is **safe to run multiple times**:

- Checks for existing data before creating
- Skips creation if facilities/patients already exist
- Continues to add wounds/visits/assessments to existing patients

### Sample Data

Uses realistic data sourced from common US demographics:

- 80 first names, 80 last names
- 8 Illinois cities with ZIP codes
- 12 insurance providers
- 14 common allergies
- 17 medical conditions

### Environment Variables Required

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Found in Supabase Dashboard → Settings → API
```

**Note**: The seed script uses the **service role key** to bypass RLS policies during seeding.
