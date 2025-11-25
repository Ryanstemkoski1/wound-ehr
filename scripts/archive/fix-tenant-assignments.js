require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CORRECT_TENANT = "8ec9598a-6bf6-4910-9eb3-dd52fbfd8898"; // ABEC Technologies
const CHICAGO_FACILITY = "a0db8fb4-a23d-4d67-a597-25e171dd746d";

async function fixTenantAssignments() {
  console.log("\n=== FIXING TENANT ASSIGNMENTS ===\n");

  const testUserEmails = [
    "pa.test@wound-ehr.com",
    "do.test@wound-ehr.com",
    "np.test@wound-ehr.com",
    "lvn.test@wound-ehr.com",
  ];

  // Get test users
  const { data: testUsers } = await supabase
    .from("users")
    .select("id, email, name")
    .in("email", testUserEmails);

  console.log(`Found ${testUsers.length} test users to fix:\n`);

  for (const user of testUsers) {
    console.log(`Fixing ${user.name}...`);

    // Update user_roles to correct tenant
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({
        tenant_id: CORRECT_TENANT,
        facility_id: CHICAGO_FACILITY,
      })
      .eq("user_id", user.id);

    if (roleError) {
      console.error(`  ❌ Role update error: ${roleError.message}`);
    } else {
      console.log(`  ✅ Updated role to ABEC Technologies tenant`);
    }
  }

  console.log("\n=== VERIFICATION ===\n");

  // Verify the fix
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, tenant_id, role")
    .eq("tenant_id", CORRECT_TENANT);

  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name, email, credentials");

  console.log(`Users in ABEC Technologies tenant:`);
  roles.forEach((r) => {
    const user = allUsers.find((u) => u.id === r.user_id);
    console.log(`  - ${user.name} (${user.credentials}) - ${r.role}`);
  });

  console.log(`\nTotal: ${roles.length} users ✅`);
}

fixTenantAssignments().catch(console.error);
