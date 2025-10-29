"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
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
    const wounds = await prisma.wound.findMany({
      where: {
        patientId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return wounds;
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
    const wound = await prisma.wound.findFirst({
      where: {
        id: woundId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
      include: {
        patient: {
          include: {
            facility: true,
          },
        },
        assessments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        photos: {
          orderBy: { uploadedAt: "desc" },
          take: 10,
        },
      },
    });

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
    const patient = await prisma.patient.findFirst({
      where: {
        id: validated.patientId,
        facility: {
          users: {
            some: { userId: user.id },
          },
        },
      },
    });

    if (!patient) {
      return { error: "Patient not found or access denied" };
    }

    // Create wound
    await prisma.wound.create({
      data: {
        patientId: validated.patientId,
        woundNumber: validated.woundNumber,
        location: validated.location,
        woundType: validated.woundType,
        onsetDate: new Date(validated.onsetDate),
        status: validated.status,
      },
    });

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
    const existingWound = await prisma.wound.findFirst({
      where: {
        id: woundId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (!existingWound) {
      return { error: "Wound not found or access denied" };
    }

    // Update wound
    await prisma.wound.update({
      where: { id: woundId },
      data: {
        woundNumber: validated.woundNumber,
        location: validated.location,
        woundType: validated.woundType,
        onsetDate: new Date(validated.onsetDate),
        status: validated.status,
      },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${existingWound.patientId}`);
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
    const wound = await prisma.wound.findFirst({
      where: {
        id: woundId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (!wound) {
      return { error: "Wound not found or access denied" };
    }

    // Delete wound (cascade will handle assessments and photos)
    await prisma.wound.delete({
      where: { id: woundId },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${wound.patientId}`);
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
    const wound = await prisma.wound.findFirst({
      where: {
        id: woundId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (!wound) {
      return { error: "Wound not found or access denied" };
    }

    // Update status to healed
    await prisma.wound.update({
      where: { id: woundId },
      data: { status: "healed" },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${wound.patientId}`);
    revalidatePath(`/dashboard/wounds/${woundId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark wound as healed:", error);
    return { error: "Failed to mark wound as healed" };
  }
}
