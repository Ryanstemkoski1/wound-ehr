// Positive-finding filter for the Phase-3 leave-behind PDF.
//
// Background:
//   Dr. May's 5/29 feedback on the leave-behind handout was that it should be
//   "stripped down to just the positives". Negative findings — "No tunneling",
//   "Pain level 0", empty notes — add visual noise without clinical value for a
//   document the patient takes home. The full progress note (visit-full-note-pdf)
//   still records every field for the chart; this module powers the patient-
//   facing summary that only enumerates the positives.
//
// Design:
//   * Pure module — no IO, no React, no Supabase. Easy to unit-test, safe to
//     import from a server component or from the @react-pdf/renderer Document.
//   * `isPositive` is the single source of truth for "would this be worth
//     printing on the leave-behind?". Everything else (renderPositives,
//     renderPositiveBullets, renderPositiveProcedurePayload) defers to it for
//     value-level filtering and only handles labelling / phrasing.
//   * Per Dr. May's wording, the literal number `0` is treated as a non-finding
//     by default. Pain level 0 ("no pain") should NOT appear on the leave-
//     behind. Callers that need to render a true zero (e.g. "0 sheets used" is
//     a finding) can opt out via the `renderPositiveNumber` option.
//
// Scope: this file only knows about flat record → label/value pairs and about
// the five Phase-3 procedure payload shapes (sharp_debridement, biologic_graft,
// arobella, feeding_tube_change, urinary_catheter_replacement). It does NOT
// know how to lay those bullets out in the PDF — that's the renderer's job.

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Tuning knobs shared by every "positive?" check in this file.
 *
 * `renderPositiveNumber`: when `true`, the literal number `0` is treated as a
 * positive finding (useful for counts like "0 sheets" where the zero matters).
 * Default `false` because Dr. May's primary use case — pain level — treats 0
 * as the absence of pain.
 */
export type PositiveOptions = {
  renderPositiveNumber?: boolean;
};

const DEFAULT_OPTIONS: Required<PositiveOptions> = {
  renderPositiveNumber: false,
};

// String tokens that mean "explicitly negative finding" regardless of casing.
// Trimmed before comparison so " None " counts the same as "none".
const NEGATIVE_TOKENS: ReadonlySet<string> = new Set([
  "none",
  "no",
  "absent",
  "n/a",
]);

// ---------------------------------------------------------------------------
// isPositive
// ---------------------------------------------------------------------------

/**
 * Return `true` if `value` represents a positive (i.e. printable) finding.
 *
 * Returns `false` for:
 *   - `null` / `undefined`
 *   - empty string (after trim) or whitespace-only string
 *   - empty array
 *   - the literal strings `"none"` / `"no"` / `"absent"` / `"n/a"`
 *     (case-insensitive, trimmed)
 *   - the literal number `0` — unless `opts.renderPositiveNumber` is `true`
 *
 * Everything else — non-empty strings, non-zero numbers, booleans (`true`
 * counts; `false` doesn't), non-empty arrays, plain objects with at least one
 * positive value — is treated as positive.
 */
export function isPositive(
  value: unknown,
  opts: PositiveOptions = {}
): boolean {
  const { renderPositiveNumber } = { ...DEFAULT_OPTIONS, ...opts };

  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    if (NEGATIVE_TOKENS.has(trimmed.toLowerCase())) return false;
    return true;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return false;
    if (value === 0 && !renderPositiveNumber) return false;
    return true;
  }

  if (typeof value === "boolean") {
    // `false` is the "not present" state for a boolean flag; only `true` is
    // a finding worth printing.
    return value;
  }

  if (Array.isArray(value)) {
    // An array is positive if it has at least one positive element. This
    // intentionally drops "[None]" / "[]" / "[null]" arrays without printing
    // a stray label with an empty value.
    return value.some((v) => isPositive(v, opts));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.values(obj).some((v) => isPositive(v, opts));
  }

  // Symbols, functions, bigints: treat as non-positive — they shouldn't appear
  // in a JSONB payload, and if they do they're not renderable anyway.
  return false;
}

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

/**
 * Stringify a positive value for printing on a single line. Arrays are
 * filtered to positive members and joined with ", ". Objects are flattened to
 * `key: value` pairs separated by "; ". Numbers are coerced via `String`.
 *
 * Only called for values that already passed `isPositive`, so we don't need to
 * defensively re-check membership; we just need to skip negative members when
 * walking composite values so "Granulation, None" never gets rendered.
 */
function formatValue(value: unknown, opts: PositiveOptions): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    return value
      .filter((v) => isPositive(v, opts))
      .map((v) => formatValue(v, opts))
      .join(", ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => isPositive(v, opts))
      .map(([k, v]) => `${humanizeKey(k)}: ${formatValue(v, opts)}`)
      .join("; ");
  }

  return String(value ?? "");
}

/**
 * Best-effort `snake_case` / `camelCase` → `Title Case` for record keys, used
 * when no explicit `labelMap` entry exists. Conservative: an existing entry in
 * `labelMap` always wins.
 */
function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// renderPositives
// ---------------------------------------------------------------------------

export type PositivePair = { label: string; value: string };

/**
 * Walk a flat record and return one `{ label, value }` per positive finding.
 *
 * Iteration order follows insertion order of `record` (which matches the order
 * the form persisted, which is the order the clinician saw on screen) so the
 * PDF reads top-to-bottom the same way the chart does.
 *
 * `labelMap` maps record keys to human-friendly labels. When a key is not in
 * `labelMap`, the key is humanised (`granulation_percent` → `Granulation
 * Percent`) — that's a fallback, not a recommendation. Callers should provide
 * a `labelMap` for any record they care about presenting cleanly.
 */
export function renderPositives(
  record: Record<string, unknown>,
  labelMap?: Record<string, string>,
  opts: PositiveOptions = {}
): PositivePair[] {
  if (!record || typeof record !== "object") return [];

  const out: PositivePair[] = [];
  for (const [key, raw] of Object.entries(record)) {
    if (!isPositive(raw, opts)) continue;
    const label = labelMap?.[key] ?? humanizeKey(key);
    const formatted = formatValue(raw, opts);
    if (formatted === "") continue; // composite value collapsed to nothing
    out.push({ label, value: formatted });
  }
  return out;
}

// ---------------------------------------------------------------------------
// renderPositiveBullets — wound assessment
// ---------------------------------------------------------------------------

/**
 * Shape of the assessment slice consumed by `renderPositiveBullets`. Field
 * names mirror the camelCase view used by the React forms (see
 * `components/assessments/multi-wound-assessment-form.tsx`), NOT the
 * snake_case DB columns. Callers that have a raw DB row should map first.
 *
 * Every field is optional because the leave-behind only prints what's filled
 * in — an assessment with just measurements is valid.
 */
export type PositiveAssessment = {
  woundType?: string | null;
  length?: number | null;
  width?: number | null;
  depth?: number | null;
  painLevel?: number | null;
  infectionSigns?: string[] | null;
  exudateAmount?: string | null;
  exudateType?: string | null;
  periwoundCondition?: string | null;
  granulationPercent?: number | null;
  sloughPercent?: number | null;
  epithelialPercent?: number | null;
  healingStatus?: string | null;
};

/**
 * Render a wound assessment as a list of one-line bullets containing only the
 * positive findings.
 *
 * Conventions:
 *   * Measurements (L × W × D) are coalesced into a single bullet because
 *     three separate "Length: 2 cm" / "Width: 1 cm" / "Depth: 0.3 cm" lines
 *     read as noise. If only some dimensions are present, the missing ones
 *     are dropped (e.g. `2 × 1 cm` when depth is unknown).
 *   * Wound bed percentages each render their own bullet — granulation,
 *     slough, and epithelial composition are independently meaningful and
 *     Dr. May tracks them separately in the chart.
 *   * `infectionSigns` is a chip-array; we filter out negatives before
 *     joining so `["odor", "none"]` renders as "Signs of infection: odor".
 *   * Pain level 0 is omitted (default `renderPositiveNumber=false`), which
 *     is exactly what Dr. May asked for.
 */
export function renderPositiveBullets(
  assessment: PositiveAssessment,
  opts: PositiveOptions = {}
): string[] {
  if (!assessment || typeof assessment !== "object") return [];

  const bullets: string[] = [];

  if (isPositive(assessment.woundType, opts)) {
    bullets.push(`Wound type: ${String(assessment.woundType)}`);
  }

  // Coalesced measurement bullet — only the dimensions that are present.
  const dims: string[] = [];
  if (isPositive(assessment.length, opts)) dims.push(String(assessment.length));
  if (isPositive(assessment.width, opts)) dims.push(String(assessment.width));
  if (isPositive(assessment.depth, opts)) dims.push(String(assessment.depth));
  if (dims.length > 0) {
    bullets.push(`Size: ${dims.join(" × ")} cm`);
  }

  if (isPositive(assessment.granulationPercent, opts)) {
    bullets.push(`Granulation: ${assessment.granulationPercent}%`);
  }
  if (isPositive(assessment.sloughPercent, opts)) {
    bullets.push(`Slough: ${assessment.sloughPercent}%`);
  }
  if (isPositive(assessment.epithelialPercent, opts)) {
    bullets.push(`Epithelial: ${assessment.epithelialPercent}%`);
  }

  if (isPositive(assessment.exudateAmount, opts)) {
    bullets.push(`Exudate amount: ${String(assessment.exudateAmount)}`);
  }
  if (isPositive(assessment.exudateType, opts)) {
    bullets.push(`Exudate type: ${String(assessment.exudateType)}`);
  }

  if (isPositive(assessment.periwoundCondition, opts)) {
    bullets.push(`Periwound: ${String(assessment.periwoundCondition)}`);
  }

  if (isPositive(assessment.infectionSigns, opts)) {
    const signs = (assessment.infectionSigns ?? [])
      .filter((s): s is string => isPositive(s, opts))
      .map((s) => s.trim());
    if (signs.length > 0) {
      bullets.push(`Signs of infection: ${signs.join(", ")}`);
    }
  }

  if (isPositive(assessment.painLevel, opts)) {
    bullets.push(`Pain level: ${assessment.painLevel}/10`);
  }

  if (isPositive(assessment.healingStatus, opts)) {
    bullets.push(`Healing status: ${String(assessment.healingStatus)}`);
  }

  return bullets;
}

// ---------------------------------------------------------------------------
// renderPositiveProcedurePayload
// ---------------------------------------------------------------------------

/**
 * Procedure types supported by the leave-behind PDF — mirrors the discriminator
 * in `app/actions/procedures.ts` (and the CHECK constraint in migration
 * 00053_procedure_documentation.sql). Kept as a string union of the literal
 * values so a typo at the call site is caught at compile time.
 */
export type LeaveBehindProcedureType =
  | "sharp_debridement"
  | "biologic_graft"
  | "arobella"
  | "feeding_tube_change"
  | "urinary_catheter_replacement";

/**
 * Render the per-procedure documentation payload as a list of positive-only
 * one-line bullets. Each procedure type has its own positive-rendering rules
 * because the relevant findings differ (debridement cares about instruments
 * and tissue removed; biologic_graft cares about product name and sheet
 * counts; etc.).
 *
 * Unknown procedure types fall back to the generic `renderPositives` walk so
 * a future procedure added at the DB layer still produces *something* in the
 * PDF until this file is updated.
 */
export function renderPositiveProcedurePayload(
  procedureType: string,
  payload: Record<string, unknown>,
  opts: PositiveOptions = {}
): string[] {
  if (!payload || typeof payload !== "object") return [];

  switch (procedureType as LeaveBehindProcedureType) {
    case "sharp_debridement":
      return renderSharpDebridementPositives(payload, opts);
    case "biologic_graft":
      return renderBiologicGraftPositives(payload, opts);
    case "arobella":
      return renderArobellaPositives(payload, opts);
    case "feeding_tube_change":
      return renderFeedingTubeChangePositives(payload, opts);
    case "urinary_catheter_replacement":
      return renderUrinaryCatheterReplacementPositives(payload, opts);
    default:
      // Unknown procedure_type: fall through to a generic walk so the PDF
      // still surfaces *something* rather than silently dropping data.
      return renderPositives(payload, undefined, opts).map(
        ({ label, value }) => `${label}: ${value}`
      );
  }
}

// ---------------------------------------------------------------------------
// Per-procedure renderers
// ---------------------------------------------------------------------------

// Internal helpers shared by every per-procedure renderer. We pull values
// defensively because the JSONB payload is not statically typed.

function get(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Push `text` onto `bullets` only when `text` is a positive finding. */
function pushIf(bullets: string[], text: string): void {
  if (isPositive(text)) bullets.push(text);
}

// --- sharp_debridement ----------------------------------------------------
// Shape: see `components/visits/procedures/sharp-debridement-doc.tsx`.

function renderSharpDebridementPositives(
  payload: Record<string, unknown>,
  opts: PositiveOptions
): string[] {
  const bullets: string[] = [];

  // Size (cm) + undermining / tunneling flags.
  const dims = [
    asNumber(get(payload, ["size", "lengthCm"])),
    asNumber(get(payload, ["size", "widthCm"])),
    asNumber(get(payload, ["size", "depthCm"])),
  ].filter((n): n is number => isPositive(n, opts));
  if (dims.length > 0) {
    bullets.push(`Size: ${dims.join(" × ")} cm`);
  }
  if (get(payload, ["size", "undermining"]) === true) {
    bullets.push("Undermining present");
  }
  if (get(payload, ["size", "tunneling"]) === true) {
    bullets.push("Tunneling present");
  }

  // Wound bed composition — granulation / slough / fibrotic / eschar.
  const bed: Array<[string, unknown]> = [
    ["Granulation", get(payload, ["woundBed", "granulationPct"])],
    ["Slough", get(payload, ["woundBed", "sloughPct"])],
    ["Fibrotic", get(payload, ["woundBed", "fibroticPct"])],
    ["Eschar", get(payload, ["woundBed", "escharPct"])],
  ];
  for (const [label, raw] of bed) {
    const n = asNumber(raw);
    if (isPositive(n, opts)) bullets.push(`${label}: ${n}%`);
  }

  // Procedure detail.
  const instruments = asStringArray(get(payload, ["procedure", "instruments"]));
  const instrumentsOther = asString(
    get(payload, ["procedure", "instrumentsOther"])
  );
  const allInstruments = [
    ...instruments,
    ...(isPositive(instrumentsOther) ? [instrumentsOther] : []),
  ].filter((s) => isPositive(s));
  if (allInstruments.length > 0) {
    bullets.push(`Instruments used: ${allInstruments.join(", ")}`);
  }

  const tissue = asStringArray(get(payload, ["procedure", "tissueRemoved"]))
    .filter((s) => isPositive(s));
  if (tissue.length > 0) {
    bullets.push(`Tissue removed: ${tissue.join(", ")}`);
  }

  const bleeding = asString(get(payload, ["procedure", "bleeding"]));
  pushIf(bullets, isPositive(bleeding) ? `Bleeding: ${bleeding}` : "");

  const tolerance = asString(get(payload, ["procedure", "tolerance"]));
  pushIf(
    bullets,
    isPositive(tolerance) ? `Patient tolerance: ${tolerance}` : ""
  );

  const notes = asString(get(payload, ["procedure", "notes"]));
  pushIf(bullets, isPositive(notes) ? `Notes: ${notes}` : "");

  // Visible structures / wound edges / periwound — chip lists.
  const visible = asStringArray(get(payload, ["visibleStructures"]))
    .filter((s) => isPositive(s));
  if (visible.length > 0) {
    bullets.push(`Visible structures: ${visible.join(", ")}`);
  }
  const edges = asStringArray(get(payload, ["woundEdges"]))
    .filter((s) => isPositive(s));
  if (edges.length > 0) {
    bullets.push(`Wound edges: ${edges.join(", ")}`);
  }
  const periwound = asStringArray(get(payload, ["periwound"]))
    .filter((s) => isPositive(s));
  if (periwound.length > 0) {
    bullets.push(`Periwound: ${periwound.join(", ")}`);
  }

  // Pain — level + description.
  const painLevel = asNumber(get(payload, ["pain", "level"]));
  if (isPositive(painLevel, opts)) {
    bullets.push(`Pain level: ${painLevel}/10`);
  }
  const painDescription = asString(get(payload, ["pain", "description"]));
  pushIf(
    bullets,
    isPositive(painDescription) ? `Pain description: ${painDescription}` : ""
  );

  return bullets;
}

// --- biologic_graft -------------------------------------------------------
// Shape: see `components/visits/procedures/biologic-graft-doc.tsx`.

function renderBiologicGraftPositives(
  payload: Record<string, unknown>,
  opts: PositiveOptions
): string[] {
  const bullets: string[] = [];

  // Application type + product name — the two top-line "what was placed".
  const appType = asString(get(payload, ["application", "type"]));
  pushIf(bullets, isPositive(appType) ? `Application type: ${appType}` : "");

  const product = asString(get(payload, ["application", "productName"]));
  pushIf(bullets, isPositive(product) ? `Product: ${product}` : "");

  // Initial / current measurements — collapsed to a single line each.
  for (const which of ["initial", "current"] as const) {
    const date = asString(get(payload, ["indications", which, "date"]));
    const dims = [
      asNumber(get(payload, ["indications", which, "lengthCm"])),
      asNumber(get(payload, ["indications", which, "widthCm"])),
      asNumber(get(payload, ["indications", which, "depthCm"])),
    ].filter((n): n is number => isPositive(n, opts));
    if (dims.length > 0 || isPositive(date)) {
      const label = which === "initial" ? "Initial measurement" : "Current measurement";
      const parts: string[] = [];
      if (dims.length > 0) parts.push(`${dims.join(" × ")} cm`);
      if (isPositive(date)) parts.push(`on ${date}`);
      bullets.push(`${label}: ${parts.join(" ")}`);
    }
  }

  // Trend sentence — only emitted when at least one half is filled in.
  const saTrend = asString(get(payload, ["indications", "trend", "surfaceArea"]));
  const saBy = asNumber(get(payload, ["indications", "trend", "surfaceAreaBy"]));
  if (isPositive(saTrend) || isPositive(saBy, opts)) {
    const tail = isPositive(saBy, opts) ? ` by ${saBy}` : "";
    bullets.push(`Surface area has ${saTrend || "changed"}${tail}`.trim());
  }
  const depthTrend = asString(get(payload, ["indications", "trend", "depth"]));
  const depthBy = asNumber(get(payload, ["indications", "trend", "depthBy"]));
  if (isPositive(depthTrend) || isPositive(depthBy, opts)) {
    const tail = isPositive(depthBy, opts) ? ` by ${depthBy}` : "";
    bullets.push(`Depth has ${depthTrend || "changed"}${tail}`.trim());
  }

  // Lab values — each renders its own bullet because they're independently
  // clinically meaningful.
  const labs: Array<[string, unknown, string]> = [
    ["HbA1c", get(payload, ["labs", "hba1c"]), "%"],
    ["Albumin", get(payload, ["labs", "albumin"]), " g/dL"],
    ["Prealbumin", get(payload, ["labs", "prealbumin"]), " mg/dL"],
  ];
  for (const [label, raw, unit] of labs) {
    const n = asNumber(raw);
    if (isPositive(n, opts)) bullets.push(`${label}: ${n}${unit}`);
  }

  // Allograft sheets used — preset sizes + custom. A sheet count of 0 is
  // explicitly NOT printed (matches the default `renderPositiveNumber=false`
  // semantics — Dr. May does not want "0 sheets" on the leave-behind).
  const preset = get(payload, ["sheets", "preset"]);
  if (preset && typeof preset === "object" && !Array.isArray(preset)) {
    const sheetParts: string[] = [];
    for (const [size, count] of Object.entries(
      preset as Record<string, unknown>
    )) {
      const n = asNumber(count);
      if (isPositive(n, opts)) sheetParts.push(`${size} cm × ${n}`);
    }
    if (sheetParts.length > 0) {
      bullets.push(`Sheets used: ${sheetParts.join(", ")}`);
    }
  }
  const customL = asNumber(get(payload, ["sheets", "customLengthCm"]));
  const customW = asNumber(get(payload, ["sheets", "customWidthCm"]));
  const customCount = asNumber(get(payload, ["sheets", "customCount"]));
  if (
    isPositive(customL, opts) ||
    isPositive(customW, opts) ||
    isPositive(customCount, opts)
  ) {
    const dimPart =
      isPositive(customL, opts) && isPositive(customW, opts)
        ? `${customL} × ${customW} cm`
        : isPositive(customL, opts)
          ? `${customL} cm`
          : isPositive(customW, opts)
            ? `${customW} cm`
            : "custom size";
    const countPart = isPositive(customCount, opts) ? ` × ${customCount}` : "";
    bullets.push(`Custom sheets: ${dimPart}${countPart}`);
  }

  // Additional notes.
  const notes = asString(get(payload, ["additionalNotes"]));
  pushIf(bullets, isPositive(notes) ? `Notes: ${notes}` : "");

  return bullets;
}

// --- arobella ------------------------------------------------------------
// Shape: see `components/visits/procedures/arobella-doc.tsx`.

function renderArobellaPositives(
  payload: Record<string, unknown>,
  opts: PositiveOptions
): string[] {
  const bullets: string[] = [];

  // Location & duration sentence.
  const location = asString(payload.location);
  pushIf(bullets, isPositive(location) ? `Location: ${location}` : "");

  const yr = asNumber(payload.duration_yr);
  const mo = asNumber(payload.duration_mo);
  const wk = asNumber(payload.duration_wk);
  const durParts: string[] = [];
  if (isPositive(yr, opts)) durParts.push(`${yr} yr`);
  if (isPositive(mo, opts)) durParts.push(`${mo} mo`);
  if (isPositive(wk, opts)) durParts.push(`${wk} wk`);
  if (durParts.length > 0) {
    bullets.push(`Duration: ${durParts.join(" ")}`);
  }

  // Type & depth.
  const woundType = asString(payload.wound_type);
  pushIf(bullets, isPositive(woundType) ? `Wound type: ${woundType}` : "");
  const depth = asString(payload.depth);
  pushIf(bullets, isPositive(depth) ? `Depth: ${depth}` : "");

  // Size & features.
  const sizeDims = [
    asNumber(payload.size_length_cm),
    asNumber(payload.size_width_cm),
    asNumber(payload.size_depth_cm),
  ].filter((n): n is number => isPositive(n, opts));
  if (sizeDims.length > 0) {
    bullets.push(`Size: ${sizeDims.join(" × ")} cm`);
  }
  const sizeFeatures = asStringArray(payload.size_features).filter((s) =>
    isPositive(s)
  );
  if (sizeFeatures.length > 0) {
    bullets.push(`Size features: ${sizeFeatures.join(", ")}`);
  }

  // Wound bed %.
  const bed: Array<[string, unknown]> = [
    ["Granulation", payload.bed_granulation_pct],
    ["Slough", payload.bed_slough_pct],
    ["Fibrotic", payload.bed_fibrotic_pct],
    ["Eschar", payload.bed_eschar_pct],
  ];
  for (const [label, raw] of bed) {
    const n = asNumber(raw);
    if (isPositive(n, opts)) bullets.push(`${label}: ${n}%`);
  }

  // Edges / periwound.
  const edges = asStringArray(payload.wound_edges).filter((s) => isPositive(s));
  if (edges.length > 0) bullets.push(`Wound edges: ${edges.join(", ")}`);
  const periwound = asStringArray(payload.periwound).filter((s) =>
    isPositive(s)
  );
  if (periwound.length > 0) bullets.push(`Periwound: ${periwound.join(", ")}`);

  // Pain.
  const painLevel = asNumber(payload.pain_level);
  if (isPositive(painLevel, opts)) bullets.push(`Pain level: ${painLevel}/10`);
  const painDescription = asString(payload.pain_description);
  pushIf(
    bullets,
    isPositive(painDescription) ? `Pain description: ${painDescription}` : ""
  );

  // Visit details — date / frequency / place.
  const visitDate = asString(payload.visit_date);
  pushIf(bullets, isPositive(visitDate) ? `Visit date: ${visitDate}` : "");
  const visitFreq = asString(payload.visit_frequency);
  pushIf(
    bullets,
    isPositive(visitFreq) ? `Treatment frequency: ${visitFreq}` : ""
  );
  const visitPlace = asString(payload.visit_place);
  pushIf(
    bullets,
    isPositive(visitPlace) ? `Place of treatment: ${visitPlace}` : ""
  );

  // Treatment response.
  const patientResponse = asStringArray(payload.patient_response).filter((s) =>
    isPositive(s)
  );
  if (patientResponse.length > 0) {
    bullets.push(`Patient response: ${patientResponse.join(", ")}`);
  }
  const woundResponse = asStringArray(payload.wound_response).filter((s) =>
    isPositive(s)
  );
  if (woundResponse.length > 0) {
    bullets.push(`Wound response: ${woundResponse.join(", ")}`);
  }

  return bullets;
}

// --- feeding_tube_change --------------------------------------------------
// Shape: see `components/visits/procedures/feeding-tube-change-doc.tsx`.

function renderFeedingTubeChangePositives(
  payload: Record<string, unknown>,
  opts: PositiveOptions
): string[] {
  const bullets: string[] = [];

  const procedureTypes = asStringArray(payload.procedureTypes).filter((s) =>
    isPositive(s)
  );
  if (procedureTypes.length > 0) {
    bullets.push(`Procedure type: ${procedureTypes.join(", ")}`);
  }

  const lastReplacementDate = asString(payload.lastReplacementDate);
  pushIf(
    bullets,
    isPositive(lastReplacementDate)
      ? `Last replacement date: ${lastReplacementDate}`
      : ""
  );

  const abdominalExam = asStringArray(payload.abdominalExam).filter((s) =>
    isPositive(s)
  );
  if (abdominalExam.length > 0) {
    bullets.push(`Abdominal exam: ${abdominalExam.join(", ")}`);
  }

  const previousTubeType = asStringArray(payload.previousTubeType).filter(
    (s) => isPositive(s)
  );
  if (previousTubeType.length > 0) {
    bullets.push(`Previous tube type: ${previousTubeType.join(", ")}`);
  }

  const periTubeFindings = asStringArray(payload.periTubeFindings).filter(
    (s) => isPositive(s)
  );
  if (periTubeFindings.length > 0) {
    bullets.push(`Peri-tube findings: ${periTubeFindings.join(", ")}`);
  }

  // New tube spec.
  const newTubeSizeFr = asString(payload.newTubeSizeFr);
  pushIf(
    bullets,
    isPositive(newTubeSizeFr) ? `New tube size: ${newTubeSizeFr} Fr` : ""
  );
  const newTubeBalloonCc = asString(payload.newTubeBalloonCc);
  pushIf(
    bullets,
    isPositive(newTubeBalloonCc)
      ? `New tube balloon: ${newTubeBalloonCc} cc`
      : ""
  );
  const newSiliconeSizeFr = asString(payload.newSiliconeSizeFr);
  pushIf(
    bullets,
    isPositive(newSiliconeSizeFr)
      ? `New silicone tube: ${newSiliconeSizeFr} Fr`
      : ""
  );

  const reasons = asStringArray(payload.reasonsForReplacement).filter((s) =>
    isPositive(s)
  );
  if (reasons.length > 0) {
    bullets.push(`Reason for replacement: ${reasons.join(", ")}`);
  }

  const placementVerification = asStringArray(
    payload.placementVerification
  ).filter((s) => isPositive(s));
  if (placementVerification.length > 0) {
    bullets.push(
      `Placement verification: ${placementVerification.join(", ")}`
    );
  }

  const feedingInstructions = asStringArray(
    payload.feedingInstructions
  ).filter((s) => isPositive(s));
  if (feedingInstructions.length > 0) {
    bullets.push(`Feeding instructions: ${feedingInstructions.join(", ")}`);
  }

  // Procedure note — booleans + measured values. Only positive ones surface.
  if (payload.benzocaineApplied === true) {
    bullets.push("Benzocaine applied");
  }
  const removalResistance = asStringArray(payload.removalResistance).filter(
    (s) => isPositive(s)
  );
  if (removalResistance.length > 0) {
    bullets.push(`Removal resistance: ${removalResistance.join(", ")}`);
  }
  const removalBleedingCc = asString(payload.removalBleedingCc);
  pushIf(
    bullets,
    isPositive(removalBleedingCc)
      ? `Removal bleeding: ${removalBleedingCc} cc`
      : ""
  );
  const salineInstilledCc = asString(payload.salineInstilledCc);
  pushIf(
    bullets,
    isPositive(salineInstilledCc)
      ? `Saline instilled: ${salineInstilledCc} cc`
      : ""
  );
  if (payload.hypergranulationTreated === true) {
    bullets.push("Hypergranulation treated");
    const silverNitrate = asString(payload.silverNitrateSticks);
    pushIf(
      bullets,
      isPositive(silverNitrate)
        ? `Silver nitrate sticks: ${silverNitrate}`
        : ""
    );
  }
  const tolerance = asStringArray(payload.toleranceOptions).filter((s) =>
    isPositive(s)
  );
  if (tolerance.length > 0) {
    bullets.push(`Patient tolerance: ${tolerance.join(", ")}`);
  }
  if (payload.postProcedureDressing === true) {
    const days = asString(payload.postProcedureDressingDays);
    bullets.push(
      isPositive(days)
        ? `Post-procedure dressing for ${days} day(s)`
        : "Post-procedure dressing applied"
    );
  }

  const comments = asString(payload.comments);
  pushIf(bullets, isPositive(comments) ? `Comments: ${comments}` : "");

  const nextReplacementDate = asString(payload.nextReplacementDate);
  pushIf(
    bullets,
    isPositive(nextReplacementDate)
      ? `Next replacement date: ${nextReplacementDate}`
      : ""
  );

  // Silence "unused parameter" — `opts` is used inside isPositive calls above.
  void opts;
  return bullets;
}

// --- urinary_catheter_replacement -----------------------------------------
// Shape: see `components/visits/procedures/urinary-catheter-doc.tsx`.

function renderUrinaryCatheterReplacementPositives(
  payload: Record<string, unknown>,
  opts: PositiveOptions
): string[] {
  const bullets: string[] = [];

  const comorbidities = asStringArray(payload.comorbidities).filter((s) =>
    isPositive(s)
  );
  const comorbiditiesOther = asString(payload.comorbiditiesOther);
  const allComorbidities = [
    ...comorbidities,
    ...(isPositive(comorbiditiesOther) ? [comorbiditiesOther] : []),
  ];
  if (allComorbidities.length > 0) {
    bullets.push(`Comorbidities: ${allComorbidities.join(", ")}`);
  }

  const discussion = asString(payload.discussion);
  pushIf(bullets, isPositive(discussion) ? `Discussion: ${discussion}` : "");

  const procedurePerformed = asStringArray(payload.procedurePerformed).filter(
    (s) => isPositive(s)
  );
  const procedurePerformedOther = asString(payload.procedurePerformedOther);
  const allProcedures = [
    ...procedurePerformed,
    ...(isPositive(procedurePerformedOther) ? [procedurePerformedOther] : []),
  ];
  if (allProcedures.length > 0) {
    bullets.push(`Procedure performed: ${allProcedures.join(", ")}`);
  }

  // Abdominal exam — chip list + tender/nontender + other.
  const abdominalExam = asStringArray(payload.abdominalExam).filter((s) =>
    isPositive(s)
  );
  if (abdominalExam.length > 0) {
    bullets.push(`Abdominal exam: ${abdominalExam.join(", ")}`);
  }
  const tenderness = asString(payload.abdominalDistendedTenderness);
  pushIf(
    bullets,
    isPositive(tenderness) ? `Abdominal tenderness: ${tenderness}` : ""
  );
  const abdominalExamOther = asString(payload.abdominalExamOther);
  pushIf(
    bullets,
    isPositive(abdominalExamOther)
      ? `Abdominal exam (other): ${abdominalExamOther}`
      : ""
  );

  // Catheter placement.
  const catheterPlacement = asStringArray(payload.catheterPlacement).filter(
    (s) => isPositive(s)
  );
  const catheterPlacementOther = asString(payload.catheterPlacementOther);
  const allPlacement = [
    ...catheterPlacement,
    ...(isPositive(catheterPlacementOther) ? [catheterPlacementOther] : []),
  ];
  if (allPlacement.length > 0) {
    bullets.push(`Catheter placement: ${allPlacement.join(", ")}`);
  }

  // Peri-tube findings.
  const periTube = asStringArray(payload.periTubeFindings).filter((s) =>
    isPositive(s)
  );
  const periTubeOther = asString(payload.periTubeFindingsOther);
  const allPeriTube = [
    ...periTube,
    ...(isPositive(periTubeOther) ? [periTubeOther] : []),
  ];
  if (allPeriTube.length > 0) {
    bullets.push(`Peri-tube findings: ${allPeriTube.join(", ")}`);
  }

  // Last placement date — `unknown` flag is itself a positive finding.
  const lastPlacementDate = asString(payload.lastPlacementDate);
  if (isPositive(lastPlacementDate)) {
    bullets.push(`Last placement date: ${lastPlacementDate}`);
  } else if (payload.lastPlacementUnknown === true) {
    bullets.push("Last placement date: unknown");
  }

  // Replacement Foley spec.
  const replacementSizeFr = asString(payload.replacementSizeFr);
  pushIf(
    bullets,
    isPositive(replacementSizeFr)
      ? `Replacement Foley size: ${replacementSizeFr} Fr`
      : ""
  );
  if (payload.balloonType === true) {
    bullets.push("Balloon-tipped Foley");
  }
  const balloonCapacityCc = asString(payload.balloonCapacityCc);
  pushIf(
    bullets,
    isPositive(balloonCapacityCc)
      ? `Balloon capacity: ${balloonCapacityCc} cc`
      : ""
  );

  // Reason for replacement.
  const reasons = asStringArray(payload.reasonForReplacement).filter((s) =>
    isPositive(s)
  );
  const reasonsOther = asString(payload.reasonForReplacementOther);
  const allReasons = [
    ...reasons,
    ...(isPositive(reasonsOther) ? [reasonsOther] : []),
  ];
  if (allReasons.length > 0) {
    bullets.push(`Reason for replacement: ${allReasons.join(", ")}`);
  }

  // Procedure note — only the positive bits.
  if (payload.consentObtained === true) {
    bullets.push("Consent obtained");
  }
  const consentReasons = asStringArray(payload.consentReasons).filter((s) =>
    isPositive(s)
  );
  const consentReasonsOther = asString(payload.consentReasonsOther);
  const allConsentReasons = [
    ...consentReasons,
    ...(isPositive(consentReasonsOther) ? [consentReasonsOther] : []),
  ];
  if (allConsentReasons.length > 0) {
    bullets.push(`Consent reasons: ${allConsentReasons.join(", ")}`);
  }

  const oldFoleyNotes = asStringArray(payload.oldFoleyRemovalNotes).filter(
    (s) => isPositive(s)
  );
  if (oldFoleyNotes.length > 0) {
    bullets.push(`Old Foley removal: ${oldFoleyNotes.join(", ")}`);
  }
  const oldFoleyBleedingCc = asString(payload.oldFoleyBleedingCc);
  pushIf(
    bullets,
    isPositive(oldFoleyBleedingCc)
      ? `Old Foley bleeding: ${oldFoleyBleedingCc} cc`
      : ""
  );

  const newFoleySizeFr = asString(payload.newFoleySizeFr);
  pushIf(
    bullets,
    isPositive(newFoleySizeFr) ? `New Foley size: ${newFoleySizeFr} Fr` : ""
  );
  const newFoleyRoute = asStringArray(payload.newFoleyRoute).filter((s) =>
    isPositive(s)
  );
  const newFoleyRouteOther = asString(payload.newFoleyRouteOther);
  const allNewFoleyRoute = [
    ...newFoleyRoute,
    ...(isPositive(newFoleyRouteOther) ? [newFoleyRouteOther] : []),
  ];
  if (allNewFoleyRoute.length > 0) {
    bullets.push(`New Foley route: ${allNewFoleyRoute.join(", ")}`);
  }
  const newFoleySalineCc = asString(payload.newFoleySalineCc);
  pushIf(
    bullets,
    isPositive(newFoleySalineCc)
      ? `New Foley saline: ${newFoleySalineCc} cc`
      : ""
  );

  if (payload.noVisibleBleeding === true) {
    bullets.push("No visible bleeding");
  }
  if (payload.bleedingControlled === true) {
    bullets.push("Bleeding controlled");
  }

  void opts;
  return bullets;
}
