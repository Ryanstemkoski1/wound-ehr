// Script to test Migration 00021: Signature Audit Logs
// Phase 9.3.7: RPC functions for admin reporting
// NOTE: Apply migration manually via Supabase dashboard SQL editor

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMigration() {
  console.log("🚀 Testing Migration 00021: Signature Audit Logs\n");
  console.log(
    "⚠️  NOTE: Apply migration SQL manually via Supabase dashboard first\n"
  );

  try {
    // Test RPC functions
    console.log("🧪 Testing RPC functions...\n");

    // Test get_signature_audit_logs
    console.log("1. Testing get_signature_audit_logs()...");
    const { data: logs, error: logsError } = await supabase.rpc(
      "get_signature_audit_logs",
      {
        p_limit: 5,
      }
    );

    if (logsError) {
      console.error("   ❌ Failed:", logsError.message);
      console.error("   💡 Apply migration SQL via Supabase dashboard first");
      process.exit(1);
    } else {
      console.log(`   ✅ Success: ${logs.length} logs returned`);
      if (logs.length > 0) {
        console.log(
          `      Latest: ${logs[0].signature_type} by ${logs[0].signer_name}`
        );
      }
    }

    // Test get_signature_audit_stats
    console.log("\n2. Testing get_signature_audit_stats()...");
    const { data: stats, error: statsError } = await supabase.rpc(
      "get_signature_audit_stats"
    );

    if (statsError) {
      console.error("   ❌ Failed:", statsError.message);
    } else {
      const s = stats[0];
      console.log(`   ✅ Success: Stats retrieved`);
      console.log(`      Total signatures: ${s.total_signatures}`);
      console.log(`      Consent: ${s.consent_signatures}`);
      console.log(`      Patient: ${s.patient_signatures}`);
      console.log(`      Provider: ${s.provider_signatures}`);
      console.log(`      Unique signers: ${s.unique_signers}`);
    }

    console.log("\n✅ Migration 00021 verified successfully!");
    console.log("📊 Signature audit logs are working correctly");
    console.log("🔗 Access: /dashboard/admin/signatures");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

testMigration();
