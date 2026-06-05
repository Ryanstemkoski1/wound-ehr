"use client";

import { useState, useTransition } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateVisitEmDocumentation } from "@/app/actions/visits";

type VitalsTabProps = {
  visitId: string;
  initial: { vitals?: string } | null;
  /** Disable editing — used when the visit is locked. */
  readOnly?: boolean;
};

/**
 * Vitals tab for the Phase-3 tabbed visit screen.
 *
 * One of four splits from the original {@link EmSubSections} block. Per the
 * 2026-05-29 meeting, vitals stays in the chart but is OPTIONAL — we collect
 * it for billing completeness, not as a documentation requirement.
 *
 * The textarea is a single free-form blob (TEMP / HR / BP / RESP / O2 SAT /
 * BLOOD SUGAR all together) to match the existing pattern in
 * `em-sub-sections.tsx`. Save is explicit (no autosave) to avoid races with
 * sibling-tab saves writing the same `visits.em_documentation` JSON column.
 */
export function VitalsTab({
  visitId,
  initial,
  readOnly = false,
}: VitalsTabProps) {
  const [value, setValue] = useState<string>(initial?.vitals ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const filled = value.trim().length > 0;

  const handleSave = () => {
    startSave(async () => {
      const res = await updateVisitEmDocumentation(visitId, { vitals: value });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Vitals saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Vitals"
      defaultOpen={Boolean(initial?.vitals && initial.vitals.trim().length > 0)}
      headerBadge={
        filled ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Filled
          </span>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs">
          Optional. Collected for billing completeness.
        </p>
        <div className="space-y-2">
          <Label htmlFor="vitals-tab-textarea" className="sr-only">
            Vitals
          </Label>
          <Textarea
            id="vitals-tab-textarea"
            rows={4}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
            disabled={readOnly || saving}
            placeholder="TEMP / HR / BP / RESP / O2 SAT / BLOOD SUGAR"
          />
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
              Save vitals
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
