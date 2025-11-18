// Fix user-facility associations
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserFacilityAssociations() {
  console.log("🔧 Fixing user-facility associations...\n");

  // Get admin user
  const { data: admin } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", "ryan.stemkoski@abectech.com")
    .single();

  if (!admin) {
    console.error("❌ Admin user not found");
    return;
  }

  console.log(`✅ Admin user: ${admin.email} (${admin.id})\n`);

  // Check current associations
  const { data: currentAssociations } = await supabase
    .from("user_facilities")
    .select("*")
    .eq("user_id", admin.id);

  console.log(`📊 Current associations: ${currentAssociations?.length || 0}\n`);

  // Get all facilities
  const { data: facilities } = await supabase
    .from("facilities")
    .select("id, name, city, state");

  if (!facilities || facilities.length === 0) {
    console.error("❌ No facilities found in database");
    return;
  }

  console.log(`📍 Total facilities in database: ${facilities.length}\n`);

  // Delete all existing associations for this user
  await supabase.from("user_facilities").delete().eq("user_id", admin.id);
  console.log("🗑️  Cleared existing associations\n");

  // Create new associations
  console.log("➕ Creating new associations...\n");
  
  for (const facility of facilities) {
    const { error } = await supabase.from("user_facilities").insert({
      user_id: admin.id,
      facility_id: facility.id,
      is_default: false,
    });

    if (error) {
      console.error(`   ❌ Failed: ${facility.name}`, error.message);
    } else {
      console.log(`   ✅ ${facility.name} (${facility.city}, ${facility.state})`);
    }
  }

  // Verify
  const { data: newAssociations } = await supabase
    .from("user_facilities")
    .select("*")
    .eq("user_id", admin.id);

  console.log(`\n✅ Done! New associations: ${newAssociations?.length || 0}`);
  
  if (newAssociations && newAssociations.length > 0) {
    console.log("\n🎉 Admin user now has access to all facilities!");
    console.log("   Refresh the Admin → Facilities page to see them.");
  }
}

fixUserFacilityAssociations().catch(console.error);
