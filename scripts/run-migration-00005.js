/**
 * Run migration 00005: Setup default tenant
 * This script creates a default tenant and links all facilities to it
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting migration 00005: Setup default tenant\n');

  try {
    // Step 1: Create default tenant
    console.log('📝 Step 1: Creating default tenant...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Default Clinic',
        subdomain: 'default',
        is_active: true
      })
      .select()
      .single();

    if (tenantError) {
      if (tenantError.code === '23505') {
        // Unique constraint violation - tenant already exists
        console.log('⚠️  Default tenant already exists, fetching it...');
        const { data: existingTenant, error: fetchError } = await supabase
          .from('tenants')
          .select()
          .eq('subdomain', 'default')
          .single();

        if (fetchError) {
          throw fetchError;
        }
        console.log(`✅ Using existing tenant: ${existingTenant.name} (ID: ${existingTenant.id})`);
        
        // Step 2: Update facilities
        await updateFacilities(existingTenant.id);
      } else {
        throw tenantError;
      }
    } else {
      console.log(`✅ Created tenant: ${tenant.name} (ID: ${tenant.id})\n`);
      
      // Step 2: Update facilities
      await updateFacilities(tenant.id);
    }

    // Step 3: Verify
    console.log('\n🔍 Step 3: Verifying setup...');
    const { data: facilities, error: verifyError } = await supabase
      .from('facilities')
      .select(`
        id,
        name,
        tenant_id,
        tenants (
          name
        )
      `);

    if (verifyError) {
      throw verifyError;
    }

    console.log('\n📊 Facilities Status:');
    console.table(facilities.map(f => ({
      'Facility Name': f.name,
      'Tenant': f.tenants?.name || 'No tenant',
      'Has Tenant ID': f.tenant_id ? '✅' : '❌'
    })));

    const unlinked = facilities.filter(f => !f.tenant_id);
    if (unlinked.length > 0) {
      console.log(`\n⚠️  Warning: ${unlinked.length} facilities still unlinked`);
    } else {
      console.log('\n✅ All facilities successfully linked to default tenant!');
    }

    console.log('\n✨ Migration complete! You can now refresh http://localhost:3000/dashboard/patients\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function updateFacilities(tenantId) {
  console.log('\n📝 Step 2: Linking facilities to default tenant...');
  
  const { data, error } = await supabase
    .from('facilities')
    .update({ tenant_id: tenantId })
    .is('tenant_id', null)
    .select();

  if (error) {
    throw error;
  }

  console.log(`✅ Updated ${data?.length || 0} facilities`);
}

// Run the migration
runMigration();
