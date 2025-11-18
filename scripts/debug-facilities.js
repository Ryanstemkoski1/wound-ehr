// Debug facilities access
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFacilitiesAccess() {
  const adminEmail = "ryan.stemkoski@abectech.com";
  
  console.log("🔍 Debugging facilities access...\n");

  // Get admin user
  const { data: admin } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", adminEmail)
    .single();

  console.log(`Admin user: ${admin.email} (${admin.id})\n`);

  // Check user_facilities associations
  const { data: userFacilities, error: ufError } = await supabase
    .from("user_facilities")
    .select("*")
    .eq("user_id", admin.id);

  console.log(`User-Facility associations: ${userFacilities?.length || 0}`);
  if (ufError) {
    console.error("Error fetching user_facilities:", ufError);
  }
  if (userFacilities && userFacilities.length > 0) {
    console.log("Facility IDs:", userFacilities.map(uf => uf.facility_id).join(", "));
  }

  // Get ALL facilities (no filter)
  const { data: allFacilities, error: allError } = await supabase
    .from("facilities")
    .select("id, name, is_active");

  console.log(`\nAll facilities in database: ${allFacilities?.length || 0}`);
  if (allError) {
    console.error("Error fetching all facilities:", allError);
  }
  if (allFacilities && allFacilities.length > 0) {
    allFacilities.forEach(f => {
      console.log(`  - ${f.name} (${f.id}) - is_active: ${f.is_active ?? "NULL"}`);
    });
  }

  // Try the exact query from getUserFacilities
  const facilityIds = userFacilities?.map((uf) => uf.facility_id) || [];
  
  if (facilityIds.length > 0) {
    console.log(`\nQuerying facilities with IDs: ${facilityIds.join(", ")}\n`);
    
    const { data: facilities, error } = await supabase
      .from("facilities")
      .select(`
        *,
        patients!left(id)
      `)
      .in("id", facilityIds)
      .order("name", { ascending: true });

    console.log(`Facilities returned by query: ${facilities?.length || 0}`);
    if (error) {
      console.error("Error:", error);
    }
    if (facilities && facilities.length > 0) {
      facilities.forEach(f => {
        const patientCount = f.patients?.length || 0;
        console.log(`  - ${f.name}: ${patientCount} patients`);
      });
    }
  } else {
    console.log("\n❌ No facility associations found for user!");
    console.log("This is why facilities don't show up in the admin panel.");
  }
}

debugFacilitiesAccess().catch(console.error);
