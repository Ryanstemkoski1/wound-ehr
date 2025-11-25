// Fix user roles by creating default tenant and assigning roles
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserRoles() {
  try {
    console.log("🚀 Fixing user roles...\n");

    // Step 1: Create default tenant
    console.log("1️⃣  Creating default tenant...");
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .limit(1)
      .single();

    let tenantId: string;

    if (existingTenant) {
      tenantId = existingTenant.id;
      console.log(`   ✅ Using existing tenant: ${tenantId}`);
    } else {
      const { data: newTenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: "Default Organization",
          subdomain: "default",
          is_active: true,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;
      tenantId = newTenant.id;
      console.log(`   ✅ Created default tenant: ${tenantId}`);
    }

    // Step 2: Create or get default facility
    console.log("\n2️⃣  Creating default facility...");
    const { data: existingFacility } = await supabase
      .from("facilities")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();

    let facilityId: string;

    if (existingFacility) {
      facilityId = existingFacility.id;
      console.log(`   ✅ Using existing facility: ${facilityId}`);
    } else {
      const { data: newFacility, error: facilityError } = await supabase
        .from("facilities")
        .insert({
          name: "Default Facility",
          address: "123 Main St",
          phone: "555-0100",
          tenant_id: tenantId,
          is_active: true,
        })
        .select()
        .single();

      if (facilityError) throw facilityError;
      facilityId = newFacility.id;
      console.log(`   ✅ Created default facility: ${facilityId}`);
    }

    // Step 3: Get all users
    console.log("\n3️⃣  Fetching all users...");
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;
    console.log(`   ✅ Found ${authData.users.length} users`);

    // Step 4: Assign roles to users without roles
    console.log("\n4️⃣  Assigning roles to users...");
    for (const user of authData.users) {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (existingRole) {
        console.log(
          `   ⏭️  ${user.email} already has role: ${existingRole.role}`
        );
        continue;
      }

      // Assign default 'user' role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: "user",
        facility_id: facilityId,
      });

      if (roleError) {
        console.error(
          `   ❌ Failed to assign role to ${user.email}:`,
          roleError
        );
      } else {
        console.log(`   ✅ Assigned 'user' role to ${user.email}`);
      }
    }

    console.log("\n✅ User roles fixed successfully!");
    console.log("\n📋 Summary:");

    // Show final role assignments
    for (const user of authData.users) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      console.log(`   ${user.email}: ${role ? role.role : "NO ROLE"}`);
    }

    console.log(
      "\n💡 To create admin users, use the invite system at /dashboard/admin/invites"
    );
  } catch (error) {
    console.error("\n❌ Error fixing user roles:", error);
    process.exit(1);
  }
}

fixUserRoles();
