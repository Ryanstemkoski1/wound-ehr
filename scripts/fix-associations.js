// Check user associations
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAssociations() {
  const adminEmail = "ryan.stemkoski@abectech.com";
  
  console.log(`🔍 Checking associations for ${adminEmail}...\n`);

  // Get admin user
  const { data: admin } = await supabase
    .from("users")
    .select("*")
    .eq("email", adminEmail)
    .single();

  if (!admin) {
    console.log("❌ Admin user not found!");
    return;
  }

  console.log(`✅ Admin user found: ${admin.email}`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Credentials: ${admin.credentials}\n`);

  // Check user_roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select(`
      *,
      tenant:tenants(name),
      facility:facilities(name)
    `)
    .eq("user_id", admin.id);

  console.log(`👔 User Roles: ${roles?.length || 0}`);
  if (roles && roles.length > 0) {
    roles.forEach(r => {
      console.log(`   - ${r.role} at ${r.tenant.name}${r.facility ? ` / ${r.facility.name}` : ""}`);
    });
  }

  // Check user_facilities
  const { data: userFacilities } = await supabase
    .from("user_facilities")
    .select(`
      *,
      facility:facilities(name, city, state)
    `)
    .eq("user_id", admin.id);

  console.log(`\n📍 Facility Associations: ${userFacilities?.length || 0}`);
  if (userFacilities && userFacilities.length > 0) {
    userFacilities.forEach(uf => {
      console.log(`   - ${uf.facility.name} (${uf.facility.city}, ${uf.facility.state})`);
    });
  } else {
    console.log("   ❌ NO FACILITY ASSOCIATIONS!");
    console.log("\n   This means the user can't see any facilities or patients.");
    console.log("   Need to associate user with facilities...\n");
    
    // Get all facilities
    const { data: facilities } = await supabase.from("facilities").select("id, name");
    
    if (facilities && facilities.length > 0) {
      console.log("   🔧 Associating user with all facilities...");
      
      for (const facility of facilities) {
        const { error } = await supabase.from("user_facilities").insert({
          user_id: admin.id,
          facility_id: facility.id,
          is_default: false,
        });
        
        if (error) {
          console.log(`      ❌ Failed to associate with ${facility.name}`);
        } else {
          console.log(`      ✅ Associated with ${facility.name}`);
        }
      }
      
      console.log("\n   ✅ User associations fixed!");
    }
  }

  // Check patient counts by facility
  console.log("\n👥 Patients per Facility:");
  const { data: facilities } = await supabase.from("facilities").select("id, name");
  
  for (const facility of facilities || []) {
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .eq("facility_id", facility.id);
    
    console.log(`   - ${facility.name}: ${patients?.length || 0} patients`);
  }
}

checkUserAssociations().catch(console.error);
