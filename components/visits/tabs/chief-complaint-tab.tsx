"use client";

import { useState, useTransition } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateVisitEmDocumentation } from "@/app/actions/visits";

type ChiefComplaintTabProps = {
  visitId: string;
  initial: { cc_hpi?: string } | null;
  /** Disable editing — used when the visit is locked. */
  readOnly?: boolean;
};

/**
 * Sentinel used to pack the two free-form fields (Chief Complaint and HPI)
 * into the single `visits.em_documentation.cc_hpi` string column. We avoid
 * splitting the column on the DB side because the legacy `EmSubSections`
 * code already round-trips `cc_hpi` as one blob; staying compatible means
 * read paths (printable note, signature preview) keep working unchanged.
 */
const HPI_SENTINEL = "---HPI---";

/** Parse the packed cc_hpi blob into its two halves. If no sentinel is
 * present the whole string is treated as the chief complaint — preserves
 * data written by the pre-Phase-3 single-textarea UI. */
function parseCcHpi(raw: string | undefined | null): {
  chief: string;
  hpi: string;
} {
  if (!raw) return { chief: "", hpi: "" };
  const idx = raw.indexOf(HPI_SENTINEL);
  if (idx === -1) return { chief: raw, hpi: "" };
  const chief = raw.slice(0, idx).replace(/\n$/, "");
  const hpi = raw.slice(idx + HPI_SENTINEL.length).replace(/^\n/, "");
  return { chief, hpi };
}

/**
 * Chief Complaint tab for the Phase-3 tabbed visit screen.
 *
 * One of four splits from the original `EmSubSections` block. Per the
 * Dr. May 2026-05-29 artifact this section is two distinct prompts —
 * "Primary reason for today's visit" and "History of Present Illness" —
 * but the underlying storage stays a single `cc_hpi` string for backward
 * compatibility with sibling tabs that write the same JSON column.
 *
 * Save is explicit (no autosave) to avoid races with sibling-tab saves
 * writing the same `visits.em_documentation` JSON.
 */
export function ChiefComplaintTab({
  visitId,
  initial,
  readOnly = false,
}: ChiefComplaintTabProps) {
  const initialParsed = parseCcHpi(initial?.cc_hpi);
  const [chief, setChief] = useState<string>(initialParsed.chief);
  const [hpi, setHpi] = useState<string>(initialParsed.hpi);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const filled = chief.trim().length > 0 || hpi.trim().length > 0;

  const handleSave = () => {
    const combined = filled ? `${chief}\n${HPI_SENTINEL}\n${hpi}` : "";
    startSave(async () => {
      const res = await updateVisitEmDocumentation(visitId, {
        cc_hpi: combined,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Chief complaint saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Chief Complaint"
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
        <p className="text-muted-foreground text-xs">
          Optional. Collected for billing completeness.
        </p>

        <div className="space-y-2">
          <Label htmlFor="chief-complaint-tab-chief">Chief Complaint</Label>
          <Textarea
            id="chief-complaint-tab-chief"
            rows={2}
            value={chief}
            onChange={(e) => {
              setChief(e.target.value);
              setDirty(true);
            }}
            disabled={readOnly || saving}
            placeholder="Primary reason for today's visit"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chief-complaint-tab-hpi">
            History of Present Illness
          </Label>
          <Textarea
            id="chief-complaint-tab-hpi"
            rows={5}
            value={hpi}
            onChange={(e) => {
              setHpi(e.target.value);
              setDirty(true);
            }}
            disabled={readOnly || saving}
            placeholder="Onset, location, duration, character, aggravating/relieving factors, associated symptoms"
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
              Save chief complaint
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
