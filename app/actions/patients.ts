// Server Actions for Patient Management
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
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
    const existingPatient = await prisma.patient.findFirst({
      where: {
        facilityId: data.facilityId,
        mrn: data.mrn,
        isActive: true,
      },
    });

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
    const patient = await prisma.patient.create({
      data: {
        facilityId: data.facilityId,
        firstName: data.firstName,
        lastName: data.lastName,
        dob: new Date(data.dob),
        mrn: data.mrn,
        gender: data.gender || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        insuranceInfo: insuranceInfo,
        emergencyContact: emergencyContactData,
        allergies: allergiesData,
        medicalHistory: medicalHistoryData,
        createdBy: user.id,
      },
    });

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
    // Check if MRN is unique within the facility (excluding current patient)
    const existingPatient = await prisma.patient.findFirst({
      where: {
        facilityId: data.facilityId,
        mrn: data.mrn,
        isActive: true,
        NOT: {
          id: patientId,
        },
      },
    });

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
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        facilityId: data.facilityId,
        firstName: data.firstName,
        lastName: data.lastName,
        dob: new Date(data.dob),
        mrn: data.mrn,
        gender: data.gender || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        insuranceInfo: insuranceInfo,
        emergencyContact: emergencyContactData,
        allergies: allergiesData,
        medicalHistory: medicalHistoryData,
      },
    });

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
    await prisma.patient.update({
      where: { id: patientId },
      data: { isActive: false },
    });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
      facility: {
        users: {
          some: {
            userId: user.id,
          },
        },
      },
    };

    // Filter by facility if specified
    if (facilityId) {
      where.facilityId = facilityId;
    }

    // Search by name or MRN
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { mrn: { contains: search, mode: "insensitive" } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            wounds: {
              where: {
                status: "active",
              },
            },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return patients;
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
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isActive: true,
        facility: {
          users: {
            some: {
              userId: user.id,
            },
          },
        },
      },
      include: {
        facility: true,
        wounds: {
          where: {
            status: "active",
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        visits: {
          orderBy: {
            visitDate: "desc",
          },
          take: 10,
        },
      },
    });

    return patient;
  } catch (error) {
    console.error("Failed to fetch patient:", error);
    return null;
  }
}
