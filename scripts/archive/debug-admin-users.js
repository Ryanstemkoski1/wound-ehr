require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAdminUsers() {
  console.log("\n=== DEBUGGING ADMIN USERS PAGE ===\n");

  // Get tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .limit(1)
    .single();

  if (!tenant) {
    console.error("No tenant found!");
    return;
  }

  console.log(`Tenant: ${tenant.name} (${tenant.id})\n`);

  // Get all user roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .eq("tenant_id", tenant.id);

  console.log(`Total user roles in tenant: ${roles.length}\n`);

  // Get Chicago facility
  const { data: chicago } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("name", "Chicago Wound Care Clinic")
    .single();

  console.log(`Chicago Facility: ${chicago.id}\n`);

  // Group by facility
  const chicagoUsers = roles.filter((r) => r.facility_id === chicago.id);
  const tenantAdmins = roles.filter((r) => r.role === "tenant_admin");

  console.log("TENANT ADMINS (visible to everyone):");
  for (const role of tenantAdmins) {
    const { data: user } = await supabase
      .from("users")
      .select("name, email, credentials")
      .eq("id", role.user_id)
      .single();
    console.log(`  - ${user.name} (${user.credentials}) - ${user.email}`);
  }

  console.log("\nCHICAGO FACILITY USERS (visible to Frank Ann):");
  for (const role of chicagoUsers) {
    const { data: user } = await supabase
      .from("users")
      .select("name, email, credentials")
      .eq("id", role.user_id)
      .single();
    console.log(
      `  - ${user.name} (${user.credentials}) - ${role.role} - ${user.email}`
    );
  }

  console.log(`\nTotal Chicago users: ${chicagoUsers.length}`);
  console.log(
    `\nIf logged in as Ryan (tenant_admin): Should see ${roles.length} users`
  );
  console.log(
    `If logged in as Frank Ann (facility_admin): Should see ${chicagoUsers.length} users`
  );
}

debugAdminUsers().catch(console.error);
