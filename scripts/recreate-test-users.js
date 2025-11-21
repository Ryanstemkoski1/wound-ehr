// Clean up and recreate Phase 9 test users
// Run with: node scripts/recreate-test-users.js

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function recreateTestUsers() {
  console.log('🧹 Cleaning up existing test users...\n');

  const testEmails = [
    'tenant-admin@woundehr-test.com',
    'facility-admin@woundehr-test.com',
    'clinician@woundehr-test.com',
    'readonly@woundehr-test.com'
  ];

  // Delete existing test users
  const { data: allUsers } = await supabase.auth.admin.listUsers();
  for (const email of testEmails) {
    const existingUser = allUsers?.users?.find(u => u.email === email);
    if (existingUser) {
      console.log(`Deleting ${email}...`);
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log(`  ✓ Deleted\n`);
    }
  }

  console.log('🚀 Creating fresh Phase 9 test users...\n');

  const testUsers = [
    {
      email: 'tenant-admin@woundehr-test.com',
      password: 'WoundEHR2025!Admin',
      name: 'Tenant Admin Test',
      role: 'tenant_admin',
      credentials: 'Admin',
      description: 'Full system access, can manage all facilities'
    },
    {
      email: 'facility-admin@woundehr-test.com',
      password: 'WoundEHR2025!FacAdmin',
      name: 'Facility Admin Test',
      role: 'facility_admin',
      credentials: 'Admin',
      description: 'Can manage assigned facilities, users, patients'
    },
    {
      email: 'clinician@woundehr-test.com',
      password: 'WoundEHR2025!User',
      name: 'Dr. Sarah Clinician',
      role: 'user',
      credentials: 'MD',
      description: 'Medical Doctor - Can perform all procedures including sharp debridement'
    },
    {
      email: 'readonly@woundehr-test.com',
      password: 'WoundEHR2025!ReadOnly',
      name: 'John Observer',
      role: 'user',
      credentials: 'Admin',
      description: 'Administrative user - Can view but limited procedure access'
    }
  ];

  // Get or create test facility
  let testFacilityId;
  const { data: existingFacilities } = await supabase
    .from('facilities')
    .select('id, name')
    .limit(1);

  if (existingFacilities && existingFacilities.length > 0) {
    testFacilityId = existingFacilities[0].id;
    console.log(`✓ Using facility: ${existingFacilities[0].name}\n`);
  }

  // Get default tenant (first one available)
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .limit(1);
  
  const defaultTenant = tenants?.[0];

  if (!defaultTenant) {
    console.error('❌ Default tenant not found! Run migration 00003 first.');
    return;
  }

  console.log(`✓ Using tenant: ${defaultTenant.name}\n`);

  // Create each test user
  for (const user of testUsers) {
    console.log(`Creating ${user.role}: ${user.email}`);
    
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name
      }
    });

    if (authError) {
      console.error(`  ❌ Auth error:`, authError.message);
      continue;
    }

    console.log(`  ✓ Auth user: ${authUser.user.id}`);

    // Wait a moment for trigger to create user record
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update user record with credentials (trigger creates it automatically)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: user.name,
        credentials: user.credentials
      })
      .eq('id', authUser.user.id);

    if (updateError) {
      console.error(`  ❌ User update error:`, updateError.message);
      continue;
    }

    console.log(`  ✓ User record updated`);

    // Create user_roles record
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        tenant_id: defaultTenant.id,
        role: user.role,
        facility_id: user.role !== 'tenant_admin' ? testFacilityId : null
      });

    if (roleError) {
      console.error(`  ❌ Role error:`, roleError.message);
      continue;
    }

    console.log(`  ✓ Role: ${user.role}`);

    // Associate with facility if not tenant admin
    if (user.role !== 'tenant_admin' && testFacilityId) {
      const { error: facilityError } = await supabase
        .from('user_facilities')
        .insert({
          user_id: authUser.user.id,
          facility_id: testFacilityId
        });

      if (facilityError) {
        console.error(`  ❌ Facility association error:`, facilityError.message);
      } else {
        console.log(`  ✓ Facility assigned`);
      }
    }

    console.log(`  📝 ${user.description}\n`);
  }

  // Verification
  console.log('\n' + '='.repeat(80) + '\n');
  console.log('📊 TEST USER CREDENTIALS\n');
  console.log('┌─────────────────────────────────────────┬──────────────────────┬─────────────────────┐');
  console.log('│ Email                                   │ Role                 │ Password            │');
  console.log('├─────────────────────────────────────────┼──────────────────────┼─────────────────────┤');
  
  for (const user of testUsers) {
    const emailPadded = user.email.padEnd(39);
    const rolePadded = user.role.padEnd(20);
    const passwordPadded = user.password.padEnd(19);
    console.log(`│ ${emailPadded} │ ${rolePadded} │ ${passwordPadded} │`);
  }
  
  console.log('└─────────────────────────────────────────┴──────────────────────┴─────────────────────┘\n');

  console.log('✅ All test users created successfully!\n');
  console.log('🔗 Login URL: http://localhost:3000/login\n');
  console.log('='.repeat(80) + '\n');
}

recreateTestUsers().catch(console.error);
