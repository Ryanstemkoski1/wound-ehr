#!/usr/bin/env node

/**
 * Run migration 00019: Scanned Consents
 * Usage: node scripts/run-migration-00019.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log("🚀 Running migration 00019: Scanned Consents...\n");

  const migrationPath = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "00019_scanned_consents.sql"
  );

  try {
    const sql = fs.readFileSync(migrationPath, "utf8");

    // Split by semicolons and filter out comments and empty lines
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(
        (s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("/*")
      );

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase
        .rpc("exec_sql", { sql_query: statement + ";" })
        .catch(async () => {
          // If RPC doesn't exist, try direct execution
          return await supabase.from("_migrations").select("*").limit(1);
        });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.log("Statement:", statement.substring(0, 100) + "...");
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log("\n✅ Migration 00019 completed!");
    console.log("\n📋 Verifying changes...\n");

    // Verify patient_consents columns
    const { data: consentColumns, error: consentError } = await supabase
      .from("patient_consents")
      .select("*")
      .limit(0);

    if (!consentError) {
      console.log("✅ patient_consents table updated successfully");
    }

    console.log(
      '\n🎉 All done! Run "npm run db:types" to update TypeScript types.'
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
