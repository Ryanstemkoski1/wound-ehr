"use server";

// MIPS / Quality Measures server actions
//
// Reads and writes the `mips_measures` JSONB column on
// `skilled_nursing_assessments` (added by migration 00058).
//
// The column shape mirrors what Alana's nursing form captures for
// CMS Merit-based Incentive Payment System (MIPS) reporting:
//   - medication_list_reviewed (bool)
//   - smoking_status ('current' | 'former' | 'never' | 'unknown')
//   - cessation_counseling_offered (bool)
//   - bmi (numeric)
//   - fall_risk_score (numeric; e.g. Morse scale)
//   - advance_directive_on_file ('yes' | 'no' | 'declined')
//
// All keys are OPTIONAL — older rows may have been written before MIPS
// existed, and partially-filled forms are valid in-progress state.
// RLS on skilled_nursing_assessments (per-tenant via facility_id)
// already covers this column; no extra ownership check needed here.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditPhiAccess } from "@/lib/audit-log";
import { assertUuid, ValidationError } from "@/lib/validations/common";

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

const smokingStatusEnum = z.enum([
  "current",
  "former",
  "never",
  "unknown",
]);

const advanceDirectiveEnum = z.enum(["yes", "no", "declined"]);

/**
 * Strict shape for the JSONB column. All keys optional so partial
 * (in-progress) forms validate, but unknown keys are stripped to keep
 * the column from accumulating garbage.
 */
export const mipsMeasuresSchema = z
  .object({
    medication_list_reviewed: z.boolean().optional(),
    smoking_status: smokingStatusEnum.optional(),
    cessation_counseling_offered: z.boolean().optional(),
    bmi: z.number().finite().min(0).max(200).optional(),
    fall_risk_score: z.number().finite().int().min(0).max(125).optional(),
    advance_directive_on_file: advanceDirectiveEnum.optional(),
  })
  .strict();

export type MipsMeasures = z.infer<typeof mipsMeasuresSchema>;

type GetResult =
  | { success: true; data: MipsMeasures }
  | { success: false; error: string };

type UpdateResult =
  | { success: true }
  | { success: false; error: string };

// ============================================================================
// READ
// ============================================================================

/**
 * Read the MIPS measures block for a single skilled-nursing assessment.
 * Returns an empty object (typed as `MipsMeasures`) for rows that pre-date
 * migration 00058 or that have never had measures recorded.
 *
 * RLS on `skilled_nursing_assessments` enforces facility scoping; an
 * unauthorized caller will see PGRST116 (no row) and we surface that as
 * a generic "Not found" rather than leaking existence.
 */
export async function getMipsMeasures(
  skilledNursingAssessmentId: string
): Promise<GetResult> {
  try {
    assertUuid(skilledNursingAssessmentId, "skilledNursingAssessmentId");
  } catch (e) {
    return {
      success: false,
      error: e instanceof ValidationError ? e.message : "Invalid input",
    };
  }

  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // TODO: drop the `as never` casts once Supabase types are regenerated
    // to include skilled_nursing_assessments.mips_measures (added in
    // migration 00058).
    const { data, error } = await supabase
      .from("skilled_nursing_assessments")
      .select("mips_measures" as never)
      .eq("id", skilledNursingAssessmentId)
      .single();

    if (error) {
      // RLS-hidden row looks the same as a missing row; treat both as
      // not found so we don't disclose existence.
      if (error.code === "PGRST116") {
        return { success: false, error: "Assessment not found" };
      }
      throw error;
    }

    const raw = (data as { mips_measures?: unknown } | null)?.mips_measures;
    // Default-empty for rows written before the column existed, or for
    // explicit `{}` defaults from the migration.
    const candidate =
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

    // Parse rather than safeParse: if the DB somehow has malformed
    // measures (manual edit, future schema drift), fall back to {}
    // instead of throwing — the form should be able to render empty.
    const parsed = mipsMeasuresSchema.safeParse(candidate);
    const measures: MipsMeasures = parsed.success ? parsed.data : {};

    void auditPhiAccess({
      action: "read",
      table: "skilled_nursing_assessments",
      recordId: skilledNursingAssessmentId,
      recordType: "skilled_nursing_assessment.mips_measures",
    });

    return { success: true, data: measures };
  } catch (error) {
    console.error("Error fetching MIPS measures:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Overwrite the MIPS measures block on a skilled-nursing assessment.
 *
 * Semantics: this is a *replace*, not a merge — callers should pass the
 * full desired measures object. The strict zod schema strips unknown
 * keys so the JSONB column stays clean.
 *
 * Revalidates the visit and patient detail pages so any RSC view of
 * the assessment re-renders with the new values.
 */
export async function updateMipsMeasures(
  skilledNursingAssessmentId: string,
  measures: MipsMeasures
): Promise<UpdateResult> {
  try {
    assertUuid(skilledNursingAssessmentId, "skilledNursingAssessmentId");
  } catch (e) {
    return {
      success: false,
      error: e instanceof ValidationError ? e.message : "Invalid input",
    };
  }

  const validation = mipsMeasuresSchema.safeParse(measures);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Invalid MIPS measures",
    };
  }
  const cleaned = validation.data;

  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Capture old values for the audit row. RLS-hidden / missing rows
    // surface as PGRST116 — same not-found behavior as the reader.
    // TODO: drop the `as never` casts once Supabase types are regenerated
    // to include skilled_nursing_assessments.mips_measures (added in
    // migration 00058).
    const { data: existing, error: fetchError } = await supabase
      .from("skilled_nursing_assessments")
      .select("id, visit_id, patient_id, mips_measures" as never)
      .eq("id", skilledNursingAssessmentId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { success: false, error: "Assessment not found" };
      }
      throw fetchError;
    }

    const existingRow = existing as unknown as {
      id: string;
      visit_id: string | null;
      patient_id: string | null;
      mips_measures?: unknown;
    };

    // TODO: drop the `as never` cast once Supabase types are regenerated
    // to include skilled_nursing_assessments.mips_measures (added in
    // migration 00058).
    const { error: updateError } = await supabase
      .from("skilled_nursing_assessments")
      .update({ mips_measures: cleaned } as never)
      .eq("id", skilledNursingAssessmentId);

    if (updateError) throw updateError;

    if (existingRow.patient_id) {
      revalidatePath(`/dashboard/patients/${existingRow.patient_id}`);
      if (existingRow.visit_id) {
        revalidatePath(
          `/dashboard/patients/${existingRow.patient_id}/visits/${existingRow.visit_id}`
        );
      }
    }
    if (existingRow.visit_id) {
      revalidatePath(`/dashboard/visits/${existingRow.visit_id}`);
    }

    void auditPhiAccess({
      action: "update",
      table: "skilled_nursing_assessments",
      recordId: skilledNursingAssessmentId,
      recordType: "skilled_nursing_assessment.mips_measures",
      oldValues: {
        mips_measures: existingRow.mips_measures ?? {},
      },
      newValues: { mips_measures: cleaned },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating MIPS measures:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
