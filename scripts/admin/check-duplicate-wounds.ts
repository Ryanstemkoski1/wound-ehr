import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicateWounds() {
  console.log("Checking for duplicate wounds...\n");

  // Get all wounds
  const { data: wounds, error } = await supabase
    .from("wounds")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching wounds:", error);
    return;
  }

  console.log(`Total wounds: ${wounds?.length || 0}\n`);

  // Find duplicates by ID
  const woundIds = wounds?.map((w) => w.id) || [];
  const duplicateIds = woundIds.filter(
    (id, index) => woundIds.indexOf(id) !== index
  );

  if (duplicateIds.length === 0) {
    console.log("✅ No duplicate wound IDs found");
  } else {
    console.log(`❌ Found ${duplicateIds.length} duplicate wound IDs:`);
    console.log(duplicateIds);
  }

  // Group wounds by patient_id
  const woundsByPatient = new Map<string, any[]>();
  wounds?.forEach((wound) => {
    const existing = woundsByPatient.get(wound.patient_id) || [];
    woundsByPatient.set(wound.patient_id, [...existing, wound]);
  });

  console.log("\n=== Wounds by Patient ===");
  for (const [patientId, patientWounds] of woundsByPatient.entries()) {
    console.log(`\nPatient: ${patientId}`);
    console.log(`Total wounds: ${patientWounds.length}`);

    patientWounds.forEach((wound, idx) => {
      console.log(
        `  ${idx + 1}. Wound #${wound.wound_number} - ${wound.location} (ID: ${wound.id})`
      );
    });

    // Check for duplicate wound numbers within same patient
    const woundNumbers = patientWounds.map((w) => w.wound_number);
    const duplicateNumbers = woundNumbers.filter(
      (num, index) => woundNumbers.indexOf(num) !== index
    );

    if (duplicateNumbers.length > 0) {
      console.log(
        `  ⚠️ Duplicate wound numbers found: ${duplicateNumbers.join(", ")}`
      );
    }
  }
}

checkDuplicateWounds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
