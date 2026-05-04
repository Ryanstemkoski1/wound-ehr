"use server";

import { createClient } from "@/lib/supabase/server";

export type ConsentStatus = "missing" | "incomplete" | "on_file";

export type PatientConsentStatusRow = {
  patient_id: string;
  facility_id: string;
  consent_id: string | null;
  consented_at: string | null;
  patient_signature_id: string | null;
  document_url: string | null;
  status: ConsentStatus;
  days_since_consent: number | null;
};

/**
 * Read consent status for a single patient. Server-only; backed by the
 * `patient_consent_status` view (migration 00042) which inherits RLS from
 * `patients` + `patient_consents`.
 *
 * Returns null only if the patient is unreachable (RLS/missing). For a
 * patient with no consent on file the row is returned with status='missing'.
 */
export async function getPatientConsentStatus(
  patientId: string
): Promise<PatientConsentStatusRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_consent_status")
    .select(
      "patient_id, facility_id, consent_id, consented_at, patient_signature_id, document_url, status, days_since_consent"
    )
    .eq("patient_id", patientId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PatientConsentStatusRow;
}
