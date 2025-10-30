"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    const { data: assessments, error } = await supabase
      .from("wound_assessments")
      .select(
        `
        *,
        wound:wounds(*)
      `
      )
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return assessments || [];
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
    const { data: assessment, error } = await supabase
      .from("wound_assessments")
      .select(
        `
        *,
        visit:visits(
          *,
          patient:patients(
            *,
            facility:facilities(*)
          )
        ),
        wound:wounds(*)
      `
      )
      .eq("id", assessmentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

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
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients(*)
      `
      )
      .eq("id", validated.visitId)
      .maybeSingle();

    if (visitError || !visit) {
      return { error: "Visit not found or access denied" };
    }

    // Check if wound belongs to patient
    const { data: wound, error: woundError } = await supabase
      .from("wounds")
      .select("id")
      .eq("id", validated.woundId)
      .eq("patient_id", visit.patient.id)
      .maybeSingle();

    if (woundError || !wound) {
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
        area = length * width;
      }
    }

    // Create assessment
    const { error: createError } = await supabase
      .from("wound_assessments")
      .insert({
        visit_id: validated.visitId,
        wound_id: validated.woundId,
        wound_type: validated.woundType || null,
        pressure_stage: validated.pressureStage || null,
        healing_status: validated.healingStatus || null,
        at_risk_reopening: validated.atRiskReopening || null,
        length: validated.length ? parseFloat(validated.length) : null,
        width: validated.width ? parseFloat(validated.width) : null,
        depth: validated.depth ? parseFloat(validated.depth) : null,
        area,
        undermining: validated.undermining || null,
        tunneling: validated.tunneling || null,
        epithelial_percent: validated.epithelialPercent
          ? parseInt(validated.epithelialPercent)
          : null,
        granulation_percent: validated.granulationPercent
          ? parseInt(validated.granulationPercent)
          : null,
        slough_percent: validated.sloughPercent
          ? parseInt(validated.sloughPercent)
          : null,
        exudate_amount: validated.exudateAmount || null,
        exudate_type: validated.exudateType || null,
        odor: validated.odor || null,
        periwound_condition: validated.periwoundCondition || null,
        pain_level: validated.painLevel ? parseInt(validated.painLevel) : null,
        infection_signs: infectionSigns,
        assessment_notes: validated.assessmentNotes || null,
      });

    if (createError) throw createError;

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${visit.patient_id}`);
    revalidatePath(
      `/dashboard/patients/${visit.patient_id}/visits/${validated.visitId}`
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
    const { data: existingAssessment, error: existingError } = await supabase
      .from("wound_assessments")
      .select(
        `
        *,
        visit:visits!inner(
          *,
          patient:patients!inner(
            facility:facilities!inner(
              user_facilities!inner(user_id)
            )
          )
        )
      `
      )
      .eq("id", assessmentId)
      .eq("visit.patient.facility.user_facilities.user_id", user.id)
      .maybeSingle();

    if (existingError || !existingAssessment) {
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
        area = length * width;
      }
    }

    // Update assessment
    const { error: updateError } = await supabase
      .from("wound_assessments")
      .update({
        wound_type: validated.woundType || null,
        pressure_stage: validated.pressureStage || null,
        healing_status: validated.healingStatus || null,
        at_risk_reopening: validated.atRiskReopening || null,
        length: validated.length ? parseFloat(validated.length) : null,
        width: validated.width ? parseFloat(validated.width) : null,
        depth: validated.depth ? parseFloat(validated.depth) : null,
        area,
        undermining: validated.undermining || null,
        tunneling: validated.tunneling || null,
        epithelial_percent: validated.epithelialPercent
          ? parseInt(validated.epithelialPercent)
          : null,
        granulation_percent: validated.granulationPercent
          ? parseInt(validated.granulationPercent)
          : null,
        slough_percent: validated.sloughPercent
          ? parseInt(validated.sloughPercent)
          : null,
        exudate_amount: validated.exudateAmount || null,
        exudate_type: validated.exudateType || null,
        odor: validated.odor || null,
        periwound_condition: validated.periwoundCondition || null,
        pain_level: validated.painLevel ? parseInt(validated.painLevel) : null,
        infection_signs: infectionSigns,
        assessment_notes: validated.assessmentNotes || null,
      })
      .eq("id", assessmentId);

    if (updateError) throw updateError;

    revalidatePath("/dashboard/patients");
    revalidatePath(
      `/dashboard/patients/${existingAssessment.visit.patient.id}`
    );
    revalidatePath(
      `/dashboard/patients/${existingAssessment.visit.patient.id}/visits/${existingAssessment.visit_id}`
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
    const { data: assessment, error: assessmentError } = await supabase
      .from("wound_assessments")
      .select(
        `
        *,
        visit:visits!inner(
          *,
          patient:patients!inner(
            facility:facilities!inner(
              user_facilities!inner(user_id)
            )
          )
        )
      `
      )
      .eq("id", assessmentId)
      .eq("visit.patient.facility.user_facilities.user_id", user.id)
      .maybeSingle();

    if (assessmentError || !assessment) {
      return { error: "Assessment not found or access denied" };
    }

    // Delete assessment
    const { error: deleteError } = await supabase
      .from("wound_assessments")
      .delete()
      .eq("id", assessmentId);

    if (deleteError) throw deleteError;

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${assessment.visit.patient.id}`);
    revalidatePath(
      `/dashboard/patients/${assessment.visit.patient.id}/visits/${assessment.visit_id}`
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to delete assessment:", error);
    return { error: "Failed to delete assessment" };
  }
}
