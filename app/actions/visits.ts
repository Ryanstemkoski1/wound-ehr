"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
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
    const visits = await prisma.visit.findMany({
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
      orderBy: { visitDate: "desc" },
    });

    return visits;
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
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
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
          include: {
            wound: {
              select: {
                woundNumber: true,
                location: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        treatments: {
          orderBy: { createdAt: "desc" },
        },
        billings: true,
      },
    });

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

    // Create visit
    const visit = await prisma.visit.create({
      data: {
        patientId: validated.patientId,
        visitDate: new Date(validated.visitDate),
        visitType: validated.visitType,
        location: validated.location || null,
        status: validated.status,
        followUpType: validated.followUpType || null,
        followUpDate: validated.followUpDate
          ? new Date(validated.followUpDate)
          : null,
        followUpNotes: validated.followUpNotes || null,
        timeSpent: validated.timeSpent,
        additionalNotes: validated.additionalNotes || null,
      },
    });

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
    const existingVisit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (!existingVisit) {
      return { error: "Visit not found or access denied" };
    }

    // Update visit
    const visit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        visitDate: new Date(validated.visitDate),
        visitType: validated.visitType,
        location: validated.location || null,
        status: validated.status,
        followUpType: validated.followUpType || null,
        followUpDate: validated.followUpDate
          ? new Date(validated.followUpDate)
          : null,
        followUpNotes: validated.followUpNotes || null,
        timeSpent: validated.timeSpent,
        additionalNotes: validated.additionalNotes || null,
      },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${existingVisit.patientId}`);
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
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (!visit) {
      return { error: "Visit not found or access denied" };
    }

    // Delete visit (cascade will handle assessments, treatments, billings)
    await prisma.visit.delete({
      where: { id: visitId },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patientId}`);
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
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (!visit) {
      return { error: "Visit not found or access denied" };
    }

    // Update status to complete
    await prisma.visit.update({
      where: { id: visitId },
      data: { status: "complete" },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patientId}`);
    revalidatePath(`/dashboard/visits/${visitId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark visit as complete:", error);
    return { error: "Failed to mark visit as complete" };
  }
}
