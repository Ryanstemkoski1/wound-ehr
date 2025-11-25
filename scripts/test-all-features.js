/**
 * Comprehensive System Test Suite
 * Tests all major features of the Wound EHR system
 */

require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, details = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);

  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function testAddendums() {
  console.log("\n🧪 TEST 3: ADDENDUM FUNCTIONALITY\n");

  try {
    // Get a signed visit
    const { data: visits } = await supabase
      .from("visits")
      .select("id, patient_id, status")
      .eq("status", "signed")
      .limit(1);

    if (!visits || visits.length === 0) {
      logTest(
        "Find signed visit",
        false,
        "No signed visits found - create one first"
      );
      return;
    }

    logTest("Find signed visit", true, `Visit ID: ${visits[0].id}`);

    const visitId = visits[0].id;

    // Test 1: Create addendum
    const testNote = `Test addendum created at ${new Date().toISOString()}`;
    const { data: newAddendum, error: createError } = await supabase
      .from("wound_notes")
      .insert({
        visit_id: visitId,
        note: testNote,
        note_type: "addendum",
        wound_id: null,
        created_by: "18aed806-f100-48f8-80a5-34aedb083583", // Use test user ID
      })
      .select()
      .single();

    if (createError) {
      logTest("Create addendum", false, `Error: ${createError.message}`);
      return;
    }

    logTest("Create addendum", true, `Created addendum ID: ${newAddendum.id}`);

    // Test 2: Read addendum back
    const { data: readAddendum, error: readError } = await supabase
      .from("wound_notes")
      .select("*")
      .eq("id", newAddendum.id)
      .single();

    if (readError) {
      logTest("Read addendum", false, `Error: ${readError.message}`);
    } else {
      logTest(
        "Read addendum",
        true,
        `Note: ${readAddendum.note.substring(0, 50)}...`
      );
    }

    // Test 3: Use RPC function to get addendums with user data
    const { data: rpcAddendums, error: rpcError } = await supabase.rpc(
      "get_visit_addendums",
      { p_visit_id: visitId }
    );

    if (rpcError) {
      logTest("RPC get_visit_addendums", false, `Error: ${rpcError.message}`);
    } else {
      const foundAddendum = rpcAddendums?.find((a) => a.id === newAddendum.id);
      if (foundAddendum && foundAddendum.users) {
        // users is already a JSONB array, not a string
        const userData = Array.isArray(foundAddendum.users)
          ? foundAddendum.users
          : JSON.parse(foundAddendum.users);
        logTest(
          "RPC get_visit_addendums",
          true,
          `Found addendum with user: ${userData[0]?.full_name || "Unknown"}`
        );
      } else {
        logTest(
          "RPC get_visit_addendums",
          false,
          "Addendum found but no user data"
        );
      }
    }

    // Test 4: Update visit addendum_count
    const { data: allAddendums } = await supabase
      .from("wound_notes")
      .select("id")
      .eq("visit_id", visitId)
      .eq("note_type", "addendum");

    const { error: updateError } = await supabase
      .from("visits")
      .update({ addendum_count: allAddendums?.length || 0 })
      .eq("id", visitId);

    if (updateError) {
      logTest("Update addendum count", false, `Error: ${updateError.message}`);
    } else {
      logTest(
        "Update addendum count",
        true,
        `Count: ${allAddendums?.length || 0}`
      );
    }

    // Cleanup: Delete test addendum
    await supabase.from("wound_notes").delete().eq("id", newAddendum.id);
  } catch (error) {
    logTest("Addendum tests", false, `Exception: ${error.message}`);
  }
}

async function testPatients() {
  console.log("\n🧪 TEST 4: PATIENT MANAGEMENT\n");

  try {
    // Test 1: List patients
    const { data: patients, error: listError } = await supabase
      .from("patients")
      .select("id, first_name, last_name, mrn")
      .limit(5);

    if (listError) {
      logTest("List patients", false, `Error: ${listError.message}`);
    } else {
      logTest("List patients", true, `Found ${patients?.length || 0} patients`);
    }

    if (patients && patients.length > 0) {
      const patient = patients[0];

      // Test 2: Get patient details
      const { data: details, error: detailsError } = await supabase
        .from("patients")
        .select("*, facility:facilities(name)")
        .eq("id", patient.id)
        .single();

      if (detailsError) {
        logTest("Get patient details", false, `Error: ${detailsError.message}`);
      } else {
        logTest(
          "Get patient details",
          true,
          `${details.first_name} ${details.last_name} - ${details.facility?.name || "No facility"}`
        );
      }

      // Test 3: Get patient wounds
      const { data: wounds, error: woundsError } = await supabase
        .from("wounds")
        .select("id, location, wound_type, status")
        .eq("patient_id", patient.id);

      if (woundsError) {
        logTest("Get patient wounds", false, `Error: ${woundsError.message}`);
      } else {
        logTest(
          "Get patient wounds",
          true,
          `Found ${wounds?.length || 0} wounds`
        );
      }
    }
  } catch (error) {
    logTest("Patient tests", false, `Exception: ${error.message}`);
  }
}

async function testVisitsAndSignatures() {
  console.log("\n🧪 TEST 5: VISITS & SIGNATURES\n");

  try {
    // Test 1: Get visits
    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("id, visit_date, visit_type, status")
      .limit(5);

    if (visitsError) {
      logTest("List visits", false, `Error: ${visitsError.message}`);
      return;
    }

    logTest("List visits", true, `Found ${visits?.length || 0} visits`);

    if (visits && visits.length > 0) {
      // Test 2: Get signed visits
      const signedVisits = visits.filter(
        (v) => v.status === "signed" || v.status === "submitted"
      );
      logTest(
        "Signed visits",
        true,
        `${signedVisits.length} of ${visits.length} are signed/submitted`
      );

      if (signedVisits.length > 0) {
        const visit = signedVisits[0];

        // Test 3: Get signature data
        const { data: visitDetails, error: detailsError } = await supabase
          .from("visits")
          .select(
            "*, provider_signature:signatures!provider_signature_id(*), patient_signature:signatures!patient_signature_id(*)"
          )
          .eq("id", visit.id)
          .single();

        if (detailsError) {
          logTest(
            "Get signature data",
            false,
            `Error: ${detailsError.message}`
          );
        } else {
          const hasProvider = !!visitDetails.provider_signature;
          const hasPatient = !!visitDetails.patient_signature;
          logTest(
            "Get signature data",
            true,
            `Provider: ${hasProvider}, Patient: ${hasPatient}`
          );
        }
      }
    }
  } catch (error) {
    logTest("Visit tests", false, `Exception: ${error.message}`);
  }
}

async function testAssessments() {
  console.log("\n🧪 TEST 6: WOUND ASSESSMENTS\n");

  try {
    // Test 1: Get assessments
    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select("id, wound_id, visit_id, length, width, depth, healing_status")
      .limit(5);

    if (assessmentsError) {
      logTest("List assessments", false, `Error: ${assessmentsError.message}`);
      return;
    }

    logTest(
      "List assessments",
      true,
      `Found ${assessments?.length || 0} assessments`
    );

    if (assessments && assessments.length > 0) {
      const assessment = assessments[0];

      // Test 2: Get assessment with wound and visit data
      const { data: details, error: detailsError } = await supabase
        .from("assessments")
        .select(
          "*, wound:wounds(location, wound_type), visit:visits(visit_date)"
        )
        .eq("id", assessment.id)
        .single();

      if (detailsError) {
        logTest(
          "Get assessment details",
          false,
          `Error: ${detailsError.message}`
        );
      } else {
        logTest(
          "Get assessment details",
          true,
          `Wound: ${details.wound?.location}, Date: ${details.visit?.visit_date}`
        );
      }

      // Test 3: Get photos for assessment
      const { data: photos, error: photosError } = await supabase
        .from("photos")
        .select("id, url, uploaded_at")
        .eq("assessment_id", assessment.id);

      if (photosError) {
        logTest(
          "Get assessment photos",
          false,
          `Error: ${photosError.message}`
        );
      } else {
        logTest(
          "Get assessment photos",
          true,
          `Found ${photos?.length || 0} photos`
        );
      }
    }
  } catch (error) {
    logTest("Assessment tests", false, `Exception: ${error.message}`);
  }
}

async function testBilling() {
  console.log("\n🧪 TEST 7: BILLING\n");

  try {
    // Test 1: Get billing records
    const { data: billings, error: billingsError } = await supabase
      .from("billings")
      .select("id, visit_id, cpt_codes, icd10_codes, time_spent")
      .limit(5);

    if (billingsError) {
      logTest("List billing records", false, `Error: ${billingsError.message}`);
      return;
    }

    logTest(
      "List billing records",
      true,
      `Found ${billings?.length || 0} billing records`
    );

    if (billings && billings.length > 0) {
      const billing = billings[0];

      // Test 2: Get billing with visit data
      const { data: details, error: detailsError } = await supabase
        .from("billings")
        .select(
          "*, visit:visits(visit_date, patient:patients(first_name, last_name))"
        )
        .eq("id", billing.id)
        .single();

      if (detailsError) {
        logTest("Get billing details", false, `Error: ${detailsError.message}`);
      } else {
        const cptCount = Array.isArray(details.cpt_codes)
          ? details.cpt_codes.length
          : 0;
        const icd10Count = Array.isArray(details.icd10_codes)
          ? details.icd10_codes.length
          : 0;
        logTest(
          "Get billing details",
          true,
          `CPT: ${cptCount}, ICD-10: ${icd10Count}, Time: ${details.time_spent}min`
        );
      }
    }

    // Test 3: Check procedure scopes
    const { data: procedures, error: proceduresError } = await supabase
      .from("procedure_scopes")
      .select("procedure_code, procedure_name, allowed_credentials")
      .limit(3);

    if (proceduresError) {
      logTest(
        "Get procedure scopes",
        false,
        `Error: ${proceduresError.message}`
      );
    } else {
      logTest(
        "Get procedure scopes",
        true,
        `Found ${procedures?.length || 0} procedure definitions`
      );
    }
  } catch (error) {
    logTest("Billing tests", false, `Exception: ${error.message}`);
  }
}

async function testRLSIsolation() {
  console.log("\n🧪 TEST 8: RLS & MULTI-TENANT ISOLATION\n");

  try {
    // Test 1: Tenants table RLS
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name");

    if (tenantsError) {
      logTest(
        "Tenants RLS (should work with service role)",
        false,
        `Error: ${tenantsError.message}`
      );
    } else {
      logTest(
        "Tenants RLS (service role can see all)",
        true,
        `Found ${tenants?.length || 0} tenants`
      );
    }

    // Test 2: User invites RLS
    const { data: invites, error: invitesError } = await supabase
      .from("user_invites")
      .select("id, email, role");

    if (invitesError) {
      logTest("User invites RLS", false, `Error: ${invitesError.message}`);
    } else {
      logTest(
        "User invites RLS (service role can see all)",
        true,
        `Found ${invites?.length || 0} invites`
      );
    }

    // Test 3: Check RLS is enabled
    const { data: rlsStatus } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('tenants', 'user_invites', 'wound_notes')
        ORDER BY tablename;
      `,
    });

    if (rlsStatus) {
      const tenantsRLS = rlsStatus.find(
        (t) => t.tablename === "tenants"
      )?.rowsecurity;
      const invitesRLS = rlsStatus.find(
        (t) => t.tablename === "user_invites"
      )?.rowsecurity;
      const woundNotesRLS = rlsStatus.find(
        (t) => t.tablename === "wound_notes"
      )?.rowsecurity;

      logTest(
        "Tenants RLS enabled",
        tenantsRLS === true,
        `Status: ${tenantsRLS}`
      );
      logTest(
        "User invites RLS enabled",
        invitesRLS === true,
        `Status: ${invitesRLS}`
      );
      logTest(
        "Wound notes RLS enabled",
        woundNotesRLS === true,
        `Status: ${woundNotesRLS}`
      );
    }

    // Test 4: Check user_roles RLS is disabled (by design)
    const { data: userRolesRLS } = await supabase.rpc("exec_sql", {
      sql: "SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles';",
    });

    if (userRolesRLS && userRolesRLS.length > 0) {
      const isDisabled = userRolesRLS[0].rowsecurity === false;
      logTest(
        "User roles RLS disabled (by design)",
        isDisabled,
        `Status: ${userRolesRLS[0].rowsecurity}`
      );
    }
  } catch (error) {
    logTest("RLS tests", false, `Exception: ${error.message}`);
  }
}

async function testAdmin() {
  console.log("\n🧪 TEST 9: ADMIN FUNCTIONALITY\n");

  try {
    // Test 1: Get facilities
    const { data: facilities, error: facilitiesError } = await supabase
      .from("facilities")
      .select("id, name, city, state, is_active")
      .limit(5);

    if (facilitiesError) {
      logTest("List facilities", false, `Error: ${facilitiesError.message}`);
    } else {
      const activeCount = facilities?.filter((f) => f.is_active).length || 0;
      logTest(
        "List facilities",
        true,
        `${activeCount} active of ${facilities?.length || 0} total`
      );
    }

    // Test 2: Get users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, name, credentials")
      .limit(5);

    if (usersError) {
      logTest("List users", false, `Error: ${usersError.message}`);
    } else {
      logTest("List users", true, `Found ${users?.length || 0} users`);
    }

    // Test 3: Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, tenant_id, role, facility_id")
      .limit(5);

    if (rolesError) {
      logTest("List user roles", false, `Error: ${rolesError.message}`);
    } else {
      logTest(
        "List user roles",
        true,
        `Found ${roles?.length || 0} role assignments`
      );
    }

    // Test 4: Test RPC function
    if (users && users.length > 0) {
      const { data: roleInfo, error: rpcError } = await supabase.rpc(
        "get_user_role_info",
        { user_uuid: users[0].id }
      );

      if (rpcError) {
        logTest("RPC get_user_role_info", false, `Error: ${rpcError.message}`);
      } else if (roleInfo && roleInfo.length > 0) {
        logTest(
          "RPC get_user_role_info",
          true,
          `User role: ${roleInfo[0].role}`
        );
      } else {
        logTest("RPC get_user_role_info", false, "No role data returned");
      }
    }
  } catch (error) {
    logTest("Admin tests", false, `Exception: ${error.message}`);
  }
}

async function testPDFData() {
  console.log("\n🧪 TEST 10: PDF GENERATION DATA\n");

  try {
    // Get a signed visit with addendums
    const { data: visits } = await supabase
      .from("visits")
      .select("id")
      .eq("status", "signed")
      .limit(1);

    if (!visits || visits.length === 0) {
      logTest("Find visit for PDF", false, "No signed visits found");
      return;
    }

    const visitId = visits[0].id;
    logTest("Find visit for PDF", true, `Visit ID: ${visitId}`);

    // Test RPC function for addendums (used in PDF)
    const { data: addendums, error: addendumsError } = await supabase.rpc(
      "get_visit_addendums",
      { p_visit_id: visitId }
    );

    if (addendumsError) {
      logTest(
        "Get addendums for PDF",
        false,
        `Error: ${addendumsError.message}`
      );
    } else {
      logTest(
        "Get addendums for PDF",
        true,
        `Found ${addendums?.length || 0} addendums with user data`
      );
    }
  } catch (error) {
    logTest("PDF tests", false, `Exception: ${error.message}`);
  }
}

async function runAllTests() {
  console.log("🚀 WOUND EHR - COMPREHENSIVE SYSTEM TEST");
  console.log("==========================================\n");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  await testAddendums();
  await testPatients();
  await testVisitsAndSignatures();
  await testAssessments();
  await testBilling();
  await testRLSIsolation();
  await testAdmin();
  await testPDFData();

  // Summary
  console.log("\n==========================================");
  console.log("📊 TEST SUMMARY");
  console.log("==========================================\n");
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(
    `Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%\n`
  );

  if (testResults.failed > 0) {
    console.log("Failed Tests:");
    testResults.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  ❌ ${t.name}: ${t.details}`);
      });
    console.log("");
  }

  const exitCode = testResults.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

runAllTests().catch((err) => {
  console.error("❌ Fatal test error:", err);
  process.exit(1);
});
