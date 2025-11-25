// Script to create test users with different credentials
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const TEST_USERS = [
  {
    email: "pa.test@wound-ehr.com",
    password: "TestPassword123!",
    name: "Patricia Anderson",
    credentials: "PA",
    role: "user",
    facility: "Chicago Wound Care Clinic",
  },
  {
    email: "do.test@wound-ehr.com",
    password: "TestPassword123!",
    name: "David Osteopath",
    credentials: "DO",
    role: "user",
    facility: "Chicago Wound Care Clinic",
  },
  {
    email: "np.test@wound-ehr.com",
    password: "TestPassword123!",
    name: "Nancy Practitioner",
    credentials: "NP",
    role: "user",
    facility: "Chicago Wound Care Clinic",
  },
  {
    email: "lvn.test@wound-ehr.com",
    password: "TestPassword123!",
    name: "Linda Vocational",
    credentials: "LVN",
    role: "user",
    facility: "Chicago Wound Care Clinic",
  },
];

async function createTestUsers() {
  console.log("\n=== CREATING TEST USERS ===\n");

  // Get tenant ID and facility ID
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .single();

  if (!tenant) {
    console.error("❌ No tenant found");
    return;
  }

  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("name", "Chicago Wound Care Clinic")
    .single();

  if (!facility) {
    console.error("❌ Chicago Wound Care Clinic not found");
    return;
  }

  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`Facility: ${facility.name} (${facility.id})\n`);

  for (const testUser of TEST_USERS) {
    console.log(`Creating ${testUser.name} (${testUser.credentials})...`);

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(
      (u) => u.email === testUser.email
    );

    let userId;

    if (userExists) {
      console.log(
        `  ⚠️  User already exists in auth, using existing: ${userExists.id}`
      );
      userId = userExists.id;
    } else {
      // Create auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            name: testUser.name,
          },
        });

      if (authError) {
        console.error(`  ❌ Auth error: ${authError.message}`);
        continue;
      }

      userId = authData.user.id;
      console.log(`  ✅ Created auth user: ${userId}`);
    }

    // Check if user exists in public.users
    const { data: existingPublicUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingPublicUser) {
      // Create user record
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email: testUser.email,
        name: testUser.name,
        credentials: testUser.credentials,
      });

      if (userError) {
        console.error(`  ❌ User table error: ${userError.message}`);
        continue;
      }
      console.log(
        `  ✅ Created user record with ${testUser.credentials} credentials`
      );
    } else {
      // Update credentials
      await supabase
        .from("users")
        .update({ credentials: testUser.credentials, name: testUser.name })
        .eq("id", userId);
      console.log(`  ✅ Updated existing user record`);
    }

    // Check if user_role exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", tenant.id)
      .single();

    if (!existingRole) {
      // Create user role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        tenant_id: tenant.id,
        role: testUser.role,
        facility_id: facility.id,
      });

      if (roleError) {
        console.error(`  ❌ Role error: ${roleError.message}`);
        continue;
      }
      console.log(`  ✅ Created ${testUser.role} role`);
    } else {
      console.log(`  ✅ Role already exists`);
    }

    // Check if facility association exists
    const { data: existingFacility } = await supabase
      .from("user_facilities")
      .select("id")
      .eq("user_id", userId)
      .eq("facility_id", facility.id)
      .single();

    if (!existingFacility) {
      // Create facility association
      const { error: facilityError } = await supabase
        .from("user_facilities")
        .insert({
          user_id: userId,
          facility_id: facility.id,
        });

      if (facilityError) {
        console.error(
          `  ❌ Facility association error: ${facilityError.message}`
        );
        continue;
      }
      console.log(`  ✅ Associated with ${facility.name}`);
    } else {
      console.log(`  ✅ Facility association already exists`);
    }

    console.log(`  🎉 ${testUser.name} setup complete\n`);
  }

  console.log("=== TEST USER CREATION COMPLETE ===\n");
  console.log("Test user credentials:");
  TEST_USERS.forEach((u) => {
    console.log(`  ${u.email} / ${u.password} (${u.credentials})`);
  });
}

createTestUsers().catch(console.error);
