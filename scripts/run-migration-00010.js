// Run migration 00010 to add users UPDATE policy
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log("📋 Running migration 00010_add_users_update_policy.sql...\n");

  const migrationPath = path.join(
    __dirname,
    "../supabase/migrations/00010_add_users_update_policy.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // Split by semicolons but keep comments
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);

    const { error } = await supabase.rpc("exec_sql", { sql_string: statement });

    if (error) {
      console.error(`❌ Error executing statement ${i + 1}:`, error);
      process.exit(1);
    }

    console.log(`✅ Statement ${i + 1} executed successfully`);
  }

  console.log("\n✅ Migration 00010 completed successfully!");
  console.log("\n🎉 You can now update user credentials!");
}

runMigration().catch(console.error);
