"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { updateVisitEmDocumentation } from "@/app/actions/visits";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Phase 3 — Clinical Notes tab (per Dr. May's artifact).
 *
 * Three free-text fields that together replace the legacy single-blob
 * "clinical note":
 *   • Clinical Assessment  — impression & clinical reasoning
 *   • Clinical Discussion  — etiology / contributing factors / rationale
 *   • Plan                 — care plan, follow-up, referrals
 *
 * Persisted as a JSON-encoded sub-object under
 * `visits.em_documentation.clinical_notes`. If the column already holds a
 * plain (non-JSON) string from an earlier note, we surface it as the
 * `assessment` field so nothing the clinician already wrote is lost.
 */

type ClinicalNotesState = {
  assessment: string;
  discussion: string;
  plan: string;
};

type ClinicalNotesTabProps = {
  visitId: string;
  initial: { clinical_notes?: string } | null;
  readOnly?: boolean;
};

const EMPTY_STATE: ClinicalNotesState = {
  assessment: "",
  discussion: "",
  plan: "",
};

/**
 * Decode the persisted `clinical_notes` blob into the structured shape.
 * Plain strings (pre-structured notes) become the `assessment` field so
 * legacy chart content isn't silently dropped.
 */
function parseInitial(raw: string | undefined): ClinicalNotesState {
  if (!raw || raw.trim().length === 0) {
    return { ...EMPTY_STATE };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...EMPTY_STATE, assessment: raw };
    }
    const obj = parsed as Partial<ClinicalNotesState>;
    return {
      assessment: typeof obj.assessment === "string" ? obj.assessment : "",
      discussion: typeof obj.discussion === "string" ? obj.discussion : "",
      plan: typeof obj.plan === "string" ? obj.plan : "",
    };
  } catch {
    // Not JSON — treat the whole string as the assessment field.
    return { ...EMPTY_STATE, assessment: raw };
  }
}

export function ClinicalNotesTab({
  visitId,
  initial,
  readOnly = false,
}: ClinicalNotesTabProps) {
  const initialState = useMemo(
    () => parseInitial(initial?.clinical_notes),
    [initial?.clinical_notes]
  );

  const [state, setState] = useState<ClinicalNotesState>(initialState);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const hasContent =
    state.assessment.trim().length > 0 ||
    state.discussion.trim().length > 0 ||
    state.plan.trim().length > 0;

  const handleChange = (
    field: keyof ClinicalNotesState,
    value: string
  ) => {
    setState((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    startSave(async () => {
      const serialized = JSON.stringify({
        assessment: state.assessment,
        discussion: state.discussion,
        plan: state.plan,
      });
      // TODO widen EmSections type to include clinical_notes/rx_orders/pmh_flags after Phase 3 lands.
      const res = await updateVisitEmDocumentation(
        visitId,
        { clinical_notes: serialized } as unknown as Parameters<
          typeof updateVisitEmDocumentation
        >[1]
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Clinical notes saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Clinical Notes"
      description="Assessment, discussion, and plan for today's encounter."
      defaultOpen={hasContent}
      headerBadge={
        hasContent ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Filled
          </span>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* ────────────── Clinical Assessment ────────────── */}
        <section className="space-y-2">
          <Label htmlFor="cn-assessment" className="text-sm font-semibold">
            Clinical Assessment
          </Label>
          <Textarea
            id="cn-assessment"
            rows={4}
            placeholder="Impression, clinical reasoning..."
            value={state.assessment}
            onChange={(e) => handleChange("assessment", e.target.value)}
            disabled={readOnly || saving}
          />
        </section>

        {/* ────────────── Clinical Discussion ────────────── */}
        <section className="space-y-2">
          <Label htmlFor="cn-discussion" className="text-sm font-semibold">
            Clinical Discussion
          </Label>
          <Textarea
            id="cn-discussion"
            rows={4}
            placeholder="Etiology, contributing factors, treatment rationale..."
            value={state.discussion}
            onChange={(e) => handleChange("discussion", e.target.value)}
            disabled={readOnly || saving}
          />
        </section>

        {/* ────────────── Plan ────────────── */}
        <section className="space-y-2">
          <Label htmlFor="cn-plan" className="text-sm font-semibold">
            Plan
          </Label>
          <Textarea
            id="cn-plan"
            rows={4}
            placeholder="Care plan, follow-up, referrals..."
            value={state.plan}
            onChange={(e) => handleChange("plan", e.target.value)}
            disabled={readOnly || saving}
          />
        </section>

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
              Save Clinical Notes
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
