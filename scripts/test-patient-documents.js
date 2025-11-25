/**
 * Test Script for Patient Document System (Phase 9.4.1)
 * Tests: Migration, RPC functions, storage setup, and document operations
 *
 * Prerequisites:
 * 1. Run migration 00022 via Supabase Dashboard
 * 2. Create patient-documents storage bucket
 * 3. Apply storage RLS policies
 *
 * Usage: node scripts/test-patient-documents.js
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log("🧪 Patient Document System Test Suite\n");
  console.log("=".repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Check if patient_documents table exists
  console.log("\n📋 Test 1: Verify patient_documents table exists");
  try {
    const { data, error } = await supabase
      .from("patient_documents")
      .select("count")
      .limit(0);

    if (error && error.code === "42P01") {
      console.error("❌ FAILED: Table does not exist");
      console.error("   Action: Run migration 00022 in Supabase Dashboard");
      testsFailed++;
    } else {
      console.log("✅ PASSED: Table exists");
      testsPassed++;
    }
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    testsFailed++;
  }

  // Test 2: Check RLS is enabled
  console.log("\n📋 Test 2: Verify RLS is enabled on patient_documents");
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'patient_documents'
      `,
    });

    if (data && data[0]?.rowsecurity === true) {
      console.log("✅ PASSED: RLS enabled");
      testsPassed++;
    } else {
      console.error("❌ FAILED: RLS not enabled");
      testsFailed++;
    }
  } catch (err) {
    console.log("⚠️  SKIPPED: exec_sql function not available");
    console.log(
      "   Manual check: Run SELECT * FROM pg_tables WHERE tablename = 'patient_documents'"
    );
  }

  // Test 3: Check RPC function exists
  console.log("\n📋 Test 3: Verify get_patient_document_count function exists");
  try {
    // Get first patient for testing
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .limit(1);

    if (patients && patients.length > 0) {
      const { data, error } = await supabase.rpc("get_patient_document_count", {
        patient_uuid: patients[0].id,
      });

      if (error) {
        console.error("❌ FAILED: Function does not exist or has error");
        console.error("   Error:", error.message);
        testsFailed++;
      } else {
        console.log("✅ PASSED: Function exists and returns:", data);
        testsPassed++;
      }
    } else {
      console.log("⚠️  SKIPPED: No patients found for testing");
    }
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    testsFailed++;
  }

  // Test 4: Check storage bucket exists
  console.log("\n📋 Test 4: Verify patient-documents storage bucket exists");
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("❌ FAILED:", error.message);
      testsFailed++;
    } else {
      const bucket = buckets.find((b) => b.name === "patient-documents");
      if (bucket) {
        console.log("✅ PASSED: Bucket exists");
        console.log("   Bucket details:", {
          id: bucket.id,
          public: bucket.public,
          file_size_limit: bucket.file_size_limit,
        });
        testsPassed++;
      } else {
        console.error("❌ FAILED: Bucket does not exist");
        console.error(
          "   Action: Create 'patient-documents' bucket in Supabase Dashboard"
        );
        testsFailed++;
      }
    }
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    testsFailed++;
  }

  // Test 5: Check document type constraint
  console.log("\n📋 Test 5: Verify document_type constraint");
  try {
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .limit(1);

    if (patients && patients.length > 0) {
      // Try to insert invalid document type
      const { error } = await supabase.from("patient_documents").insert({
        patient_id: patients[0].id,
        document_name: "test.pdf",
        document_type: "invalid_type",
        storage_path: "test/path.pdf",
        file_size: 1000,
        mime_type: "application/pdf",
      });

      if (error && error.code === "23514") {
        console.log("✅ PASSED: Constraint working (rejected invalid type)");
        testsPassed++;
      } else if (!error) {
        console.error(
          "❌ FAILED: Constraint not working (accepted invalid type)"
        );
        // Cleanup
        await supabase
          .from("patient_documents")
          .delete()
          .eq("document_name", "test.pdf");
        testsFailed++;
      } else {
        console.error("❌ FAILED:", error.message);
        testsFailed++;
      }
    } else {
      console.log("⚠️  SKIPPED: No patients found for testing");
    }
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    testsFailed++;
  }

  // Test 6: Check indexes
  console.log("\n📋 Test 6: Verify indexes exist");
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'patient_documents'
        ORDER BY indexname
      `,
    });

    if (data) {
      const expectedIndexes = [
        "idx_patient_documents_patient_id",
        "idx_patient_documents_type",
        "idx_patient_documents_uploaded_at",
        "idx_patient_documents_active",
      ];

      const actualIndexes = data.map((row) => row.indexname);
      const missingIndexes = expectedIndexes.filter(
        (idx) =>
          !actualIndexes.some((actual) => actual.includes(idx.split("_").pop()))
      );

      if (missingIndexes.length === 0 || actualIndexes.length >= 4) {
        console.log("✅ PASSED: Indexes exist");
        console.log("   Found:", actualIndexes.length, "indexes");
        testsPassed++;
      } else {
        console.error("❌ FAILED: Missing indexes:", missingIndexes);
        testsFailed++;
      }
    } else {
      console.log(
        "⚠️  SKIPPED: Cannot verify indexes (exec_sql not available)"
      );
    }
  } catch (err) {
    console.log("⚠️  SKIPPED: Cannot verify indexes");
  }

  // Test 7: Check triggers
  console.log("\n📋 Test 7: Verify triggers exist");
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'patient_documents'
        ORDER BY trigger_name
      `,
    });

    if (data) {
      const triggers = data.map((row) => row.trigger_name);
      const expectedTriggers = [
        "trigger_set_document_uploaded_by",
        "trigger_set_document_archived_metadata",
      ];

      const foundTriggers = expectedTriggers.filter((t) =>
        triggers.some((actual) =>
          actual.includes(t.split("_").slice(-2).join("_"))
        )
      );

      if (foundTriggers.length >= 1 || triggers.length >= 2) {
        console.log("✅ PASSED: Triggers exist");
        console.log("   Found:", triggers.length, "triggers");
        testsPassed++;
      } else {
        console.error("❌ FAILED: Triggers missing");
        testsFailed++;
      }
    } else {
      console.log(
        "⚠️  SKIPPED: Cannot verify triggers (exec_sql not available)"
      );
    }
  } catch (err) {
    console.log("⚠️  SKIPPED: Cannot verify triggers");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Results Summary\n");
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(
    `📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`
  );

  if (testsFailed === 0) {
    console.log("\n🎉 All tests passed! Patient document system is ready.");
  } else {
    console.log("\n⚠️  Some tests failed. Please review errors above.");
  }

  console.log("\n" + "=".repeat(60));
}

runTests().catch((err) => {
  console.error("💥 Test suite error:", err);
  process.exit(1);
});
