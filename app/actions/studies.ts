"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditPhiAccess } from "@/lib/audit-log";
import { assertUuid, ValidationError } from "@/lib/validations/common";

// ============================================================================
// Studies Server Actions — Phase 3 Clinical UX
//
// CRUD for the Studies tab on the visit page:
//   * visit_studies_orders  — what was ordered (lab / imaging / pathology / etc.)
//   * visit_studies_results — what came back (with normal/abnormal/critical flag)
//
// Both tables are scoped to a visit. RLS enforces the
// visit -> patient -> facility -> user_facilities chain, so the actions only
// need to validate input shape and audit access — row visibility is enforced
// by Postgres.
//
// TODO(types): Supabase generated types have not been regenerated for the
// migration 00055 tables (visit_studies_orders / visit_studies_results).
// Until `supabase gen types` is run, every `.from("visit_studies_*")` call
// must use the `as never` boundary cast to satisfy the typed client. Replace
// the casts with proper table names once the generated types are refreshed.
// ============================================================================

// ----------------------------------------------------------------------------
// Public unions — kept in sync with the CHECK constraints in migration 00055.
// ----------------------------------------------------------------------------
export type StudyCategory =
  | "lab"
  | "vascular_imaging"
  | "pathology_procedure"
  | "tissue_culture"
  | "biopsy";

export type StudyFlag = "normal" | "abnormal" | "critical";

const STUDY_CATEGORIES = [
  "lab",
  "vascular_imaging",
  "pathology_procedure",
  "tissue_culture",
  "biopsy",
] as const satisfies readonly StudyCategory[];

const STUDY_FLAGS = [
  "normal",
  "abnormal",
  "critical",
] as const satisfies readonly StudyFlag[];

// ----------------------------------------------------------------------------
// Zod schemas
// ----------------------------------------------------------------------------
const addStudyOrderSchema = z.object({
  visitId: z.string().uuid("visitId must be a valid UUID"),
  category: z.enum(STUDY_CATEGORIES),
  testCode: z
    .string()
    .trim()
    .min(1, "testCode is required")
    .max(64, "testCode is too long"),
  testName: z.string().trim().max(256).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const addStudyResultSchema = z.object({
  visitId: z.string().uuid("visitId must be a valid UUID"),
  testCode: z
    .string()
    .trim()
    .min(1, "testCode is required")
    .max(64, "testCode is too long"),
  testName: z.string().trim().max(256).optional(),
  // YYYY-MM-DD; Postgres DATE column will reject anything else anyway.
  resultDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "resultDate must be YYYY-MM-DD")
    .optional(),
  resultValue: z.string().max(2000).optional(),
  flag: z.enum(STUDY_FLAGS).optional(),
  documentPath: z.string().trim().max(1024).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const updateStudyResultSchema = z.object({
  testCode: z.string().trim().min(1).max(64).optional(),
  testName: z.string().trim().max(256).nullable().optional(),
  resultDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "resultDate must be YYYY-MM-DD")
    .nullable()
    .optional(),
  resultValue: z.string().max(2000).nullable().optional(),
  flag: z.enum(STUDY_FLAGS).optional(),
  documentPath: z.string().trim().max(1024).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type AddStudyOrderInput = z.infer<typeof addStudyOrderSchema>;
export type AddStudyResultInput = z.infer<typeof addStudyResultSchema>;
export type UpdateStudyResultInput = z.infer<typeof updateStudyResultSchema>;

export type StudyOrder = {
  id: string;
  visit_id: string;
  category: StudyCategory;
  test_code: string;
  test_name: string | null;
  ordered_at: string;
  ordered_by: string | null;
  notes: string | null;
  created_at: string;
};

export type StudyResult = {
  id: string;
  visit_id: string;
  test_code: string;
  test_name: string | null;
  result_date: string | null;
  result_value: string | null;
  flag: StudyFlag;
  document_path: string | null;
  notes: string | null;
  entered_by: string | null;
  created_at: string;
};

type ActionResult<T> =
  | ({ success: true } & T)
  | { success: false; error: string };

type ActionOk = { success: true; error?: undefined };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Look up the patient_id for a visit so we can revalidate the patient's
 * visit detail page. Returns null if the visit can't be read (RLS blocks
 * cross-tenant access — that's the desired security boundary).
 */
async function getVisitPatientId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("visits")
    .select("patient_id")
    .eq("id", visitId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { patient_id: string | null }).patient_id ?? null;
}

function revalidateVisit(visitId: string, patientId: string | null) {
  revalidatePath("/dashboard/patients");
  if (patientId) {
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/patients/${patientId}/visits/${visitId}`);
  }
}

function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

// ----------------------------------------------------------------------------
// Orders
// ----------------------------------------------------------------------------

/**
 * Add a study order to a visit. The (visit_id, category, test_code) tuple is
 * UNIQUE in the DB; duplicate inserts surface a friendly error.
 */
export async function addStudyOrder(
  input: AddStudyOrderInput
): Promise<ActionResult<{ orderId: string }>> {
  const parsed = addStudyOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data: inserted, error } = await supabase
      .from("visit_studies_orders" as never)
      .insert({
        visit_id: data.visitId,
        category: data.category,
        test_code: data.testCode,
        test_name: data.testName ?? null,
        ordered_by: user.id,
        notes: data.notes ?? null,
      } as never)
      .select("id")
      .single();

    if (error) {
      // Postgres unique-violation -> friendlier message.
      if ((error as { code?: string }).code === "23505") {
        return {
          success: false,
          error: "This study is already ordered for this visit.",
        };
      }
      throw error;
    }

    const orderId = (inserted as { id: string }).id;

    void auditPhiAccess({
      action: "create",
      table: "visit_studies_orders",
      recordId: orderId,
      recordType: "study_order",
    });

    revalidateVisit(data.visitId, await getVisitPatientId(supabase, data.visitId));
    return { success: true, orderId };
  } catch (error) {
    console.error("Failed to add study order:", error);
    return { success: false, error: "Failed to add study order" };
  }
}

/**
 * List study orders for a visit, newest first.
 */
export async function listStudyOrders(visitId: string): Promise<StudyOrder[]> {
  let safeVisitId: string;
  try {
    safeVisitId = assertUuid(visitId, "visitId");
  } catch (e) {
    if (e instanceof ValidationError) return [];
    throw e;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data, error } = await supabase
      .from("visit_studies_orders" as never)
      .select("*")
      .eq("visit_id", safeVisitId)
      .order("ordered_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as StudyOrder[];
  } catch (error) {
    console.error("Failed to list study orders:", error);
    return [];
  }
}

/**
 * Remove a single study order by id.
 */
export async function removeStudyOrder(
  id: string
): Promise<ActionOk | { success: false; error: string }> {
  try {
    assertUuid(id, "id");
  } catch (e) {
    return {
      success: false,
      error: e instanceof ValidationError ? e.message : "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Fetch the visit_id first so we can revalidate the right page after delete.
    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data: existing } = await supabase
      .from("visit_studies_orders" as never)
      .select("visit_id")
      .eq("id", id)
      .maybeSingle();
    const visitId = (existing as { visit_id?: string } | null)?.visit_id ?? null;

    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { error } = await supabase
      .from("visit_studies_orders" as never)
      .delete()
      .eq("id", id);

    if (error) throw error;

    void auditPhiAccess({
      action: "delete",
      table: "visit_studies_orders",
      recordId: id,
      recordType: "study_order",
    });

    if (visitId) {
      revalidateVisit(visitId, await getVisitPatientId(supabase, visitId));
    } else {
      revalidatePath("/dashboard/patients");
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to remove study order:", error);
    return { success: false, error: "Failed to remove study order" };
  }
}

// ----------------------------------------------------------------------------
// Results
// ----------------------------------------------------------------------------

/**
 * Add a study result row for a visit. `flag` defaults to "normal" at the DB,
 * so it's optional on the input.
 */
export async function addStudyResult(
  input: AddStudyResultInput
): Promise<ActionResult<{ resultId: string }>> {
  const parsed = addStudyResultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data: inserted, error } = await supabase
      .from("visit_studies_results" as never)
      .insert({
        visit_id: data.visitId,
        test_code: data.testCode,
        test_name: data.testName ?? null,
        result_date: data.resultDate ?? null,
        result_value: data.resultValue ?? null,
        flag: data.flag ?? "normal",
        document_path: data.documentPath ?? null,
        notes: data.notes ?? null,
        entered_by: user.id,
      } as never)
      .select("id")
      .single();

    if (error) throw error;

    const resultId = (inserted as { id: string }).id;

    void auditPhiAccess({
      action: "create",
      table: "visit_studies_results",
      recordId: resultId,
      recordType: "study_result",
    });

    revalidateVisit(data.visitId, await getVisitPatientId(supabase, data.visitId));
    return { success: true, resultId };
  } catch (error) {
    console.error("Failed to add study result:", error);
    return { success: false, error: "Failed to add study result" };
  }
}

/**
 * List study results for a visit, newest first (by result_date then created_at).
 */
export async function listStudyResults(visitId: string): Promise<StudyResult[]> {
  let safeVisitId: string;
  try {
    safeVisitId = assertUuid(visitId, "visitId");
  } catch (e) {
    if (e instanceof ValidationError) return [];
    throw e;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data, error } = await supabase
      .from("visit_studies_results" as never)
      .select("*")
      .eq("visit_id", safeVisitId)
      .order("result_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as StudyResult[];
  } catch (error) {
    console.error("Failed to list study results:", error);
    return [];
  }
}

/**
 * Patch one or more fields on a study result row. Fields that are explicitly
 * `null` clear the column; fields left `undefined` are not touched.
 */
export async function updateStudyResult(
  id: string,
  patch: UpdateStudyResultInput
): Promise<ActionOk | { success: false; error: string }> {
  try {
    assertUuid(id, "id");
  } catch (e) {
    return {
      success: false,
      error: e instanceof ValidationError ? e.message : "Invalid input",
    };
  }

  const parsed = updateStudyResultSchema.safeParse(patch);
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) };
  }
  const data = parsed.data;

  // Reject empty patches early — saves a round-trip and avoids audit noise.
  if (Object.keys(data).length === 0) {
    return { success: false, error: "No fields to update" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Build the update payload — only include keys the caller actually sent.
    const update: Record<string, unknown> = {};
    if (data.testCode !== undefined) update.test_code = data.testCode;
    if (data.testName !== undefined) update.test_name = data.testName;
    if (data.resultDate !== undefined) update.result_date = data.resultDate;
    if (data.resultValue !== undefined) update.result_value = data.resultValue;
    if (data.flag !== undefined) update.flag = data.flag;
    if (data.documentPath !== undefined)
      update.document_path = data.documentPath;
    if (data.notes !== undefined) update.notes = data.notes;

    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data: updated, error } = await supabase
      .from("visit_studies_results" as never)
      .update(update as never)
      .eq("id", id)
      .select("visit_id")
      .maybeSingle();

    if (error) throw error;
    if (!updated) {
      return { success: false, error: "Result not found or access denied" };
    }

    const visitId = (updated as { visit_id: string }).visit_id;

    void auditPhiAccess({
      action: "update",
      table: "visit_studies_results",
      recordId: id,
      recordType: "study_result",
    });

    revalidateVisit(visitId, await getVisitPatientId(supabase, visitId));
    return { success: true };
  } catch (error) {
    console.error("Failed to update study result:", error);
    return { success: false, error: "Failed to update study result" };
  }
}

/**
 * Remove a single study result by id.
 */
export async function removeStudyResult(
  id: string
): Promise<ActionOk | { success: false; error: string }> {
  try {
    assertUuid(id, "id");
  } catch (e) {
    return {
      success: false,
      error: e instanceof ValidationError ? e.message : "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { data: existing } = await supabase
      .from("visit_studies_results" as never)
      .select("visit_id")
      .eq("id", id)
      .maybeSingle();
    const visitId = (existing as { visit_id?: string } | null)?.visit_id ?? null;

    // TODO(types): regenerate supabase types and drop the `as never` cast.
    const { error } = await supabase
      .from("visit_studies_results" as never)
      .delete()
      .eq("id", id);

    if (error) throw error;

    void auditPhiAccess({
      action: "delete",
      table: "visit_studies_results",
      recordId: id,
      recordType: "study_result",
    });

    if (visitId) {
      revalidateVisit(visitId, await getVisitPatientId(supabase, visitId));
    } else {
      revalidatePath("/dashboard/patients");
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to remove study result:", error);
    return { success: false, error: "Failed to remove study result" };
  }
}
