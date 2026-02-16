/**
 * Sync Auth Users to Database
 *
 * This script manually syncs auth.users to public.users table
 * when the trigger didn't fire (e.g., users created via admin API)
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUsers() {
  console.log("\n🔄 Syncing auth users to database...\n");

  try {
    // Get all auth users
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error fetching auth users:", authError.message);
      process.exit(1);
    }

    const authUsers = authData.users;
    console.log(`✅ Found ${authUsers.length} auth users\n`);

    // Get existing users in database
    const { data: dbUsers } = await supabase.from("users").select("id");

    const existingIds = new Set(dbUsers?.map((u) => u.id) || []);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const user of authUsers) {
      if (existingIds.has(user.id)) {
        console.log(`⏭️  ${user.email} - already synced`);
        skippedCount++;
        continue;
      }

      // Extract name from user metadata or email
      const firstName =
        user.user_metadata?.first_name || user.email?.split("@")[0] || "User";
      const lastName = user.user_metadata?.last_name || "";
      const credentials = user.user_metadata?.credentials || null;

      // Insert into users table
      const { error: insertError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        credentials: credentials,
      });

      if (insertError) {
        console.error(`❌ ${user.email} - Error:`, insertError.message);
      } else {
        console.log(`✅ ${user.email} - synced`);
        syncedCount++;
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Sync Complete!`);
    console.log(`   - Synced: ${syncedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users (already existed)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

syncUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
