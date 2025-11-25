"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// TYPES
// ============================================================================

export type SkilledNursingAssessmentData = {
  visitId: string;
  patientId: string;
  facilityId: string;
  assessmentDate: string;
  
  // Pain
  hasPain?: boolean;
  painScale?: number;
  painLocation?: string;
  painQuality?: string;
  painManagement?: string;
  painAggravatingFactors?: string;
  
  // Vitals
  temp?: number;
  heartRate?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  
  // Cardiovascular
  cardiovascularWnl?: boolean;
  chestPain?: boolean;
  heartMurmur?: boolean;
  heartGallop?: boolean;
  heartClick?: boolean;
  heartIrregular?: boolean;
  peripheralPulses?: string;
  capRefillUnder3sec?: boolean;
  dizziness?: boolean;
  hasEdema?: boolean;
  edemaGrade?: string;
  neckVeinDistention?: boolean;
  
  // Respiratory
  lungSoundsCta?: boolean;
  lungSoundsRales?: boolean;
  lungSoundsRhonchi?: boolean;
  lungSoundsWheezes?: boolean;
  lungSoundsCrackles?: boolean;
  lungSoundsAbsent?: boolean;
  lungSoundsDiminished?: boolean;
  lungSoundsStridor?: boolean;
  hasCough?: boolean;
  coughProductive?: boolean;
  hasSputum?: boolean;
  sputumDescription?: string;
  onOxygen?: boolean;
  oxygenLpm?: number;
  onNebulizer?: boolean;
  nebulizerType?: string;
  nebulizerTime?: string;
  
  // Orientation / Neuro
  orientedPerson?: boolean;
  orientedPlace?: boolean;
  orientedTime?: boolean;
  disoriented?: boolean;
  forgetful?: boolean;
  lethargic?: boolean;
  perrl?: boolean;
  hasSeizures?: boolean;
  
  // Sensory
  sensoryWnl?: boolean;
  hearingImpairedLeft?: boolean;
  hearingImpairedRight?: boolean;
  hearingDeaf?: boolean;
  speechImpaired?: boolean;
  visionWnl?: boolean;
  visionGlasses?: boolean;
  visionContacts?: boolean;
  visionBlurred?: boolean;
  visionCataracts?: boolean;
  visionGlaucoma?: boolean;
  visionBlind?: boolean;
  visionMacularDegeneration?: boolean;
  decreasedSensation?: string;
  
  // GU
  guWnl?: boolean;
  guIncontinence?: boolean;
  guDistention?: boolean;
  guBurning?: boolean;
  guFrequency?: boolean;
  guDysuria?: boolean;
  guRetention?: boolean;
  guUrgency?: boolean;
  guUrostomy?: string;
  catheterType?: string;
  catheterSizeFr?: number;
  catheterBalloonCc?: number;
  catheterLastChanged?: string;
  urineCloudy?: boolean;
  urineOdorous?: boolean;
  urineSediment?: boolean;
  urineHematuria?: boolean;
  urineOther?: string;
  externalGenitaliaNormal?: boolean;
  externalGenitaliaNotes?: string;
  
  // GI
  giWnl?: boolean;
  giNauseaVomiting?: boolean;
  giNpo?: boolean;
  giReflux?: boolean;
  giDiarrhea?: boolean;
  giConstipation?: string;
  giIncontinence?: boolean;
  bowelSounds?: string;
  lastBm?: string;
  stoolWnl?: boolean;
  stoolGray?: boolean;
  stoolTarry?: boolean;
  stoolFreshBlood?: boolean;
  stoolBlack?: boolean;
  hasOstomy?: boolean;
  ostomyStomaAppearance?: string;
  ostomyStoolAppearance?: string;
  ostomySurroundingSkin?: string;
  
  // Nutrition
  nutritionWnl?: boolean;
  dysphagia?: boolean;
  decreasedAppetite?: boolean;
  weightChange?: string;
  mealsPreparedAppropriately?: boolean;
  adequateIntake?: boolean;
  chewingSwallowingIssues?: boolean;
  dentures?: boolean;
  dentalProblems?: string;
  tubeFeeding?: boolean;
  tubeFeedingFormula?: string;
  tubeFeedingType?: string;
  tubeFeedingRateCcHr?: number;
  tubeFeedingMethod?: string;
  tubeFeedingPlacementChecked?: boolean;
  
  // Medications
  medChangesSinceLastVisit?: boolean;
  medCompliant?: boolean;
  medicationNotes?: string;
  
  // Psychosocial
  poorHomeEnvironment?: boolean;
  poorCopingSkills?: boolean;
  agitated?: boolean;
  depressedMood?: boolean;
  impairedDecisionMaking?: boolean;
  anxiety?: boolean;
  inappropriateBehavior?: boolean;
  irritability?: boolean;
  
  // Musculoskeletal
  musculoskeletalWnl?: boolean;
  weakness?: boolean;
  ambulationDifficulty?: boolean;
  limitedMobility?: string;
  jointPain?: boolean;
  balanceIssues?: boolean;
  gripStrengthEqual?: boolean;
  bedbound?: boolean;
  chairbound?: boolean;
  contracture?: boolean;
  paralysis?: boolean;
  
  // Integumentary
  integumentaryWnl?: boolean;
  skinDry?: boolean;
  skinClammy?: boolean;
  skinWarm?: boolean;
  skinCool?: boolean;
  skinPallor?: boolean;
  skinTurgor?: string;
  
  // Notes
  mdNotification?: string;
  educationGiven?: string;
  educationSource?: string;
  problemsIssues?: string;
  
  // Metadata
  isDraft?: boolean;
};

export type SkilledNursingWoundData = {
  location: string;
  onsetDate?: string;
  size?: string;
  drainage?: string;
  odor?: string;
  etiology?: string;
  stage?: string;
  hasUndermining?: boolean;
  hasInflammation?: boolean;
  treatment?: string;
  photoObtained?: boolean;
  comments?: string;
  diagramX?: number;
  diagramY?: number;
  woundId?: string; // Optional link to existing wound
};

export type GTubeProcedureData = {
  patientId: string;
  facilityId: string;
  procedureDate: string;
  procedureTime?: string;
  isNewPatient?: boolean;
  toPmd?: string;
  snfBedRoom?: string;
  provider?: string;
  clinicianName?: string;
  
  // Comorbidities
  comorbidDm?: boolean;
  comorbidCad?: boolean;
  comorbidCvd?: boolean;
  comorbidCopd?: boolean;
  comorbidEsrd?: boolean;
  comorbidCkd?: boolean;
  comorbidHtn?: boolean;
  comorbidAsthmaBronchitis?: boolean;
  comorbidCancer?: boolean;
  comorbidObesity?: boolean;
  comorbidAlzheimers?: boolean;
  comorbidDementia?: boolean;
  comorbidOther?: string;
  
  procedurePerformed?: boolean;
  procedureType?: string;
  procedureIndication?: string;
  
  // Abdominal Exam
  abdomenSoft?: boolean;
  abdomenNonTender?: boolean;
  abdomenDistended?: boolean;
  abdomenTender?: boolean;
  bowelSounds?: string;
  
  // Tube Type
  tubeType?: string;
  tubeFrenchSize?: number;
  tubeLength?: number;
  balloonVolume?: number;
  balloonWater?: number;
  tubeManufacturer?: string;
  
  // Peri-Tube Site Assessment
  peritubeSiteClean?: boolean;
  peritubeSiteDry?: boolean;
  peritubeSiteIntact?: boolean;
  peritubeGranulation?: boolean;
  peritubeErythema?: boolean;
  peritubeEdema?: boolean;
  peritubeDrainage?: boolean;
  peritubeInduration?: boolean;
  peritubeTenderness?: boolean;
  peritubeLeaking?: boolean;
  peritubeBleeding?: boolean;
  peritubeOdor?: boolean;
  drainageDescription?: string;
  siteNotes?: string;
  
  // Replacement Details
  replacementPerformed?: boolean;
  replacementReason?: string;
  oldTubeFrenchSize?: number;
  oldTubeLength?: number;
  newTubeFrenchSize?: number;
  newTubeLength?: number;
  replacementTechnique?: string;
  lubrication?: boolean;
  guidewireUsed?: boolean;
  
  // Verification
  verificationAspiration?: boolean;
  verificationPhTest?: boolean;
  verificationAuscultation?: boolean;
  verificationXray?: boolean;
  verificationNotes?: string;
  
  // Procedure Note
  procedureNote?: string;
  complications?: string;
  
  // Instructions & Consent
  patientInstructions?: string;
  consentObtained?: boolean;
  patientTolerated?: boolean;
  additionalComments?: string;
  isDraft?: boolean;
};

// ============================================================================
// SKILLED NURSING ASSESSMENTS
// ============================================================================

export async function createSkilledNursingAssessment(
  data: SkilledNursingAssessmentData,
  wounds: SkilledNursingWoundData[]
) {
  const supabase = await createClient();

  try {
    // Convert camelCase to snake_case for database
    const dbData = {
      visit_id: data.visitId,
      patient_id: data.patientId,
      facility_id: data.facilityId,
      assessment_date: data.assessmentDate,
      has_pain: data.hasPain,
      pain_scale: data.painScale,
      pain_location: data.painLocation,
      pain_quality: data.painQuality,
      pain_management: data.painManagement,
      pain_aggravating_factors: data.painAggravatingFactors,
      temp: data.temp,
      heart_rate: data.heartRate,
      bp_systolic: data.bpSystolic,
      bp_diastolic: data.bpDiastolic,
      respiratory_rate: data.respiratoryRate,
      oxygen_saturation: data.oxygenSaturation,
      blood_sugar: data.bloodSugar,
      cardiovascular_wnl: data.cardiovascularWnl,
      chest_pain: data.chestPain,
      heart_murmur: data.heartMurmur,
      heart_gallop: data.heartGallop,
      heart_click: data.heartClick,
      heart_irregular: data.heartIrregular,
      peripheral_pulses: data.peripheralPulses,
      cap_refill_under_3sec: data.capRefillUnder3sec,
      dizziness: data.dizziness,
      has_edema: data.hasEdema,
      edema_grade: data.edemaGrade,
      neck_vein_distention: data.neckVeinDistention,
      lung_sounds_cta: data.lungSoundsCta,
      lung_sounds_rales: data.lungSoundsRales,
      lung_sounds_rhonchi: data.lungSoundsRhonchi,
      lung_sounds_wheezes: data.lungSoundsWheezes,
      lung_sounds_crackles: data.lungSoundsCrackles,
      lung_sounds_absent: data.lungSoundsAbsent,
      lung_sounds_diminished: data.lungSoundsDiminished,
      lung_sounds_stridor: data.lungSoundsStridor,
      has_cough: data.hasCough,
      cough_productive: data.coughProductive,
      has_sputum: data.hasSputum,
      sputum_description: data.sputumDescription,
      on_oxygen: data.onOxygen,
      oxygen_lpm: data.oxygenLpm,
      on_nebulizer: data.onNebulizer,
      nebulizer_type: data.nebulizerType,
      nebulizer_time: data.nebulizerTime,
      oriented_person: data.orientedPerson,
      oriented_place: data.orientedPlace,
      oriented_time: data.orientedTime,
      disoriented: data.disoriented,
      forgetful: data.forgetful,
      lethargic: data.lethargic,
      perrl: data.perrl,
      has_seizures: data.hasSeizures,
      sensory_wnl: data.sensoryWnl,
      hearing_impaired_left: data.hearingImpairedLeft,
      hearing_impaired_right: data.hearingImpairedRight,
      hearing_deaf: data.hearingDeaf,
      speech_impaired: data.speechImpaired,
      vision_wnl: data.visionWnl,
      vision_glasses: data.visionGlasses,
      vision_contacts: data.visionContacts,
      vision_blurred: data.visionBlurred,
      vision_cataracts: data.visionCataracts,
      vision_glaucoma: data.visionGlaucoma,
      vision_blind: data.visionBlind,
      vision_macular_degeneration: data.visionMacularDegeneration,
      decreased_sensation: data.decreasedSensation,
      gu_wnl: data.guWnl,
      gu_incontinence: data.guIncontinence,
      gu_distention: data.guDistention,
      gu_burning: data.guBurning,
      gu_frequency: data.guFrequency,
      gu_dysuria: data.guDysuria,
      gu_retention: data.guRetention,
      gu_urgency: data.guUrgency,
      gu_urostomy: data.guUrostomy,
      catheter_type: data.catheterType,
      catheter_size_fr: data.catheterSizeFr,
      catheter_balloon_cc: data.catheterBalloonCc,
      catheter_last_changed: data.catheterLastChanged,
      urine_cloudy: data.urineCloudy,
      urine_odorous: data.urineOdorous,
      urine_sediment: data.urineSediment,
      urine_hematuria: data.urineHematuria,
      urine_other: data.urineOther,
      external_genitalia_normal: data.externalGenitaliaNormal,
      external_genitalia_notes: data.externalGenitaliaNotes,
      gi_wnl: data.giWnl,
      gi_nausea_vomiting: data.giNauseaVomiting,
      gi_npo: data.giNpo,
      gi_reflux: data.giReflux,
      gi_diarrhea: data.giDiarrhea,
      gi_constipation: data.giConstipation,
      gi_incontinence: data.giIncontinence,
      bowel_sounds: data.bowelSounds,
      last_bm: data.lastBm,
      stool_wnl: data.stoolWnl,
      stool_gray: data.stoolGray,
      stool_tarry: data.stoolTarry,
      stool_fresh_blood: data.stoolFreshBlood,
      stool_black: data.stoolBlack,
      has_ostomy: data.hasOstomy,
      ostomy_stoma_appearance: data.ostomyStomaAppearance,
      ostomy_stool_appearance: data.ostomyStoolAppearance,
      ostomy_surrounding_skin: data.ostomySurroundingSkin,
      nutrition_wnl: data.nutritionWnl,
      dysphagia: data.dysphagia,
      decreased_appetite: data.decreasedAppetite,
      weight_change: data.weightChange,
      meals_prepared_appropriately: data.mealsPreparedAppropriately,
      adequate_intake: data.adequateIntake,
      chewing_swallowing_issues: data.chewingSwallowingIssues,
      dentures: data.dentures,
      dental_problems: data.dentalProblems,
      tube_feeding: data.tubeFeeding,
      tube_feeding_formula: data.tubeFeedingFormula,
      tube_feeding_type: data.tubeFeedingType,
      tube_feeding_rate_cc_hr: data.tubeFeedingRateCcHr,
      tube_feeding_method: data.tubeFeedingMethod,
      tube_feeding_placement_checked: data.tubeFeedingPlacementChecked,
      med_changes_since_last_visit: data.medChangesSinceLastVisit,
      med_compliant: data.medCompliant,
      medication_notes: data.medicationNotes,
      poor_home_environment: data.poorHomeEnvironment,
      poor_coping_skills: data.poorCopingSkills,
      agitated: data.agitated,
      depressed_mood: data.depressedMood,
      impaired_decision_making: data.impairedDecisionMaking,
      anxiety: data.anxiety,
      inappropriate_behavior: data.inappropriateBehavior,
      irritability: data.irritability,
      musculoskeletal_wnl: data.musculoskeletalWnl,
      weakness: data.weakness,
      ambulation_difficulty: data.ambulationDifficulty,
      limited_mobility: data.limitedMobility,
      joint_pain: data.jointPain,
      balance_issues: data.balanceIssues,
      grip_strength_equal: data.gripStrengthEqual,
      bedbound: data.bedbound,
      chairbound: data.chairbound,
      contracture: data.contracture,
      paralysis: data.paralysis,
      integumentary_wnl: data.integumentaryWnl,
      skin_dry: data.skinDry,
      skin_clammy: data.skinClammy,
      skin_warm: data.skinWarm,
      skin_cool: data.skinCool,
      skin_pallor: data.skinPallor,
      skin_turgor: data.skinTurgor,
      md_notification: data.mdNotification,
      education_given: data.educationGiven,
      education_source: data.educationSource,
      problems_issues: data.problemsIssues,
      is_draft: data.isDraft ?? false,
      submitted_at: data.isDraft ? null : new Date().toISOString(),
    };

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Insert assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from("skilled_nursing_assessments")
      .insert({ ...dbData, created_by: user.id })
      .select()
      .single();

    if (assessmentError) throw assessmentError;

    // Insert wounds if provided
    if (wounds.length > 0) {
      const woundsData = wounds.map((wound) => ({
        assessment_id: assessment.id,
        visit_id: data.visitId,
        wound_id: wound.woundId || null,
        location: wound.location,
        onset_date: wound.onsetDate,
        size: wound.size,
        drainage: wound.drainage,
        odor: wound.odor,
        etiology: wound.etiology,
        stage: wound.stage,
        has_undermining: wound.hasUndermining,
        has_inflammation: wound.hasInflammation,
        treatment: wound.treatment,
        photo_obtained: wound.photoObtained,
        comments: wound.comments,
        diagram_x: wound.diagramX,
        diagram_y: wound.diagramY,
      }));

      const { error: woundsError } = await supabase
        .from("skilled_nursing_wounds")
        .insert(woundsData);

      if (woundsError) throw woundsError;
    }

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    revalidatePath(`/dashboard/visits/${data.visitId}`);

    return { success: true, assessmentId: assessment.id };
  } catch (error) {
    console.error("Error creating skilled nursing assessment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSkilledNursingAssessment(assessmentId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc(
      "get_skilled_nursing_assessment_with_wounds",
      { assessment_id_param: assessmentId }
    );

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching skilled nursing assessment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getVisitSkilledNursingAssessments(visitId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("skilled_nursing_assessments")
      .select("*, skilled_nursing_wounds(*)")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching visit skilled nursing assessments:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// G-TUBE PROCEDURES
// ============================================================================

export async function createGTubeProcedure(data: GTubeProcedureData) {
  const supabase = await createClient();

  try {
    // Convert camelCase to snake_case for database
    const dbData = {
      patient_id: data.patientId,
      facility_id: data.facilityId,
      procedure_date: data.procedureDate,
      procedure_time: data.procedureTime,
      clinician_name: data.clinicianName,
      is_new_patient: data.isNewPatient,
      to_pmd: data.toPmd,
      snf_bed_room: data.snfBedRoom,
      provider: data.provider,
      
      // Comorbidities
      comorbid_dm: data.comorbidDm,
      comorbid_cad: data.comorbidCad,
      comorbid_cvd: data.comorbidCvd,
      comorbid_copd: data.comorbidCopd,
      comorbid_esrd: data.comorbidEsrd,
      comorbid_ckd: data.comorbidCkd,
      comorbid_htn: data.comorbidHtn,
      comorbid_asthma_bronchitis: data.comorbidAsthmaBronchitis,
      comorbid_cancer: data.comorbidCancer,
      comorbid_obesity: data.comorbidObesity,
      comorbid_alzheimers: data.comorbidAlzheimers,
      comorbid_dementia: data.comorbidDementia,
      comorbid_other: data.comorbidOther,
      
      // Procedure
      procedure_performed: data.procedurePerformed,
      procedure_type: data.procedureType,
      procedure_indication: data.procedureIndication,
      
      // Abdominal Exam
      abdomen_soft: data.abdomenSoft,
      abdomen_non_tender: data.abdomenNonTender,
      abdomen_distended: data.abdomenDistended,
      abdomen_tender: data.abdomenTender,
      bowel_sounds: data.bowelSounds,
      
      // Tube Type
      tube_type: data.tubeType,
      tube_french_size: data.tubeFrenchSize,
      tube_length: data.tubeLength,
      balloon_volume: data.balloonVolume,
      balloon_water: data.balloonWater,
      tube_manufacturer: data.tubeManufacturer,
      
      // Peri-tube Site Assessment
      peritube_site_clean: data.peritubeSiteClean,
      peritube_site_dry: data.peritubeSiteDry,
      peritube_site_intact: data.peritubeSiteIntact,
      peritube_granulation: data.peritubeGranulation,
      peritube_erythema: data.peritubeErythema,
      peritube_edema: data.peritubeEdema,
      peritube_drainage: data.peritubeDrainage,
      peritube_induration: data.peritubeInduration,
      peritube_tenderness: data.peritubeTenderness,
      peritube_leaking: data.peritubeLeaking,
      peritube_bleeding: data.peritubeBleeding,
      peritube_odor: data.peritubeOdor,
      drainage_description: data.drainageDescription,
      site_notes: data.siteNotes,
      
      // Replacement Details
      replacement_performed: data.replacementPerformed,
      replacement_reason: data.replacementReason,
      old_tube_french_size: data.oldTubeFrenchSize,
      old_tube_length: data.oldTubeLength,
      new_tube_french_size: data.newTubeFrenchSize,
      new_tube_length: data.newTubeLength,
      replacement_technique: data.replacementTechnique,
      lubrication: data.lubrication,
      guidewire_used: data.guidewireUsed,
      
      // Verification
      verification_aspiration: data.verificationAspiration,
      verification_ph_test: data.verificationPhTest,
      verification_auscultation: data.verificationAuscultation,
      verification_xray: data.verificationXray,
      verification_notes: data.verificationNotes,
      
      // Procedure Note
      procedure_note: data.procedureNote,
      complications: data.complications,
      
      // Instructions & Consent
      patient_instructions: data.patientInstructions,
      consent_obtained: data.consentObtained,
      patient_tolerated: data.patientTolerated,
      additional_comments: data.additionalComments,
      is_draft: data.isDraft ?? false,
      submitted_at: data.isDraft ? null : new Date().toISOString(),
    };

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Insert procedure
    const { data: procedure, error } = await supabase
      .from("gtube_procedures")
      .insert({ ...dbData, created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/patients/${data.patientId}`);

    return { success: true, procedureId: procedure.id };
  } catch (error) {
    console.error("Error creating G-tube procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getGTubeProcedure(procedureId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("gtube_procedures")
      .select("*")
      .eq("id", procedureId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching G-tube procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getPatientGTubeProcedures(patientId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("gtube_procedures")
      .select("*")
      .eq("patient_id", patientId)
      .order("procedure_date", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching patient G-tube procedures:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getPatientGTubeProcedureCount(patientId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc(
      "get_patient_gtube_procedure_count",
      { patient_id_param: patientId }
    );

    if (error) throw error;
    return { success: true, count: data };
  } catch (error) {
    console.error("Error fetching G-tube procedure count:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
