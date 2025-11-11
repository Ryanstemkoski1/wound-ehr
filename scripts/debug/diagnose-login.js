#!/usr/bin/env node

/**
 * Login Diagnostic Script
 * Run with: node scripts/diagnose-login.js <your-email>
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: node scripts/diagnose-login.js <email>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  console.log("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnose() {
  console.log("\n🔍 Login Diagnostic for:", email);
  console.log("─────────────────────────────────────────\n");

  // Check 1: Does user exist in auth.users?
  console.log("1️⃣  Checking if user exists in auth.users...");
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("   ❌ Error fetching users:", authError.message);
    return;
  }

  const authUser = authUsers.users.find((u) => u.email === email);

  if (!authUser) {
    console.log("   ❌ User NOT found in auth.users");
    console.log("\n📋 Solution:");
    console.log("   1. Sign up at: http://localhost:3000/signup");
    console.log("   2. Or create user via Supabase Dashboard → Authentication → Users");
    return;
  }

  console.log("   ✅ User exists in auth.users");
  console.log("      User ID:", authUser.id);
  console.log("      Email confirmed:", authUser.email_confirmed_at ? "Yes ✓" : "No ✗");
  console.log("      Last sign in:", authUser.last_sign_in_at || "Never");

  // Check 2: Email confirmation status
  console.log("\n2️⃣  Checking email confirmation...");
  if (!authUser.email_confirmed_at) {
    console.log("   ⚠️  Email NOT confirmed");
    console.log("\n📋 Solutions:");
    console.log("   Option A: Disable email confirmation in Supabase");
    console.log("      → Dashboard → Authentication → Providers → Email");
    console.log("      → Uncheck 'Enable email confirmations'");
    console.log("\n   Option B: Manually confirm user");
    console.log(`      → Run: node scripts/confirm-user.js ${email}`);
    console.log("\n   Option C: Check your email for confirmation link");
  } else {
    console.log("   ✅ Email is confirmed");
  }

  // Check 3: User in users table?
  console.log("\n3️⃣  Checking if user exists in users table...");
  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (userError) {
    if (userError.code === "PGRST116") {
      console.log("   ❌ User NOT found in users table");
      console.log("\n📋 Solution: User should be auto-created by trigger");
      console.log("   → Check if trigger 'on_auth_user_created' exists in database");
    } else {
      console.log("   ❌ Error:", userError.message);
    }
  } else {
    console.log("   ✅ User exists in users table");
    console.log("      Name:", appUser.name || "(not set)");
    console.log("      Email:", appUser.email);
  }

  // Check 4: User role?
  console.log("\n4️⃣  Checking user role...");
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("*, tenants(name)")
    .eq("user_id", authUser.id);

  if (roleError) {
    console.log("   ❌ Error fetching roles:", roleError.message);
  } else if (!roles || roles.length === 0) {
    console.log("   ⚠️  User has NO role assigned");
    console.log("\n📋 Solution: Assign a role");
    console.log(`   → Run: node scripts/assign-role.js ${email} tenant_admin`);
  } else {
    console.log("   ✅ User has role(s):");
    roles.forEach((role) => {
      console.log(`      - ${role.role} in tenant: ${role.tenants?.name || role.tenant_id}`);
    });
  }

  // Check 5: Tenant exists?
  console.log("\n5️⃣  Checking tenants...");
  const { data: tenants, error: tenantError } = await supabase
    .from("tenants")
    .select("*");

  if (tenantError) {
    console.log("   ❌ Error fetching tenants:", tenantError.message);
  } else if (!tenants || tenants.length === 0) {
    console.log("   ⚠️  No tenants exist");
    console.log("\n📋 Solution: Create default tenant");
    console.log("   → Run migration: 00005_setup_default_tenant.sql");
    console.log("   → Or run: node scripts/create-default-tenant.js");
  } else {
    console.log("   ✅ Tenants exist:");
    tenants.forEach((t) => {
      console.log(`      - ${t.name} (${t.subdomain})`);
    });
  }

  // Summary
  console.log("\n📊 Summary");
  console.log("─────────────────────────────────────────");
  const issues = [];
  
  if (!authUser.email_confirmed_at) {
    issues.push("Email not confirmed");
  }
  if (!appUser) {
    issues.push("User not in users table");
  }
  if (!roles || roles.length === 0) {
    issues.push("No role assigned");
  }
  if (!tenants || tenants.length === 0) {
    issues.push("No tenants exist");
  }

  if (issues.length === 0) {
    console.log("✅ All checks passed! User should be able to login.");
    console.log("\nIf still having issues:");
    console.log("  1. Clear browser cookies/cache");
    console.log("  2. Restart dev server (npm run dev)");
    console.log("  3. Check browser console for errors");
    console.log("  4. Check server terminal for errors");
  } else {
    console.log("❌ Issues found:");
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  console.log("\n");
}

diagnose().catch(console.error);
