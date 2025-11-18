// Audit database schema and RLS policies
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditSchema() {
  console.log("🔍 Auditing database schema and RLS policies...\n");

  // Check facilities table columns
  console.log("📊 FACILITIES TABLE COLUMNS:");
  const { data: facilityColumns, error: fcError } = await supabase
    .rpc('exec_sql', { 
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'facilities'
        ORDER BY ordinal_position;
      `
    });

  if (fcError) {
    // Try alternative method
    const { data: facilities } = await supabase
      .from("facilities")
      .select("*")
      .limit(1);
    
    if (facilities && facilities.length > 0) {
      console.log("Columns:", Object.keys(facilities[0]).join(", "));
    }
  }

  // Check RLS policies on facilities
  console.log("\n🔒 FACILITIES RLS POLICIES:");
  const { data: policies } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE tablename = 'facilities';
    `
  });

  // Check if facilities has tenant_id column
  console.log("\n🔍 Checking if facilities has tenant_id column...");
  const { data: testFacility } = await supabase
    .from("facilities")
    .select("*")
    .limit(1)
    .single();

  if (testFacility) {
    const hasTenantId = 'tenant_id' in testFacility;
    console.log(`   tenant_id column exists: ${hasTenantId}`);
    console.log(`   Available columns: ${Object.keys(testFacility).join(", ")}`);
  }

  // Check user_facilities table
  console.log("\n📊 USER_FACILITIES TABLE:");
  const { data: ufCount } = await supabase
    .from("user_facilities")
    .select("*", { count: 'exact', head: true });

  console.log(`   Total associations: ${ufCount}`);

  // Check for broken policies
  console.log("\n⚠️  CHECKING FOR BROKEN POLICIES:");
  
  const tables = ["facilities", "patients", "wounds", "visits", "assessments"];
  
  for (const table of tables) {
    const { data: sampleData, error } = await supabase
      .from(table)
      .select("*")
      .limit(1);

    if (error) {
      console.log(`   ❌ ${table}: Query failed - ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: ${sampleData?.length || 0} record(s) accessible`);
    }
  }
}

auditSchema().catch(console.error);
