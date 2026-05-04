"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  createDebridementAssessment,
  type DebridementAssessmentData,
} from "@/app/actions/new-forms";

// ============================================================================
// Constants
// ============================================================================

const PLACES_OF_SERVICE = [
  { value: "patient_home", label: "Patient's Home" },
  { value: "assisted_living", label: "Assisted Living Facility" },
  { value: "nursing_home", label: "Nursing Home" },
  { value: "physician_office", label: "Physician Office" },
  { value: "other", label: "Other" },
];

const WOUND_TYPES = [
  { value: "diabetic", label: "Diabetic" },
  { value: "venous", label: "Venous" },
  { value: "arterial", label: "Arterial" },
  { value: "pressure", label: "Pressure" },
  { value: "surgical", label: "Surgical" },
  { value: "trauma", label: "Trauma" },
  { value: "other", label: "Other" },
];

const VISIBLE_STRUCTURES = [
  { value: "tendon", label: "Tendon" },
  { value: "bone", label: "Bone" },
  { value: "muscle", label: "Muscle" },
  { value: "capsule", label: "Capsule" },
  { value: "ligament", label: "Ligament" },
  { value: "hardware", label: "Hardware" },
  { value: "none", label: "None" },
];

const WOUND_EDGES = [
  { value: "attached", label: "Attached" },
  { value: "unattached", label: "Unattached" },
  { value: "calloused", label: "Calloused" },
  { value: "rolled_epibole", label: "Rolled / Epibole" },
];

const PERIWOUND_OPTIONS = [
  { value: "healthy", label: "Healthy" },
  { value: "macerated", label: "Macerated" },
  { value: "inflamed", label: "Inflamed" },
  { value: "calloused", label: "Calloused" },
  { value: "other", label: "Other" },
];

const SOLUTIONS = [
  { value: "ns_09", label: "NS 0.9%" },
  { value: "vashe", label: "Vashe" },
  { value: "dakins_pro", label: "Dakin's Solution (PRO)" },
  { value: "dakins_025", label: "Dakin's Solution (0.25%)" },
  { value: "dakins_05", label: "Dakin's Solution (0.5%)" },
  { value: "other", label: "Other" },
];

const TISSUE_REMOVED = [
  { value: "necrotic", label: "Necrotic" },
  { value: "fibrinous", label: "Fibrinous" },
  { value: "devitalized", label: "Devitalized" },
  { value: "slough", label: "Slough" },
  { value: "biofilm", label: "Biofilm" },
];

const DEPTH_OF_TISSUE_REMOVED = [
  { value: "superficial", label: "Superficial" },
  { value: "into_dermis", label: "Into Dermis" },
  { value: "into_subcutaneous", label: "Into Subcutaneous Tissue" },
  { value: "muscle", label: "Muscle" },
  { value: "bone", label: "Bone" },
];

const GOALS_OF_CARE = [
  { value: "reduce_bioburden", label: "Reduce bioburden" },
  { value: "promote_granulation", label: "Promote granulation" },
  { value: "prepare_graft_closure", label: "Prepare for graft/closure" },
  { value: "decrease_exudate", label: "Decrease exudate" },
];

const REFERRAL_OPTIONS = [
  { value: "pcp", label: "PCP" },
  { value: "wound_clinic", label: "Wound Clinic" },
  { value: "vascular", label: "Vascular" },
  { value: "endocrinology", label: "Endocrinology" },
  { value: "other", label: "Other" },
];

const ADDITIONAL_INTERVENTIONS = [
  { value: "offloading", label: "Offloading" },
  { value: "compression", label: "Compression" },
  { value: "nutritional_support", label: "Nutritional Support" },
  { value: "pressure_redistribution", label: "Pressure Redistribution" },
];

const DEFAULT_PROCEDURE_NOTES = `The procedure, including goals and expected outcomes, was explained to the patient and/or caregiver. Verbal consent was obtained prior to initiation.

The periwound area was cleansed using 4x4 gauze and wound cleanser. Contactless ultrasonic debridement was then performed utilizing a low-frequency, non-contact, non-thermal ultrasound device (Arobella or equivalent). The ultrasound energy was applied to the wound bed to facilitate the removal of devitalized tissue, slough, and biofilm while promoting wound healing. The procedure was painless, atraumatic, and completed without significant bleeding. A dressing appropriate to the wound type and condition was applied following the procedure. The patient tolerated the treatment well without any complications.`;

const DEFAULT_MEDICAL_NECESSITY = `Ultrasonic non-contact debridement is indicated due to the presence of (necrotic tissue/slough/biofilm/fibrotic tissue), delaying wound healing despite standard care. The use of Arobella allows for precise, low-pain removal of devitalized tissue, promoting wound progression.`;

// ============================================================================
// Component
// ============================================================================

type Props = {
  visitId: string;
  patientId: string;
  facilityId: string;
  userId: string;
};

export default function DebridementAssessmentForm({
  visitId,
  patientId,
  facilityId,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pre");

  const { register, handleSubmit, setValue, getValues, control } =
    useForm<DebridementAssessmentData>({
      defaultValues: {
        visitId,
        patientId,
        facilityId,
        assessmentDate: new Date().toISOString().split("T")[0],
        visibleStructures: [],
        woundEdges: [],
        periwoundSkin: [],
        solution: [],
        tissueRemoved: [],
        goalsOfCare: [],
        referrals: [],
        additionalInterventions: [],
        procedureNotes: DEFAULT_PROCEDURE_NOTES,
        includeMedicalNecessity: true,
        medicalNecessityCustom: DEFAULT_MEDICAL_NECESSITY,
        deviceFrequency: "35_khz",
        instrumentUsed: "arobella_qurette",
        methodUsed: "ultrasonic_non_contact",
        debridementType: "selective_non_contact",
        isDraft: false,
      },
    });

  // Watch all reactive fields at top level (React Compiler friendly)
  const formValues = useWatch({ control });
  const placeOfService = formValues.placeOfService || "";
  const woundType = formValues.woundType || "";
  const woundDepth = formValues.woundDepth || "";
  const hasUndermining = formValues.hasUndermining || false;
  const hasTunneling = formValues.hasTunneling || false;
  const visibleStructures = (formValues.visibleStructures as string[]) || [];
  const woundEdges = (formValues.woundEdges as string[]) || [];
  const periwoundSkin = (formValues.periwoundSkin as string[]) || [];
  const solution = (formValues.solution as string[]) || [];
  const tissueRemoved = (formValues.tissueRemoved as string[]) || [];
  const goalsOfCare = (formValues.goalsOfCare as string[]) || [];
  const referrals = (formValues.referrals as string[]) || [];
  const additionalInterventions =
    (formValues.additionalInterventions as string[]) || [];
  const deviceMode = formValues.deviceMode || "";
  const depthOfTissueRemoved = formValues.depthOfTissueRemoved || "";
  const hemostasisAchieved = formValues.hemostasisAchieved;
  const includeMedicalNecessity = formValues.includeMedicalNecessity ?? true;

  // Array field helpers
  const toggleArrayField = (
    field: keyof DebridementAssessmentData,
    value: string
  ) => {
    const current = (getValues(field) as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, updated as never);
  };

  const onSubmit = async (data: DebridementAssessmentData) => {
    setIsSubmitting(true);
    try {
      const result = await createDebridementAssessment(data);
      if (result.success) {
        toast.success("Debridement assessment saved");
        router.push(`/dashboard/patients/${patientId}/visits/${visitId}`);
      } else {
        toast.error(result.error || "Failed to save");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="assessmentDate">Date of Service *</Label>
            <Input
              id="assessmentDate"
              type="date"
              {...register("assessmentDate", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="placeOfService">Place of Service</Label>
            <Select
              value={placeOfService}
              onValueChange={(v) => setValue("placeOfService", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {PLACES_OF_SERVICE.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pre">Pre-Debridement</TabsTrigger>
          <TabsTrigger value="post">Post-Debridement</TabsTrigger>
          <TabsTrigger value="notes">Procedure Notes</TabsTrigger>
          <TabsTrigger value="plan">Plan & Goals</TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: Pre-Debridement ========== */}
        <TabsContent value="pre" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Debridement Wound Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location & Duration */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="woundLocation">Wound Location</Label>
                  <Input
                    id="woundLocation"
                    placeholder="e.g., Left lateral ankle"
                    {...register("woundLocation")}
                  />
                </div>
                <div>
                  <Label>Wound Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Yrs"
                      className="w-20"
                      {...register("woundDurationYears", {
                        valueAsNumber: true,
                      })}
                    />
                    <span className="text-sm text-muted-foreground">years</span>
                    <Input
                      type="number"
                      placeholder="Mo"
                      className="w-20"
                      {...register("woundDurationMonths", {
                        valueAsNumber: true,
                      })}
                    />
                    <span className="text-sm text-muted-foreground">months</span>
                    <Input
                      type="number"
                      placeholder="Wk"
                      className="w-20"
                      {...register("woundDurationWeeks", {
                        valueAsNumber: true,
                      })}
                    />
                    <span className="text-sm text-muted-foreground">weeks</span>
                  </div>
                </div>
              </div>

              {/* Type & Depth */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Wound Type / Etiology</Label>
                  <Select
                    value={woundType}
                    onValueChange={(v) => setValue("woundType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WOUND_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {woundType === "other" && (
                    <Input
                      className="mt-2"
                      placeholder="Specify other type..."
                      {...register("woundTypeOther")}
                    />
                  )}
                </div>
                <div>
                  <Label>Depth</Label>
                  <Select
                    value={woundDepth}
                    onValueChange={(v) => setValue("woundDepth", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_thickness">
                        Full Thickness
                      </SelectItem>
                      <SelectItem value="partial_thickness">
                        Partial Thickness
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Size */}
              <div>
                <Label>Size (cm) — measured head-to-toe</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="L"
                    className="w-24"
                    {...register("preSizeLength", { valueAsNumber: true })}
                  />
                  <span>×</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="W"
                    className="w-24"
                    {...register("preSizeWidth", { valueAsNumber: true })}
                  />
                  <span>×</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="D"
                    className="w-24"
                    {...register("preSizeDepth", { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">cm</span>
                </div>
              </div>

              {/* Undermining & Tunneling */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasUndermining"
                      checked={hasUndermining}
                      onCheckedChange={(c) =>
                        setValue("hasUndermining", c === true)
                      }
                    />
                    <Label htmlFor="hasUndermining">Undermining</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasTunneling"
                      checked={hasTunneling}
                      onCheckedChange={(c) =>
                        setValue("hasTunneling", c === true)
                      }
                    />
                    <Label htmlFor="hasTunneling">Tunneling</Label>
                  </div>
                </div>
                {hasTunneling && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="cm"
                      className="w-20"
                      {...register("tunnelingCm", { valueAsNumber: true })}
                    />
                    <span className="text-sm text-muted-foreground">cm @</span>
                    <Input
                      placeholder="o'clock"
                      className="w-24"
                      {...register("tunnelingClockPosition")}
                    />
                    <span className="text-sm text-muted-foreground">o&apos;clock</span>
                  </div>
                )}
              </div>

              {/* Wound Bed Composition */}
              <div>
                <Label>Wound Bed Composition (%)</Label>
                <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Granulation</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("preGranulationPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fibrotic</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("preFibroticPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Slough</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("preSloughPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Eschar</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("preEscharPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Visible Structures */}
              <div>
                <Label>Visible Structures</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {VISIBLE_STRUCTURES.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`vs-${opt.value}`}
                        checked={visibleStructures.includes(opt.value)}
                        onCheckedChange={() =>
                          toggleArrayField("visibleStructures", opt.value)
                        }
                      />
                      <Label htmlFor={`vs-${opt.value}`} className="text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wound Edges */}
              <div>
                <Label>Wound Edges</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {WOUND_EDGES.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`we-${opt.value}`}
                        checked={woundEdges.includes(opt.value)}
                        onCheckedChange={() =>
                          toggleArrayField("woundEdges", opt.value)
                        }
                      />
                      <Label htmlFor={`we-${opt.value}`} className="text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Periwound Skin */}
              <div>
                <Label>Periwound Skin</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {PERIWOUND_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`pw-${opt.value}`}
                        checked={periwoundSkin.includes(opt.value)}
                        onCheckedChange={() =>
                          toggleArrayField("periwoundSkin", opt.value)
                        }
                      />
                      <Label htmlFor={`pw-${opt.value}`} className="text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {periwoundSkin.includes("other") && (
                  <Input
                    className="mt-2"
                    placeholder="Describe other periwound condition..."
                    {...register("periwoundSkinOther")}
                  />
                )}
              </div>

              {/* Pain */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="painLevel">Pain Level (0–10)</Label>
                  <Input
                    id="painLevel"
                    type="number"
                    min={0}
                    max={10}
                    {...register("painLevel", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="painDescription">Pain Description</Label>
                  <Input
                    id="painDescription"
                    placeholder="Location, type, effect on debridement..."
                    {...register("painDescription")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB 2: Post-Debridement ========== */}
        <TabsContent value="post" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post-Debridement Wound Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Post Size */}
              <div>
                <Label>Post-Debridement Size (cm)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="L"
                    className="w-24"
                    {...register("postSizeLength", { valueAsNumber: true })}
                  />
                  <span>×</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="W"
                    className="w-24"
                    {...register("postSizeWidth", { valueAsNumber: true })}
                  />
                  <span>×</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="D"
                    className="w-24"
                    {...register("postSizeDepth", { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">cm</span>
                </div>
              </div>

              {/* Device Settings (pre-filled, read-only defaults) */}
              <div className="rounded-lg border bg-muted/30 p-4 dark:bg-card">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Device / Method
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Method</Label>
                    <p className="text-sm">
                      Ultrasonic non-contact low-frequency debridement (Arobella
                      Qoustic Wound Therapy System)
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Frequency / Instrument
                    </Label>
                    <p className="text-sm">
                      35 kHz — Arobella Qurette tip or relevant transducer
                    </p>
                  </div>
                  <div>
                    <Label>Mode</Label>
                    <Select
                      value={deviceMode}
                      onValueChange={(v) => setValue("deviceMode", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">Contact</SelectItem>
                        <SelectItem value="non_contact">Non-contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Anesthetic */}
              <div>
                <Label htmlFor="anestheticUsed">Anesthetic Used (if any)</Label>
                <Input
                  id="anestheticUsed"
                  placeholder="Non-Contact Anesthetic Used..."
                  {...register("anestheticUsed")}
                />
              </div>

              {/* Solution */}
              <div>
                <Label>Solution</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {SOLUTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`sol-${opt.value}`}
                        checked={solution.includes(opt.value)}
                        onCheckedChange={() =>
                          toggleArrayField("solution", opt.value)
                        }
                      />
                      <Label htmlFor={`sol-${opt.value}`} className="text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {solution.includes("other") && (
                  <Input
                    className="mt-2"
                    placeholder="Specify other solution..."
                    {...register("solutionOther")}
                  />
                )}
              </div>

              {/* Tissue Removed */}
              <div>
                <Label>Tissue Removed</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {TISSUE_REMOVED.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`tr-${opt.value}`}
                        checked={tissueRemoved.includes(opt.value)}
                        onCheckedChange={() =>
                          toggleArrayField("tissueRemoved", opt.value)
                        }
                      />
                      <Label htmlFor={`tr-${opt.value}`} className="text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Depth of Tissue Removed */}
              <div>
                <Label>Depth of Tissue Removed</Label>
                <Select
                  value={depthOfTissueRemoved}
                  onValueChange={(v) => setValue("depthOfTissueRemoved", v)}
                >
                  <SelectTrigger className="w-full md:w-72">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPTH_OF_TISSUE_REMOVED.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area Debrided */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="areaDebrided">Area Debrided (cm²)</Label>
                  <Input
                    id="areaDebrided"
                    type="number"
                    step="0.1"
                    {...register("areaDebrided", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Hemostasis */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Hemostasis Achieved</Label>
                  <Select
                    value={
                      hemostasisAchieved === true
                        ? "yes"
                        : hemostasisAchieved === false
                          ? "no"
                          : ""
                    }
                    onValueChange={(v) =>
                      setValue("hemostasisAchieved", v === "yes")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hemostasisAchieved === true && (
                  <div>
                    <Label htmlFor="hemostasisMethod">Method</Label>
                    <Input
                      id="hemostasisMethod"
                      {...register("hemostasisMethod")}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="estimatedBloodLoss">
                    Estimated Blood Loss
                  </Label>
                  <Input
                    id="estimatedBloodLoss"
                    {...register("estimatedBloodLoss")}
                  />
                </div>
              </div>

              {/* Post-Debridement Composition */}
              <div>
                <Label>Wound Bed Composition Post-Debridement (%)</Label>
                <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Granulation</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("postGranulationPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fibrotic</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("postFibroticPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Slough</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("postSloughPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Eschar</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      {...register("postEscharPercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB 3: Procedure Notes ========== */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Procedure Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pre-filled with standard Arobella procedure language. Edit as
                needed.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={12}
                {...register("procedureNotes")}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="includeMedicalNecessity"
                  checked={includeMedicalNecessity}
                  onCheckedChange={(c) =>
                    setValue("includeMedicalNecessity", c === true)
                  }
                />
                <CardTitle>
                  <Label htmlFor="includeMedicalNecessity" className="text-lg">
                    Include Medical Necessity Statement
                  </Label>
                </CardTitle>
              </div>
            </CardHeader>
            {includeMedicalNecessity && (
              <CardContent>
                <Textarea
                  rows={4}
                  {...register("medicalNecessityCustom")}
                  className="font-mono text-sm"
                />
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ========== TAB 4: Plan & Goals ========== */}
        <TabsContent value="plan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goals of Care</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {GOALS_OF_CARE.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`goal-${opt.value}`}
                      checked={goalsOfCare.includes(opt.value)}
                      onCheckedChange={() =>
                        toggleArrayField("goalsOfCare", opt.value)
                      }
                    />
                    <Label htmlFor={`goal-${opt.value}`}>{opt.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Next debridement in</Label>
                  <Input
                    type="number"
                    className="w-20"
                    {...register("nextDebridementDays", {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Dressing changes every</Label>
                  <Input
                    type="number"
                    className="w-20"
                    {...register("dressingChangeDays", {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>

              <div>
                <Label>Refer to</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {REFERRAL_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`ref-${opt.value}`}
                        checked={referrals.includes(opt.value)}
                        onCheckedChange={() =>
                          toggleArrayField("referrals", opt.value)
                        }
                      />
                      <Label htmlFor={`ref-${opt.value}`} className="text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {referrals.includes("other") && (
                  <Input
                    className="mt-2"
                    placeholder="Specify other referral..."
                    {...register("referralOther")}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {ADDITIONAL_INTERVENTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`ai-${opt.value}`}
                      checked={additionalInterventions.includes(opt.value)}
                      onCheckedChange={() =>
                        toggleArrayField("additionalInterventions", opt.value)
                      }
                    />
                    <Label htmlFor={`ai-${opt.value}`}>{opt.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/patients/${patientId}/visits/${visitId}`)
          }
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Debridement Assessment"}
        </Button>
      </div>
    </form>
  );
}
