"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateVisitEmDocumentation } from "@/app/actions/visits";

/**
 * Three-state status for each ROS symptom chip.
 *  - `positive`     — patient endorses the symptom (red).
 *  - `negative`     — clinician asked, patient denied (green).
 *  - `not_reviewed` — neither asked nor noted (neutral).
 */
type RosState = "positive" | "negative" | "not_reviewed";

type RosStructured = Record<string, Record<string, RosState>>;

type ReviewOfSystemsTabProps = {
  visitId: string;
  initial: { ros?: string } | null;
  /** Disable editing — used when the visit is locked. */
  readOnly?: boolean;
};

/**
 * Canonical 10-system / symptom catalogue, sourced from Dr. May's Phase-3
 * artifact (see `docs/PHASE3_NOTE_TYPE_DATA_MODEL.md`). Order matters here —
 * the cards render in this sequence so notes stay readable across visits.
 */
const ROS_SYSTEMS: ReadonlyArray<{
  system: string;
  symptoms: ReadonlyArray<string>;
}> = [
  {
    system: "Constitutional",
    symptoms: ["Fatigue", "Fever/Chills", "Weight Loss", "Night Sweats", "Malaise"],
  },
  {
    system: "Musculoskeletal",
    symptoms: ["Joint Pain", "Muscle Weakness", "Limited ROM", "Contractures"],
  },
  {
    system: "Cardiovascular",
    symptoms: ["Chest Pain", "Palpitations", "LE Edema", "Orthopnea", "Claudication"],
  },
  {
    system: "Neurological",
    symptoms: ["Headache", "Dizziness", "Numbness/Tingling", "Focal Weakness"],
  },
  {
    system: "Respiratory",
    symptoms: ["Dyspnea", "Cough", "Wheezing", "Hemoptysis"],
  },
  {
    system: "Integumentary",
    symptoms: ["Rash", "Pruritus", "New Breakdown", "Delayed Healing"],
  },
  {
    system: "Gastrointestinal",
    symptoms: ["Nausea", "Vomiting", "Diarrhea", "Constipation", "Abdominal Pain"],
  },
  {
    system: "Endocrine",
    symptoms: ["Polydipsia", "Polyuria", "Tremor", "Diaphoresis"],
  },
  {
    system: "Genitourinary",
    symptoms: ["Dysuria", "Frequency", "Hematuria", "Incontinence"],
  },
  {
    system: "Psychiatric",
    symptoms: ["Depression", "Anxiety", "Confusion", "Sleep Disturbance"],
  },
] as const;

/**
 * Result of parsing the incoming `em_documentation.ros` blob.
 *
 * `legacy` carries free-text notes from before the structured grid existed —
 * we expose them read-only so the clinician can copy anything pertinent
 * into the new chips without silently dropping legacy chart content.
 */
type ParsedRos =
  | { kind: "structured"; data: RosStructured; legacy: null }
  | { kind: "legacy"; data: RosStructured; legacy: string };

/** Empty structured shape with every system present, every symptom not-reviewed. */
function emptyStructured(): RosStructured {
  const out: RosStructured = {};
  for (const { system, symptoms } of ROS_SYSTEMS) {
    out[system] = {};
    for (const sx of symptoms) out[system][sx] = "not_reviewed";
  }
  return out;
}

/**
 * Try to decode the persisted `ros` field. The column is a single string
 * column for backward compatibility, so we treat anything that doesn't
 * round-trip as the structured shape as legacy free text.
 */
function parseInitial(raw: string | undefined): ParsedRos {
  const base = emptyStructured();
  if (!raw || raw.trim().length === 0) {
    return { kind: "structured", data: base, legacy: null };
  }
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return { kind: "legacy", data: base, legacy: raw };
    }
    const merged = base;
    for (const { system, symptoms } of ROS_SYSTEMS) {
      const sysObj = (obj as Record<string, unknown>)[system];
      if (!sysObj || typeof sysObj !== "object" || Array.isArray(sysObj)) continue;
      for (const sx of symptoms) {
        const v = (sysObj as Record<string, unknown>)[sx];
        if (v === "positive" || v === "negative" || v === "not_reviewed") {
          merged[system][sx] = v;
        }
      }
    }
    return { kind: "structured", data: merged, legacy: null };
  } catch {
    return { kind: "legacy", data: base, legacy: raw };
  }
}

/** Cycle order: not_reviewed -> negative -> positive -> not_reviewed. */
function nextState(s: RosState): RosState {
  if (s === "not_reviewed") return "negative";
  if (s === "negative") return "positive";
  return "not_reviewed";
}

function chipClasses(state: RosState, disabled: boolean): string {
  return cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
    disabled && "cursor-not-allowed opacity-60",
    state === "positive" &&
      "border-red-500 text-red-700 ring-1 ring-red-500/60 bg-red-50 dark:bg-red-950/30 dark:text-red-300",
    state === "negative" &&
      "border-emerald-500 text-emerald-700 ring-1 ring-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
    state === "not_reviewed" &&
      "border-border text-muted-foreground bg-background hover:bg-muted"
  );
}

function stateLabel(s: RosState): string {
  if (s === "positive") return "Positive";
  if (s === "negative") return "Negative";
  return "Not reviewed";
}

/** Count of non-`not_reviewed` symptoms — drives the header badge. */
function countTouched(data: RosStructured): { positive: number; negative: number } {
  let positive = 0;
  let negative = 0;
  for (const sys of Object.values(data)) {
    for (const v of Object.values(sys)) {
      if (v === "positive") positive++;
      else if (v === "negative") negative++;
    }
  }
  return { positive, negative };
}

/**
 * Phase-3 Review of Systems tab.
 *
 * Renders the structured 10-system chip grid described in the Phase-3 note-type
 * data model. Persists the structure as `JSON.stringify(...)` under
 * `visits.em_documentation.ros` via {@link updateVisitEmDocumentation} so the
 * server-side schema doesn't need to change for this iteration.
 *
 * If `initial.ros` is a legacy free-text string, the grid starts empty and the
 * legacy text is shown read-only above the cards so the clinician can re-encode
 * anything still relevant.
 */
export function ReviewOfSystemsTab({
  visitId,
  initial,
  readOnly = false,
}: ReviewOfSystemsTabProps) {
  const parsed = useMemo(() => parseInitial(initial?.ros), [initial?.ros]);

  const [data, setData] = useState<RosStructured>(parsed.data);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const { positive, negative } = useMemo(() => countTouched(data), [data]);
  const touchedTotal = positive + negative;

  const cycle = (system: string, symptom: string) => {
    if (readOnly || saving) return;
    setData((prev) => {
      const current = prev[system]?.[symptom] ?? "not_reviewed";
      return {
        ...prev,
        [system]: { ...prev[system], [symptom]: nextState(current) },
      };
    });
    setDirty(true);
  };

  const handleSave = () => {
    startSave(async () => {
      const serialized = JSON.stringify(data);
      const res = await updateVisitEmDocumentation(visitId, { ros: serialized });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Review of systems saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Review of Systems"
      description="Click a symptom to cycle Not reviewed → Negative → Positive."
      defaultOpen={touchedTotal > 0 || parsed.kind === "legacy"}
      headerBadge={
        touchedTotal > 0 ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {positive} pos / {negative} neg
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {parsed.kind === "legacy" && (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/20">
            <Label htmlFor="ros-legacy" className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Legacy free-text ROS (read-only)
            </Label>
            <Textarea
              id="ros-legacy"
              value={parsed.legacy}
              readOnly
              rows={4}
              className="bg-white/60 dark:bg-black/20"
            />
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              Saved before structured ROS existed. Re-encode any pertinent findings below; saving the grid will replace this text.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ROS_SYSTEMS.map(({ system, symptoms }) => {
            const sys = data[system] ?? {};
            const sysTouched = Object.values(sys).filter(
              (v) => v !== "not_reviewed"
            ).length;
            return (
              <CollapsibleCard
                key={system}
                title={system}
                defaultOpen
                headerBadge={
                  sysTouched > 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {sysTouched}
                    </span>
                  ) : undefined
                }
              >
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((sx) => {
                    const state = sys[sx] ?? "not_reviewed";
                    return (
                      <button
                        key={sx}
                        type="button"
                        onClick={() => cycle(system, sx)}
                        disabled={readOnly || saving}
                        aria-pressed={state !== "not_reviewed"}
                        aria-label={`${sx}: ${stateLabel(state)}`}
                        title={stateLabel(state)}
                        className={chipClasses(state, readOnly || saving)}
                      >
                        <span>{sx}</span>
                        {state !== "not_reviewed" && (
                          <span aria-hidden className="text-[10px] uppercase tracking-wide">
                            {state === "positive" ? "+" : "−"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleCard>
            );
          })}
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save ROS
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
