// Sync user_facilities from user_roles
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUserFacilities() {
  try {
    console.log("🔄 Syncing user_facilities from user_roles...\n");

    // Get all user_roles with facility_id
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, facility_id")
      .not("facility_id", "is", null);

    if (rolesError) throw rolesError;

    console.log(`Found ${roles.length} users with facility assignments in user_roles\n`);

    let synced = 0;
    let skipped = 0;

    for (const role of roles) {
      // Check if user_facilities entry exists
      const { data: existing } = await supabase
        .from("user_facilities")
        .select("id")
        .eq("user_id", role.user_id)
        .eq("facility_id", role.facility_id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert into user_facilities
      const { error: insertError } = await supabase
        .from("user_facilities")
        .insert({
          user_id: role.user_id,
          facility_id: role.facility_id,
        });

      if (insertError) {
        console.error(`❌ Failed to sync user ${role.user_id}:`, insertError);
      } else {
        // Get user email for logging
        const { data: authData } = await supabase.auth.admin.listUsers();
        const user = authData?.users.find((u) => u.id === role.user_id);
        console.log(`✅ Synced: ${user?.email || role.user_id}`);
        synced++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Synced: ${synced}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    console.log(`   Total: ${roles.length}\n`);

    console.log("✅ Sync complete!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

syncUserFacilities();
