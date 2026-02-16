"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createAssessment, updateAssessment } from "@/app/actions/assessments";
import {
  validateTissueComposition,
  validateMeasurements,
  shouldShowPressureStage,
  validateLocationConfirmation,
  calculateTissueTotal,
} from "@/lib/validations/assessment";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Wound = {
  id: string;
  woundNumber: string;
  location: string;
  woundType: string;
};

type AssessmentFormProps = {
  visitId: string;
  patientId: string;
  wounds: Wound[];
  assessment?: {
    id: string;
    woundId: string;
    woundType: string | null;
    pressureStage: string | null;
    healingStatus: string | null;
    atRiskReopening: boolean | null;
    length: number | null;
    width: number | null;
    depth: number | null;
    undermining: string | null;
    tunneling: string | null;
    epithelialPercent: number | null;
    granulationPercent: number | null;
    sloughPercent: number | null;
    exudateAmount: string | null;
    exudateType: string | null;
    odor: string | null;
    periwoundCondition: string | null;
    painLevel: number | null;
    infectionSigns: unknown;
    assessmentNotes: string | null;
  };
  onSuccess?: () => void;
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

export default function AssessmentForm({
  visitId,
  patientId,
  wounds,
  assessment,
  onSuccess,
}: AssessmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedWound, setSelectedWound] = useState(assessment?.woundId || "");
  const [atRiskReopening, setAtRiskReopening] = useState(
    assessment?.atRiskReopening || false
  );
  const [infectionSigns, setInfectionSigns] = useState<string[]>(() => {
    if (assessment?.infectionSigns) {
      return Array.isArray(assessment.infectionSigns)
        ? assessment.infectionSigns
        : [];
    }
    return [];
  });

  // Auto-calculate area
  const [length, setLength] = useState(assessment?.length?.toString() || "");
  const [width, setWidth] = useState(assessment?.width?.toString() || "");
  const [depth, setDepth] = useState(assessment?.depth?.toString() || "");

  // Validation state - controlled fields for real-time validation
  const [woundType, setWoundType] = useState(assessment?.woundType || "");
  const [exudateAmount, setExudateAmount] = useState(
    assessment?.exudateAmount || ""
  );
  const [epithelialPercent, setEpithelialPercent] = useState(
    assessment?.epithelialPercent?.toString() || "0"
  );
  const [granulationPercent, setGranulationPercent] = useState(
    assessment?.granulationPercent?.toString() || "0"
  );
  const [sloughPercent, setSloughPercent] = useState(
    assessment?.sloughPercent?.toString() || "0"
  );
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  // Get the current wound to display location in confirmation
  const currentWound = wounds.find((w) => w.id === selectedWound);

  // Check if this is the first assessment (!assessment means creating new)
  const isFirstAssessment = !assessment;

  const calculatedArea = useMemo(() => {
    if (length && width) {
      const l = parseFloat(length);
      const w = parseFloat(width);
      if (!isNaN(l) && !isNaN(w)) {
        return (l * w).toFixed(2);
      }
    }
    return "";
  }, [length, width]);

  // Validation logic
  // 1. Tissue composition validation (must equal 100%)
  const tissueTotal = useMemo(() => {
    const epithelial = parseFloat(epithelialPercent) || 0;
    const granulation = parseFloat(granulationPercent) || 0;
    const slough = parseFloat(sloughPercent) || 0;
    return calculateTissueTotal({ epithelial, granulation, slough });
  }, [epithelialPercent, granulationPercent, sloughPercent]);

  const tissueValidation = useMemo(() => {
    const epithelial = parseFloat(epithelialPercent) || 0;
    const granulation = parseFloat(granulationPercent) || 0;
    const slough = parseFloat(sloughPercent) || 0;
    return validateTissueComposition({ epithelial, granulation, slough });
  }, [epithelialPercent, granulationPercent, sloughPercent]);

  // 2. Measurement validation (depth warning)
  const measurementValidation = useMemo(() => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const d = parseFloat(depth);
    if (!isNaN(l) && !isNaN(w) && !isNaN(d) && l > 0 && w > 0 && d > 0) {
      return validateMeasurements({ length: l, width: w, depth: d });
    }
    return { valid: true };
  }, [length, width, depth]);

  // 3. Pressure stage validation
  const showPressureStage = useMemo(() => {
    return shouldShowPressureStage(woundType);
  }, [woundType]);

  // 4. Location confirmation validation
  const locationValidation = useMemo(() => {
    return validateLocationConfirmation(isFirstAssessment, locationConfirmed);
  }, [isFirstAssessment, locationConfirmed]);

  // Determine if form can be submitted
  const canSubmit = useMemo(() => {
    // Don't allow submit if validation errors exist
    if (tissueTotal > 0 && tissueTotal !== 100) return false;
    if (!locationValidation.valid) return false;
    return true;
  }, [tissueTotal, locationValidation]);

  const handleInfectionSignToggle = (sign: string) => {
    setInfectionSigns((prev) =>
      prev.includes(sign) ? prev.filter((s) => s !== sign) : [...prev, sign]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!selectedWound) {
      setError("Please select a wound to assess");
      setIsSubmitting(false);
      return;
    }

    // Validate before submission
    if (!canSubmit) {
      setError("Please fix all validation errors before submitting");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("visitId", visitId);
    formData.append("woundId", selectedWound);
    formData.append("atRiskReopening", atRiskReopening.toString());
    formData.append("infectionSigns", JSON.stringify(infectionSigns));

    // Add controlled fields that aren't in the form
    formData.set("woundType", woundType);
    formData.set("exudateAmount", exudateAmount);
    formData.set("epithelialPercent", epithelialPercent);
    formData.set("granulationPercent", granulationPercent);
    formData.set("sloughPercent", sloughPercent);
    formData.set("length", length);
    formData.set("width", width);
    formData.set("depth", depth);

    const result = assessment
      ? await updateAssessment(assessment.id, formData)
      : await createAssessment(formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/patients/${patientId}/visits/${visitId}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Wound Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Wound</CardTitle>
          <CardDescription>Choose which wound to assess</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedWound}
            onValueChange={setSelectedWound}
            required
            disabled={!!assessment}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a wound" />
            </SelectTrigger>
            <SelectContent>
              {wounds.map((wound) => (
                <SelectItem key={wound.id} value={wound.id}>
                  {wound.woundNumber} - {wound.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Wound Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="woundType">Wound Type</Label>
              <Select
                name="woundType"
                value={woundType}
                onValueChange={setWoundType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WOUND_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showPressureStage && (
              <div className="space-y-2">
                <Label htmlFor="pressureStage">
                  Pressure Stage <span className="text-red-500">*</span>
                </Label>
                <Select
                  name="pressureStage"
                  defaultValue={assessment?.pressureStage || ""}
                  required={showPressureStage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESSURE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="healingStatus">Healing Status</Label>
              <Select
                name="healingStatus"
                defaultValue={assessment?.healingStatus || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {HEALING_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="atRiskReopening"
                checked={atRiskReopening}
                onCheckedChange={(checked) =>
                  setAtRiskReopening(checked as boolean)
                }
              />
              <Label htmlFor="atRiskReopening" className="text-sm font-normal">
                At risk of reopening
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Measurements (cm)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="length">Length</Label>
              <Input
                id="length"
                name="length"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                name="width"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depth">Depth</Label>
              <Input
                id="depth"
                name="depth"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Area (calculated)</Label>
              <Input
                value={calculatedArea || "—"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="undermining">Undermining</Label>
              <Textarea
                id="undermining"
                name="undermining"
                placeholder="Describe undermining measurements and locations..."
                rows={2}
                defaultValue={assessment?.undermining || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tunneling">Tunneling</Label>
              <Textarea
                id="tunneling"
                name="tunneling"
                placeholder="Describe tunneling measurements and clock positions..."
                rows={2}
                defaultValue={assessment?.tunneling || ""}
              />
            </div>
          </div>

          {/* Measurement validation warning */}
          {measurementValidation.warning && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{measurementValidation.warning}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tissue Composition */}
      <Card>
        <CardHeader>
          <CardTitle>Tissue Composition (%)</CardTitle>
          <CardDescription>Percentages must add up to 100%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="epithelialPercent">Epithelial</Label>
              <Input
                id="epithelialPercent"
                name="epithelialPercent"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={epithelialPercent}
                onChange={(e) => setEpithelialPercent(e.target.value)}
                className={
                  tissueTotal > 0 && tissueTotal !== 100
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="granulationPercent">Granulation</Label>
              <Input
                id="granulationPercent"
                name="granulationPercent"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={granulationPercent}
                onChange={(e) => setGranulationPercent(e.target.value)}
                className={
                  tissueTotal > 0 && tissueTotal !== 100
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sloughPercent">Slough</Label>
              <Input
                id="sloughPercent"
                name="sloughPercent"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={sloughPercent}
                onChange={(e) => setSloughPercent(e.target.value)}
                className={
                  tissueTotal > 0 && tissueTotal !== 100
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
            </div>
          </div>

          {/* Tissue composition validation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total:</span>
              <span
                className={`text-sm font-bold ${
                  tissueTotal === 0
                    ? "text-muted-foreground"
                    : tissueTotal === 100
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {tissueTotal}%
              </span>
              {tissueTotal === 100 && (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>

          {tissueValidation.error && tissueTotal > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{tissueValidation.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wound Characteristics */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exudateAmount">Exudate Amount</Label>
              <Select
                name="exudateAmount"
                value={exudateAmount}
                onValueChange={setExudateAmount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  {EXUDATE_AMOUNTS.map((amount) => (
                    <SelectItem key={amount} value={amount}>
                      {amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exudateType">Exudate Type</Label>
              <Select
                name="exudateType"
                defaultValue={assessment?.exudateType || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EXUDATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="odor">Odor</Label>
              <Select name="odor" defaultValue={assessment?.odor || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select odor level" />
                </SelectTrigger>
                <SelectContent>
                  {ODOR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="painLevel">Pain Level (0-10)</Label>
              <Input
                id="painLevel"
                name="painLevel"
                type="number"
                min="0"
                max="10"
                placeholder="0"
                defaultValue={assessment?.painLevel || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periwoundCondition">Periwound Condition</Label>
            <Textarea
              id="periwoundCondition"
              name="periwoundCondition"
              placeholder="Describe the condition of skin surrounding the wound..."
              rows={3}
              defaultValue={assessment?.periwoundCondition || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Infection Signs */}
      <Card>
        <CardHeader>
          <CardTitle>Signs of Infection</CardTitle>
          <CardDescription>Check all that apply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {INFECTION_SIGNS_OPTIONS.map((sign) => (
              <div key={sign} className="flex items-center space-x-2">
                <Checkbox
                  id={`infection-${sign}`}
                  checked={infectionSigns.includes(sign)}
                  onCheckedChange={() => handleInfectionSignToggle(sign)}
                />
                <Label
                  htmlFor={`infection-${sign}`}
                  className="text-sm font-normal"
                >
                  {sign}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Confirmation (First Assessment Only) */}
      {isFirstAssessment && currentWound && (
        <Card>
          <CardHeader>
            <CardTitle>Location Confirmation</CardTitle>
            <CardDescription>
              Confirm wound location before creating first assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="locationConfirmation"
                checked={locationConfirmed}
                onCheckedChange={(checked) =>
                  setLocationConfirmed(checked as boolean)
                }
              />
              <Label
                htmlFor="locationConfirmation"
                className="text-sm leading-relaxed font-normal"
              >
                I confirm this wound (#{currentWound.woundNumber}) is located on
                the{" "}
                <span className="font-semibold">{currentWound.location}</span>
              </Label>
            </div>
            {!locationValidation.valid && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{locationValidation.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="assessmentNotes"
            name="assessmentNotes"
            placeholder="Additional clinical observations, treatment recommendations, etc..."
            rows={6}
            defaultValue={assessment?.assessmentNotes || ""}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting
            ? "Saving..."
            : assessment
              ? "Update Assessment"
              : "Create Assessment"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
