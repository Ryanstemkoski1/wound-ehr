// =====================================================
// Field Note Section Registry — SINGLE SOURCE OF TRUTH
// =====================================================
// Transcribed field-by-field from the client's paper
// "Wound Care Field Visit Note" (Aug 2026). Drives: the note
// editor, section rail, one-line summaries, blank-check,
// HTML paper preview, QA paper-view, the PDF template, and
// the zod schemas (lib/field-note/logic.ts).
//
// Paper section numbers are PRESERVED everywhere — Vitals is
// always "8", even on follow-up notes that omit sections.
// Changing labels/options here changes the form, the preview,
// and the PDF together; that is the point.

export type ChipOption = { value: string; label: string };

export type FieldDef =
  | {
      kind: "chips";
      key: string;
      label: string;
      options: ChipOption[];
      /** true = single-select (radio-like). Default multi-select, like paper checkboxes. */
      single?: boolean;
      /** Free-text detail input. Shown when any value in `when` is selected; always shown if `when` omitted. */
      detail?: { key: string; label: string; when?: string[] };
    }
  | { kind: "numeric"; key: string; label: string; unit?: string; min?: number; max?: number; step?: number }
  | { kind: "text"; key: string; label: string; placeholder?: string }
  | { kind: "textarea"; key: string; label: string };

export interface WoundFieldSpec {
  fields: FieldDef[];
}

export interface SectionDef {
  key: string;
  paperNumber: number;
  title: string;
  /** How a follow_up note treats this section. initial_evaluation is always "full". */
  followUp: "full" | "attestation" | "omitted";
  /** Label for the one-tap attestation on follow-ups (followUp === "attestation"). */
  attestationLabel?: string;
  /** Rendering kind: standard field list, the per-wound card list, or the notes+signature block. */
  kind: "standard" | "wounds" | "notes";
  fields: FieldDef[];
  /** Typically pre-filled by office staff during the pre-visit phone call (display grouping only — never a permission). */
  officePrefill?: boolean;
}

const c = (...labels: string[]): ChipOption[] =>
  labels.map((label) => ({
    value: label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, ""),
    label,
  }));

// ─── 2. History of Present Illness ───
const hpi: SectionDef = {
  key: "hpi",
  paperNumber: 2,
  title: "History of Present Illness",
  followUp: "full",
  kind: "standard",
  officePrefill: true,
  fields: [
    { kind: "chips", key: "wound_status", label: "Wound status", options: c("Improved", "Unchanged", "Increased drainage", "New redness", "Enlarged") },
    { kind: "chips", key: "new_wounds", label: "New wound(s)", options: c("None"), detail: { key: "new_wounds_detail", label: "If new (location/onset)" } },
    { kind: "chips", key: "pain", label: "Pain", options: c("Denies", "Mild (1-3)", "Moderate (4-6)", "Severe (7-10)", "Improved since last visit") },
    { kind: "chips", key: "drainage", label: "Drainage", options: c("None", "Minimal serous", "Mod. serosanguineous", "Heavy", "Decreased since last visit") },
    { kind: "chips", key: "odor", label: "Odor", options: c("None", "Mild", "Foul", "Improved") },
    { kind: "chips", key: "bleeding", label: "Bleeding", options: c("None", "Occasional scant", "Mild w/ trauma", "Resolved") },
    { kind: "chips", key: "concerns", label: "Pt/Caregiver concerns", options: c("Slow healing", "Increased drainage", "Offloading difficulty", "Supply access", "Wants education", "None") },
    { kind: "chips", key: "current_regimen", label: "Current regimen", options: c("Daily dressing changes", "Home health 3x/wk", "Offloading boot", "Compression therapy", "Caregiver performing care") },
    { kind: "chips", key: "response_to_tx", label: "Response to tx", options: c("Gradual improvement", "Decreased drainage/pain", "No improvement", "Increased size", "Improved post-debridement") },
  ],
};

// ─── 3. Interval History ───
const intervalHistory: SectionDef = {
  key: "interval_history",
  paperNumber: 3,
  title: "Interval History",
  followUp: "full",
  kind: "standard",
  officePrefill: true,
  fields: [
    { kind: "chips", key: "hospitalization", label: "Hospitalization", options: c("None"), detail: { key: "hospitalization_detail", label: "If yes (dates/reason)" } },
    { kind: "chips", key: "er_visit", label: "ER visit", options: c("None"), detail: { key: "er_visit_detail", label: "If yes (reason/date)" } },
    { kind: "chips", key: "falls", label: "Falls", options: c("None", "One, no injury", "Multiple, needs assist"), detail: { key: "falls_injury", label: "Injury", when: ["one_no_injury", "multiple_needs_assist"] } },
    { kind: "chips", key: "medication_changes", label: "Medication changes", options: c("None", "Started", "Discontinued", "Dose change"), detail: { key: "medication_changes_detail", label: "Specify", when: ["started", "discontinued", "dose_change"] } },
    { kind: "chips", key: "antibiotic_therapy", label: "Antibiotic therapy", options: c("None", "Currently taking", "Completed course", "New — suspected infection"), detail: { key: "antibiotic_detail", label: "Drug/Indication", when: ["currently_taking", "completed_course", "new_suspected_infection"] } },
    { kind: "chips", key: "smoking_status", label: "Smoking status", options: c("Never", "Former", "Current"), single: true, detail: { key: "cigs_per_day", label: "Cigs/day", when: ["current"] } },
    { kind: "chips", key: "nutrition_compliance", label: "Nutrition compliance", options: c("Compliant", "Taking supplements", "Poor appetite", "Difficulty meeting protein goal") },
    { kind: "chips", key: "offloading_compliance", label: "Offloading compliance", options: c("Compliant", "Partial (discomfort)", "Noncompliant (mobility)") },
    { kind: "chips", key: "compression_compliance", label: "Compression compliance", options: c("Worn as prescribed", "Removed intermittently", "Unable to tolerate", "Not indicated") },
    { kind: "chips", key: "blood_sugar", label: "Blood sugar control", options: c("Well controlled", "Occasional elevated"), detail: { key: "blood_sugar_range", label: "Range" } },
    { kind: "chips", key: "dialysis", label: "Dialysis status", options: c("Not on dialysis", "Hemodialysis", "Peritoneal dialysis"), single: true, detail: { key: "dialysis_days", label: "Days/wk", when: ["hemodialysis", "peritoneal_dialysis"] } },
    { kind: "chips", key: "weight_changes", label: "Weight changes", options: c("No change", "Stable", "Weight loss", "Weight gain (edema)"), detail: { key: "weight_amount", label: "Amount", when: ["weight_loss", "weight_gain_edema"] } },
    { kind: "chips", key: "functional_decline", label: "Functional decline", options: c("None", "Increased weakness", "Increased ADL dependence", "Decline in ambulation", "Increased fatigue") },
    { kind: "chips", key: "homebound_status", label: "Homebound status", options: c("Homebound (mobility/wound)", "Requires assist to leave", "Considerable effort to leave") },
    { kind: "chips", key: "transportation", label: "Transportation", options: c("No concerns", "Relies on family/caregiver", "Unable to drive", "Requires medical transport") },
  ],
};

// ─── 4. Functional Status ───
const functionalStatus: SectionDef = {
  key: "functional_status",
  paperNumber: 4,
  title: "Functional Status",
  followUp: "omitted",
  kind: "standard",
  officePrefill: true,
  fields: [
    { kind: "chips", key: "mobility", label: "Mobility", options: c("Independent", "Walker", "Cane", "Wheelchair dependent", "Bedbound", "Requires assistance") },
    { kind: "chips", key: "transfers", label: "Transfers", options: c("Independent", "Standby assist", "1-person assist", "2-person assist", "Mechanical lift", "Dependent") },
    { kind: "chips", key: "adls", label: "ADLs", options: c("Independent", "Partial assist (bathing/dressing)", "Full assist", "Dependent") },
    { kind: "chips", key: "caregiver_assistance", label: "Caregiver assistance", options: c("None needed", "Wound care/meds", "Family daily assist", "Home health nursing", "SNF staff", "24-hr caregiver") },
    { kind: "chips", key: "pressure_surface", label: "Pressure redistribution surface", options: c("Standard mattress", "Low air-loss", "Alternating pressure", "Wheelchair cushion", "Heel boots", "None available") },
  ],
};

// ─── 5. Nutrition History ───
const nutritionHistory: SectionDef = {
  key: "nutrition_history",
  paperNumber: 5,
  title: "Nutrition History",
  followUp: "omitted",
  kind: "standard",
  officePrefill: true,
  fields: [
    { kind: "chips", key: "appetite", label: "Appetite", options: c("Good", "Fair", "Poor", "Improving", "No change") },
    { kind: "chips", key: "protein_intake", label: "Protein intake", options: c("Adequate", "High-protein diet followed", "Difficulty meeting goal", "Limited (poor appetite)", "Inconsistent") },
    { kind: "chips", key: "protein_supplementation", label: "Protein supplementation", options: c("None", "Daily supplement", "Tube feeding", "Unable to tolerate"), detail: { key: "protein_supplement_detail", label: "Specify", when: ["daily_supplement", "tube_feeding", "unable_to_tolerate"] } },
    { kind: "chips", key: "hydration", label: "Hydration", options: c("Adequate", "Encouraged to increase", "Limited (poor appetite)", "Restricted per nephro/cardiology", "Enteral via G-tube") },
    { kind: "chips", key: "weight_changes", label: "Weight changes", options: c("Stable", "Loss", "Gain (edema)", "Unknown"), detail: { key: "weight_amount", label: "Amount", when: ["loss", "gain_edema"] } },
    { kind: "chips", key: "risk_factors", label: "Nutritional risk factors", options: c("Malnutrition", "Dysphagia", "Tube feeding", "Poor appetite", "Cachexia", "Obesity", "Vitamin/mineral deficiency", "None") },
  ],
};

// ─── 6. Review of Systems ───
const ros: SectionDef = {
  key: "ros",
  paperNumber: 6,
  title: "Review of Systems",
  followUp: "omitted",
  kind: "standard",
  officePrefill: true,
  fields: [
    { kind: "chips", key: "constitutional", label: "Constitutional", options: c("Denies fever/chills/wt loss", "Fatigue", "Decreased energy") },
    { kind: "chips", key: "cardiovascular", label: "Cardiovascular", options: c("Denies chest pain", "Chronic B/L LE edema", "Hx PAD", "Claudication") },
    { kind: "chips", key: "respiratory", label: "Respiratory", options: c("Denies SOB/cough", "Chronic dyspnea on exertion") },
    { kind: "chips", key: "endocrine", label: "Endocrine", options: c("Hx DM, controlled", "Occasional elevated glucose", "Denies hypoglycemia") },
    { kind: "chips", key: "neurologic", label: "Neurologic", options: c("Denies dizziness/syncope", "Diabetic neuropathy", "Decreased sensation B/L feet") },
    { kind: "chips", key: "musculoskeletal", label: "Musculoskeletal", options: c("Generalized weakness", "Limited mobility", "Chronic joint pain") },
    { kind: "chips", key: "gi_gu", label: "GI / GU", options: c("Denies N/V/D", "Urinary incontinence", "Fecal incontinence", "Dysphagia/PEG") },
    { kind: "chips", key: "skin", label: "Skin", options: c("Chronic wound(s) under tx", "Denies new breakdown", "Increased drainage", "New redness") },
    { kind: "chips", key: "psychiatric", label: "Psychiatric", options: c("Mood stable", "Denies depression/anxiety", "Hx dementia/cog. impairment") },
  ],
};

// ─── 7. PMH / Medications / Allergies ───
const pmhMedsAllergies: SectionDef = {
  key: "pmh_meds_allergies",
  paperNumber: 7,
  title: "Past Medical History / Medications / Allergies",
  followUp: "omitted",
  kind: "standard",
  officePrefill: true,
  fields: [
    { kind: "chips", key: "pmh", label: "PMH", options: c("No change since last visit", "DM", "PAD", "CKD", "CHF", "HTN", "Hyperlipidemia", "CVI", "Neuropathy", "Prior CVA"), detail: { key: "pmh_other", label: "Other" } },
    { kind: "chips", key: "medications", label: "Medications", options: c("No changes", "Reconciliation completed", "New med", "D/C'd", "Dose change"), detail: { key: "medications_detail", label: "Specify", when: ["new_med", "d_c_d", "dose_change"] } },
    { kind: "chips", key: "allergies", label: "Allergies", options: c("NKDA", "Reviewed, no changes"), detail: { key: "allergy_detail", label: "Allergy (agent/reaction)" } },
  ],
};

// ─── 8. Vitals ───
const vitals: SectionDef = {
  key: "vitals",
  paperNumber: 8,
  title: "Vitals",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "numeric", key: "temp", label: "Temp", unit: "°F", min: 90, max: 110, step: 0.1 },
    { kind: "text", key: "bp", label: "BP", placeholder: "120/80" },
    { kind: "numeric", key: "hr", label: "HR", unit: "bpm", min: 20, max: 250 },
    { kind: "numeric", key: "rr", label: "RR", unit: "/min", min: 4, max: 60 },
    { kind: "numeric", key: "o2_sat", label: "O2 Sat", unit: "%", min: 50, max: 100 },
    { kind: "numeric", key: "weight", label: "Weight", unit: "lb", min: 40, max: 900, step: 0.1 },
  ],
};

// ─── 9. Telehealth Physical Examination ───
const physicalExam: SectionDef = {
  key: "physical_exam",
  paperNumber: 9,
  title: "Telehealth Physical Examination (Objective)",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "chips", key: "general_appearance", label: "General appearance", options: c("Alert, cooperative, NAD", "Well-nourished/groomed", "Chronically ill-appearing", "Frail/weak") },
    { kind: "chips", key: "mental_status", label: "Mental status", options: c("A&O x3", "Baseline cognitive impairment", "Pleasant/cooperative", "Confused, redirectable") },
    { kind: "chips", key: "respiratory", label: "Respiratory", options: c("Even/unlabored", "No distress", "O2 in use"), detail: { key: "o2_lpm", label: "L/min", when: ["o2_in_use"] } },
    { kind: "chips", key: "cardiovascular", label: "Cardiovascular", options: c("Warm/well perfused", "No cyanosis", "B/L LE edema", "Stable perfusion") },
    { kind: "chips", key: "extremities", label: "Extremities", options: c("Generalized weakness", "Limited ROM", "Wheelchair/bedbound", "Offloading device in place", "Compression garments in place") },
    { kind: "chips", key: "skin_periwound", label: "Skin (periwound)", options: c("Periwound intact", "No additional breakdown", "Skin warm/dry except wound sites") },
  ],
};

// ─── 10. Wound Assessment (per wound) ───
export const WOUND_FIELDS: WoundFieldSpec = {
  fields: [
    { kind: "text", key: "location", label: "Location", placeholder: "e.g. Left heel, lateral" },
    { kind: "chips", key: "etiology", label: "Etiology", options: c("Pressure", "Venous", "Arterial", "Diabetic", "Surgical", "Trauma", "Other"), detail: { key: "etiology_other", label: "Other etiology", when: ["other"] } },
    { kind: "numeric", key: "length_cm", label: "Length", unit: "cm", min: 0, max: 100, step: 0.1 },
    { kind: "numeric", key: "width_cm", label: "Width", unit: "cm", min: 0, max: 100, step: 0.1 },
    { kind: "numeric", key: "depth_cm", label: "Depth", unit: "cm", min: 0, max: 30, step: 0.1 },
    { kind: "text", key: "undermining_tunneling", label: "Undermining / Tunneling", placeholder: "e.g. 1.5 cm at 3 o'clock" },
    { kind: "numeric", key: "bed_granulation_pct", label: "Wound bed — Granulation", unit: "%", min: 0, max: 100, step: 5 },
    { kind: "numeric", key: "bed_slough_pct", label: "Wound bed — Slough", unit: "%", min: 0, max: 100, step: 5 },
    { kind: "numeric", key: "bed_eschar_pct", label: "Wound bed — Eschar", unit: "%", min: 0, max: 100, step: 5 },
    { kind: "chips", key: "drainage_amount", label: "Drainage (amt)", options: c("None", "Scant", "Moderate", "Heavy"), single: true },
    { kind: "chips", key: "drainage_type", label: "Drainage (type)", options: c("Serous", "Serosanguineous", "Sanguineous", "Purulent") },
    { kind: "chips", key: "odor", label: "Odor", options: c("None", "Mild", "Foul"), single: true },
    { kind: "chips", key: "periwound", label: "Periwound condition", options: c("Intact", "Macerated", "Erythematous", "Indurated", "Callused", "Denuded"), detail: { key: "periwound_detail", label: "Detail" } },
    { kind: "chips", key: "infection_signs", label: "Signs of infection", options: c("None", "Erythema", "Warmth", "Purulence", "Malodor", "Increasing pain", "Edema") },
    { kind: "textarea", key: "treatment_applied", label: "Treatment applied this visit" },
  ],
};

const woundAssessment: SectionDef = {
  key: "wound_assessment",
  paperNumber: 10,
  title: "Wound Assessment",
  followUp: "full",
  kind: "wounds",
  fields: [], // per-wound fields come from WOUND_FIELDS; payload shape { wounds: [...] }
};

// ─── 11. Infection Surveillance ───
const infectionSurveillance: SectionDef = {
  key: "infection_surveillance",
  paperNumber: 11,
  title: "Infection Surveillance",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "chips", key: "findings", label: "Findings", options: c("Fever", "Chills", "Purulent drainage", "Cellulitis", "Increasing pain", "Malodor", "None noted") },
    { kind: "chips", key: "systemic_signs", label: "Systemic signs", options: c("None observed", "Clinically stable", "Concern for systemic infection") },
    { kind: "chips", key: "clinical_impression", label: "Clinical impression", options: c("No evidence of acute infection", "Stable, no signs of infection", "Findings concerning — plan adjusted"), single: true },
  ],
};

// ─── 12. Nutrition / Laboratory Assessment ───
const nutritionLab: SectionDef = {
  key: "nutrition_lab",
  paperNumber: 12,
  title: "Nutrition / Laboratory Assessment",
  followUp: "attestation",
  attestationLabel: "No new labs since last visit",
  kind: "standard",
  fields: [
    { kind: "numeric", key: "albumin", label: "Albumin", unit: "g/dL", min: 0, max: 10, step: 0.1 },
    { kind: "numeric", key: "prealbumin", label: "Prealbumin", unit: "mg/dL", min: 0, max: 60, step: 0.1 },
    { kind: "numeric", key: "hba1c", label: "HbA1c", unit: "%", min: 3, max: 20, step: 0.1 },
    { kind: "chips", key: "malnutrition_risk", label: "Malnutrition risk", options: c("None", "Mild", "Moderate", "High", "Diagnosed malnutrition"), single: true },
  ],
};

// ─── 13. Vascular / Diabetic Assessment ───
const vascularDiabetic: SectionDef = {
  key: "vascular_diabetic",
  paperNumber: 13,
  title: "Vascular / Diabetic Assessment",
  followUp: "attestation",
  attestationLabel: "No change since last visit",
  kind: "standard",
  fields: [
    { kind: "chips", key: "pad", label: "PAD", options: c("No known hx", "Hx contributing to impaired healing", "Clinical signs present", "Diminished perfusion") },
    { kind: "chips", key: "venous_disease", label: "Venous disease", options: c("No evidence", "Hx CVI", "Venous hypertension/edema", "Stasis changes present") },
    { kind: "chips", key: "neuropathy", label: "Neuropathy", options: c("Protective sensation intact", "Diabetic peripheral neuropathy", "Decreased/loss of protective sensation") },
    { kind: "chips", key: "edema", label: "Edema", options: c("None", "Mild", "Moderate pitting", "Severe", "Well controlled w/ compression") },
    { kind: "chips", key: "perfusion", label: "Perfusion", options: c("Adequate", "Delayed cap refill", "Diminished (vascular dz)", "Stable") },
    { kind: "chips", key: "diabetes_management", label: "Diabetes management", options: c("Adequately controlled", "Glucose mgmt reviewed", "Suboptimal, may impair healing", "Foot care reinforced") },
  ],
};

// ─── 14. Procedures Performed This Visit ───
const procedures: SectionDef = {
  key: "procedures",
  paperNumber: 14,
  title: "Procedures Performed This Visit",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "chips", key: "debridement", label: "Debridement", options: c("Performed", "Not performed"), single: true },
    { kind: "text", key: "debridement_type", label: "Type" },
    { kind: "text", key: "tissue_removed", label: "Tissue removed" },
    { kind: "text", key: "debridement_area", label: "Area" },
    { kind: "text", key: "ebl_tolerance", label: "EBL/Tolerance" },
    { kind: "chips", key: "graft", label: "Advanced wound therapy / Biologic graft", options: c("Performed", "N/A"), single: true },
    { kind: "text", key: "graft_product", label: "Product" },
    { kind: "text", key: "graft_lot", label: "Lot #" },
    { kind: "text", key: "graft_exp", label: "Exp" },
    { kind: "textarea", key: "other_procedures", label: "Other procedures" },
    { kind: "chips", key: "supervising_notified", label: "Supervising provider notified during visit", options: c("Yes", "Not applicable"), single: true },
  ],
};

// ─── 15. Assessment ───
const assessment: SectionDef = {
  key: "assessment",
  paperNumber: 15,
  title: "Assessment",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "chips", key: "healing_progress", label: "Healing progress", options: c("Gradual improvement", "Stable, no change", "Delayed (comorbidities)", "Progressing toward closure", "Partial improvement") },
    { kind: "chips", key: "response_to_treatment", label: "Response to treatment", options: c("Favorable", "Improved post-debridement", "Improved post-graft", "Limited — plan modified") },
    { kind: "chips", key: "clinical_complexity", label: "Clinical complexity", options: c("High", "Moderate", "Complex/multidisciplinary", "Chronic non-healing") },
    { kind: "chips", key: "medical_necessity", label: "Medical necessity", options: c("Continued advanced wound care", "Continued debridement", "Continued graft", "Continued DME", "None needed at this time") },
    { kind: "chips", key: "comorbidities", label: "Comorbidities", options: c("Diabetes", "PAD", "CKD/ESRD", "CHF", "Venous insufficiency", "Lymphedema", "Neuropathy", "Malnutrition", "Obesity", "Immunosuppression", "Limited mobility"), detail: { key: "comorbidities_other", label: "Other" } },
  ],
};

// ─── 16. Plan ───
const plan: SectionDef = {
  key: "plan",
  paperNumber: 16,
  title: "Plan",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "text", key: "next_follow_up", label: "Next follow-up" },
    { kind: "text", key: "frequency", label: "Frequency" },
    { kind: "chips", key: "facility_preventive", label: "Facility preventive measures", options: c("Air mattress", "Offload as tolerated", "Regular repositioning") },
    { kind: "chips", key: "dme_needs", label: "DME needs", options: c("Offloading device", "Pressure redistribution surface", "Compression garments", "Other"), detail: { key: "dme_other", label: "Other DME", when: ["other"] } },
    { kind: "textarea", key: "supplies_needed", label: "Supplies needed for next visit" },
    { kind: "textarea", key: "pmd_coordination", label: "PMD/specialist coordination" },
    { kind: "textarea", key: "interim_monitoring", label: "Interim monitoring instructions" },
  ],
};

// ─── 17. Patient / Caregiver Education Provided ───
const education: SectionDef = {
  key: "education",
  paperNumber: 17,
  title: "Patient / Caregiver Education Provided",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "chips", key: "topics", label: "Topics", options: c("Pressure redistribution", "Offloading", "Nutrition", "Hydration", "Blood sugar control", "Dressing changes", "S/S of infection", "Medication compliance", "Emergency precautions") },
    { kind: "chips", key: "understanding", label: "Understanding", options: c("Verbalized understanding", "Teach-back demonstrated", "Needs reinforcement") },
  ],
};

// ─── 18. Time Documentation ───
const timeDocumentation: SectionDef = {
  key: "time_documentation",
  paperNumber: 18,
  title: "Time Documentation",
  followUp: "full",
  kind: "standard",
  fields: [
    { kind: "numeric", key: "total_minutes", label: "Total time", unit: "min", min: 0, max: 600 },
    { kind: "chips", key: "time_included", label: "Time included", options: c("Review records", "Med review", "Evaluation", "Wound image review", "MDM", "Care coordination", "Caregiver counseling", "DME review", "Nutrition assessment", "Lab review", "Documentation") },
  ],
};

// ─── 19. Additional Notes (+ signature) ───
const additionalNotes: SectionDef = {
  key: "additional_notes",
  paperNumber: 19,
  title: "Additional Notes",
  followUp: "full",
  kind: "notes",
  fields: [{ kind: "textarea", key: "notes", label: "Additional notes" }],
};

// Paper section 1 (header: patient, DOB, date, nurse, time in/out,
// visit #) is not a form section — it renders from the visit/note row
// (room is a field_notes column; times come from Start visit / finalize).

export const SECTIONS: SectionDef[] = [
  hpi,
  intervalHistory,
  functionalStatus,
  nutritionHistory,
  ros,
  pmhMedsAllergies,
  vitals,
  physicalExam,
  woundAssessment,
  infectionSurveillance,
  nutritionLab,
  vascularDiabetic,
  procedures,
  assessment,
  plan,
  education,
  timeDocumentation,
  additionalNotes,
];

export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s])
);

export type NoteType = "initial_evaluation" | "follow_up";

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  initial_evaluation: "Initial Evaluation",
  follow_up: "Follow-up",
};

/** Sections applicable to a note (registry defaults + per-note added sections). */
export function applicableSections(noteType: NoteType, addedSections: string[] = []): SectionDef[] {
  if (noteType === "initial_evaluation") return SECTIONS;
  return SECTIONS.filter((s) => s.followUp !== "omitted" || addedSections.includes(s.key));
}

/** Sections a follow-up omits by default (offered in the "Add section" menu). */
export function omittedSections(noteType: NoteType, addedSections: string[] = []): SectionDef[] {
  if (noteType === "initial_evaluation") return [];
  return SECTIONS.filter((s) => s.followUp === "omitted" && !addedSections.includes(s.key));
}
