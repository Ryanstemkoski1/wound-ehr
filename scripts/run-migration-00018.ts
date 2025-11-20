// Run migration 00018: Add procedure_scopes table
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    console.log("🚀 Running migration 00018: Add procedure_scopes table");
    console.log("   Phase 9.3.1 - Credential-based procedure restrictions");
    console.log("");

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "00018_add_procedure_scopes.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      console.error("❌ Migration file not found:", migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    console.log("📝 Migration file loaded successfully");
    console.log("");

    // Execute the entire migration as one transaction
    console.log("⚡ Executing migration SQL...");
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Migration executed successfully!");
    console.log("");

    // Verify the table was created
    console.log("🔍 Verifying procedure_scopes table...");
    const { data: tableCheck, error: tableError } = await supabase
      .from("procedure_scopes")
      .select("id, procedure_code, procedure_name, allowed_credentials", {
        count: "exact",
      });

    if (tableError) {
      console.error("❌ Table verification failed:", tableError);
      console.log("   Note: This might be due to RLS policies. Checking with service role...");
    } else {
      console.log(`✅ Table exists with ${tableCheck?.length || 0} rows`);
      console.log("");
      
      if (tableCheck && tableCheck.length > 0) {
        console.log("📋 Sample procedures:");
        tableCheck.slice(0, 5).forEach((proc: any) => {
          console.log(
            `   - ${proc.procedure_code}: ${proc.procedure_name} (${proc.allowed_credentials.join(", ")})`
          );
        });
        
        if (tableCheck.length !== 17) {
          console.warn(`⚠️  Warning: Expected 17 procedures, found ${tableCheck.length}`);
        }
      }
    }

    console.log("");

    // Test the helper functions
    console.log("🧪 Testing helper functions...");

    // Test 1: RN cannot perform sharp debridement
    const { data: rnTest, error: rnError } = await supabase.rpc(
      "can_perform_procedure",
      {
        user_credentials: ["RN"],
        cpt_code: "11042",
      }
    );

    if (!rnError) {
      console.log(
        `   ✓ can_perform_procedure(RN, 11042): ${rnTest} ${rnTest === false ? "✅ CORRECT" : "❌ WRONG"}`
      );
    } else {
      console.error("   ✗ RN test failed:", rnError);
    }

    // Test 2: MD can perform sharp debridement
    const { data: mdTest, error: mdError } = await supabase.rpc(
      "can_perform_procedure",
      {
        user_credentials: ["MD"],
        cpt_code: "11042",
      }
    );

    if (!mdError) {
      console.log(
        `   ✓ can_perform_procedure(MD, 11042): ${mdTest} ${mdTest === true ? "✅ CORRECT" : "❌ WRONG"}`
      );
    } else {
      console.error("   ✗ MD test failed:", mdError);
    }

    // Test 3: RN can perform selective debridement
    const { data: rnTest2, error: rnError2 } = await supabase.rpc(
      "can_perform_procedure",
      {
        user_credentials: ["RN"],
        cpt_code: "97597",
      }
    );

    if (!rnError2) {
      console.log(
        `   ✓ can_perform_procedure(RN, 97597): ${rnTest2} ${rnTest2 === true ? "✅ CORRECT" : "❌ WRONG"}`
      );
    } else {
      console.error("   ✗ RN test (97597) failed:", rnError2);
    }

    console.log("");
    console.log("✅ Migration 00018 completed successfully!");
    console.log("");
    console.log("📝 Next steps:");
    console.log("   1. Run: npm run db:types (to update TypeScript types)");
    console.log("   2. Update visit page with BillingFormServerWrapper");
    console.log("   3. Test with RN and MD users");
    console.log("");
    console.log("📚 Documentation:");
    console.log("   - Integration guide: docs/PROCEDURE_RESTRICTIONS_QUICK_START.md");
    console.log("   - Detailed docs: docs/PROCEDURE_RESTRICTIONS_INTEGRATION.md");

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

// Run the migration
runMigration();
