"use server";

// Procedure tagging + per-procedure documentation for the Phase 3
// unified wound assessment.
//
// Backed by migrations:
//   - 00052_assessment_procedures.sql
//       * assessments.procedures_performed TEXT[] (CHECK in allowed set)
//       * assessments.healing_sign_off BOOLEAN
//   - 00053_procedure_documentation.sql
//       * procedure_documentation(id, assessment_id, procedure_type,
//         payload jsonb, created_by, created_at, updated_at)
//         UNIQUE (assessment_id, procedure_type)
//
// Style reference: app/actions/assessments.ts lines 287-318 (createAssessment
// column write pattern + audit + revalidate cadence).
//
// TODO regen types after migration applies — Database types do not yet
// include assessments.procedures_performed, assessments.healing_sign_off,
// nor the procedure_documentation table. Boundary casts are used until
// `npm run db:types` is re-run against a linked Supabase project. Once
// regenerated, drop the `as never` / `as { ... }` casts in this file.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditPhiAccess } from "@/lib/audit-log";
import type { Json } from "@/lib/database.types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Allowed procedure tag values. Must stay in sync with:
 *   - assessments_procedures_performed_check (migration 00052)
 *   - procedure_documentation.procedure_type CHECK (migration 00053)
 *   - the chip list rendered in the UI
 */
export type ProcedureType =
  | "sharp_debridement"
  | "biologic_graft"
  | "arobella"
  | "feeding_tube_change"
  | "urinary_catheter_replacement";

const PROCEDURE_TYPES: readonly ProcedureType[] = [
  "sharp_debridement",
  "biologic_graft",
  "arobella",
  "feeding_tube_change",
  "urinary_catheter_replacement",
] as const;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const procedureTypeSchema = z.enum([
  "sharp_debridement",
  "biologic_graft",
  "arobella",
  "feeding_tube_change",
  "urinary_catheter_replacement",
]);

const assessmentIdSchema = z.string().uuid();

const toggleSchema = z.object({
  assessmentId: assessmentIdSchema,
  procedureType: procedureTypeSchema,
  on: z.boolean(),
});

const signOffSchema = z.object({
  assessmentId: assessmentIdSchema,
  signedOff: z.boolean(),
});

const saveDocSchema = z.object({
  assessmentId: assessmentIdSchema,
  procedureType: procedureTypeSchema,
  // Payload is a free-form JSON object at this boundary; per-procedure
  // shape validation lives alongside each chip's form component.
  payload: z.record(z.string(), z.unknown()),
});

const deleteDocSchema = z.object({
  assessmentId: assessmentIdSchema,
  procedureType: procedureTypeSchema,
});

const getDocSchema = z.object({
  assessmentId: assessmentIdSchema,
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the patient + visit id for an assessment so we can revalidate the
 * correct visit page. RLS gates this query — if the caller cannot see the
 * assessment, we return null and the caller surfaces "not found".
 */
async function loadAssessmentContext(
  assessmentId: string
): Promise<{ visitId: string; patientId: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .select(
      `
      visit_id,
      visit:visits!inner(
        patient_id
      )
      `
    )
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !data) return null;
  // The nested select returns visit as an object via the FK relation; older
  // generated types sometimes type it as an array. Normalize both shapes.
  const visit = Array.isArray(data.visit) ? data.visit[0] : data.visit;
  if (!visit?.patient_id) return null;

  return {
    visitId: data.visit_id as string,
    patientId: visit.patient_id as string,
  };
}

function revalidateVisit(visitId: string, patientId: string): void {
  revalidatePath("/dashboard/patients");
  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath(`/dashboard/patients/${patientId}/visits/${visitId}`);
}

// ---------------------------------------------------------------------------
// toggleProcedureTag
// ---------------------------------------------------------------------------

/**
 * Add or remove a procedure tag from assessments.procedures_performed.
 *
 * Read-modify-write on a TEXT[]: we fetch the current array, mutate locally
 * (dedup on add, filter on remove), and write the new array back. Postgres
 * does not provide a single-statement set-toggle that also enforces the
 * column CHECK constraint cleanly, so this pattern keeps the validation in
 * one place. Concurrent writes to the same assessment will race; that is
 * acceptable for a per-visit chip toggle (one clinician at a time).
 */
export async function toggleProcedureTag(
  assessmentId: string,
  procedureType: ProcedureType,
  on: boolean
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { assessmentId: id, procedureType: type, on: shouldBeOn } =
      toggleSchema.parse({ assessmentId, procedureType, on });

    // TODO regen types after migration applies — procedures_performed is not
    // yet in the generated Database type, hence the row cast below.
    const { data: row, error: readError } = await supabase
      .from("assessments")
      .select("id, procedures_performed")
      .eq("id", id)
      .maybeSingle();

    if (readError) throw readError;
    if (!row) return { error: "Assessment not found or access denied" };

    const current: ProcedureType[] = Array.isArray(
      (row as { procedures_performed?: unknown }).procedures_performed
    )
      ? (((row as { procedures_performed?: unknown })
          .procedures_performed as string[]).filter((v): v is ProcedureType =>
          PROCEDURE_TYPES.includes(v as ProcedureType)
        ))
      : [];

    const next: ProcedureType[] = shouldBeOn
      ? current.includes(type)
        ? current
        : [...current, type]
      : current.filter((v) => v !== type);

    // No-op if the array did not actually change.
    if (
      next.length === current.length &&
      next.every((v, i) => v === current[i])
    ) {
      return { success: true };
    }

    const { error: updateError } = await supabase
      .from("assessments")
      // TODO regen types after migration applies — drop `as never` cast.
      .update({ procedures_performed: next } as never)
      .eq("id", id);

    if (updateError) throw updateError;

    void auditPhiAccess({
      action: "update",
      table: "assessments",
      recordId: id,
      recordType: "wound_assessment",
      newValues: { procedures_performed: next },
    });

    const ctx = await loadAssessmentContext(id);
    if (ctx) revalidateVisit(ctx.visitId, ctx.patientId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to toggle procedure tag:", error);
    return { error: "Failed to update procedure tag" };
  }
}

// ---------------------------------------------------------------------------
// setHealingSignOff
// ---------------------------------------------------------------------------

/**
 * Set assessments.healing_sign_off. This is an explicit clinical act
 * (care transferred / no longer following) — see migration 00052.
 */
export async function setHealingSignOff(
  assessmentId: string,
  signedOff: boolean
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { assessmentId: id, signedOff: value } = signOffSchema.parse({
      assessmentId,
      signedOff,
    });

    const { error: updateError } = await supabase
      .from("assessments")
      // TODO regen types after migration applies — drop `as never` cast.
      .update({ healing_sign_off: value } as never)
      .eq("id", id);

    if (updateError) throw updateError;

    void auditPhiAccess({
      action: value ? "sign" : "update",
      table: "assessments",
      recordId: id,
      recordType: "wound_assessment",
      newValues: { healing_sign_off: value },
    });

    const ctx = await loadAssessmentContext(id);
    if (ctx) revalidateVisit(ctx.visitId, ctx.patientId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to set healing sign off:", error);
    return { error: "Failed to update sign-off" };
  }
}

// ---------------------------------------------------------------------------
// saveProcedureDocumentation
// ---------------------------------------------------------------------------

/**
 * Upsert the per-procedure detail payload for (assessment_id, procedure_type).
 * Re-tagging a chip with the same key overwrites payload (UNIQUE constraint
 * lives in migration 00053). created_by is stamped on insert only — updates
 * leave it pointing at the original capturing clinician.
 */
export async function saveProcedureDocumentation(
  assessmentId: string,
  procedureType: ProcedureType,
  payload: Record<string, unknown>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const {
      assessmentId: id,
      procedureType: type,
      payload: validatedPayload,
    } = saveDocSchema.parse({ assessmentId, procedureType, payload });

    // TODO regen types after migration applies — procedure_documentation is
    // not yet in the generated Database type, so the table accessor is cast.
    const { error: upsertError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("procedure_documentation" as never)
      .upsert(
        {
          assessment_id: id,
          procedure_type: type,
          payload: validatedPayload as unknown as Json,
          created_by: user.id,
        } as never,
        { onConflict: "assessment_id,procedure_type" }
      );

    if (upsertError) throw upsertError;

    void auditPhiAccess({
      action: "update",
      table: "procedure_documentation",
      recordId: id,
      recordType: `procedure:${type}`,
      newValues: validatedPayload,
    });

    const ctx = await loadAssessmentContext(id);
    if (ctx) revalidateVisit(ctx.visitId, ctx.patientId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to save procedure documentation:", error);
    return { error: "Failed to save procedure documentation" };
  }
}

// ---------------------------------------------------------------------------
// getProcedureDocumentation
// ---------------------------------------------------------------------------

export type ProcedureDocumentationView = {
  tags: ProcedureType[];
  healingSignOff: boolean;
  docs: Array<{
    procedureType: ProcedureType;
    payload: Record<string, unknown>;
  }>;
};

/**
 * Fetch the procedure tags, sign-off flag, and any per-procedure detail
 * payloads for a single assessment. PHI read — audited.
 */
export async function getProcedureDocumentation(
  assessmentId: string
): Promise<ProcedureDocumentationView | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { assessmentId: id } = getDocSchema.parse({ assessmentId });

    // TODO regen types after migration applies — see top of file.
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, procedures_performed, healing_sign_off")
      .eq("id", id)
      .maybeSingle();

    if (aErr) throw aErr;
    if (!assessment) return { error: "Assessment not found or access denied" };

    const tags: ProcedureType[] = Array.isArray(
      (assessment as { procedures_performed?: unknown }).procedures_performed
    )
      ? (((assessment as { procedures_performed?: unknown })
          .procedures_performed as string[]).filter((v): v is ProcedureType =>
          PROCEDURE_TYPES.includes(v as ProcedureType)
        ))
      : [];

    const healingSignOff = Boolean(
      (assessment as { healing_sign_off?: unknown }).healing_sign_off
    );

    // TODO regen types after migration applies — drop the `as never` cast.
    const { data: rawDocs, error: dErr } = await supabase
      .from("procedure_documentation" as never)
      .select("procedure_type, payload")
      .eq("assessment_id", id);

    if (dErr) throw dErr;

    const docs = ((rawDocs ?? []) as Array<{
      procedure_type: string;
      payload: unknown;
    }>)
      .filter((r): r is { procedure_type: ProcedureType; payload: unknown } =>
        PROCEDURE_TYPES.includes(r.procedure_type as ProcedureType)
      )
      .map((r) => ({
        procedureType: r.procedure_type,
        payload:
          r.payload && typeof r.payload === "object" && !Array.isArray(r.payload)
            ? (r.payload as Record<string, unknown>)
            : {},
      }));

    void auditPhiAccess({
      action: "read",
      table: "procedure_documentation",
      recordId: id,
      recordType: "wound_assessment",
    });

    return { tags, healingSignOff, docs };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to load procedure documentation:", error);
    return { error: "Failed to load procedure documentation" };
  }
}

// ---------------------------------------------------------------------------
// deleteProcedureDocumentation
// ---------------------------------------------------------------------------

/**
 * Delete the per-procedure detail row AND remove the tag from
 * assessments.procedures_performed. Untagging a chip in the UI should never
 * leave behind orphan detail or an orphan tag, so we perform both writes.
 * If the detail delete fails we abort before mutating the tag array.
 */
export async function deleteProcedureDocumentation(
  assessmentId: string,
  procedureType: ProcedureType
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { assessmentId: id, procedureType: type } = deleteDocSchema.parse({
      assessmentId,
      procedureType,
    });

    // TODO regen types after migration applies — drop the `as never` cast.
    const { error: deleteError } = await supabase
      .from("procedure_documentation" as never)
      .delete()
      .eq("assessment_id", id)
      .eq("procedure_type", type);

    if (deleteError) throw deleteError;

    // Untag in the same call so the chip visibly clears.
    const toggleResult = await toggleProcedureTag(id, type, false);
    if ("error" in toggleResult) return toggleResult;

    void auditPhiAccess({
      action: "delete",
      table: "procedure_documentation",
      recordId: id,
      recordType: `procedure:${type}`,
    });

    const ctx = await loadAssessmentContext(id);
    if (ctx) revalidateVisit(ctx.visitId, ctx.patientId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to delete procedure documentation:", error);
    return { error: "Failed to delete procedure documentation" };
  }
}
