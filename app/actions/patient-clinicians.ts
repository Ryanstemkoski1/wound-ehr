"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =====================================================
// ASSIGN CLINICIAN TO PATIENT
// =====================================================

export async function assignClinician(
  patientId: string,
  userId: string,
  role: "primary" | "supervisor" | "covering"
) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from("patient_clinicians")
      .select("*")
      .eq("patient_id", patientId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Reactivate and update role if exists
      const { data, error } = await supabase
        .from("patient_clinicians")
        .update({
          role,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      revalidatePath(`/dashboard/patients/${patientId}`);
      revalidatePath("/dashboard/patients");
      revalidatePath("/dashboard/calendar");

      return { success: true, data };
    }

    // Create new assignment
    const { data, error } = await supabase
      .from("patient_clinicians")
      .insert({
        patient_id: patientId,
        user_id: userId,
        role,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/calendar");

    return { success: true, data };
  } catch (error) {
    console.error("Error assigning clinician:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// REMOVE CLINICIAN FROM PATIENT
// =====================================================

export async function removeClinician(patientId: string, userId: string) {
  const supabase = await createClient();

  try {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("patient_clinicians")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("patient_id", patientId)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/calendar");

    return { success: true };
  } catch (error) {
    console.error("Error removing clinician:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// GET PATIENT CLINICIANS
// =====================================================

export async function getPatientClinicians(patientId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("patient_clinicians")
      .select("*")
      .eq("patient_id", patientId)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (error) throw error;

    // Get user credentials from users table
    const userIds = data?.map((pc) => pc.user_id) || [];
    if (userIds.length > 0) {
      const { data: credentials } = await supabase
        .from("users")
        .select("id, name, credentials, email")
        .in("id", userIds);

      // Merge credentials into results
      const enriched = data?.map((pc) => {
        const cred = credentials?.find((c) => c.id === pc.user_id);
        return {
          ...pc,
          user_name: cred?.name || cred?.email || "",
          user_credentials: cred?.credentials || "",
        };
      });

      return { success: true, data: enriched };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching patient clinicians:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

// =====================================================
// GET CLINICIAN PATIENTS
// =====================================================

export async function getClinicianPatients(userId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("patient_clinicians")
      .select(
        `
        *,
        patient:patients (
          id,
          first_name,
          last_name,
          mrn,
          date_of_birth,
          facility:facilities (
            id,
            name
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching clinician patients:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

// =====================================================
// UPDATE CLINICIAN ROLE
// =====================================================

export async function updateClinicianRole(
  patientId: string,
  userId: string,
  newRole: "primary" | "supervisor" | "covering"
) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("patient_clinicians")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("patient_id", patientId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/calendar");

    return { success: true, data };
  } catch (error) {
    console.error("Error updating clinician role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// GET PRIMARY CLINICIAN FOR PATIENT
// =====================================================

export async function getPrimaryClinician(patientId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("patient_clinicians")
      .select("*")
      .eq("patient_id", patientId)
      .eq("role", "primary")
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { success: true, data: null };
    }

    // Get user credentials
    const { data: userCred } = await supabase
      .from("users")
      .select("name, credentials, email")
      .eq("id", data.user_id)
      .single();

    return {
      success: true,
      data: {
        ...data,
        user_name: userCred?.name || userCred?.email || "",
        user_credentials: userCred?.credentials || "",
      },
    };
  } catch (error) {
    console.error("Error fetching primary clinician:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

// =====================================================
// GET AVAILABLE CLINICIANS FOR ASSIGNMENT
// =====================================================

export async function getAvailableClinicians(facilityId: string) {
  const supabase = await createClient();

  try {
    // Get all users in this facility with clinical credentials
    const { data: users, error } = await supabase
      .from("users")
      .select(
        `
        id,
        name,
        email,
        credentials
      `
      )
      .not("credentials", "is", null)
      .order("name");

    if (error) throw error;

    // Filter to users who have access to this facility
    const { data: facilityUsers } = await supabase
      .from("user_facilities")
      .select("user_id")
      .eq("facility_id", facilityId);

    const facilityUserIds = facilityUsers?.map((fu) => fu.user_id) || [];

    const filtered = users?.filter((u) => facilityUserIds.includes(u.id)) || [];

    return { success: true, data: filtered };
  } catch (error) {
    console.error("Error fetching available clinicians:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}
