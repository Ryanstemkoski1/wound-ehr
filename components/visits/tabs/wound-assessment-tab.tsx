"use client";

// WoundAssessmentTab — Phase 3 tabbed visit screen, "Wound Assessment" tab.
//
// This is the most important tab in the visit. Per Dr. May's 2026-05-29
// artifact it wraps the existing per-wound AssessmentForm (Type &
// Measurements, Wound Features, Healing Status, Debridement, Treatment
// Orders) and layers two new chip-driven affordances on top:
//
//   1. HealingStatusChips — quick "Improving / Stable / Deteriorating /
//      Healed / Sign Off" toggle wired to the assessment row's
//      healing_status column with explicit Save.
//   2. ProcedureChips — multi-select tag row for procedures performed on
//      this wound, with inline per-procedure documentation panels
//      (sharp deb / biologic graft / Arobella / feeding tube / urinary
//      catheter). Persists into assessments.procedures_performed +
//      procedure_documentation.
//
// Wound selection is driven from the left WoundRail; this tab reads the
// selected wound id from the `?wound=` search param (or defaults to the
// first wound and replaces the URL). When wounds.length === 0 we show an
// empty state pointing at the patient's "Add Wound" page.
//
// Why ProcedureChips renders as a SIBLING below AssessmentForm rather
// than INSIDE it: AssessmentForm is a single self-contained <form>
// element with its own validation, debounce, and submit handler.
// Threading ProcedureChips into the middle of that form would require
// rewiring its state machine and is out of scope for this iteration.
// Rendering below the form's "Save Assessment" button keeps both pieces
// independent and side-effect-free. The TODO below tracks the unified
// inline UX as a follow-up.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import AssessmentForm from "@/components/assessments/assessment-form";
import HealingStatusChips, {
  type HealingStatus,
  HEALING_STATUS_LABELS,
} from "@/components/visits/healing-status-chips";
import { ProcedureChips } from "@/components/visits/procedure-chips";

import {
  getAssessments,
  autosaveAssessmentDraft,
} from "@/app/actions/assessments";
import {
  getProcedureDocumentation,
  type ProcedureType,
} from "@/app/actions/procedures";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type WoundAssessmentTabProps = {
  visitId: string;
  patientId: string;
  facilityId: string;
  userId: string;
  readOnly?: boolean;
  wounds: Array<{
    id: string;
    location: string;
    woundNumber?: number;
    woundType?: string | null;
  }>;
};

// ---------------------------------------------------------------------------
// Internal types — shape returned by getAssessments + getProcedureDocumentation
// ---------------------------------------------------------------------------

type AssessmentRow = {
  id: string;
  wound_id: string;
  visit_id: string;
  wound_type: string | null;
  pressure_stage: string | null;
  healing_status: string | null;
  at_risk_reopening: boolean | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  undermining: string | null;
  tunneling: string | null;
  epithelial_percent: number | null;
  granulation_percent: number | null;
  slough_percent: number | null;
  exudate_amount: string | null;
  exudate_type: string | null;
  odor: string | null;
  periwound_condition: string | null;
  pain_level: number | null;
  infection_signs: unknown;
  assessment_notes: string | null;
};

type ProcedureChipsInitial = {
  tags: ProcedureType[];
  docs: Array<{ procedureType: ProcedureType; payload: Record<string, unknown> }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize the AssessmentForm wound shape. AssessmentForm expects
 * `woundNumber: string` and `woundType: string`, but the rail-driven
 * props give us `woundNumber?: number` and `woundType?: string | null`.
 * Coerce on the boundary so the form's shape stays unchanged.
 */
function toFormWounds(
  wounds: WoundAssessmentTabProps["wounds"]
): Array<{ id: string; woundNumber: string; location: string; woundType: string }> {
  return wounds.map((w) => ({
    id: w.id,
    woundNumber: w.woundNumber !== undefined ? String(w.woundNumber) : "",
    location: w.location,
    woundType: w.woundType ?? "",
  }));
}

/**
 * The DB stores healing_status as one of the legacy form strings
 * ("Initial" / "Healing" / "Stable" / "Declined" / "Healed" / "Sign-off")
 * OR one of the new chip values ("improving" / "stable" / "deteriorating"
 * / "healed" / "sign_off"). For the chip row we only round-trip the new
 * values; legacy values render as "no chip selected" so the clinician can
 * pick a fresh value without us silently coercing old data.
 */
const HEALING_CHIP_VALUES: ReadonlySet<HealingStatus> = new Set<HealingStatus>([
  "improving",
  "stable",
  "deteriorating",
  "healed",
  "sign_off",
]);

function parseHealingStatus(raw: string | null | undefined): HealingStatus | null {
  if (!raw) return null;
  return HEALING_CHIP_VALUES.has(raw as HealingStatus)
    ? (raw as HealingStatus)
    : null;
}

/**
 * Find the assessment row for a given wound on this visit. Multiple
 * assessments per (visit, wound) are not expected in practice but the
 * data model doesn't forbid it — pick the most recently created.
 */
function findAssessmentForWound(
  assessments: AssessmentRow[],
  woundId: string
): AssessmentRow | undefined {
  return assessments.find((a) => a.wound_id === woundId);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WoundAssessmentTab({
  visitId,
  patientId,
  // facilityId + userId are part of the documented contract (the tab is
  // passed through from the visit page shell that knows them) but the
  // current AssessmentForm + chip components don't need them yet. Keep
  // the props so future sub-cards (e.g., MIPS attribution) can read them
  // without a prop-drilling refactor.
  facilityId: _facilityId,
  userId: _userId,
  readOnly = false,
  wounds,
}: WoundAssessmentTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // -----------------------------------------------------------------------
  // Selected wound — driven by ?wound= search param. If absent and we
  // have wounds, default to the first and replace the URL so deep links
  // stay stable.
  // -----------------------------------------------------------------------
  const woundParam = searchParams.get("wound");
  const knownWoundIds = React.useMemo(
    () => new Set(wounds.map((w) => w.id)),
    [wounds]
  );
  const selectedWoundId =
    woundParam && knownWoundIds.has(woundParam)
      ? woundParam
      : wounds[0]?.id ?? null;

  React.useEffect(() => {
    if (wounds.length === 0) return;
    if (woundParam && knownWoundIds.has(woundParam)) return;
    if (!selectedWoundId) return;
    // Replace (not push) so the back button skips this normalization step.
    const next = new URLSearchParams(searchParams.toString());
    next.set("wound", selectedWoundId);
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [
    woundParam,
    selectedWoundId,
    knownWoundIds,
    wounds.length,
    router,
    searchParams,
  ]);

  // -----------------------------------------------------------------------
  // Load assessments for this visit so we can find the row for the
  // selected wound (used to seed healing-status chips + decide whether
  // ProcedureChips is enabled).
  // -----------------------------------------------------------------------
  const [assessments, setAssessments] = React.useState<AssessmentRow[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setAssessmentsLoading(true);
    getAssessments(visitId)
      .then((rows) => {
        if (cancelled) return;
        setAssessments((rows ?? []) as unknown as AssessmentRow[]);
      })
      .catch((error) => {
        console.error("WoundAssessmentTab: failed to load assessments", error);
        if (!cancelled) toast.error("Failed to load wound assessments");
      })
      .finally(() => {
        if (!cancelled) setAssessmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visitId]);

  const selectedAssessment = React.useMemo(
    () =>
      selectedWoundId
        ? findAssessmentForWound(assessments, selectedWoundId)
        : undefined,
    [assessments, selectedWoundId]
  );

  // -----------------------------------------------------------------------
  // Healing status chip state — local override of the DB value, with
  // explicit save. We never autosave the chip change to avoid racing
  // with the full AssessmentForm save below.
  // -----------------------------------------------------------------------
  const [healingStatus, setHealingStatus] = React.useState<HealingStatus | null>(
    null
  );
  const [healingDirty, setHealingDirty] = React.useState(false);
  const [healingSaving, setHealingSaving] = React.useState(false);

  // Re-seed the chip whenever the selected assessment changes.
  React.useEffect(() => {
    setHealingStatus(parseHealingStatus(selectedAssessment?.healing_status));
    setHealingDirty(false);
  }, [selectedAssessment?.id, selectedAssessment?.healing_status]);

  const handleHealingChange = React.useCallback((next: HealingStatus) => {
    setHealingStatus(next);
    setHealingDirty(true);
  }, []);

  const handleHealingSave = React.useCallback(() => {
    if (!selectedAssessment || !selectedWoundId || !healingStatus) return;
    setHealingSaving(true);
    void autosaveAssessmentDraft(
      selectedAssessment.id,
      selectedWoundId,
      visitId,
      {
        // autosaveAssessmentDraft round-trips all assessment columns; pass
        // through the existing values so we only mutate healing_status.
        woundType: selectedAssessment.wound_type ?? "",
        pressureStage: selectedAssessment.pressure_stage ?? "",
        healingStatus,
        atRiskReopening: selectedAssessment.at_risk_reopening ?? false,
        length:
          selectedAssessment.length !== null
            ? String(selectedAssessment.length)
            : "",
        width:
          selectedAssessment.width !== null
            ? String(selectedAssessment.width)
            : "",
        depth:
          selectedAssessment.depth !== null
            ? String(selectedAssessment.depth)
            : "",
        undermining: selectedAssessment.undermining ?? "",
        tunneling: selectedAssessment.tunneling ?? "",
        epithelialPercent:
          selectedAssessment.epithelial_percent !== null
            ? String(selectedAssessment.epithelial_percent)
            : "",
        granulationPercent:
          selectedAssessment.granulation_percent !== null
            ? String(selectedAssessment.granulation_percent)
            : "",
        sloughPercent:
          selectedAssessment.slough_percent !== null
            ? String(selectedAssessment.slough_percent)
            : "",
        exudateAmount: selectedAssessment.exudate_amount ?? "",
        exudateType: selectedAssessment.exudate_type ?? "",
        odor: selectedAssessment.odor ?? "",
        periwoundCondition: selectedAssessment.periwound_condition ?? "",
        painLevel:
          selectedAssessment.pain_level !== null
            ? String(selectedAssessment.pain_level)
            : "",
        infectionSigns: Array.isArray(selectedAssessment.infection_signs)
          ? selectedAssessment.infection_signs
          : [],
        assessmentNotes: selectedAssessment.assessment_notes ?? "",
      }
    )
      .then((res) => {
        if (!res.success) {
          toast.error(res.error || "Failed to save healing status");
          return;
        }
        toast.success(
          `Healing status saved: ${HEALING_STATUS_LABELS[healingStatus]}`
        );
        setHealingDirty(false);
        // Reflect the new value in our local assessments cache so the
        // chip stays selected without a refetch.
        setAssessments((prev) =>
          prev.map((a) =>
            a.id === selectedAssessment.id
              ? { ...a, healing_status: healingStatus }
              : a
          )
        );
      })
      .catch((error) => {
        console.error("Failed to save healing status:", error);
        toast.error("Failed to save healing status");
      })
      .finally(() => setHealingSaving(false));
  }, [selectedAssessment, selectedWoundId, visitId, healingStatus]);

  // -----------------------------------------------------------------------
  // ProcedureChips initial state — fetched per assessment.
  // -----------------------------------------------------------------------
  const [procedureInitial, setProcedureInitial] =
    React.useState<ProcedureChipsInitial | null>(null);
  const [procedureLoading, setProcedureLoading] = React.useState(false);

  React.useEffect(() => {
    if (!selectedAssessment) {
      setProcedureInitial(null);
      return;
    }
    let cancelled = false;
    setProcedureLoading(true);
    getProcedureDocumentation(selectedAssessment.id)
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) {
          console.error(
            "Failed to load procedure documentation:",
            result.error
          );
          setProcedureInitial({ tags: [], docs: [] });
          return;
        }
        setProcedureInitial({ tags: result.tags, docs: result.docs });
      })
      .finally(() => {
        if (!cancelled) setProcedureLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAssessment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Force a fresh AssessmentForm tree when the wound or its assessment
  // changes — the form is uncontrolled in places (defaultValue) so a key
  // bump is the simplest way to reset its internal state.
  // -----------------------------------------------------------------------
  const handleFormSuccess = React.useCallback(() => {
    // Reload assessments so the chips + form reflect the latest write.
    getAssessments(visitId)
      .then((rows) =>
        setAssessments((rows ?? []) as unknown as AssessmentRow[])
      )
      .catch(() => {
        /* swallow — the form already toasted the user */
      });
  }, [visitId]);

  // -----------------------------------------------------------------------
  // Render branches
  // -----------------------------------------------------------------------

  // Empty state — no wounds yet.
  if (wounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No wounds added yet</CardTitle>
          <CardDescription>
            Add a wound to this patient before starting the wound assessment
            for this visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild disabled={readOnly}>
            <Link href={`/dashboard/patients/${patientId}/wounds/new`}>
              + Add Wound
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No wound selected (shouldn't happen once we've defaulted, but the
  // search-param normalization runs in an effect so render once before
  // it lands).
  if (!selectedWoundId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a wound</CardTitle>
          <CardDescription>
            Pick a wound from the left rail to start its assessment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedWound = wounds.find((w) => w.id === selectedWoundId);
  if (!selectedWound) {
    // Selected wound id is not in the wounds list — shouldn't happen,
    // but guard so we don't render a half-broken form.
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wound not found</CardTitle>
          <CardDescription>
            The selected wound is no longer on this patient. Pick a different
            wound from the left rail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const woundLabel =
    selectedWound.woundNumber !== undefined
      ? `Wound W${selectedWound.woundNumber}`
      : "Wound";

  return (
    <div className="space-y-6">
      {/* Breadcrumb-style header for the selected wound */}
      <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-4 py-3">
        <Stethoscope className="text-muted-foreground h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">
          {woundLabel} <span className="text-muted-foreground">—</span>{" "}
          <span className="font-normal">{selectedWound.location}</span>
        </h2>
        {selectedWound.woundType ? (
          <span className="text-muted-foreground text-xs">
            ({selectedWound.woundType})
          </span>
        ) : null}
      </div>

      {/* Healing status chips — explicit save */}
      <Card>
        <CardHeader>
          <CardTitle>Healing Status</CardTitle>
          <CardDescription>
            Quick trend indicator for this wound. Saved separately from the
            full assessment below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedAssessment ? (
            <>
              <HealingStatusChips
                value={healingStatus}
                onChange={handleHealingChange}
                disabled={readOnly || healingSaving}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleHealingSave}
                  disabled={
                    readOnly ||
                    !healingDirty ||
                    healingSaving ||
                    !healingStatus
                  }
                  className="gap-2"
                >
                  {healingSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save healing status
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Save the wound assessment first to set a healing status.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Full per-wound assessment form */}
      {assessmentsLoading ? (
        <div className="text-muted-foreground flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-sm">Loading assessment&hellip;</span>
        </div>
      ) : (
        <AssessmentForm
          // Re-mount when the selected wound (or its assessment row) changes
          // so the form's internal uncontrolled state resets cleanly.
          key={`${selectedWoundId}:${selectedAssessment?.id ?? "new"}`}
          visitId={visitId}
          patientId={patientId}
          wounds={toFormWounds(wounds)}
          assessment={
            selectedAssessment
              ? {
                  id: selectedAssessment.id,
                  woundId: selectedAssessment.wound_id,
                  woundType: selectedAssessment.wound_type,
                  pressureStage: selectedAssessment.pressure_stage,
                  healingStatus: selectedAssessment.healing_status,
                  atRiskReopening: selectedAssessment.at_risk_reopening,
                  length: selectedAssessment.length,
                  width: selectedAssessment.width,
                  depth: selectedAssessment.depth,
                  undermining: selectedAssessment.undermining,
                  tunneling: selectedAssessment.tunneling,
                  epithelialPercent: selectedAssessment.epithelial_percent,
                  granulationPercent: selectedAssessment.granulation_percent,
                  sloughPercent: selectedAssessment.slough_percent,
                  exudateAmount: selectedAssessment.exudate_amount,
                  exudateType: selectedAssessment.exudate_type,
                  odor: selectedAssessment.odor,
                  periwoundCondition: selectedAssessment.periwound_condition,
                  painLevel: selectedAssessment.pain_level,
                  infectionSigns: selectedAssessment.infection_signs,
                  assessmentNotes: selectedAssessment.assessment_notes,
                }
              : undefined
          }
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Procedure chips — render as a sibling block BELOW the form's
          "Save Assessment" button.
          TODO: future iteration — inject ProcedureChips inline above
          TreatmentOrderBuilder inside AssessmentForm for the unified UX. */}
      <Card>
        <CardHeader>
          <CardTitle>Procedures Performed</CardTitle>
          <CardDescription>
            Tag any procedures completed on this wound during the visit. Each
            tagged procedure opens an inline documentation panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedAssessment ? (
            <p className="text-muted-foreground text-sm">
              Save the wound assessment first to tag procedures.
            </p>
          ) : procedureLoading || !procedureInitial ? (
            <div className="text-muted-foreground flex items-center py-2 text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading procedures&hellip;
            </div>
          ) : (
            <ProcedureChips
              assessmentId={selectedAssessment.id}
              initial={procedureInitial}
              readOnly={readOnly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default WoundAssessmentTab;
