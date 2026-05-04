"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateBillingCodes } from "@/lib/procedures";
import { auditPhiAccess } from "@/lib/audit-log";

// Billing status type (mirrors the DB enum added in migration 00045)
export type BillingStatus = "draft" | "ready" | "submitted" | "paid" | "denied";

const BILLING_STATUSES: BillingStatus[] = [
  "draft",
  "ready",
  "submitted",
  "paid",
  "denied",
];

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

    // Get user credentials for procedure validation
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false as const,
        error: "User not authenticated",
      };
    }

    // Use RPC function to bypass RLS
    const { data: userDataArray } = await supabase.rpc(
      "get_current_user_credentials"
    );

    const userData =
      userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

    // Validate CPT codes against user credentials
    const validation = await validateBillingCodes(
      userData?.credentials || null,
      validated.cptCodes
    );

    if (!validation.valid) {
      return {
        success: false as const,
        error: `Credential restriction: ${validation.errors.join(", ")}`,
      };
    }

    const { data: billing, error } = await supabase
      .from("billings")
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

    void auditPhiAccess({
      action: "create",
      table: "billings",
      recordId: billing.id,
      recordType: "billing_record",
    });
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

    // Get user credentials for procedure validation
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false as const,
        error: "User not authenticated",
      };
    }

    // Use RPC function to bypass RLS
    const { data: userDataArray } = await supabase.rpc(
      "get_current_user_credentials"
    );

    const userData =
      userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

    // Validate CPT codes against user credentials if they're being updated
    if (data.cptCodes) {
      const validation = await validateBillingCodes(
        userData?.credentials || null,
        data.cptCodes
      );

      if (!validation.valid) {
        return {
          success: false as const,
          error: `Credential restriction: ${validation.errors.join(", ")}`,
        };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.cptCodes) updateData.cpt_codes = data.cptCodes;
    if (data.icd10Codes) updateData.icd10_codes = data.icd10Codes;
    if (data.modifiers !== undefined) updateData.modifiers = data.modifiers;
    if (data.timeSpent !== undefined) updateData.time_spent = data.timeSpent;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: billing, error } = await supabase
      .from("billings")
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

    void auditPhiAccess({
      action: "update",
      table: "billings",
      recordId: billingId,
      recordType: "billing_record",
    });
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
      .from("billings")
      .select("visit_id, patient_id")
      .eq("id", billingId)
      .maybeSingle();

    if (fetchError || !billing) {
      return { success: false as const, error: "Billing record not found" };
    }

    const { error: deleteError } = await supabase
      .from("billings")
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
      .from("billings")
      .select("*")
      .eq("visit_id", visitId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!billing) return { success: true as const, billing: null };

    return {
      success: true as const,
      billing: {
        ...billing,
        billingStatus: (billing.billing_status ?? "draft") as BillingStatus,
        submittedAt: billing.submitted_at ?? null,
        claimNumber: billing.claim_number ?? null,
        cptCodes: (billing.cpt_codes ?? []) as string[],
        icd10Codes: (billing.icd10_codes ?? []) as string[],
        modifiers: (billing.modifiers ?? []) as string[],
        units: (billing.units ?? {}) as Record<string, number>,
      },
    };
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
      .from("billings")
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

    let query = supabase.from("billings").select(
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

    // Map to camelCase shape expected by UI
    const mapped = (billings || []).map((b) => {
      const visit = b.visit as {
        id: string;
        visit_date: string;
        visit_type: string;
      } | null;
      const patient = b.patient as {
        id: string;
        first_name: string;
        last_name: string;
        mrn: string;
        facility: { id: string; name: string } | null;
      } | null;
      return {
        id: b.id,
        cptCodes: b.cpt_codes ?? [],
        icd10Codes: b.icd10_codes ?? [],
        modifiers: b.modifiers ?? [],
        timeSpent: !!b.time_spent,
        notes: b.notes ?? null,
        billingStatus: (b.billing_status ?? "draft") as BillingStatus,
        submittedAt: b.submitted_at ?? null,
        claimNumber: b.claim_number ?? null,
        createdAt: b.created_at ? new Date(b.created_at) : new Date(),
        visit: visit
          ? {
              id: visit.id,
              visitDate: new Date(visit.visit_date),
              visitType: visit.visit_type,
            }
          : { id: b.visit_id, visitDate: new Date(), visitType: "" },
        patient: patient
          ? {
              id: patient.id,
              firstName: patient.first_name,
              lastName: patient.last_name,
              mrn: patient.mrn,
              facility: patient.facility
                ? { id: patient.facility.id, name: patient.facility.name }
                : { id: "", name: "" },
            }
          : {
              id: b.patient_id,
              firstName: "",
              lastName: "",
              mrn: "",
              facility: { id: "", name: "" },
            },
      };
    });

    return { success: true as const, billings: mapped };
  } catch (error) {
    console.error("Failed to get all billings:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billings",
    };
  }
}

/**
 * Phase 4 — Mark a billing record as "ready" (ops staff pre-flight check)
 * or transition through any status in the defined lifecycle. Only ops
 * admins should call setBillingStatus; submitBilling is the canonical path
 * for electronic submission.
 */
export async function setBillingStatus(
  billingId: string,
  status: BillingStatus,
  claimNumber?: string
): Promise<{ success: boolean; error?: string }> {
  if (!BILLING_STATUSES.includes(status)) {
    return { success: false, error: "Invalid billing status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Fetch existing record to get revalidation paths
  const { data: existing, error: fetchErr } = await supabase
    .from("billings")
    .select("id, visit_id, patient_id")
    .eq("id", billingId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: "Billing record not found" };
  }

  const updatePayload: Record<string, unknown> = {
    billing_status: status,
    updated_at: new Date().toISOString(),
  };
  if (claimNumber !== undefined) updatePayload.claim_number = claimNumber;

  const { error: updateErr } = await supabase
    .from("billings")
    .update(updatePayload)
    .eq("id", billingId);

  if (updateErr) {
    console.error("Failed to update billing status:", updateErr);
    return { success: false, error: "Failed to update billing status" };
  }

  void auditPhiAccess({
    action: "update",
    table: "billings",
    recordId: billingId,
    recordType: "billing_status_change",
    reason: `Status set to ${status}`,
  });
  revalidatePath(
    `/dashboard/patients/${existing.patient_id}/visits/${existing.visit_id}`
  );
  revalidatePath("/dashboard/billing");
  return { success: true };
}

/**
 * Phase 4 — Transition a "ready" billing record to "submitted" and record
 * the submission timestamp. Blocks if the record is already submitted, paid,
 * or denied, or if it has no CPT codes.
 */
export async function submitBillingRecord(
  billingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: billing, error: fetchErr } = await supabase
    .from("billings")
    .select("id, visit_id, patient_id, billing_status, cpt_codes")
    .eq("id", billingId)
    .maybeSingle();

  if (fetchErr || !billing) {
    return { success: false, error: "Billing record not found" };
  }

  const lockedStatuses: BillingStatus[] = ["submitted", "paid", "denied"];
  if (lockedStatuses.includes(billing.billing_status as BillingStatus)) {
    return {
      success: false,
      error: `Billing is already ${billing.billing_status} — cannot re-submit.`,
    };
  }

  const cptCodes = Array.isArray(billing.cpt_codes)
    ? (billing.cpt_codes as string[])
    : [];
  if (cptCodes.length === 0) {
    return {
      success: false,
      error: "Add at least one CPT code before submitting.",
    };
  }

  const { error: updateErr } = await supabase
    .from("billings")
    .update({
      billing_status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", billingId);

  if (updateErr) {
    console.error("Failed to submit billing:", updateErr);
    return { success: false, error: "Failed to submit billing record" };
  }

  void auditPhiAccess({
    action: "update",
    table: "billings",
    recordId: billingId,
    recordType: "billing_submission",
  });
  revalidatePath(
    `/dashboard/patients/${billing.patient_id}/visits/${billing.visit_id}`
  );
  revalidatePath("/dashboard/billing");
  return { success: true };
}
