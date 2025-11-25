// Test script to verify all user types and credentials
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAllUsers() {
  console.log("\n=== TESTING ALL USERS AND CREDENTIALS ===\n");

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, name, credentials")
    .order("created_at");

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  // Get all roles
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role, tenant_id, facility_id");

  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return;
  }

  // Get all facility associations
  const { data: facilities, error: facilitiesError } = await supabase
    .from("user_facilities")
    .select("user_id, facility_id");

  if (facilitiesError) {
    console.error("Error fetching facilities:", facilitiesError);
    return;
  }

  // Get facility names
  const { data: facilityNames } = await supabase
    .from("facilities")
    .select("id, name");

  const facilityMap = {};
  facilityNames?.forEach((f) => (facilityMap[f.id] = f.name));

  console.log("CURRENT DATABASE STATE:\n");
  console.log(`Total Users: ${users.length}`);
  console.log(`Total Roles: ${roles.length}`);
  console.log(`Total Facility Associations: ${facilities.length}\n`);

  console.log("USER DETAILS:\n");
  users.forEach((user) => {
    const userRoles = roles.filter((r) => r.user_id === user.id);
    const userFacilities = facilities.filter((f) => f.user_id === user.id);

    console.log(`👤 ${user.name || "No Name"} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Credentials: ${user.credentials || "None"}`);
    console.log(
      `   Roles: ${userRoles.map((r) => `${r.role}${r.facility_id ? ` @ ${facilityMap[r.facility_id] || "Unknown"}` : ""}`).join(", ") || "None"}`
    );
    console.log(
      `   Facilities: ${userFacilities.map((f) => facilityMap[f.facility_id] || "Unknown").join(", ") || "None"}`
    );
    console.log("");
  });

  // Test procedure restrictions
  console.log("\n=== TESTING PROCEDURE RESTRICTIONS ===\n");

  const { data: procedures } = await supabase
    .from("procedure_scopes")
    .select("*")
    .order("procedure_code");

  if (procedures) {
    console.log(`Total Procedures: ${procedures.length}`);

    // Procedures are restricted if they don't include all credentials (only specific ones allowed)
    const restrictedProcs = procedures.filter((p) => {
      const allowed = p.allowed_credentials || [];
      // A procedure is "restricted" if it doesn't allow RN or LVN (common credentials)
      return !allowed.includes("RN") || !allowed.includes("LVN");
    });

    console.log(
      `Restricted Procedures (require MD/DO/PA/NP): ${restrictedProcs.length}\n`
    );

    console.log("RESTRICTED PROCEDURES (Sharp Debridement):");
    restrictedProcs.forEach((p) => {
      console.log(`  ${p.procedure_code}: ${p.procedure_name}`);
      console.log(`    Allowed: ${p.allowed_credentials.join(", ")}`);
    });

    console.log("\n");

    // Test each user's access
    console.log("USER ACCESS TESTING:\n");
    users.forEach((user) => {
      if (!user.credentials) {
        console.log(
          `❌ ${user.name}: No credentials set - Cannot perform any procedures`
        );
        return;
      }

      const allowedProcs = procedures.filter((p) =>
        p.allowed_credentials?.includes(user.credentials)
      );
      const deniedProcs = procedures.filter(
        (p) => !p.allowed_credentials?.includes(user.credentials)
      );

      console.log(
        `${deniedProcs.length > 0 ? "⚠️" : "✅"} ${user.name} (${user.credentials})`
      );
      console.log(`   ✅ Can access: ${allowedProcs.length} procedures`);
      console.log(`   ❌ Restricted from: ${deniedProcs.length} procedures`);
      if (deniedProcs.length > 0) {
        console.log(
          `   🚫 Blocked codes: ${deniedProcs.map((p) => p.procedure_code).join(", ")}`
        );
      }
      console.log("");
    });
  }

  console.log("\n=== TEST SUMMARY ===\n");

  const credentialTypes = [
    ...new Set(users.map((u) => u.credentials).filter(Boolean)),
  ];
  console.log(`Credential Types in System: ${credentialTypes.join(", ")}`);

  const roleTypes = [...new Set(roles.map((r) => r.role))];
  console.log(`Role Types in System: ${roleTypes.join(", ")}`);

  console.log("\n✅ Database query test complete\n");
}

testAllUsers().catch(console.error);
