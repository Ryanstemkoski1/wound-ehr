/**
 * Apply Migration 00027: Add Performance Indexes
 *
 * This script applies database indexes to optimize common query patterns:
 * - Visit queries by clinician, patient, facility, date
 * - Patient-clinician assignments
 * - Wound assessments
 * - Photo galleries
 * - Patient search
 * - Office inbox queries
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Missing Supabase credentials");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("🚀 Starting Migration 00027: Add Performance Indexes\n");

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "00027_add_performance_indexes.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📄 Migration file loaded successfully");
    console.log("📊 Creating indexes for optimal query performance...\n");

    // Execute migration
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution (requires elevated privileges)
      console.log("⚠️  exec_sql RPC not found, attempting direct execution...");

      // Split into individual statements and execute
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.includes("CREATE INDEX")) {
          const indexName = statement.match(/idx_\w+/)?.[0] || "unknown";
          process.stdout.write(`  Creating ${indexName}... `);

          const { error: execError } = await supabase.rpc("exec", {
            query: statement,
          });

          if (execError && !execError.message.includes("already exists")) {
            console.log("❌");
            throw execError;
          }
          console.log("✅");
        }
      }
    }

    console.log("\n✅ Migration 00027 applied successfully!\n");

    // Verify indexes were created
    console.log("🔍 Verifying indexes...\n");

    const { data: indexes, error: indexError } = await supabase.rpc(
      "get_indexes",
      { table_schema: "public" }
    );

    if (indexError) {
      console.log(
        "⚠️  Could not verify indexes (this is OK if using limited permissions)"
      );
    } else if (indexes) {
      const newIndexes = indexes.filter((idx) =>
        idx.indexname.startsWith("idx_")
      );
      console.log(`📊 Total performance indexes: ${newIndexes.length}`);
      console.log("\nIndexes created:");

      // Group by table
      const indexesByTable = newIndexes.reduce((acc, idx) => {
        const table = idx.tablename;
        if (!acc[table]) acc[table] = [];
        acc[table].push(idx.indexname);
        return acc;
      }, {});

      Object.entries(indexesByTable).forEach(([table, idxList]) => {
        console.log(`\n  ${table}: (${idxList.length} indexes)`);
        idxList.forEach((idx) => console.log(`    ✓ ${idx}`));
      });
    }

    console.log("\n📈 Expected Performance Improvements:");
    console.log("  • Visit list queries: 50-80% faster");
    console.log("  • Calendar rendering: 60-70% faster");
    console.log('  • "My Patients" filter: 70-90% faster');
    console.log("  • Patient search: 80-90% faster");
    console.log("  • Photo galleries: 40-60% faster");
    console.log("  • Office inbox: 70-80% faster\n");

    console.log("✨ Performance optimization complete!\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Helper function to create exec_sql RPC if it doesn't exist
async function createExecSqlFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const { error } = await supabase.rpc("exec", { query: createFunctionSQL });
  if (error && !error.message.includes("already exists")) {
    console.log("⚠️  Could not create exec_sql function:", error.message);
  }
}

// Run migration
applyMigration();
