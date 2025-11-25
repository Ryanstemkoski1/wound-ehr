"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  createAssessment,
  autosaveAssessmentDraft,
} from "@/app/actions/assessments";
import { updatePhotoAssessmentId } from "@/app/actions/photos";
import { WoundSwitcher } from "./wound-switcher";
import { Check } from "lucide-react";
import { PhotoUpload } from "@/components/photos/photo-upload";
import { useAutosave } from "@/lib/hooks/use-autosave";
import AutosaveIndicator from "@/components/ui/autosave-indicator";
import AutosaveRecoveryModal from "@/components/ui/autosave-recovery-modal";
import { hasRecentAutosave } from "@/lib/autosave";
import { toast } from "sonner";

type Wound = {
  id: string;
  woundNumber: string;
  location: string;
  woundType: string;
};

type MultiWoundAssessmentFormProps = {
  visitId: string;
  patientId: string;
  userId: string; // Added for autosave
  wounds: Wound[];
};

type WoundAssessmentData = {
  woundType: string;
  pressureStage: string;
  healingStatus: string;
  atRiskReopening: boolean;
  length: string;
  width: string;
  depth: string;
  undermining: string;
  tunneling: string;
  epithelialPercent: string;
  granulationPercent: string;
  sloughPercent: string;
  exudateAmount: string;
  exudateType: string;
  odor: string;
  periwoundCondition: string;
  painLevel: string;
  infectionSigns: string[];
  assessmentNotes: string;
};

const EMPTY_ASSESSMENT: WoundAssessmentData = {
  woundType: "",
  pressureStage: "",
  healingStatus: "",
  atRiskReopening: false,
  length: "",
  width: "",
  depth: "",
  undermining: "",
  tunneling: "",
  epithelialPercent: "",
  granulationPercent: "",
  sloughPercent: "",
  exudateAmount: "",
  exudateType: "",
  odor: "",
  periwoundCondition: "",
  painLevel: "",
  infectionSigns: [],
  assessmentNotes: "",
};

const WOUND_TYPES = [
  "Pressure Injury",
  "Diabetic Ulcer",
  "Venous Ulcer",
  "Arterial Ulcer",
  "Surgical Wound",
  "Traumatic Wound",
  "Burn",
  "Other",
];

const PRESSURE_STAGES = [
  "Stage 1",
  "Stage 2",
  "Stage 3",
  "Stage 4",
  "Unstageable",
  "Deep Tissue Injury (DTI)",
];

const HEALING_STATUSES = [
  "Initial",
  "Healing",
  "Stable",
  "Declined",
  "Healed",
  "Sign-off",
];

const EXUDATE_AMOUNTS = ["None", "Minimal", "Moderate", "Heavy"];
const EXUDATE_TYPES = ["Serous", "Sanguineous", "Purulent", "Serosanguineous"];
const ODOR_LEVELS = ["None", "Mild", "Moderate", "Strong"];

const INFECTION_SIGNS_OPTIONS = [
  "Increased warmth",
  "Erythema/redness",
  "Edema/swelling",
  "Purulent drainage",
  "Increased pain",
  "Delayed healing",
  "Friable granulation tissue",
  "Foul odor",
];

export default function MultiWoundAssessmentForm({
  visitId,
  patientId,
  userId,
  wounds,
}: MultiWoundAssessmentFormProps) {
  const router = useRouter();
  const [activeWoundId, setActiveWoundId] = useState(wounds[0]?.id || "");
  const [assessments, setAssessments] = useState<
    Record<string, WoundAssessmentData>
  >(() => {
    const initial: Record<string, WoundAssessmentData> = {};
    wounds.forEach((w) => {
      initial[w.id] = { ...EMPTY_ASSESSMENT };
    });
    return initial;
  });
  const [completedWoundIds, setCompletedWoundIds] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Autosave state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "saving" | "saved" | "error" | "idle"
  >("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [assessmentIds, setAssessmentIds] = useState<Record<string, string>>(
    {}
  );

  const currentAssessment = assessments[activeWoundId] || EMPTY_ASSESSMENT;

  // Client-side autosave hook (localStorage)
  const { loadSavedData, clearSavedData } = useAutosave({
    formType: "assessment",
    entityId: visitId,
    userId,
    data: assessments,
    interval: 30000, // 30 seconds
    enabled: true,
    onSave: () => {
      setAutosaveStatus("saved");
      setLastSavedTime("just now");
    },
  });

  // Check for autosaved data on mount
  useEffect(() => {
    const autosaveKey = `wound-ehr-autosave-assessment-${visitId}-${userId}`;
    if (hasRecentAutosave(autosaveKey)) {
      const { data, timestamp } = loadSavedData();
      if (data && timestamp) {
        setShowRecoveryModal(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore autosaved data
  const handleRestoreAutosave = () => {
    const { data } = loadSavedData();
    if (data) {
      setAssessments(data as Record<string, WoundAssessmentData>);
      toast.success("Restored unsaved assessment data");
    }
    setShowRecoveryModal(false);
  };

  // Discard autosaved data
  const handleDiscardAutosave = () => {
    clearSavedData();
    setShowRecoveryModal(false);
    toast.info("Starting fresh");
  };

  // Server-side autosave (every 2 minutes for current wound)
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = assessments[activeWoundId];

      // Skip if no meaningful data entered
      if (!current.woundType && !current.length) return;

      setAutosaveStatus("saving");
      const result = await autosaveAssessmentDraft(
        assessmentIds[activeWoundId] || null,
        activeWoundId,
        visitId,
        {
          woundType: current.woundType,
          pressureStage: current.pressureStage,
          healingStatus: current.healingStatus,
          atRiskReopening: current.atRiskReopening,
          length: current.length,
          width: current.width,
          depth: current.depth,
          undermining: current.undermining,
          tunneling: current.tunneling,
          epithelialPercent: current.epithelialPercent,
          granulationPercent: current.granulationPercent,
          sloughPercent: current.sloughPercent,
          exudateAmount: current.exudateAmount,
          exudateType: current.exudateType,
          odor: current.odor,
          periwoundCondition: current.periwoundCondition,
          painLevel: current.painLevel,
          infectionSigns: current.infectionSigns,
          assessmentNotes: current.assessmentNotes,
        }
      );

      if (result.success && result.assessmentId) {
        setAssessmentIds((prev) => ({
          ...prev,
          [activeWoundId]: result.assessmentId!,
        }));
        setAutosaveStatus("saved");
        setLastSavedTime("just now");
      } else {
        setAutosaveStatus("error");
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [assessments, activeWoundId, visitId, assessmentIds]);

  // Auto-calculate area
  const calculatedArea = useMemo(() => {
    const length = parseFloat(currentAssessment.length);
    const width = parseFloat(currentAssessment.width);
    if (!isNaN(length) && !isNaN(width)) {
      return (length * width).toFixed(2);
    }
    return "";
  }, [currentAssessment.length, currentAssessment.width]);

  // Check if current assessment is complete
  const isCurrentAssessmentComplete = useMemo(() => {
    const hasWoundType =
      currentAssessment.woundType && currentAssessment.woundType.trim() !== "";
    const hasHealingStatus =
      currentAssessment.healingStatus &&
      currentAssessment.healingStatus.trim() !== "";
    const hasLength =
      currentAssessment.length &&
      currentAssessment.length.toString().trim() !== "";
    const hasWidth =
      currentAssessment.width &&
      currentAssessment.width.toString().trim() !== "";

    return hasWoundType && hasHealingStatus && hasLength && hasWidth;
  }, [currentAssessment]); // Update field for current wound
  const updateField = (
    field: keyof WoundAssessmentData,
    value: string | boolean | string[]
  ) => {
    setAssessments((prev) => ({
      ...prev,
      [activeWoundId]: {
        ...prev[activeWoundId],
        [field]: value,
      },
    }));
  };

  // Handle wound change with auto-save
  const handleWoundChange = async (newWoundId: string) => {
    if (isCurrentAssessmentComplete) {
      setCompletedWoundIds((prev) => new Set(prev).add(activeWoundId));
    }
    setActiveWoundId(newWoundId);
  };

  // Submit all assessments
  const handleSubmitAll = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      // Submit assessment for each wound that has data
      for (const wound of wounds) {
        const assessment = assessments[wound.id];

        // Skip if no data entered
        if (!assessment.woundType && !assessment.length) continue;

        const oldAssessmentId = assessmentIds[wound.id];

        const formData = new FormData();
        formData.append("visitId", visitId);
        formData.append("woundId", wound.id);
        formData.append("woundType", assessment.woundType);
        formData.append("pressureStage", assessment.pressureStage);
        formData.append("healingStatus", assessment.healingStatus);
        formData.append(
          "atRiskReopening",
          assessment.atRiskReopening.toString()
        );
        formData.append("length", assessment.length);
        formData.append("width", assessment.width);
        formData.append("depth", assessment.depth);
        formData.append("undermining", assessment.undermining);
        formData.append("tunneling", assessment.tunneling);
        formData.append("epithelialPercent", assessment.epithelialPercent);
        formData.append("granulationPercent", assessment.granulationPercent);
        formData.append("sloughPercent", assessment.sloughPercent);
        formData.append("exudateAmount", assessment.exudateAmount);
        formData.append("exudateType", assessment.exudateType);
        formData.append("odor", assessment.odor);
        formData.append("periwoundCondition", assessment.periwoundCondition);
        formData.append("painLevel", assessment.painLevel);
        formData.append(
          "infectionSigns",
          JSON.stringify(assessment.infectionSigns)
        );
        formData.append("assessmentNotes", assessment.assessmentNotes);

        const result = await createAssessment(formData);
        if (result.error) {
          throw new Error(result.error);
        }

        // Link photos to final assessment if needed
        if (result.assessmentId && oldAssessmentId !== result.assessmentId) {
          await updatePhotoAssessmentId(
            wound.id,
            oldAssessmentId,
            result.assessmentId
          );
        }
      }

      // Clear autosaved data on successful submission
      clearSavedData();

      router.push(`/dashboard/patients/${patientId}/visits/${visitId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save assessments"
      );
      setIsSubmitting(false);
    }
  };

  const toggleInfectionSign = (sign: string) => {
    const current = currentAssessment.infectionSigns;
    const updated = current.includes(sign)
      ? current.filter((s) => s !== sign)
      : [...current, sign];
    updateField("infectionSigns", updated);
  };

  return (
    <>
      {/* Recovery Modal */}
      <AutosaveRecoveryModal
        isOpen={showRecoveryModal}
        onRestore={handleRestoreAutosave}
        onDiscard={handleDiscardAutosave}
        timestamp={loadSavedData().timestamp || ""}
        formType="assessment"
      />

      <div className="space-y-6">
        {/* Autosave Indicator */}
        <div className="flex justify-end">
          <AutosaveIndicator
            status={autosaveStatus}
            lastSaved={lastSavedTime}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Wound Switcher */}
        <WoundSwitcher
          wounds={wounds}
          activeWoundId={activeWoundId}
          completedWoundIds={completedWoundIds}
          onWoundChange={handleWoundChange}
        />

        {/* Assessment Form for Active Wound */}
        <div className="space-y-6">
          {/* Wound Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Wound Classification</CardTitle>
              <CardDescription>
                Wound {wounds.find((w) => w.id === activeWoundId)?.woundNumber}{" "}
                - {wounds.find((w) => w.id === activeWoundId)?.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wound Type - Radio Buttons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Wound Type *</Label>
                <RadioGroup
                  value={currentAssessment.woundType}
                  onValueChange={(value) => updateField("woundType", value)}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {WOUND_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <RadioGroupItem value={type} id={`woundType-${type}`} />
                        <Label
                          htmlFor={`woundType-${type}`}
                          className="cursor-pointer font-normal"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Pressure Stage - Radio Buttons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Pressure Stage (if applicable)
                </Label>
                <RadioGroup
                  value={currentAssessment.pressureStage}
                  onValueChange={(value) => updateField("pressureStage", value)}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PRESSURE_STAGES.map((stage) => (
                      <div key={stage} className="flex items-center space-x-2">
                        <RadioGroupItem value={stage} id={`stage-${stage}`} />
                        <Label
                          htmlFor={`stage-${stage}`}
                          className="cursor-pointer font-normal"
                        >
                          {stage}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Healing Status - Radio Buttons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Healing Status *
                </Label>
                <RadioGroup
                  value={currentAssessment.healingStatus}
                  onValueChange={(value) => updateField("healingStatus", value)}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {HEALING_STATUSES.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={status}
                          id={`status-${status}`}
                        />
                        <Label
                          htmlFor={`status-${status}`}
                          className="cursor-pointer font-normal"
                        >
                          {status}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* At Risk Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="atRiskReopening"
                  checked={currentAssessment.atRiskReopening}
                  onCheckedChange={(checked) =>
                    updateField("atRiskReopening", checked as boolean)
                  }
                />
                <Label
                  htmlFor="atRiskReopening"
                  className="cursor-pointer font-normal"
                >
                  At risk of reopening
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle>Wound Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (cm) *</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    value={currentAssessment.length}
                    onChange={(e) => updateField("length", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="width">Width (cm) *</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.01"
                    value={currentAssessment.width}
                    onChange={(e) => updateField("width", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area (cm²)</Label>
                  <Input
                    id="area"
                    type="text"
                    value={calculatedArea}
                    disabled
                    className="bg-muted"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="depth">Depth (cm)</Label>
                  <Input
                    id="depth"
                    type="number"
                    step="0.01"
                    value={currentAssessment.depth}
                    onChange={(e) => updateField("depth", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="undermining">Undermining</Label>
                  <Input
                    id="undermining"
                    value={currentAssessment.undermining}
                    onChange={(e) => updateField("undermining", e.target.value)}
                    placeholder="e.g., 3 cm at 2 o'clock"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tunneling">Tunneling</Label>
                  <Input
                    id="tunneling"
                    value={currentAssessment.tunneling}
                    onChange={(e) => updateField("tunneling", e.target.value)}
                    placeholder="e.g., 2 cm at 6 o'clock"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wound Bed Composition */}
          <Card>
            <CardHeader>
              <CardTitle>Wound Bed Composition (%)</CardTitle>
              <CardDescription>Percentages should total 100%</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="epithelialPercent">Epithelial (%)</Label>
                  <Input
                    id="epithelialPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={currentAssessment.epithelialPercent}
                    onChange={(e) =>
                      updateField("epithelialPercent", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="granulationPercent">Granulation (%)</Label>
                  <Input
                    id="granulationPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={currentAssessment.granulationPercent}
                    onChange={(e) =>
                      updateField("granulationPercent", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sloughPercent">Slough (%)</Label>
                  <Input
                    id="sloughPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={currentAssessment.sloughPercent}
                    onChange={(e) =>
                      updateField("sloughPercent", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exudate & Characteristics - Radio Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Exudate & Characteristics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exudate Amount */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Exudate Amount
                </Label>
                <RadioGroup
                  value={currentAssessment.exudateAmount}
                  onValueChange={(value) => updateField("exudateAmount", value)}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {EXUDATE_AMOUNTS.map((amount) => (
                      <div key={amount} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={amount}
                          id={`exudate-${amount}`}
                        />
                        <Label
                          htmlFor={`exudate-${amount}`}
                          className="cursor-pointer font-normal"
                        >
                          {amount}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Exudate Type */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Exudate Type</Label>
                <RadioGroup
                  value={currentAssessment.exudateType}
                  onValueChange={(value) => updateField("exudateType", value)}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EXUDATE_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <RadioGroupItem value={type} id={`type-${type}`} />
                        <Label
                          htmlFor={`type-${type}`}
                          className="cursor-pointer font-normal"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Odor */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Odor</Label>
                <RadioGroup
                  value={currentAssessment.odor}
                  onValueChange={(value) => updateField("odor", value)}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ODOR_LEVELS.map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <RadioGroupItem value={level} id={`odor-${level}`} />
                        <Label
                          htmlFor={`odor-${level}`}
                          className="cursor-pointer font-normal"
                        >
                          {level}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Periwound & Pain */}
          <Card>
            <CardHeader>
              <CardTitle>Periwound & Pain Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periwoundCondition">Periwound Condition</Label>
                <Input
                  id="periwoundCondition"
                  value={currentAssessment.periwoundCondition}
                  onChange={(e) =>
                    updateField("periwoundCondition", e.target.value)
                  }
                  placeholder="Describe surrounding skin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="painLevel">Pain Level (0-10)</Label>
                <Input
                  id="painLevel"
                  type="number"
                  min="0"
                  max="10"
                  value={currentAssessment.painLevel}
                  onChange={(e) => updateField("painLevel", e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Infection Signs - Checkboxes */}
          <Card>
            <CardHeader>
              <CardTitle>Signs of Infection</CardTitle>
              <CardDescription>Select all that apply</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {INFECTION_SIGNS_OPTIONS.map((sign) => (
                  <div key={sign} className="flex items-center space-x-2">
                    <Checkbox
                      id={`infection-${sign}`}
                      checked={currentAssessment.infectionSigns.includes(sign)}
                      onCheckedChange={() => toggleInfectionSign(sign)}
                    />
                    <Label
                      htmlFor={`infection-${sign}`}
                      className="cursor-pointer font-normal"
                    >
                      {sign}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assessment Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={currentAssessment.assessmentNotes}
                onChange={(e) => updateField("assessmentNotes", e.target.value)}
                placeholder="Additional clinical observations..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Wound Photos</CardTitle>
              <CardDescription>
                Upload photos of this wound (optional - photos will be linked to
                this assessment)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                woundId={activeWoundId}
                visitId={visitId}
                assessmentId={assessmentIds[activeWoundId] || undefined}
                className="max-w-2xl"
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(`/dashboard/patients/${patientId}/visits/${visitId}`)
            }
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-4">
            {isCurrentAssessmentComplete && (
              <div className="flex items-center gap-2 text-sm text-teal-600">
                <Check className="h-4 w-4" />
                <span>Current assessment complete</span>
              </div>
            )}
            <Button onClick={handleSubmitAll} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save All Assessments"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
