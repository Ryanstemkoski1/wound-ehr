"use client";

// ProcedureChips — multi-select chip row inside Wound Assessment that tags
// procedures performed on this wound. Tagging a chip expands its inline
// documentation block below.
//
// Backed by app/actions/procedures.ts:
//   - toggleProcedureTag(assessmentId, procedureType, on)
//   - saveProcedureDocumentation(assessmentId, procedureType, payload)
//   - getProcedureDocumentation / deleteProcedureDocumentation (parent flows)
//
// Anti-pattern note: the legacy chip implementation used a single
// `expandedProcedure` string to track which detail block was open. That made
// it impossible to keep multiple panels open simultaneously and (worse)
// caused a bug where toggling one chip closed another. This component keys
// state by procedure value via a Set<ProcedureType> / Record so each
// procedure's expand/save state is independent.

import * as React from "react";
import dynamic from "next/dynamic";

import {
  saveProcedureDocumentation,
  toggleProcedureTag,
  type ProcedureType,
} from "@/app/actions/procedures";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const PROCEDURE_TYPES: readonly ProcedureType[] = [
  "sharp_debridement",
  "biologic_graft",
  "arobella",
  "feeding_tube_change",
  "urinary_catheter_replacement",
] as const;

const PROCEDURE_LABELS: Record<ProcedureType, string> = {
  sharp_debridement: "Sharp Debridement",
  biologic_graft: "Biologic Graft Application",
  arobella: "Arobella Treatment",
  feeding_tube_change: "Feeding Tube Change",
  urinary_catheter_replacement: "Urinary Catheter Replacement",
};

// ---------------------------------------------------------------------------
// Lazy-loaded detail panels
// ---------------------------------------------------------------------------

// Each detail component is code-split so the assessment page does not pay
// for the bundle of every procedure form when only a subset of chips are
// tagged.
type DetailProps = {
  assessmentId: string;
  initial: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
  readOnly?: boolean;
};

const SharpDebridementDoc = dynamic<DetailProps>(
  () => import("./procedures/sharp-debridement-doc")
);
const BiologicGraftDoc = dynamic<DetailProps>(
  () => import("./procedures/biologic-graft-doc")
);
const ArobellaDoc = dynamic<DetailProps>(
  () => import("./procedures/arobella-doc")
);
const FeedingTubeChangeDoc = dynamic<DetailProps>(
  () => import("./procedures/feeding-tube-change-doc")
);
const UrinaryCatheterDoc = dynamic<DetailProps>(
  () => import("./procedures/urinary-catheter-doc")
);

const DETAIL_COMPONENTS: Record<ProcedureType, React.ComponentType<DetailProps>> = {
  sharp_debridement: SharpDebridementDoc,
  biologic_graft: BiologicGraftDoc,
  arobella: ArobellaDoc,
  feeding_tube_change: FeedingTubeChangeDoc,
  urinary_catheter_replacement: UrinaryCatheterDoc,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ProcedureChipsProps = {
  assessmentId: string;
  initial: {
    tags: ProcedureType[];
    docs: Array<{
      procedureType: ProcedureType;
      payload: Record<string, unknown>;
    }>;
  };
  readOnly?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 1000;

export function ProcedureChips({
  assessmentId,
  initial,
  readOnly = false,
}: ProcedureChipsProps) {
  // Tagged set is keyed by ProcedureType value — never by index. That keeps
  // the per-chip state independent of render order and is the fix for the
  // single-state-flag bug.
  const [tagged, setTagged] = React.useState<Set<ProcedureType>>(
    () => new Set(initial.tags)
  );

  // Per-procedure payload cache, keyed by ProcedureType. We hold the latest
  // value locally so the detail panel survives re-renders during debounce.
  const [payloads, setPayloads] = React.useState<
    Record<ProcedureType, Record<string, unknown>>
  >(() => {
    const seed = {} as Record<ProcedureType, Record<string, unknown>>;
    for (const doc of initial.docs) {
      seed[doc.procedureType] = doc.payload;
    }
    return seed;
  });

  // Per-procedure debounce timers. Keyed by ProcedureType so a save for
  // chip A never cancels a pending save for chip B.
  const debounceTimers = React.useRef<
    Partial<Record<ProcedureType, ReturnType<typeof setTimeout>>>
  >({});

  // Flush all timers on unmount so we do not leak setTimeouts when the
  // assessment page unmounts mid-debounce.
  React.useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const key of Object.keys(timers) as ProcedureType[]) {
        const t = timers[key];
        if (t) clearTimeout(t);
      }
    };
  }, []);

  const handleToggle = React.useCallback(
    async (procedureType: ProcedureType) => {
      if (readOnly) return;
      const isOn = tagged.has(procedureType);
      const nextOn = !isOn;

      // Optimistic update so the chip feels instant.
      setTagged((prev) => {
        const next = new Set(prev);
        if (nextOn) next.add(procedureType);
        else next.delete(procedureType);
        return next;
      });

      const result = await toggleProcedureTag(
        assessmentId,
        procedureType,
        nextOn
      );

      if ("error" in result) {
        // Roll back on failure.
        setTagged((prev) => {
          const next = new Set(prev);
          if (nextOn) next.delete(procedureType);
          else next.add(procedureType);
          return next;
        });
        console.error("toggleProcedureTag failed:", result.error);
      }
    },
    [assessmentId, readOnly, tagged]
  );

  const handlePayloadChange = React.useCallback(
    (procedureType: ProcedureType, payload: Record<string, unknown>) => {
      if (readOnly) return;

      setPayloads((prev) => ({ ...prev, [procedureType]: payload }));

      // Debounce per-procedure save so rapid typing does not hammer the
      // server. Clearing only this procedure's timer keeps other chips'
      // pending writes intact.
      const timers = debounceTimers.current;
      const existing = timers[procedureType];
      if (existing) clearTimeout(existing);

      timers[procedureType] = setTimeout(() => {
        void saveProcedureDocumentation(assessmentId, procedureType, payload)
          .then((result) => {
            if ("error" in result) {
              console.error(
                "saveProcedureDocumentation failed:",
                result.error
              );
            }
          })
          .finally(() => {
            timers[procedureType] = undefined;
          });
      }, DEBOUNCE_MS);
    },
    [assessmentId, readOnly]
  );

  return (
    <div className="space-y-4">
      {/* Chip row */}
      <div
        role="group"
        aria-label="Procedures performed"
        className="flex flex-wrap gap-2"
      >
        {PROCEDURE_TYPES.map((procedureType) => {
          const isOn = tagged.has(procedureType);
          return (
            <button
              key={procedureType}
              type="button"
              aria-pressed={isOn}
              disabled={readOnly}
              onClick={() => {
                void handleToggle(procedureType);
              }}
              className={cn(
                "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                readOnly && "cursor-not-allowed opacity-60"
              )}
            >
              <Badge
                variant={isOn ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  isOn && "shadow-md"
                )}
              >
                {PROCEDURE_LABELS[procedureType]}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Stacked detail panels — one per tagged procedure, never a single
          mutually-exclusive expanded slot. Rendered in the canonical
          PROCEDURE_TYPES order so the layout is stable as chips toggle. */}
      <div className="space-y-4">
        {PROCEDURE_TYPES.filter((p) => tagged.has(p)).map((procedureType) => {
          const Detail = DETAIL_COMPONENTS[procedureType];
          return (
            <div
              key={procedureType}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="mb-3 text-sm font-semibold text-foreground">
                {PROCEDURE_LABELS[procedureType]}
              </div>
              <Detail
                assessmentId={assessmentId}
                initial={payloads[procedureType] ?? {}}
                onChange={(payload) =>
                  handlePayloadChange(procedureType, payload)
                }
                readOnly={readOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProcedureChips;
