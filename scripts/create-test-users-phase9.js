// Script to create Phase 9 test users
// Run with: node scripts/create-test-users-phase9.js

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestUsers() {
  console.log("🚀 Creating Phase 9 test users...\n");

  const testUsers = [
    {
      email: "tenant-admin@woundehr-test.com",
      password: "WoundEHR2025!Admin",
      fullName: "Tenant Admin Test",
      role: "tenant_admin",
      description: "Full system access, can manage all facilities",
    },
    {
      email: "facility-admin@woundehr-test.com",
      password: "WoundEHR2025!FacAdmin",
      fullName: "Facility Admin Test",
      role: "facility_admin",
      description: "Can manage assigned facilities, users, patients",
    },
    {
      email: "clinician@woundehr-test.com",
      password: "WoundEHR2025!User",
      fullName: "Clinician Test User",
      role: "user",
      description: "Can view/edit patients, create visits and assessments",
    },
    {
      email: "readonly@woundehr-test.com",
      password: "WoundEHR2025!ReadOnly",
      fullName: "Read Only Test User",
      role: "user",
      description: "Can only view patients and reports",
    },
  ];

  // Get or create test facility
  let testFacilityId;
  const { data: existingFacilities } = await supabase
    .from("facilities")
    .select("id")
    .limit(1);

  if (existingFacilities && existingFacilities.length > 0) {
    testFacilityId = existingFacilities[0].id;
    console.log(`✓ Using existing facility: ${testFacilityId}\n`);
  } else {
    const { data: newFacility, error } = await supabase
      .from("facilities")
      .insert({
        name: "Test Wound Care Clinic",
        address: "123 Medical Plaza Dr",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        phone: "(310) 555-0100",
        email: "test@woundcare-clinic.com",
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating test facility:", error);
      return;
    }
    testFacilityId = newFacility.id;
    console.log(`✓ Created test facility: ${testFacilityId}\n`);
  }

  // Create each test user
  for (const user of testUsers) {
    console.log(`Creating ${user.role}: ${user.email}`);

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some((u) => u.email === user.email);

    if (userExists) {
      console.log(`  ⚠ User already exists, skipping...\n`);
      continue;
    }

    // Create auth user
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
        },
      });

    if (authError) {
      console.error(`  ❌ Error creating auth user:`, authError.message);
      continue;
    }

    console.log(`  ✓ Auth user created: ${authUser.user.id}`);

    // Create users table record
    const { error: userError } = await supabase.from("users").insert({
      id: authUser.user.id,
      email: user.email,
      name: user.fullName,
    });

    if (userError) {
      console.error(`  ❌ Error creating user record:`, userError.message);
      continue;
    }

    console.log(`  ✓ User record created`);

    // Get default tenant
    const { data: defaultTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("name", "Default Tenant")
      .single();

    if (!defaultTenant) {
      console.error(`  ❌ Default tenant not found`);
      continue;
    }

    // Create user_roles record
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: authUser.user.id,
      tenant_id: defaultTenant.id,
      role: user.role,
      facility_id: user.role !== "tenant_admin" ? testFacilityId : null,
    });

    if (roleError) {
      console.error(`  ❌ Error creating role:`, roleError.message);
      continue;
    }

    console.log(`  ✓ Role assigned: ${user.role}`);

    // Associate with facility
    const { error: facilityError } = await supabase
      .from("user_facilities")
      .insert({
        user_id: authUser.user.id,
        facility_id: testFacilityId,
      });

    if (facilityError) {
      console.error(`  ❌ Error associating facility:`, facilityError.message);
      continue;
    }

    console.log(`  ✓ Associated with facility`);
    console.log(`  📝 ${user.description}\n`);
  }

  // Verify all users
  console.log("📊 Verification - Test Users Created:\n");
  console.log(
    "┌─────────────────────────────────────────┬──────────────────────┬─────────────────────┐"
  );
  console.log(
    "│ Email                                   │ Role                 │ Password            │"
  );
  console.log(
    "├─────────────────────────────────────────┼──────────────────────┼─────────────────────┤"
  );

  for (const user of testUsers) {
    const emailPadded = user.email.padEnd(39);
    const rolePadded = user.role.padEnd(20);
    const passwordPadded = user.password.padEnd(19);
    console.log(`│ ${emailPadded} │ ${rolePadded} │ ${passwordPadded} │`);
  }

  console.log(
    "└─────────────────────────────────────────┴──────────────────────┴─────────────────────┘\n"
  );

  console.log("✅ Test user creation complete!\n");
  console.log("🔗 Login URL: http://localhost:3000/login\n");
}

createTestUsers().catch(console.error);
