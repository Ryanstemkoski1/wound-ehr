// Server Actions for Patient Management
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Database types
type DbWound = {
  id: string;
  patient_id: string;
  wound_number: number;
  location: string;
  wound_type: string;
  onset_date: string;
  status: string;
  healing_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DbVisit = {
  id: string;
  patient_id: string;
  facility_id: string;
  visit_date: string;
  visit_type: string;
  location: string | null;
  status: string;
  notes: string | null;
  follow_up_type: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

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
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dob: new Date(patient.dob),
        mrn: patient.mrn,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zip: patient.zip,
        insuranceInfo: patient.insurance_info,
        emergencyContact: patient.emergency_contact,
        allergies: patient.allergies,
        medicalHistory: patient.medical_history,
        isActive: patient.is_active,
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
        createdBy: patient.created_by,
        facilityId: patient.facility_id,
        facility: patient.facility,
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
      const activeWounds = patient.wounds
        ?.filter((w: { status: string }) => w.status === "active")
        .sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      // Fetch additional data for each wound
      const enrichedWounds = await Promise.all(
        (activeWounds || []).map(async (wound: DbWound) => {
          // Get latest assessment for measurements
          const { data: latestAssessment } = await supabase
            .from("assessments")
            .select("length, width, depth, area, healing_status")
            .eq("wound_id", wound.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get latest photo
          const { data: latestPhoto } = await supabase
            .from("photos")
            .select("photo_url")
            .eq("wound_id", wound.id)
            .order("captured_at", { ascending: false })
            .limit(1)
            .single();

          // Get recent visits for this wound (via assessments)
          const { data: recentAssessments } = await supabase
            .from("assessments")
            .select("visit_id, healing_status, visits(id, visit_date)")
            .eq("wound_id", wound.id)
            .order("created_at", { ascending: false })
            .limit(5);

          const recentVisits =
            recentAssessments
              ?.map((a: unknown) => {
                const assessment = a as {
                  visits: { id: string; visit_date: string };
                  healing_status: string | null;
                };
                return {
                  id: assessment.visits.id,
                  visit_date: assessment.visits.visit_date,
                  healing_status: assessment.healing_status,
                };
              })
              .filter(Boolean) || [];

          // Get wound notes
          const { data: notes } = await supabase
            .from("wound_notes")
            .select("id, note, created_at")
            .eq("wound_id", wound.id)
            .order("created_at", { ascending: false })
            .limit(5);

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
            latestMeasurements: latestAssessment || undefined,
            latestPhoto: latestPhoto?.photo_url || undefined,
            recentVisits: recentVisits || [],
            woundNotes: notes || [],
          };
        })
      );

      // Fetch recent visits separately (limit 10)
      const { data: visits } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", patientId)
        .order("visit_date", { ascending: false })
        .limit(10);

      // Transform to camelCase
      return {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dob: new Date(patient.dob),
        mrn: patient.mrn,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zip: patient.zip,
        insuranceInfo: patient.insurance_info,
        emergencyContact: patient.emergency_contact,
        allergies: patient.allergies,
        medicalHistory: patient.medical_history,
        isActive: patient.is_active,
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
        createdBy: patient.created_by,
        facilityId: patient.facility_id,
        facility: patient.facility,
        wounds: enrichedWounds || [],
        visits:
          visits?.map((visit: DbVisit) => ({
            id: visit.id,
            patientId: visit.patient_id,
            facilityId: visit.facility_id,
            visitDate: new Date(visit.visit_date),
            visitType: visit.visit_type,
            location: visit.location,
            status: visit.status,
            notes: visit.notes,
            followUpType: visit.follow_up_type,
            followUpDate: visit.follow_up_date
              ? new Date(visit.follow_up_date)
              : null,
            createdAt: visit.created_at,
            updatedAt: visit.updated_at,
            createdBy: visit.created_by,
          })) || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch patient:", error);
    return null;
  }
}
