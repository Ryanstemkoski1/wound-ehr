require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTenants() {
  const { data: tenants } = await supabase.from("tenants").select("*");
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, tenant_id, role, facility_id");
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email");

  console.log("\n=== TENANTS ===");
  tenants.forEach((t) => console.log(`- ${t.name}: ${t.id}`));

  console.log("\n=== USER TO TENANT MAPPING ===\n");
  users.forEach((u) => {
    const userRoles = roles.filter((r) => r.user_id === u.id);
    if (userRoles.length === 0) {
      console.log(`❌ ${u.name}: NO ROLE ASSIGNED`);
    } else {
      userRoles.forEach((role) => {
        const tenant = tenants.find((t) => t.id === role.tenant_id);
        console.log(
          `✅ ${u.name}: ${tenant?.name || "Unknown"} (${role.role})`
        );
      });
    }
  });

  console.log("\n=== ISSUE FOUND ===");
  const ryanTenant = roles.find((r) =>
    users.find(
      (u) => u.id === r.user_id && u.email === "ryan.stemkoski@abectech.com"
    )
  )?.tenant_id;
  console.log(`Ryan's tenant: ${ryanTenant}`);
  console.log(`\nUsers in Ryan's tenant:`);
  const ryanTenantUsers = roles.filter((r) => r.tenant_id === ryanTenant);
  ryanTenantUsers.forEach((r) => {
    const user = users.find((u) => u.id === r.user_id);
    console.log(`  - ${user?.name} (${r.role})`);
  });
  console.log(`\nTotal: ${ryanTenantUsers.length} users`);
}

checkTenants().catch(console.error);
