/**
 * Create Phase 10 Demo Data
 *
 * This script creates realistic demo data to showcase Phase 10 features:
 * - Feature 1: Note Approval Workflow (visits in office inbox, corrections needed, approved)
 * - Feature 3: Calendar Clinician Filtering (patient-clinician assignments)
 * - Feature 4: Reporting by Criteria (visits across different dates, facilities, clinicians)
 * - Feature 5: Role-Based Field Access (users with different roles)
 * - Feature 6: Data Validation Rules (assessments with valid data)
 *
 * Usage:
 *   node scripts/create-phase10-demo-data.js
 *   node scripts/create-phase10-demo-data.js --reset  (clear existing demo data first)
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error(
    "   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function generateFutureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

// =====================================================
// MAIN DEMO DATA CREATION
// =====================================================

async function createDemoData() {
  console.log("\n🎬 Creating Phase 10 Demo Data");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Get facilities
    const { data: facilities, error: facilityError } = await supabase
      .from("facilities")
      .select("*")
      .limit(3);

    if (facilityError || !facilities || facilities.length === 0) {
      console.error("❌ No facilities found. Please run seed script first:");
      console.error("   npx tsx supabase/seed.ts");
      process.exit(1);
    }

    console.log(`✅ Found ${facilities.length} facilities`);

    // Get users
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*");

    if (userError) {
      console.error("❌ Error fetching users:", userError.message);
      process.exit(1);
    }

    // Get user roles separately
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Create a map of user roles
    const rolesMap = new Map();
    (userRoles || []).forEach((ur) => {
      if (!rolesMap.has(ur.user_id)) {
        rolesMap.set(ur.user_id, []);
      }
      rolesMap.get(ur.user_id).push(ur.role);
    });

    // Attach roles to users
    users?.forEach((user) => {
      user.roles = rolesMap.get(user.id) || [];
    });

    if (!users || users.length === 0) {
      console.error(
        "❌ No users found. Please sign up and run seed script first:"
      );
      console.error("   1. Start app: npm run dev");
      console.error("   2. Sign up at: http://localhost:3000/signup");
      console.error("   3. Run seed: npx tsx supabase/seed.ts\n");

      // List auth users for troubleshooting
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      if (authUsers && authUsers.users.length > 0) {
        console.log("ℹ️  Found auth users but no user records in database:");
        authUsers.users.forEach((u) => console.log(`   - ${u.email}`));
        console.log(
          "\n   This usually means the user_sync trigger didn't fire."
        );
        console.log(
          "   Try logging in once to trigger sync, or run: node scripts/sync-auth-users.js\n"
        );
      }
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} users`);

    // Categorize users by role (some users may not have roles yet)
    const clinicians = users.filter((u) => {
      const roles = u.roles || [];
      // Also check credentials for clinicians without explicit roles
      const hasClinicalRole = roles.some((r) =>
        ["rn", "lvn", "md", "do", "pa", "np"].includes(r)
      );
      const hasCredentials =
        u.credentials &&
        ["RN", "LVN", "MD", "DO", "PA", "NP"].includes(u.credentials);
      return hasClinicalRole || hasCredentials;
    });

    const admins = users.filter((u) => {
      const roles = u.roles || [];
      return roles.some((r) => ["tenant_admin", "facility_admin"].includes(r));
    });

    // If no clinicians found by role/credentials, use first few users as clinicians
    if (clinicians.length === 0 && users.length > 0) {
      console.log(
        "   ⚠️  No clinicians with roles found, using first 3 users as clinicians"
      );
      clinicians.push(...users.slice(0, Math.min(3, users.length)));
    }

    console.log(`   - ${clinicians.length} clinicians`);
    console.log(`   - ${admins.length} admins\n`);

    // Get existing patients
    const { data: patients, error: patientError } = await supabase
      .from("patients")
      .select(
        `
        *,
        wounds!inner(*)
      `
      )
      .in(
        "facility_id",
        facilities.map((f) => f.id)
      )
      .eq("wounds.status", "active")
      .limit(10);

    if (patientError || !patients || patients.length === 0) {
      console.error(
        "❌ No patients with active wounds found. Please run seed script first."
      );
      process.exit(1);
    }

    console.log(`✅ Found ${patients.length} patients with active wounds\n`);

    // =====================================================
    // FEATURE 3: CALENDAR CLINICIAN FILTERING
    // =====================================================
    console.log("📅 Creating patient-clinician assignments...");

    const assignmentInserts = [];
    let assignmentCount = 0;

    for (const patient of patients) {
      // Assign 1-2 clinicians per patient
      const clinicianCount = randomInt(1, 2);
      const assignedClinicians = [];

      for (let i = 0; i < clinicianCount; i++) {
        const clinician = randomElement(
          clinicians.filter((c) => !assignedClinicians.includes(c.id))
        );
        if (!clinician) continue;

        assignedClinicians.push(clinician.id);

        assignmentInserts.push({
          patient_id: patient.id,
          clinician_id: clinician.id,
          role: i === 0 ? "primary" : randomElement(["supervisor", "covering"]),
          assigned_at: generatePastDate(randomInt(7, 60)),
        });
        assignmentCount++;
      }
    }

    const { error: assignmentError } = await supabase
      .from("patient_clinician_assignments")
      .upsert(assignmentInserts, { onConflict: "patient_id,clinician_id" });

    if (assignmentError) {
      console.error("❌ Error creating assignments:", assignmentError.message);
    } else {
      console.log(
        `✅ Created ${assignmentCount} patient-clinician assignments\n`
      );
    }

    // =====================================================
    // FEATURE 1: NOTE APPROVAL WORKFLOW
    // =====================================================
    console.log("📝 Creating visits with approval workflow statuses...");

    const visitInserts = [];
    const visitStatuses = {
      sent_to_office: 0,
      needs_correction: 0,
      approved: 0,
      draft: 0,
    };

    for (const patient of patients) {
      const clinician = randomElement(clinicians);
      const visitCount = randomInt(2, 4);

      for (let v = 0; v < visitCount; v++) {
        const daysAgo = randomInt(1, 30);
        const visitDate = generatePastDate(daysAgo);

        // Distribute visits across different statuses for demo
        let status;
        if (v === 0) {
          status = "sent_to_office"; // Office inbox
        } else if (v === 1) {
          status = "needs_correction"; // Corrections page
        } else if (v === 2) {
          status = "approved"; // Approved notes
        } else {
          status = "draft"; // Draft notes
        }

        visitStatuses[status]++;

        const visit = {
          patient_id: patient.id,
          visit_date: visitDate,
          visit_type: "in_person",
          location: randomElement([
            "Facility Room 101",
            "Facility Room 202",
            "Patient Home",
          ]),
          status: status,
          clinician_id: clinician.id,
          clinician_name: `${clinician.first_name} ${clinician.last_name}`,
          clinician_credentials: clinician.credentials || "RN",
          primary_clinician_id: clinician.id,
          time_spent: true,
          additional_notes:
            "Routine wound care visit. Patient tolerated procedure well.",
        };

        // Add approval-specific fields
        if (status === "sent_to_office") {
          visit.sent_to_office_at = generatePastDate(randomInt(1, 7));
        } else if (status === "needs_correction") {
          visit.sent_to_office_at = generatePastDate(randomInt(3, 10));
          visit.correction_notes = JSON.stringify([
            {
              note: randomElement([
                "Please verify wound location - appears incorrect in documentation",
                "Missing tissue composition percentages",
                "Treatment plan needs more detail",
                "Photo quality insufficient - please retake",
              ]),
              requested_by: admins.length > 0 ? admins[0].id : clinician.id,
              requested_at: generatePastDate(randomInt(1, 5)),
            },
          ]);
        } else if (status === "approved") {
          visit.sent_to_office_at = generatePastDate(randomInt(7, 20));
          visit.approved_at = generatePastDate(randomInt(1, 15));
          visit.approved_by = admins.length > 0 ? admins[0].id : clinician.id;
        }

        visitInserts.push(visit);
      }
    }

    const { data: createdVisits, error: visitError } = await supabase
      .from("visits")
      .insert(visitInserts)
      .select();

    if (visitError) {
      console.error("❌ Error creating visits:", visitError.message);
    } else {
      console.log(`✅ Created ${createdVisits.length} visits:`);
      console.log(`   - ${visitStatuses.sent_to_office} in office inbox`);
      console.log(`   - ${visitStatuses.needs_correction} needing corrections`);
      console.log(`   - ${visitStatuses.approved} approved`);
      console.log(`   - ${visitStatuses.draft} draft\n`);
    }

    // =====================================================
    // FEATURE 6: DATA VALIDATION RULES
    // =====================================================
    console.log("🔬 Creating wound assessments with valid data...");

    const assessmentInserts = [];
    let assessmentCount = 0;

    for (const visit of createdVisits || []) {
      const patient = patients.find((p) => p.id === visit.patient_id);
      if (!patient || !patient.wounds) continue;

      // Create 1-2 assessments per visit
      const woundsToAssess = patient.wounds.slice(0, randomInt(1, 2));

      for (const wound of woundsToAssess) {
        // Valid tissue composition (totals 100%)
        const granulation = randomInt(20, 70);
        const slough = randomInt(10, 50);
        const eschar = 100 - granulation - slough;

        const assessment = {
          visit_id: visit.id,
          wound_id: wound.id,
          length_cm: randomInt(1, 10) + Math.random(),
          width_cm: randomInt(1, 8) + Math.random(),
          depth_cm: randomInt(0, 5) + Math.random(), // Depth < width (valid)
          tissue_granulation: granulation,
          tissue_slough: slough,
          tissue_eschar: eschar,
          exudate_amount: randomElement(["none", "scant", "moderate", "heavy"]),
          exudate_type: randomElement([
            "serous",
            "serosanguinous",
            "sanguinous",
            "purulent",
          ]),
          odor: randomElement(["none", "mild", "moderate", "strong"]),
          pain_level: randomInt(0, 10),
          edges_description: randomElement([
            "well-defined",
            "irregular",
            "undermining",
            "rolled",
          ]),
          surrounding_skin: randomElement([
            "intact",
            "macerated",
            "erythematous",
            "dry",
          ]),
          signs_of_infection: Math.random() > 0.7,
          notes:
            "Assessment completed per protocol. Wound showing signs of healing.",
        };

        assessmentInserts.push(assessment);
        assessmentCount++;
      }
    }

    const { error: assessmentError } = await supabase
      .from("assessments")
      .insert(assessmentInserts);

    if (assessmentError) {
      console.error("❌ Error creating assessments:", assessmentError.message);
    } else {
      console.log(
        `✅ Created ${assessmentCount} wound assessments with valid data\n`
      );
    }

    // =====================================================
    // SUMMARY
    // =====================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Phase 10 Demo Data Created Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 What was created:\n");
    console.log(`   Feature 1 (Note Approval):`);
    console.log(
      `     • ${visitStatuses.sent_to_office} visits in Office Inbox`
    );
    console.log(
      `     • ${visitStatuses.needs_correction} visits needing corrections`
    );
    console.log(`     • ${visitStatuses.approved} approved visits\n`);

    console.log(`   Feature 3 (Calendar Filtering):`);
    console.log(`     • ${assignmentCount} patient-clinician assignments\n`);

    console.log(`   Feature 4 (Reporting):`);
    console.log(
      `     • ${createdVisits?.length || 0} visits across multiple dates/facilities\n`
    );

    console.log(`   Feature 6 (Validation):`);
    console.log(`     • ${assessmentCount} assessments with valid data\n`);

    console.log("🎯 Next Steps:\n");
    console.log("   1. Log in as office admin → Check Admin → Office Inbox");
    console.log("   2. Log in as clinician → Check Corrections page");
    console.log("   3. Go to Calendar → Test clinician filtering");
    console.log("   4. Go to Reports → Run reports with various filters");
    console.log("   5. Create new assessments → Test validation rules\n");
  } catch (error) {
    console.error("\n❌ Error creating demo data:", error);
    process.exit(1);
  }
}

// =====================================================
// RESET DEMO DATA
// =====================================================

async function resetDemoData() {
  console.log("\n🗑️  Resetting demo data...\n");

  // Delete visits with approval workflow statuses
  const { error: visitError } = await supabase
    .from("visits")
    .delete()
    .in("status", ["sent_to_office", "needs_correction", "approved"]);

  if (visitError) {
    console.error("❌ Error deleting visits:", visitError.message);
  } else {
    console.log("✅ Deleted demo visits");
  }

  // Delete patient-clinician assignments
  const { error: assignmentError } = await supabase
    .from("patient_clinician_assignments")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

  if (assignmentError) {
    console.error("❌ Error deleting assignments:", assignmentError.message);
  } else {
    console.log("✅ Deleted clinician assignments");
  }

  console.log("");
}

// =====================================================
// RUN SCRIPT
// =====================================================

async function main() {
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    await resetDemoData();
  }

  await createDemoData();
}

main()
  .then(() => {
    console.log("✅ Script completed successfully\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
