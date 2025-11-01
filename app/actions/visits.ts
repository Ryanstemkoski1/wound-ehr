"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema
const visitSchema = z.object({
  patientId: z.string().uuid(),
  visitDate: z.string().min(1, "Visit date is required"),
  visitType: z.enum(["in_person", "telemed"]),
  location: z.string().optional(),
  status: z.enum(["incomplete", "complete"]).default("incomplete"),
  followUpType: z.enum(["appointment", "discharge"]).optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  timeSpent: z.boolean().default(false),
  additionalNotes: z.string().optional(),
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
        visitDate: visit.visit_date,
        visitType: visit.visit_type,
        location: visit.location,
        status: visit.status,
        numberOfAddenda: visit.number_of_addenda,
        followUpType: visit.follow_up_type,
        followUpDate: visit.follow_up_date,
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

      visit.assessments = assessments || [];
      visit.treatments = treatments || [];
      visit.billings = billings || [];
    }

    return visit;
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
      status: (formData.get("status") as string) || "incomplete",
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

    // Create visit
    const { data: visit, error: createError } = await supabase
      .from("visits")
      .insert({
        patient_id: validated.patientId,
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
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${validated.patientId}`);
    return { success: true as const, visit };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: error.issues[0].message };
    }
    console.error("Failed to create visit:", error);
    return { success: false as const, error: "Failed to create visit" };
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
      status: (formData.get("status") as string) || "incomplete",
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
      .select("id, patient_id")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !existingVisit) {
      return { error: "Visit not found or access denied" };
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
      .select("id, patient_id")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError || !visit) {
      return { error: "Visit not found or access denied" };
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

    // Update status to complete
    const { error: updateError } = await supabase
      .from("visits")
      .update({ status: "complete" })
      .eq("id", visitId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patient_id}`);
    revalidatePath(`/dashboard/visits/${visitId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark visit as complete:", error);
    return { error: "Failed to mark visit as complete" };
  }
}
