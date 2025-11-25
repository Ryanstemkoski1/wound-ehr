/**
 * Debug specific patient that's causing the error
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSpecificPatient() {
  // From the error: /dashboard/patients/deb2b6a2-8fcd-4fc8-b72a-17d98d7b6f1f
  const patientId = "deb2b6a2-8fcd-4fc8-b72a-17d98d7b6f1f";

  console.log(`🔍 Checking patient: ${patientId}\n`);

  // Check if patient exists
  const { data: patient, error } = await supabase
    .from("patients")
    .select(
      `
      *,
      facility:facilities(*)
    `
    )
    .eq("id", patientId)
    .single();

  if (error) {
    console.error("❌ Error fetching patient:", error);
    return;
  }

  console.log("Patient data:");
  console.log("- Name:", patient.first_name, patient.last_name);
  console.log("- MRN:", patient.mrn);
  console.log("- Facility ID:", patient.facility_id);
  console.log("- Is Active:", patient.is_active);
  console.log("- Facility object:", patient.facility);

  if (!patient.facility && patient.facility_id) {
    console.log("\n⚠️  Patient has facility_id but facility object is null!");
    console.log("Checking if facility exists...");

    const { data: facility } = await supabase
      .from("facilities")
      .select("*")
      .eq("id", patient.facility_id)
      .single();

    console.log("Facility found:", facility);
  }
}

debugSpecificPatient();
