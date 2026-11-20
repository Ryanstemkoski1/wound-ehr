import { describe, expect, it } from "vitest";
import {
  isPositive,
  renderPositiveBullets,
  renderPositiveProcedurePayload,
  renderPositives,
  type PositiveAssessment,
} from "@/lib/pdf-positives";

const ZERO_COUNTS = { renderPositiveNumber: true };

describe("isPositive", () => {
  it.each<[string, unknown[]]>([
    ["missing values and blank strings", [null, undefined, "", "  \t\n"]],
    [
      "negative tokens, ignoring case and padding",
      ["  None ", "NO", "Absent", "N/A"],
    ],
    [
      "zero, non-finite numbers and false",
      [0, Number.NaN, Number.POSITIVE_INFINITY, false],
    ],
    [
      "empty or all-negative arrays and objects",
      [[], [null, "none", "", 0], {}, { odor: "no", drainage: null, pain: 0 }],
    ],
    ["non-JSON values", [() => "x", Symbol("x")]],
  ])("treats %s as not a finding", (_name, values) => {
    for (const value of values) expect(isPositive(value)).toBe(false);
  });

  it.each<[string, unknown[]]>([
    [
      "text, even when it starts with a negative word",
      ["odor", "no change", "none noted"],
    ],
    ["non-zero numbers", [-1, 0.5, 10]],
    ["true", [true]],
    [
      "composites with at least one positive leaf",
      [["none", "odor"], { bed: { slough: 10 } }],
    ],
  ])("treats %s as a finding", (_name, values) => {
    for (const value of values) expect(isPositive(value)).toBe(true);
  });

  it("counts zero only when renderPositiveNumber is enabled, including inside composites", () => {
    expect(isPositive(0, ZERO_COUNTS)).toBe(true);
    expect(isPositive([0], ZERO_COUNTS)).toBe(true);
    expect(isPositive({ sheets: 0 }, ZERO_COUNTS)).toBe(true);
    expect(isPositive(Number.NaN, ZERO_COUNTS)).toBe(false);
    expect(isPositive([0])).toBe(false);
  });
});

describe("renderPositives", () => {
  it("keeps positive fields in record order and drops negatives", () => {
    expect(
      renderPositives(
        {
          wound_type: "Pressure injury",
          tunneling: "none",
          undermining: false,
          pain_level: 0,
          notes: "   ",
          exudate: " Moderate ",
        },
        { wound_type: "Wound type" }
      )
    ).toEqual([
      { label: "Wound type", value: "Pressure injury" },
      { label: "Exudate", value: "Moderate" },
    ]);
  });

  it("humanises snake_case, camelCase and kebab-case keys without a label map", () => {
    expect(
      renderPositives({
        granulation_percent: 40,
        exudateType: "serous",
        "peri-wound": "macerated",
      })
    ).toEqual([
      { label: "Granulation Percent", value: "40" },
      { label: "Exudate Type", value: "serous" },
      { label: "Peri Wound", value: "macerated" },
    ]);
  });

  it("formats booleans, arrays and nested objects using only their positive parts", () => {
    expect(
      renderPositives({
        offloading: true,
        infection_signs: ["odor", "none", " warmth ", null],
        size: { lengthCm: 2, widthCm: 1.5, depthCm: 0, note: "n/a" },
      })
    ).toEqual([
      { label: "Offloading", value: "Yes" },
      { label: "Infection Signs", value: "odor, warmth" },
      { label: "Size", value: "Length Cm: 2; Width Cm: 1.5" },
    ]);
  });

  it("prints zero counts only when renderPositiveNumber is enabled", () => {
    expect(renderPositives({ sheets_used: 0 })).toEqual([]);
    expect(renderPositives({ sheets_used: 0 }, undefined, ZERO_COUNTS)).toEqual(
      [{ label: "Sheets Used", value: "0" }]
    );
  });

  it("returns nothing for a missing record", () => {
    expect(renderPositives(null as unknown as Record<string, unknown>)).toEqual(
      []
    );
  });
});

describe("renderPositiveBullets", () => {
  const full: PositiveAssessment = {
    woundType: "Venous ulcer",
    length: 3.2,
    width: 2,
    depth: 0.4,
    painLevel: 4,
    infectionSigns: ["Odor", "Erythema"],
    exudateAmount: "Moderate",
    exudateType: "Serous",
    periwoundCondition: "Macerated",
    granulationPercent: 60,
    sloughPercent: 30,
    epithelialPercent: 10,
    healingStatus: "Improving",
  };

  it("renders a complete assessment in the leave-behind order", () => {
    expect(renderPositiveBullets(full)).toEqual([
      "Wound type: Venous ulcer",
      "Size: 3.2 × 2 × 0.4 cm",
      "Granulation: 60%",
      "Slough: 30%",
      "Epithelial: 10%",
      "Exudate amount: Moderate",
      "Exudate type: Serous",
      "Periwound: Macerated",
      "Signs of infection: Odor, Erythema",
      "Pain level: 4/10",
      "Healing status: Improving",
    ]);
  });

  it("renders nothing for an empty or missing assessment", () => {
    expect(renderPositiveBullets({})).toEqual([]);
    expect(
      renderPositiveBullets(null as unknown as PositiveAssessment)
    ).toEqual([]);
  });

  it("coalesces only the known dimensions into the size bullet", () => {
    expect(renderPositiveBullets({ length: 2, width: 1, depth: 0 })).toEqual([
      "Size: 2 × 1 cm",
    ]);
    expect(renderPositiveBullets({ length: null, width: 1.5 })).toEqual([
      "Size: 1.5 cm",
    ]);
  });

  it("omits pain level 0 by default but prints it when zero is a finding", () => {
    expect(renderPositiveBullets({ painLevel: 0 })).toEqual([]);
    expect(renderPositiveBullets({ painLevel: 0 }, ZERO_COUNTS)).toEqual([
      "Pain level: 0/10",
    ]);
  });

  it("drops negative infection-sign chips and trims the rest", () => {
    expect(
      renderPositiveBullets({ infectionSigns: ["  odor ", "None", ""] })
    ).toEqual(["Signs of infection: odor"]);
    expect(renderPositiveBullets({ infectionSigns: ["none"] })).toEqual([]);
  });

  it("drops explicitly negative text findings and 0% wound-bed components", () => {
    expect(
      renderPositiveBullets({
        exudateAmount: "None",
        periwoundCondition: "n/a",
        healingStatus: "",
        granulationPercent: 100,
        sloughPercent: 0,
        epithelialPercent: 0,
      })
    ).toEqual(["Granulation: 100%"]);
  });
});

describe("renderPositiveProcedurePayload", () => {
  it("returns nothing for a missing payload", () => {
    expect(
      renderPositiveProcedurePayload(
        "sharp_debridement",
        null as unknown as Record<string, unknown>
      )
    ).toEqual([]);
  });

  it("falls back to a generic label/value walk for unknown procedure types", () => {
    expect(
      renderPositiveProcedurePayload("laser_therapy", {
        session_count: 3,
        complications: "none",
        settings: { power_w: 2 },
      })
    ).toEqual(["Session Count: 3", "Settings: Power W: 2"]);
  });

  it("renders nothing for an empty payload of any known procedure type", () => {
    for (const type of [
      "sharp_debridement",
      "biologic_graft",
      "arobella",
      "feeding_tube_change",
      "urinary_catheter_replacement",
    ]) {
      expect(renderPositiveProcedurePayload(type, {})).toEqual([]);
    }
  });

  describe("sharp_debridement", () => {
    it("renders only the positive parts of a documented debridement", () => {
      expect(
        renderPositiveProcedurePayload("sharp_debridement", {
          size: {
            lengthCm: "4.5",
            widthCm: 3,
            depthCm: 0,
            undermining: true,
            tunneling: false,
          },
          woundBed: { granulationPct: 50, sloughPct: "40", fibroticPct: 0 },
          procedure: {
            instruments: ["Curette", "none"],
            instrumentsOther: " Forceps ",
            tissueRemoved: ["Slough", ""],
            bleeding: "Minimal",
            tolerance: "none",
            notes: "  ",
          },
          visibleStructures: ["none"],
          woundEdges: ["Rolled"],
          periwound: ["Erythema", "Absent"],
          pain: { level: 0, description: "Aching" },
        })
      ).toEqual([
        "Size: 4.5 × 3 cm",
        "Undermining present",
        "Granulation: 50%",
        "Slough: 40%",
        "Instruments used: Curette, Forceps",
        "Tissue removed: Slough",
        "Bleeding: Minimal",
        "Wound edges: Rolled",
        "Periwound: Erythema",
        "Pain description: Aching",
      ]);
    });

    it("ignores malformed nested sections and non-numeric measurements", () => {
      expect(
        renderPositiveProcedurePayload("sharp_debridement", {
          size: "4x3",
          woundBed: { granulationPct: "lots", sloughPct: "" },
          procedure: { instruments: "Curette", tissueRemoved: [7, "Eschar"] },
          pain: { level: "7" },
        })
      ).toEqual(["Tissue removed: Eschar", "Pain level: 7/10"]);
    });
  });

  describe("biologic_graft", () => {
    it("renders measurements, trends, labs, sheets and notes", () => {
      expect(
        renderPositiveProcedurePayload("biologic_graft", {
          application: { type: "Follow-up", productName: "Membrane X" },
          indications: {
            initial: {
              date: "2026-01-05",
              lengthCm: 5,
              widthCm: 4,
              depthCm: 0.5,
            },
            current: { date: "", lengthCm: 3, widthCm: 2, depthCm: null },
            trend: {
              surfaceArea: "decreased",
              surfaceAreaBy: 14,
              depth: null,
              depthBy: null,
            },
          },
          labs: { hba1c: "7.2", albumin: 3.1, prealbumin: 0 },
          sheets: {
            preset: { "1x1": 0, "2x2": 2, "4x4": null, "2x3": "1" },
            customLengthCm: null,
            customWidthCm: null,
            customCount: null,
          },
          additionalNotes: "Tolerated well.",
        })
      ).toEqual([
        "Application type: Follow-up",
        "Product: Membrane X",
        "Initial measurement: 5 × 4 × 0.5 cm on 2026-01-05",
        "Current measurement: 3 × 2 cm",
        "Surface area has decreased by 14",
        "HbA1c: 7.2%",
        "Albumin: 3.1 g/dL",
        "Sheets used: 2x2 cm × 2, 2x3 cm × 1",
        "Notes: Tolerated well.",
      ]);
    });

    it("prints a measurement date on its own and a trend amount without a direction", () => {
      expect(
        renderPositiveProcedurePayload("biologic_graft", {
          indications: {
            initial: { date: "2026-02-01" },
            trend: { depth: "", depthBy: 0.3 },
          },
        })
      ).toEqual([
        "Initial measurement: on 2026-02-01",
        "Depth has changed by 0.3",
      ]);
    });

    it("describes custom sheets with whichever dimensions and count are known", () => {
      const custom = (sheets: Record<string, unknown>) =>
        renderPositiveProcedurePayload("biologic_graft", { sheets });

      expect(
        custom({ customLengthCm: 2, customWidthCm: 3, customCount: 2 })
      ).toEqual(["Custom sheets: 2 × 3 cm × 2"]);
      expect(
        custom({ customLengthCm: 2, customWidthCm: 0, customCount: null })
      ).toEqual(["Custom sheets: 2 cm"]);
      expect(custom({ customWidthCm: 3 })).toEqual(["Custom sheets: 3 cm"]);
      expect(custom({ customCount: 4 })).toEqual([
        "Custom sheets: custom size × 4",
      ]);
    });

    it("never prints zero sheet counts", () => {
      expect(
        renderPositiveProcedurePayload("biologic_graft", {
          sheets: { preset: { "1x1": 0, "2x2": "0" }, customCount: 0 },
        })
      ).toEqual([]);
    });
  });

  describe("arobella", () => {
    it("renders location, duration, wound details, visit details and responses", () => {
      expect(
        renderPositiveProcedurePayload("arobella", {
          location: "Left heel",
          duration_yr: 1,
          duration_mo: 0,
          duration_wk: "2",
          wound_type: "Diabetic",
          depth: "Partial thickness",
          size_length_cm: 2,
          size_width_cm: 2.5,
          size_depth_cm: null,
          size_features: ["Undermining", "none"],
          bed_granulation_pct: 70,
          bed_slough_pct: 0,
          bed_fibrotic_pct: 30,
          bed_eschar_pct: null,
          wound_edges: ["Attached"],
          periwound: [],
          pain_level: 3,
          pain_description: "",
          visit_date: "2026-03-03",
          visit_frequency: "Weekly",
          visit_place: "Facility",
          patient_response: ["Tolerated"],
          wound_response: ["Reduced slough", "N/A"],
        })
      ).toEqual([
        "Location: Left heel",
        "Duration: 1 yr 2 wk",
        "Wound type: Diabetic",
        "Depth: Partial thickness",
        "Size: 2 × 2.5 cm",
        "Size features: Undermining",
        "Granulation: 70%",
        "Fibrotic: 30%",
        "Wound edges: Attached",
        "Pain level: 3/10",
        "Visit date: 2026-03-03",
        "Treatment frequency: Weekly",
        "Place of treatment: Facility",
        "Patient response: Tolerated",
        "Wound response: Reduced slough",
      ]);
    });
  });

  describe("feeding_tube_change", () => {
    it("renders the documented change, including positive procedure flags", () => {
      expect(
        renderPositiveProcedurePayload("feeding_tube_change", {
          procedureTypes: ["G-tube replacement"],
          lastReplacementDate: "2026-01-10",
          abdominalExam: ["Soft", "none"],
          previousTubeType: ["Balloon"],
          periTubeFindings: [],
          newTubeSizeFr: "20",
          newTubeBalloonCc: "5",
          newSiliconeSizeFr: "",
          reasonsForReplacement: ["Dislodged"],
          placementVerification: ["Gastric aspirate"],
          feedingInstructions: ["Resume feeds"],
          benzocaineApplied: true,
          removalResistance: ["Mild"],
          removalBleedingCc: "",
          salineInstilledCc: "10",
          hypergranulationTreated: true,
          silverNitrateSticks: "2",
          toleranceOptions: ["Tolerated well"],
          postProcedureDressing: true,
          postProcedureDressingDays: "3",
          comments: "No complications.",
          nextReplacementDate: "2026-04-10",
        })
      ).toEqual([
        "Procedure type: G-tube replacement",
        "Last replacement date: 2026-01-10",
        "Abdominal exam: Soft",
        "Previous tube type: Balloon",
        "New tube size: 20 Fr",
        "New tube balloon: 5 cc",
        "Reason for replacement: Dislodged",
        "Placement verification: Gastric aspirate",
        "Feeding instructions: Resume feeds",
        "Benzocaine applied",
        "Removal resistance: Mild",
        "Saline instilled: 10 cc",
        "Hypergranulation treated",
        "Silver nitrate sticks: 2",
        "Patient tolerance: Tolerated well",
        "Post-procedure dressing for 3 day(s)",
        "Comments: No complications.",
        "Next replacement date: 2026-04-10",
      ]);
    });

    it("ignores silver nitrate unless hypergranulation was treated", () => {
      expect(
        renderPositiveProcedurePayload("feeding_tube_change", {
          hypergranulationTreated: false,
          silverNitrateSticks: "2",
          benzocaineApplied: false,
        })
      ).toEqual([]);
    });

    it("notes a post-procedure dressing even without a day count", () => {
      expect(
        renderPositiveProcedurePayload("feeding_tube_change", {
          postProcedureDressing: true,
          postProcedureDressingDays: "",
        })
      ).toEqual(["Post-procedure dressing applied"]);
    });
  });

  describe("urinary_catheter_replacement", () => {
    it("merges 'other' free text into each chip list and keeps positive flags", () => {
      expect(
        renderPositiveProcedurePayload("urinary_catheter_replacement", {
          comorbidities: ["Neurogenic bladder", "none"],
          comorbiditiesOther: "BPH",
          discussion: "Risks reviewed.",
          procedurePerformed: [],
          procedurePerformedOther: "Foley exchange",
          abdominalExam: ["Soft"],
          abdominalDistendedTenderness: "Nontender",
          abdominalExamOther: "",
          catheterPlacement: ["Urethral"],
          catheterPlacementOther: " ",
          periTubeFindings: ["Clean"],
          periTubeFindingsOther: "Mild erythema",
          lastPlacementDate: "2026-02-14",
          lastPlacementUnknown: true,
          replacementSizeFr: "16",
          balloonType: true,
          balloonCapacityCc: "10",
          reasonForReplacement: ["Routine"],
          reasonForReplacementOther: "",
          consentObtained: true,
          consentReasons: [],
          consentReasonsOther: "Patient request",
          oldFoleyRemovalNotes: ["Intact"],
          oldFoleyBleedingCc: "",
          newFoleySizeFr: "16",
          newFoleyRoute: ["Urethral"],
          newFoleyRouteOther: "",
          newFoleySalineCc: "10",
          noVisibleBleeding: true,
          bleedingControlled: false,
        })
      ).toEqual([
        "Comorbidities: Neurogenic bladder, BPH",
        "Discussion: Risks reviewed.",
        "Procedure performed: Foley exchange",
        "Abdominal exam: Soft",
        "Abdominal tenderness: Nontender",
        "Catheter placement: Urethral",
        "Peri-tube findings: Clean, Mild erythema",
        "Last placement date: 2026-02-14",
        "Replacement Foley size: 16 Fr",
        "Balloon-tipped Foley",
        "Balloon capacity: 10 cc",
        "Reason for replacement: Routine",
        "Consent obtained",
        "Consent reasons: Patient request",
        "Old Foley removal: Intact",
        "New Foley size: 16 Fr",
        "New Foley route: Urethral",
        "New Foley saline: 10 cc",
        "No visible bleeding",
      ]);
    });

    it("prints 'unknown' for the last placement date only when no date is given", () => {
      expect(
        renderPositiveProcedurePayload("urinary_catheter_replacement", {
          lastPlacementDate: "",
          lastPlacementUnknown: true,
        })
      ).toEqual(["Last placement date: unknown"]);
    });
  });
});
