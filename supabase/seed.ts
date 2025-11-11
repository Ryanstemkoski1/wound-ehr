// Supabase Seed Script
// Run with: npx tsx supabase/seed.ts

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for seeding

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Sample data arrays
const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Barbara",
  "David",
  "Elizabeth",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Christopher",
  "Nancy",
  "Daniel",
  "Lisa",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Dorothy",
  "Kevin",
  "Carol",
  "Brian",
  "Amanda",
  "George",
  "Melissa",
  "Edward",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Timothy",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
  "Nicholas",
  "Shirley",
  "Eric",
  "Angela",
  "Jonathan",
  "Helen",
  "Stephen",
  "Anna",
  "Larry",
  "Brenda",
  "Justin",
  "Pamela",
  "Scott",
  "Nicole",
  "Brandon",
  "Emma",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
  "Cook",
  "Rogers",
  "Gutierrez",
  "Ortiz",
  "Morgan",
  "Cooper",
  "Peterson",
  "Bailey",
  "Reed",
  "Kelly",
  "Howard",
  "Ramos",
  "Kim",
  "Cox",
  "Ward",
  "Richardson",
];

const streets = [
  "Main Street",
  "Oak Avenue",
  "Maple Drive",
  "Cedar Lane",
  "Pine Road",
  "Elm Street",
  "Washington Boulevard",
  "Park Avenue",
  "Broadway",
  "First Street",
  "Second Avenue",
  "Third Street",
  "Fourth Avenue",
  "Lincoln Road",
  "Jefferson Drive",
  "Madison Avenue",
  "Monroe Street",
  "Adams Boulevard",
  "Jackson Lane",
  "Harrison Road",
];

const cities = [
  { name: "Springfield", state: "IL", zip: "62701" },
  { name: "Chicago", state: "IL", zip: "60601" },
  { name: "Peoria", state: "IL", zip: "61602" },
  { name: "Rockford", state: "IL", zip: "61101" },
  { name: "Naperville", state: "IL", zip: "60540" },
  { name: "Joliet", state: "IL", zip: "60432" },
  { name: "Aurora", state: "IL", zip: "60505" },
  { name: "Champaign", state: "IL", zip: "61820" },
];

const allergies = [
  "Penicillin",
  "Sulfa drugs",
  "Latex",
  "Iodine",
  "Aspirin",
  "Codeine",
  "Morphine",
  "Adhesive tape",
  "Shellfish",
  "Peanuts",
  "Bee stings",
  "Contrast dye",
  "Erythromycin",
  "Tetracycline",
];

const conditions = [
  "Hypertension",
  "Type 2 Diabetes",
  "Hyperlipidemia",
  "Coronary Artery Disease",
  "Atrial Fibrillation",
  "Chronic Kidney Disease",
  "COPD",
  "Asthma",
  "Osteoarthritis",
  "Rheumatoid Arthritis",
  "Depression",
  "Anxiety",
  "Hypothyroidism",
  "Obesity",
  "Sleep Apnea",
  "GERD",
  "Osteoporosis",
];

const insuranceProviders = [
  "Blue Cross Blue Shield",
  "United Healthcare",
  "Aetna",
  "Cigna",
  "Humana",
  "Medicare",
  "Medicaid",
  "Kaiser Permanente",
  "Anthem",
  "WellCare",
  "Molina Healthcare",
  "Centene",
];

// Helper functions
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const area = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${area}) ${prefix}-${line}`;
}

function generateMRN(): string {
  return randomInt(100000, 999999).toString();
}

function generateAllergies(): string[] {
  const count = Math.random() < 0.3 ? 0 : randomInt(1, 3);
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    const allergy = randomElement(allergies);
    if (!selected.includes(allergy)) {
      selected.push(allergy);
    }
  }
  return selected;
}

function generateMedicalHistory(): string[] {
  const count = Math.random() < 0.2 ? 0 : randomInt(1, 4);
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    const condition = randomElement(conditions);
    if (!selected.includes(condition)) {
      selected.push(condition);
    }
  }
  return selected;
}

function generateInsurance() {
  const hasPrimary = Math.random() > 0.1;
  const hasSecondary = Math.random() > 0.7;

  return {
    primary: hasPrimary
      ? {
          provider: randomElement(insuranceProviders),
          policyNumber: `POL${randomInt(100000, 999999)}`,
          groupNumber: `GRP${randomInt(1000, 9999)}`,
        }
      : null,
    secondary: hasSecondary
      ? {
          provider: randomElement(insuranceProviders),
          policyNumber: `POL${randomInt(100000, 999999)}`,
          groupNumber: `GRP${randomInt(1000, 9999)}`,
        }
      : null,
  };
}

function generateEmergencyContact() {
  const relationships = [
    "Spouse",
    "Child",
    "Parent",
    "Sibling",
    "Friend",
    "Other",
  ];
  return {
    name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
    phone: generatePhone(),
    relationship: randomElement(relationships),
  };
}

// CPT codes for wound care
const cptCodes = [
  "97597", // Debridement (selective)
  "97598", // Debridement (non-selective)
  "97602", // Wound care
  "11042", // Debridement subcutaneous
  "11043", // Debridement muscle/fascia
  "99211", // Office visit (established)
  "99212", // Office visit (established)
  "99213", // Office visit (established)
];

// ICD-10 codes for wound diagnoses
const icd10Codes = [
  "L89.154", // Pressure ulcer sacrum stage 4
  "L89.143", // Pressure ulcer sacrum stage 3
  "L97.919", // Non-pressure chronic ulcer of unspecified part of unspecified lower leg
  "E11.621", // Type 2 diabetes with foot ulcer
  "I83.019", // Varicose veins with ulcer
  "T81.31XA", // Disruption of external operation wound
  "L03.115", // Cellulitis of right lower limb
];

const modifiers = ["25", "59", "LT", "RT", "76"];

async function resetSeededData(facilityIds: string[]) {
  console.log("\n🔄 Resetting existing seeded data...");

  // Delete in reverse order of foreign key dependencies
  const tables = [
    "billings",
    "assessments",
    "photos",
    "treatments",
    "visits",
    "wounds",
    "patients",
    "user_facilities",
    "facilities",
  ];

  for (const table of tables) {
    let deleteQuery;

    if (
      table === "billings" ||
      table === "assessments" ||
      table === "treatments"
    ) {
      // These need nested filtering through visits -> patients
      const { data: idsToDelete } = await supabase
        .from(table)
        .select(
          `
          id,
          visit:visits!inner(
            patient:patients!inner(facility_id)
          )
        `
        )
        .in("visit.patient.facility_id", facilityIds);

      if (idsToDelete && idsToDelete.length > 0) {
        deleteQuery = await supabase
          .from(table)
          .delete()
          .in(
            "id",
            idsToDelete.map((item) => item.id)
          );
      } else {
        deleteQuery = { error: null, count: 0 };
      }
    } else if (table === "photos") {
      // Photos need filtering through wounds -> patients
      const { data: idsToDelete } = await supabase
        .from(table)
        .select(
          `
          id,
          wound:wounds!inner(
            patient:patients!inner(facility_id)
          )
        `
        )
        .in("wound.patient.facility_id", facilityIds);

      if (idsToDelete && idsToDelete.length > 0) {
        deleteQuery = await supabase
          .from(table)
          .delete()
          .in(
            "id",
            idsToDelete.map((item) => item.id)
          );
      } else {
        deleteQuery = { error: null, count: 0 };
      }
    } else if (
      table === "visits" ||
      table === "wounds" ||
      table === "patients"
    ) {
      // Direct filtering by patient's facility_id or own facility_id
      const { data: idsToDelete } = await supabase
        .from(table)
        .select(
          table === "patients"
            ? "id, facility_id"
            : `
          id,
          patient:patients!inner(facility_id)
        `
        )
        .in(
          table === "patients" ? "facility_id" : "patient.facility_id",
          facilityIds
        );

      if (idsToDelete && idsToDelete.length > 0) {
        deleteQuery = await supabase
          .from(table)
          .delete()
          .in(
            "id",
            idsToDelete.map((item) => item.id)
          );
      } else {
        deleteQuery = { error: null, count: 0 };
      }
    } else if (table === "user_facilities" || table === "facilities") {
      // Direct filtering
      deleteQuery = await supabase
        .from(table)
        .delete()
        .in(table === "user_facilities" ? "facility_id" : "id", facilityIds);
    } else {
      deleteQuery = { error: null, count: 0 };
    }

    if (deleteQuery.error) {
      console.error(
        `  ⚠️  Error deleting ${table}:`,
        deleteQuery.error.message
      );
    } else {
      const count = deleteQuery.count || 0;
      if (count > 0) {
        console.log(`  ✓ Deleted ${count} ${table}`);
      }
    }
  }

  console.log("✅ Reset complete!");
}

async function main() {
  console.log("🌱 Starting Supabase seed...");

  // Check for --reset flag
  const shouldReset = process.argv.includes("--reset");

  // Get the first user from auth
  const { data: authUsers, error: authError } =
    await supabase.auth.admin.listUsers();

  if (authError || !authUsers.users || authUsers.users.length === 0) {
    console.error("❌ No users found in auth.users. Please sign up first!");
    console.error(
      "   Run: npm run dev, then sign up at http://localhost:3000/signup"
    );
    process.exit(1);
  }

  const user = authUsers.users[0];
  console.log(`✅ Found user: ${user.email}`);

  // Check for existing facilities
  const { data: existingFacilities, error: facilityError } = await supabase
    .from("facilities")
    .select(
      `
      *,
      user_facilities!inner(user_id)
    `
    )
    .eq("user_facilities.user_id", user.id);

  if (facilityError) {
    console.error("❌ Error fetching facilities:", facilityError);
    process.exit(1);
  }

  // Reset data if requested
  if (shouldReset && existingFacilities && existingFacilities.length > 0) {
    const facilityIds = existingFacilities.map((f) => f.id);
    await resetSeededData(facilityIds);
  }

  // Re-check facilities after potential reset
  const { data: facilitiesAfterReset } = await supabase
    .from("facilities")
    .select(
      `
      *,
      user_facilities!inner(user_id)
    `
    )
    .eq("user_facilities.user_id", user.id);

  const facilities = facilitiesAfterReset || [];

  if (facilities.length > 0) {
    console.log(
      `\n📍 Found ${facilities.length} existing facilities - skipping facility creation`
    );
    facilities.forEach((f) => console.log(`  ✓ ${f.name}`));
  } else {
    // Create 3-5 facilities
    const facilityCount = randomInt(3, 5);
    console.log(`\n📍 Creating ${facilityCount} facilities...`);

    const facilityNames = [
      "Springfield Medical Center",
      "Chicago Wound Care Clinic",
      "Peoria Regional Hospital",
      "Rockford Health Center",
      "Naperville Specialty Care",
      "Aurora Medical Group",
      "Champaign Wound Treatment Center",
    ];

    for (let i = 0; i < facilityCount; i++) {
      const city = randomElement(cities);

      const { data: facility, error } = await supabase
        .from("facilities")
        .insert({
          name: facilityNames[i],
          address: `${randomInt(100, 9999)} ${randomElement(streets)}`,
          city: city.name,
          state: city.state,
          zip: city.zip,
          phone: generatePhone(),
          fax: Math.random() > 0.5 ? generatePhone() : null,
          email: `contact@${facilityNames[i].toLowerCase().replace(/\s+/g, "")}.com`,
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating facility ${facilityNames[i]}:`, error);
        continue;
      }

      // Associate facility with user
      await supabase.from("user_facilities").insert({
        user_id: user.id,
        facility_id: facility.id,
      });

      console.log(`  ✓ ${facility.name}`);
    }

    // Re-fetch facilities after creation
    const { data: updatedFacilities } = await supabase
      .from("facilities")
      .select(
        `
        *,
        user_facilities!inner(user_id)
      `
      )
      .eq("user_facilities.user_id", user.id);

    facilities.splice(0, facilities.length, ...(updatedFacilities || []));
  }

  const facilityIds = facilities.map((f) => f.id);

  // Check for existing patients
  const { data: existingPatients } = await supabase
    .from("patients")
    .select("*")
    .in("facility_id", facilityIds);

  const patients = existingPatients || [];

  if (patients.length > 0) {
    console.log(
      `\n👥 Found ${patients.length} existing patients - skipping patient creation`
    );
  } else {
    // Create 50-100 patients
    const patientCount = randomInt(50, 100);
    console.log(`\n👥 Creating ${patientCount} patients...`);

    const usedMRNs = new Map<string, Set<string>>();
    facilities.forEach((f) => usedMRNs.set(f.id, new Set()));

    const patientInserts = [];

    for (let i = 0; i < patientCount; i++) {
      const facility = randomElement(facilities);
      let mrn: string;

      do {
        mrn = generateMRN();
      } while (usedMRNs.get(facility.id)!.has(mrn));

      usedMRNs.get(facility.id)!.add(mrn);

      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const gender = randomElement(["Male", "Female"]);
      const city = randomElement(cities);

      // Generate DOB (ages 18-95)
      const today = new Date();
      const birthYear = today.getFullYear() - randomInt(18, 95);
      const dob = new Date(birthYear, randomInt(0, 11), randomInt(1, 28));

      patientInserts.push({
        facility_id: facility.id,
        first_name: firstName,
        last_name: lastName,
        dob: dob.toISOString().split("T")[0],
        mrn,
        gender,
        phone: Math.random() > 0.1 ? generatePhone() : null,
        email:
          Math.random() > 0.4
            ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`
            : null,
        address:
          Math.random() > 0.2
            ? `${randomInt(100, 9999)} ${randomElement(streets)}`
            : null,
        city: Math.random() > 0.2 ? city.name : null,
        state: Math.random() > 0.2 ? city.state : null,
        zip: Math.random() > 0.2 ? city.zip : null,
        insurance_info: generateInsurance(),
        emergency_contact: generateEmergencyContact(),
        allergies: generateAllergies(),
        medical_history: generateMedicalHistory(),
        created_by: user.id,
      });
    }

    // Insert in batches of 20
    for (let i = 0; i < patientInserts.length; i += 20) {
      const batch = patientInserts.slice(i, i + 20);
      const { error } = await supabase.from("patients").insert(batch);

      if (error) {
        console.error(
          `❌ Error inserting patients batch ${i / 20 + 1}:`,
          error
        );
      } else {
        console.log(
          `  ✓ Created ${Math.min(i + 20, patientInserts.length)}/${patientInserts.length} patients...`
        );
      }
    }

    // Re-fetch patients after creation
    const { data: updatedPatients } = await supabase
      .from("patients")
      .select("*")
      .in("facility_id", facilityIds);

    patients.splice(0, patients.length, ...(updatedPatients || []));
  }

  console.log(`\n✅ Initial seed completed!`);
  console.log(`\nSummary:`);
  console.log(`  - Facilities: ${facilities.length}`);
  console.log(`  - Patients: ${patients.length}`);

  // Create wounds
  const { data: existingWounds } = await supabase
    .from("wounds")
    .select("*, patient:patients!inner(facility_id)")
    .in("patient.facility_id", facilityIds);

  if (existingWounds && existingWounds.length > 0) {
    console.log(
      `\n🩹 Found ${existingWounds.length} existing wounds - skipping wound creation`
    );
  } else {
    console.log(`\n🩹 Creating wounds...`);

    const woundTypes = [
      "pressure_injury",
      "diabetic",
      "surgical",
      "venous",
      "arterial",
      "traumatic",
    ];
    const woundLocations = [
      "sacrum",
      "coccyx",
      "left_heel",
      "right_heel",
      "left_foot",
      "right_foot",
      "left_ankle",
      "right_ankle",
      "left_leg",
      "right_leg",
      "back",
    ];
    const woundStatuses = ["active", "active", "active", "healed"];

    const woundInserts = [];

    for (const patient of patients) {
      if (Math.random() > 0.35) {
        const woundCount = Math.random() > 0.7 ? randomInt(2, 3) : 1;

        for (let w = 0; w < woundCount; w++) {
          const onsetDate = new Date();
          onsetDate.setDate(onsetDate.getDate() - randomInt(1, 180));

          woundInserts.push({
            patient_id: patient.id,
            wound_number: `Wound ${w + 1}`,
            location: randomElement(woundLocations),
            wound_type: randomElement(woundTypes),
            onset_date: onsetDate.toISOString().split("T")[0],
            status: randomElement(woundStatuses),
          });
        }
      }
    }

    const { error } = await supabase.from("wounds").insert(woundInserts);
    if (error) {
      console.error("❌ Error creating wounds:", error);
    } else {
      console.log(`  ✓ Created ${woundInserts.length} wounds`);
    }
  }

  // Create visits
  const { data: existingVisits } = await supabase
    .from("visits")
    .select("*, patient:patients!inner(facility_id)")
    .in("patient.facility_id", facilityIds);

  if (existingVisits && existingVisits.length > 0) {
    console.log(
      `\n🏥 Found ${existingVisits.length} existing visits - skipping visit creation`
    );
  } else {
    console.log(`\n🏥 Creating visits...`);

    const { data: patientsWithWounds } = await supabase
      .from("patients")
      .select(
        `
        *,
        wounds!inner(*)
      `
      )
      .in("facility_id", facilityIds)
      .eq("wounds.status", "active");

    const visitTypes = ["in_person", "in_person", "telemed"];
    const visitStatuses = ["completed", "completed", "scheduled", "in-progress"];
    const followUpTypes = ["appointment", "discharge"];

    const visitInserts = [];

    for (const patient of patientsWithWounds || []) {
      const visitCount = randomInt(1, 4);

      for (let v = 0; v < visitCount; v++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - randomInt(0, 90));
        visitDate.setHours(randomInt(8, 17), randomInt(0, 59));

        const hasFollowUp = Math.random() > 0.5;
        const followUpType = hasFollowUp ? randomElement(followUpTypes) : null;
        const followUpDate =
          followUpType === "appointment"
            ? new Date(
                visitDate.getTime() + randomInt(7, 30) * 24 * 60 * 60 * 1000
              )
            : null;

        visitInserts.push({
          patient_id: patient.id,
          visit_date: visitDate.toISOString(),
          visit_type: randomElement(visitTypes),
          location:
            Math.random() > 0.5
              ? randomElement([
                  "Facility Room 101",
                  "Facility Room 202",
                  "Patient Home",
                  "Wound Clinic",
                ])
              : null,
          status: randomElement(visitStatuses),
          number_of_addenda: 0,
          follow_up_type: followUpType,
          follow_up_date: followUpDate?.toISOString().split("T")[0] || null,
          follow_up_notes: hasFollowUp
            ? randomElement([
                "Continue current treatment plan",
                "Monitor for signs of infection",
                "Re-assess wound progress",
                "Schedule follow-up if no improvement",
              ])
            : null,
          time_spent: Math.random() > 0.7,
          additional_notes:
            Math.random() > 0.6
              ? randomElement([
                  "Patient tolerating treatment well",
                  "Discussed wound care instructions with patient",
                  "Patient reports decreased pain",
                  "Caregiver present and educated on wound care",
                ])
              : null,
        });
      }
    }

    const { error } = await supabase.from("visits").insert(visitInserts);
    if (error) {
      console.error("❌ Error creating visits:", error);
    } else {
      console.log(`  ✓ Created ${visitInserts.length} visits`);
    }
  }

  // Create assessments
  const { data: existingAssessments } = await supabase
    .from("assessments")
    .select("*, visit:visits!inner(patient:patients!inner(facility_id))")
    .in("visit.patient.facility_id", facilityIds);

  if (existingAssessments && existingAssessments.length > 0) {
    console.log(
      `\n📋 Found ${existingAssessments.length} existing assessments - skipping assessment creation`
    );
  } else {
    console.log(`\n📋 Creating wound assessments...`);

    const { data: visits } = await supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients!inner(
          *,
          wounds!inner(*)
        )
      `
      )
      .in("patient.facility_id", facilityIds)
      .eq("patient.wounds.status", "active");

    const assessmentWoundTypes = [
      "Pressure Injury",
      "Diabetic Ulcer",
      "Surgical Wound",
      "Venous Ulcer",
      "Arterial Ulcer",
    ];
    const pressureStages = [
      "Stage 1",
      "Stage 2",
      "Stage 3",
      "Stage 4",
      "Unstageable",
    ];
    const healingStatuses = [
      "Initial",
      "Healing",
      "Healing",
      "Stable",
      "Declined",
    ];
    const exudateAmounts = ["None", "Minimal", "Moderate", "Heavy"];
    const exudateTypes = ["Serous", "Sanguineous", "Purulent"];
    const odorLevels = ["None", "None", "Mild", "Moderate"];
    const infectionSignsOptions = [
      "Increased warmth",
      "Erythema/redness",
      "Edema/swelling",
      "Increased pain",
    ];

    const assessmentInserts = [];

    for (const visit of visits || []) {
      const wounds = visit.patient?.wounds || [];
      const woundsToAssess = wounds.filter(() => Math.random() > 0.2);

      for (const wound of woundsToAssess) {
        const length = parseFloat((Math.random() * 10 + 0.5).toFixed(2));
        const width = parseFloat((Math.random() * 8 + 0.5).toFixed(2));
        const depth =
          Math.random() > 0.5
            ? parseFloat((Math.random() * 5).toFixed(2))
            : null;

        const epithelial = randomInt(0, 40);
        const granulation = randomInt(30, 70);
        const slough = 100 - epithelial - granulation;

        const infectionSignsCount = randomInt(0, 3);
        const infectionSigns =
          infectionSignsCount > 0
            ? Array.from({ length: infectionSignsCount }, () =>
                randomElement(infectionSignsOptions)
              )
            : null;

        assessmentInserts.push({
          visit_id: visit.id,
          wound_id: wound.id,
          wound_type: randomElement(assessmentWoundTypes),
          pressure_stage:
            Math.random() > 0.5 ? randomElement(pressureStages) : null,
          healing_status: randomElement(healingStatuses),
          at_risk_reopening: Math.random() > 0.8,
          length,
          width,
          depth,
          area: parseFloat((length * width).toFixed(2)),
          undermining:
            Math.random() > 0.7
              ? `${(Math.random() * 3).toFixed(1)}cm at ${randomInt(1, 12)} o'clock`
              : null,
          tunneling:
            Math.random() > 0.8
              ? `${(Math.random() * 4).toFixed(1)}cm at ${randomInt(1, 12)} o'clock`
              : null,
          epithelial_percent: epithelial,
          granulation_percent: granulation,
          slough_percent: slough,
          exudate_amount: randomElement(exudateAmounts),
          exudate_type: randomElement(exudateTypes),
          odor: randomElement(odorLevels),
          periwound_condition: randomElement([
            "Intact, no signs of maceration",
            "Mild erythema present",
            "Dry, flaky skin",
            "Slight maceration noted",
          ]),
          pain_level: randomInt(0, 10),
          infection_signs: infectionSigns,
          assessment_notes:
            Math.random() > 0.5
              ? randomElement([
                  "Wound showing signs of improvement",
                  "Continue current treatment regimen",
                  "Increased granulation tissue noted",
                  "Patient education provided on wound care",
                  "Recommended nutritional support",
                ])
              : null,
        });
      }
    }

    const { error } = await supabase
      .from("assessments")
      .insert(assessmentInserts);
    if (error) {
      console.error("❌ Error creating assessments:", error);
    } else {
      console.log(`  ✓ Created ${assessmentInserts.length} assessments`);
    }
  }

  // Create billings
  const { data: existingBillings } = await supabase
    .from("billings")
    .select("*, visit:visits!inner(patient:patients!inner(facility_id))")
    .in("visit.patient.facility_id", facilityIds);

  if (existingBillings && existingBillings.length > 0) {
    console.log(
      `\n💰 Found ${existingBillings.length} existing billings - skipping billing creation`
    );
  } else {
    console.log(`\n💰 Creating billing records...`);

    const { data: completedVisits } = await supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients!inner(facility_id)
      `
      )
      .in("patient.facility_id", facilityIds)
      .eq("status", "complete");

    const billingInserts = [];

    for (const visit of completedVisits || []) {
      // 80% of completed visits have billing records
      if (Math.random() > 0.2) {
        const cptCount = randomInt(1, 3);
        const selectedCpts: string[] = [];
        for (let i = 0; i < cptCount; i++) {
          const code = randomElement(cptCodes);
          if (!selectedCpts.includes(code)) {
            selectedCpts.push(code);
          }
        }

        const icd10Count = randomInt(1, 2);
        const selectedIcd10s: string[] = [];
        for (let i = 0; i < icd10Count; i++) {
          const code = randomElement(icd10Codes);
          if (!selectedIcd10s.includes(code)) {
            selectedIcd10s.push(code);
          }
        }

        const hasModifiers = Math.random() > 0.6;
        const selectedModifiers = hasModifiers
          ? [randomElement(modifiers)]
          : [];

        billingInserts.push({
          visit_id: visit.id,
          patient_id: visit.patient_id,
          cpt_codes: selectedCpts,
          icd10_codes: selectedIcd10s,
          modifiers: selectedModifiers.length > 0 ? selectedModifiers : null,
          time_spent: Math.random() > 0.7,
          notes:
            Math.random() > 0.5
              ? randomElement([
                  "Standard wound care billing",
                  "Complex wound management",
                  "Multiple wounds treated",
                  "Extended time spent on care",
                  "Patient education provided",
                ])
              : null,
        });
      }
    }

    const { error } = await supabase.from("billings").insert(billingInserts);
    if (error) {
      console.error("❌ Error creating billings:", error);
    } else {
      console.log(`  ✓ Created ${billingInserts.length} billing records`);
    }
  }

  // Get final counts
  const { count: finalWounds } = await supabase
    .from("wounds")
    .select("*, patient:patients!inner(facility_id)", {
      count: "exact",
      head: true,
    })
    .in("patient.facility_id", facilityIds);

  const { count: finalVisits } = await supabase
    .from("visits")
    .select("*, patient:patients!inner(facility_id)", {
      count: "exact",
      head: true,
    })
    .in("patient.facility_id", facilityIds);

  const { count: finalAssessments } = await supabase
    .from("assessments")
    .select("*, visit:visits!inner(patient:patients!inner(facility_id))", {
      count: "exact",
      head: true,
    })
    .in("visit.patient.facility_id", facilityIds);

  const { count: finalBillings } = await supabase
    .from("billings")
    .select("*, visit:visits!inner(patient:patients!inner(facility_id))", {
      count: "exact",
      head: true,
    })
    .in("visit.patient.facility_id", facilityIds);

  console.log(`\n✅ Enhanced seed completed successfully!`);
  console.log(`\nFinal Summary:`);
  console.log(`  - Facilities: ${facilities.length}`);
  console.log(`  - Patients: ${patients.length}`);
  console.log(`  - Wounds: ${finalWounds || 0}`);
  console.log(`  - Visits: ${finalVisits || 0}`);
  console.log(`  - Assessments: ${finalAssessments || 0}`);
  console.log(`  - Billings: ${finalBillings || 0}`);
  console.log(`  - User: ${user.email}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    console.log("\n👋 Seed script finished");
    process.exit(0);
  });
