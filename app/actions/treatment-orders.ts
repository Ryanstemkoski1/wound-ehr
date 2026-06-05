"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { auditPhiAccess } from "@/lib/audit-log";

// ============================================================================
// Treatment Order Builder — Phase 3 (7-category wizard)
// ----------------------------------------------------------------------------
// One row per (assessment_id, category) in public.treatment_orders.
// `rendered_text` is the natural-language sentence the leave-behind PDF prints.
//
// The legacy `treatments` table in app/actions/treatments.ts is intentionally
// untouched — it remains valid for back-compat. Only the new wizard writes
// here.
//
// TODO(types): Supabase generated types have not been regenerated for the
// `treatment_orders` table yet (migration 00054). Every `.from(...)` call
// below uses an `as never` boundary cast to silence the table-name overload
// until `npm run gen:types` (or equivalent) is run. Remove the casts once
// the regenerated types include `treatment_orders`.
// ============================================================================

// ---------------------------------------------------------------------------
// Types & schemas
// ---------------------------------------------------------------------------

export type TreatmentCategory =
  | "open_wound"
  | "eschar"
  | "compression_npwt"
  | "skin_moisture"
  | "rash_dermatitis"
  | "graft_tx"
  | "custom";

const treatmentCategorySchema = z.enum([
  "open_wound",
  "eschar",
  "compression_npwt",
  "skin_moisture",
  "rash_dermatitis",
  "graft_tx",
  "custom",
]);

const saveTreatmentOrderSchema = z.object({
  assessmentId: z.string().uuid("assessmentId must be a valid UUID"),
  category: treatmentCategorySchema,
  payload: z.record(z.string(), z.unknown()),
  renderedText: z.string().max(10000),
});

const deleteTreatmentOrderSchema = z.object({
  assessmentId: z.string().uuid("assessmentId must be a valid UUID"),
  category: treatmentCategorySchema,
});

const getForAssessmentSchema = z.string().uuid("assessmentId must be a valid UUID");

export type TreatmentOrderRow = {
  id: string;
  category: TreatmentCategory;
  payload: Record<string, unknown>;
  renderedText: string;
  createdAt: string;
  updatedAt: string;
};

type DbTreatmentOrderRow = {
  id: string;
  assessment_id: string;
  category: TreatmentCategory;
  payload: Record<string, unknown> | null;
  rendered_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// saveTreatmentOrder — upsert by (assessment_id, category)
// ---------------------------------------------------------------------------

export async function saveTreatmentOrder(input: {
  assessmentId: string;
  category: TreatmentCategory;
  payload: Record<string, unknown>;
  renderedText: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = saveTreatmentOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { assessmentId, category, payload, renderedText } = parsed.data;

  try {
    // Look up existing row so we know whether this is an insert or an update
    // (`created_by` is only set on insert).
    // TODO(types): drop `as never` once generated types include treatment_orders.
    const { data: existing, error: existingErr } = await supabase
      .from("treatment_orders" as never)
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("category", category)
      .maybeSingle<{ id: string }>();

    if (existingErr) throw existingErr;

    if (existing) {
      // TODO(types): drop `as never` once generated types include treatment_orders.
      const { error } = await supabase
        .from("treatment_orders" as never)
        .update({
          payload,
          rendered_text: renderedText,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", existing.id);

      if (error) throw error;

      void auditPhiAccess({
        action: "update",
        table: "treatment_orders",
        recordId: existing.id,
        recordType: "treatment_order",
      });

      revalidatePath("/dashboard/patients");
      return { success: true, id: existing.id };
    }

    // Insert path — set created_by from the session user.
    // TODO(types): drop `as never` once generated types include treatment_orders.
    const { data, error } = await supabase
      .from("treatment_orders" as never)
      .insert({
        assessment_id: assessmentId,
        category,
        payload,
        rendered_text: renderedText,
        created_by: user.id,
      } as never)
      .select("id")
      .single<{ id: string }>();

    if (error) throw error;

    void auditPhiAccess({
      action: "create",
      table: "treatment_orders",
      recordId: data.id,
      recordType: "treatment_order",
    });

    revalidatePath("/dashboard/patients");
    return { success: true, id: data.id };
  } catch (err) {
    console.error("Error saving treatment order:", err);
    return { success: false, error: "Failed to save treatment order" };
  }
}

// ---------------------------------------------------------------------------
// getTreatmentOrdersForAssessment
// ---------------------------------------------------------------------------

export async function getTreatmentOrdersForAssessment(
  assessmentId: string
): Promise<TreatmentOrderRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const parsed = getForAssessmentSchema.safeParse(assessmentId);
  if (!parsed.success) return [];

  try {
    // TODO(types): drop `as never` once generated types include treatment_orders.
    const { data, error } = await supabase
      .from("treatment_orders" as never)
      .select(
        "id, assessment_id, category, payload, rendered_text, created_by, created_at, updated_at"
      )
      .eq("assessment_id", parsed.data)
      .order("created_at", { ascending: true })
      .returns<DbTreatmentOrderRow[]>();

    if (error) {
      console.error("Error fetching treatment orders:", error);
      return [];
    }

    void auditPhiAccess({
      action: "read",
      table: "treatment_orders",
      recordId: parsed.data,
      recordType: "treatment_orders_list",
    });

    return (data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      renderedText: row.rendered_text ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching treatment orders:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// deleteTreatmentOrder — remove the row for (assessment_id, category)
// ---------------------------------------------------------------------------

export async function deleteTreatmentOrder(
  assessmentId: string,
  category: TreatmentCategory
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = deleteTreatmentOrderSchema.safeParse({ assessmentId, category });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    // Look up the id first so the audit row has a meaningful recordId
    // (and so we can short-circuit if there's nothing to delete).
    // TODO(types): drop `as never` once generated types include treatment_orders.
    const { data: existing, error: existingErr } = await supabase
      .from("treatment_orders" as never)
      .select("id")
      .eq("assessment_id", parsed.data.assessmentId)
      .eq("category", parsed.data.category)
      .maybeSingle<{ id: string }>();

    if (existingErr) throw existingErr;
    if (!existing) {
      return { success: true };
    }

    // TODO(types): drop `as never` once generated types include treatment_orders.
    const { error } = await supabase
      .from("treatment_orders" as never)
      .delete()
      .eq("id", existing.id);

    if (error) throw error;

    void auditPhiAccess({
      action: "delete",
      table: "treatment_orders",
      recordId: existing.id,
      recordType: "treatment_order",
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (err) {
    console.error("Error deleting treatment order:", err);
    return { success: false, error: "Failed to delete treatment order" };
  }
}
