// Check and add facilities if missing
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndAddFacilities() {
  console.log("🔍 Checking facilities...\n");

  // Get current user (admin)
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .eq("email", "ryan.stemkoski@abectech.com")
    .single();

  if (!users) {
    console.error("❌ Admin user not found");
    return;
  }

  console.log(`✅ Found admin: ${users.email}\n`);

  // Check existing facilities
  const { data: facilities } = await supabase.from("facilities").select("*");

  console.log(`📍 Current facilities: ${facilities?.length || 0}\n`);

  if (facilities && facilities.length > 0) {
    console.log("Existing facilities:");
    facilities.forEach((f) => console.log(`  - ${f.name} (${f.city}, ${f.state})`));
    console.log("\n❓ Do you want to add more facilities? (The seed script will add 3-5)");
    return;
  }

  // Add facilities if none exist
  console.log("📍 No facilities found. Adding sample facilities...\n");

  const facilityNames = [
    "Chicago Wound Care Clinic",
    "Springfield Medical Center",
    "Naperville Health Services",
    "Peoria Wound Treatment Center",
  ];

  const streets = ["Main Street", "Oak Avenue", "Elm Drive", "Maple Road"];
  const cities = [
    { name: "Chicago", state: "IL", zip: "60601" },
    { name: "Springfield", state: "IL", zip: "62701" },
    { name: "Naperville", state: "IL", zip: "60540" },
    { name: "Peoria", state: "IL", zip: "61602" },
  ];

  for (let i = 0; i < facilityNames.length; i++) {
    const city = cities[i];
    
    const { data: facility, error } = await supabase
      .from("facilities")
      .insert({
        name: facilityNames[i],
        address: `${100 + i * 100} ${streets[i]}`,
        city: city.name,
        state: city.state,
        zip: city.zip,
        phone: `(${312 + i}) 555-${1000 + i}`,
        email: `contact@${facilityNames[i].toLowerCase().replace(/\s+/g, "")}.com`,
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating ${facilityNames[i]}:`, error);
      continue;
    }

    // Associate with admin user
    await supabase.from("user_facilities").insert({
      user_id: users.id,
      facility_id: facility.id,
    });

    console.log(`  ✅ ${facility.name}`);
  }

  console.log("\n✅ Facilities added successfully!");
}

checkAndAddFacilities().catch(console.error);
