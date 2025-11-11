// Check user facilities assignment
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserFacilities() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npx tsx scripts/check-user-facilities.ts <email>");
    process.exit(1);
  }

  try {
    // Get user by email
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const user = authData.users.find((u) => u.email === email);
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\n👤 User: ${email}`);
    console.log(`   ID: ${user.id}\n`);

    // Check user_roles
    const { data: role } = await supabase
      .from("user_roles")
      .select("role, tenant_id, facility_id")
      .eq("user_id", user.id)
      .single();

    if (!role) {
      console.log("❌ No role assigned!");
      console.log("   Run: npx tsx scripts/fix-user-roles.ts\n");
      return;
    }

    console.log(`📋 Role Information:`);
    console.log(`   Role: ${role.role}`);
    console.log(`   Tenant ID: ${role.tenant_id}`);
    console.log(`   Facility ID (in role): ${role.facility_id || "null"}\n`);

    // Check user_facilities
    const { data: userFacilities } = await supabase
      .from("user_facilities")
      .select("facility_id, facility:facilities(id, name)")
      .eq("user_id", user.id);

    console.log(`🏢 Facility Assignments (user_facilities table):`);
    if (!userFacilities || userFacilities.length === 0) {
      console.log("   ❌ NO FACILITIES ASSIGNED!");
      console.log("\n💡 Solution:");
      console.log("   1. User needs to be added to user_facilities table");
      console.log("   2. Run this to assign facility:");
      console.log(`   
      INSERT INTO user_facilities (user_id, facility_id)
      VALUES ('${user.id}', '<facility_id>');
      `);
    } else {
      userFacilities.forEach((uf) => {
        const facility = Array.isArray(uf.facility)
          ? uf.facility[0]
          : uf.facility;
        console.log(`   ✅ ${facility.name} (${facility.id})`);
      });
    }

    // Check available facilities
    console.log(`\n🏥 Available Facilities in Tenant:`);
    const { data: facilities } = await supabase
      .from("facilities")
      .select("id, name")
      .eq("tenant_id", role.tenant_id)
      .eq("is_active", true);

    if (facilities) {
      facilities.forEach((f) => {
        console.log(`   - ${f.name} (${f.id})`);
      });
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUserFacilities();
