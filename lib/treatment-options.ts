/**
 * Treatment Order Builder — Constants & Types
 *
 * Phase 11.6: Provides all dropdown options, type definitions,
 * and sentence template builders for the 7-tab Treatment Order UI.
 *
 * Source: Client's "TREATMENT MENU TABS" document + Aprima Wound Form
 *         + Dr. May artifact (2026-05-29) — added Eschar, Graft Tx, Custom
 * Date: March 16, 2026
 * Updated: 2026-06-05 — Expanded from 4 tabs to 7 tabs per Dr. May's artifact.
 *          Renamed 'topical' -> 'open_wound' for clarity.
 */

// ============================================================================
// Tab Types
// ============================================================================

export type TreatmentTab =
  | "open_wound"
  | "eschar"
  | "compression_npwt"
  | "skin_moisture"
  | "rash_dermatitis"
  | "graft_tx"
  | "custom";

export const TREATMENT_TABS: {
  value: TreatmentTab;
  label: string;
  description: string;
}[] = [
  {
    value: "open_wound",
    label: "Open Wound",
    description: "Wound cleansing, topical applications, and dressings",
  },
  {
    value: "eschar",
    label: "Eschar",
    description: "Stable eschar management — paint betadine, keep dry, or other",
  },
  {
    value: "compression_npwt",
    label: "Compression / NPWT",
    description: "Compression therapy and negative pressure wound therapy",
  },
  {
    value: "skin_moisture",
    label: "Skin / Moisture",
    description: "MASD treatment orders — skin care and moisture barriers",
  },
  {
    value: "rash_dermatitis",
    label: "Rash / Dermatitis",
    description: "Topical creams and ointments for rash or dermatitis",
  },
  {
    value: "graft_tx",
    label: "Graft Tx",
    description: "Cellular tissue product / membrane application schedule",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Free-form custom order text",
  },
];

// ============================================================================
// TreatmentTab Label Map (for compact UI labels / pill text)
// ============================================================================

export const TREATMENT_TAB_LABELS: Record<TreatmentTab, string> = {
  open_wound: "Open Wound",
  eschar: "Eschar",
  compression_npwt: "Compression / NPWT",
  skin_moisture: "Skin / Moisture",
  rash_dermatitis: "Rash / Dermatitis",
  graft_tx: "Graft Tx",
  custom: "Custom",
};

/**
 * Backward-compat helper: legacy rows persisted activeTab='topical'.
 * Maps the legacy value to the new 'open_wound' key; otherwise returns
 * the input typed as TreatmentTab.
 */
export function migrateLegacyTab(s: string): TreatmentTab {
  if (s === "topical") return "open_wound";
  return s as TreatmentTab;
}

// ============================================================================
// Shared Option Types
// ============================================================================

export type TreatmentOption = {
  value: string;
  label: string;
  category?: string;
  hasTypeBox?: boolean;
  typeBoxLabel?: string;
};

// ============================================================================
// Shared: Frequency Options
// ============================================================================

export const FREQUENCY_OPTIONS: TreatmentOption[] = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "shift", label: "Every shift" },
];

// ============================================================================
// Tab 1: Open Wound / Topical Treatment Options
// ============================================================================

export const CLEANSING_ACTIONS: TreatmentOption[] = [
  { value: "cleanse", label: "Cleanse" },
  { value: "irrigate", label: "Irrigate" },
];

export const CLEANSERS: TreatmentOption[] = [
  { value: "saline", label: "Saline or Sterile Water" },
  { value: "wound_cleanser", label: "Wound Cleanser" },
  { value: "vashe", label: "Vashe" },
  { value: "dakins_quarter", label: "¼ Strength Dakin's" },
];

export const TOPICAL_TREATMENTS: TreatmentOption[] = [
  // Gauze
  { value: "saline_gauze", label: "Saline Gauze", category: "Gauze" },
  { value: "xeroform", label: "Xeroform", category: "Gauze" },
  {
    value: "plain_packing",
    label: "Plain Packing Tape",
    category: "Gauze",
    hasTypeBox: true,
    typeBoxLabel: "Length (in.)",
  },
  {
    value: "iodoform_packing",
    label: "Iodoform Packing Tape",
    category: "Gauze",
    hasTypeBox: true,
    typeBoxLabel: "Length (in.)",
  },
  {
    value: "dakins_gauze",
    label: "¼ Strength Dakin's Moistened Gauze",
    category: "Gauze",
  },

  // Gel
  { value: "wound_gel", label: "Wound Gel", category: "Gel" },
  { value: "wound_gel_ag", label: "Wound Gel with Ag", category: "Gel" },
  {
    value: "medical_honey_gel",
    label: "Medical Honey Gel",
    category: "Gel",
  },
  {
    value: "hydrogel_gauze",
    label: "Hydrogel Gauze",
    category: "Gel",
  },

  // Oil / Emulsion
  { value: "oil_emulsion", label: "Oil Emulsion", category: "Emulsion" },

  // Collagen
  {
    value: "collagen",
    label: "Collagen",
    category: "Collagen",
    hasTypeBox: true,
    typeBoxLabel: "Type",
  },
  {
    value: "collagen_ag",
    label: "Collagen Ag",
    category: "Collagen",
    hasTypeBox: true,
    typeBoxLabel: "Type",
  },

  // Alginate
  {
    value: "alginate",
    label: "Alginate",
    category: "Alginate",
    hasTypeBox: true,
    typeBoxLabel: "Type",
  },
  {
    value: "alginate_ag",
    label: "Alginate Ag",
    category: "Alginate",
    hasTypeBox: true,
    typeBoxLabel: "Type",
  },
  {
    value: "medical_honey_alginate",
    label: "Medical Honey Alginate",
    category: "Alginate",
  },

  // Fiber
  { value: "hydrofiber", label: "Hydrofiber", category: "Fiber" },
  { value: "hydrofiber_ag", label: "Hydrofiber Ag", category: "Fiber" },
  {
    value: "humbifiber",
    label: "Humbifiber (Adaptive Dressing)",
    category: "Fiber",
  },

  // Enzymatic
  { value: "santyl", label: "Santyl (Collagenase)", category: "Enzymatic" },

  // Antimicrobial
  {
    value: "silver_sulfadiazine",
    label: "Silver Sulfadiazine (SSD) Cream",
    category: "Antimicrobial",
  },
  {
    value: "cadexomer_iodine",
    label: "Cadexomer Iodine",
    category: "Antimicrobial",
  },
  {
    value: "hydrofera_blue",
    label: "Hydrofera Blue",
    category: "Antimicrobial",
  },
  {
    value: "phmb",
    label: "Polyhexamethylene Biguanide (PHMB)",
    category: "Antimicrobial",
    hasTypeBox: true,
    typeBoxLabel: "Type",
  },

  // Other
  {
    value: "zinc_oxide_cream",
    label: "Zinc Oxide Cream",
    category: "Other",
  },
  {
    value: "specialized_foam",
    label: "Specialized Foam",
    category: "Foam",
    hasTypeBox: true,
    typeBoxLabel: "Type",
  },
  {
    value: "other",
    label: "Other",
    category: "Other",
    hasTypeBox: true,
    typeBoxLabel: "Specify",
  },
];

export const APPLICATION_METHODS: TreatmentOption[] = [
  { value: "loosely_apply", label: "Loosely apply" },
  { value: "pack_wound", label: "Pack wound bed with" },
  { value: "apply_thin_layer", label: "Apply thin layer of" },
  { value: "fill_wound", label: "Fill wound bed with" },
  { value: "place_over", label: "Place over wound" },
];

export const TOPICAL_COVERAGE: TreatmentOption[] = [
  { value: "dry_clean_dressing", label: "Cover with dry clean dressing" },
  { value: "dry_abd_gauze", label: "Cover with dry ABD and gauze" },
  {
    value: "superabsorbant",
    label: "Cover with superabsorbant dressing",
  },
  { value: "open_air", label: "Leave open to air" },
];

// ============================================================================
// Tab 2: Compression / NPWT Options
// ============================================================================

export type CompressionType =
  | "compression_therapy"
  | "unna_boot"
  | "layered_compression"
  | "npwt";

export const COMPRESSION_TYPE_OPTIONS: {
  value: CompressionType;
  label: string;
  description: string;
}[] = [
  {
    value: "compression_therapy",
    label: "Compression Therapy",
    description:
      "On every AM, off at HS. Remove and reapply if complaint of discomfort. Specify treatment to wound bed.",
  },
  {
    value: "unna_boot",
    label: "UNNA Boot Application",
    description:
      "Cleanse the wound and periwound with normal saline or sterile water and pat dry. Apply from 1 inch above the toes to 1 inch below the knee in an upward direction. Monitor daily.",
  },
  {
    value: "layered_compression",
    label: "Layered Compression Dressing Application",
    description:
      "Cleanse the wound and periwound with normal saline or sterile water and pat dry. Apply from 1 inch above the toes to 1 inch below the knee in an upward direction. Monitor daily.",
  },
  {
    value: "npwt",
    label: "Negative Pressure Wound Therapy",
    description:
      "Cleanse the wound and periwound with normal saline or sterile water and pat dry.",
  },
];

export const COMPRESSION_ITEMS: TreatmentOption[] = [
  { value: "ace_wraps", label: "ACE Wraps" },
  { value: "ted_hose", label: "TED Hose" },
  { value: "tubi_grips", label: "Tubi-Grips" },
];

export const NPWT_PRESSURE_OPTIONS: TreatmentOption[] = [
  { value: "75", label: "75 mmHg" },
  { value: "100", label: "100 mmHg" },
  { value: "125", label: "125 mmHg" },
  { value: "150", label: "150 mmHg" },
  { value: "175", label: "175 mmHg" },
];

export const NPWT_SCHEDULE_OPTIONS: TreatmentOption[] = [
  { value: "mwf", label: "M-W-F" },
  { value: "tts", label: "Tu-Th-Sat" },
  { value: "other", label: "Other" },
];

// ============================================================================
// Tab 3: Skin / Moisture Options
// ============================================================================

export const SKIN_CLEANSERS: TreatmentOption[] = [
  { value: "saline", label: "Saline or Sterile Water" },
  { value: "wound_cleanser", label: "Wound Cleanser" },
  { value: "vashe", label: "Vashe" },
  { value: "dakins_quarter", label: "¼ Strength Dakin's" },
];

export const MOISTURE_TREATMENTS: TreatmentOption[] = [
  {
    value: "zinc_barrier_cream",
    label: "Zinc Barrier Cream 20% or Greater",
    category: "Barrier",
  },
  {
    value: "skin_barrier_cream",
    label: "Skin Barrier Cream / Ointment",
    category: "Barrier",
    hasTypeBox: true,
    typeBoxLabel: "Brand/Type",
  },
  {
    value: "zinc_antifungal",
    label: "Zinc Ointment / Cream with Antifungal",
    category: "Antifungal",
    hasTypeBox: true,
    typeBoxLabel: "Brand/Type",
  },
  {
    value: "antifungal_powder",
    label: "Antifungal Powder",
    category: "Antifungal",
    hasTypeBox: true,
    typeBoxLabel: "Brand/Type",
  },
  {
    value: "barrier_wipe_spray",
    label: "Barrier Wipe / Spray",
    category: "Barrier",
    hasTypeBox: true,
    typeBoxLabel: "Brand/Type",
  },
  {
    value: "hydrocolloid",
    label: "Hydrocolloid",
    category: "Dressing",
  },
  {
    value: "adhesive_film",
    label: "Adhesive Film",
    category: "Dressing",
  },
  {
    value: "other",
    label: "Other",
    category: "Other",
    hasTypeBox: true,
    typeBoxLabel: "Specify",
  },
];

// ============================================================================
// Tab 4: Rash / Dermatitis Options
// ============================================================================

export const RASH_TREATMENTS: TreatmentOption[] = [
  { value: "ad_ointment", label: "A+D Ointment" },
  { value: "clotrimazole", label: "Clotrimazole 1% Cream" },
  { value: "miconazole_powder", label: "Miconazole 1% Powder" },
  { value: "nystatin_powder", label: "Nystatin Powder" },
  { value: "ammonium_lactate", label: "Ammonium Lactate 12% Lotion" },
  { value: "hydrocortisone", label: "Hydrocortisone 1% Cream" },
  { value: "triamcinolone", label: "Triamcinolone 0.1% Cream" },
  { value: "clobetasol", label: "Clobetasol 0.05% Cream" },
  {
    value: "other",
    label: "Other",
    hasTypeBox: true,
    typeBoxLabel: "Specify",
  },
];

export const RASH_COVERAGE: TreatmentOption[] = [
  { value: "open_air", label: "Leave open to air" },
  { value: "dry_clean_dressing", label: "Cover with dry clean dressing" },
  { value: "abd_rolled_gauze", label: "Cover with ABD and rolled gauze" },
];

export const RASH_FREQUENCY: TreatmentOption[] = [
  { value: "1", label: "1 day" },
  { value: "shift", label: "Every shift" },
];

// ============================================================================
// Treatment Order Form State Type
// ============================================================================

export type TreatmentOrderData = {
  activeTab: TreatmentTab;
  specialInstructions: string;

  // Tab 1: Open Wound / Topical Treatment
  // (renamed from 'topical' -> 'openWound' to mirror tab key)
  openWound: {
    cleansingAction: string;
    cleanser: string;
    applicationMethod: string;
    primaryTreatment: string;
    primaryTreatmentType: string;
    secondaryTreatment: string;
    secondaryTreatmentType: string;
    coverage: string;
    frequency: string;
    prn: boolean;
  };

  // Tab 2: Eschar (Dr. May artifact 2026-05-29)
  eschar: {
    selectedOption?: "paint_betadine" | "keep_dry" | "other";
    paintBetadineCover?: "air" | "dry_dressing";
    otherText?: string;
  };

  // Tab 3: Compression / NPWT
  compressionNpwt: {
    selectedType: string;
    compressionItems: string[];
    dressingByProvider: boolean;
    npwtPressure: string;
    npwtSchedule: string;
    npwtScheduleOther: string;
    frequency: string;
    prn: boolean;
  };

  // Tab 4: Skin / Moisture
  skinMoisture: {
    cleanser: string;
    treatment: string;
    treatmentType: string;
    frequency: string;
    prn: boolean;
  };

  // Tab 5: Rash / Dermatitis
  rashDermatitis: {
    treatment: string;
    treatmentOther: string;
    coverage: string;
    hasSecondaryDressing: boolean;
    secondaryDressing: string;
    hasTertiaryDressing: boolean;
    tertiaryDressing: string;
    frequency: string;
    prn: boolean;
  };

  // Tab 6: Graft Tx (Dr. May artifact 2026-05-29)
  graftTx: {
    frequency?: "weekly" | "biweekly" | "as_indicated";
    dressingChangeInterval?: "7_days" | "custom";
    customInterval?: string;
    ifSoiledDislodged?: "remove_secondary" | "cleanse_apply";
    ifSoiledDressing?: string;
  };

  // Tab 7: Custom (Dr. May artifact 2026-05-29) — free-form text
  custom: {
    orderText?: string;
  };
};

export const EMPTY_TREATMENT_ORDER: TreatmentOrderData = {
  activeTab: "open_wound",
  specialInstructions: "",
  openWound: {
    cleansingAction: "cleanse",
    cleanser: "saline",
    applicationMethod: "loosely_apply",
    primaryTreatment: "",
    primaryTreatmentType: "",
    secondaryTreatment: "",
    secondaryTreatmentType: "",
    coverage: "dry_clean_dressing",
    frequency: "1",
    prn: true,
  },
  eschar: {
    selectedOption: undefined,
    paintBetadineCover: undefined,
    otherText: "",
  },
  compressionNpwt: {
    selectedType: "",
    compressionItems: [],
    dressingByProvider: false,
    npwtPressure: "125",
    npwtSchedule: "mwf",
    npwtScheduleOther: "",
    frequency: "3",
    prn: true,
  },
  skinMoisture: {
    cleanser: "saline",
    treatment: "",
    treatmentType: "",
    frequency: "1",
    prn: true,
  },
  rashDermatitis: {
    treatment: "",
    treatmentOther: "",
    coverage: "open_air",
    hasSecondaryDressing: false,
    secondaryDressing: "",
    hasTertiaryDressing: false,
    tertiaryDressing: "",
    frequency: "1",
    prn: true,
  },
  graftTx: {
    frequency: undefined,
    dressingChangeInterval: undefined,
    customInterval: "",
    ifSoiledDislodged: undefined,
    ifSoiledDressing: "",
  },
  custom: {
    orderText: "",
  },
};

// ============================================================================
// Sentence Builders
// ============================================================================

function getLabel(
  options: TreatmentOption[] | { value: string; label: string }[],
  value: string
): string {
  const opt = options.find((o) => o.value === value);
  return opt?.label || value;
}

function formatFrequency(frequency: string, prn: boolean): string {
  const prnText = prn ? " and PRN" : "";
  if (frequency === "shift") return `every shift${prnText}`;
  const days = parseInt(frequency);
  if (days === 1) return `every day${prnText}`;
  return `every ${days} days${prnText}`;
}

/**
 * Tab 1: Generate open wound / topical treatment order sentence
 *
 * ORDER FORMAT (from client):
 * [Cleanse/Irrigate] wound w/ [cleanser] and pat dry and then loosely apply
 * __TREATMENT__ to wound bed and [coverage] every [frequency] and prn.
 */
export function buildTopicalOrder(
  data: TreatmentOrderData["openWound"]
): string {
  if (!data.primaryTreatment) return "";

  const action = getLabel(CLEANSING_ACTIONS, data.cleansingAction);
  const cleanser = getLabel(CLEANSERS, data.cleanser);
  const method = getLabel(APPLICATION_METHODS, data.applicationMethod);
  const treatment = getLabel(TOPICAL_TREATMENTS, data.primaryTreatment);
  const treatmentText = data.primaryTreatmentType
    ? `${treatment} (${data.primaryTreatmentType})`
    : treatment;
  const coverage = getLabel(TOPICAL_COVERAGE, data.coverage);
  const freq = formatFrequency(data.frequency, data.prn);

  let order = `${action} wound with ${cleanser} and pat dry and then ${method.toLowerCase()} ${treatmentText} to wound bed and ${coverage.toLowerCase()} ${freq}.`;

  if (data.secondaryTreatment) {
    const secondary = getLabel(TOPICAL_TREATMENTS, data.secondaryTreatment);
    const secondaryText = data.secondaryTreatmentType
      ? `${secondary} (${data.secondaryTreatmentType})`
      : secondary;
    order += ` Then apply ${secondaryText} to wound bed.`;
  }

  return order;
}

/**
 * Tab 2: Generate compression / NPWT order sentence
 *
 * ORDER FORMAT (from client): 'As is' — the description IS the order.
 */
export function buildCompressionOrder(
  data: TreatmentOrderData["compressionNpwt"]
): string {
  if (!data.selectedType) return "";

  const option = COMPRESSION_TYPE_OPTIONS.find(
    (o) => o.value === data.selectedType
  );
  if (!option) return "";

  let order = "";

  switch (data.selectedType) {
    case "compression_therapy": {
      const items = data.compressionItems
        .map((item) => getLabel(COMPRESSION_ITEMS, item))
        .join(", ");
      order = `Apply ${items || "compression therapy"} on every AM, off at HS. Remove and reapply if complaint of discomfort.`;
      break;
    }
    case "unna_boot":
    case "layered_compression": {
      const type =
        data.selectedType === "unna_boot"
          ? "UNNA boot"
          : "layered compression dressing";
      const freq = formatFrequency(data.frequency, data.prn);
      order = `Cleanse the wound and periwound with normal saline or sterile water and pat dry. Apply ${type} from 1 inch above the toes to 1 inch below the knee in an upward direction. ${freq}. Monitor daily.`;
      if (data.dressingByProvider) {
        order += " Dressing applied by the provider.";
      }
      break;
    }
    case "npwt": {
      const pressure = data.npwtPressure || "125";
      let schedule = getLabel(NPWT_SCHEDULE_OPTIONS, data.npwtSchedule);
      if (data.npwtSchedule === "other" && data.npwtScheduleOther) {
        schedule = data.npwtScheduleOther;
      }
      order = `Cleanse the wound and periwound with normal saline or sterile water and pat dry. Apply negative pressure wound therapy at ${pressure} mmHg continuous suction every ${schedule}.`;
      if (data.dressingByProvider) {
        order += " Dressing applied by the provider.";
      }
      break;
    }
  }

  return order;
}

/**
 * Tab 3: Generate skin / moisture (MASD) order sentence
 *
 * ORDER FORMAT (from client):
 * Cleanse wound LOCATION with [cleanser] and pat dry and apply [ORDER]
 * every [frequency] and prn.
 */
export function buildSkinMoistureOrder(
  data: TreatmentOrderData["skinMoisture"]
): string {
  if (!data.treatment) return "";

  const cleanser = getLabel(SKIN_CLEANSERS, data.cleanser);
  const treatment = getLabel(MOISTURE_TREATMENTS, data.treatment);
  const treatmentText = data.treatmentType
    ? `${treatment} (${data.treatmentType})`
    : treatment;
  const freq = formatFrequency(data.frequency, data.prn);

  let note = "";
  if (data.treatment === "hydrocolloid") {
    note =
      " Follow manufacturer's recommendations. Change as indicated and PRN.";
  } else if (data.treatment === "adhesive_film") {
    note =
      " Follow manufacturer's recommendations. Change as indicated and PRN.";
  }

  return `Cleanse wound with ${cleanser} and pat dry and apply ${treatmentText} to wound bed ${freq}.${note}`;
}

/**
 * Tab 4: Generate rash / dermatitis order sentence
 *
 * ORDER FORMAT (from client):
 * To clean dry skin in the LOCATION of involvement, apply __TREATMENT__
 * to wound bed and [coverage] every [frequency] and PRN.
 */
export function buildRashOrder(
  data: TreatmentOrderData["rashDermatitis"]
): string {
  if (!data.treatment) return "";

  const treatment = getLabel(RASH_TREATMENTS, data.treatment);
  const treatmentText =
    data.treatment === "other" && data.treatmentOther
      ? data.treatmentOther
      : treatment;
  const coverage = getLabel(RASH_COVERAGE, data.coverage);
  const freq = formatFrequency(data.frequency, data.prn);

  let order = `To clean dry skin in the area of involvement, apply ${treatmentText} to wound bed and ${coverage.toLowerCase()} ${freq}.`;

  if (data.hasSecondaryDressing && data.secondaryDressing) {
    const secondary = getLabel(RASH_TREATMENTS, data.secondaryDressing);
    order += ` Then overlay with ${secondary} to wound bed and leave open to air.`;
  }

  if (data.hasTertiaryDressing && data.tertiaryDressing) {
    const tertiary = getLabel(RASH_TREATMENTS, data.tertiaryDressing);
    order += ` Then overlay with ${tertiary} to wound bed and leave open to air.`;
  }

  return order;
}

/**
 * Tab 2: Generate eschar order sentence
 *
 * Source: Dr. May artifact (2026-05-29) — Eschar management options.
 *
 * Selected option behavior:
 *   - paint_betadine: "Paint wound bed with betadine, allow to air dry and
 *     [leave open to air | cover with dry clean dressing] daily and PRN."
 *   - keep_dry:       "Keep eschar clean, dry, and intact. Monitor for signs
 *                      of infection or instability daily and PRN."
 *   - other:          The free-form otherText, as entered.
 */
export function buildEscharOrder(data: TreatmentOrderData["eschar"]): string {
  if (!data.selectedOption) return "";

  switch (data.selectedOption) {
    case "paint_betadine": {
      const cover =
        data.paintBetadineCover === "dry_dressing"
          ? "cover with dry clean dressing"
          : "leave open to air";
      return `Paint wound bed with betadine, allow to air dry and ${cover} daily and PRN.`;
    }
    case "keep_dry":
      return "Keep eschar clean, dry, and intact. Monitor for signs of infection or instability daily and PRN.";
    case "other":
      return (data.otherText || "").trim();
    default:
      return "";
  }
}

/**
 * Tab 6: Generate graft / cellular tissue product order sentence
 *
 * Source: Dr. May artifact (2026-05-29) — CTP / membrane application.
 *
 * ORDER FORMAT:
 * "Wound evaluation, prep and membrane application by MD
 *  [weekly | every 2 weeks | as indicated] to facilitate wound healing.
 *  Change dressing in [7 days | custom interval].
 *  If dressing becomes soiled or dislodged,
 *   - [remove secondary dressing and notify provider]
 *   - [cleanse with normal saline and apply <ifSoiledDressing>]."
 */
export function buildGraftTxOrder(
  data: TreatmentOrderData["graftTx"]
): string {
  const freqText =
    data.frequency === "biweekly"
      ? "every 2 weeks"
      : data.frequency === "as_indicated"
        ? "as indicated"
        : data.frequency === "weekly"
          ? "weekly"
          : "";

  if (!freqText) return "";

  let order = `Wound evaluation, prep and membrane application by MD ${freqText} to facilitate wound healing.`;

  const interval =
    data.dressingChangeInterval === "custom"
      ? (data.customInterval || "").trim()
      : data.dressingChangeInterval === "7_days"
        ? "7 days"
        : "";
  if (interval) {
    order += ` Change dressing in ${interval}.`;
  }

  if (data.ifSoiledDislodged === "remove_secondary") {
    order +=
      " If dressing becomes soiled or dislodged, remove secondary dressing and notify provider.";
  } else if (data.ifSoiledDislodged === "cleanse_apply") {
    const dressing = (data.ifSoiledDressing || "").trim();
    order += ` If dressing becomes soiled or dislodged, cleanse with normal saline and apply ${dressing || "secondary dressing"}.`;
  }

  return order;
}

/**
 * Tab 7: Generate custom order sentence
 *
 * Source: Dr. May artifact (2026-05-29) — free-form order text for
 * cases not covered by the structured tabs. Returned as-is (trimmed).
 */
export function buildCustomOrder(data: TreatmentOrderData["custom"]): string {
  return (data.orderText || "").trim();
}

/**
 * Generate the order text for whatever tab is currently active
 */
export function buildOrderText(data: TreatmentOrderData): string {
  switch (data.activeTab) {
    case "open_wound":
      return buildTopicalOrder(data.openWound);
    case "eschar":
      return buildEscharOrder(data.eschar);
    case "compression_npwt":
      return buildCompressionOrder(data.compressionNpwt);
    case "skin_moisture":
      return buildSkinMoistureOrder(data.skinMoisture);
    case "rash_dermatitis":
      return buildRashOrder(data.rashDermatitis);
    case "graft_tx":
      return buildGraftTxOrder(data.graftTx);
    case "custom":
      return buildCustomOrder(data.custom);
    default:
      return "";
  }
}
