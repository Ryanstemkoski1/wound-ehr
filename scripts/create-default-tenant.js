#!/usr/bin/env node

/**
 * Create default tenant and facility
 * Run with: node scripts/create-default-tenant.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createDefaultTenant() {
  console.log("\n🔧 Creating default tenant and facility...\n");

  // 1. Check if tenant exists
  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("subdomain", "default")
    .single();

  if (existingTenant) {
    console.log("✓ Tenant already exists:", existingTenant.name);
  } else {
    // Create tenant
    const { data: newTenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: "Default Clinic",
        subdomain: "default",
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("❌ Error creating tenant:", tenantError.message);
      return;
    }

    console.log("✅ Tenant created:", newTenant.name);
  }

  // 2. Get tenant ID
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("subdomain", "default")
    .single();

  if (!tenant) {
    console.error("❌ Tenant not found");
    return;
  }

  // 3. Check if facility exists
  const { data: existingFacility } = await supabase
    .from("facilities")
    .select("*")
    .eq("tenant_id", tenant.id)
    .single();

  if (existingFacility) {
    console.log("✓ Facility already exists:", existingFacility.name);
  } else {
    // Create facility
    const { data: newFacility, error: facilityError } = await supabase
      .from("facilities")
      .insert({
        tenant_id: tenant.id,
        name: "Main Medical Center",
        address: "123 Healthcare Blvd",
        city: "Medical City",
        state: "CA",
        zip: "90001",
        phone: "(555) 123-4567",
        is_active: true,
      })
      .select()
      .single();

    if (facilityError) {
      console.error("❌ Error creating facility:", facilityError.message);
      return;
    }

    console.log("✅ Facility created:", newFacility.name);
  }

  // 4. Update any facilities without tenant_id
  const { data: orphanFacilities } = await supabase
    .from("facilities")
    .select("*")
    .is("tenant_id", null);

  if (orphanFacilities && orphanFacilities.length > 0) {
    console.log(`\n⚠️  Found ${orphanFacilities.length} facilities without tenant. Updating...`);
    
    const { error: updateError } = await supabase
      .from("facilities")
      .update({ tenant_id: tenant.id })
      .is("tenant_id", null);

    if (updateError) {
      console.error("❌ Error updating facilities:", updateError.message);
    } else {
      console.log("✅ Facilities updated");
    }
  }

  console.log("\n✨ Default tenant and facility setup complete!\n");
  console.log("Next steps:");
  console.log("  1. Sign up at http://localhost:3000/signup");
  console.log("  2. Or assign role to existing user:");
  console.log("     node scripts/assign-role.js <email> tenant_admin\n");
}

createDefaultTenant().catch(console.error);
