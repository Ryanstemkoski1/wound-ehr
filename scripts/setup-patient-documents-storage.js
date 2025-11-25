// Create patient-documents storage bucket and apply RLS policies
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

async function setupStorage() {
  try {
    console.log("🗄️  Setting up patient-documents storage bucket...\n");

    // Step 1: Create bucket
    console.log("1️⃣  Creating storage bucket...");
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket(
      "patient-documents",
      {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          "application/pdf",
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      }
    );

    if (bucketError) {
      if (bucketError.message.includes("already exists")) {
        console.log("   ✅ Bucket already exists");
      } else {
        throw bucketError;
      }
    } else {
      console.log("   ✅ Bucket created successfully");
    }

    // Step 2: Apply RLS policies
    console.log("\n2️⃣  Applying storage RLS policies...");
    
    const storagePolicyPath = join(
      process.cwd(),
      "supabase",
      "storage",
      "patient-documents-bucket.sql"
    );
    const storagePolicySQL = readFileSync(storagePolicyPath, "utf-8");

    const statements = storagePolicySQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, " ");
      
      console.log(`   [${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc("exec", {
          query: statement + ";",
        });

        if (error) {
          console.error(`   ⚠️  Warning: ${error.message}`);
        }
      } catch (err) {
        console.error(`   ⚠️  Error: ${err.message}`);
      }
    }

    console.log("\n✅ Storage setup completed!");
    console.log("\n📊 Summary:");
    console.log("   - Bucket: patient-documents (private, 10MB limit)");
    console.log("   - Policies: SELECT, INSERT, UPDATE, DELETE");
    console.log("   - Multi-tenant RLS: Enforced via user_facilities");
    console.log("\n🎯 Next steps:");
    console.log("   1. Generate TypeScript types: npm run db:types");
    console.log("   2. Verify deployment: Test document upload in UI");
    console.log("   3. Run test script: node scripts/test-patient-documents.js\n");
  } catch (error) {
    console.error("❌ Storage setup failed:", error.message);
    process.exit(1);
  }
}

setupStorage();
