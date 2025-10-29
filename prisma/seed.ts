// Prisma Seed Script
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  const count = Math.random() < 0.3 ? 0 : randomInt(1, 3); // 30% no allergies
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
  const count = Math.random() < 0.2 ? 0 : randomInt(1, 4); // 20% no conditions
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
  const hasPrimary = Math.random() > 0.1; // 90% have primary insurance
  const hasSecondary = Math.random() > 0.7; // 30% have secondary insurance

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

async function main() {
  console.log("🌱 Starting seed...");

  // Get the first user (you should already have one from signup)
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error("❌ No user found. Please sign up first!");
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email}`);

  // Check for existing facilities
  const existingFacilities = await prisma.facility.findMany({
    where: {
      users: {
        some: { userId: user.id },
      },
    },
  });

  type FacilityType = (typeof existingFacilities)[number];
  let facilities: FacilityType[] = [];

  if (existingFacilities.length > 0) {
    console.log(
      `\n📍 Found ${existingFacilities.length} existing facilities - skipping facility creation`
    );
    facilities = existingFacilities;
    existingFacilities.forEach((f: FacilityType) =>
      console.log(`  ✓ ${f.name}`)
    );
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
      const facility = await prisma.facility.create({
        data: {
          name: facilityNames[i],
          address: `${randomInt(100, 9999)} ${randomElement(streets)}`,
          city: city.name,
          state: city.state,
          zip: city.zip,
          phone: generatePhone(),
          fax: Math.random() > 0.5 ? generatePhone() : null,
          email: `contact@${facilityNames[i].toLowerCase().replace(/\s+/g, "")}.com`,
          users: {
            create: {
              userId: user.id,
            },
          },
        },
      });
      facilities.push(facility);
      console.log(`  ✓ ${facility.name}`);
    }
  }

  // Check for existing patients
  const existingPatients = await prisma.patient.findMany({
    where: {
      facilityId: { in: facilities.map((f: FacilityType) => f.id) },
    },
  });

  type PatientType = (typeof existingPatients)[number];
  let patients: PatientType[] = [];

  if (existingPatients.length > 0) {
    console.log(
      `\n👥 Found ${existingPatients.length} existing patients - skipping patient creation`
    );
    patients = existingPatients;
  } else {
    // Create 50-100 patients across all facilities
    const patientCount = randomInt(50, 100);
    console.log(`\n👥 Creating ${patientCount} patients...`);

    const usedMRNs = new Map<string, Set<string>>(); // facilityId -> Set of MRNs
    facilities.forEach((f: FacilityType) => usedMRNs.set(f.id, new Set()));

    for (let i = 0; i < patientCount; i++) {
      const facility = randomElement(facilities);
      let mrn: string;

      // Ensure unique MRN per facility
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
      const minAge = 18;
      const maxAge = 95;
      const birthYear = today.getFullYear() - randomInt(minAge, maxAge);
      const dob = new Date(birthYear, randomInt(0, 11), randomInt(1, 28));

      const patient = await prisma.patient.create({
        data: {
          facilityId: facility.id,
          firstName,
          lastName,
          dob,
          mrn,
          gender,
          phone: Math.random() > 0.1 ? generatePhone() : null, // 90% have phone
          email:
            Math.random() > 0.4
              ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`
              : null, // 60% have email
          address:
            Math.random() > 0.2
              ? `${randomInt(100, 9999)} ${randomElement(streets)}`
              : null,
          city: Math.random() > 0.2 ? city.name : null,
          state: Math.random() > 0.2 ? city.state : null,
          zip: Math.random() > 0.2 ? city.zip : null,
          insuranceInfo: generateInsurance(),
          emergencyContact: generateEmergencyContact(),
          allergies: generateAllergies(),
          medicalHistory: generateMedicalHistory(),
          createdBy: user.id,
        },
      });
      patients.push(patient);

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Created ${i + 1}/${patientCount} patients...`);
      }
    }
  }

  console.log(`\n✅ Initial seed completed!`);
  console.log(`\nSummary:`);
  console.log(`  - Facilities: ${facilities.length}`);
  console.log(`  - Patients: ${patients.length}`);

  // Check for existing wounds
  const existingWounds = await prisma.wound.findMany({
    where: {
      patient: {
        facilityId: { in: facilities.map((f: FacilityType) => f.id) },
      },
    },
  });

  if (existingWounds.length > 0) {
    console.log(
      `\n🩹 Found ${existingWounds.length} existing wounds - skipping wound creation`
    );
  } else {
    // Get all created patients for creating wounds
    const allPatients = await prisma.patient.findMany({
      where: { facilityId: { in: facilities.map((f: FacilityType) => f.id) } },
      select: { id: true },
    });

    // Create wounds for 60-70% of patients (most patients have 1-3 wounds)
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
    const woundStatuses = ["active", "active", "active", "healed"]; // 75% active

    let totalWounds = 0;
    for (const patient of allPatients) {
      if (Math.random() > 0.35) {
        // 65% of patients have wounds
        const woundCount = Math.random() > 0.7 ? randomInt(2, 3) : 1; // 30% have multiple wounds

        for (let w = 0; w < woundCount; w++) {
          const onsetDate = new Date();
          onsetDate.setDate(onsetDate.getDate() - randomInt(1, 180)); // 1-180 days ago

          await prisma.wound.create({
            data: {
              patientId: patient.id,
              woundNumber: `Wound ${w + 1}`,
              location: randomElement(woundLocations),
              woundType: randomElement(woundTypes),
              onsetDate,
              status: randomElement(woundStatuses),
            },
          });
          totalWounds++;
        }
      }
    }
    console.log(`  ✓ Created ${totalWounds} wounds`);
  }

  // Check for existing visits
  const existingVisits = await prisma.visit.findMany({
    where: {
      patient: {
        facilityId: { in: facilities.map((f: FacilityType) => f.id) },
      },
    },
  });

  if (existingVisits.length > 0) {
    console.log(
      `\n🏥 Found ${existingVisits.length} existing visits - skipping visit creation`
    );
  } else {
    // Create visits for patients with wounds
    console.log(`\n🏥 Creating visits...`);
    const patientsWithWounds = await prisma.patient.findMany({
      where: {
        facilityId: { in: facilities.map((f: FacilityType) => f.id) },
        wounds: { some: {} },
      },
      include: {
        wounds: {
          where: { status: "active" },
        },
      },
    });

    let totalVisits = 0;
    const visitTypes = ["in_person", "in_person", "telemed"]; // 66% in-person
    const visitStatuses = ["complete", "complete", "incomplete"]; // 66% complete
    const followUpTypes = ["appointment", "discharge"];

    for (const patient of patientsWithWounds) {
      const visitCount = randomInt(1, 4); // 1-4 visits per patient

      for (let v = 0; v < visitCount; v++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - randomInt(0, 90)); // Within last 90 days
        visitDate.setHours(randomInt(8, 17), randomInt(0, 59)); // 8am-5pm

        const hasFollowUp = Math.random() > 0.5;
        const followUpType = hasFollowUp ? randomElement(followUpTypes) : null;
        const followUpDate =
          followUpType === "appointment"
            ? new Date(
                visitDate.getTime() + randomInt(7, 30) * 24 * 60 * 60 * 1000
              )
            : null;

        await prisma.visit.create({
          data: {
            patientId: patient.id,
            visitDate,
            visitType: randomElement(visitTypes),
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
            followUpType,
            followUpDate,
            followUpNotes: hasFollowUp
              ? randomElement([
                  "Continue current treatment plan",
                  "Monitor for signs of infection",
                  "Re-assess wound progress",
                  "Schedule follow-up if no improvement",
                ])
              : null,
            timeSpent: Math.random() > 0.7, // 30% spent 45+ minutes
            additionalNotes:
              Math.random() > 0.6
                ? randomElement([
                    "Patient tolerating treatment well",
                    "Discussed wound care instructions with patient",
                    "Patient reports decreased pain",
                    "Caregiver present and educated on wound care",
                  ])
                : null,
          },
        });
        totalVisits++;
      }
    }
    console.log(`  ✓ Created ${totalVisits} visits`);
  }

  // Check for existing assessments
  const existingAssessments = await prisma.woundAssessment.findMany({
    where: {
      visit: {
        patient: {
          facilityId: { in: facilities.map((f: FacilityType) => f.id) },
        },
      },
    },
  });

  if (existingAssessments.length > 0) {
    console.log(
      `\n📋 Found ${existingAssessments.length} existing assessments - skipping assessment creation`
    );
  } else {
    // Create assessments for visits
    console.log(`\n📋 Creating wound assessments...`);
    const visits = await prisma.visit.findMany({
      include: {
        patient: {
          include: {
            wounds: {
              where: { status: "active" },
            },
          },
        },
      },
    });

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

    let totalAssessments = 0;
    for (const visit of visits) {
      if (visit.patient.wounds.length > 0) {
        // Create assessment for each wound (or randomly skip some)
        const woundsToAssess = visit.patient.wounds.filter(
          () => Math.random() > 0.2
        ); // 80% of wounds get assessed

        for (const wound of woundsToAssess) {
          const length = (Math.random() * 10 + 0.5).toFixed(2);
          const width = (Math.random() * 8 + 0.5).toFixed(2);
          const depth =
            Math.random() > 0.5 ? (Math.random() * 5).toFixed(2) : null;

          const epithelial = randomInt(0, 40);
          const granulation = randomInt(30, 70);
          const slough = 100 - epithelial - granulation;

          const infectionSignsCount = randomInt(0, 3);
          const infectionSigns =
            infectionSignsCount > 0
              ? Array.from({ length: infectionSignsCount }, () =>
                  randomElement(infectionSignsOptions)
                )
              : [];

          await prisma.assessment.create({
            data: {
              visitId: visit.id,
              woundId: wound.id,
              woundType: randomElement(assessmentWoundTypes),
              pressureStage:
                Math.random() > 0.5 ? randomElement(pressureStages) : null,
              healingStatus: randomElement(healingStatuses),
              atRiskReopening: Math.random() > 0.8,
              length,
              width,
              depth,
              area: (parseFloat(length) * parseFloat(width)).toFixed(2),
              undermining:
                Math.random() > 0.7
                  ? `${(Math.random() * 3).toFixed(1)}cm at ${randomInt(1, 12)} o'clock`
                  : null,
              tunneling:
                Math.random() > 0.8
                  ? `${(Math.random() * 4).toFixed(1)}cm at ${randomInt(1, 12)} o'clock`
                  : null,
              epithelialPercent: epithelial,
              granulationPercent: granulation,
              sloughPercent: slough,
              exudateAmount: randomElement(exudateAmounts),
              exudateType: randomElement(exudateTypes),
              odor: randomElement(odorLevels),
              periwoundCondition: randomElement([
                "Intact, no signs of maceration",
                "Mild erythema present",
                "Dry, flaky skin",
                "Slight maceration noted",
              ]),
              painLevel: randomInt(0, 10),
              infectionSigns: infectionSigns.length > 0 ? infectionSigns : null,
              assessmentNotes:
                Math.random() > 0.5
                  ? randomElement([
                      "Wound showing signs of improvement",
                      "Continue current treatment regimen",
                      "Increased granulation tissue noted",
                      "Patient education provided on wound care",
                      "Recommended nutritional support",
                    ])
                  : null,
            },
          });
          totalAssessments++;
        }
      }
    }
    console.log(`  ✓ Created ${totalAssessments} assessments`);
  }

  // Get final counts
  const finalWounds = await prisma.wound.count({
    where: {
      patient: {
        facilityId: { in: facilities.map((f: FacilityType) => f.id) },
      },
    },
  });
  const finalVisits = await prisma.visit.count({
    where: {
      patient: {
        facilityId: { in: facilities.map((f: FacilityType) => f.id) },
      },
    },
  });
  const finalAssessments = await prisma.woundAssessment.count({
    where: {
      visit: {
        patient: {
          facilityId: { in: facilities.map((f: FacilityType) => f.id) },
        },
      },
    },
  });

  console.log(`\n✅ Enhanced seed completed successfully!`);
  console.log(`\nFinal Summary:`);
  console.log(`  - Facilities: ${facilities.length}`);
  console.log(`  - Patients: ${patients.length}`);
  console.log(`  - Wounds: ${finalWounds}`);
  console.log(`  - Visits: ${finalVisits}`);
  console.log(`  - Assessments: ${finalAssessments}`);
  console.log(`  - User: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
