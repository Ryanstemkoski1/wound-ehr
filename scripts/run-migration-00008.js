// Run migration 00008: Add credentials system
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
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
    console.log("🚀 Running migration 00008: Add credentials system...\n");

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "00008_add_credentials_system.sql"
    );
    
    if (!fs.existsSync(migrationPath)) {
      console.error("❌ Migration file not found:", migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📝 Executing migration SQL...\n");

    // Execute the entire migration as one transaction
    const { data, error } = await supabase.rpc("exec_sql", { 
      sql: migrationSQL 
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      if (error.message?.includes("function") && error.message?.includes("does not exist")) {
        console.log("⚠️  exec_sql RPC not available, using direct SQL execution...\n");
        
        // Split into statements and execute one by one
        const statements = migrationSQL
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i] + ";";
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          
          const { error: stmtError } = await supabase.rpc("query", { 
            query_text: statement 
          });

          if (stmtError) {
            console.error(`❌ Error in statement ${i + 1}:`, stmtError.message);
            console.error("Statement:", statement.substring(0, 100) + "...");
            throw stmtError;
          }
        }
      } else {
        throw error;
      }
    }

    console.log("\n✅ Migration 00008 completed successfully!\n");
    console.log("Changes applied:");
    console.log("  ✓ Added credentials column to users table");
    console.log("  ✓ Added credentials column to user_invites table");
    console.log("  ✓ Created procedure_scopes table with RLS policies");
    console.log("  ✓ Seeded 14 procedure scope records");
    console.log("  ✓ Created can_perform_procedure() helper function");
    console.log("  ✓ Set existing users to 'Admin' credentials");
    console.log("\nNext steps:");
    console.log("  1. Run: npm run db:types");
    console.log("  2. Update user credentials via admin UI");
    console.log("  3. Test invite flow with credentials");

  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nYou may need to run this migration manually in the Supabase SQL Editor:");
    console.error("  1. Go to Supabase Dashboard → SQL Editor");
    console.error("  2. Open: supabase/migrations/00008_add_credentials_system.sql");
    console.error("  3. Copy and paste the entire file");
    console.error("  4. Click 'Run'");
    process.exit(1);
  }
}

runMigration();
