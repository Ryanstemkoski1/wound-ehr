"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// TYPES
// ============================================================================

export type DebridementAssessmentData = {
  visitId: string;
  patientId: string;
  facilityId: string;
  assessmentDate: string;
  placeOfService?: string;

  // Pre-Debridement
  woundLocation?: string;
  woundDurationYears?: number;
  woundDurationMonths?: number;
  woundDurationWeeks?: number;
  woundType?: string;
  woundTypeOther?: string;
  woundDepth?: string;
  preSizeLength?: number;
  preSizeWidth?: number;
  preSizeDepth?: number;
  hasUndermining?: boolean;
  hasTunneling?: boolean;
  tunnelingCm?: number;
  tunnelingClockPosition?: string;
  preGranulationPercent?: number;
  preFibroticPercent?: number;
  preSloughPercent?: number;
  preEscharPercent?: number;
  visibleStructures?: string[];
  woundEdges?: string[];
  periwoundSkin?: string[];
  periwoundSkinOther?: string;
  painLevel?: number;
  painDescription?: string;

  // Post-Debridement
  postSizeLength?: number;
  postSizeWidth?: number;
  postSizeDepth?: number;
  debridementType?: string;
  anestheticUsed?: string;
  methodUsed?: string;
  deviceFrequency?: string;
  deviceMode?: string;
  instrumentUsed?: string;
  solution?: string[];
  solutionOther?: string;
  tissueRemoved?: string[];
  depthOfTissueRemoved?: string;
  areaDebrided?: number;
  hemostasisAchieved?: boolean;
  hemostasisMethod?: string;
  estimatedBloodLoss?: string;
  postGranulationPercent?: number;
  postFibroticPercent?: number;
  postSloughPercent?: number;
  postEscharPercent?: number;

  // Procedure Notes
  procedureNotes?: string;

  // Goals / Plan
  goalsOfCare?: string[];
  nextDebridementDays?: number;
  dressingChangeDays?: number;
  referrals?: string[];
  referralOther?: string;
  additionalInterventions?: string[];

  // Medical Necessity
  includeMedicalNecessity?: boolean;
  medicalNecessityCustom?: string;

  isDraft?: boolean;
};

export type PatientNotSeenData = {
  visitId?: string;
  patientId: string;
  facilityId: string;
  scheduledDate: string;
  clinicianName?: string;
  reason: string;
  reasonOther?: string;
  pertinentNotes?: string;
  followUpRescheduled?: boolean;
  followUpNewDate?: string;
  facilityNotified?: boolean;
  familyNotified?: boolean;
  referralSourceNotified?: boolean;
  noFurtherAction?: boolean;
  followUpOther?: string;
  clinicianSignatureId?: string;
};

export type IncidentReportData = {
  facilityId: string;
  reportDate: string;
  reportTime?: string;
  incidentLocation?: string;
  employeeName: string;
  employeeRole?: string;
  employeeContact?: string;
  patientId?: string;
  patientName?: string;
  patientDob?: string;
  patientFacilityAgency?: string;
  description: string;
  immediateActions?: string;
  signatureId?: string;
};

export type ConsentToTreatmentData = {
  patientId: string;
  procedures: string[];
  procedureOther?: string;
  providerName: string;
  providerSignatureId?: string;
  patientSignatureId?: string;
  witnessSignatureId?: string;
  witnessName?: string;
  witnessRelationship?: string;
};

export type PhotoVideoConsentData = {
  patientId: string;
  representativeName: string;
  patientSignatureId?: string;
};

// ============================================================================
// DEBRIDEMENT ASSESSMENTS
// ============================================================================

export async function createDebridementAssessment(
  data: DebridementAssessmentData
): Promise<{ success: boolean; assessmentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const { data: result, error } = await supabase
      .from("debridement_assessments")
      .insert({
        visit_id: data.visitId,
        patient_id: data.patientId,
        facility_id: data.facilityId,
        created_by: user.id,
        assessment_date: data.assessmentDate,
        place_of_service: data.placeOfService || null,
        wound_location: data.woundLocation || null,
        wound_duration_years: data.woundDurationYears ?? null,
        wound_duration_months: data.woundDurationMonths ?? null,
        wound_duration_weeks: data.woundDurationWeeks ?? null,
        wound_type: data.woundType || null,
        wound_type_other: data.woundTypeOther || null,
        wound_depth: data.woundDepth || null,
        pre_size_length: data.preSizeLength ?? null,
        pre_size_width: data.preSizeWidth ?? null,
        pre_size_depth: data.preSizeDepth ?? null,
        has_undermining: data.hasUndermining ?? false,
        has_tunneling: data.hasTunneling ?? false,
        tunneling_cm: data.tunnelingCm ?? null,
        tunneling_clock_position: data.tunnelingClockPosition || null,
        pre_granulation_percent: data.preGranulationPercent ?? null,
        pre_fibrotic_percent: data.preFibroticPercent ?? null,
        pre_slough_percent: data.preSloughPercent ?? null,
        pre_eschar_percent: data.preEscharPercent ?? null,
        visible_structures: data.visibleStructures || [],
        wound_edges: data.woundEdges || [],
        periwound_skin: data.periwoundSkin || [],
        periwound_skin_other: data.periwoundSkinOther || null,
        pain_level: data.painLevel ?? null,
        pain_description: data.painDescription || null,
        post_size_length: data.postSizeLength ?? null,
        post_size_width: data.postSizeWidth ?? null,
        post_size_depth: data.postSizeDepth ?? null,
        debridement_type: data.debridementType || "selective_non_contact",
        anesthetic_used: data.anestheticUsed || null,
        method_used: data.methodUsed || "ultrasonic_non_contact",
        device_frequency: data.deviceFrequency || "35_khz",
        device_mode: data.deviceMode || null,
        instrument_used: data.instrumentUsed || "arobella_qurette",
        solution: data.solution || [],
        solution_other: data.solutionOther || null,
        tissue_removed: data.tissueRemoved || [],
        depth_of_tissue_removed: data.depthOfTissueRemoved || null,
        area_debrided: data.areaDebrided ?? null,
        hemostasis_achieved: data.hemostasisAchieved ?? null,
        hemostasis_method: data.hemostasisMethod || null,
        estimated_blood_loss: data.estimatedBloodLoss || null,
        post_granulation_percent: data.postGranulationPercent ?? null,
        post_fibrotic_percent: data.postFibroticPercent ?? null,
        post_slough_percent: data.postSloughPercent ?? null,
        post_eschar_percent: data.postEscharPercent ?? null,
        procedure_notes: data.procedureNotes || null,
        goals_of_care: data.goalsOfCare || [],
        next_debridement_days: data.nextDebridementDays ?? null,
        dressing_change_days: data.dressingChangeDays ?? null,
        referrals: data.referrals || [],
        referral_other: data.referralOther || null,
        additional_interventions: data.additionalInterventions || [],
        include_medical_necessity: data.includeMedicalNecessity ?? true,
        medical_necessity_custom: data.medicalNecessityCustom || null,
        is_draft: data.isDraft ?? false,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    revalidatePath(
      `/dashboard/patients/${data.patientId}/visits/${data.visitId}`
    );
    return { success: true, assessmentId: result.id };
  } catch (error) {
    console.error("Error creating debridement assessment:", error);
    return { success: false, error: "Failed to save debridement assessment" };
  }
}

export async function getDebridementAssessment(assessmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("debridement_assessments")
    .select("*")
    .eq("id", assessmentId)
    .single();

  if (error) {
    console.error("Error fetching debridement assessment:", error);
    return null;
  }
  return data;
}

export async function getVisitDebridementAssessments(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("debridement_assessments")
    .select("*")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching debridement assessments:", error);
    return [];
  }
  return data || [];
}

// ============================================================================
// PATIENT NOT SEEN REPORTS
// ============================================================================

export async function createPatientNotSeenReport(
  data: PatientNotSeenData
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const { data: result, error } = await supabase
      .from("patient_not_seen_reports")
      .insert({
        visit_id: data.visitId || null,
        patient_id: data.patientId,
        facility_id: data.facilityId,
        created_by: user.id,
        scheduled_date: data.scheduledDate,
        clinician_name: data.clinicianName || null,
        reason: data.reason,
        reason_other: data.reasonOther || null,
        pertinent_notes: data.pertinentNotes || null,
        follow_up_rescheduled: data.followUpRescheduled ?? false,
        follow_up_new_date: data.followUpNewDate || null,
        facility_notified: data.facilityNotified ?? false,
        family_notified: data.familyNotified ?? false,
        referral_source_notified: data.referralSourceNotified ?? false,
        no_further_action: data.noFurtherAction ?? false,
        follow_up_other: data.followUpOther || null,
        clinician_signature_id: data.clinicianSignatureId || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    if (data.visitId) {
      revalidatePath(
        `/dashboard/patients/${data.patientId}/visits/${data.visitId}`
      );
    }
    return { success: true, reportId: result.id };
  } catch (error) {
    console.error("Error creating patient-not-seen report:", error);
    return { success: false, error: "Failed to save report" };
  }
}

export async function getPatientNotSeenReports(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("patient_not_seen_reports")
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error("Error fetching not-seen reports:", error);
    return [];
  }
  return data || [];
}

export async function getVisitNotSeenReport(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("patient_not_seen_reports")
    .select("*")
    .eq("visit_id", visitId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching not-seen report:", error);
    return null;
  }
  return data;
}

// ============================================================================
// INCIDENT REPORTS
// ============================================================================

export async function createIncidentReport(
  data: IncidentReportData
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const { data: result, error } = await supabase
      .from("incident_reports")
      .insert({
        facility_id: data.facilityId,
        created_by: user.id,
        report_date: data.reportDate,
        report_time: data.reportTime || null,
        incident_location: data.incidentLocation || null,
        employee_name: data.employeeName,
        employee_role: data.employeeRole || null,
        employee_contact: data.employeeContact || null,
        patient_id: data.patientId || null,
        patient_name: data.patientName || null,
        patient_dob: data.patientDob || null,
        patient_facility_agency: data.patientFacilityAgency || null,
        description: data.description,
        immediate_actions: data.immediateActions || null,
        signature_id: data.signatureId || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { success: true, reportId: result.id };
  } catch (error) {
    console.error("Error creating incident report:", error);
    return { success: false, error: "Failed to save incident report" };
  }
}

export async function getIncidentReports(facilityId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("incident_reports")
    .select("*")
    .order("report_date", { ascending: false });

  if (facilityId) {
    query = query.eq("facility_id", facilityId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching incident reports:", error);
    return [];
  }
  return data || [];
}

export async function getIncidentReport(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("incident_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error) {
    console.error("Error fetching incident report:", error);
    return null;
  }
  return data;
}

// ============================================================================
// CONSENT FORMS (uses existing patient_consents table)
// ============================================================================

export async function createConsentToTreatment(
  data: ConsentToTreatmentData
): Promise<{ success: boolean; consentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const consentText = generateConsentToTreatmentText(
      data.procedures,
      data.procedureOther
    );

    const { data: result, error } = await supabase
      .from("patient_consents")
      .insert({
        patient_id: data.patientId,
        consent_type: "treatment",
        consent_text: consentText,
        consented_at: new Date().toISOString(),
        patient_signature_id: data.patientSignatureId || null,
        witness_signature_id: data.witnessSignatureId || null,
        provider_signature_id: data.providerSignatureId || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    return { success: true, consentId: result.id };
  } catch (error) {
    console.error("Error creating consent to treatment:", error);
    return { success: false, error: "Failed to save consent" };
  }
}

export async function createPhotoVideoConsent(
  data: PhotoVideoConsentData
): Promise<{ success: boolean; consentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const consentText = PHOTO_VIDEO_CONSENT_TEXT;

    const { data: result, error } = await supabase
      .from("patient_consents")
      .insert({
        patient_id: data.patientId,
        consent_type: "photo_video",
        consent_text: consentText,
        consented_at: new Date().toISOString(),
        patient_signature_id: data.patientSignatureId || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    return { success: true, consentId: result.id };
  } catch (error) {
    console.error("Error creating photo/video consent:", error);
    return { success: false, error: "Failed to save consent" };
  }
}

export async function getPatientConsents(
  patientId: string,
  consentType?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("patient_consents")
    .select("*")
    .eq("patient_id", patientId)
    .order("consented_at", { ascending: false });

  if (consentType) {
    query = query.eq("consent_type", consentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching patient consents:", error);
    return [];
  }
  return data || [];
}

// ============================================================================
// HELPERS
// ============================================================================

function generateConsentToTreatmentText(
  procedures: string[],
  procedureOther?: string
): string {
  const procedureLabels: Record<string, string> = {
    sharp_debridement:
      "Sharp Debridement possibly involving a curette, scalpel, scissors, forceps, and silver nitrate",
    incision_drainage:
      "Incision and Drainage possibly involving the use of an anaesthetic agent (lidocaine—given via syringe), a scalpel, curette, scissors, forceps, and/or a drainage wick",
    tissue_biopsy:
      "Tissue biopsy – using special biopsy instruments and scalpel, forceps, and scissors",
    other: procedureOther
      ? `Other: ${procedureOther}`
      : "Topical anaesthesia — Often a topical sprayed-on anaesthetic agent (benzocaine 20%) is used with any of the above procedures",
  };

  const selectedProcedures = procedures
    .map((p) => procedureLabels[p] || p)
    .join("\n");

  return `PATIENT CONSENT TO TREATMENT

Procedures:
${selectedProcedures}

Often a topical sprayed-on anaesthetic agent (benzocaine 20%) is used with any of the above procedures.

** SHARP DEBRIDEMENT SHOULD NOT BE DONE IN ANY AREA AFFECTING A DIALYSIS ACCESS SITE

I have been told about the intended benefits, possible risks, and any alternatives to the procedure(s). I understand that additional procedures may become necessary during my treatment, and that this procedure may involve topical anaesthesia. I understand that my consent also gives approval for another provider in the same practice to do this same procedure(s) (as a part of standard best practice follow-up wound care) should the provider be unavailable.`;
}

const PHOTO_VIDEO_CONSENT_TEXT = `PATIENT PHOTO & VIDEO CONSENT FOR TRAINING & EDUCATIONAL PURPOSES

I hereby authorize May MD, Inc. DBA The Wound Well Company & Tubes On Demand and its providers, clinicians, employees, and authorized representatives to take photographs, video recordings, and/or digital images of me and/or my medical condition during the course of my care.

These images and recordings may be used for the following purposes:
• Clinical documentation
• Internal staff training and education
• Quality assurance and improvement
• Provider education and case review

I understand that these images and recordings will be used solely for professional, educational, and training purposes and will not be used for marketing, advertising, or public media without my separate written authorization.

Privacy & Confidentiality:
• All images and recordings will be handled in accordance with HIPAA privacy regulations
• Reasonable efforts will be made to protect my identity
• Images may be de-identified when appropriate
• These materials may be stored securely in electronic systems used by The Wound Well Company
• My decision to grant or deny this consent will not affect my medical care
• I may revoke this consent at any time by submitting a written request`;
