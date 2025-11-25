/**
 * Verify RLS fixes are applied correctly
 */

require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log("🔍 VERIFYING RLS FIXES\n");

  // Check RLS status
  const { data: rlsStatus } = await supabase.rpc("exec_sql", {
    sql: `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('tenants', 'user_invites', 'wound_notes', 'procedure_scopes', 'user_roles')
      ORDER BY tablename;
    `,
  });

  console.log("📊 RLS Status:");
  console.table(rlsStatus);

  // Check policy counts
  const { data: policyCounts } = await supabase.rpc("exec_sql", {
    sql: `
      SELECT tablename, COUNT(*) as policy_count 
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename IN ('tenants', 'user_invites', 'wound_notes', 'procedure_scopes')
      GROUP BY tablename 
      ORDER BY tablename;
    `,
  });

  console.log("\n📋 Policy Counts:");
  console.table(policyCounts);

  // List specific policies
  const { data: policies } = await supabase.rpc("exec_sql", {
    sql: `
      SELECT tablename, policyname, cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename IN ('tenants', 'user_invites', 'wound_notes', 'procedure_scopes')
      ORDER BY tablename, policyname;
    `,
  });

  console.log("\n📜 All Policies:");
  console.table(policies);

  console.log("\n✅ Verification complete!");
  console.log("\nExpected results:");
  console.log("- tenants: RLS = true, 2 policies (SELECT, UPDATE)");
  console.log(
    "- user_invites: RLS = true, 4 policies (SELECT, 2x INSERT, UPDATE)"
  );
  console.log(
    "- wound_notes: RLS = true, 4 policies (SELECT, INSERT, UPDATE, DELETE)"
  );
  console.log(
    "- procedure_scopes: RLS = true, 2 policies (SELECT for all, ALL for tenant_admin)"
  );
  console.log("- user_roles: RLS = false (by design)\n");
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
