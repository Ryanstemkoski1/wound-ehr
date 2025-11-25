#!/usr/bin/env node

/**
 * Assign role to a user
 * Run with: node scripts/assign-role.js <email> <role> [facility-name]
 * Roles: tenant_admin, facility_admin, user
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const email = process.argv[2];
const role = process.argv[3];
const facilityName = process.argv[4];

if (!email || !role) {
  console.error("❌ Missing arguments");
  console.log(
    "Usage: node scripts/assign-role.js <email> <role> [facility-name]"
  );
  console.log("Roles: tenant_admin, facility_admin, user");
  console.log("\nExamples:");
  console.log("  node scripts/assign-role.js user@example.com tenant_admin");
  console.log(
    "  node scripts/assign-role.js user@example.com facility_admin 'Main Clinic'"
  );
  process.exit(1);
}

const validRoles = ["tenant_admin", "facility_admin", "user"];
if (!validRoles.includes(role)) {
  console.error(`❌ Invalid role: ${role}`);
  console.log("Valid roles:", validRoles.join(", "));
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function assignRole() {
  console.log("\n🔧 Assigning role...");
  console.log("   Email:", email);
  console.log("   Role:", role);
  if (facilityName) console.log("   Facility:", facilityName);

  // 1. Get user ID
  const { data: authUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Error fetching users:", listError.message);
    return;
  }

  const user = authUsers.users.find((u) => u.email === email);

  if (!user) {
    console.error("❌ User not found");
    return;
  }

  console.log("   User ID:", user.id);

  // 2. Get tenant (use default or first)
  const { data: tenants, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .limit(1)
    .single();

  if (tenantError || !tenants) {
    console.error("❌ No tenant found. Create one first:");
    console.log("   → Run: node scripts/create-default-tenant.js");
    return;
  }

  console.log("   Tenant:", tenants.name);

  // 3. Get facility if needed
  let facilityId = null;
  if ((role === "facility_admin" || role === "user") && facilityName) {
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("*")
      .eq("name", facilityName)
      .single();

    if (facilityError || !facility) {
      console.error(`❌ Facility '${facilityName}' not found`);
      console.log("   Available facilities:");
      const { data: allFacilities } = await supabase
        .from("facilities")
        .select("name");
      if (allFacilities) {
        allFacilities.forEach((f) => console.log(`      - ${f.name}`));
      }
      return;
    }

    facilityId = facility.id;
    console.log("   Facility ID:", facilityId);
  }

  // 4. Check if role already exists
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id)
    .eq("tenant_id", tenants.id)
    .single();

  if (existingRole) {
    console.log("\n⚠️  User already has a role. Updating...");

    const { error: updateError } = await supabase
      .from("user_roles")
      .update({
        role,
        facility_id: facilityId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRole.id);

    if (updateError) {
      console.error("❌ Error updating role:", updateError.message);
      return;
    }

    console.log("✅ Role updated successfully!");
  } else {
    // 5. Insert new role
    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: user.id,
      tenant_id: tenants.id,
      role,
      facility_id: facilityId,
    });

    if (insertError) {
      console.error("❌ Error assigning role:", insertError.message);
      return;
    }

    console.log("✅ Role assigned successfully!");
  }

  console.log("\n✨ User can now login at http://localhost:3000/login\n");
}

assignRole().catch(console.error);
