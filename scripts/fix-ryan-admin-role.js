// Quick script to check and fix Ryan's admin role
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRyanAdmin() {
  console.log("🔍 Checking Ryan's user role...\n");

  // Find Ryan's user
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("*")
    .ilike("name", "%Ryan%Stemkoski%")
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error("❌ Could not find Ryan's user:", userError?.message);
    process.exit(1);
  }

  const ryan = users[0];
  console.log(`✅ Found user: ${ryan.name} (${ryan.email})`);
  console.log(`   User ID: ${ryan.id}`);
  console.log(`   Credentials: ${ryan.credentials || "None"}\n`);

  // Check current role
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("*, tenants(name)")
    .eq("user_id", ryan.id);

  if (roleError) {
    console.error("❌ Error checking roles:", roleError.message);
    process.exit(1);
  }

  console.log(`📋 Current roles: ${roles?.length || 0}`);
  if (roles && roles.length > 0) {
    roles.forEach((r) => {
      console.log(`   - ${r.role} (Tenant: ${r.tenants?.name || "Unknown"})`);
    });
  }

  // Get default tenant
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .limit(1)
    .single();

  if (!tenants) {
    console.error("❌ No tenant found");
    process.exit(1);
  }

  console.log(`\n🏢 Default tenant: ${tenants.name} (${tenants.id})\n`);

  // Check if Ryan already has tenant_admin role
  const hasTenantAdmin = roles?.some(
    (r) => r.role === "tenant_admin" && r.tenant_id === tenants.id
  );

  if (hasTenantAdmin) {
    console.log("✅ Ryan already has tenant_admin role!");
  } else {
    console.log("🔧 Adding tenant_admin role to Ryan...");

    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: ryan.id,
      tenant_id: tenants.id,
      role: "tenant_admin",
    });

    if (insertError) {
      console.error("❌ Failed to add role:", insertError.message);
      process.exit(1);
    }

    console.log("✅ Successfully added tenant_admin role!");
  }

  console.log("\n🎉 Ryan can now access signature audit logs at:");
  console.log("   http://localhost:3000/dashboard/admin/signatures");
}

fixRyanAdmin();
