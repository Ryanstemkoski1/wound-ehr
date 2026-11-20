import { describe, expect, it } from "vitest";
import {
  calculateTissueTotal,
  getTreatmentDisabledReason,
  isTreatmentDisabled,
  shouldShowPressureStage,
  validateAssessmentForm,
  validateLocationConfirmation,
  validateMeasurements,
  validatePressureStage,
  validateTissueComposition,
  validateTreatmentSelection,
} from "@/lib/validations/assessment";

const ALGINATE_ERROR = "Alginate requires moderate to large exudate";
const FOAM_ERROR = "Foam dressings require at least minimal exudate";
const HYDROCOLLOID_WARNING =
  "Hydrocolloid may not manage heavy drainage effectively";
const DEPTH_WARNING =
  "Depth is greater than width or length. Please verify measurements are correct.";

describe("validateTreatmentSelection", () => {
  it.each(["None", "Minimal"])(
    "rejects alginate with %s exudate",
    (exudate) => {
      expect(validateTreatmentSelection(exudate, "alginate")).toEqual({
        valid: false,
        error: ALGINATE_ERROR,
      });
    }
  );

  it.each(["Moderate", "Heavy"])(
    "allows alginate with %s exudate",
    (exudate) => {
      expect(validateTreatmentSelection(exudate, "alginate")).toEqual({
        valid: true,
      });
    }
  );

  it("matches exudate and treatment names case-insensitively and by substring", () => {
    expect(validateTreatmentSelection("MINIMAL", "Calcium Alginate")).toEqual({
      valid: false,
      error: ALGINATE_ERROR,
    });
    expect(validateTreatmentSelection("none", "Silicone FOAM border")).toEqual({
      valid: false,
      error: FOAM_ERROR,
    });
  });

  it("allows hydrocolloid with heavy exudate but warns about drainage", () => {
    expect(validateTreatmentSelection("Heavy", "hydrocolloid")).toEqual({
      valid: true,
      warning: HYDROCOLLOID_WARNING,
    });
  });

  it.each(["None", "Minimal", "Moderate"])(
    "allows hydrocolloid with %s exudate without a warning",
    (exudate) => {
      expect(validateTreatmentSelection(exudate, "hydrocolloid")).toEqual({
        valid: true,
      });
    }
  );

  it("rejects foam when there is no exudate", () => {
    expect(validateTreatmentSelection("None", "foam")).toEqual({
      valid: false,
      error: FOAM_ERROR,
    });
  });

  it.each(["Minimal", "Moderate", "Heavy"])(
    "allows foam with %s exudate",
    (exudate) => {
      expect(validateTreatmentSelection(exudate, "foam")).toEqual({
        valid: true,
      });
    }
  );

  it.each([
    ["hydrogel", "None"],
    ["collagen", "None"],
    ["antimicrobial", "Heavy"],
    ["compression", "Minimal"],
    ["negative_pressure", "None"],
    ["enzymatic_debridement", "Heavy"],
    ["other", "None"],
  ])(
    "places no exudate restriction on %s (%s exudate)",
    (treatment, exudate) => {
      expect(validateTreatmentSelection(exudate, treatment)).toEqual({
        valid: true,
      });
    }
  );

  it("reports the alginate rule first for a combined alginate/foam product", () => {
    expect(validateTreatmentSelection("None", "Alginate foam")).toEqual({
      valid: false,
      error: ALGINATE_ERROR,
    });
  });
});

describe("isTreatmentDisabled / getTreatmentDisabledReason", () => {
  it("disables an incompatible treatment and explains why", () => {
    expect(isTreatmentDisabled("Minimal", "alginate")).toBe(true);
    expect(getTreatmentDisabledReason("Minimal", "alginate")).toBe(
      ALGINATE_ERROR
    );
  });

  it("keeps a treatment enabled when the rule only produces a warning", () => {
    expect(isTreatmentDisabled("Heavy", "hydrocolloid")).toBe(false);
    expect(getTreatmentDisabledReason("Heavy", "hydrocolloid")).toBeNull();
  });

  it("keeps a compatible treatment enabled with no reason", () => {
    expect(isTreatmentDisabled("Moderate", "foam")).toBe(false);
    expect(getTreatmentDisabledReason("Moderate", "foam")).toBeNull();
  });
});

describe("validateTissueComposition", () => {
  it("accepts percentages that total exactly 100", () => {
    expect(
      validateTissueComposition({ epithelial: 20, granulation: 50, slough: 30 })
    ).toEqual({ valid: true, total: 100 });
  });

  it("includes necrotic and eschar tissue in the total", () => {
    expect(
      validateTissueComposition({
        epithelial: 0,
        granulation: 50,
        slough: 25,
        necrotic: 15,
        eschar: 10,
      })
    ).toEqual({ valid: true, total: 100 });
  });

  it("treats missing tissue types as 0%", () => {
    expect(validateTissueComposition({ granulation: 100 })).toEqual({
      valid: true,
      total: 100,
    });
  });

  it("allows an untouched (all zero) composition", () => {
    expect(validateTissueComposition({})).toEqual({ valid: true, total: 0 });
    expect(
      validateTissueComposition({ epithelial: 0, granulation: 0, slough: 0 })
    ).toEqual({ valid: true, total: 0 });
  });

  it.each([
    [{ granulation: 60, slough: 39 }, 99],
    [{ granulation: 60, slough: 41 }, 101],
    [{ epithelial: 10 }, 10],
  ])("rejects %o because it totals %i%%", (percentages, total) => {
    expect(validateTissueComposition(percentages)).toEqual({
      valid: false,
      total,
      error: `Tissue composition must total 100% (currently ${total}%)`,
    });
  });

  it.each([
    { granulation: -5, slough: 105 },
    { granulation: 101 },
    { epithelial: 50, eschar: -1, slough: 51 },
  ])("rejects an out-of-range percentage in %o", (percentages) => {
    expect(validateTissueComposition(percentages)).toEqual({
      valid: false,
      total: 0,
      error: "Each percentage must be between 0 and 100",
    });
  });
});

describe("calculateTissueTotal", () => {
  it("sums all five tissue types", () => {
    expect(
      calculateTissueTotal({
        epithelial: 5,
        granulation: 10,
        slough: 15,
        necrotic: 20,
        eschar: 25,
      })
    ).toBe(75);
  });

  it("treats missing values as 0", () => {
    expect(calculateTissueTotal({})).toBe(0);
    expect(calculateTissueTotal({ slough: 40 })).toBe(40);
  });

  it("does not clamp totals above 100 (the form shows the overflow)", () => {
    expect(
      calculateTissueTotal({ epithelial: 50, granulation: 50, slough: 30 })
    ).toBe(130);
  });
});

describe("validateMeasurements", () => {
  it.each([
    [{ length: -0.1, width: 2, depth: 1 }, "Length must be a positive number"],
    [{ length: 2, width: -1, depth: 1 }, "Width must be a positive number"],
    [{ length: 2, width: 2, depth: -3 }, "Depth must be a positive number"],
  ])("rejects negative measurements %o", (measurements, error) => {
    expect(validateMeasurements(measurements)).toEqual({ valid: false, error });
  });

  it("reports the first negative dimension in length, width, depth order", () => {
    expect(validateMeasurements({ length: -1, width: -1, depth: -1 })).toEqual({
      valid: false,
      error: "Length must be a positive number",
    });
    expect(validateMeasurements({ width: -1, depth: -1 })).toEqual({
      valid: false,
      error: "Width must be a positive number",
    });
  });

  it("accepts zero for an unmeasured dimension", () => {
    expect(validateMeasurements({ length: 0, width: 0, depth: 0 })).toEqual({
      valid: true,
    });
  });

  it("accepts an empty measurement set", () => {
    expect(validateMeasurements({})).toEqual({ valid: true });
  });

  it("accepts typical measurements without a warning", () => {
    expect(validateMeasurements({ length: 4, width: 3, depth: 0.5 })).toEqual({
      valid: true,
    });
  });

  it("does not warn when depth equals width and length", () => {
    expect(validateMeasurements({ length: 2, width: 2, depth: 2 })).toEqual({
      valid: true,
    });
  });

  it.each([
    { length: 5, width: 1, depth: 2 },
    { length: 1, width: 5, depth: 2 },
  ])("warns but stays valid when depth exceeds a side: %o", (measurements) => {
    expect(validateMeasurements(measurements)).toEqual({
      valid: true,
      warning: DEPTH_WARNING,
    });
  });

  it.each([
    { length: 1, width: 1 },
    { length: 0, width: 1, depth: 3 },
    { width: 1, depth: 3 },
  ])(
    "skips the depth check unless all three dimensions are positive: %o",
    (measurements) => {
      expect(validateMeasurements(measurements)).toEqual({ valid: true });
    }
  );
});

describe("validatePressureStage", () => {
  it.each([null, undefined, ""])(
    "requires a stage for a pressure injury (stage %o)",
    (stage) => {
      expect(validatePressureStage("Pressure Injury", stage)).toEqual({
        valid: false,
        error: "Pressure stage is required for pressure injuries",
      });
    }
  );

  it("accepts a pressure injury with a stage", () => {
    expect(validatePressureStage("Pressure Injury", "Stage 2")).toEqual({
      valid: true,
    });
  });

  it("recognises the snake_case wound type", () => {
    expect(validatePressureStage("pressure_injury", null).valid).toBe(false);
  });

  it.each(["Diabetic Ulcer", "Venous Ulcer", "Surgical Wound", "Other", ""])(
    "does not require a stage for %o",
    (woundType) => {
      expect(validatePressureStage(woundType, null)).toEqual({ valid: true });
    }
  );
});

describe("shouldShowPressureStage", () => {
  it.each([
    ["Pressure Injury", true],
    ["PRESSURE_INJURY", true],
    ["Arterial Ulcer", false],
    ["Burn", false],
    ["", false],
  ])("%o -> %s", (woundType, expected) => {
    expect(shouldShowPressureStage(woundType)).toBe(expected);
  });
});

describe("validateLocationConfirmation", () => {
  it("requires confirmation on the first assessment", () => {
    expect(validateLocationConfirmation(true, false)).toEqual({
      valid: false,
      error: "Please confirm the wound location before saving",
    });
  });

  it("accepts a confirmed first assessment", () => {
    expect(validateLocationConfirmation(true, true)).toEqual({ valid: true });
  });

  it("does not require confirmation on later assessments", () => {
    expect(validateLocationConfirmation(false, false)).toEqual({ valid: true });
  });
});

describe("validateAssessmentForm", () => {
  it("passes a complete, consistent assessment", () => {
    expect(
      validateAssessmentForm({
        woundType: "Pressure Injury",
        pressureStage: "Stage 3",
        exudateAmount: "Moderate",
        selectedTreatments: ["alginate", "foam"],
        measurements: { length: 4, width: 3, depth: 1 },
        tissueComposition: { epithelial: 10, granulation: 70, slough: 20 },
        isFirstAssessment: true,
        locationConfirmed: true,
      })
    ).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it("passes the zero-filled payload the server action sends for an empty form", () => {
    expect(
      validateAssessmentForm({
        woundType: "",
        measurements: { length: 0, width: 0, depth: 0 },
        tissueComposition: { epithelial: 0, granulation: 0, slough: 0 },
      })
    ).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it("collects every error in validator order", () => {
    const result = validateAssessmentForm({
      woundType: "Pressure Injury",
      pressureStage: null,
      tissueComposition: { granulation: 50 },
      measurements: { length: -1 },
      exudateAmount: "None",
      selectedTreatments: ["alginate", "foam", "collagen"],
      isFirstAssessment: true,
      locationConfirmed: false,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "Pressure stage is required for pressure injuries",
      "Tissue composition must total 100% (currently 50%)",
      "Length must be a positive number",
      `alginate: ${ALGINATE_ERROR}`,
      `foam: ${FOAM_ERROR}`,
      "Please confirm the wound location before saving",
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("returns warnings without invalidating the form", () => {
    expect(
      validateAssessmentForm({
        woundType: "Venous Ulcer",
        exudateAmount: "Heavy",
        selectedTreatments: ["hydrocolloid"],
        measurements: { length: 1, width: 1, depth: 2 },
      })
    ).toEqual({
      valid: true,
      errors: [],
      warnings: [DEPTH_WARNING, `hydrocolloid: ${HYDROCOLLOID_WARNING}`],
    });
  });

  it("skips the treatment check when no exudate amount is chosen", () => {
    expect(
      validateAssessmentForm({
        woundType: "Venous Ulcer",
        exudateAmount: "",
        selectedTreatments: ["alginate"],
      }).errors
    ).toEqual([]);
    expect(
      validateAssessmentForm({
        woundType: "Venous Ulcer",
        selectedTreatments: ["alginate"],
      }).errors
    ).toEqual([]);
  });

  it("skips the location check unless both location flags are provided", () => {
    expect(
      validateAssessmentForm({ woundType: "Burn", isFirstAssessment: true })
        .valid
    ).toBe(true);
  });
});
