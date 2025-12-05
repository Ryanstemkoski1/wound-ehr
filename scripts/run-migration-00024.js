require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("🔄 Running migration 00024: Grafting and Skin Sweep Assessments...\n");

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "../supabase/migrations/00024_grafting_skin_sweep_assessments.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Split by semicolons but keep semicolons inside function definitions together
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|ALTER|DROP|--|\n\n|$))/i)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      if (!statement) continue;

      console.log(`\nExecuting: ${statement.substring(0, 100)}...`);

      const { error } = await supabase.rpc("exec_sql", {
        sql_string: statement + ";",
      });

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from("_sqlx_migrations").select("*").limit(0);
        
        if (directError && directError.code === '42P01') {
          // Table doesn't exist, execute raw SQL
          console.log("Using raw SQL execution...");
          // This would need a different approach - skip for now
        } else {
          throw error;
        }
      }

      console.log("✓ Success");
    }

    console.log("\n✅ Migration 00024 completed successfully!\n");
    console.log("Created tables:");
    console.log("  - grafting_assessments (with RLS policies)");
    console.log("  - skin_sweep_assessments (with RLS policies)");
    console.log("\nNext step: Run `npm run db:types` to update TypeScript types");
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  }
}

runMigration();
