// Check all data in database
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllData() {
  console.log("🔍 Checking all data in database...\n");

  // Check users
  const { data: users } = await supabase.from("users").select("id, email, name, credentials");
  console.log(`👤 Users: ${users?.length || 0}`);
  if (users && users.length > 0) {
    users.forEach(u => console.log(`   - ${u.email} (${u.credentials})`));
  }

  // Check tenants
  const { data: tenants } = await supabase.from("tenants").select("id, name");
  console.log(`\n🏢 Tenants: ${tenants?.length || 0}`);
  if (tenants && tenants.length > 0) {
    tenants.forEach(t => console.log(`   - ${t.name}`));
  }

  // Check facilities
  const { data: facilities } = await supabase.from("facilities").select("id, name, city, state");
  console.log(`\n📍 Facilities: ${facilities?.length || 0}`);
  if (facilities && facilities.length > 0) {
    facilities.forEach(f => console.log(`   - ${f.name} (${f.city}, ${f.state})`));
  }

  // Check user_facilities
  const { data: userFacilities } = await supabase.from("user_facilities").select("*");
  console.log(`\n🔗 User-Facility associations: ${userFacilities?.length || 0}`);

  // Check patients
  const { data: patients } = await supabase.from("patients").select("id, first_name, last_name, facility_id");
  console.log(`\n👥 Patients: ${patients?.length || 0}`);
  if (patients && patients.length > 0) {
    console.log(`   First 5: ${patients.slice(0, 5).map(p => `${p.first_name} ${p.last_name}`).join(", ")}`);
  }

  // Check wounds
  const { data: wounds } = await supabase.from("wounds").select("id");
  console.log(`\n🩹 Wounds: ${wounds?.length || 0}`);

  // Check visits
  const { data: visits } = await supabase.from("visits").select("id");
  console.log(`\n🏥 Visits: ${visits?.length || 0}`);

  console.log("\n" + "=".repeat(50));
  
  if (!facilities || facilities.length === 0) {
    console.log("\n❌ NO FACILITIES FOUND - Need to regenerate data");
  } else if (!patients || patients.length === 0) {
    console.log("\n❌ NO PATIENTS FOUND - Need to regenerate data");
  } else {
    console.log("\n✅ Data exists in database");
  }
}

checkAllData().catch(console.error);
