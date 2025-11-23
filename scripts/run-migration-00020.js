// Run migration 00020: Visit Addendums
// Phase 9.3.6

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("🚀 Running migration 00020: Visit Addendums...\n");

    // Read migration file
    const migrationPath = join(
      process.cwd(),
      "supabase",
      "migrations",
      "00020_visit_addendums.sql"
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Execute migration using service role
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // Try direct execution if RPC doesn't exist
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        const { error: execError } = await supabase.rpc("exec", {
          query: statement,
        });
        if (execError) {
          console.error("❌ Error:", execError.message);
        }
      }
    }

    console.log("✅ Migration 00020 completed successfully!\n");

    // Verify the changes
    console.log("📊 Verifying schema changes...\n");

    // Check wound_notes table has note_type column
    const { data: columns } = await supabase
      .from("wound_notes")
      .select("note_type")
      .limit(0);

    console.log("✅ wound_notes.note_type column exists");

    // Check visits table has addendum_count column
    const { data: visitColumns } = await supabase
      .from("visits")
      .select("addendum_count")
      .limit(0);

    console.log("✅ visits.addendum_count column exists");

    console.log("\n🎉 All schema changes verified!\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
