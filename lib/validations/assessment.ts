/**
 * Assessment Form Validation Utilities
 *
 * Provides validation logic for wound assessments including:
 * - Treatment-exudate compatibility
 * - Tissue composition totaling 100%
 * - Measurement validation
 * - Location confirmation
 * - Pressure stage validation
 */

// ============================================================================
// Types
// ============================================================================

export type ValidationResult = {
  valid: boolean;
  error?: string;
  warning?: string;
};

export type TissuePercentages = {
  epithelial: number;
  granulation: number;
  slough: number;
  necrotic?: number;
  eschar?: number;
};

export type MeasurementValues = {
  length: number;
  width: number;
  depth: number;
};

export type ExudateAmount = "None" | "Minimal" | "Moderate" | "Heavy";

export type TreatmentType =
  | "alginate"
  | "hydrocolloid"
  | "foam"
  | "hydrogel"
  | "collagen"
  | "antimicrobial"
  | "compression"
  | "negative_pressure"
  | "enzymatic_debridement"
  | "other";

// ============================================================================
// Treatment-Exudate Validation
// ============================================================================

/**
 * Validates if a treatment is compatible with the current exudate amount
 *
 * Rules:
 * - Alginate: Requires Moderate or Heavy exudate
 * - Hydrocolloid: Best for Minimal/Moderate (warning for Heavy)
 * - Foam: Requires at least Minimal exudate
 */
export function validateTreatmentSelection(
  exudateAmount: ExudateAmount | string,
  treatment: TreatmentType | string
): ValidationResult {
  const normalizedExudate = exudateAmount.toLowerCase();
  const normalizedTreatment = treatment.toLowerCase();

  // Alginate validation
  if (
    normalizedTreatment.includes("alginate") ||
    normalizedTreatment === "alginate"
  ) {
    if (normalizedExudate === "none" || normalizedExudate === "minimal") {
      return {
        valid: false,
        error: "Alginate requires moderate to large exudate",
      };
    }
  }

  // Hydrocolloid validation
  if (
    normalizedTreatment.includes("hydrocolloid") ||
    normalizedTreatment === "hydrocolloid"
  ) {
    if (normalizedExudate === "heavy") {
      return {
        valid: true,
        warning: "Hydrocolloid may not manage heavy drainage effectively",
      };
    }
  }

  // Foam validation
  if (normalizedTreatment.includes("foam") || normalizedTreatment === "foam") {
    if (normalizedExudate === "none") {
      return {
        valid: false,
        error: "Foam dressings require at least minimal exudate",
      };
    }
  }

  return { valid: true };
}

/**
 * Check if a treatment should be disabled based on exudate amount
 */
export function isTreatmentDisabled(
  exudateAmount: ExudateAmount | string,
  treatment: TreatmentType | string
): boolean {
  const result = validateTreatmentSelection(exudateAmount, treatment);
  return !result.valid;
}

/**
 * Get tooltip message explaining why a treatment is disabled
 */
export function getTreatmentDisabledReason(
  exudateAmount: ExudateAmount | string,
  treatment: TreatmentType | string
): string | null {
  const result = validateTreatmentSelection(exudateAmount, treatment);
  return result.error || null;
}

// ============================================================================
// Tissue Composition Validation
// ============================================================================

/**
 * Validates that tissue composition percentages add up to 100%
 *
 * Rules:
 * - Total must equal exactly 100%
 * - Each percentage must be between 0 and 100
 * - Returns current total and whether it's valid
 */
export function validateTissueComposition(
  percentages: Partial<TissuePercentages>
): ValidationResult & { total: number } {
  const epithelial = percentages.epithelial || 0;
  const granulation = percentages.granulation || 0;
  const slough = percentages.slough || 0;
  const necrotic = percentages.necrotic || 0;
  const eschar = percentages.eschar || 0;

  // Validate individual percentages
  const allPercentages = [epithelial, granulation, slough, necrotic, eschar];
  for (const value of allPercentages) {
    if (value < 0 || value > 100) {
      return {
        valid: false,
        total: 0,
        error: "Each percentage must be between 0 and 100",
      };
    }
  }

  const total = epithelial + granulation + slough + necrotic + eschar;

  if (total === 0) {
    // Allow empty form (not started yet)
    return { valid: true, total: 0 };
  }

  if (total !== 100) {
    return {
      valid: false,
      total,
      error: `Tissue composition must total 100% (currently ${total}%)`,
    };
  }

  return { valid: true, total: 100 };
}

/**
 * Calculate the current total of tissue composition percentages
 */
export function calculateTissueTotal(
  percentages: Partial<TissuePercentages>
): number {
  const epithelial = percentages.epithelial || 0;
  const granulation = percentages.granulation || 0;
  const slough = percentages.slough || 0;
  const necrotic = percentages.necrotic || 0;
  const eschar = percentages.eschar || 0;

  return epithelial + granulation + slough + necrotic + eschar;
}

// ============================================================================
// Measurement Validation
// ============================================================================

/**
 * Validates wound measurements
 *
 * Rules:
 * - All measurements must be > 0 if provided
 * - Depth usually should be less than width and length
 * - Returns warnings for unusual measurements
 */
export function validateMeasurements(
  measurements: Partial<MeasurementValues>
): ValidationResult {
  const { length, width, depth } = measurements;

  // Check for negative values
  if (length !== undefined && length < 0) {
    return { valid: false, error: "Length must be a positive number" };
  }
  if (width !== undefined && width < 0) {
    return { valid: false, error: "Width must be a positive number" };
  }
  if (depth !== undefined && depth < 0) {
    return { valid: false, error: "Depth must be a positive number" };
  }

  // Check if depth is unusually large compared to width/length
  if (
    length !== undefined &&
    width !== undefined &&
    depth !== undefined &&
    length > 0 &&
    width > 0 &&
    depth > 0
  ) {
    if (depth > width || depth > length) {
      return {
        valid: true,
        warning:
          "Depth is greater than width or length. Please verify measurements are correct.",
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Pressure Stage Validation
// ============================================================================

/**
 * Validates pressure stage based on wound type
 *
 * Rules:
 * - Pressure stage required if wound type is "pressure_injury" or "Pressure Injury"
 * - Pressure stage should be hidden for other wound types
 */
export function validatePressureStage(
  woundType: string,
  pressureStage?: string | null
): ValidationResult {
  const isPressureInjury =
    woundType.toLowerCase().includes("pressure") ||
    woundType.toLowerCase() === "pressure_injury";

  if (isPressureInjury && !pressureStage) {
    return {
      valid: false,
      error: "Pressure stage is required for pressure injuries",
    };
  }

  return { valid: true };
}

/**
 * Check if pressure stage field should be shown based on wound type
 */
export function shouldShowPressureStage(woundType: string): boolean {
  return (
    woundType.toLowerCase().includes("pressure") ||
    woundType.toLowerCase() === "pressure_injury"
  );
}

// ============================================================================
// Location Confirmation
// ============================================================================

/**
 * Validates location confirmation for first assessment
 *
 * Rules:
 * - First assessment requires location confirmation checkbox
 * - Subsequent assessments auto-populate from previous
 */
export function validateLocationConfirmation(
  isFirstAssessment: boolean,
  locationConfirmed: boolean
): ValidationResult {
  if (isFirstAssessment && !locationConfirmed) {
    return {
      valid: false,
      error: "Please confirm the wound location before saving",
    };
  }

  return { valid: true };
}

// ============================================================================
// Form-Level Validation
// ============================================================================

/**
 * Validates the entire assessment form
 * Returns all validation errors and warnings
 */
export function validateAssessmentForm(data: {
  woundType: string;
  pressureStage?: string | null;
  exudateAmount?: ExudateAmount | string;
  selectedTreatments?: string[];
  measurements?: Partial<MeasurementValues>;
  tissueComposition?: Partial<TissuePercentages>;
  isFirstAssessment?: boolean;
  locationConfirmed?: boolean;
}): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate pressure stage
  if (data.woundType) {
    const pressureResult = validatePressureStage(
      data.woundType,
      data.pressureStage
    );
    if (!pressureResult.valid && pressureResult.error) {
      errors.push(pressureResult.error);
    }
  }

  // Validate tissue composition
  if (data.tissueComposition) {
    const tissueResult = validateTissueComposition(data.tissueComposition);
    if (!tissueResult.valid && tissueResult.error) {
      errors.push(tissueResult.error);
    }
  }

  // Validate measurements
  if (data.measurements) {
    const measurementResult = validateMeasurements(data.measurements);
    if (!measurementResult.valid && measurementResult.error) {
      errors.push(measurementResult.error);
    }
    if (measurementResult.warning) {
      warnings.push(measurementResult.warning);
    }
  }

  // Validate treatments vs exudate
  if (data.exudateAmount && data.selectedTreatments) {
    for (const treatment of data.selectedTreatments) {
      const treatmentResult = validateTreatmentSelection(
        data.exudateAmount,
        treatment
      );
      if (!treatmentResult.valid && treatmentResult.error) {
        errors.push(`${treatment}: ${treatmentResult.error}`);
      }
      if (treatmentResult.warning) {
        warnings.push(`${treatment}: ${treatmentResult.warning}`);
      }
    }
  }

  // Validate location confirmation
  if (
    data.isFirstAssessment !== undefined &&
    data.locationConfirmed !== undefined
  ) {
    const locationResult = validateLocationConfirmation(
      data.isFirstAssessment,
      data.locationConfirmed
    );
    if (!locationResult.valid && locationResult.error) {
      errors.push(locationResult.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
