"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Validation schemas
const billingSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  cptCodes: z.array(z.string()).default([]),
  icd10Codes: z.array(z.string()).default([]),
  modifiers: z.array(z.string()).optional(),
  timeSpent: z.boolean().default(false),
  notes: z.string().optional(),
});

type BillingInput = z.infer<typeof billingSchema>;

/**
 * Create a billing record for a visit
 */
export async function createBilling(data: BillingInput) {
  try {
    const validated = billingSchema.parse(data);
    const supabase = await createClient();

    const { data: billing, error } = await supabase
      .from("billing_codes")
      .insert({
        visit_id: validated.visitId,
        patient_id: validated.patientId,
        cpt_codes: validated.cptCodes,
        icd10_codes: validated.icd10Codes,
        modifiers: validated.modifiers || [],
        time_spent: validated.timeSpent,
        notes: validated.notes,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(
      `/dashboard/patients/${validated.patientId}/visits/${validated.visitId}`
    );
    return { success: true as const, billing };
  } catch (error) {
    console.error("Failed to create billing:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to create billing",
    };
  }
}

/**
 * Update a billing record
 */
export async function updateBilling(
  billingId: string,
  data: Partial<BillingInput>
) {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (data.cptCodes) updateData.cpt_codes = data.cptCodes;
    if (data.icd10Codes) updateData.icd10_codes = data.icd10Codes;
    if (data.modifiers !== undefined) updateData.modifiers = data.modifiers;
    if (data.timeSpent !== undefined) updateData.time_spent = data.timeSpent;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: billing, error } = await supabase
      .from("billing_codes")
      .update(updateData)
      .eq("id", billingId)
      .select(
        `
        *,
        visit:visits(patient_id)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(
      `/dashboard/patients/${billing.visit.patient_id}/visits/${billing.visit_id}`
    );
    return { success: true as const, billing };
  } catch (error) {
    console.error("Failed to update billing:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to update billing",
    };
  }
}

/**
 * Delete a billing record
 */
export async function deleteBilling(billingId: string) {
  try {
    const supabase = await createClient();

    const { data: billing, error: fetchError } = await supabase
      .from("billing_codes")
      .select("visit_id, patient_id")
      .eq("id", billingId)
      .maybeSingle();

    if (fetchError || !billing) {
      return { success: false as const, error: "Billing record not found" };
    }

    const { error: deleteError } = await supabase
      .from("billing_codes")
      .delete()
      .eq("id", billingId);

    if (deleteError) {
      throw deleteError;
    }

    revalidatePath(
      `/dashboard/patients/${billing.patient_id}/visits/${billing.visit_id}`
    );
    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete billing:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to delete billing",
    };
  }
}

/**
 * Get billing for a specific visit
 */
export async function getBillingForVisit(visitId: string) {
  try {
    const supabase = await createClient();

    const { data: billing, error } = await supabase
      .from("billing_codes")
      .select("*")
      .eq("visit_id", visitId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { success: true as const, billing };
  } catch (error) {
    console.error("Failed to get billing:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billing",
    };
  }
}

/**
 * Get all billing records for a patient
 */
export async function getBillingForPatient(patientId: string) {
  try {
    const supabase = await createClient();

    const { data: billings, error } = await supabase
      .from("billing_codes")
      .select(
        `
        *,
        visit:visits(id, visit_date, visit_type)
      `
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true as const, billings: billings || [] };
  } catch (error) {
    console.error("Failed to get billings:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billings",
    };
  }
}

/**
 * Get all billing records with optional filtering
 */
export async function getAllBilling(filters?: {
  startDate?: Date;
  endDate?: Date;
  facilityId?: string;
  patientId?: string;
}) {
  try {
    const supabase = await createClient();

    let query = supabase.from("billing_codes").select(
      `
        *,
        visit:visits(id, visit_date, visit_type),
        patient:patients(
          id,
          first_name,
          last_name,
          mrn,
          facility:facilities(id, name)
        )
      `
    );

    if (filters?.patientId) {
      query = query.eq("patient_id", filters.patientId);
    }

    if (filters?.facilityId) {
      query = query.eq("patient.facility_id", filters.facilityId);
    }

    if (filters?.startDate) {
      query = query.gte("visit.visit_date", filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte("visit.visit_date", filters.endDate.toISOString());
    }

    const { data: billings, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return { success: true as const, billings: billings || [] };
  } catch (error) {
    console.error("Failed to get all billings:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billings",
    };
  }
}
