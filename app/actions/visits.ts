"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requiresPatientSignature } from "@/app/actions/signatures";

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
      const { data: assessments } = await supabase
        .from("assessments")
        .select(
          `
          *,
          wound:wounds(wound_number, location)
        `
        )
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });

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
        createdAt: visit.created_at,
        updatedAt: visit.updated_at,
        createdBy: visit.created_by,
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
      .select("id, patient_id, status")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !existingVisit) {
      return { error: "Visit not found or access denied" };
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
      .select("id, patient_id")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !visit) {
      return { error: "Visit not found or access denied" };
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
      const { data, error } = await supabase
        .from("visits")
        .insert({
          patient_id: formData.patientId as string,
          visit_date: formData.visitDate as string,
          visit_type: formData.visitType as string,
          location: (formData.location as string) || null,
          status: "draft",
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
      .select("id, status")
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
        addendum_count: (visit as any).addendum_count
          ? (visit as any).addendum_count + 1
          : 1,
      })
      .eq("id", visitId);

    if (updateError) {
      console.error("Error updating addendum count:", updateError);
      // Don't fail the request, addendum was created successfully
    }

    revalidatePath(`/dashboard/patients`);
    revalidatePath(`/dashboard/calendar`);

    return { data: addendum };
  } catch (error) {
    console.error("Exception creating addendum:", error);
    return { error: "Failed to create addendum" };
  }
}
