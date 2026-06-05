"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateVisitEmDocumentation } from "@/app/actions/visits";

// =====================================================
// PhysicalExamTab — Phase-3 8-system checkbox grid
// =====================================================
//
// Per Dr. May's Phase-3 artifact, physical exam is OPTIONAL but collected
// for billing completeness. Each of the 8 body systems exposes a fixed list
// of common findings; selections are stored as a `{ [system]: string[] }`
// JSON blob under `visits.em_documentation.pe`.
//
// Save is explicit (no autosave) to avoid racing with sibling tabs that
// write to the same `em_documentation` JSON column.

type PhysicalExamTabProps = {
  visitId: string;
  initial: { pe?: string } | null;
  /** Disable editing — used when the visit is locked. */
  readOnly?: boolean;
};

/** Per-system selections — only systems with at least one finding survive save. */
type PeSelections = { [system: string]: string[] };

/**
 * Canonical 8-system / findings catalogue, sourced from Dr. May's Phase-3
 * artifact (see `docs/PHASE3_NOTE_TYPE_DATA_MODEL.md`). Order matters here —
 * the cards render in this sequence so notes stay readable across visits.
 */
const SYSTEMS: ReadonlyArray<{
  key: string;
  label: string;
  options: ReadonlyArray<string>;
}> = [
  {
    key: "general",
    label: "General",
    options: [
      "Alert & oriented x3",
      "Well-appearing",
      "No acute distress",
      "Cooperative",
      "Thin/Cachectic",
      "Obese",
    ],
  },
  {
    key: "cardiovascular",
    label: "Cardiovascular",
    options: [
      "Regular rate & rhythm",
      "S1/S2 normal",
      "No murmurs",
      "Peripheral pulses intact",
      "Diminished pulses bilateral LE",
      "1+ pitting edema",
      "2+ pitting edema bilateral",
    ],
  },
  {
    key: "respiratory",
    label: "Respiratory",
    options: [
      "Clear to auscultation bilaterally",
      "Diminished breath sounds",
      "Wheezing",
      "Rales",
      "Tachypnea",
    ],
  },
  {
    key: "extremities",
    label: "Extremities",
    options: [
      "No clubbing/cyanosis",
      "Varicosities bilateral LE",
      "Skin changes bilateral LE",
      "Lipodermatosclerosis",
      "Hemosiderin staining",
      "Dependent rubor",
    ],
  },
  {
    key: "neurological",
    label: "Neurological",
    options: [
      "CN II-XII grossly intact",
      "Motor strength intact bilateral",
      "Sensation intact bilateral",
      "Sensation diminished bilateral LE",
      "Decreased vibratory sense",
      "Absent Achilles reflex",
    ],
  },
  {
    key: "skin",
    label: "Skin",
    options: [
      "Warm/dry/intact elsewhere",
      "Xerosis",
      "Hyperpigmentation LE",
      "Callus formation",
      "Cellulitis",
      "Erythema",
    ],
  },
  {
    key: "abdomen",
    label: "Abdomen",
    options: [
      "Soft/non-tender/non-distended",
      "Bowel sounds present",
      "Tenderness on palpation",
      "G-tube site intact",
      "G-tube site erythema",
    ],
  },
] as const;

/**
 * Decode the persisted `pe` string into a `PeSelections` map.
 *
 * The column is a free-form string for backward compatibility, so any
 * payload that doesn't round-trip as `{ [system]: string[] }` is dropped
 * to an empty object — legacy free-text PE blobs predate this grid and
 * have no safe automatic mapping into structured findings.
 */
function parseInitial(raw: string | undefined): PeSelections {
  if (!raw || raw.trim().length === 0) return {};
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: PeSelections = {};
    const allowedBySystem = new Map<string, Set<string>>();
    for (const sys of SYSTEMS) {
      allowedBySystem.set(sys.label, new Set(sys.options));
    }
    for (const [system, value] of Object.entries(obj as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const allowed = allowedBySystem.get(system);
      if (!allowed) continue;
      const findings = value.filter(
        (v): v is string => typeof v === "string" && allowed.has(v)
      );
      if (findings.length > 0) out[system] = findings;
    }
    return out;
  } catch {
    return {};
  }
}

/** Total number of selected findings across every system. */
function countSelections(data: PeSelections): number {
  let n = 0;
  for (const arr of Object.values(data)) n += arr.length;
  return n;
}

/**
 * Phase-3 Physical Exam tab.
 *
 * Renders the 8-system checkbox grid described in the Phase-3 note-type
 * data model. Persists the structure as `JSON.stringify(...)` under
 * `visits.em_documentation.pe` via {@link updateVisitEmDocumentation} so
 * the server-side schema doesn't need to change for this iteration.
 *
 * Only systems with at least one selected finding are included in the
 * persisted payload — empty systems are stripped so the JSON stays small
 * and round-trips cleanly through {@link parseInitial}.
 */
export function PhysicalExamTab({
  visitId,
  initial,
  readOnly = false,
}: PhysicalExamTabProps) {
  const parsed = useMemo(() => parseInitial(initial?.pe), [initial?.pe]);

  const [data, setData] = useState<PeSelections>(parsed);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const total = useMemo(() => countSelections(data), [data]);
  const filled = total > 0;

  const toggle = (system: string, finding: string, checked: boolean) => {
    if (readOnly || saving) return;
    setData((prev) => {
      const current = prev[system] ?? [];
      const next = checked
        ? current.includes(finding)
          ? current
          : [...current, finding]
        : current.filter((f) => f !== finding);
      const out: PeSelections = { ...prev };
      if (next.length === 0) {
        delete out[system];
      } else {
        out[system] = next;
      }
      return out;
    });
    setDirty(true);
  };

  const handleSave = () => {
    startSave(async () => {
      // Strip empty systems so the persisted blob only carries systems
      // with at least one finding (matches what `parseInitial` expects).
      const payload: PeSelections = {};
      for (const [system, findings] of Object.entries(data)) {
        if (findings.length > 0) payload[system] = findings;
      }
      const serialized = JSON.stringify(payload);
      const res = await updateVisitEmDocumentation(visitId, { pe: serialized });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Physical exam saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Physical Examination"
      description="Optional. Collected for billing completeness."
      defaultOpen={filled}
      headerBadge={
        filled ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Filled
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SYSTEMS.map(({ key, label, options }) => {
            const selected = data[label] ?? [];
            const selectedCount = selected.length;
            return (
              <CollapsibleCard
                key={key}
                title={label}
                defaultOpen
                headerBadge={
                  selectedCount > 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {selectedCount}
                    </span>
                  ) : undefined
                }
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {options.map((finding) => {
                    const id = `pe-${key}-${finding
                      .replace(/[^a-z0-9]+/gi, "-")
                      .toLowerCase()}`;
                    const checked = selected.includes(finding);
                    return (
                      <Label
                        key={finding}
                        htmlFor={id}
                        className={cn(
                          "hover:bg-accent/40 flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm font-normal transition-colors",
                          checked && "border-primary/60 bg-primary/5",
                          (readOnly || saving) &&
                            "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          disabled={readOnly || saving}
                          onCheckedChange={(v) =>
                            toggle(label, finding, v === true)
                          }
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1 leading-snug">
                          {finding}
                        </span>
                      </Label>
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
              Save Physical Exam
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}

export default PhysicalExamTab;
