# Supabase Schema Management

This directory contains the SQL migration files for the Wound EHR database schema.

## Without Local Supabase (Recommended for Remote-Only Development)

### Option 1: Apply via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/00001_initial_schema.sql`
4. Paste and click **Run**

### Option 2: Apply via Supabase CLI (No Docker Required)

```bash
# One-time setup: Link to your remote project
npx supabase login
npx supabase link --project-ref your-project-ref

# Apply migration directly to remote
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Option 3: Manual Table Creation

Use the Supabase Dashboard's **Table Editor** to create tables visually, then run the RLS policies and triggers from the SQL Editor.

## Creating New Migrations

When you need to modify the schema:

1. Create a new file: `supabase/migrations/00002_description.sql`
2. Write your SQL changes (ALTER TABLE, CREATE INDEX, etc.)
3. Apply via Supabase Dashboard SQL Editor or `db push` command

## Schema Version Control

- **Keep migrations in git** - this is your schema source of truth
- **Number migrations** - Use incremental numbering (00001, 00002, etc.)
- **One-way only** - Migrations should only move forward, don't edit existing ones
- **Document changes** - Add comments explaining what each migration does

## Current Schema

- **10 tables**: users, facilities, user_facilities, patients, wounds, visits, assessments, photos, treatments, billings
- **RLS enabled** on all tables with comprehensive policies
- **Indexes** on all foreign keys and frequently queried columns
- **Triggers** for automatic `updated_at` timestamp updates
- **Storage bucket**: `wound-photos` for wound photo uploads

## Generating TypeScript Types

After applying migrations, generate types:

```bash
npm run db:types
```

This creates `lib/database.types.ts` with full TypeScript definitions for your database.

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
