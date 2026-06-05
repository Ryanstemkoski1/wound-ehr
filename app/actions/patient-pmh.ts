"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { auditPhiAccess } from "@/lib/audit-log";

// =====================================================
// Patient Past Medical History (PMH) flag set
// =====================================================
//
// Backing column: patients.pmh_flags JSONB NOT NULL DEFAULT '{}'
// (migration 00057). Each entry in PMH_KEYS is a snake_case key that
// maps 1:1 to a checkbox in Dr. May's intake grid. Missing keys are
// interpreted as `false`, so an empty {} == "all flags off".
//
// This module is the single read/write surface for the PMH tab. The
// per-visit billing diagnosis list (billings.icd10_codes) and the
// patient-level running problem list (patient_icd10_codes — see
// patient-icd10.ts) are intentionally separate concerns.
//
// TODO: Types haven't been regenerated for the new pmh_flags column yet,
// so the .select("pmh_flags") read and .update({ pmh_flags }) write below
// each carry an `as never` boundary cast. Drop the casts once
// `lib/database.types.ts` is regenerated to include patients.pmh_flags.

// =====================================================
// Key set & labels
// =====================================================
//
// Order here is load-bearing: the UI renders the checkbox grid in this
// exact order. Add new flags at the end so existing layouts stay stable.

export const PMH_KEYS = [
  "hypertension",
  "type_2_diabetes",
  "chf",
  "copd",
  "ckd_esrd",
  "pvd_pad",
  "venous_insufficiency",
  "obesity",
  "malnutrition",
  "dementia",
  "cva_tia",
  "cad",
  "atrial_fibrillation",
  "hypothyroidism",
  "osteoporosis",
  "contractures",
  "pressure_injury_hx",
  "wound_hx",
] as const;

export type PmhKey = (typeof PMH_KEYS)[number];

export const PMH_LABELS: Record<PmhKey, string> = {
  hypertension: "Hypertension",
  type_2_diabetes: "Type 2 Diabetes",
  chf: "CHF",
  copd: "COPD",
  ckd_esrd: "CKD/ESRD",
  pvd_pad: "PVD/PAD",
  venous_insufficiency: "Venous Insufficiency",
  obesity: "Obesity",
  malnutrition: "Malnutrition",
  dementia: "Dementia",
  cva_tia: "CVA/TIA",
  cad: "CAD",
  atrial_fibrillation: "Atrial Fibrillation",
  hypothyroidism: "Hypothyroidism",
  osteoporosis: "Osteoporosis",
  contractures: "Contractures",
  pressure_injury_hx: "Pressure Injury Hx",
  wound_hx: "Wound Hx",
};

// Fully-populated PMH set. Every key is present; missing keys in the
// DB blob default to false at read time.
export type PmhFlags = Record<PmhKey, boolean>;

// =====================================================
// Zod schemas
// =====================================================

const patientIdSchema = z.string().uuid();

// Build a strict object schema from PMH_KEYS so unknown keys are rejected
// and every known key must be a boolean. We use `.partial()` on the
// caller-facing input shape so the UI can send a subset (anything omitted
// reads as `false` once normalized).
const pmhFlagsShape = PMH_KEYS.reduce(
  (acc, key) => {
    acc[key] = z.boolean();
    return acc;
  },
  {} as Record<PmhKey, z.ZodBoolean>
);

const pmhFlagsSchema = z.object(pmhFlagsShape).strict().partial();

// =====================================================
// Helpers
// =====================================================

// Coerce any JSONB blob into a fully-populated PmhFlags. Unknown keys are
// silently dropped; missing keys default to false. Non-boolean values get
// coerced via Boolean(...) to be defensive against legacy / hand-edited
// rows.
function normalizePmhFlags(raw: unknown): PmhFlags {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as PmhFlags;
  for (const key of PMH_KEYS) {
    out[key] = Boolean(source[key]);
  }
  return out;
}

// =====================================================
// getPatientPmhFlags
// =====================================================
//
// Returns the patient's PMH flag set, fully populated (every key in
// PMH_KEYS is present, missing keys defaulted to false). RLS scopes the
// row to the caller's tenant — we don't re-check membership here.

export async function getPatientPmhFlags(
  patientId: string
): Promise<PmhFlags> {
  const id = patientIdSchema.parse(patientId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // TODO: drop the `as never` cast once database.types.ts knows
  // patients.pmh_flags (migration 00057). The generated `patients`
  // row type doesn't yet expose pmh_flags to .select()'s string-literal
  // narrower, so we cast the table name to bypass the column whitelist
  // and then cast the row back to a known shape on the way out.
  const { data, error } = await supabase
    .from("patients" as never)
    .select("pmh_flags")
    .eq("id", id)
    .single();

  if (error) throw error;

  const row = data as unknown as { pmh_flags: unknown } | null;
  const flags = normalizePmhFlags(row?.pmh_flags);

  void auditPhiAccess({
    action: "read",
    table: "patients",
    recordId: id,
    recordType: "pmh_flags",
  });

  return flags;
}

// =====================================================
// updatePatientPmhFlags
// =====================================================
//
// Writes back the *full* PMH flag set. Callers should pass the complete
// object (all 18 keys); a partial payload is accepted and any omitted
// keys are treated as `false` so the stored blob remains in canonical
// fully-populated shape.
//
// Validates the input with the strict zod schema — unknown keys are
// rejected outright rather than being silently dropped, so a UI bug that
// invents a typo'd key surfaces immediately instead of being persisted.

export async function updatePatientPmhFlags(
  patientId: string,
  flags: Partial<PmhFlags>
) {
  try {
    const id = patientIdSchema.parse(patientId);
    const parsed = pmhFlagsSchema.parse(flags);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Not authenticated" };
    }

    // Normalize to the full key set so the stored blob always has every
    // key, with omitted/unspecified entries explicitly false.
    const full = normalizePmhFlags(parsed);

    // TODO: drop the `as never` casts once database.types.ts knows
    // patients.pmh_flags (migration 00057). Same boundary pattern as
    // the read in getPatientPmhFlags above.
    const { error } = await supabase
      .from("patients" as never)
      .update({ pmh_flags: full } as never)
      .eq("id", id);

    if (error) throw error;

    void auditPhiAccess({
      action: "update",
      table: "patients",
      recordId: id,
      recordType: "pmh_flags",
      newValues: full,
    });

    revalidatePath(`/dashboard/patients/${id}`);

    return { success: true as const, flags: full };
  } catch (error) {
    console.error("Failed to update patient PMH flags:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to update PMH flags",
    };
  }
}
