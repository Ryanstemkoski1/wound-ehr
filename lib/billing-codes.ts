// Common CPT codes for wound care
export const COMMON_CPT_CODES = [
  // Office/Outpatient Visits
  { code: "99202", description: "Office visit, new patient, 15-29 min" },
  { code: "99203", description: "Office visit, new patient, 30-44 min" },
  { code: "99204", description: "Office visit, new patient, 45-59 min" },
  { code: "99205", description: "Office visit, new patient, 60-74 min" },
  { code: "99211", description: "Office visit, established patient, minimal" },
  {
    code: "99212",
    description: "Office visit, established patient, 10-19 min",
  },
  {
    code: "99213",
    description: "Office visit, established patient, 20-29 min",
  },
  {
    code: "99214",
    description: "Office visit, established patient, 30-39 min",
  },
  {
    code: "99215",
    description: "Office visit, established patient, 40-54 min",
  },

  // Nursing Facility Services
  { code: "99304", description: "Nursing facility care, initial, 25 min" },
  { code: "99305", description: "Nursing facility care, initial, 35 min" },
  { code: "99306", description: "Nursing facility care, initial, 45 min" },
  { code: "99307", description: "Nursing facility care, subsequent, 10 min" },
  { code: "99308", description: "Nursing facility care, subsequent, 15 min" },
  { code: "99309", description: "Nursing facility care, subsequent, 25 min" },
  { code: "99310", description: "Nursing facility care, subsequent, 35 min" },

  // Wound Care - Debridement
  { code: "11042", description: "Debridement, skin and subcutaneous tissue" },
  { code: "11043", description: "Debridement, muscle and/or fascia" },
  { code: "11044", description: "Debridement, bone" },
  { code: "97597", description: "Debridement, open wound, ≤20 sq cm" },
  {
    code: "97598",
    description: "Debridement, open wound, each additional 20 sq cm",
  },
  { code: "97602", description: "Wound care, non-selective debridement" },

  // Application of Dressings
  { code: "97605", description: "Negative pressure wound therapy, ≤50 sq cm" },
  { code: "97606", description: "Negative pressure wound therapy, >50 sq cm" },
  {
    code: "97610",
    description: "Low frequency, non-contact, non-thermal ultrasound",
  },

  // Skin Substitutes/Grafts
  {
    code: "15271",
    description:
      "Application of skin substitute graft, trunk/arms/legs, ≤100 sq cm",
  },
  {
    code: "15272",
    description:
      "Application of skin substitute graft, each additional 100 sq cm",
  },
  {
    code: "15275",
    description:
      "Application of skin substitute graft, face/scalp/eyelids/mouth/neck/ears/orbits/genitalia/hands/feet, ≤100 sq cm",
  },

  // Photography
  {
    code: "96904",
    description: "Laser treatment for inflammatory skin disease",
  },
];

// Common ICD-10 codes for wound care
export const COMMON_ICD10_CODES = [
  // Pressure Ulcers - Sacral Region
  {
    code: "L89.150",
    description: "Pressure ulcer of sacral region, unstageable",
  },
  { code: "L89.151", description: "Pressure ulcer of sacral region, stage 1" },
  { code: "L89.152", description: "Pressure ulcer of sacral region, stage 2" },
  { code: "L89.153", description: "Pressure ulcer of sacral region, stage 3" },
  { code: "L89.154", description: "Pressure ulcer of sacral region, stage 4" },

  // Pressure Ulcers - Other Sites
  {
    code: "L89.000",
    description: "Pressure ulcer of unspecified elbow, unstageable",
  },
  {
    code: "L89.200",
    description: "Pressure ulcer of unspecified hip, unstageable",
  },
  {
    code: "L89.300",
    description: "Pressure ulcer of unspecified buttock, unstageable",
  },
  {
    code: "L89.600",
    description: "Pressure ulcer of unspecified heel, unstageable",
  },
  { code: "L89.890", description: "Pressure ulcer of other site, unstageable" },

  // Diabetic Ulcers
  { code: "E11.621", description: "Type 2 diabetes with foot ulcer" },
  { code: "E11.622", description: "Type 2 diabetes with other skin ulcer" },
  { code: "E10.621", description: "Type 1 diabetes with foot ulcer" },
  { code: "E10.622", description: "Type 1 diabetes with other skin ulcer" },

  // Venous Ulcers
  {
    code: "I83.001",
    description: "Varicose veins of right lower extremity with ulcer of thigh",
  },
  {
    code: "I83.011",
    description: "Varicose veins of right lower extremity with ulcer of calf",
  },
  {
    code: "I83.021",
    description: "Varicose veins of right lower extremity with ulcer of ankle",
  },
  {
    code: "I83.018",
    description:
      "Varicose veins of right lower extremity with ulcer of other part of foot",
  },
  { code: "I87.2", description: "Venous insufficiency (chronic) (peripheral)" },

  // Arterial Ulcers
  {
    code: "I70.25",
    description: "Atherosclerosis of native arteries of extremities",
  },
  { code: "I70.261", description: "Atherosclerosis with gangrene, right leg" },
  { code: "I70.262", description: "Atherosclerosis with gangrene, left leg" },

  // Non-healing Surgical Wounds
  {
    code: "T81.30XA",
    description: "Disruption of wound, unspecified, initial encounter",
  },
  {
    code: "T81.31XA",
    description:
      "Disruption of external operation wound, not elsewhere classified, initial",
  },
  {
    code: "T81.32XA",
    description:
      "Disruption of internal operation wound, not elsewhere classified, initial",
  },

  // Skin Infections
  { code: "L03.90", description: "Cellulitis, unspecified" },
  { code: "L03.116", description: "Cellulitis of right lower limb" },
  { code: "L03.115", description: "Cellulitis of left lower limb" },
  {
    code: "L08.9",
    description: "Local infection of skin and subcutaneous tissue, unspecified",
  },

  // Diabetes (Common Comorbidity)
  {
    code: "E11.9",
    description: "Type 2 diabetes mellitus without complications",
  },
  {
    code: "E10.9",
    description: "Type 1 diabetes mellitus without complications",
  },
  { code: "E11.65", description: "Type 2 diabetes with hyperglycemia" },

  // Peripheral Vascular Disease
  { code: "I73.9", description: "Peripheral vascular disease, unspecified" },
  {
    code: "I70.209",
    description:
      "Atherosclerosis of native arteries of extremities, unspecified",
  },

  // Malnutrition
  { code: "E46", description: "Unspecified protein-calorie malnutrition" },
  {
    code: "E43",
    description: "Unspecified severe protein-calorie malnutrition",
  },

  // Chronic Wounds
  {
    code: "L97.909",
    description:
      "Non-pressure chronic ulcer of unspecified part of unspecified lower leg",
  },
  {
    code: "L98.499",
    description: "Non-pressure chronic ulcer of skin, unspecified site",
  },
];

// Common billing modifiers
export const COMMON_MODIFIERS = [
  {
    code: "25",
    description: "Significant, separately identifiable E/M service",
  },
  { code: "59", description: "Distinct procedural service" },
  { code: "76", description: "Repeat procedure by same physician" },
  { code: "77", description: "Repeat procedure by another physician" },
  { code: "78", description: "Unplanned return to OR for related procedure" },
  {
    code: "79",
    description: "Unrelated procedure during postoperative period",
  },
  { code: "LT", description: "Left side" },
  { code: "RT", description: "Right side" },
  { code: "E1", description: "Upper left eyelid" },
  { code: "E2", description: "Lower left eyelid" },
  { code: "E3", description: "Upper right eyelid" },
  { code: "E4", description: "Lower right eyelid" },
  { code: "F1", description: "Left hand, second digit" },
  { code: "F2", description: "Left hand, third digit" },
  { code: "F3", description: "Left hand, fourth digit" },
  { code: "F4", description: "Left hand, fifth digit" },
  { code: "T1", description: "Left foot, second digit" },
  { code: "T2", description: "Left foot, third digit" },
  { code: "T3", description: "Left foot, fourth digit" },
  { code: "T4", description: "Left foot, fifth digit" },
];
