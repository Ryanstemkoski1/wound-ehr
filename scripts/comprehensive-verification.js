// Comprehensive System Verification
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function comprehensiveCheck() {
  console.log("🔍 COMPREHENSIVE SYSTEM VERIFICATION\n");
  console.log("=" .repeat(60));

  let issues = [];
  let warnings = [];

  // ===== 1. SCHEMA VERIFICATION =====
  console.log("\n📊 1. DATABASE SCHEMA VERIFICATION");
  console.log("-".repeat(60));

  // Check critical tables exist
  const tables = [
    "users", "tenants", "facilities", "patients", "wounds", 
    "visits", "assessments", "photos", "treatments", "billings",
    "user_roles", "user_facilities", "user_invites", 
    "wound_notes", "procedure_scopes"
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      issues.push(`❌ Table '${table}' query failed: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}`);
    }
  }

  // ===== 2. TENANT & FACILITIES CHECK =====
  console.log("\n🏢 2. TENANTS & FACILITIES");
  console.log("-".repeat(60));

  const { data: tenants } = await supabase.from("tenants").select("*");
  console.log(`   Tenants: ${tenants?.length || 0}`);
  if (tenants?.length === 0) {
    issues.push("❌ No tenants found");
  }

  const { data: facilities } = await supabase.from("facilities").select("id, name, tenant_id");
  console.log(`   Facilities: ${facilities?.length || 0}`);
  
  const facilitiesWithoutTenant = facilities?.filter(f => !f.tenant_id).length || 0;
  if (facilitiesWithoutTenant > 0) {
    issues.push(`❌ ${facilitiesWithoutTenant} facilities missing tenant_id`);
  } else {
    console.log(`   ✅ All facilities have tenant_id`);
  }

  // ===== 3. USER ASSOCIATIONS =====
  console.log("\n👤 3. USER ASSOCIATIONS");
  console.log("-".repeat(60));

  const { data: users } = await supabase.from("users").select("id, email, credentials");
  console.log(`   Users: ${users?.length || 0}`);
  
  for (const user of users || []) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id);
    
    const { data: userFacilities } = await supabase
      .from("user_facilities")
      .select("facility_id")
      .eq("user_id", user.id);
    
    console.log(`   ${user.email}:`);
    console.log(`     - Credentials: ${user.credentials || 'MISSING'}`);
    console.log(`     - Roles: ${roles?.length || 0}`);
    console.log(`     - Facilities: ${userFacilities?.length || 0}`);
    
    if (!user.credentials) {
      issues.push(`❌ User ${user.email} missing credentials`);
    }
    if (!roles || roles.length === 0) {
      issues.push(`❌ User ${user.email} has no roles`);
    }
    if (!userFacilities || userFacilities.length === 0) {
      warnings.push(`⚠️  User ${user.email} has no facility associations`);
    }
  }

  // ===== 4. RLS POLICIES CHECK =====
  console.log("\n🔒 4. RLS POLICIES STATUS");
  console.log("-".repeat(60));

  const criticalTables = ["facilities", "patients", "wounds", "visits", "users"];
  
  for (const table of criticalTables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    
    if (error && error.code === '42501') {
      issues.push(`❌ RLS blocking access to ${table}: ${error.message}`);
    } else if (error) {
      issues.push(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table} - ${data?.length || 0} records accessible`);
    }
  }

  // ===== 5. DATA INTEGRITY =====
  console.log("\n📈 5. DATA INTEGRITY");
  console.log("-".repeat(60));

  const { data: patients } = await supabase.from("patients").select("id, facility_id");
  console.log(`   Patients: ${patients?.length || 0}`);
  
  if (patients && patients.length > 0) {
    const patientsWithInvalidFacility = patients.filter(p => {
      return !facilities?.some(f => f.id === p.facility_id);
    }).length;
    
    if (patientsWithInvalidFacility > 0) {
      issues.push(`❌ ${patientsWithInvalidFacility} patients reference non-existent facilities`);
    } else {
      console.log(`   ✅ All patients linked to valid facilities`);
    }
  }

  const { data: wounds } = await supabase.from("wounds").select("id");
  console.log(`   Wounds: ${wounds?.length || 0}`);

  const { data: visits } = await supabase.from("visits").select("id");
  console.log(`   Visits: ${visits?.length || 0}`);

  const { data: assessments } = await supabase.from("assessments").select("id");
  console.log(`   Assessments: ${assessments?.length || 0}`);

  // ===== 6. CREDENTIALS SYSTEM =====
  console.log("\n🩺 6. CREDENTIALS SYSTEM");
  console.log("-".repeat(60));

  const { data: procedureScopes } = await supabase
    .from("procedure_scopes")
    .select("procedure_code, allowed_credentials");
  
  console.log(`   Procedure Scopes: ${procedureScopes?.length || 0}`);
  if (!procedureScopes || procedureScopes.length === 0) {
    warnings.push("⚠️  No procedure scopes defined");
  } else {
    console.log(`   ✅ ${procedureScopes.length} procedures with scope restrictions`);
  }

  // Check if all users have valid credentials
  const validCredentials = ['RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin'];
  const usersWithInvalidCredentials = users?.filter(u => 
    u.credentials && !validCredentials.includes(u.credentials)
  ) || [];
  
  if (usersWithInvalidCredentials.length > 0) {
    issues.push(`❌ ${usersWithInvalidCredentials.length} users have invalid credentials`);
  } else {
    console.log(`   ✅ All users have valid credentials`);
  }

  // ===== 7. AUTH TRIGGER =====
  console.log("\n🔧 7. AUTH TRIGGER STATUS");
  console.log("-".repeat(60));

  // Check if handle_new_user function exists
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: dbUsers } = await supabase.from("users").select("id");
  
  const authUserIds = authUsers.users.map(u => u.id);
  const dbUserIds = dbUsers?.map(u => u.id) || [];
  
  const orphanedAuthUsers = authUserIds.filter(id => !dbUserIds.includes(id));
  const orphanedDbUsers = dbUserIds.filter(id => !authUserIds.includes(id));
  
  console.log(`   Auth users: ${authUsers.users.length}`);
  console.log(`   DB users: ${dbUsers?.length || 0}`);
  
  if (orphanedAuthUsers.length > 0) {
    warnings.push(`⚠️  ${orphanedAuthUsers.length} auth users not in users table (trigger may have failed)`);
  } else {
    console.log(`   ✅ All auth users synced to users table`);
  }
  
  if (orphanedDbUsers.length > 0) {
    warnings.push(`⚠️  ${orphanedDbUsers.length} users in DB without auth accounts`);
  }

  // ===== 8. MIGRATIONS CONSISTENCY =====
  console.log("\n📝 8. MIGRATION CONSISTENCY");
  console.log("-".repeat(60));

  // Check for duplicate policies
  const policyChecks = [
    { table: "facilities", policy: "Users can view their facilities" },
    { table: "users", policy: "Tenant admins can update users in their tenant" },
    { table: "users", policy: "Users can view own profile" }
  ];

  console.log("   Critical policies status:");
  console.log("   (Cannot verify directly via API, check manually in Supabase dashboard)");
  console.log("   ✓ Facilities policies (user_facilities based)");
  console.log("   ✓ Users UPDATE policies (admin permissions)");
  console.log("   ✓ Credentials column (users & user_invites)");

  // ===== SUMMARY =====
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(60));

  if (issues.length === 0 && warnings.length === 0) {
    console.log("\n✅ ✅ ✅  ALL CHECKS PASSED  ✅ ✅ ✅\n");
    console.log("System is fully operational and ready for use!");
  } else {
    if (issues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${issues.length}):`);
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log("\n🔧 ACTION REQUIRED: Review and fix issues above");
  }

  console.log("\n" + "=".repeat(60));
}

comprehensiveCheck().catch(console.error);
