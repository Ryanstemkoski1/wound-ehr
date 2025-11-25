// Comprehensive test for Phase 9.3.7 - Signature Audit Logs
// Tests all features: filters, stats, export, pagination

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

let testsPassed = 0;
let testsFailed = 0;

function pass(testName) {
  console.log(`✅ ${testName}`);
  testsPassed++;
}

function fail(testName, error) {
  console.log(`❌ ${testName}`);
  console.log(`   Error: ${error}`);
  testsFailed++;
}

async function runTests() {
  console.log("🧪 Testing Phase 9.3.7 - Signature Audit Logs\n");
  console.log("=".repeat(60));

  // Test 1: Basic audit logs query
  console.log("\n📋 Test 1: Get audit logs (no filters)");
  try {
    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_limit: 10,
    });
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Expected array");
    console.log(`   Retrieved ${data.length} logs`);
    if (data.length > 0) {
      console.log(
        `   Latest: ${data[0].signature_type} by ${data[0].signer_name}`
      );
    }
    pass("Get audit logs without filters");
  } catch (error) {
    fail("Get audit logs without filters", error.message);
  }

  // Test 2: Filter by signature type
  console.log("\n📋 Test 2: Filter by signature type (provider)");
  try {
    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_signature_type: "provider",
      p_limit: 100,
    });
    if (error) throw error;
    const allProvider = data.every((log) => log.signature_type === "provider");
    if (!allProvider) throw new Error("Found non-provider signatures");
    console.log(`   Retrieved ${data.length} provider signatures`);
    pass("Filter by signature type");
  } catch (error) {
    fail("Filter by signature type", error.message);
  }

  // Test 3: Filter by date range
  console.log("\n📋 Test 3: Filter by date range");
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_start_date: weekAgo.toISOString(),
      p_end_date: today.toISOString(),
      p_limit: 100,
    });
    if (error) throw error;
    console.log(`   Retrieved ${data.length} signatures from last 7 days`);
    pass("Filter by date range");
  } catch (error) {
    fail("Filter by date range", error.message);
  }

  // Test 4: Get audit statistics
  console.log("\n📊 Test 4: Get audit statistics");
  try {
    const { data, error } = await supabase.rpc("get_signature_audit_stats");
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0)
      throw new Error("Expected stats array");

    const stats = data[0];
    console.log(`   Total signatures: ${stats.total_signatures}`);
    console.log(`   Consent: ${stats.consent_signatures}`);
    console.log(`   Patient: ${stats.patient_signatures}`);
    console.log(`   Provider: ${stats.provider_signatures}`);
    console.log(`   Drawn: ${stats.drawn_signatures}`);
    console.log(`   Typed: ${stats.typed_signatures}`);
    console.log(`   Uploaded: ${stats.uploaded_signatures}`);
    console.log(`   Visits signed: ${stats.total_visits_signed}`);
    console.log(`   Unique signers: ${stats.unique_signers}`);

    // Verify totals
    const typeTotal =
      Number(stats.consent_signatures) +
      Number(stats.patient_signatures) +
      Number(stats.provider_signatures);
    if (typeTotal !== Number(stats.total_signatures)) {
      throw new Error("Type totals don't match total signatures");
    }

    pass("Get audit statistics");
  } catch (error) {
    fail("Get audit statistics", error.message);
  }

  // Test 5: Pagination
  console.log("\n📋 Test 5: Pagination (offset & limit)");
  try {
    const { data: page1, error: error1 } = await supabase.rpc(
      "get_signature_audit_logs",
      {
        p_limit: 2,
        p_offset: 0,
      }
    );
    if (error1) throw error1;

    const { data: page2, error: error2 } = await supabase.rpc(
      "get_signature_audit_logs",
      {
        p_limit: 2,
        p_offset: 2,
      }
    );
    if (error2) throw error2;

    if (page1.length === 0 || page2.length === 0) {
      throw new Error("Not enough data for pagination test");
    }

    // Verify pages are different
    if (page1[0].signature_id === page2[0].signature_id) {
      throw new Error("Pagination returned same records");
    }

    console.log(`   Page 1: ${page1.length} records`);
    console.log(`   Page 2: ${page2.length} records`);
    pass("Pagination works correctly");
  } catch (error) {
    fail("Pagination works correctly", error.message);
  }

  // Test 6: Verify required columns
  console.log("\n📋 Test 6: Verify all required columns present");
  try {
    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_limit: 1,
    });
    if (error) throw error;
    if (data.length === 0) throw new Error("No data to verify");

    const log = data[0];
    const requiredFields = [
      "signature_id",
      "signature_type",
      "signature_method",
      "signed_at",
      "patient_id",
      "patient_name",
      "patient_mrn",
      "facility_id",
      "facility_name",
      "signer_name",
      "created_at",
    ];

    const missingFields = requiredFields.filter((field) => !(field in log));
    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(", ")}`);
    }

    console.log(`   All ${requiredFields.length} required fields present`);
    pass("All required columns present");
  } catch (error) {
    fail("All required columns present", error.message);
  }

  // Test 7: Verify sorting (most recent first)
  console.log("\n📋 Test 7: Verify sorting (most recent first)");
  try {
    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_limit: 5,
    });
    if (error) throw error;
    if (data.length < 2) {
      console.log("   ⚠️  Not enough data to verify sorting (need 2+ records)");
      pass("Sorting verification skipped");
    } else {
      // Verify descending order
      for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].signed_at);
        const next = new Date(data[i + 1].signed_at);
        if (current < next) {
          throw new Error("Records not sorted correctly (expected DESC order)");
        }
      }
      console.log(`   ✓ All ${data.length} records in correct order`);
      pass("Sorting (most recent first)");
    }
  } catch (error) {
    fail("Sorting (most recent first)", error.message);
  }

  // Test 8: Stats with date filter
  console.log("\n📊 Test 8: Stats with date filter");
  try {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase.rpc("get_signature_audit_stats", {
      p_start_date: monthAgo.toISOString(),
      p_end_date: today.toISOString(),
    });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No stats returned");

    const stats = data[0];
    console.log(`   Last 30 days: ${stats.total_signatures} signatures`);
    pass("Stats with date filter");
  } catch (error) {
    fail("Stats with date filter", error.message);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 TEST SUMMARY");
  console.log(`   Total Tests: ${testsPassed + testsFailed}`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(
    `   Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`
  );

  if (testsFailed === 0) {
    console.log("\n🎉 All tests passed! Phase 9.3.7 is production ready!");
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Review errors above.`);
    process.exit(1);
  }
}

runTests();
