"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const billingSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  cptCodes: z.array(z.string()).default([]),
  icd10Codes: z.array(z.string()).default([]),
  modifiers: z.array(z.string()).optional(),
  timeSpent: z.boolean().default(false),
  notes: z.string().optional(),
});

type BillingInput = z.infer<typeof billingSchema>;

/**
 * Create a billing record for a visit
 */
export async function createBilling(data: BillingInput) {
  try {
    const validated = billingSchema.parse(data);

    const billing = await prisma.billing.create({
      data: {
        visitId: validated.visitId,
        patientId: validated.patientId,
        cptCodes: validated.cptCodes,
        icd10Codes: validated.icd10Codes,
        modifiers: validated.modifiers || [],
        timeSpent: validated.timeSpent,
        notes: validated.notes,
      },
    });

    revalidatePath(
      `/dashboard/patients/${validated.patientId}/visits/${validated.visitId}`
    );
    return { success: true as const, billing };
  } catch (error) {
    console.error("Failed to create billing:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to create billing",
    };
  }
}

/**
 * Update a billing record
 */
export async function updateBilling(
  billingId: string,
  data: Partial<BillingInput>
) {
  try {
    const billing = await prisma.billing.update({
      where: { id: billingId },
      data: {
        ...(data.cptCodes && { cptCodes: data.cptCodes }),
        ...(data.icd10Codes && { icd10Codes: data.icd10Codes }),
        ...(data.modifiers !== undefined && { modifiers: data.modifiers }),
        ...(data.timeSpent !== undefined && { timeSpent: data.timeSpent }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        visit: {
          select: {
            patientId: true,
          },
        },
      },
    });

    revalidatePath(
      `/dashboard/patients/${billing.visit.patientId}/visits/${billing.visitId}`
    );
    return { success: true as const, billing };
  } catch (error) {
    console.error("Failed to update billing:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to update billing",
    };
  }
}

/**
 * Delete a billing record
 */
export async function deleteBilling(billingId: string) {
  try {
    const billing = await prisma.billing.findUnique({
      where: { id: billingId },
      select: {
        visitId: true,
        patientId: true,
      },
    });

    if (!billing) {
      return { success: false as const, error: "Billing record not found" };
    }

    await prisma.billing.delete({
      where: { id: billingId },
    });

    revalidatePath(
      `/dashboard/patients/${billing.patientId}/visits/${billing.visitId}`
    );
    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete billing:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to delete billing",
    };
  }
}

/**
 * Get billing for a specific visit
 */
export async function getBillingForVisit(visitId: string) {
  try {
    const billing = await prisma.billing.findFirst({
      where: { visitId },
    });

    return { success: true as const, billing };
  } catch (error) {
    console.error("Failed to get billing:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billing",
    };
  }
}

/**
 * Get all billing records for a patient
 */
export async function getBillingForPatient(patientId: string) {
  try {
    const billings = await prisma.billing.findMany({
      where: { patientId },
      include: {
        visit: {
          select: {
            id: true,
            visitDate: true,
            visitType: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true as const, billings };
  } catch (error) {
    console.error("Failed to get billings:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billings",
    };
  }
}

/**
 * Get all billing records with optional filtering
 */
export async function getAllBilling(filters?: {
  startDate?: Date;
  endDate?: Date;
  facilityId?: string;
  patientId?: string;
}) {
  try {
    // Build where conditions
    const whereConditions: {
      patientId?: string;
      visit?: {
        visitDate?: {
          gte?: Date;
          lte?: Date;
        };
      };
      patient?: {
        facilityId?: string;
      };
    } = {};

    if (filters?.patientId) {
      whereConditions.patientId = filters.patientId;
    }

    if (filters?.facilityId) {
      whereConditions.patient = {
        facilityId: filters.facilityId,
      };
    }

    if (filters?.startDate || filters?.endDate) {
      whereConditions.visit = {
        visitDate: {},
      };
      if (filters.startDate && whereConditions.visit.visitDate) {
        whereConditions.visit.visitDate.gte = filters.startDate;
      }
      if (filters.endDate && whereConditions.visit.visitDate) {
        whereConditions.visit.visitDate.lte = filters.endDate;
      }
    }

    const billings = await prisma.billing.findMany({
      where: whereConditions,
      include: {
        visit: {
          select: {
            id: true,
            visitDate: true,
            visitType: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            facility: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        visit: {
          visitDate: "desc",
        },
      },
    });

    return { success: true as const, billings };
  } catch (error) {
    console.error("Failed to get all billings:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to get billings",
    };
  }
}
