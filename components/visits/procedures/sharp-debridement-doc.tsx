"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Option lists (kept module-local so each tab has its own canonical labels).
// Values are stored verbatim — Phase-3 procedure rows persist JSON, not enums,
// so we avoid introducing parallel slug-mapping layers in this UI block.
// ---------------------------------------------------------------------------

const INSTRUMENT_OPTIONS = [
  "Scalpel",
  "Curette",
  "Scissors",
  "Forceps",
] as const;

const TISSUE_REMOVED_OPTIONS = [
  "Necrotic tissue",
  "Slough",
  "Callus",
  "Fibrin",
  "Biofilm",
] as const;

const BLEEDING_OPTIONS = ["None", "Minimal", "Moderate", "Controlled"] as const;

const TOLERANCE_OPTIONS = [
  "Tolerated well",
  "Mild discomfort",
  "Moderate discomfort",
  "Required pause",
] as const;

const VISIBLE_STRUCTURE_OPTIONS = [
  "Tendon",
  "Bone",
  "Muscle",
  "Capsule",
  "Ligament",
  "Hardware",
  "None",
] as const;

const WOUND_EDGE_OPTIONS = [
  "Attached",
  "Unattached",
  "Calloused",
  "Rolled",
  "Epibole",
] as const;

const PERIWOUND_OPTIONS = [
  "Healthy",
  "Macerated",
  "Inflamed",
  "Calloused",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Shape of the JSON payload emitted via `onChange`.
// Kept intentionally permissive (all-optional, primitive values) because the
// caller persists it into a `jsonb` column without a fixed schema yet.
// ---------------------------------------------------------------------------

type SharpDebridementState = {
  size: {
    lengthCm: number | null;
    widthCm: number | null;
    depthCm: number | null;
    undermining: boolean;
    tunneling: boolean;
  };
  woundBed: {
    granulationPct: number | null;
    sloughPct: number | null;
    fibroticPct: number | null;
    escharPct: number | null;
  };
  procedure: {
    instruments: string[];
    instrumentsOther: string;
    tissueRemoved: string[];
    bleeding: string | null;
    tolerance: string | null;
    notes: string;
  };
  visibleStructures: string[];
  woundEdges: string[];
  periwound: string[];
  pain: {
    level: number | null;
    description: string;
  };
};

function emptyState(): SharpDebridementState {
  return {
    size: {
      lengthCm: null,
      widthCm: null,
      depthCm: null,
      undermining: false,
      tunneling: false,
    },
    woundBed: {
      granulationPct: null,
      sloughPct: null,
      fibroticPct: null,
      escharPct: null,
    },
    procedure: {
      instruments: [],
      instrumentsOther: "",
      tissueRemoved: [],
      bleeding: null,
      tolerance: null,
      notes: "",
    },
    visibleStructures: [],
    woundEdges: [],
    periwound: [],
    pain: {
      level: null,
      description: "",
    },
  };
}

/**
 * Coerces the loosely-typed `initial` prop (which arrives as
 * `Record<string, unknown>` from the JSONB column) into a fully-populated
 * state object. Unknown / mistyped fields silently fall back to defaults so a
 * malformed legacy row never crashes the form.
 */
function hydrate(initial: Record<string, unknown>): SharpDebridementState {
  const base = emptyState();
  const src = initial ?? {};

  const size = (src.size ?? {}) as Record<string, unknown>;
  const woundBed = (src.woundBed ?? {}) as Record<string, unknown>;
  const procedure = (src.procedure ?? {}) as Record<string, unknown>;
  const pain = (src.pain ?? {}) as Record<string, unknown>;

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const bool = (v: unknown): boolean => v === true;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const strOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;

  return {
    size: {
      lengthCm: num(size.lengthCm),
      widthCm: num(size.widthCm),
      depthCm: num(size.depthCm),
      undermining: bool(size.undermining),
      tunneling: bool(size.tunneling),
    },
    woundBed: {
      granulationPct: num(woundBed.granulationPct),
      sloughPct: num(woundBed.sloughPct),
      fibroticPct: num(woundBed.fibroticPct),
      escharPct: num(woundBed.escharPct),
    },
    procedure: {
      instruments: strArr(procedure.instruments),
      instrumentsOther: str(procedure.instrumentsOther),
      tissueRemoved: strArr(procedure.tissueRemoved),
      bleeding: strOrNull(procedure.bleeding),
      tolerance: strOrNull(procedure.tolerance),
      notes: str(procedure.notes),
    },
    visibleStructures: strArr(src.visibleStructures),
    woundEdges: strArr(src.woundEdges),
    periwound: strArr(src.periwound),
    pain: {
      level: num(pain.level),
      description: str(pain.description),
    },
  };
}

// ---------------------------------------------------------------------------
// Chip primitives — local to this file. Sibling procedure docs may grow their
// own variants, so we don't promote these to `components/ui` yet.
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

type ChipGroupProps<T extends string> = {
  idPrefix: string;
  options: readonly T[];
  /** When `mode === "multi"` the array holds all selected values. */
  selected: T[] | (T | null);
  mode: "multi" | "single";
  disabled?: boolean;
  onChange: (next: T[] | T | null) => void;
};

function ChipGroup<T extends string>({
  idPrefix,
  options,
  selected,
  mode,
  disabled,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected =
          mode === "multi"
            ? Array.isArray(selected) && selected.includes(opt)
            : selected === opt;
        const slug = opt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return (
          <Chip
            key={opt}
            id={`${idPrefix}-${slug}`}
            selected={isSelected}
            disabled={disabled}
            onToggle={() => {
              if (mode === "multi") {
                const arr = Array.isArray(selected) ? selected : [];
                onChange(
                  isSelected
                    ? arr.filter((v) => v !== opt)
                    : [...arr, opt]
                );
              } else {
                onChange(isSelected ? null : opt);
              }
            }}
          >
            {opt}
          </Chip>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export type SharpDebridementDocProps = {
  assessmentId: string;
  initial: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
  readOnly?: boolean;
};

/**
 * Inline documentation block for a "Sharp debridement" procedure tagged on a
 * wound assessment. Mirrors Form 1 / "Sharp debridement" tab from Dr. May's
 * Phase-3 artifact. Stateless w.r.t. persistence — the parent owns the round
 * trip to `procedure_documentation`; we just surface a JSON payload via
 * `onChange`.
 */
export function SharpDebridementDoc({
  assessmentId,
  initial,
  onChange,
  readOnly = false,
}: SharpDebridementDocProps) {
  const [state, setState] = useState<SharpDebridementState>(() =>
    hydrate(initial)
  );

  // The initial payload should be treated as the source of truth on mount and
  // whenever the assessment context changes. We re-hydrate when the caller
  // swaps assessments (avoids stale state if this component is re-mounted via
  // key change, but also covers callers that reuse the instance).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setState(hydrate(initial));
    // We intentionally do NOT depend on `initial` itself — the caller passes a
    // fresh object on every render, which would clobber user input. The
    // assessment id is the stable identity we key off.
  }, [assessmentId]);

  const update = useCallback(
    (mutator: (prev: SharpDebridementState) => SharpDebridementState) => {
      setState((prev) => {
        const next = mutator(prev);
        onChange(next as unknown as Record<string, unknown>);
        return next;
      });
    },
    [onChange]
  );

  const woundBedTotal = useMemo(() => {
    const { granulationPct, sloughPct, fibroticPct, escharPct } =
      state.woundBed;
    return (
      (granulationPct ?? 0) +
      (sloughPct ?? 0) +
      (fibroticPct ?? 0) +
      (escharPct ?? 0)
    );
  }, [state.woundBed]);

  const woundBedOverflow = woundBedTotal > 100;

  // Helpers to keep JSX terse and consistent across number inputs.
  const parseNum = (raw: string): number | null => {
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="space-y-4">
      {/* 1. SIZE ------------------------------------------------------- */}
      <CollapsibleCard
        id="sd-size-card"
        title="Size (cm)"
        description="Length × Width × Depth, plus undermining / tunneling indicators."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sd-size-length">Length (L)</Label>
            <Input
              id="sd-size-length"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={state.size.lengthCm ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  size: { ...prev.size, lengthCm: parseNum(e.target.value) },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-size-width">Width (W)</Label>
            <Input
              id="sd-size-width"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={state.size.widthCm ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  size: { ...prev.size, widthCm: parseNum(e.target.value) },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-size-depth">Depth (D)</Label>
            <Input
              id="sd-size-depth"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={readOnly}
              value={state.size.depthCm ?? ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  size: { ...prev.size, depthCm: parseNum(e.target.value) },
                }))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Chip
            id="sd-size-undermining"
            selected={state.size.undermining}
            disabled={readOnly}
            onToggle={() =>
              update((prev) => ({
                ...prev,
                size: { ...prev.size, undermining: !prev.size.undermining },
              }))
            }
          >
            Undermining
          </Chip>
          <Chip
            id="sd-size-tunneling"
            selected={state.size.tunneling}
            disabled={readOnly}
            onToggle={() =>
              update((prev) => ({
                ...prev,
                size: { ...prev.size, tunneling: !prev.size.tunneling },
              }))
            }
          >
            Tunneling
          </Chip>
        </div>
      </CollapsibleCard>

      {/* 2. WOUND BED -------------------------------------------------- */}
      <CollapsibleCard
        id="sd-wound-bed-card"
        title="Wound bed (%)"
        description="Composition of the wound surface. Components should sum to 100%."
        headerBadge={
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              woundBedOverflow
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            {woundBedTotal}%
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(
            [
              ["sd-wb-granulation", "Granulation %", "granulationPct"],
              ["sd-wb-slough", "Slough %", "sloughPct"],
              ["sd-wb-fibrotic", "Fibrotic %", "fibroticPct"],
              ["sd-wb-eschar", "Eschar %", "escharPct"],
            ] as const
          ).map(([id, label, key]) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step="1"
                disabled={readOnly}
                value={state.woundBed[key] ?? ""}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    woundBed: {
                      ...prev.woundBed,
                      [key]: parseNum(e.target.value),
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
        {woundBedOverflow && (
          <p
            role="alert"
            className="text-destructive pt-1 text-xs font-medium"
          >
            Wound bed composition exceeds 100% (currently {woundBedTotal}%).
            Please adjust before signing.
          </p>
        )}
      </CollapsibleCard>

      {/* 3. PROCEDURE NOTES ------------------------------------------- */}
      <CollapsibleCard
        id="sd-procedure-card"
        title="Procedure notes"
        description="Instruments, tissue removed, bleeding, tolerance, and free-text notes."
      >
        <div className="space-y-2">
          <Label>Instruments used</Label>
          <ChipGroup
            idPrefix="sd-instr"
            options={INSTRUMENT_OPTIONS}
            mode="multi"
            selected={state.procedure.instruments}
            disabled={readOnly}
            onChange={(next) =>
              update((prev) => ({
                ...prev,
                procedure: {
                  ...prev.procedure,
                  instruments: next as string[],
                },
              }))
            }
          />
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="sd-instr-other">Other: specify</Label>
            <Input
              id="sd-instr-other"
              type="text"
              placeholder="Other instrument(s)..."
              disabled={readOnly}
              value={state.procedure.instrumentsOther}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  procedure: {
                    ...prev.procedure,
                    instrumentsOther: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label>Tissue removed</Label>
          <ChipGroup
            idPrefix="sd-tissue"
            options={TISSUE_REMOVED_OPTIONS}
            mode="multi"
            selected={state.procedure.tissueRemoved}
            disabled={readOnly}
            onChange={(next) =>
              update((prev) => ({
                ...prev,
                procedure: {
                  ...prev.procedure,
                  tissueRemoved: next as string[],
                },
              }))
            }
          />
        </div>

        <div className="space-y-2 pt-2">
          <Label>Bleeding</Label>
          <ChipGroup
            idPrefix="sd-bleeding"
            options={BLEEDING_OPTIONS}
            mode="single"
            selected={state.procedure.bleeding as (typeof BLEEDING_OPTIONS)[number] | null}
            disabled={readOnly}
            onChange={(next) =>
              update((prev) => ({
                ...prev,
                procedure: {
                  ...prev.procedure,
                  bleeding: (next as string | null) ?? null,
                },
              }))
            }
          />
        </div>

        <div className="space-y-2 pt-2">
          <Label>Patient tolerance</Label>
          <ChipGroup
            idPrefix="sd-tolerance"
            options={TOLERANCE_OPTIONS}
            mode="single"
            selected={state.procedure.tolerance as (typeof TOLERANCE_OPTIONS)[number] | null}
            disabled={readOnly}
            onChange={(next) =>
              update((prev) => ({
                ...prev,
                procedure: {
                  ...prev.procedure,
                  tolerance: (next as string | null) ?? null,
                },
              }))
            }
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <Label htmlFor="sd-notes">Additional notes</Label>
          <Textarea
            id="sd-notes"
            rows={3}
            placeholder="Additional procedure details, anatomic considerations, etc."
            disabled={readOnly}
            value={state.procedure.notes}
            onChange={(e) =>
              update((prev) => ({
                ...prev,
                procedure: { ...prev.procedure, notes: e.target.value },
              }))
            }
          />
        </div>
      </CollapsibleCard>

      {/* 4. VISIBLE STRUCTURES ---------------------------------------- */}
      <CollapsibleCard
        id="sd-visible-structures-card"
        title="Visible structures"
        description="Tissue / hardware exposed in the wound bed."
      >
        <ChipGroup
          idPrefix="sd-vs"
          options={VISIBLE_STRUCTURE_OPTIONS}
          mode="multi"
          selected={state.visibleStructures}
          disabled={readOnly}
          onChange={(next) =>
            update((prev) => ({
              ...prev,
              visibleStructures: next as string[],
            }))
          }
        />
      </CollapsibleCard>

      {/* 5. WOUND EDGES ----------------------------------------------- */}
      <CollapsibleCard
        id="sd-wound-edges-card"
        title="Wound edges"
        description="Character of the wound margin."
      >
        <ChipGroup
          idPrefix="sd-we"
          options={WOUND_EDGE_OPTIONS}
          mode="multi"
          selected={state.woundEdges}
          disabled={readOnly}
          onChange={(next) =>
            update((prev) => ({
              ...prev,
              woundEdges: next as string[],
            }))
          }
        />
      </CollapsibleCard>

      {/* 6. PERIWOUND SKIN -------------------------------------------- */}
      <CollapsibleCard
        id="sd-periwound-card"
        title="Periwound skin"
        description="Condition of the skin surrounding the wound."
      >
        <ChipGroup
          idPrefix="sd-pw"
          options={PERIWOUND_OPTIONS}
          mode="multi"
          selected={state.periwound}
          disabled={readOnly}
          onChange={(next) =>
            update((prev) => ({
              ...prev,
              periwound: next as string[],
            }))
          }
        />
      </CollapsibleCard>

      {/* 7. PAIN ------------------------------------------------------ */}
      <CollapsibleCard
        id="sd-pain-card"
        title="Pain"
        description="Patient-reported pain at the site, 0–10 numeric rating scale."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sd-pain-level">Level (0–10)</Label>
            <Input
              id="sd-pain-level"
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              step="1"
              disabled={readOnly}
              value={state.pain.level ?? ""}
              onChange={(e) => {
                const n = parseNum(e.target.value);
                update((prev) => ({
                  ...prev,
                  pain: {
                    ...prev.pain,
                    level:
                      n === null
                        ? null
                        : Math.min(10, Math.max(0, Math.round(n))),
                  },
                }));
              }}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="sd-pain-description">Description</Label>
            <Textarea
              id="sd-pain-description"
              rows={2}
              placeholder="Quality, onset, aggravating / alleviating factors..."
              disabled={readOnly}
              value={state.pain.description}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  pain: { ...prev.pain, description: e.target.value },
                }))
              }
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

export default SharpDebridementDoc;
