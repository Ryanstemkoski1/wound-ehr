"use client";

// Inline documentation for the "Feeding Tube (G-Tube) Change" procedure,
// rendered as a chip when the clinician tags `feeding_tube_change` on the
// unified wound assessment (see app/actions/procedures.ts).
//
// Source: Dr. May's PDF "G-Tube Replacement/Removal Procedure Note".
//
// Contract:
//   - Controlled component: parent owns the payload state and persists it
//     via saveProcedureDocumentation(assessmentId, "feeding_tube_change", payload).
//   - `initial` seeds the form on mount; subsequent edits flow through
//     onChange so the parent can debounce/save and re-flow into siblings.
//   - readOnly hides the actions but keeps the values visible for signed
//     visits.
//
// Mandatory confirmations (section 3) are tracked here for UX hinting only —
// the parent decides what "complete" means for sign-off; we surface
// `isComplete` in the payload so the assessment summary can light up.

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Option lists — kept as const so renaming a label cannot drift from the
// value persisted to procedure_documentation.payload.
// ---------------------------------------------------------------------------

const PROCEDURE_TYPES = [
  "Emergent replacement with contrast",
  "Emergent without contrast",
  "Routine with contrast",
  "Routine without contrast",
  "Removal of G-tube",
  "Other",
] as const;

const ABDOMINAL_EXAM = [
  "Soft",
  "Non-distended",
  "Distended",
  "Tender",
  "Non-tender",
  "Other",
] as const;

const PREVIOUS_TUBE_TYPES = ["PEG", "Balloon type tube", "Other"] as const;

const PERI_TUBE_FINDINGS = [
  "Bleeding",
  "Leakage",
  "Ulceration",
  "Purulence",
  "Erythema",
  "Hypergranulation",
  "Tenderness on manipulation",
] as const;

const REPLACEMENT_REASONS = [
  "Dislodgement",
  "Leakage",
  "Damaged-malfunctioning",
  "Infection",
  "Deterioration due to age",
  "Obstruction",
  "Other",
] as const;

const PLACEMENT_VERIFICATION = [
  "Instillation of dilute Gastrografin via feeding port followed by KUB",
  "X-ray reviewed by provider",
  "Auscultation with air insufflation",
  "Other",
] as const;

const FEEDING_INSTRUCTIONS = [
  "Wait for radiology confirmation before resuming feedings",
  "Cleared to resume feeding after radiology confirmation",
] as const;

const REMOVAL_RESISTANCE = [
  "No discernable resistance",
  "mild resistance",
  "moderate resistance",
  "No visible bleeding",
  "bleeding",
] as const;

const TOLERANCE_OPTIONS = [
  "Procedure tolerated well",
  "Not tolerated well",
] as const;

// ---------------------------------------------------------------------------
// Payload shape
// ---------------------------------------------------------------------------

type State = {
  // Section 1
  procedureTypes: string[];
  lastReplacementDate: string;
  // Section 2
  abdominalExam: string[];
  previousTubeType: string[];
  periTubeFindings: string[];
  // Section 3
  confirmConsentPhysician: boolean;
  confirmConsentPatientFamily: boolean;
  confirmTubePresentOverSixWeeks: boolean;
  confirmNotJejunostomyOrGJ: boolean;
  // Section 4
  newTubeSizeFr: string;
  newTubeBalloonCc: string;
  // Section 5
  reasonsForReplacement: string[];
  // Section 6
  placementVerification: string[];
  // Section 7
  feedingInstructions: string[];
  // Section 8 — templated procedure note fills
  benzocaineApplied: boolean;
  removalResistance: string[];
  removalBleedingCc: string;
  newSiliconeSizeFr: string;
  salineInstilledCc: string;
  hypergranulationTreated: boolean;
  silverNitrateSticks: string;
  toleranceOptions: string[];
  postProcedureDressing: boolean;
  postProcedureDressingDays: string;
  // Section 9
  comments: string;
  // Section 10
  nextReplacementDate: string;
};

const EMPTY: State = {
  procedureTypes: [],
  lastReplacementDate: "",
  abdominalExam: [],
  previousTubeType: [],
  periTubeFindings: [],
  confirmConsentPhysician: false,
  confirmConsentPatientFamily: false,
  confirmTubePresentOverSixWeeks: false,
  confirmNotJejunostomyOrGJ: false,
  newTubeSizeFr: "",
  newTubeBalloonCc: "",
  reasonsForReplacement: [],
  placementVerification: [],
  feedingInstructions: [],
  benzocaineApplied: false,
  removalResistance: [],
  removalBleedingCc: "",
  newSiliconeSizeFr: "",
  salineInstilledCc: "",
  hypergranulationTreated: false,
  silverNitrateSticks: "",
  toleranceOptions: [],
  postProcedureDressing: false,
  postProcedureDressingDays: "",
  comments: "",
  nextReplacementDate: "",
};

// Coerce an arbitrary `initial` blob (which may have come from a stored
// payload of an older schema, or be empty) into our local State.
function hydrate(initial: Record<string, unknown>): State {
  const str = (k: keyof State, fallback = ""): string => {
    const v = initial[k];
    return typeof v === "string" ? v : fallback;
  };
  const bool = (k: keyof State): boolean => initial[k] === true;
  const arr = (k: keyof State): string[] => {
    const v = initial[k];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  };

  return {
    procedureTypes: arr("procedureTypes"),
    lastReplacementDate: str("lastReplacementDate"),
    abdominalExam: arr("abdominalExam"),
    previousTubeType: arr("previousTubeType"),
    periTubeFindings: arr("periTubeFindings"),
    confirmConsentPhysician: bool("confirmConsentPhysician"),
    confirmConsentPatientFamily: bool("confirmConsentPatientFamily"),
    confirmTubePresentOverSixWeeks: bool("confirmTubePresentOverSixWeeks"),
    confirmNotJejunostomyOrGJ: bool("confirmNotJejunostomyOrGJ"),
    newTubeSizeFr: str("newTubeSizeFr"),
    newTubeBalloonCc: str("newTubeBalloonCc"),
    reasonsForReplacement: arr("reasonsForReplacement"),
    placementVerification: arr("placementVerification"),
    feedingInstructions: arr("feedingInstructions"),
    benzocaineApplied: bool("benzocaineApplied"),
    removalResistance: arr("removalResistance"),
    removalBleedingCc: str("removalBleedingCc"),
    newSiliconeSizeFr: str("newSiliconeSizeFr"),
    salineInstilledCc: str("salineInstilledCc"),
    hypergranulationTreated: bool("hypergranulationTreated"),
    silverNitrateSticks: str("silverNitrateSticks"),
    toleranceOptions: arr("toleranceOptions"),
    postProcedureDressing: bool("postProcedureDressing"),
    postProcedureDressingDays: str("postProcedureDressingDays"),
    comments: str("comments"),
    nextReplacementDate: str("nextReplacementDate"),
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type FeedingTubeChangeDocProps = {
  assessmentId: string;
  initial: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
  readOnly?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedingTubeChangeDoc({
  assessmentId,
  initial,
  onChange,
  readOnly = false,
}: FeedingTubeChangeDocProps) {
  const [state, setState] = useState<State>(() => hydrate(initial));

  // All four mandatory boxes in section 3 must be ticked for "complete".
  const isComplete = useMemo(
    () =>
      state.confirmConsentPhysician &&
      state.confirmConsentPatientFamily &&
      state.confirmTubePresentOverSixWeeks &&
      state.confirmNotJejunostomyOrGJ,
    [
      state.confirmConsentPhysician,
      state.confirmConsentPatientFamily,
      state.confirmTubePresentOverSixWeeks,
      state.confirmNotJejunostomyOrGJ,
    ]
  );

  const emit = useCallback(
    (next: State) => {
      onChange({
        assessmentId,
        ...next,
        isComplete:
          next.confirmConsentPhysician &&
          next.confirmConsentPatientFamily &&
          next.confirmTubePresentOverSixWeeks &&
          next.confirmNotJejunostomyOrGJ,
      });
    },
    [assessmentId, onChange]
  );

  const update = useCallback(
    <K extends keyof State>(key: K, value: State[K]) => {
      if (readOnly) return;
      setState((prev) => {
        const next = { ...prev, [key]: value };
        emit(next);
        return next;
      });
    },
    [emit, readOnly]
  );

  const toggleChip = useCallback(
    (key: keyof State, option: string) => {
      if (readOnly) return;
      setState((prev) => {
        const current = (prev[key] as string[]) ?? [];
        const has = current.includes(option);
        const nextList = has
          ? current.filter((v) => v !== option)
          : [...current, option];
        const next = { ...prev, [key]: nextList } as State;
        emit(next);
        return next;
      });
    },
    [emit, readOnly]
  );

  return (
    <Card className="border-2">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Feeding Tube (G-Tube) Change — Procedure Note</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isComplete
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            )}
          >
            {isComplete ? "Mandatory confirmations complete" : "Confirmations pending"}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* 1. PROCEDURE TYPE */}
        <Section title="Procedure Type">
          <ChipRow
            idPrefix="ftc-proctype"
            options={PROCEDURE_TYPES}
            selected={state.procedureTypes}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("procedureTypes", opt)}
          />
          <Field
            id="ftc-last-replacement-date"
            label="G-tube placement date and/or last G-Tube replacement date"
          >
            <Input
              id="ftc-last-replacement-date"
              type="date"
              value={state.lastReplacementDate}
              disabled={readOnly}
              onChange={(e) => update("lastReplacementDate", e.target.value)}
            />
          </Field>
        </Section>

        {/* 2. EXAM */}
        <Section title="Exam">
          <SubLabel>Abdominal Exam</SubLabel>
          <ChipRow
            idPrefix="ftc-abdex"
            options={ABDOMINAL_EXAM}
            selected={state.abdominalExam}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("abdominalExam", opt)}
          />

          <SubLabel>Previous Tube Type</SubLabel>
          <ChipRow
            idPrefix="ftc-prevtube"
            options={PREVIOUS_TUBE_TYPES}
            selected={state.previousTubeType}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("previousTubeType", opt)}
          />

          <SubLabel>Peri-Tube Findings</SubLabel>
          <ChipRow
            idPrefix="ftc-peri"
            options={PERI_TUBE_FINDINGS}
            selected={state.periTubeFindings}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("periTubeFindings", opt)}
          />
        </Section>

        {/* 3. MANDATORY CONFIRMATIONS */}
        <Section title="Mandatory Confirmations">
          <p className="text-muted-foreground text-xs">
            All four items must be checked before this documentation is
            considered complete.
          </p>
          <div className="space-y-2">
            <ConfirmBox
              id="ftc-confirm-consent-physician"
              checked={state.confirmConsentPhysician}
              disabled={readOnly}
              onCheckedChange={(v) => update("confirmConsentPhysician", v)}
              label="Consent obtained by primary physician prior to procedure"
            />
            <ConfirmBox
              id="ftc-confirm-consent-patient-family"
              checked={state.confirmConsentPatientFamily}
              disabled={readOnly}
              onCheckedChange={(v) => update("confirmConsentPatientFamily", v)}
              label="Consent obtained from patient or family prior to procedure"
            />
            <ConfirmBox
              id="ftc-confirm-tube-over-6wk"
              checked={state.confirmTubePresentOverSixWeeks}
              disabled={readOnly}
              onCheckedChange={(v) =>
                update("confirmTubePresentOverSixWeeks", v)
              }
              label="Confirmed G-tube has been present for > 6 weeks"
            />
            <ConfirmBox
              id="ftc-confirm-not-jejunostomy"
              checked={state.confirmNotJejunostomyOrGJ}
              disabled={readOnly}
              onCheckedChange={(v) => update("confirmNotJejunostomyOrGJ", v)}
              label="Confirmed patient does NOT have a Jejunostomy or G-J tube"
            />
          </div>
        </Section>

        {/* 4. New / Replacement Tube */}
        <Section title="New / Replacement Tube">
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="ftc-new-tube-size" label="Tube Type Size (Fr)">
              <Input
                id="ftc-new-tube-size"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="e.g., 20"
                value={state.newTubeSizeFr}
                disabled={readOnly}
                onChange={(e) => update("newTubeSizeFr", e.target.value)}
              />
            </Field>
            <Field id="ftc-new-tube-balloon" label="Balloon capacity (cc)">
              <Input
                id="ftc-new-tube-balloon"
                type="number"
                inputMode="numeric"
                step="0.1"
                min={0}
                placeholder="e.g., 10"
                value={state.newTubeBalloonCc}
                disabled={readOnly}
                onChange={(e) => update("newTubeBalloonCc", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* 5. Reason for Replacement */}
        <Section title="Reason for Replacement">
          <ChipRow
            idPrefix="ftc-reason"
            options={REPLACEMENT_REASONS}
            selected={state.reasonsForReplacement}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("reasonsForReplacement", opt)}
          />
        </Section>

        {/* 6. Verification of Placement */}
        <Section title="Verification of Placement">
          <ChipRow
            idPrefix="ftc-verify"
            options={PLACEMENT_VERIFICATION}
            selected={state.placementVerification}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("placementVerification", opt)}
          />
        </Section>

        {/* 7. Feeding Instructions */}
        <Section title="Feeding Instructions">
          <ChipRow
            idPrefix="ftc-feeding"
            options={FEEDING_INSTRUCTIONS}
            selected={state.feedingInstructions}
            disabled={readOnly}
            onToggle={(opt) => toggleChip("feedingInstructions", opt)}
          />
        </Section>

        {/* 8. PROCEDURE NOTE — templated paragraph with inline fills */}
        <Section title="Procedure Note">
          <p className="text-sm leading-relaxed">
            The patient was placed in supine position with the mid abdominal
            ostomy clearly visualized. The ostomy site was cleansed with NS and
            betadine.
          </p>

          <ConfirmBox
            id="ftc-benzocaine"
            checked={state.benzocaineApplied}
            disabled={readOnly}
            onCheckedChange={(v) => update("benzocaineApplied", v)}
            label="20% Benzocaine spray applied to stoma site and periwound skin."
          />

          <div className="space-y-2">
            <p className="text-sm">
              The old G-tube was carefully grasped and then removed with:
            </p>
            <ChipRow
              idPrefix="ftc-removal"
              options={REMOVAL_RESISTANCE}
              selected={state.removalResistance}
              disabled={readOnly}
              onToggle={(opt) => toggleChip("removalResistance", opt)}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="ftc-removal-bleeding-cc" className="text-xs">
                Bleeding amount (cc)
              </Label>
              <Input
                id="ftc-removal-bleeding-cc"
                type="number"
                inputMode="numeric"
                step="0.1"
                min={0}
                className="h-8 w-24"
                value={state.removalBleedingCc}
                disabled={readOnly}
                onChange={(e) => update("removalBleedingCc", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              A new Silicone{" "}
              <InlineInput
                id="ftc-new-silicone-size"
                placeholder="size"
                value={state.newSiliconeSizeFr}
                disabled={readOnly}
                onChange={(v) => update("newSiliconeSizeFr", v)}
                type="number"
              />{" "}
              Fr g-tube was then carefully placed through the stoma site with no
              discernable resistance and instilled with{" "}
              <InlineInput
                id="ftc-saline-instilled"
                placeholder="cc"
                value={state.salineInstilledCc}
                disabled={readOnly}
                onChange={(v) => update("salineInstilledCc", v)}
                type="number"
              />{" "}
              cc of sterile saline.
            </p>
          </div>

          <div className="space-y-2">
            <ConfirmBox
              id="ftc-hypergranulation-treated"
              checked={state.hypergranulationTreated}
              disabled={readOnly}
              onCheckedChange={(v) => update("hypergranulationTreated", v)}
              label={
                <span>
                  Hypergranulation present and treated with{" "}
                  <InlineInput
                    id="ftc-silver-nitrate-sticks"
                    placeholder="#"
                    value={state.silverNitrateSticks}
                    disabled={readOnly || !state.hypergranulationTreated}
                    onChange={(v) => update("silverNitrateSticks", v)}
                    type="number"
                  />{" "}
                  silver nitrate sticks.
                </span>
              }
            />
          </div>

          <div className="space-y-2">
            <SubLabel>Tolerance</SubLabel>
            <ChipRow
              idPrefix="ftc-tolerance"
              options={TOLERANCE_OPTIONS}
              selected={state.toleranceOptions}
              disabled={readOnly}
              onToggle={(opt) => toggleChip("toleranceOptions", opt)}
            />
          </div>

          <div className="space-y-2">
            <ConfirmBox
              id="ftc-post-dressing"
              checked={state.postProcedureDressing}
              disabled={readOnly}
              onCheckedChange={(v) => update("postProcedureDressing", v)}
              label={
                <span>
                  Will request facility to cover ostomy site with CaAlginate and
                  dry dressing for{" "}
                  <InlineInput
                    id="ftc-post-dressing-days"
                    placeholder="days"
                    value={state.postProcedureDressingDays}
                    disabled={readOnly || !state.postProcedureDressing}
                    onChange={(v) => update("postProcedureDressingDays", v)}
                    type="number"
                  />{" "}
                  days.
                </span>
              }
            />
          </div>
        </Section>

        {/* 9. COMMENTS / RECOMMENDATIONS */}
        <Section title="Comments / Recommendations">
          <Textarea
            id="ftc-comments"
            rows={4}
            placeholder="Additional comments or recommendations..."
            value={state.comments}
            disabled={readOnly}
            onChange={(e) => update("comments", e.target.value)}
          />
        </Section>

        {/* 10. NEXT REPLACEMENT DATE */}
        <Section title="Next Replacement Date">
          <Field id="ftc-next-replacement-date" label="Anticipated next replacement">
            <Input
              id="ftc-next-replacement-date"
              type="date"
              value={state.nextReplacementDate}
              disabled={readOnly}
              onChange={(e) => update("nextReplacementDate", e.target.value)}
            />
          </Field>
        </Section>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Local presentational helpers — kept inline so this file is self-contained.
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight uppercase">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs font-medium">{children}</p>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChipRow({
  idPrefix,
  options,
  selected,
  disabled,
  onToggle,
}: {
  idPrefix: string;
  options: readonly string[];
  selected: string[];
  disabled?: boolean;
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, idx) => {
        const isOn = selected.includes(opt);
        return (
          <Button
            key={opt}
            id={`${idPrefix}-${idx}`}
            type="button"
            size="sm"
            variant={isOn ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={isOn}
            onClick={() => onToggle(opt)}
            className="h-8 rounded-full text-xs"
          >
            {opt}
          </Button>
        );
      })}
    </div>
  );
}

function ConfirmBox({
  id,
  checked,
  disabled,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="cursor-pointer text-sm leading-snug">
        {label}
      </Label>
    </div>
  );
}

function InlineInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "number";
}) {
  return (
    <Input
      id={id}
      type={type}
      inputMode={type === "number" ? "numeric" : undefined}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="inline-block h-7 w-16 px-2 align-baseline text-sm"
    />
  );
}

export { FeedingTubeChangeDoc };
