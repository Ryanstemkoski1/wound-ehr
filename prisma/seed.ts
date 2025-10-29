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

  const facilities = [];
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

  // Create 50-100 patients across all facilities
  const patientCount = randomInt(50, 100);
  console.log(`\n👥 Creating ${patientCount} patients...`);

  const usedMRNs = new Map<string, Set<string>>(); // facilityId -> Set of MRNs
  facilities.forEach((f) => usedMRNs.set(f.id, new Set()));

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

    await prisma.patient.create({
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

    if ((i + 1) % 10 === 0) {
      console.log(`  ✓ Created ${i + 1}/${patientCount} patients...`);
    }
  }

  console.log(`\n✅ Seed completed successfully!`);
  console.log(`\nSummary:`);
  console.log(`  - Facilities: ${facilityCount}`);
  console.log(`  - Patients: ${patientCount}`);
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
