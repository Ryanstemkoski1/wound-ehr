"use client";

import { useState, useTransition } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateVisitEmDocumentation } from "@/app/actions/visits";

export type EmSections = {
  vitals?: string;
  cc_hpi?: string;
  ros?: string;
  pe?: string;
};

type EmSubSectionsProps = {
  visitId: string;
  initial?: EmSections | null;
  /** Disable editing — used when the visit is locked. */
  readOnly?: boolean;
};

const FIELDS: Array<{
  key: keyof EmSections;
  label: string;
  hint: string;
  rows: number;
}> = [
  {
    key: "vitals",
    label: "Vitals",
    hint: "BP, HR, T, RR, SpO₂, weight — free text or template.",
    rows: 3,
  },
  {
    key: "cc_hpi",
    label: "CC / HPI",
    hint: "Chief complaint and history of present illness.",
    rows: 5,
  },
  {
    key: "ros",
    label: "Review of systems",
    hint: "Pertinent positives / negatives by system.",
    rows: 5,
  },
  {
    key: "pe",
    label: "Physical exam",
    hint: "General appearance and exam findings.",
    rows: 5,
  },
];

/**
 * R-065 — E/M sub-sections for the clinical_ux_v2 visit screen.
 *
 * Renders four optional CollapsibleCards (Vitals, CC/HPI, ROS, PE)
 * inside a single outer "E/M documentation" group. Persists to
 * `visits.em_documentation` via {@link updateVisitEmDocumentation} on
 * an explicit Save click — autosave is left to the existing visit-edit
 * flow so we don't double-save against drafts.
 */
export function EmSubSections({
  visitId,
  initial,
  readOnly = false,
}: EmSubSectionsProps) {
  const [values, setValues] = useState<EmSections>({
    vitals: initial?.vitals ?? "",
    cc_hpi: initial?.cc_hpi ?? "",
    ros: initial?.ros ?? "",
    pe: initial?.pe ?? "",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const handleChange = (key: keyof EmSections) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    startSave(async () => {
      const res = await updateVisitEmDocumentation(visitId, values);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("E/M documentation saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Evaluation & Management"
      description="Optional sub-sections — fill what's relevant to today's encounter."
      defaultOpen={Boolean(
        initial?.vitals || initial?.cc_hpi || initial?.ros || initial?.pe
      )}
    >
      <div className="space-y-4">
        {FIELDS.map((f) => {
          const value = values[f.key] ?? "";
          const filled = value.trim().length > 0;
          return (
            <CollapsibleCard
              key={f.key}
              title={f.label}
              description={f.hint}
              defaultOpen={filled}
              headerBadge={
                filled ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Filled
                  </span>
                ) : undefined
              }
            >
              <div className="space-y-2">
                <Label htmlFor={`em-${f.key}`} className="sr-only">
                  {f.label}
                </Label>
                <Textarea
                  id={`em-${f.key}`}
                  rows={f.rows}
                  value={value}
                  onChange={(e) => handleChange(f.key)(e.target.value)}
                  disabled={readOnly || saving}
                  placeholder={f.hint}
                />
              </div>
            </CollapsibleCard>
          );
        })}

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
              Save E/M
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
