"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requiresPatientSignature } from "@/app/actions/signatures";
import { getUserRole, getUserCredentials } from "@/lib/rbac";
import { canEditVisit } from "@/lib/field-permissions";
import { invalidateVisitPDFCache } from "@/app/actions/pdf-cached";
import { auditPhiAccess } from "@/lib/audit-log";

// Validation schema
const visitSchema = z.object({
  patientId: z.string().uuid(),
  visitDate: z.string().min(1, "Visit date is required"),
  visitType: z.enum(["in_person", "telemed"]),
  location: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  status: z
    .enum([
      "draft",
      "ready_for_signature",
      "signed",
      "submitted",
      "scheduled",
      "in-progress",
      "completed",
      "cancelled",
      "no-show",
      "incomplete",
      "complete",
    ])
    .default("draft"),
  followUpType: z
    .enum(["appointment", "discharge"])
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  followUpDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  followUpNotes: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  timeSpent: z.boolean().default(false),
  additionalNotes: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
});

/**
 * Returns the count of today's visits that are not yet signed/submitted
 * for the currently authenticated clinician.
 */
export async function getTodayUnsignedCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("clinician_id", user.id)
    .eq("visit_date", today)
    .not("status", "in", '("signed","submitted")');

  return count ?? 0;
}

/**
 * Returns dashboard stats scoped to the current clinician for the Clinical surface.
 */
export async function getClinicalDashboardStats(): Promise<{
  visitsTodayOwn: number;
  unsignedToday: number;
  visitsThisWeekOwn: number;
  recentOwnVisits: Array<{
    id: string;
    visit_date: string;
    status: string;
    patient_id: string;
    patient_name: string;
  }>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      visitsTodayOwn: 0,
      unsignedToday: 0,
      visitsThisWeekOwn: 0,
      recentOwnVisits: [],
    };

  const today = new Date().toISOString().split("T")[0];
  const dow = new Date().getDay(); // 0=Sun
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - dow);
  const weekStart = weekStartDate.toISOString().split("T")[0];

  const [todayResult, unsignedResult, weekResult, recentResult] =
    await Promise.all([
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("clinician_id", user.id)
        .eq("visit_date", today),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("clinician_id", user.id)
        .eq("visit_date", today)
        .not("status", "in", '("signed","submitted")'),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("clinician_id", user.id)
        .gte("visit_date", weekStart),
      supabase
        .from("visits")
        .select(
          "id, visit_date, status, patient_id, patients!inner(first_name, last_name)"
        )
        .eq("clinician_id", user.id)
        .order("visit_date", { ascending: false })
        .limit(5),
    ]);

  const recentOwnVisits = (recentResult.data ?? []).map((v) => {
    const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
    const patient = p as { first_name: string; last_name: string } | null;
    return {
      id: v.id,
      visit_date: v.visit_date,
      status: v.status ?? "draft",
      patient_id: v.patient_id ?? "",
      patient_name: patient
        ? `${patient.first_name} ${patient.last_name}`
        : "Unknown Patient",
    };
  });

  return {
    visitsTodayOwn: todayResult.count ?? 0,
    unsignedToday: unsignedResult.count ?? 0,
    visitsThisWeekOwn: weekResult.count ?? 0,
    recentOwnVisits,
  };
}

/**
 * Returns dashboard stats for the Admin/Operations surface.
 * Scoped to the admin's accessible facilities.
 */
export async function getAdminDashboardStats(facilityIds: string[]): Promise<{
  visitsTodayAll: number;
  unsignedTodayAll: number;
  pendingInboxCount: number;
  billingReadyCount: number;
}> {
  const empty = {
    visitsTodayAll: 0,
    unsignedTodayAll: 0,
    pendingInboxCount: 0,
    billingReadyCount: 0,
  };
  if (facilityIds.length === 0) return empty;

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: patients } = await supabase
    .from("patients")
    .select("id")
    .in("facility_id", facilityIds);
  const patientIds = patients?.map((p) => p.id) ?? [];
  if (patientIds.length === 0) return empty;

  const [todayResult, unsignedResult, inboxResult, billingResult] =
    await Promise.all([
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .in("patient_id", patientIds)
        .eq("visit_date", today),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .in("patient_id", patientIds)
        .eq("visit_date", today)
        .not("status", "in", '("signed","submitted")'),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .in("patient_id", patientIds)
        .eq("status", "sent_to_office"),
      supabase
        .from("billings")
        .select("id", { count: "exact", head: true })
        .in("patient_id", patientIds)
        .eq("billing_status", "ready"),
    ]);

  return {
    visitsTodayAll: todayResult.count ?? 0,
    unsignedTodayAll: unsignedResult.count ?? 0,
    pendingInboxCount: inboxResult.count ?? 0,
    billingReadyCount: billingResult.count ?? 0,
  };
}

// Get all visits for a patient
export async function getVisits(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const { data: visits, error } = await supabase
      .from("visits")
      .select("*")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to camelCase
    return (
      visits?.map((visit) => ({
        id: visit.id,
        patientId: visit.patient_id,
        visitDate: new Date(visit.visit_date),
        visitType: visit.visit_type,
        location: visit.location,
        status: visit.status,
        numberOfAddenda: visit.number_of_addenda,
        followUpType: visit.follow_up_type,
        followUpDate: visit.follow_up_date
          ? new Date(visit.follow_up_date)
          : null,
        followUpNotes: visit.follow_up_notes,
        timeSpent: visit.time_spent,
        additionalNotes: visit.additional_notes,
        createdAt: visit.created_at,
        updatedAt: visit.updated_at,
      })) || []
    );
  } catch (error) {
    console.error("Failed to fetch visits:", error);
    return [];
  }
}

// Get a single visit with all relations
export async function getVisit(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Audit PHI access (fire-and-forget)
  void auditPhiAccess({
    action: "read",
    table: "visits",
    recordId: visitId,
    recordType: "visit_record",
  });

  try {
    const { data: visit, error } = await supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients(
          *,
          facility:facilities(*)
        )
      `
      )
      .eq("id", visitId)
      .single();

    if (error) {
      throw error;
    }

    if (visit) {
      // Fetch related assessments
      const { data: assessmentsData } = await supabase
        .from("assessments")
        .select(
          `
          *,
          wound:wounds(wound_number, location)
        `
        )
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });

      // Transform assessments to camelCase
      const assessments =
        assessmentsData?.map((assessment) => ({
          id: assessment.id,
          visitId: assessment.visit_id,
          woundId: assessment.wound_id,
          wound: {
            woundNumber: assessment.wound?.wound_number || "",
            location: assessment.wound?.location || "",
          },
          woundType: assessment.wound_type,
          pressureStage: assessment.pressure_stage,
          healingStatus: assessment.healing_status,
          atRiskReopening: assessment.at_risk_reopening,
          length: assessment.length,
          width: assessment.width,
          depth: assessment.depth,
          area: assessment.area,
          undermining: assessment.undermining,
          tunneling: assessment.tunneling,
          epithelialPercent: assessment.epithelial_percent,
          granulationPercent: assessment.granulation_percent,
          sloughPercent: assessment.slough_percent,
          exudateAmount: assessment.exudate_amount,
          exudateType: assessment.exudate_type,
          odor: assessment.odor,
          periwoundCondition: assessment.periwound_condition,
          painLevel: assessment.pain_level,
          infectionSigns: assessment.infection_signs,
          assessmentNotes: assessment.assessment_notes,
          createdAt: assessment.created_at,
          updatedAt: assessment.updated_at,
        })) || [];

      // Fetch related treatments
      const { data: treatments } = await supabase
        .from("treatments")
        .select("*")
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });

      // Fetch related billings
      const { data: billings } = await supabase
        .from("billings")
        .select("*")
        .eq("visit_id", visitId);

      // Transform to camelCase
      return {
        id: visit.id,
        patientId: visit.patient_id,
        facilityId: visit.facility_id,
        clinicianId: visit.clinician_id,
        visitDate: new Date(visit.visit_date),
        visitType: visit.visit_type,
        location: visit.location,
        status: visit.status,
        requiresPatientSignature: visit.requires_patient_signature,
        providerSignatureId: visit.provider_signature_id,
        patientSignatureId: visit.patient_signature_id,
        clinicianName: visit.clinician_name,
        clinicianCredentials: visit.clinician_credentials,
        notes: visit.notes,
        numberOfAddenda: visit.number_of_addenda,
        followUpType: visit.follow_up_type,
        followUpDate: visit.follow_up_date
          ? new Date(visit.follow_up_date)
          : null,
        followUpNotes: visit.follow_up_notes,
        timeSpent: visit.time_spent,
        additionalNotes: visit.additional_notes,
        emDocumentation: visit.em_documentation as Record<
          string,
          string
        > | null,
        createdAt: visit.created_at,
        updatedAt: visit.updated_at,
        patient: {
          id: visit.patient.id,
          firstName: visit.patient.first_name,
          lastName: visit.patient.last_name,
          mrn: visit.patient.mrn,
          dob: visit.patient.dob,
          facility: visit.patient.facility,
        },
        assessments: assessments || [],
        treatments: treatments || [],
        billings: billings || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch visit:", error);
    return null;
  }
}

// Create a new visit
export async function createVisit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const data = {
      patientId: formData.get("patientId") as string,
      visitDate: formData.get("visitDate") as string,
      visitType: formData.get("visitType") as string,
      location: formData.get("location") as string,
      status: (formData.get("status") as string) || "draft",
      followUpType: formData.get("followUpType") as string,
      followUpDate: formData.get("followUpDate") as string,
      followUpNotes: formData.get("followUpNotes") as string,
      timeSpent: formData.get("timeSpent") === "true",
      additionalNotes: formData.get("additionalNotes") as string,
    };

    // Validate
    const validated = visitSchema.parse(data);

    // Check if user has access to this patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", validated.patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return { error: "Patient not found or access denied" };
    }

    // Get user's credentials for signature requirements
    const { data: userDataArray } = await supabase.rpc(
      "get_current_user_credentials"
    );

    const userData =
      userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
    const clinicianName = userData?.name || "";
    const clinicianCredentials = userData?.credentials || "";

    // Determine if patient signature will be required based on credentials
    const needsPatientSignature = await requiresPatientSignature();

    // Create visit
    const { data: visit, error: createError } = await supabase
      .from("visits")
      .insert({
        patient_id: validated.patientId,
        visit_date: validated.visitDate,
        visit_type: validated.visitType,
        location: validated.location || null,
        status: "draft", // Always start as draft for signature workflow
        requires_patient_signature: needsPatientSignature,
        clinician_id: user.id,
        clinician_name: clinicianName,
        clinician_credentials: clinicianCredentials,
        follow_up_type: validated.followUpType || null,
        follow_up_date: validated.followUpDate || null,
        follow_up_notes: validated.followUpNotes || null,
        time_spent: validated.timeSpent,
        additional_notes: validated.additionalNotes || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Database error creating visit:", createError);
      return {
        success: false as const,
        error: createError.message || "Failed to create visit",
      };
    }

    void auditPhiAccess({
      action: "create",
      table: "visits",
      recordId: visit.id,
      recordType: "visit_record",
    });
    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${validated.patientId}`);
    return { success: true as const, visit };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return {
        success: false as const,
        error: `${error.issues[0].path}: ${error.issues[0].message}`,
      };
    }
    console.error("Failed to create visit:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create visit";
    return { success: false as const, error: errorMessage };
  }
}

// Update a visit
export async function updateVisit(visitId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user permissions
  const userRole = await getUserRole();
  const userCredentials = await getUserCredentials();

  try {
    const data = {
      patientId: formData.get("patientId") as string,
      visitDate: formData.get("visitDate") as string,
      visitType: formData.get("visitType") as string,
      location: formData.get("location") as string,
      status: (formData.get("status") as string) || "scheduled",
      followUpType: formData.get("followUpType") as string,
      followUpDate: formData.get("followUpDate") as string,
      followUpNotes: formData.get("followUpNotes") as string,
      timeSpent: formData.get("timeSpent") === "true",
      additionalNotes: formData.get("additionalNotes") as string,
    };

    // Validate
    const validated = visitSchema.parse(data);

    // Check if user has access to this visit
    const { data: existingVisit, error: visitError } = await supabase
      .from("visits")
      .select("id, patient_id, status, clinician_id")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !existingVisit) {
      return { error: "Visit not found or access denied" };
    }

    // Check if user has permission to edit this visit (ownership check)
    const canEdit = canEditVisit(
      userCredentials,
      userRole?.role || null,
      existingVisit.clinician_id,
      user.id
    );

    if (!canEdit) {
      return {
        error:
          "You do not have permission to edit this visit. Only the original clinician or administrators can make changes.",
      };
    }

    // Prevent editing if visit is signed or submitted
    if (
      existingVisit.status === "signed" ||
      existingVisit.status === "submitted"
    ) {
      return {
        error:
          "Cannot edit visit that has been signed or submitted. Contact administrator if changes are needed.",
      };
    }

    // Update visit
    const { data: visit, error: updateError } = await supabase
      .from("visits")
      .update({
        visit_date: validated.visitDate,
        visit_type: validated.visitType,
        location: validated.location || null,
        status: validated.status,
        follow_up_type: validated.followUpType || null,
        follow_up_date: validated.followUpDate || null,
        follow_up_notes: validated.followUpNotes || null,
        time_spent: validated.timeSpent,
        additional_notes: validated.additionalNotes || null,
      })
      .eq("id", visitId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    void auditPhiAccess({
      action: "update",
      table: "visits",
      recordId: visitId,
      recordType: "visit_record",
    });
    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${existingVisit.patient_id}`);
    revalidatePath(`/dashboard/visits/${visitId}`);
    return { success: true as const, visit };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: error.issues[0].message };
    }
    console.error("Failed to update visit:", error);
    return { success: false as const, error: "Failed to update visit" };
  }
}

// Delete a visit
export async function deleteVisit(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if user has access to this visit
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id, patient_id, status")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !visit) {
      return { error: "Visit not found or access denied" };
    }

    // Prevent deletion if visit is signed or submitted
    if (visit.status === "signed" || visit.status === "submitted") {
      return {
        error:
          "Cannot delete visit that has been signed or submitted. Contact administrator if deletion is needed.",
      };
    }

    // Delete visit (cascade will handle assessments, treatments, billings)
    const { error: deleteError } = await supabase
      .from("visits")
      .delete()
      .eq("id", visitId);

    if (deleteError) {
      throw deleteError;
    }

    void auditPhiAccess({
      action: "delete",
      table: "visits",
      recordId: visitId,
      recordType: "visit_record",
    });
    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patient_id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete visit:", error);
    return { error: "Failed to delete visit" };
  }
}

// Mark visit as complete
export async function markVisitComplete(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if user has access to this visit
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id, patient_id, status")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !visit) {
      return { error: "Visit not found or access denied" };
    }

    // Only allow completing visits in appropriate status
    const completableStatuses = [
      "scheduled",
      "incomplete",
      "in_progress",
      "draft",
    ];
    if (!completableStatuses.includes(visit.status || "")) {
      return {
        error: `Cannot mark visit as completed — current status is "${visit.status}".`,
      };
    }

    // Update status to completed
    const { error: updateError } = await supabase
      .from("visits")
      .update({ status: "completed" })
      .eq("id", visitId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patient_id}`);
    revalidatePath(`/dashboard/visits/${visitId}`);
    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark visit as completed:", error);
    return { error: "Failed to mark visit as completed" };
  }
}

// Mark visit as no-show
// Records reason, timestamp, and user; transitions to "no_show" status
export async function setVisitNoShow(
  visitId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < 3) {
    return { error: "Please provide a reason (at least 3 characters)." };
  }
  if (trimmed.length > 500) {
    return { error: "Reason must be 500 characters or fewer." };
  }

  try {
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id, patient_id, status")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !visit) {
      return { error: "Visit not found or access denied" };
    }

    // Allow no-show only from non-finalized scheduled-ish statuses
    const allowed = ["scheduled", "incomplete", "in_progress", "draft"];
    if (!allowed.includes(visit.status || "")) {
      return {
        error: `Cannot mark as no-show — current status is "${visit.status}".`,
      };
    }

    const { error: updateError } = await supabase
      .from("visits")
      .update({
        status: "no_show",
        no_show_reason: trimmed,
        no_show_at: new Date().toISOString(),
        no_show_recorded_by: user.id,
      })
      .eq("id", visitId);

    if (updateError) {
      throw updateError;
    }

    void auditPhiAccess({
      action: "update",
      table: "visits",
      recordId: visitId,
      recordType: "visit_no_show",
    });
    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patient_id}`);
    revalidatePath(`/dashboard/visits/${visitId}`);
    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark visit as no-show:", error);
    return { error: "Failed to mark visit as no-show" };
  }
}

// Phase 3 R-065 — Persist E/M sub-section narratives (vitals, CC/HPI,
// ROS, PE) on the visit. Caller must own the visit (RLS enforces) and
// the visit must not be locked (signed/submitted). Empty-string fields
// are stripped; if everything is empty we store NULL.
const emDocumentationSchema = z.object({
  vitals: z.string().max(5000).optional(),
  cc_hpi: z.string().max(20000).optional(),
  ros: z.string().max(20000).optional(),
  pe: z.string().max(20000).optional(),
});

export async function updateVisitEmDocumentation(
  visitId: string,
  em: z.infer<typeof emDocumentationSchema>
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = emDocumentationSchema.safeParse(em);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Fetch status + patient_id for lock check + revalidation
  const { data: visit, error: fetchErr } = await supabase
    .from("visits")
    .select("id, patient_id, status")
    .eq("id", visitId)
    .maybeSingle();
  if (fetchErr || !visit) return { error: "Visit not found" };

  if (visit.status === "signed" || visit.status === "submitted") {
    return { error: "Visit is locked — use an addendum instead." };
  }

  // Strip empty strings; collapse to NULL when everything is blank
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (typeof v === "string" && v.trim().length > 0) cleaned[k] = v;
  }
  const payload = Object.keys(cleaned).length > 0 ? cleaned : null;

  const { error: updateErr } = await supabase
    .from("visits")
    .update({ em_documentation: payload })
    .eq("id", visitId);

  if (updateErr) {
    console.error("Failed to update E/M documentation:", updateErr);
    return { error: "Failed to save E/M documentation" };
  }

  void auditPhiAccess({
    action: "update",
    table: "visits",
    recordId: visitId,
    recordType: "visit_em_documentation",
  });
  revalidatePath(`/dashboard/patients/${visit.patient_id}/visits/${visitId}`);
  return { success: true };
}

// Server-side autosave for visit drafts
// Phase 9.3.2: Prevent data loss with automatic draft saving
export async function autosaveVisitDraft(
  visitId: string | null,
  formData: Record<string, unknown>
): Promise<{ success: boolean; visitId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // If visitId exists, update the draft
    if (visitId) {
      const { data: existingVisit } = await supabase
        .from("visits")
        .select("status")
        .eq("id", visitId)
        .single();

      // Only autosave if visit is still in draft status
      if (existingVisit?.status !== "draft") {
        return { success: false, error: "Cannot autosave non-draft visits" };
      }

      const { error } = await supabase
        .from("visits")
        .update({
          visit_date: formData.visitDate as string,
          visit_type: formData.visitType as string,
          location: (formData.location as string) || null,
          follow_up_type: (formData.followUpType as string) || null,
          follow_up_date: (formData.followUpDate as string) || null,
          follow_up_notes: (formData.followUpNotes as string) || null,
          time_spent: formData.timeSpent as boolean,
          additional_notes: (formData.additionalNotes as string) || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitId);

      if (error) throw error;
      return { success: true, visitId };
    } else {
      // Create a new draft visit
      // Get user's credentials for clinician attribution
      const { data: userDataArray } = await supabase.rpc(
        "get_current_user_credentials"
      );
      const userData =
        userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

      const { data, error } = await supabase
        .from("visits")
        .insert({
          patient_id: formData.patientId as string,
          visit_date: formData.visitDate as string,
          visit_type: formData.visitType as string,
          location: (formData.location as string) || null,
          status: "draft",
          clinician_id: user.id,
          clinician_name: userData?.name || "",
          clinician_credentials: userData?.credentials || "",
          follow_up_type: (formData.followUpType as string) || null,
          follow_up_date: (formData.followUpDate as string) || null,
          follow_up_notes: (formData.followUpNotes as string) || null,
          time_spent: formData.timeSpent as boolean,
          additional_notes: (formData.additionalNotes as string) || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return { success: true, visitId: data.id };
    }
  } catch (error) {
    console.error("Autosave visit draft failed:", error);
    return { success: false, error: "Autosave failed" };
  }
}

// =====================================================
// VISIT ADDENDUMS (Phase 9.3.6)
// =====================================================

/**
 * Get all addendums for a visit
 */
export async function getVisitAddendums(visitId: string) {
  const supabase = await createClient();

  // Use a raw query to join with users table, bypassing RLS issues
  const { data, error } = await supabase.rpc("get_visit_addendums", {
    p_visit_id: visitId,
  });

  if (error) {
    console.error("Error fetching addendums:", error);
    // Fallback to basic query without user info
    const { data: basicData, error: basicError } = await supabase
      .from("wound_notes")
      .select("id, note, note_type, created_at, created_by")
      .eq("visit_id", visitId)
      .eq("note_type", "addendum")
      .order("created_at", { ascending: true });

    if (basicError) {
      return { error: basicError.message };
    }

    // Return with empty user arrays
    return {
      data:
        basicData?.map((item) => ({
          ...item,
          users: [{ full_name: "Unknown", email: "", credentials: null }],
        })) || [],
    };
  }

  return { data };
}

/**
 * Create a new addendum for a signed/submitted visit
 */
export async function createAddendum(visitId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!content || content.trim().length === 0) {
    return { error: "Addendum content is required" };
  }

  try {
    // Verify visit exists and is signed/submitted
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id, status, addendum_count")
      .eq("id", visitId)
      .single();

    if (visitError || !visit) {
      return { error: "Visit not found" };
    }

    if (visit.status !== "signed" && visit.status !== "submitted") {
      return {
        error: "Addendums can only be added to signed or submitted visits",
      };
    }

    // Create addendum (using wound_notes table with note_type='addendum')
    const { data: addendum, error: addendumError } = await supabase
      .from("wound_notes")
      .insert({
        visit_id: visitId,
        wound_id: null, // No specific wound association for addendums
        note: content,
        note_type: "addendum",
        created_by: user.id,
      })
      .select()
      .single();

    if (addendumError) {
      console.error("Error creating addendum:", addendumError);
      return { error: `Failed to create addendum: ${addendumError.message}` };
    }

    // Increment addendum count on visit
    const { error: updateError } = await supabase
      .from("visits")
      .update({
        addendum_count: (visit.addendum_count || 0) + 1,
      })
      .eq("id", visitId);

    if (updateError) {
      console.error("Error updating addendum count:", updateError);
      // Don't fail the request, addendum was created successfully
    }

    // Invalidate PDF cache since visit content changed
    await invalidateVisitPDFCache(visitId);

    revalidatePath(`/dashboard/patients`);
    revalidatePath(`/dashboard/calendar`);

    return { data: addendum };
  } catch (error) {
    console.error("Exception creating addendum:", error);
    return { error: "Failed to create addendum" };
  }
}

// Get visits with assessment counts for quick assessment dialog
export async function getVisitsForQuickAssessment(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    // Get visits
    const { data: visits, error } = await supabase
      .from("visits")
      .select("id, visit_date, visit_type")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false })
      .limit(20); // Show last 20 visits

    if (error) {
      throw error;
    }

    if (!visits || visits.length === 0) {
      return [];
    }

    // Get assessment counts for each visit
    const visitIds = visits.map((v) => v.id);
    const { data: assessmentCounts } = await supabase
      .from("assessments")
      .select("visit_id")
      .in("visit_id", visitIds);

    // Count assessments per visit
    const countsMap = (assessmentCounts || []).reduce(
      (acc, curr) => {
        acc[curr.visit_id] = (acc[curr.visit_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Transform to camelCase with counts
    return visits.map((visit) => ({
      id: visit.id,
      visitDate: new Date(visit.visit_date),
      visitType: visit.visit_type,
      assessmentCount: countsMap[visit.id] || 0,
    }));
  } catch (error) {
    console.error("Failed to fetch visits for quick assessment:", error);
    return [];
  }
}

/**
 * R-067 Copy Forward — returns the completed assessments + treatments from a
 * prior signed/submitted visit so the caller can pre-populate a new visit.
 *
 * Returns only the data needed to stamp into Insert payloads; ids and
 * timestamps are stripped so the destination visit gets fresh rows.
 */
export async function getCopyForwardData(sourceVisitId: string): Promise<{
  success: boolean;
  error?: string;
  assessments?: Array<Record<string, unknown>>;
  treatments?: Array<Record<string, unknown>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: visit, error: visitErr } = await supabase
    .from("visits")
    .select("id, patient_id, status")
    .eq("id", sourceVisitId)
    .maybeSingle();

  if (visitErr || !visit) return { success: false, error: "Visit not found" };

  const [{ data: assessments }, { data: treatments }] = await Promise.all([
    supabase
      .from("assessments")
      .select(
        "wound_id, wound_type, length, width, depth, area, " +
          "granulation_percent, slough_percent, epithelial_percent, " +
          "exudate_amount, exudate_type, odor, pain_level, periwound_condition, " +
          "pressure_stage, tunneling, undermining, healing_status, " +
          "infection_signs, at_risk_reopening, assessment_notes"
      )
      .eq("visit_id", sourceVisitId),
    supabase
      .from("treatments")
      .select(
        "wound_id, treatment_tab, cleanser, primary_dressings, secondary_dressings, " +
          "secondary_treatment, coverage, frequency_days, prn, " +
          "debridement, compression, moisture_management, antimicrobials, " +
          "advanced_therapies, preventive_orders, npwt_pressure, npwt_frequency, " +
          "chair_cushion_type, special_instructions, treatment_orders"
      )
      .eq("visit_id", sourceVisitId),
  ]);

  return {
    success: true,
    assessments: (assessments ?? []) as unknown as Array<
      Record<string, unknown>
    >,
    treatments: (treatments ?? []) as unknown as Array<Record<string, unknown>>,
  };
}

/**
 * R-067 Copy Forward — copies assessments and treatments from a prior visit
 * into the target (current) draft visit. Existing assessments on the target
 * visit for the same wound are skipped (no overwrite) to protect in-progress
 * work. Returns counts of rows created.
 */
export async function copyForwardToVisit(
  sourceVisitId: string,
  targetVisitId: string
): Promise<{
  success: boolean;
  error?: string;
  assessmentsCopied?: number;
  treatmentsCopied?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Target visit must be a draft (editable)
  const { data: targetVisit, error: tvErr } = await supabase
    .from("visits")
    .select("id, patient_id, status")
    .eq("id", targetVisitId)
    .maybeSingle();

  if (tvErr || !targetVisit) {
    return { success: false, error: "Target visit not found" };
  }

  const lockedStatuses = ["signed", "submitted"];
  if (lockedStatuses.includes(targetVisit.status ?? "")) {
    return {
      success: false,
      error: "Cannot copy forward into a signed or submitted visit.",
    };
  }

  // Fetch source data
  const copyResult = await getCopyForwardData(sourceVisitId);
  if (!copyResult.success) return copyResult;

  const { assessments = [], treatments = [] } = copyResult;

  if (assessments.length === 0 && treatments.length === 0) {
    return {
      success: false,
      error: "Source visit has no assessments to copy.",
    };
  }

  // Check which wounds already have assessments on the target visit
  const { data: existingAssessments } = await supabase
    .from("assessments")
    .select("wound_id")
    .eq("visit_id", targetVisitId);

  const alreadyAssessed = new Set(
    (existingAssessments ?? []).map((a) => a.wound_id)
  );

  // Insert assessments (skip wounds already assessed on target)
  const assessmentInserts = assessments
    .filter((a) => a.wound_id && !alreadyAssessed.has(a.wound_id as string))
    .map((a) => ({
      ...a,
      visit_id: targetVisitId,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
    }));

  let assessmentsCopied = 0;
  if (assessmentInserts.length > 0) {
    const { error: aErr } = await supabase
      .from("assessments")
      .insert(
        assessmentInserts as Parameters<
          ReturnType<typeof supabase.from>["insert"]
        >[0]
      );
    if (aErr) {
      console.error("Copy forward assessments error:", aErr);
      return { success: false, error: "Failed to copy assessments" };
    }
    assessmentsCopied = assessmentInserts.length;
  }

  // Check which wounds already have treatments on the target visit
  const { data: existingTreatments } = await supabase
    .from("treatments")
    .select("wound_id")
    .eq("visit_id", targetVisitId);

  const alreadyTreated = new Set(
    (existingTreatments ?? []).map((t) => t.wound_id).filter(Boolean)
  );

  const treatmentInserts = treatments
    .filter((t) => !t.wound_id || !alreadyTreated.has(t.wound_id as string))
    .map((t) => ({
      ...t,
      visit_id: targetVisitId,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      generated_order_text: null,
    }));

  let treatmentsCopied = 0;
  if (treatmentInserts.length > 0) {
    const { error: tErr } = await supabase
      .from("treatments")
      .insert(
        treatmentInserts as Parameters<
          ReturnType<typeof supabase.from>["insert"]
        >[0]
      );
    if (tErr) {
      console.error("Copy forward treatments error:", tErr);
      return { success: false, error: "Failed to copy treatments" };
    }
    treatmentsCopied = treatmentInserts.length;
  }

  void auditPhiAccess({
    action: "create",
    table: "visits",
    recordId: targetVisitId,
    recordType: "visit_copy_forward",
    reason: `Copy forward from visit ${sourceVisitId}`,
  });
  revalidatePath(
    `/dashboard/patients/${targetVisit.patient_id}/visits/${targetVisitId}`
  );

  return { success: true, assessmentsCopied, treatmentsCopied };
}
