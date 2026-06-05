"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * UrinaryCatheterDoc — Inline documentation for an Indwelling (Urinary)
 * Catheter Replacement procedure. Modeled on Dr. May's PDF
 * "Indwelling Catheter Replacement".
 *
 * The component is fully controlled by a single `state` object that is
 * bubbled up via `onChange` on every edit. The parent decides how/when
 * to persist it (typically as part of the procedure's `documentation`
 * JSONB payload on the assessment row).
 */

export type UrinaryCatheterDocProps = {
  assessmentId: string;
  initial: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
  readOnly?: boolean;
};

type DocState = {
  // 1. Comorbidities
  comorbidities: string[];
  comorbiditiesOther: string;
  // 2. Discussion
  discussion: string;
  // 3. Procedure performed
  procedurePerformed: string[];
  procedurePerformedOther: string;
  // 4. Abdominal exam
  abdominalExam: string[];
  abdominalDistendedTenderness: "tender" | "nontender" | "";
  abdominalExamOther: string;
  // 5. Catheter placement
  catheterPlacement: string[];
  catheterPlacementOther: string;
  // 6. Peri-tube finding(s)
  periTubeFindings: string[];
  periTubeFindingsOther: string;
  // 7. Date of last urinary catheter placement
  lastPlacementDate: string;
  lastPlacementUnknown: boolean;
  // 8. Replacement Foley
  replacementSizeFr: string;
  balloonType: boolean;
  balloonCapacityCc: string;
  // 9. Reason for replacement
  reasonForReplacement: string[];
  reasonForReplacementOther: string;
  // 10. Procedure note
  consentObtained: boolean;
  consentReasons: string[];
  consentReasonsOther: string;
  oldFoleyRemovalNotes: string[];
  oldFoleyBleedingCc: string;
  newFoleySizeFr: string;
  newFoleyRoute: string[];
  newFoleyRouteOther: string;
  newFoleySalineCc: string;
  noVisibleBleeding: boolean;
  bleedingControlled: boolean;
  toleratedWell: boolean;
  notToleratedWell: boolean;
  willRequestDressing: boolean;
  dressingDays: string;
  catheterConfirmedByUrine: boolean;
  // 11. Comments
  commentsRecs: string;
};

const COMORBIDITIES: { label: string; highlight?: boolean }[] = [
  { label: "Immobility" },
  { label: "Obesity" },
  { label: "Hyper mobility" },
  { label: "Contracture" },
  { label: "Oliguria", highlight: true },
  { label: "Urinary Retention", highlight: true },
  { label: "Neuropathy" },
  { label: "CVA" },
  { label: "Limited mobility" },
  { label: "Atherosclerosis" },
  { label: "BPH", highlight: true },
  { label: "Urinary Obstruction", highlight: true },
  { label: "Diabetes" },
  { label: "Resp Failure" },
  { label: "Encephalopathy" },
  { label: "Incontinence", highlight: true },
];

const PROCEDURE_PERFORMED = [
  "Emergent Replacement of urinary catheter",
  "Non-emergent Replacement",
  "D/C and removal",
];

const ABDOMINAL_EXAM_PRIMARY = ["Soft", "Non-distended", "Distended"];

const CATHETER_PLACEMENT = ["Urethral tube", "Suprapubic tube"];

const PERI_TUBE_FINDINGS = [
  "Bleeding",
  "Ulceration",
  "Erythema",
  "Tenderness on Manipulation",
  "Leakage",
  "Purulence",
  "Hypergranulation",
];

const REASON_FOR_REPLACEMENT = [
  "Dislodgement",
  "Damaged-Malfunction",
  "Infection",
  "Leakage",
  "Hygiene-Maintenance",
  "Obstruction",
];

const CONSENT_REASONS = [
  "Displacement",
  "Severe deterioration along the stem",
  "recurrent obstruction",
];

const OLD_FOLEY_REMOVAL = ["No resistance", "Mild resistance", "Moderate resistance", "Significant resistance"];

const NEW_FOLEY_ROUTE = ["urethra", "stoma"];

function defaultState(initial: Record<string, unknown>): DocState {
  const i = initial as Partial<DocState> | undefined;
  return {
    comorbidities: i?.comorbidities ?? [],
    comorbiditiesOther: i?.comorbiditiesOther ?? "",
    discussion: i?.discussion ?? "",
    procedurePerformed: i?.procedurePerformed ?? [],
    procedurePerformedOther: i?.procedurePerformedOther ?? "",
    abdominalExam: i?.abdominalExam ?? [],
    abdominalDistendedTenderness: i?.abdominalDistendedTenderness ?? "",
    abdominalExamOther: i?.abdominalExamOther ?? "",
    catheterPlacement: i?.catheterPlacement ?? [],
    catheterPlacementOther: i?.catheterPlacementOther ?? "",
    periTubeFindings: i?.periTubeFindings ?? [],
    periTubeFindingsOther: i?.periTubeFindingsOther ?? "",
    lastPlacementDate: i?.lastPlacementDate ?? "",
    lastPlacementUnknown: i?.lastPlacementUnknown ?? false,
    replacementSizeFr: i?.replacementSizeFr ?? "",
    balloonType: i?.balloonType ?? false,
    balloonCapacityCc: i?.balloonCapacityCc ?? "",
    reasonForReplacement: i?.reasonForReplacement ?? [],
    reasonForReplacementOther: i?.reasonForReplacementOther ?? "",
    consentObtained: i?.consentObtained ?? false,
    consentReasons: i?.consentReasons ?? [],
    consentReasonsOther: i?.consentReasonsOther ?? "",
    oldFoleyRemovalNotes: i?.oldFoleyRemovalNotes ?? [],
    oldFoleyBleedingCc: i?.oldFoleyBleedingCc ?? "",
    newFoleySizeFr: i?.newFoleySizeFr ?? "",
    newFoleyRoute: i?.newFoleyRoute ?? [],
    newFoleyRouteOther: i?.newFoleyRouteOther ?? "",
    newFoleySalineCc: i?.newFoleySalineCc ?? "",
    noVisibleBleeding: i?.noVisibleBleeding ?? false,
    bleedingControlled: i?.bleedingControlled ?? false,
    toleratedWell: i?.toleratedWell ?? false,
    notToleratedWell: i?.notToleratedWell ?? false,
    willRequestDressing: i?.willRequestDressing ?? false,
    dressingDays: i?.dressingDays ?? "",
    catheterConfirmedByUrine: i?.catheterConfirmedByUrine ?? false,
    commentsRecs: i?.commentsRecs ?? "",
  };
}

function Chip({
  id,
  label,
  selected,
  onToggle,
  disabled,
  highlight,
}: {
  id: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : highlight
            ? "border-yellow-400 bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-100"
            : "border-input bg-background text-foreground hover:bg-muted",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function UrinaryCatheterDoc({
  assessmentId,
  initial,
  onChange,
  readOnly = false,
}: UrinaryCatheterDocProps) {
  const [state, setState] = React.useState<DocState>(() => defaultState(initial));

  // Keep a stable ref to the latest onChange to avoid effect churn.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const update = React.useCallback(
    <K extends keyof DocState>(key: K, value: DocState[K]) => {
      setState((prev) => {
        const next = { ...prev, [key]: value };
        // Bubble up the merged JSON payload (include assessmentId so the
        // parent can sanity-check it matches what it expects).
        onChangeRef.current({ ...next, assessmentId });
        return next;
      });
    },
    [assessmentId]
  );

  const toggleChip = React.useCallback(
    (key: keyof DocState, value: string) => {
      setState((prev) => {
        const current = (prev[key] as string[]) ?? [];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        const merged = { ...prev, [key]: next };
        onChangeRef.current({ ...merged, assessmentId });
        return merged;
      });
    },
    [assessmentId]
  );

  const has = (key: keyof DocState, value: string) =>
    ((state[key] as string[]) ?? []).includes(value);

  const isDistended = has("abdominalExam", "Distended");

  return (
    <div className="space-y-4">
      {/* 1. Comorbidities */}
      <Section title="Comorbidities">
        <div className="flex flex-wrap gap-2">
          {COMORBIDITIES.map((c) => (
            <Chip
              key={c.label}
              id={`ucc-comorbidity-${c.label.replace(/\s+/g, "-").toLowerCase()}`}
              label={c.label}
              selected={has("comorbidities", c.label)}
              onToggle={() => toggleChip("comorbidities", c.label)}
              disabled={readOnly}
              highlight={c.highlight}
            />
          ))}
          <Chip
            id="ucc-comorbidity-other"
            label="Other"
            selected={has("comorbidities", "Other")}
            onToggle={() => toggleChip("comorbidities", "Other")}
            disabled={readOnly}
          />
        </div>
        {has("comorbidities", "Other") && (
          <div className="space-y-1">
            <Label htmlFor="ucc-comorbidities-other-text">Other comorbidities</Label>
            <Input
              id="ucc-comorbidities-other-text"
              value={state.comorbiditiesOther}
              onChange={(e) => update("comorbiditiesOther", e.target.value)}
              disabled={readOnly}
              placeholder="Specify"
            />
          </div>
        )}
      </Section>

      {/* 2. Discussion / Relevant Interim History */}
      <Section title="Discussion / Relevant Interim History">
        <Textarea
          id="ucc-discussion"
          value={state.discussion}
          onChange={(e) => update("discussion", e.target.value)}
          disabled={readOnly}
          rows={4}
          placeholder="Interim history, concerns, family/staff report..."
        />
      </Section>

      {/* 3. Procedure performed */}
      <Section title="Procedure performed">
        <div className="flex flex-wrap gap-2">
          {PROCEDURE_PERFORMED.map((p) => (
            <Chip
              key={p}
              id={`ucc-procedure-${p.replace(/[\s/]+/g, "-").toLowerCase()}`}
              label={p}
              selected={has("procedurePerformed", p)}
              onToggle={() => toggleChip("procedurePerformed", p)}
              disabled={readOnly}
            />
          ))}
          <Chip
            id="ucc-procedure-other"
            label="Other"
            selected={has("procedurePerformed", "Other")}
            onToggle={() => toggleChip("procedurePerformed", "Other")}
            disabled={readOnly}
          />
        </div>
        {has("procedurePerformed", "Other") && (
          <div className="space-y-1">
            <Label htmlFor="ucc-procedure-other-text">Other procedure</Label>
            <Input
              id="ucc-procedure-other-text"
              value={state.procedurePerformedOther}
              onChange={(e) => update("procedurePerformedOther", e.target.value)}
              disabled={readOnly}
              placeholder="Specify"
            />
          </div>
        )}
      </Section>

      {/* 4. Abdominal exam */}
      <Section title="Abdominal Exam">
        <div className="flex flex-wrap gap-2">
          {ABDOMINAL_EXAM_PRIMARY.map((a) => (
            <Chip
              key={a}
              id={`ucc-abd-${a.replace(/[\s-]+/g, "-").toLowerCase()}`}
              label={a}
              selected={has("abdominalExam", a)}
              onToggle={() => toggleChip("abdominalExam", a)}
              disabled={readOnly}
            />
          ))}
          <Chip
            id="ucc-abd-other"
            label="Other"
            selected={has("abdominalExam", "Other")}
            onToggle={() => toggleChip("abdominalExam", "Other")}
            disabled={readOnly}
          />
        </div>
        {isDistended && (
          <div className="flex items-center gap-2 pl-2">
            <Label className="text-xs text-muted-foreground">If distended:</Label>
            <Chip
              id="ucc-abd-distended-tender"
              label="Tender"
              selected={state.abdominalDistendedTenderness === "tender"}
              onToggle={() =>
                update(
                  "abdominalDistendedTenderness",
                  state.abdominalDistendedTenderness === "tender" ? "" : "tender"
                )
              }
              disabled={readOnly}
            />
            <Chip
              id="ucc-abd-distended-nontender"
              label="Nontender"
              selected={state.abdominalDistendedTenderness === "nontender"}
              onToggle={() =>
                update(
                  "abdominalDistendedTenderness",
                  state.abdominalDistendedTenderness === "nontender" ? "" : "nontender"
                )
              }
              disabled={readOnly}
            />
          </div>
        )}
        {has("abdominalExam", "Other") && (
          <div className="space-y-1">
            <Label htmlFor="ucc-abd-other-text">Other exam findings</Label>
            <Input
              id="ucc-abd-other-text"
              value={state.abdominalExamOther}
              onChange={(e) => update("abdominalExamOther", e.target.value)}
              disabled={readOnly}
              placeholder="Specify"
            />
          </div>
        )}
      </Section>

      {/* 5. Catheter placement */}
      <Section title="Catheter Placement">
        <div className="flex flex-wrap gap-2">
          {CATHETER_PLACEMENT.map((c) => (
            <Chip
              key={c}
              id={`ucc-placement-${c.replace(/\s+/g, "-").toLowerCase()}`}
              label={c}
              selected={has("catheterPlacement", c)}
              onToggle={() => toggleChip("catheterPlacement", c)}
              disabled={readOnly}
            />
          ))}
          <Chip
            id="ucc-placement-other"
            label="Other"
            selected={has("catheterPlacement", "Other")}
            onToggle={() => toggleChip("catheterPlacement", "Other")}
            disabled={readOnly}
          />
        </div>
        {has("catheterPlacement", "Other") && (
          <div className="space-y-1">
            <Label htmlFor="ucc-placement-other-text">Other placement</Label>
            <Input
              id="ucc-placement-other-text"
              value={state.catheterPlacementOther}
              onChange={(e) => update("catheterPlacementOther", e.target.value)}
              disabled={readOnly}
              placeholder="Specify"
            />
          </div>
        )}
      </Section>

      {/* 6. Peri-tube findings */}
      <Section title="Peri-tube finding(s)">
        <div className="flex flex-wrap gap-2">
          {PERI_TUBE_FINDINGS.map((f) => (
            <Chip
              key={f}
              id={`ucc-peri-${f.replace(/[\s-]+/g, "-").toLowerCase()}`}
              label={f}
              selected={has("periTubeFindings", f)}
              onToggle={() => toggleChip("periTubeFindings", f)}
              disabled={readOnly}
            />
          ))}
          <Chip
            id="ucc-peri-other"
            label="Other"
            selected={has("periTubeFindings", "Other")}
            onToggle={() => toggleChip("periTubeFindings", "Other")}
            disabled={readOnly}
          />
        </div>
        {has("periTubeFindings", "Other") && (
          <div className="space-y-1">
            <Label htmlFor="ucc-peri-other-text">Other findings</Label>
            <Input
              id="ucc-peri-other-text"
              value={state.periTubeFindingsOther}
              onChange={(e) => update("periTubeFindingsOther", e.target.value)}
              disabled={readOnly}
              placeholder="Specify"
            />
          </div>
        )}
      </Section>

      {/* 7. Date of last placement */}
      <Section title="Date of last urinary catheter placement">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="ucc-last-placement-date">Last placement date</Label>
            <Input
              id="ucc-last-placement-date"
              type="date"
              value={state.lastPlacementDate}
              onChange={(e) => update("lastPlacementDate", e.target.value)}
              disabled={readOnly || state.lastPlacementUnknown}
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="ucc-last-placement-unknown"
              checked={state.lastPlacementUnknown}
              onCheckedChange={(v) => update("lastPlacementUnknown", v === true)}
              disabled={readOnly}
            />
            <Label htmlFor="ucc-last-placement-unknown">Unknown</Label>
          </div>
        </div>
      </Section>

      {/* 8. Replacement Foley */}
      <Section title="Replacement Foley">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="ucc-replacement-size">Size (Fr)</Label>
            <Input
              id="ucc-replacement-size"
              inputMode="numeric"
              value={state.replacementSizeFr}
              onChange={(e) => update("replacementSizeFr", e.target.value)}
              disabled={readOnly}
              className="w-28"
              placeholder="e.g. 16"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="ucc-balloon-type"
              checked={state.balloonType}
              onCheckedChange={(v) => update("balloonType", v === true)}
              disabled={readOnly}
            />
            <Label htmlFor="ucc-balloon-type">Balloon type</Label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ucc-balloon-capacity">Balloon capacity (cc)</Label>
            <Input
              id="ucc-balloon-capacity"
              inputMode="numeric"
              value={state.balloonCapacityCc}
              onChange={(e) => update("balloonCapacityCc", e.target.value)}
              disabled={readOnly || !state.balloonType}
              className="w-28"
              placeholder="e.g. 10"
            />
          </div>
        </div>
      </Section>

      {/* 9. Reason for replacement */}
      <Section title="Reason for replacement">
        <div className="flex flex-wrap gap-2">
          {REASON_FOR_REPLACEMENT.map((r) => (
            <Chip
              key={r}
              id={`ucc-reason-${r.replace(/[\s-]+/g, "-").toLowerCase()}`}
              label={r}
              selected={has("reasonForReplacement", r)}
              onToggle={() => toggleChip("reasonForReplacement", r)}
              disabled={readOnly}
            />
          ))}
          <Chip
            id="ucc-reason-other"
            label="Other"
            selected={has("reasonForReplacement", "Other")}
            onToggle={() => toggleChip("reasonForReplacement", "Other")}
            disabled={readOnly}
          />
        </div>
        {has("reasonForReplacement", "Other") && (
          <div className="space-y-1">
            <Label htmlFor="ucc-reason-other-text">Other reason</Label>
            <Input
              id="ucc-reason-other-text"
              value={state.reasonForReplacementOther}
              onChange={(e) => update("reasonForReplacementOther", e.target.value)}
              disabled={readOnly}
              placeholder="Specify"
            />
          </div>
        )}
      </Section>

      {/* 10. Procedure note */}
      <Section title="Procedure Note">
        <div className="space-y-3 text-sm leading-relaxed">
          {/* Consent line */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="ucc-consent-obtained"
                checked={state.consentObtained}
                onCheckedChange={(v) => update("consentObtained", v === true)}
                disabled={readOnly}
                className="mt-0.5"
              />
              <Label htmlFor="ucc-consent-obtained" className="font-normal">
                Consent previously obtained from family for urgent catheter
                replacement secondary to:
              </Label>
            </div>
            <div className="ml-6 flex flex-wrap gap-2">
              {CONSENT_REASONS.map((r) => (
                <Chip
                  key={r}
                  id={`ucc-consent-${r.replace(/[\s/]+/g, "-").toLowerCase()}`}
                  label={r}
                  selected={has("consentReasons", r)}
                  onToggle={() => toggleChip("consentReasons", r)}
                  disabled={readOnly || !state.consentObtained}
                />
              ))}
              <Chip
                id="ucc-consent-other"
                label="Other"
                selected={has("consentReasons", "Other")}
                onToggle={() => toggleChip("consentReasons", "Other")}
                disabled={readOnly || !state.consentObtained}
              />
            </div>
            {has("consentReasons", "Other") && (
              <div className="ml-6 space-y-1">
                <Label htmlFor="ucc-consent-other-text">Other consent reason</Label>
                <Input
                  id="ucc-consent-other-text"
                  value={state.consentReasonsOther}
                  onChange={(e) => update("consentReasonsOther", e.target.value)}
                  disabled={readOnly || !state.consentObtained}
                  placeholder="Specify"
                />
              </div>
            )}
          </div>

          {/* Static positioning paragraph */}
          <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            The patient was placed in supine position with the mid abdominal
            ostomy clearly visualized. The ostomy site was cleansed with NS and
            betadine. 20% Benzocaine spray was applied.
          </p>

          {/* Old foley removal */}
          <div className="space-y-2">
            <p>The old Foley was carefully grasped and then removed with:</p>
            <div className="ml-2 flex flex-wrap gap-2">
              {OLD_FOLEY_REMOVAL.map((o) => (
                <Chip
                  key={o}
                  id={`ucc-old-foley-${o.replace(/\s+/g, "-").toLowerCase()}`}
                  label={o}
                  selected={has("oldFoleyRemovalNotes", o)}
                  onToggle={() => toggleChip("oldFoleyRemovalNotes", o)}
                  disabled={readOnly}
                />
              ))}
            </div>
            <div className="ml-2 flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="ucc-old-foley-bleeding-cc">Bleeding (cc)</Label>
                <Input
                  id="ucc-old-foley-bleeding-cc"
                  inputMode="numeric"
                  value={state.oldFoleyBleedingCc}
                  onChange={(e) => update("oldFoleyBleedingCc", e.target.value)}
                  disabled={readOnly}
                  className="w-28"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* New Foley sentence with inline inputs */}
          <div className="space-y-2">
            <p className="leading-loose">
              A new
              <Input
                id="ucc-new-foley-size"
                inputMode="numeric"
                value={state.newFoleySizeFr}
                onChange={(e) => update("newFoleySizeFr", e.target.value)}
                disabled={readOnly}
                className="mx-2 inline-block h-8 w-20 align-middle"
                placeholder="size"
              />
              Fr Foley catheter was then carefully placed through the
              <span className="mx-2 inline-flex flex-wrap gap-1 align-middle">
                {NEW_FOLEY_ROUTE.map((r) => (
                  <Chip
                    key={r}
                    id={`ucc-new-foley-route-${r}`}
                    label={r}
                    selected={has("newFoleyRoute", r)}
                    onToggle={() => toggleChip("newFoleyRoute", r)}
                    disabled={readOnly}
                  />
                ))}
                <Chip
                  id="ucc-new-foley-route-other"
                  label="Other"
                  selected={has("newFoleyRoute", "Other")}
                  onToggle={() => toggleChip("newFoleyRoute", "Other")}
                  disabled={readOnly}
                />
              </span>
              site with no significant resistance and instilled with
              <Input
                id="ucc-new-foley-saline-cc"
                inputMode="numeric"
                value={state.newFoleySalineCc}
                onChange={(e) => update("newFoleySalineCc", e.target.value)}
                disabled={readOnly}
                className="mx-2 inline-block h-8 w-20 align-middle"
                placeholder="cc"
              />
              cc of sterile saline.
            </p>
            {has("newFoleyRoute", "Other") && (
              <div className="space-y-1">
                <Label htmlFor="ucc-new-foley-route-other-text">Other route</Label>
                <Input
                  id="ucc-new-foley-route-other-text"
                  value={state.newFoleyRouteOther}
                  onChange={(e) => update("newFoleyRouteOther", e.target.value)}
                  disabled={readOnly}
                  placeholder="Specify"
                />
              </div>
            )}
          </div>

          {/* Outcome checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ucc-no-visible-bleeding"
                checked={state.noVisibleBleeding}
                onCheckedChange={(v) => update("noVisibleBleeding", v === true)}
                disabled={readOnly}
              />
              <Label htmlFor="ucc-no-visible-bleeding" className="font-normal">
                No visible bleeding observed
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ucc-bleeding-controlled"
                checked={state.bleedingControlled}
                onCheckedChange={(v) => update("bleedingControlled", v === true)}
                disabled={readOnly}
              />
              <Label htmlFor="ucc-bleeding-controlled" className="font-normal">
                Bleeding controlled with pressure and gauze
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ucc-tolerated-well"
                checked={state.toleratedWell}
                onCheckedChange={(v) => update("toleratedWell", v === true)}
                disabled={readOnly}
              />
              <Label htmlFor="ucc-tolerated-well" className="font-normal">
                Procedure tolerated well
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ucc-not-tolerated-well"
                checked={state.notToleratedWell}
                onCheckedChange={(v) => update("notToleratedWell", v === true)}
                disabled={readOnly}
              />
              <Label htmlFor="ucc-not-tolerated-well" className="font-normal">
                Not tolerated well
              </Label>
            </div>
          </div>

          {/* Dressing request */}
          <div className="flex flex-wrap items-center gap-2">
            <Checkbox
              id="ucc-dressing-request"
              checked={state.willRequestDressing}
              onCheckedChange={(v) => update("willRequestDressing", v === true)}
              disabled={readOnly}
            />
            <Label htmlFor="ucc-dressing-request" className="font-normal">
              Will request facility to cover ostomy with CaAlginate + dry
              dressing for
            </Label>
            <Input
              id="ucc-dressing-days"
              inputMode="numeric"
              value={state.dressingDays}
              onChange={(e) => update("dressingDays", e.target.value)}
              disabled={readOnly || !state.willRequestDressing}
              className="h-8 w-20"
              placeholder="days"
            />
            <span className="text-sm">days.</span>
          </div>

          {/* Confirmation by urine */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="ucc-confirmed-urine"
              checked={state.catheterConfirmedByUrine}
              onCheckedChange={(v) => update("catheterConfirmedByUrine", v === true)}
              disabled={readOnly}
            />
            <Label htmlFor="ucc-confirmed-urine" className="font-normal">
              Catheter placement confirmed by presence of urine output into the
              catheter
            </Label>
          </div>
        </div>
      </Section>

      {/* 11. Comments / Recs */}
      <Section title="Comments / Recommendations">
        <Textarea
          id="ucc-comments-recs"
          value={state.commentsRecs}
          onChange={(e) => update("commentsRecs", e.target.value)}
          disabled={readOnly}
          rows={4}
          placeholder="Additional comments, plan, follow-up..."
        />
      </Section>
    </div>
  );
}

export default UrinaryCatheterDoc;
