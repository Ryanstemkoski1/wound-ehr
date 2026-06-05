"use client";

// Phase 3 — inline documentation for the "Biologic graft application" procedure.
//
// Mirrors Form 1 / "Biologic graft application" tab of Dr. May's 2026-05-29
// artifact:
//   - INDICATIONS — wound measurements (initial + current dates / LxWxD) and a
//     plain-language trend description for surface area & depth.
//   - LAB VALUES — HbA1c, Albumin, Prealbumin (the labs CMS asks coverage
//     determinations to lean on for graft medical-necessity).
//   - APPLICATION TYPE & PRODUCT — Initial vs. Follow-up + membrane allograft
//     product name.
//   - ALLOGRAFT SHEETS USED — preset sizes (1x1 → 4x8 cm) plus a custom L×W /
//     count fallback for non-standard cuts.
//   - ADDITIONAL NOTES — free-text observations.
//
// Persistence is owned by the parent form (procedure_documentation.payload).
// We're a controlled component: hydrate from `initial`, emit `onChange(state)`
// on every edit. Re-hydration is keyed on `assessmentId` so a fresh `initial`
// object on each parent render doesn't clobber in-progress edits.
//
// All control IDs are prefixed `bg-` to avoid collisions with sibling
// procedure-doc components rendered inside the same outer <form>.

import { useCallback, useEffect, useState } from "react";

import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Option lists — `as const` so the persisted strings stay canonical.
// ---------------------------------------------------------------------------

const TREND_OPTIONS = ["increased", "decreased", "stayed the same"] as const;

const APPLICATION_TYPE_OPTIONS = ["Initial", "Follow-up"] as const;

/** Preset graft sheet sizes (in cm) per Dr. May's artifact. Stored as the
 *  display label so the saved JSON stays human-readable. */
const SHEET_SIZES = ["1x1", "2x2", "2x3", "4x4", "4x6", "4x8"] as const;

type TrendValue = (typeof TREND_OPTIONS)[number];
type ApplicationType = (typeof APPLICATION_TYPE_OPTIONS)[number];
type SheetSize = (typeof SHEET_SIZES)[number];

// ---------------------------------------------------------------------------
// Shape of the JSON payload emitted via `onChange`.
// Permissive primitive types — caller persists into a `jsonb` column.
// ---------------------------------------------------------------------------

type Measurement = {
  date: string;
  lengthCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
};

type BiologicGraftState = {
  indications: {
    initial: Measurement;
    current: Measurement;
    trend: {
      surfaceArea: TrendValue | null;
      surfaceAreaBy: number | null;
      depth: TrendValue | null;
      depthBy: number | null;
    };
  };
  labs: {
    hba1c: number | null;
    albumin: number | null;
    prealbumin: number | null;
  };
  application: {
    type: ApplicationType | null;
    productName: string;
  };
  sheets: {
    /** Map of preset size label → number of sheets. */
    preset: Record<SheetSize, number | null>;
    customLengthCm: number | null;
    customWidthCm: number | null;
    customCount: number | null;
  };
  additionalNotes: string;
};

function emptyMeasurement(): Measurement {
  return { date: "", lengthCm: null, widthCm: null, depthCm: null };
}

function emptyPreset(): Record<SheetSize, number | null> {
  return SHEET_SIZES.reduce(
    (acc, size) => {
      acc[size] = null;
      return acc;
    },
    {} as Record<SheetSize, number | null>
  );
}

function emptyState(): BiologicGraftState {
  return {
    indications: {
      initial: emptyMeasurement(),
      current: emptyMeasurement(),
      trend: {
        surfaceArea: null,
        surfaceAreaBy: null,
        depth: null,
        depthBy: null,
      },
    },
    labs: { hba1c: null, albumin: null, prealbumin: null },
    application: { type: null, productName: "" },
    sheets: {
      preset: emptyPreset(),
      customLengthCm: null,
      customWidthCm: null,
      customCount: null,
    },
    additionalNotes: "",
  };
}

/**
 * Coerces the loosely-typed `initial` prop (arriving as
 * `Record<string, unknown>` from the JSONB column) into a fully-populated
 * state object. Unknown / mistyped fields silently fall back to defaults so
 * legacy or hand-edited rows never crash the form.
 */
function hydrate(initial: Record<string, unknown>): BiologicGraftState {
  const base = emptyState();
  const src = initial ?? {};

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const trend = (v: unknown): TrendValue | null =>
    typeof v === "string" && (TREND_OPTIONS as readonly string[]).includes(v)
      ? (v as TrendValue)
      : null;
  const appType = (v: unknown): ApplicationType | null =>
    typeof v === "string" &&
    (APPLICATION_TYPE_OPTIONS as readonly string[]).includes(v)
      ? (v as ApplicationType)
      : null;

  const indications = (src.indications ?? {}) as Record<string, unknown>;
  const initMeas = (indications.initial ?? {}) as Record<string, unknown>;
  const currMeas = (indications.current ?? {}) as Record<string, unknown>;
  const trendObj = (indications.trend ?? {}) as Record<string, unknown>;
  const labs = (src.labs ?? {}) as Record<string, unknown>;
  const application = (src.application ?? {}) as Record<string, unknown>;
  const sheets = (src.sheets ?? {}) as Record<string, unknown>;
  const preset = (sheets.preset ?? {}) as Record<string, unknown>;

  const hydratedPreset = emptyPreset();
  for (const size of SHEET_SIZES) {
    hydratedPreset[size] = num(preset[size]);
  }

  return {
    indications: {
      initial: {
        date: str(initMeas.date),
        lengthCm: num(initMeas.lengthCm),
        widthCm: num(initMeas.widthCm),
        depthCm: num(initMeas.depthCm),
      },
      current: {
        date: str(currMeas.date),
        lengthCm: num(currMeas.lengthCm),
        widthCm: num(currMeas.widthCm),
        depthCm: num(currMeas.depthCm),
      },
      trend: {
        surfaceArea: trend(trendObj.surfaceArea),
        surfaceAreaBy: num(trendObj.surfaceAreaBy),
        depth: trend(trendObj.depth),
        depthBy: num(trendObj.depthBy),
      },
    },
    labs: {
      hba1c: num(labs.hba1c),
      albumin: num(labs.albumin),
      prealbumin: num(labs.prealbumin),
    },
    application: {
      type: appType(application.type),
      productName: str(application.productName),
    },
    sheets: {
      preset: hydratedPreset,
      customLengthCm: num(sheets.customLengthCm),
      customWidthCm: num(sheets.customWidthCm),
      customCount: num(sheets.customCount),
    },
    additionalNotes: str(src.additionalNotes) || base.additionalNotes,
  };
}

// ---------------------------------------------------------------------------
// Chip primitive — single-select pill for Application Type. Kept local; sibling
// procedure docs each have their own chip styling and we don't want to lock
// the visual contract in `components/ui` yet.
// ---------------------------------------------------------------------------

type ChipProps = {
  id?: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function Chip({ id, selected, disabled, onToggle, children }: ChipProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-input bg-background text-foreground hover:border-primary/40 hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export type BiologicGraftDocProps = {
  assessmentId: string;
  initial: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
  readOnly?: boolean;
};

/**
 * Inline documentation block for a "Biologic graft application" procedure
 * tagged on a wound assessment. Mirrors Form 1 / "Biologic graft application"
 * tab from Dr. May's Phase-3 artifact. Stateless w.r.t. persistence — the
 * parent owns the round trip to `procedure_documentation`; we just surface a
 * JSON payload via `onChange`.
 */
export function BiologicGraftDoc({
  assessmentId,
  initial,
  onChange,
  readOnly = false,
}: BiologicGraftDocProps) {
  const [state, setState] = useState<BiologicGraftState>(() =>
    hydrate(initial)
  );

  // Re-hydrate only when the caller swaps assessments. We intentionally do NOT
  // depend on `initial` itself — the parent passes a fresh object on every
  // render, which would clobber user input mid-edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setState(hydrate(initial));
  }, [assessmentId]);

  const update = useCallback(
    (mutator: (prev: BiologicGraftState) => BiologicGraftState) => {
      setState((prev) => {
        const next = mutator(prev);
        onChange(next as unknown as Record<string, unknown>);
        return next;
      });
    },
    [onChange]
  );

  // Number-input parser shared by every numeric field below.
  const parseNum = (raw: string): number | null => {
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // Helper for the symmetric initial / current measurement card.
  const renderMeasurement = (
    which: "initial" | "current",
    label: string
  ) => {
    const m = state.indications[which];
    const idPrefix = `bg-meas-${which}`;
    return (
      <div className="space-y-3 rounded-lg border border-border/60 p-3">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-date`}>Date</Label>
            <Input
              id={`${idPrefix}-date`}
              type="date"
              disabled={readOnly}
              value={m.date}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  indications: {
                    ...prev.indications,
                    [which]: { ...prev.indications[which], date: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-length`}>L (cm)</Label>
            <Input
              id={`${idPrefix}-length`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={m.lengthCm ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  indications: {
                    ...prev.indications,
                    [which]: {
                      ...prev.indications[which],
                      lengthCm: parseNum(e.target.value),
                    },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-width`}>W (cm)</Label>
            <Input
              id={`${idPrefix}-width`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={m.widthCm ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  indications: {
                    ...prev.indications,
                    [which]: {
                      ...prev.indications[which],
                      widthCm: parseNum(e.target.value),
                    },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-depth`}>D (cm)</Label>
            <Input
              id={`${idPrefix}-depth`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={m.depthCm ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  indications: {
                    ...prev.indications,
                    [which]: {
                      ...prev.indications[which],
                      depthCm: parseNum(e.target.value),
                    },
                  },
                }))
              }
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. INDICATIONS — WOUND MEASUREMENTS --------------------------- */}
      <CollapsibleCard
        id="bg-indications-card"
        title="Indications — Wound measurements"
        description="Document the initial and current measurements, then summarise the trend in plain language."
      >
        <div className="space-y-3">
          {renderMeasurement("initial", "Initial measurement")}
          {renderMeasurement("current", "Current measurement")}

          {/* Trend description — runs as a single sentence-ish row that
              persists structured fields so the narrative renderer can
              reconstitute it later. */}
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-sm font-semibold text-foreground">Trend</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span>Surface area has</span>
              <Select
                disabled={readOnly}
                value={state.indications.trend.surfaceArea ?? ""}
                onValueChange={(v) =>
                  update((prev) => ({
                    ...prev,
                    indications: {
                      ...prev.indications,
                      trend: {
                        ...prev.indications.trend,
                        surfaceArea: (v as TrendValue) || null,
                      },
                    },
                  }))
                }
              >
                <SelectTrigger
                  id="bg-trend-surface-area"
                  size="sm"
                  className="min-w-[10rem]"
                >
                  <SelectValue placeholder="Select trend…" />
                </SelectTrigger>
                <SelectContent>
                  {TREND_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>by</span>
              <Input
                id="bg-trend-surface-area-by"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                disabled={readOnly}
                className="w-24"
                value={state.indications.trend.surfaceAreaBy ?? ""}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    indications: {
                      ...prev.indications,
                      trend: {
                        ...prev.indications.trend,
                        surfaceAreaBy: parseNum(e.target.value),
                      },
                    },
                  }))
                }
              />
              <span>; depth has</span>
              <Select
                disabled={readOnly}
                value={state.indications.trend.depth ?? ""}
                onValueChange={(v) =>
                  update((prev) => ({
                    ...prev,
                    indications: {
                      ...prev.indications,
                      trend: {
                        ...prev.indications.trend,
                        depth: (v as TrendValue) || null,
                      },
                    },
                  }))
                }
              >
                <SelectTrigger
                  id="bg-trend-depth"
                  size="sm"
                  className="min-w-[10rem]"
                >
                  <SelectValue placeholder="Select trend…" />
                </SelectTrigger>
                <SelectContent>
                  {TREND_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>by</span>
              <Input
                id="bg-trend-depth-by"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                disabled={readOnly}
                className="w-24"
                value={state.indications.trend.depthBy ?? ""}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    indications: {
                      ...prev.indications,
                      trend: {
                        ...prev.indications.trend,
                        depthBy: parseNum(e.target.value),
                      },
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* 2. LAB VALUES ------------------------------------------------- */}
      <CollapsibleCard
        id="bg-labs-card"
        title="Lab values"
        description="Recent labs supporting biologic graft medical necessity."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="bg-lab-hba1c">HbA1c (%)</Label>
            <Input
              id="bg-lab-hba1c"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={state.labs.hba1c ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  labs: { ...prev.labs, hba1c: parseNum(e.target.value) },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg-lab-albumin">Albumin (g/dL)</Label>
            <Input
              id="bg-lab-albumin"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={state.labs.albumin ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  labs: { ...prev.labs, albumin: parseNum(e.target.value) },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg-lab-prealbumin">Prealbumin (mg/dL)</Label>
            <Input
              id="bg-lab-prealbumin"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={state.labs.prealbumin ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  labs: { ...prev.labs, prealbumin: parseNum(e.target.value) },
                }))
              }
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* 3. APPLICATION TYPE & PRODUCT --------------------------------- */}
      <CollapsibleCard
        id="bg-application-card"
        title="Application type & product"
        description="Whether this is the initial application or a follow-up, and the product applied."
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Application type</Label>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_TYPE_OPTIONS.map((opt) => {
                const slug = opt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const isSelected = state.application.type === opt;
                return (
                  <Chip
                    key={opt}
                    id={`bg-app-type-${slug}`}
                    selected={isSelected}
                    disabled={readOnly}
                    onToggle={() =>
                      update((prev) => ({
                        ...prev,
                        application: {
                          ...prev.application,
                          type: isSelected ? null : opt,
                        },
                      }))
                    }
                  >
                    {opt}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bg-app-product">
              Membrane allograft product name
            </Label>
            <Input
              id="bg-app-product"
              type="text"
              placeholder="e.g., EpiFix, AmnioBand, Grafix…"
              disabled={readOnly}
              value={state.application.productName}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  application: {
                    ...prev.application,
                    productName: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* 4. ALLOGRAFT SHEETS USED -------------------------------------- */}
      <CollapsibleCard
        id="bg-sheets-card"
        title="Allograft sheets used"
        description="Sheet counts by size, plus an optional custom dimension for non-standard cuts."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {SHEET_SIZES.map((size) => {
            const id = `bg-sheets-${size.replace("x", "x")}`;
            return (
              <div key={size} className="space-y-1.5">
                <Label htmlFor={id}>{size} cm</Label>
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  disabled={readOnly}
                  placeholder="# sheets"
                  value={state.sheets.preset[size] ?? ""}
                  onChange={(e) =>
                    update((prev) => ({
                      ...prev,
                      sheets: {
                        ...prev.sheets,
                        preset: {
                          ...prev.sheets.preset,
                          [size]: parseNum(e.target.value),
                        },
                      },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="mt-2 rounded-lg border border-border/60 p-3">
          <div className="text-sm font-semibold text-foreground">
            Custom size
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bg-sheets-custom-length">Custom L (cm)</Label>
              <Input
                id="bg-sheets-custom-length"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                disabled={readOnly}
                value={state.sheets.customLengthCm ?? ""}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    sheets: {
                      ...prev.sheets,
                      customLengthCm: parseNum(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bg-sheets-custom-width">Custom W (cm)</Label>
              <Input
                id="bg-sheets-custom-width"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                disabled={readOnly}
                value={state.sheets.customWidthCm ?? ""}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    sheets: {
                      ...prev.sheets,
                      customWidthCm: parseNum(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bg-sheets-custom-count"># sheets</Label>
              <Input
                id="bg-sheets-custom-count"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                disabled={readOnly}
                value={state.sheets.customCount ?? ""}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    sheets: {
                      ...prev.sheets,
                      customCount: parseNum(e.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* 5. ADDITIONAL NOTES ------------------------------------------ */}
      <CollapsibleCard
        id="bg-notes-card"
        title="Additional notes"
        description="Free-text observations relevant to this graft application."
      >
        <div className="space-y-1.5">
          <Label htmlFor="bg-additional-notes">Additional observations</Label>
          <Textarea
            id="bg-additional-notes"
            rows={4}
            placeholder="Additional observations…"
            disabled={readOnly}
            value={state.additionalNotes}
            onChange={(e) =>
              update((prev) => ({
                ...prev,
                additionalNotes: e.target.value,
              }))
            }
          />
        </div>
      </CollapsibleCard>
    </div>
  );
}

export default BiologicGraftDoc;
