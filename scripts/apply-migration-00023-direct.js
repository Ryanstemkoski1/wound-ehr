// Apply migration 00023 directly via Supabase SQL
// This bypasses the need for exec() RPC function

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

console.log(
  "⚠️  IMPORTANT: This migration must be run in Supabase Dashboard SQL Editor\n"
);
console.log("📋 Steps to apply migration 00023:\n");
console.log(
  "1. Go to: https://supabase.com/dashboard/project/" +
    supabaseUrl.split("//")[1].split(".")[0]
);
console.log("2. Navigate to: SQL Editor (left sidebar)");
console.log("3. Click: 'New Query'");
console.log(
  "4. Copy the entire contents of: supabase/migrations/00023_specialized_assessments.sql"
);
console.log("5. Paste into SQL Editor");
console.log("6. Click: 'Run' (or press Ctrl+Enter)");
console.log("7. Verify success message\n");

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "00023_specialized_assessments.sql"
);

const migrationSQL = readFileSync(migrationPath, "utf-8");
const lineCount = migrationSQL.split("\n").length;
const sizeKB = (migrationSQL.length / 1024).toFixed(1);

console.log("📊 Migration file stats:");
console.log(`   - Lines: ${lineCount}`);
console.log(`   - Size: ${sizeKB} KB`);
console.log(
  `   - Tables: 3 (skilled_nursing_assessments, skilled_nursing_wounds, gtube_procedures)`
);
console.log(`   - Indexes: 9`);
console.log(`   - RLS Policies: 12`);
console.log(`   - RPC Functions: 3\n`);

console.log("💡 Alternative: Copy the SQL below and run in dashboard:\n");
console.log("=".repeat(80));
console.log(migrationSQL);
console.log("=".repeat(80));
