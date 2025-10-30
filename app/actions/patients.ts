// Server Actions for Patient Management
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Validation schemas
const patientSchema = z.object({
  facilityId: z.string().min(1, "Facility is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  mrn: z.string().min(1, "MRN is required"),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function createPatient(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate basic fields
  const validatedFields = patientSchema.safeParse({
    facilityId: formData.get("facilityId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dob: formData.get("dob"),
    mrn: formData.get("mrn"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    };
  }

  const data = validatedFields.data;

  try {
    // Check if MRN is unique within the facility
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("facility_id", data.facilityId)
      .eq("mrn", data.mrn)
      .eq("is_active", true)
      .maybeSingle();

    if (existingPatient) {
      return {
        error: "A patient with this MRN already exists in this facility",
      };
    }

    // Parse JSONB fields
    const primaryInsurance = formData.get("primaryInsurance");
    const secondaryInsurance = formData.get("secondaryInsurance");
    const emergencyContact = formData.get("emergencyContact");
    const allergies = formData.get("allergies");
    const medicalHistory = formData.get("medicalHistory");

    const insuranceInfo = {
      primary: primaryInsurance ? JSON.parse(primaryInsurance as string) : null,
      secondary: secondaryInsurance
        ? JSON.parse(secondaryInsurance as string)
        : null,
    };

    const emergencyContactData = emergencyContact
      ? JSON.parse(emergencyContact as string)
      : null;

    const allergiesData = allergies ? JSON.parse(allergies as string) : [];
    const medicalHistoryData = medicalHistory
      ? JSON.parse(medicalHistory as string)
      : [];

    // Create patient
    const { data: patient, error: createError } = await supabase
      .from("patients")
      .insert({
        facility_id: data.facilityId,
        first_name: data.firstName,
        last_name: data.lastName,
        dob: data.dob,
        mrn: data.mrn,
        gender: data.gender || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        insurance_info: insuranceInfo,
        emergency_contact: emergencyContactData,
        allergies: allergiesData,
        medical_history: medicalHistoryData,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    revalidatePath("/dashboard/patients");
    return { success: true, patientId: patient.id };
  } catch (error) {
    console.error("Failed to create patient:", error);
    return { error: "Failed to create patient" };
  }
}

export async function updatePatient(patientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate basic fields
  const validatedFields = patientSchema.safeParse({
    facilityId: formData.get("facilityId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dob: formData.get("dob"),
    mrn: formData.get("mrn"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    };
  }

  const data = validatedFields.data;

  try {
    const supabase = await createClient();

    // Check if MRN is unique within the facility (excluding current patient)
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("facility_id", data.facilityId)
      .eq("mrn", data.mrn)
      .eq("is_active", true)
      .neq("id", patientId)
      .maybeSingle();

    if (existingPatient) {
      return {
        error: "A patient with this MRN already exists in this facility",
      };
    }

    // Parse JSONB fields
    const primaryInsurance = formData.get("primaryInsurance");
    const secondaryInsurance = formData.get("secondaryInsurance");
    const emergencyContact = formData.get("emergencyContact");
    const allergies = formData.get("allergies");
    const medicalHistory = formData.get("medicalHistory");

    const insuranceInfo = {
      primary: primaryInsurance ? JSON.parse(primaryInsurance as string) : null,
      secondary: secondaryInsurance
        ? JSON.parse(secondaryInsurance as string)
        : null,
    };

    const emergencyContactData = emergencyContact
      ? JSON.parse(emergencyContact as string)
      : null;

    const allergiesData = allergies ? JSON.parse(allergies as string) : [];
    const medicalHistoryData = medicalHistory
      ? JSON.parse(medicalHistory as string)
      : [];

    // Update patient
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        facility_id: data.facilityId,
        first_name: data.firstName,
        last_name: data.lastName,
        dob: data.dob,
        mrn: data.mrn,
        gender: data.gender || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        insurance_info: insuranceInfo,
        emergency_contact: emergencyContactData,
        allergies: allergiesData,
        medical_history: medicalHistoryData,
      })
      .eq("id", patientId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update patient:", error);
    return { error: "Failed to update patient" };
  }
}

export async function deletePatient(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Soft delete (mark as inactive)
    const { error: deleteError } = await supabase
      .from("patients")
      .update({ is_active: false })
      .eq("id", patientId);

    if (deleteError) {
      throw deleteError;
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete patient:", error);
    return { error: "Failed to delete patient" };
  }
}

export async function getPatients(facilityId?: string, search?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    // Build query - start with patients that are active
    let query = supabase
      .from("patients")
      .select(
        `
        *,
        facility:facilities(id, name),
        wounds!inner(id, status)
      `
      )
      .eq("is_active", true)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    // Filter by facility if specified
    if (facilityId) {
      query = query.eq("facility_id", facilityId);
    }

    // Search by name or MRN
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,mrn.ilike.%${search}%`
      );
    }

    const { data: patients, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match expected format (count active wounds)
    return (
      patients?.map((patient) => ({
        ...patient,
        _count: {
          wounds:
            patient.wounds?.filter(
              (w: { status: string }) => w.status === "active"
            ).length || 0,
        },
      })) || []
    );
  } catch (error) {
    console.error("Failed to fetch patients:", error);
    return [];
  }
}

export async function getPatient(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const { data: patient, error } = await supabase
      .from("patients")
      .select(
        `
        *,
        facility:facilities(*),
        wounds(*)
      `
      )
      .eq("id", patientId)
      .eq("is_active", true)
      .single();

    if (error) {
      throw error;
    }

    // Filter wounds to active only and sort by created_at desc
    if (patient) {
      patient.wounds = patient.wounds
        ?.filter((w: { status: string }) => w.status === "active")
        .sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      // Fetch recent visits separately (limit 10)
      const { data: visits } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", patientId)
        .order("visit_date", { ascending: false })
        .limit(10);

      patient.visits = visits || [];
    }

    return patient;
  } catch (error) {
    console.error("Failed to fetch patient:", error);
    return null;
  }
}
