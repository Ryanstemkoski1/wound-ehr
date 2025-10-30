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
        onsetDate: wound.onset_date,
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
      .from("wound_assessments")
      .select("*")
      .eq("wound_id", woundId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent photos separately (limit 10)
    const { data: photos } = await supabase
      .from("wound_photos")
      .select("*")
      .eq("wound_id", woundId)
      .order("uploaded_at", { ascending: false })
      .limit(10);

    if (wound) {
      wound.assessments = assessments || [];
      wound.photos = photos || [];
    }

    return wound;
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
