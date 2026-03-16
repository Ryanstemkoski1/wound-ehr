"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// Treatment Order Server Actions — Phase 11.6
// CRUD + autosave for per-wound treatment orders
// ============================================================================

// Get all treatments for a visit (for visit detail display)
export async function getTreatmentsByVisit(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const { data: treatments, error } = await supabase
      .from("treatments")
      .select(
        `
        *,
        wound:wounds(id, wound_number, location, wound_type)
      `
      )
      .eq("visit_id", visitId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return treatments || [];
  } catch (error) {
    console.error("Error fetching treatments:", error);
    return [];
  }
}

// Get treatment for a specific wound in a visit
export async function getTreatmentForWound(
  visitId: string,
  woundId: string
): Promise<{
  treatment: Record<string, unknown> | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { treatment: null, error: "Unauthorized" };
  }

  try {
    const { data, error } = await supabase
      .from("treatments")
      .select("*")
      .eq("visit_id", visitId)
      .eq("wound_id", woundId)
      .maybeSingle();

    if (error) throw error;
    return { treatment: data as Record<string, unknown> | null };
  } catch (error) {
    console.error("Error fetching wound treatment:", error);
    return { treatment: null, error: "Failed to fetch treatment" };
  }
}

// Create a new treatment order
export async function createTreatment(formData: FormData): Promise<{
  success: boolean;
  treatmentId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const visitId = formData.get("visitId") as string;
    const woundId = formData.get("woundId") as string;

    if (!visitId || !woundId) {
      return { success: false, error: "Visit ID and Wound ID are required" };
    }

    const treatmentData = extractTreatmentData(formData);

    // Check if treatment already exists for this wound + visit
    const { data: existing } = await supabase
      .from("treatments")
      .select("id")
      .eq("visit_id", visitId)
      .eq("wound_id", woundId)
      .maybeSingle();

    if (existing) {
      // Update instead of create
      const { error } = await supabase
        .from("treatments")
        .update({
          ...treatmentData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;

      revalidatePath(`/dashboard/patients`);
      return { success: true, treatmentId: existing.id };
    }

    // Create new
    const { data, error } = await supabase
      .from("treatments")
      .insert({
        visit_id: visitId,
        wound_id: woundId,
        ...treatmentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients`);
    return { success: true, treatmentId: data.id };
  } catch (error) {
    console.error("Error creating treatment:", error);
    return { success: false, error: "Failed to save treatment order" };
  }
}

// Update an existing treatment order
export async function updateTreatment(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const treatmentId = formData.get("treatmentId") as string;
    if (!treatmentId) {
      return { success: false, error: "Treatment ID is required" };
    }

    const treatmentData = extractTreatmentData(formData);

    const { error } = await supabase
      .from("treatments")
      .update({
        ...treatmentData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", treatmentId);

    if (error) throw error;

    revalidatePath(`/dashboard/patients`);
    return { success: true };
  } catch (error) {
    console.error("Error updating treatment:", error);
    return { success: false, error: "Failed to update treatment order" };
  }
}

// Autosave treatment draft (upsert pattern — same as assessment autosave)
export async function autosaveTreatmentDraft(
  treatmentId: string | null,
  woundId: string,
  visitId: string,
  formData: Record<string, unknown>
): Promise<{ success: boolean; treatmentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const treatmentData = extractAutosaveData(formData);

    // Update existing
    if (treatmentId) {
      const { error } = await supabase
        .from("treatments")
        .update(treatmentData)
        .eq("id", treatmentId);

      if (error) throw error;
      return { success: true, treatmentId };
    }

    // Create new draft
    const { data, error } = await supabase
      .from("treatments")
      .insert({
        visit_id: visitId,
        wound_id: woundId,
        ...treatmentData,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return { success: true, treatmentId: data.id };
  } catch (error) {
    console.error("Autosave treatment draft failed:", error);
    return { success: false, error: "Autosave failed" };
  }
}

// Delete a treatment order
export async function deleteTreatment(treatmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", treatmentId);

    if (error) throw error;

    revalidatePath(`/dashboard/patients`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting treatment:", error);
    return { success: false, error: "Failed to delete treatment" };
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract treatment data from FormData.
 * The client now sends the full TreatmentOrderData as JSON in "treatmentState".
 * We store the per-tab state in the JSONB columns and the sentence in generated_order_text.
 */
function extractTreatmentData(formData: FormData) {
  const treatmentTab = formData.get("treatmentTab") as string;
  const generatedOrderText = formData.get("generatedOrderText") as string;
  const treatmentStateRaw = formData.get("treatmentState") as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let state: Record<string, any> = {};
  try {
    state = JSON.parse(treatmentStateRaw || "{}");
  } catch {
    /* ignore parse errors */
  }

  return {
    treatment_tab: treatmentTab || null,
    generated_order_text: generatedOrderText || null,
    treatment_orders: generatedOrderText || null,
    // Store full per-tab state in JSONB columns
    primary_dressings:
      treatmentTab === "topical" ? (state.topical ?? null) : null,
    compression:
      treatmentTab === "compression_npwt"
        ? (state.compressionNpwt ?? null)
        : null,
    moisture_management:
      treatmentTab === "skin_moisture" ? (state.skinMoisture ?? null) : null,
    secondary_treatment:
      treatmentTab === "rash_dermatitis"
        ? (state.rashDermatitis ?? null)
        : null,
    cleanser: (state.topical?.cleanser as string) || null,
    coverage: (state.topical?.coverage as string) || null,
    frequency_days: null,
    prn: false,
    npwt_pressure:
      treatmentTab === "compression_npwt" && state.compressionNpwt?.npwtPressure
        ? parseInt(state.compressionNpwt.npwtPressure)
        : null,
    npwt_frequency:
      treatmentTab === "compression_npwt"
        ? (state.compressionNpwt?.npwtSchedule as string) || null
        : null,
    special_instructions: (state.specialInstructions as string) || null,
  };
}

/**
 * Extract from Record (autosave path — receives plain object, not FormData).
 */
function extractAutosaveData(formData: Record<string, unknown>) {
  const treatmentTab = (formData.treatmentTab as string) || null;
  const generatedOrderText = (formData.generatedOrderText as string) || null;
  const treatmentStateRaw = (formData.treatmentState as string) || "{}";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let state: Record<string, any> = {};
  try {
    state = JSON.parse(treatmentStateRaw);
  } catch {
    /* ignore */
  }

  return {
    treatment_tab: treatmentTab,
    generated_order_text: generatedOrderText,
    treatment_orders: generatedOrderText,
    primary_dressings:
      treatmentTab === "topical" ? (state.topical ?? null) : null,
    compression:
      treatmentTab === "compression_npwt"
        ? (state.compressionNpwt ?? null)
        : null,
    moisture_management:
      treatmentTab === "skin_moisture" ? (state.skinMoisture ?? null) : null,
    secondary_treatment:
      treatmentTab === "rash_dermatitis"
        ? (state.rashDermatitis ?? null)
        : null,
    cleanser: null,
    coverage: null,
    frequency_days: null,
    prn: false,
    npwt_pressure: null,
    npwt_frequency: null,
    special_instructions: (state.specialInstructions as string) || null,
    updated_at: new Date().toISOString(),
  };
}
