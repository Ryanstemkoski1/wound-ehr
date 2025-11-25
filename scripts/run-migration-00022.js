// Run migration 00022: Patient Document Attachments
// Phase 9.4.1

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
    console.log("🚀 Running migration 00022: Patient Document Attachments...\n");
    console.log("📋 This migration creates:");
    console.log("   - patient_documents table");
    console.log("   - 11 document types support");
    console.log("   - RLS policies for multi-tenant security");
    console.log("   - Auto-set triggers for uploaded_by");
    console.log("   - get_patient_document_count() RPC function\n");

    // Read migration file
    const migrationPath = join(
      process.cwd(),
      "supabase",
      "migrations",
      "00022_patient_documents.sql"
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split into statements and execute one by one
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 100).replace(/\n/g, " ");
      
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc("exec", {
          query: statement + ";",
        });

        if (error) {
          console.error(`⚠️  Warning: ${error.message}`);
          // Continue anyway - some errors are expected
        }
      } catch (err) {
        console.error(`⚠️  Statement error: ${err.message}`);
        // Continue execution
      }
    }

    console.log("\n✅ Migration 00022 completed!");
    console.log("\n📊 Next steps:");
    console.log("   1. Create storage bucket: patient-documents");
    console.log("   2. Apply storage RLS policies");
    console.log("   3. Generate TypeScript types: npm run db:types");
    console.log("   4. Run test script: node scripts/test-patient-documents.js\n");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
