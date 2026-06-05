"use client";

// Phase 3 — inline documentation for the "Arobella treatment" procedure.
//
// Mirrors Form 1 / "Arobella treatment" tab of Dr. May's 2026-05-29 artifact:
//   - Location & duration of the wound
//   - Wound type + depth
//   - Size (LxWxD) + undermining / tunneling chips
//   - Wound bed composition (Granulation/Slough/Fibrotic/Eschar %)
//   - Wound edges + periwound skin chips
//   - Pain (0-10) + descriptor
//   - Visit details (date / frequency / place)
//   - Treatment response chips + free-text observation
//
// Persistence is handled by the parent — this component is a controlled form
// that calls `onChange(payload)` on every edit. Payload key naming uses
// snake_case for parity with the saved JSON in
// `procedure_documentation.payload` (see app/actions/procedures.ts).
//
// All input/control IDs are prefixed `ar-` so that multiple per-procedure
// docs can coexist on the same assessment page without label collisions.

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Option lists — exported as `as const` so consumers (and persistence layer
// snapshots) can refer back to the canonical option strings.
// ---------------------------------------------------------------------------

const WOUND_TYPE_OPTIONS = [
  "Diabetic foot ulcer",
  "Venous leg ulcer",
  "Arterial ulcer",
  "Pressure injury",
  "Surgical wound",
  "Traumatic wound",
  "Mixed etiology",
  "Other",
] as const;

const DEPTH_OPTIONS = [
  "Superficial (epidermis)",
  "Partial thickness",
  "Full thickness",
  "Subcutaneous tissue",
  "Fascia / muscle",
  "Bone / joint",
] as const;

const SIZE_FEATURE_CHIPS = ["Undermining", "Tunneling"] as const;

const WOUND_EDGE_CHIPS = [
  "Attached",
  "Unattached",
  "Calloused",
  "Rolled",
  "Epibole",
] as const;

const PERIWOUND_CHIPS = [
  "Healthy",
  "Macerated",
  "Inflamed",
  "Calloused",
  "Other",
] as const;

const FREQUENCY_OPTIONS = [
  "1x per session",
  "2x per session",
  "3x per session",
] as const;

const PLACE_OPTIONS = [
  "Office",
  "Home",
  "SNF",
  "ALF",
  "Hospital",
  "Other",
] as const;

const PATIENT_RESPONSE_CHIPS = [
  "Tolerated well",
  "Mild discomfort",
  "Pain during treatment",
  "Treatment paused",
] as const;

const WOUND_RESPONSE_CHIPS = [
  "Debridement achieved",
  "Biofilm disruption noted",
  "Exudate loosened",
  "Bleeding noted",
] as const;

// ---------------------------------------------------------------------------
// Shape of the payload we read/write. All keys optional so that partial
// payloads (mid-edit) and legacy payloads (missing newer keys) round-trip
// safely through `initial`.
// ---------------------------------------------------------------------------

type ArobellaPayload = {
  // 1. Location & duration
  location?: string;
  duration_yr?: number | "";
  duration_mo?: number | "";
  duration_wk?: number | "";

  // 2. Type & depth
  wound_type?: (typeof WOUND_TYPE_OPTIONS)[number] | "";
  depth?: (typeof DEPTH_OPTIONS)[number] | "";

  // 3. Size & features
  size_length_cm?: number | "";
  size_width_cm?: number | "";
  size_depth_cm?: number | "";
  size_features?: (typeof SIZE_FEATURE_CHIPS)[number][];

  // 4. Wound bed %
  bed_granulation_pct?: number | "";
  bed_slough_pct?: number | "";
  bed_fibrotic_pct?: number | "";
  bed_eschar_pct?: number | "";

  // 5. Wound edges
  wound_edges?: (typeof WOUND_EDGE_CHIPS)[number][];

  // 6. Periwound skin
  periwound?: (typeof PERIWOUND_CHIPS)[number][];

  // 7. Pain
  pain_level?: number | "";
  pain_description?: string;

  // 8. Visit details
  visit_date?: string;
  visit_frequency?: (typeof FREQUENCY_OPTIONS)[number] | "";
  visit_place?: (typeof PLACE_OPTIONS)[number] | "";

  // 9. Treatment response
  patient_response?: (typeof PATIENT_RESPONSE_CHIPS)[number][];
  wound_response?: (typeof WOUND_RESPONSE_CHIPS)[number][];
  observations?: string;
};

type ArobellaDocProps = {
  assessmentId: string;
  initial: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
  readOnly?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Narrow an unknown initial value to a string array of allowed members. */
function pickChips<T extends string>(
  raw: unknown,
  allowed: readonly T[]
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is T => allowed.includes(v as T));
}

/** Narrow a single allowed enum value, otherwise "". */
function pickEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[]
): T | "" {
  return typeof raw === "string" && allowed.includes(raw as T)
    ? (raw as T)
    : "";
}

/**
 * Normalize an incoming number-ish value. We keep "" for empty inputs so the
 * Input component shows a blank cell rather than "0".
 */
function pickNumber(raw: unknown): number | "" {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return "";
}

function pickString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

/**
 * Build a sanitized {@link ArobellaPayload} from the loose `initial` prop.
 * Defensive — `initial` is `Record<string, unknown>` because it round-trips
 * through `procedure_documentation.payload` (jsonb).
 */
function normalizeInitial(initial: Record<string, unknown>): ArobellaPayload {
  return {
    location: pickString(initial.location),
    duration_yr: pickNumber(initial.duration_yr),
    duration_mo: pickNumber(initial.duration_mo),
    duration_wk: pickNumber(initial.duration_wk),

    wound_type: pickEnum(initial.wound_type, WOUND_TYPE_OPTIONS),
    depth: pickEnum(initial.depth, DEPTH_OPTIONS),

    size_length_cm: pickNumber(initial.size_length_cm),
    size_width_cm: pickNumber(initial.size_width_cm),
    size_depth_cm: pickNumber(initial.size_depth_cm),
    size_features: pickChips(initial.size_features, SIZE_FEATURE_CHIPS),

    bed_granulation_pct: pickNumber(initial.bed_granulation_pct),
    bed_slough_pct: pickNumber(initial.bed_slough_pct),
    bed_fibrotic_pct: pickNumber(initial.bed_fibrotic_pct),
    bed_eschar_pct: pickNumber(initial.bed_eschar_pct),

    wound_edges: pickChips(initial.wound_edges, WOUND_EDGE_CHIPS),
    periwound: pickChips(initial.periwound, PERIWOUND_CHIPS),

    pain_level: pickNumber(initial.pain_level),
    pain_description: pickString(initial.pain_description),

    visit_date: pickString(initial.visit_date),
    visit_frequency: pickEnum(initial.visit_frequency, FREQUENCY_OPTIONS),
    visit_place: pickEnum(initial.visit_place, PLACE_OPTIONS),

    patient_response: pickChips(initial.patient_response, PATIENT_RESPONSE_CHIPS),
    wound_response: pickChips(initial.wound_response, WOUND_RESPONSE_CHIPS),
    observations: pickString(initial.observations),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </section>
  );
}

function ChipGroup<T extends string>({
  idPrefix,
  options,
  values,
  onToggle,
  readOnly,
}: {
  idPrefix: string;
  options: readonly T[];
  values: T[];
  onToggle: (option: T) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((opt) => {
        const active = values.includes(opt);
        const id = `${idPrefix}-${opt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        return (
          <button
            key={opt}
            id={id}
            type="button"
            disabled={readOnly}
            aria-pressed={active}
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ArobellaDoc
// ---------------------------------------------------------------------------

/**
 * Inline documentation form for the Arobella ultrasonic-mist treatment.
 *
 * Controlled — every edit recomputes the full payload and calls `onChange`
 * so the parent can debounce/save against
 * {@link saveProcedureDocumentation}. We intentionally do not own a "Save"
 * button here; the chip's parent screen drives that.
 */
export function ArobellaDoc({
  // assessmentId is currently used only as a stable namespace hint for the
  // caller — the form itself does not need to know the row id, but we accept
  // it to keep the prop shape uniform across all per-procedure docs.
  assessmentId: _assessmentId,
  initial,
  onChange,
  readOnly = false,
}: ArobellaDocProps) {
  const [payload, setPayload] = useState<ArobellaPayload>(() =>
    normalizeInitial(initial)
  );

  // Disable the whole form when readOnly. Memoize so we can also tag the
  // fieldset; this avoids a per-field `disabled={readOnly}`.
  const fieldsetDisabled = useMemo(() => Boolean(readOnly), [readOnly]);

  /**
   * Apply a partial update, then bubble the *fully sanitized* payload up.
   * We funnel every mutation through this single helper so the on-the-wire
   * shape matches what {@link normalizeInitial} would produce.
   */
  function update<K extends keyof ArobellaPayload>(
    key: K,
    value: ArobellaPayload[K]
  ): void {
    setPayload((prev) => {
      const next = { ...prev, [key]: value };
      onChange(next as Record<string, unknown>);
      return next;
    });
  }

  function toggleChip<T extends string>(
    key: keyof ArobellaPayload,
    option: T,
    current: T[]
  ): void {
    const exists = current.includes(option);
    const next = exists ? current.filter((v) => v !== option) : [...current, option];
    // `update` is typed per-key so cast through unknown for the chip arrays.
    update(key, next as unknown as ArobellaPayload[typeof key]);
  }

  /**
   * Coerce an `<input type="number">` event into either a number or "".
   * Empty input must stay "" — see {@link pickNumber}.
   */
  function onNumberInput(
    key: keyof ArobellaPayload,
    raw: string,
    opts?: { min?: number; max?: number }
  ): void {
    if (raw === "") {
      update(key, "" as ArobellaPayload[typeof key]);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    let clamped = n;
    if (opts?.min !== undefined) clamped = Math.max(opts.min, clamped);
    if (opts?.max !== undefined) clamped = Math.min(opts.max, clamped);
    update(key, clamped as ArobellaPayload[typeof key]);
  }

  return (
    <fieldset
      disabled={fieldsetDisabled}
      className="space-y-6 disabled:opacity-70"
    >
      {/* 1. LOCATION & DURATION ------------------------------------------- */}
      <Section title="Location & duration">
        <div className="space-y-2">
          <Label htmlFor="ar-location">Location</Label>
          <Input
            id="ar-location"
            type="text"
            placeholder="e.g. Left lateral ankle"
            value={payload.location ?? ""}
            onChange={(e) => update("location", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ar-duration-yr">Duration</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ar-duration-yr"
                type="number"
                inputMode="numeric"
                min={0}
                value={payload.duration_yr ?? ""}
                onChange={(e) =>
                  onNumberInput("duration_yr", e.target.value, { min: 0 })
                }
              />
              <span className="text-xs text-muted-foreground">yr</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-duration-mo" className="sr-only">
              Duration (months)
            </Label>
            <div className="flex items-end gap-2 pt-6">
              <Input
                id="ar-duration-mo"
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                value={payload.duration_mo ?? ""}
                onChange={(e) =>
                  onNumberInput("duration_mo", e.target.value, {
                    min: 0,
                    max: 11,
                  })
                }
              />
              <span className="text-xs text-muted-foreground">mo</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-duration-wk" className="sr-only">
              Duration (weeks)
            </Label>
            <div className="flex items-end gap-2 pt-6">
              <Input
                id="ar-duration-wk"
                type="number"
                inputMode="numeric"
                min={0}
                max={51}
                value={payload.duration_wk ?? ""}
                onChange={(e) =>
                  onNumberInput("duration_wk", e.target.value, {
                    min: 0,
                    max: 51,
                  })
                }
              />
              <span className="text-xs text-muted-foreground">wk</span>
            </div>
          </div>
        </div>
      </Section>

      {/* 2. TYPE & DEPTH -------------------------------------------------- */}
      <Section title="Type & depth">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ar-wound-type">Wound type</Label>
            <Select
              value={payload.wound_type || undefined}
              onValueChange={(v) =>
                update("wound_type", v as ArobellaPayload["wound_type"])
              }
              disabled={fieldsetDisabled}
            >
              <SelectTrigger id="ar-wound-type" className="w-full">
                <SelectValue placeholder="Select wound type" />
              </SelectTrigger>
              <SelectContent>
                {WOUND_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-depth">Depth</Label>
            <Select
              value={payload.depth || undefined}
              onValueChange={(v) =>
                update("depth", v as ArobellaPayload["depth"])
              }
              disabled={fieldsetDisabled}
            >
              <SelectTrigger id="ar-depth" className="w-full">
                <SelectValue placeholder="Select depth" />
              </SelectTrigger>
              <SelectContent>
                {DEPTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* 3. SIZE & FEATURES ----------------------------------------------- */}
      <Section title="Size & features">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ar-size-length">Length (cm)</Label>
            <Input
              id="ar-size-length"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={payload.size_length_cm ?? ""}
              onChange={(e) =>
                onNumberInput("size_length_cm", e.target.value, { min: 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-size-width">Width (cm)</Label>
            <Input
              id="ar-size-width"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={payload.size_width_cm ?? ""}
              onChange={(e) =>
                onNumberInput("size_width_cm", e.target.value, { min: 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-size-depth">Depth (cm)</Label>
            <Input
              id="ar-size-depth"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={payload.size_depth_cm ?? ""}
              onChange={(e) =>
                onNumberInput("size_depth_cm", e.target.value, { min: 0 })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Features</Label>
          <ChipGroup
            idPrefix="ar-feature"
            options={SIZE_FEATURE_CHIPS}
            values={payload.size_features ?? []}
            onToggle={(opt) =>
              toggleChip("size_features", opt, payload.size_features ?? [])
            }
            readOnly={fieldsetDisabled}
          />
        </div>
      </Section>

      {/* 4. WOUND BED ----------------------------------------------------- */}
      <Section title="Wound bed (%)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: "bed_granulation_pct", label: "Granulation" },
              { key: "bed_slough_pct", label: "Slough" },
              { key: "bed_fibrotic_pct", label: "Fibrotic" },
              { key: "bed_eschar_pct", label: "Eschar" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`ar-${key.replace(/_/g, "-")}`}>{label} %</Label>
              <Input
                id={`ar-${key.replace(/_/g, "-")}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={payload[key] ?? ""}
                onChange={(e) =>
                  onNumberInput(key, e.target.value, { min: 0, max: 100 })
                }
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 5. WOUND EDGES --------------------------------------------------- */}
      <Section title="Wound edges">
        <ChipGroup
          idPrefix="ar-edge"
          options={WOUND_EDGE_CHIPS}
          values={payload.wound_edges ?? []}
          onToggle={(opt) =>
            toggleChip("wound_edges", opt, payload.wound_edges ?? [])
          }
          readOnly={fieldsetDisabled}
        />
      </Section>

      {/* 6. PERIWOUND ----------------------------------------------------- */}
      <Section title="Periwound skin">
        <ChipGroup
          idPrefix="ar-periwound"
          options={PERIWOUND_CHIPS}
          values={payload.periwound ?? []}
          onToggle={(opt) =>
            toggleChip("periwound", opt, payload.periwound ?? [])
          }
          readOnly={fieldsetDisabled}
        />
      </Section>

      {/* 7. PAIN ---------------------------------------------------------- */}
      <Section title="Pain">
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="ar-pain-level">Level (0-10)</Label>
            <Input
              id="ar-pain-level"
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={payload.pain_level ?? ""}
              onChange={(e) =>
                onNumberInput("pain_level", e.target.value, { min: 0, max: 10 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-pain-description">Description</Label>
            <Textarea
              id="ar-pain-description"
              rows={3}
              placeholder="Quality, triggers, relieving factors..."
              value={payload.pain_description ?? ""}
              onChange={(e) => update("pain_description", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* 8. VISIT DETAILS ------------------------------------------------- */}
      <Section title="Visit details">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ar-visit-date">Date</Label>
            <Input
              id="ar-visit-date"
              type="date"
              value={payload.visit_date ?? ""}
              onChange={(e) => update("visit_date", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-visit-frequency">Frequency</Label>
            <Select
              value={payload.visit_frequency || undefined}
              onValueChange={(v) =>
                update(
                  "visit_frequency",
                  v as ArobellaPayload["visit_frequency"]
                )
              }
              disabled={fieldsetDisabled}
            >
              <SelectTrigger id="ar-visit-frequency" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ar-visit-place">Place</Label>
            <Select
              value={payload.visit_place || undefined}
              onValueChange={(v) =>
                update("visit_place", v as ArobellaPayload["visit_place"])
              }
              disabled={fieldsetDisabled}
            >
              <SelectTrigger id="ar-visit-place" className="w-full">
                <SelectValue placeholder="Select place" />
              </SelectTrigger>
              <SelectContent>
                {PLACE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* 9. TREATMENT RESPONSE ------------------------------------------- */}
      <Section title="Treatment response">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Patient response
          </Label>
          <ChipGroup
            idPrefix="ar-patient-response"
            options={PATIENT_RESPONSE_CHIPS}
            values={payload.patient_response ?? []}
            onToggle={(opt) =>
              toggleChip(
                "patient_response",
                opt,
                payload.patient_response ?? []
              )
            }
            readOnly={fieldsetDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Wound response
          </Label>
          <ChipGroup
            idPrefix="ar-wound-response"
            options={WOUND_RESPONSE_CHIPS}
            values={payload.wound_response ?? []}
            onToggle={(opt) =>
              toggleChip("wound_response", opt, payload.wound_response ?? [])
            }
            readOnly={fieldsetDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ar-observations">Additional observations</Label>
          <Textarea
            id="ar-observations"
            rows={3}
            placeholder="Anything notable about today's treatment..."
            value={payload.observations ?? ""}
            onChange={(e) => update("observations", e.target.value)}
          />
        </div>
      </Section>
    </fieldset>
  );
}

// Default export so the lazy `dynamic(() => import(...))` loader in
// `components/visits/procedure-chips.tsx` picks up the component without
// the consumer needing to know the named export.
export default ArobellaDoc;
