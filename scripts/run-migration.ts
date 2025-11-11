// Run migration to create default tenant and assign roles
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("🚀 Running migration: default tenant and auto-assign roles...");

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "00003_default_tenant_and_auto_role.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements

      console.log(`   Statement ${i + 1}/${statements.length}...`);
      const { error } = await supabase.rpc("exec_sql", { sql: statement });

      if (error) {
        console.error(`   ❌ Error in statement ${i + 1}:`, error);
        // Continue with other statements
      }
    }

    console.log("✅ Migration complete!");
    console.log("\nNow testing role assignments...");

    // Check if users have roles
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      return;
    }

    console.log(`\nFound ${users.users.length} users:`);

    for (const user of users.users) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role, facility_id")
        .eq("user_id", user.id)
        .single();

      console.log(`  - ${user.email}: ${role ? role.role : "NO ROLE"}`);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
