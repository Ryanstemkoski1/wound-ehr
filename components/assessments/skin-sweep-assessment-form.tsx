"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useAutosave } from "@/lib/hooks/use-autosave";
import AutosaveIndicator from "@/components/ui/autosave-indicator";
import AutosaveRecoveryModal from "@/components/ui/autosave-recovery-modal";
import { hasRecentAutosave } from "@/lib/autosave";
import {
  createSkinSweepAssessment,
  type SkinSweepAssessmentData,
} from "@/app/actions/specialized-assessments";

type SkinSweepAssessmentFormProps = {
  visitId: string;
  patientId: string;
  facilityId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function SkinSweepAssessmentForm({
  visitId,
  patientId,
  facilityId,
  userId,
  onSuccess,
  onCancel,
}: SkinSweepAssessmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autosave state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "saving" | "saved" | "error" | "idle"
  >("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SkinSweepAssessmentData>({
    defaultValues: {
      visitId,
      patientId,
      facilityId,
      assessmentDate: new Date().toISOString().split("T")[0],
      totalWoundsFound: 0,
      newWoundsDocumented: 0,
      woundsUnchanged: 0,
      woundsImproved: 0,
      woundsWorsened: 0,
      isDraft: true,
    },
  });

  // Get all form values for autosave
  const formValues = watch();

  // Client-side autosave hook (localStorage)
  const { loadSavedData, clearSavedData } = useAutosave({
    formType: "skin-sweep-assessment",
    entityId: visitId,
    userId,
    data: formValues,
    interval: 30000, // 30 seconds
    enabled: true,
    onSave: () => {
      setAutosaveStatus("saved");
      setLastSavedTime("just now");
    },
  });

  // Check for autosaved data on mount
  useEffect(() => {
    const autosaveKey = `wound-ehr-autosave-skin-sweep-assessment-${visitId}-${userId}`;
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
      Object.keys(data).forEach((key) => {
        const typedKey = key as keyof SkinSweepAssessmentData;
        setValue(typedKey, (data as Record<string, unknown>)[key] as never);
      });
      toast.success("Restored unsaved skin sweep assessment");
    }
    setShowRecoveryModal(false);
  };

  // Discard autosaved data
  const handleDiscardAutosave = () => {
    clearSavedData();
    setShowRecoveryModal(false);
  };

  const onSubmit = async (
    data: SkinSweepAssessmentData,
    isDraft: boolean
  ) => {
    setIsSubmitting(true);
    try {
      data.isDraft = isDraft;
      await createSkinSweepAssessment(data);
      clearSavedData(); // Clear autosave after successful submission
      toast.success(
        isDraft
          ? "Draft saved successfully"
          : "Skin sweep assessment submitted successfully"
      );
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/patients/${patientId}`);
      }
    } catch (error) {
      console.error("Error saving skin sweep assessment:", error);
      toast.error("Failed to save skin sweep assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to toggle array values
  const toggleArrayValue = (
    fieldName: keyof SkinSweepAssessmentData,
    value: string
  ) => {
    const currentValues =
      (formValues[fieldName] as string[] | undefined) || [];
    if (currentValues.includes(value)) {
      setValue(
        fieldName,
        currentValues.filter((v) => v !== value) as never
      );
    } else {
      setValue(fieldName, [...currentValues, value] as never);
    }
  };

  return (
    <>
      <AutosaveRecoveryModal
        isOpen={showRecoveryModal}
        onRestore={handleRestoreAutosave}
        onDiscard={handleDiscardAutosave}
        timestamp={loadSavedData().timestamp ?? new Date().toISOString()}
        formType="Skin Sweep Assessment"
      />

      <div className="mb-4 flex items-center justify-between">
        <AutosaveIndicator status={autosaveStatus} lastSaved={lastSavedTime} />
      </div>

      <form className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="body-areas">Body Areas</TabsTrigger>
            <TabsTrigger value="risk-factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="prevention">Prevention</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="followup">Follow-Up</TabsTrigger>
          </TabsList>

          {/* Overview & General Assessment */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assessmentDate">Assessment Date *</Label>
                    <Input
                      id="assessmentDate"
                      type="date"
                      {...register("assessmentDate", {
                        required: "Date is required",
                      })}
                    />
                    {errors.assessmentDate && (
                      <p className="text-destructive text-sm">
                        {errors.assessmentDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessmentType">Assessment Type *</Label>
                    <Select
                      onValueChange={(value) => setValue("assessmentType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admission">
                          Admission Assessment
                        </SelectItem>
                        <SelectItem value="routine">Routine Skin Check</SelectItem>
                        <SelectItem value="discharge">
                          Discharge Assessment
                        </SelectItem>
                        <SelectItem value="post_fall">Post-Fall</SelectItem>
                        <SelectItem value="concern_identified">
                          Concern Identified
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Skin Condition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="skinConditionOverall">Skin Condition</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("skinConditionOverall", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intact">Intact</SelectItem>
                        <SelectItem value="dry">Dry</SelectItem>
                        <SelectItem value="fragile">Fragile</SelectItem>
                        <SelectItem value="edematous">Edematous</SelectItem>
                        <SelectItem value="compromised">Compromised</SelectItem>
                        <SelectItem value="clammy">Clammy</SelectItem>
                        <SelectItem value="diaphoretic">Diaphoretic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skinTemperature">Skin Temperature</Label>
                    <Select
                      onValueChange={(value) => setValue("skinTemperature", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select temperature" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skinColor">Skin Color</Label>
                    <Select
                      onValueChange={(value) => setValue("skinColor", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="pale">Pale</SelectItem>
                        <SelectItem value="flushed">Flushed</SelectItem>
                        <SelectItem value="cyanotic">Cyanotic</SelectItem>
                        <SelectItem value="jaundiced">Jaundiced</SelectItem>
                        <SelectItem value="mottled">Mottled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skinTurgor">Skin Turgor</Label>
                    <Select onValueChange={(value) => setValue("skinTurgor", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select turgor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="tenting">Tenting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wound Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="totalWoundsFound">Total Wounds Found</Label>
                    <Input
                      id="totalWoundsFound"
                      type="number"
                      min="0"
                      {...register("totalWoundsFound", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newWoundsDocumented">New Wounds</Label>
                    <Input
                      id="newWoundsDocumented"
                      type="number"
                      min="0"
                      {...register("newWoundsDocumented", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="woundsUnchanged">Wounds Unchanged</Label>
                    <Input
                      id="woundsUnchanged"
                      type="number"
                      min="0"
                      {...register("woundsUnchanged", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="woundsImproved">Wounds Improved</Label>
                    <Input
                      id="woundsImproved"
                      type="number"
                      min="0"
                      {...register("woundsImproved", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="woundsWorsened">Wounds Worsened</Label>
                    <Input
                      id="woundsWorsened"
                      type="number"
                      min="0"
                      {...register("woundsWorsened", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Body Areas Inspected */}
          <TabsContent value="body-areas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Body Areas Inspected</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    "head",
                    "face",
                    "neck",
                    "shoulders",
                    "back_upper",
                    "back_lower",
                    "chest",
                    "abdomen",
                    "sacrum",
                    "coccyx",
                    "buttocks",
                    "groin",
                    "perineum",
                    "arms_upper",
                    "arms_lower",
                    "hands",
                    "elbows",
                    "legs_upper",
                    "legs_lower",
                    "knees",
                    "ankles",
                    "feet",
                    "heels",
                    "toes",
                  ].map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area}`}
                        checked={
                          (formValues.areasInspected || []).includes(area)
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            toggleArrayValue("areasInspected", area);
                          } else {
                            toggleArrayValue("areasInspected", area);
                          }
                        }}
                      />
                      <Label htmlFor={`area-${area}`} className="capitalize">
                        {area.replace("_", " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Head & Neck Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="headNeckHasWounds"
                    {...register("headNeckHasWounds")}
                  />
                  <Label htmlFor="headNeckHasWounds">Wounds Present</Label>
                </div>
                <Textarea
                  id="headNeckFindings"
                  placeholder="Describe findings in head and neck area"
                  {...register("headNeckFindings")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trunk (Chest, Abdomen, Back) Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trunkHasWounds"
                    {...register("trunkHasWounds")}
                  />
                  <Label htmlFor="trunkHasWounds">Wounds Present</Label>
                </div>
                <Textarea
                  id="trunkFindings"
                  placeholder="Describe findings in trunk area"
                  {...register("trunkFindings")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upper Extremities Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="upperExtremitiesHasWounds"
                    {...register("upperExtremitiesHasWounds")}
                  />
                  <Label htmlFor="upperExtremitiesHasWounds">
                    Wounds Present
                  </Label>
                </div>
                <Textarea
                  id="upperExtremitiesFindings"
                  placeholder="Describe findings in upper extremities"
                  {...register("upperExtremitiesFindings")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lower Extremities Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lowerExtremitiesHasWounds"
                    {...register("lowerExtremitiesHasWounds")}
                  />
                  <Label htmlFor="lowerExtremitiesHasWounds">
                    Wounds Present
                  </Label>
                </div>
                <Textarea
                  id="lowerExtremitiesFindings"
                  placeholder="Describe findings in lower extremities"
                  {...register("lowerExtremitiesFindings")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sacral/Coccyx Area Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sacralHasWounds"
                    {...register("sacralHasWounds")}
                  />
                  <Label htmlFor="sacralHasWounds">Wounds Present</Label>
                </div>
                <Textarea
                  id="sacralFindings"
                  placeholder="Describe findings in sacral/coccyx area"
                  {...register("sacralFindings")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Perineal Area Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perinealHasWounds"
                    {...register("perinealHasWounds")}
                  />
                  <Label htmlFor="perinealHasWounds">Wounds Present</Label>
                </div>
                <Textarea
                  id="perinealFindings"
                  placeholder="Describe findings in perineal area"
                  {...register("perinealFindings")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>At-Risk Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    "sacrum",
                    "coccyx",
                    "heels",
                    "elbows",
                    "occiput",
                    "shoulders",
                    "hips",
                    "knees",
                    "ankles",
                    "toes",
                    "ears",
                    "nose",
                  ].map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={`risk-${area}`}
                        checked={(formValues.atRiskAreas || []).includes(area)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            toggleArrayValue("atRiskAreas", area);
                          } else {
                            toggleArrayValue("atRiskAreas", area);
                          }
                        }}
                      />
                      <Label htmlFor={`risk-${area}`} className="capitalize">
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
                <Textarea
                  id="atRiskNotes"
                  placeholder="Additional notes about at-risk areas"
                  {...register("atRiskNotes")}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk Factors */}
          <TabsContent value="risk-factors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    "oxygen_tubing",
                    "nasal_cannula",
                    "catheter",
                    "ng_tube",
                    "iv_line",
                    "central_line",
                    "feeding_tube",
                    "tracheostomy",
                    "chest_tube",
                    "drain",
                    "restraints",
                    "brace_splint",
                  ].map((device) => (
                    <div key={device} className="flex items-center space-x-2">
                      <Checkbox
                        id={`device-${device}`}
                        checked={
                          (formValues.devicesIdentified || []).includes(device)
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            toggleArrayValue("devicesIdentified", device);
                          } else {
                            toggleArrayValue("devicesIdentified", device);
                          }
                        }}
                      />
                      <Label htmlFor={`device-${device}`} className="capitalize">
                        {device.replace("_", " ")}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deviceRelatedInjuries"
                    {...register("deviceRelatedInjuries")}
                  />
                  <Label htmlFor="deviceRelatedInjuries">
                    Device-Related Injuries Present
                  </Label>
                </div>

                <Textarea
                  id="deviceInjuryDetails"
                  placeholder="Describe any device-related injuries"
                  {...register("deviceInjuryDetails")}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Moisture-Related Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasIncontinence"
                      {...register("hasIncontinence")}
                    />
                    <Label htmlFor="hasIncontinence">Incontinence Present</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incontinenceType">Incontinence Type</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("incontinenceType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="urinary">Urinary</SelectItem>
                        <SelectItem value="bowel">Bowel</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="moistureAssociatedDermatitis"
                      {...register("moistureAssociatedDermatitis")}
                    />
                    <Label htmlFor="moistureAssociatedDermatitis">
                      Moisture-Associated Dermatitis
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skinBreakdownFromMoisture"
                      {...register("skinBreakdownFromMoisture")}
                    />
                    <Label htmlFor="skinBreakdownFromMoisture">
                      Skin Breakdown from Moisture
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    "diabetes",
                    "poor_nutrition",
                    "immobility",
                    "incontinence",
                    "altered_sensation",
                    "circulatory_problems",
                    "cognitive_impairment",
                    "advanced_age",
                    "low_bmi",
                    "malnutrition",
                    "anemia",
                    "smoking",
                  ].map((factor) => (
                    <div key={factor} className="flex items-center space-x-2">
                      <Checkbox
                        id={`risk-factor-${factor}`}
                        checked={(formValues.riskFactors || []).includes(factor)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            toggleArrayValue("riskFactors", factor);
                          } else {
                            toggleArrayValue("riskFactors", factor);
                          }
                        }}
                      />
                      <Label
                        htmlFor={`risk-factor-${factor}`}
                        className="capitalize"
                      >
                        {factor.replace("_", " ")}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bradenScaleScore">
                      Braden Scale Score (6-23)
                    </Label>
                    <Input
                      id="bradenScaleScore"
                      type="number"
                      min="6"
                      max="23"
                      placeholder="Score"
                      {...register("bradenScaleScore", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Level</Label>
                    <Select onValueChange={(value) => setValue("riskLevel", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_risk">
                          No Risk (19-23)
                        </SelectItem>
                        <SelectItem value="mild_risk">
                          Mild Risk (15-18)
                        </SelectItem>
                        <SelectItem value="moderate_risk">
                          Moderate Risk (13-14)
                        </SelectItem>
                        <SelectItem value="high_risk">
                          High Risk (10-12)
                        </SelectItem>
                        <SelectItem value="severe_risk">
                          Severe Risk (≤9)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prevention Measures */}
          <TabsContent value="prevention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Currently in Use</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      "pressure_relief_mattress",
                      "foam_mattress",
                      "air_mattress",
                      "alternating_pressure",
                      "gel_cushion",
                      "heel_protectors",
                      "elbow_protectors",
                      "chair_cushion",
                      "positioning_devices",
                      "turning_wedge",
                    ].map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <Checkbox
                          id={`current-${equipment}`}
                          checked={
                            (formValues.equipmentCurrentlyInUse || []).includes(
                              equipment
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              toggleArrayValue("equipmentCurrentlyInUse", equipment);
                            } else {
                              toggleArrayValue("equipmentCurrentlyInUse", equipment);
                            }
                          }}
                        />
                        <Label
                          htmlFor={`current-${equipment}`}
                          className="capitalize"
                        >
                          {equipment.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recommended Equipment</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      "pressure_relief_mattress",
                      "foam_mattress",
                      "air_mattress",
                      "alternating_pressure",
                      "gel_cushion",
                      "heel_protectors",
                      "elbow_protectors",
                      "chair_cushion",
                      "positioning_devices",
                      "turning_wedge",
                    ].map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <Checkbox
                          id={`recommend-${equipment}`}
                          checked={
                            (formValues.equipmentRecommendations || []).includes(
                              equipment
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              toggleArrayValue(
                                "equipmentRecommendations",
                                equipment
                              );
                            } else {
                              toggleArrayValue(
                                "equipmentRecommendations",
                                equipment
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`recommend-${equipment}`}
                          className="capitalize"
                        >
                          {equipment.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Equipment Ordered</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      "pressure_relief_mattress",
                      "foam_mattress",
                      "air_mattress",
                      "alternating_pressure",
                      "gel_cushion",
                      "heel_protectors",
                      "elbow_protectors",
                      "chair_cushion",
                      "positioning_devices",
                      "turning_wedge",
                    ].map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ordered-${equipment}`}
                          checked={
                            (formValues.equipmentOrdered || []).includes(equipment)
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              toggleArrayValue("equipmentOrdered", equipment);
                            } else {
                              toggleArrayValue("equipmentOrdered", equipment);
                            }
                          }}
                        />
                        <Label
                          htmlFor={`ordered-${equipment}`}
                          className="capitalize"
                        >
                          {equipment.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education */}
          <TabsContent value="education" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient/Caregiver Education</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="educationProvided"
                    {...register("educationProvided")}
                  />
                  <Label htmlFor="educationProvided">Education Provided</Label>
                </div>

                <div className="space-y-2">
                  <Label>Education Topics</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      "repositioning",
                      "nutrition",
                      "hydration",
                      "skin_care",
                      "moisture_management",
                      "pressure_relief",
                      "early_warning_signs",
                      "equipment_use",
                      "activity_mobility",
                    ].map((topic) => (
                      <div key={topic} className="flex items-center space-x-2">
                        <Checkbox
                          id={`topic-${topic}`}
                          checked={
                            (formValues.educationTopics || []).includes(topic)
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              toggleArrayValue("educationTopics", topic);
                            } else {
                              toggleArrayValue("educationTopics", topic);
                            }
                          }}
                        />
                        <Label htmlFor={`topic-${topic}`} className="capitalize">
                          {topic.replace("_", " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="educationMethod">Education Method</Label>
                    <Select
                      onValueChange={(value) => setValue("educationMethod", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verbal">Verbal</SelectItem>
                        <SelectItem value="written">Written Materials</SelectItem>
                        <SelectItem value="demonstration">
                          Demonstration
                        </SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="combination">Combination</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientUnderstanding">
                      Patient Understanding
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("patientUnderstanding", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verbalizes_understanding">
                          Verbalizes Understanding
                        </SelectItem>
                        <SelectItem value="demonstrates_understanding">
                          Demonstrates Understanding
                        </SelectItem>
                        <SelectItem value="requires_reinforcement">
                          Requires Reinforcement
                        </SelectItem>
                        <SelectItem value="language_barrier">
                          Language Barrier
                        </SelectItem>
                        <SelectItem value="cognitive_impairment">
                          Cognitive Impairment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="caregiverEducationProvided"
                    {...register("caregiverEducationProvided")}
                  />
                  <Label htmlFor="caregiverEducationProvided">
                    Caregiver Education Provided
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Follow-Up & Clinical Notes */}
          <TabsContent value="followup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Follow-Up & Referrals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="followUpNeeded"
                    {...register("followUpNeeded")}
                  />
                  <Label htmlFor="followUpNeeded">Follow-Up Needed</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followUpFrequency">Follow-Up Frequency</Label>
                  <Input
                    id="followUpFrequency"
                    placeholder="e.g., Weekly, Daily, PRN"
                    {...register("followUpFrequency")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Referrals Made</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      "wound_care_specialist",
                      "dietitian",
                      "physical_therapy",
                      "occupational_therapy",
                      "social_work",
                      "case_management",
                      "physician",
                      "dme_supplier",
                    ].map((referral) => (
                      <div key={referral} className="flex items-center space-x-2">
                        <Checkbox
                          id={`referral-${referral}`}
                          checked={(formValues.referralsMade || []).includes(
                            referral
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              toggleArrayValue("referralsMade", referral);
                            } else {
                              toggleArrayValue("referralsMade", referral);
                            }
                          }}
                        />
                        <Label
                          htmlFor={`referral-${referral}`}
                          className="capitalize"
                        >
                          {referral.replace("_", " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clinical Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="significantFindings">
                    Significant Findings
                  </Label>
                  <Textarea
                    id="significantFindings"
                    placeholder="Key findings from assessment"
                    {...register("significantFindings")}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interventionsImplemented">
                    Interventions Implemented
                  </Label>
                  <Textarea
                    id="interventionsImplemented"
                    placeholder="Actions taken during this assessment"
                    {...register("interventionsImplemented")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providerAssessment">Provider Assessment</Label>
                  <Textarea
                    id="providerAssessment"
                    placeholder="Clinical judgment and recommendations"
                    {...register("providerAssessment")}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations or comments"
                    {...register("notes")}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex gap-3 border-t pt-6">
          <Button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, true))}
            variant="outline"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, false))}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Assessment"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </>
  );
}
