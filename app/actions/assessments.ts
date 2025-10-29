"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// Validation schema
const assessmentSchema = z.object({
  visitId: z.string().uuid(),
  woundId: z.string().uuid(),
  woundType: z.string().optional(),
  pressureStage: z.string().optional(),
  healingStatus: z.string().optional(),
  atRiskReopening: z.boolean().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  depth: z.string().optional(),
  undermining: z.string().optional(),
  tunneling: z.string().optional(),
  epithelialPercent: z.string().optional(),
  granulationPercent: z.string().optional(),
  sloughPercent: z.string().optional(),
  exudateAmount: z.string().optional(),
  exudateType: z.string().optional(),
  odor: z.string().optional(),
  periwoundCondition: z.string().optional(),
  painLevel: z.string().optional(),
  infectionSigns: z.string().optional(), // JSON array as string
  assessmentNotes: z.string().optional(),
});

// Get all assessments for a visit
export async function getAssessments(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        visitId,
        visit: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      include: {
        wound: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return assessments;
  } catch (error) {
    console.error("Failed to fetch assessments:", error);
    return [];
  }
}

// Get a single assessment
export async function getAssessment(assessmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        visit: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      include: {
        visit: {
          include: {
            patient: {
              include: {
                facility: true,
              },
            },
          },
        },
        wound: true,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Failed to fetch assessment:", error);
    return null;
  }
}

// Create a new assessment
export async function createAssessment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const data = {
      visitId: formData.get("visitId") as string,
      woundId: formData.get("woundId") as string,
      woundType: formData.get("woundType") as string,
      pressureStage: formData.get("pressureStage") as string,
      healingStatus: formData.get("healingStatus") as string,
      atRiskReopening: formData.get("atRiskReopening") === "true",
      length: formData.get("length") as string,
      width: formData.get("width") as string,
      depth: formData.get("depth") as string,
      undermining: formData.get("undermining") as string,
      tunneling: formData.get("tunneling") as string,
      epithelialPercent: formData.get("epithelialPercent") as string,
      granulationPercent: formData.get("granulationPercent") as string,
      sloughPercent: formData.get("sloughPercent") as string,
      exudateAmount: formData.get("exudateAmount") as string,
      exudateType: formData.get("exudateType") as string,
      odor: formData.get("odor") as string,
      periwoundCondition: formData.get("periwoundCondition") as string,
      painLevel: formData.get("painLevel") as string,
      infectionSigns: formData.get("infectionSigns") as string,
      assessmentNotes: formData.get("assessmentNotes") as string,
    };

    // Validate
    const validated = assessmentSchema.parse(data);

    // Check if user has access to this visit
    const visit = await prisma.visit.findFirst({
      where: {
        id: validated.visitId,
        patient: {
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      },
      include: {
        patient: true,
      },
    });

    if (!visit) {
      return { error: "Visit not found or access denied" };
    }

    // Check if wound belongs to patient
    const wound = await prisma.wound.findFirst({
      where: {
        id: validated.woundId,
        patientId: visit.patientId,
      },
    });

    if (!wound) {
      return { error: "Wound not found or does not belong to this patient" };
    }

    // Parse infection signs JSON
    let infectionSigns = null;
    if (validated.infectionSigns) {
      try {
        infectionSigns = JSON.parse(validated.infectionSigns);
      } catch {
        // If parsing fails, treat as null
        infectionSigns = null;
      }
    }

    // Calculate area if length and width provided
    let area = null;
    if (validated.length && validated.width) {
      const length = parseFloat(validated.length);
      const width = parseFloat(validated.width);
      if (!isNaN(length) && !isNaN(width)) {
        area = new Decimal(length * width);
      }
    }

    // Create assessment
    await prisma.assessment.create({
      data: {
        visitId: validated.visitId,
        woundId: validated.woundId,
        woundType: validated.woundType || null,
        pressureStage: validated.pressureStage || null,
        healingStatus: validated.healingStatus || null,
        atRiskReopening: validated.atRiskReopening || null,
        length: validated.length ? new Decimal(validated.length) : null,
        width: validated.width ? new Decimal(validated.width) : null,
        depth: validated.depth ? new Decimal(validated.depth) : null,
        area,
        undermining: validated.undermining || null,
        tunneling: validated.tunneling || null,
        epithelialPercent: validated.epithelialPercent
          ? parseInt(validated.epithelialPercent)
          : null,
        granulationPercent: validated.granulationPercent
          ? parseInt(validated.granulationPercent)
          : null,
        sloughPercent: validated.sloughPercent
          ? parseInt(validated.sloughPercent)
          : null,
        exudateAmount: validated.exudateAmount || null,
        exudateType: validated.exudateType || null,
        odor: validated.odor || null,
        periwoundCondition: validated.periwoundCondition || null,
        painLevel: validated.painLevel ? parseInt(validated.painLevel) : null,
        infectionSigns,
        assessmentNotes: validated.assessmentNotes || null,
      },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patientId}`);
    revalidatePath(
      `/dashboard/patients/${visit.patientId}/visits/${validated.visitId}`
    );
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to create assessment:", error);
    return { error: "Failed to create assessment" };
  }
}

// Update an assessment
export async function updateAssessment(
  assessmentId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const data = {
      visitId: formData.get("visitId") as string,
      woundId: formData.get("woundId") as string,
      woundType: formData.get("woundType") as string,
      pressureStage: formData.get("pressureStage") as string,
      healingStatus: formData.get("healingStatus") as string,
      atRiskReopening: formData.get("atRiskReopening") === "true",
      length: formData.get("length") as string,
      width: formData.get("width") as string,
      depth: formData.get("depth") as string,
      undermining: formData.get("undermining") as string,
      tunneling: formData.get("tunneling") as string,
      epithelialPercent: formData.get("epithelialPercent") as string,
      granulationPercent: formData.get("granulationPercent") as string,
      sloughPercent: formData.get("sloughPercent") as string,
      exudateAmount: formData.get("exudateAmount") as string,
      exudateType: formData.get("exudateType") as string,
      odor: formData.get("odor") as string,
      periwoundCondition: formData.get("periwoundCondition") as string,
      painLevel: formData.get("painLevel") as string,
      infectionSigns: formData.get("infectionSigns") as string,
      assessmentNotes: formData.get("assessmentNotes") as string,
    };

    // Validate
    const validated = assessmentSchema.parse(data);

    // Check if user has access to this assessment
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        visit: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      include: {
        visit: true,
      },
    });

    if (!existingAssessment) {
      return { error: "Assessment not found or access denied" };
    }

    // Parse infection signs JSON
    let infectionSigns = null;
    if (validated.infectionSigns) {
      try {
        infectionSigns = JSON.parse(validated.infectionSigns);
      } catch {
        infectionSigns = null;
      }
    }

    // Calculate area if length and width provided
    let area = null;
    if (validated.length && validated.width) {
      const length = parseFloat(validated.length);
      const width = parseFloat(validated.width);
      if (!isNaN(length) && !isNaN(width)) {
        area = new Decimal(length * width);
      }
    }

    // Update assessment
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        woundType: validated.woundType || null,
        pressureStage: validated.pressureStage || null,
        healingStatus: validated.healingStatus || null,
        atRiskReopening: validated.atRiskReopening || null,
        length: validated.length ? new Decimal(validated.length) : null,
        width: validated.width ? new Decimal(validated.width) : null,
        depth: validated.depth ? new Decimal(validated.depth) : null,
        area,
        undermining: validated.undermining || null,
        tunneling: validated.tunneling || null,
        epithelialPercent: validated.epithelialPercent
          ? parseInt(validated.epithelialPercent)
          : null,
        granulationPercent: validated.granulationPercent
          ? parseInt(validated.granulationPercent)
          : null,
        sloughPercent: validated.sloughPercent
          ? parseInt(validated.sloughPercent)
          : null,
        exudateAmount: validated.exudateAmount || null,
        exudateType: validated.exudateType || null,
        odor: validated.odor || null,
        periwoundCondition: validated.periwoundCondition || null,
        painLevel: validated.painLevel ? parseInt(validated.painLevel) : null,
        infectionSigns,
        assessmentNotes: validated.assessmentNotes || null,
      },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${existingAssessment.visit.patientId}`);
    revalidatePath(
      `/dashboard/patients/${existingAssessment.visit.patientId}/visits/${existingAssessment.visitId}`
    );
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Failed to update assessment:", error);
    return { error: "Failed to update assessment" };
  }
}

// Delete an assessment
export async function deleteAssessment(assessmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if user has access to this assessment
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        visit: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      include: {
        visit: true,
      },
    });

    if (!assessment) {
      return { error: "Assessment not found or access denied" };
    }

    // Delete assessment
    await prisma.assessment.delete({
      where: { id: assessmentId },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${assessment.visit.patientId}`);
    revalidatePath(
      `/dashboard/patients/${assessment.visit.patientId}/visits/${assessment.visitId}`
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to delete assessment:", error);
    return { error: "Failed to delete assessment" };
  }
}
