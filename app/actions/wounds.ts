"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema
const woundSchema = z.object({
  patientId: z.string().uuid(),
  woundNumber: z.string().min(1, "Wound number is required"),
  location: z.string().min(1, "Location is required"),
  woundType: z.string().min(1, "Wound type is required"),
  onsetDate: z.string().min(1, "Onset date is required"),
  status: z.enum(["active", "healed", "archived"]).default("active"),
});

// Get all wounds for a patient
export async function getWounds(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const { data: wounds, error } = await supabase
      .from("wounds")
      .select("*")
      .eq("patient_id", patientId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to camelCase
    return (
      wounds?.map((wound) => ({
        id: wound.id,
        patientId: wound.patient_id,
        woundNumber: wound.wound_number,
        location: wound.location,
        woundType: wound.wound_type,
        onsetDate: new Date(wound.onset_date),
        status: wound.status,
        createdAt: wound.created_at,
        updatedAt: wound.updated_at,
      })) || []
    );
  } catch (error) {
    console.error("Failed to fetch wounds:", error);
    return [];
  }
}

// Get a single wound
export async function getWound(woundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const { data: wound, error } = await supabase
      .from("wounds")
      .select(
        `
        *,
        patient:patients(
          *,
          facility:facilities(*)
        )
      `
      )
      .eq("id", woundId)
      .single();

    if (error) {
      throw error;
    }

    // Fetch recent assessments separately (limit 5)
    const { data: assessments } = await supabase
      .from("assessments")
      .select("*")
      .eq("wound_id", woundId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent photos separately (limit 10)
    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .eq("wound_id", woundId)
      .order("uploaded_at", { ascending: false })
      .limit(10);

    if (wound) {
      // Transform to camelCase
      return {
        id: wound.id,
        patientId: wound.patient_id,
        woundNumber: wound.wound_number,
        location: wound.location,
        woundType: wound.wound_type,
        onsetDate: new Date(wound.onset_date),
        status: wound.status,
        healingStatus: wound.healing_status,
        notes: wound.notes,
        createdAt: wound.created_at,
        updatedAt: wound.updated_at,
        patient: {
          id: wound.patient.id,
          firstName: wound.patient.first_name,
          lastName: wound.patient.last_name,
          mrn: wound.patient.mrn,
          dob: wound.patient.dob,
          facility: wound.patient.facility,
        },
        assessments: assessments || [],
        photos: photos || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch wound:", error);
    return null;
  }
}

// Create a new wound
export async function createWound(formData: FormData) {
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
      woundNumber: formData.get("woundNumber") as string,
      location: formData.get("location") as string,
      woundType: formData.get("woundType") as string,
      onsetDate: formData.get("onsetDate") as string,
      status: (formData.get("status") as string) || "active",
    };

    // Validate
    const validated = woundSchema.parse(data);

    // Check if user has access to this patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", validated.patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return { error: "Patient not found or access denied" };
    }

    // Create wound
    const { error: createError } = await supabase.from("wounds").insert({
      patient_id: validated.patientId,
      wound_number: validated.woundNumber,
      location: validated.location,
      wound_type: validated.woundType,
      onset_date: validated.onsetDate,
      status: validated.status,
    });

    if (createError) {
      throw createError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${validated.patientId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to create wound:", error);
    return { error: "Failed to create wound" };
  }
}

// Update a wound
export async function updateWound(woundId: string, formData: FormData) {
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
      woundNumber: formData.get("woundNumber") as string,
      location: formData.get("location") as string,
      woundType: formData.get("woundType") as string,
      onsetDate: formData.get("onsetDate") as string,
      status: (formData.get("status") as string) || "active",
    };

    // Validate
    const validated = woundSchema.parse(data);

    // Check if user has access to this wound
    const { data: existingWound, error: woundError } = await supabase
      .from("wounds")
      .select("id, patient_id")
      .eq("id", woundId)
      .maybeSingle();

    if (woundError || !existingWound) {
      return { error: "Wound not found or access denied" };
    }

    // Update wound
    const { error: updateError } = await supabase
      .from("wounds")
      .update({
        wound_number: validated.woundNumber,
        location: validated.location,
        wound_type: validated.woundType,
        onset_date: validated.onsetDate,
        status: validated.status,
      })
      .eq("id", woundId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${existingWound.patient_id}`);
    revalidatePath(`/dashboard/wounds/${woundId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to update wound:", error);
    return { error: "Failed to update wound" };
  }
}

// Delete a wound
export async function deleteWound(woundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if user has access to this wound
    const { data: wound, error: woundError } = await supabase
      .from("wounds")
      .select("id, patient_id")
      .eq("id", woundId)
      .maybeSingle();

    if (woundError || !wound) {
      return { error: "Wound not found or access denied" };
    }

    // Delete wound (cascade will handle assessments and photos)
    const { error: deleteError } = await supabase
      .from("wounds")
      .delete()
      .eq("id", woundId);

    if (deleteError) {
      throw deleteError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${wound.patient_id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete wound:", error);
    return { error: "Failed to delete wound" };
  }
}

// Mark wound as healed
export async function markWoundHealed(woundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if user has access to this wound
    const { data: wound, error: woundError } = await supabase
      .from("wounds")
      .select("id, patient_id")
      .eq("id", woundId)
      .maybeSingle();

    if (woundError || !wound) {
      return { error: "Wound not found or access denied" };
    }

    // Update status to healed
    const { error: updateError } = await supabase
      .from("wounds")
      .update({ status: "healed" })
      .eq("id", woundId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${wound.patient_id}`);
    revalidatePath(`/dashboard/wounds/${woundId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark wound as healed:", error);
    return { error: "Failed to mark wound as healed" };
  }
}

// Get all assessments for a wound with visit details
export async function getWoundAssessments(woundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const { data: assessments, error } = await supabase
      .from("assessments")
      .select(
        `
        *,
        visit:visits!inner(
          id,
          visit_date,
          visit_type,
          patient:patients!inner(
            id,
            first_name,
            last_name
          )
        ),
        wound:wounds!inner(
          id,
          wound_number,
          location
        )
      `
      )
      .eq("wound_id", woundId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch photos for all assessments
    const assessmentIds = assessments?.map((a) => a.id) || [];
    let photosMap: Record<string, any[]> = {};

    if (assessmentIds.length > 0) {
      const { data: allPhotos } = await supabase
        .from("photos")
        .select("*")
        .in("assessment_id", assessmentIds);

      // Group photos by assessment_id
      photosMap =
        allPhotos?.reduce((acc: Record<string, any[]>, photo) => {
          const assessmentId = photo.assessment_id;
          if (!acc[assessmentId]) {
            acc[assessmentId] = [];
          }
          acc[assessmentId].push(photo);
          return acc;
        }, {}) || {};
    }

    // Transform to camelCase with null safety
    return (
      assessments?.map((assessment) => ({
        id: assessment.id,
        visitId: assessment.visit_id,
        woundId: assessment.wound_id,
        assessmentType: assessment.assessment_type,
        length: assessment.length,
        width: assessment.width,
        depth: assessment.depth,
        area: assessment.area,
        woundBed: assessment.wound_bed,
        exudateAmount: assessment.exudate_amount,
        exudateType: assessment.exudate_type,
        odor: assessment.odor,
        edges: assessment.edges,
        periwoundSkin: assessment.periwound_skin,
        pain: assessment.pain,
        healingStatus: assessment.healing_status,
        notes: assessment.notes,
        createdAt: assessment.created_at,
        updatedAt: assessment.updated_at,
        visit: assessment.visit
          ? {
              id: assessment.visit.id,
              visitDate: new Date(assessment.visit.visit_date),
              visitType: assessment.visit.visit_type,
              patient: assessment.visit.patient
                ? {
                    id: assessment.visit.patient.id,
                    firstName: assessment.visit.patient.first_name,
                    lastName: assessment.visit.patient.last_name,
                  }
                : {
                    id: "",
                    firstName: "Unknown",
                    lastName: "Patient",
                  },
            }
          : {
              id: "",
              visitDate: new Date(),
              visitType: "regular",
              patient: {
                id: "",
                firstName: "Unknown",
                lastName: "Patient",
              },
            },
        wound: assessment.wound
          ? {
              id: assessment.wound.id,
              woundNumber: assessment.wound.wound_number,
              location: assessment.wound.location,
            }
          : {
              id: "",
              woundNumber: "",
              location: "",
            },
        photos:
          photosMap[assessment.id]?.map((photo: any) => ({
            id: photo.id,
            url: photo.url,
            filename: photo.file_name,
            caption: photo.caption,
            uploadedAt: new Date(photo.uploaded_at),
          })) || [],
      })) || []
    );
  } catch (error) {
    console.error("Failed to fetch wound assessments:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return [];
  }
}
