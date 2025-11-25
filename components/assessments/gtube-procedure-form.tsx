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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAutosave } from "@/lib/hooks/use-autosave";
import AutosaveIndicator from "@/components/ui/autosave-indicator";
import AutosaveRecoveryModal from "@/components/ui/autosave-recovery-modal";
import { hasRecentAutosave } from "@/lib/autosave";
import { createGTubeProcedure, type GTubeProcedureData } from "@/app/actions/specialized-assessments";

type GTubeProcedureFormProps = {
  patientId: string;
  facilityId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function GTubeProcedureForm({
  patientId,
  facilityId,
  userId,
  onSuccess,
  onCancel,
}: GTubeProcedureFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Autosave state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"saving" | "saved" | "error" | "idle">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<GTubeProcedureData>({
    defaultValues: {
      patientId,
      facilityId,
      procedureDate: new Date().toISOString().split("T")[0],
      isDraft: true,
    },
  });

  // Watch fields for conditional rendering
  const watchProcedurePerformed = watch("procedurePerformed");
  const watchReplacementPerformed = watch("replacementPerformed");
  const watchTubeType = watch("tubeType");

  // Get all form values for autosave
  const formValues = watch();

  // Client-side autosave hook (localStorage)
  const { loadSavedData, clearSavedData } = useAutosave({
    formType: "gtube-procedure",
    entityId: patientId,
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
    const autosaveKey = `wound-ehr-autosave-gtube-procedure-${patientId}-${userId}`;
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
        const typedKey = key as keyof GTubeProcedureData;
        setValue(typedKey, (data as Record<string, unknown>)[key] as never);
      });
      toast.success("Restored unsaved procedure data");
    }
    setShowRecoveryModal(false);
  };

  // Discard autosaved data
  const handleDiscardAutosave = () => {
    clearSavedData();
    setShowRecoveryModal(false);
  };

  const onSubmit = async (data: GTubeProcedureData, isDraft: boolean) => {
    setIsSubmitting(true);
    try {
      data.isDraft = isDraft;
      await createGTubeProcedure(data);
      clearSavedData(); // Clear autosave after successful submission
      toast.success(isDraft ? "Draft saved successfully" : "G-tube procedure submitted successfully");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/patients/${patientId}`);
      }
    } catch (error) {
      console.error("Error saving G-tube procedure:", error);
      toast.error("Failed to save G-tube procedure");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AutosaveRecoveryModal
        isOpen={showRecoveryModal}
        onRestore={handleRestoreAutosave}
        onDiscard={handleDiscardAutosave}
        timestamp={loadSavedData().timestamp ?? new Date().toISOString()}
        formType="G-tube Procedure"
      />

      <div className="mb-4 flex items-center justify-between">
        <AutosaveIndicator status={autosaveStatus} lastSaved={lastSavedTime} />
      </div>

      <form className="space-y-6">
        <Tabs defaultValue="patient-info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="patient-info">Patient Info</TabsTrigger>
          <TabsTrigger value="procedure">Procedure</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="replacement">Replacement</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        {/* Patient Info & Comorbidities */}
        <TabsContent value="patient-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="procedureDate">Procedure Date</Label>
                  <Input
                    id="procedureDate"
                    type="date"
                    {...register("procedureDate", { required: "Date is required" })}
                  />
                  {errors.procedureDate && (
                    <p className="text-sm text-destructive">{errors.procedureDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="procedureTime">Procedure Time</Label>
                  <Input id="procedureTime" type="time" {...register("procedureTime")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicianName">Clinician Name</Label>
                <Input
                  id="clinicianName"
                  placeholder="Clinician performing procedure"
                  {...register("clinicianName")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comorbidities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidDm" {...register("comorbidDm")} />
                  <Label htmlFor="comorbidDm">Diabetes Mellitus</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidCad" {...register("comorbidCad")} />
                  <Label htmlFor="comorbidCad">CAD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidCvd" {...register("comorbidCvd")} />
                  <Label htmlFor="comorbidCvd">CVD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidCopd" {...register("comorbidCopd")} />
                  <Label htmlFor="comorbidCopd">COPD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidEsrd" {...register("comorbidEsrd")} />
                  <Label htmlFor="comorbidEsrd">ESRD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidCkd" {...register("comorbidCkd")} />
                  <Label htmlFor="comorbidCkd">CKD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidHtn" {...register("comorbidHtn")} />
                  <Label htmlFor="comorbidHtn">Hypertension</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidAsthmaBronchitis" {...register("comorbidAsthmaBronchitis")} />
                  <Label htmlFor="comorbidAsthmaBronchitis">Asthma/Bronchitis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidCancer" {...register("comorbidCancer")} />
                  <Label htmlFor="comorbidCancer">Cancer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidObesity" {...register("comorbidObesity")} />
                  <Label htmlFor="comorbidObesity">Obesity</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidAlzheimers" {...register("comorbidAlzheimers")} />
                  <Label htmlFor="comorbidAlzheimers">Alzheimer's</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="comorbidDementia" {...register("comorbidDementia")} />
                  <Label htmlFor="comorbidDementia">Dementia</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comorbidOther">Other Comorbidities</Label>
                <Textarea
                  id="comorbidOther"
                  placeholder="Additional diagnoses..."
                  {...register("comorbidOther")}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procedure Performed */}
        <TabsContent value="procedure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Procedure Performed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="procedurePerformed"
                  {...register("procedurePerformed")}
                  onCheckedChange={(checked) => setValue("procedurePerformed", checked as boolean)}
                />
                <Label htmlFor="procedurePerformed">Procedure Performed</Label>
              </div>

              {watchProcedurePerformed && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="procedureType">Procedure Type</Label>
                    <Select onValueChange={(value) => setValue("procedureType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial-placement">Initial Placement</SelectItem>
                        <SelectItem value="replacement">Replacement</SelectItem>
                        <SelectItem value="assessment-only">Assessment Only</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="procedureIndication">Indication</Label>
                    <Textarea
                      id="procedureIndication"
                      placeholder="Reason for procedure..."
                      {...register("procedureIndication")}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Abdominal Exam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="abdomenSoft" {...register("abdomenSoft")} />
                  <Label htmlFor="abdomenSoft">Soft</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="abdomenNonTender" {...register("abdomenNonTender")} />
                  <Label htmlFor="abdomenNonTender">Non-tender</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="abdomenDistended" {...register("abdomenDistended")} />
                  <Label htmlFor="abdomenDistended">Distended</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="abdomenTender" {...register("abdomenTender")} />
                  <Label htmlFor="abdomenTender">Tender</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bowelSounds">Bowel Sounds</Label>
                <Select onValueChange={(value) => setValue("bowelSounds", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hyperactive">Hyperactive</SelectItem>
                    <SelectItem value="hypoactive">Hypoactive</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessment - Tube Type & Peri-tube Findings */}
        <TabsContent value="assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tube Type & Characteristics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tubeType">Tube Type</Label>
                <Select onValueChange={(value) => setValue("tubeType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tube type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peg">PEG</SelectItem>
                    <SelectItem value="peg-j">PEG-J</SelectItem>
                    <SelectItem value="low-profile">Low Profile</SelectItem>
                    <SelectItem value="ng-tube">NG Tube</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tubeFrenchSize">French Size</Label>
                  <Input
                    id="tubeFrenchSize"
                    type="number"
                    placeholder="e.g., 18"
                    {...register("tubeFrenchSize", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tubeLength">Length (cm)</Label>
                  <Input
                    id="tubeLength"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 2.5"
                    {...register("tubeLength", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {watchTubeType === "low-profile" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="balloonVolume">Balloon Volume (ml)</Label>
                    <Input
                      id="balloonVolume"
                      type="number"
                      step="0.1"
                      {...register("balloonVolume", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balloonWater">Balloon Water (ml)</Label>
                    <Input
                      id="balloonWater"
                      type="number"
                      step="0.1"
                      {...register("balloonWater", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tubeManufacturer">Manufacturer</Label>
                <Input
                  id="tubeManufacturer"
                  placeholder="e.g., AMT, MIC-KEY"
                  {...register("tubeManufacturer")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Peri-Tube Site Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeSiteClean" {...register("peritubeSiteClean")} />
                  <Label htmlFor="peritubeSiteClean">Clean</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeSiteDry" {...register("peritubeSiteDry")} />
                  <Label htmlFor="peritubeSiteDry">Dry</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeSiteIntact" {...register("peritubeSiteIntact")} />
                  <Label htmlFor="peritubeSiteIntact">Intact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeGranulation" {...register("peritubeGranulation")} />
                  <Label htmlFor="peritubeGranulation">Granulation Tissue</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeErythema" {...register("peritubeErythema")} />
                  <Label htmlFor="peritubeErythema">Erythema</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeEdema" {...register("peritubeEdema")} />
                  <Label htmlFor="peritubeEdema">Edema</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeDrainage" {...register("peritubeDrainage")} />
                  <Label htmlFor="peritubeDrainage">Drainage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeInduration" {...register("peritubeInduration")} />
                  <Label htmlFor="peritubeInduration">Induration</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeTenderness" {...register("peritubeTenderness")} />
                  <Label htmlFor="peritubeTenderness">Tenderness</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeLeaking" {...register("peritubeLeaking")} />
                  <Label htmlFor="peritubeLeaking">Leaking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeBleeding" {...register("peritubeBleeding")} />
                  <Label htmlFor="peritubeBleeding">Bleeding</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="peritubeOdor" {...register("peritubeOdor")} />
                  <Label htmlFor="peritubeOdor">Odor</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drainageDescription">Drainage Description</Label>
                <Textarea
                  id="drainageDescription"
                  placeholder="Color, consistency, amount..."
                  {...register("drainageDescription")}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteNotes">Site Assessment Notes</Label>
                <Textarea
                  id="siteNotes"
                  placeholder="Additional findings..."
                  {...register("siteNotes")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replacement Details */}
        <TabsContent value="replacement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Replacement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="replacementPerformed"
                  {...register("replacementPerformed")}
                  onCheckedChange={(checked) => setValue("replacementPerformed", checked as boolean)}
                />
                <Label htmlFor="replacementPerformed">Replacement Performed</Label>
              </div>

              {watchReplacementPerformed && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="replacementReason">Reason for Replacement</Label>
                    <Textarea
                      id="replacementReason"
                      placeholder="Indication for tube replacement..."
                      {...register("replacementReason")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Old Tube Removed</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="oldTubeFrenchSize">French Size</Label>
                        <Input
                          id="oldTubeFrenchSize"
                          type="number"
                          {...register("oldTubeFrenchSize", { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="oldTubeLength">Length (cm)</Label>
                        <Input
                          id="oldTubeLength"
                          type="number"
                          step="0.1"
                          {...register("oldTubeLength", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>New Tube Placed</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="newTubeFrenchSize">French Size</Label>
                        <Input
                          id="newTubeFrenchSize"
                          type="number"
                          {...register("newTubeFrenchSize", { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newTubeLength">Length (cm)</Label>
                        <Input
                          id="newTubeLength"
                          type="number"
                          step="0.1"
                          {...register("newTubeLength", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replacementTechnique">Technique</Label>
                    <Textarea
                      id="replacementTechnique"
                      placeholder="Describe replacement procedure..."
                      {...register("replacementTechnique")}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="lubrication" {...register("lubrication")} />
                      <Label htmlFor="lubrication">Lubrication Used</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="guidewireUsed" {...register("guidewireUsed")} />
                      <Label htmlFor="guidewireUsed">Guidewire Used</Label>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification & Documentation */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Placement Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Method</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="verificationAspiration" {...register("verificationAspiration")} />
                    <Label htmlFor="verificationAspiration">Aspiration of Gastric Contents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="verificationPhTest" {...register("verificationPhTest")} />
                    <Label htmlFor="verificationPhTest">pH Test</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="verificationAuscultation" {...register("verificationAuscultation")} />
                    <Label htmlFor="verificationAuscultation">Auscultation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="verificationXray" {...register("verificationXray")} />
                    <Label htmlFor="verificationXray">X-ray Confirmation</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationNotes">Verification Notes</Label>
                <Textarea
                  id="verificationNotes"
                  placeholder="Details of verification..."
                  {...register("verificationNotes")}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Procedure Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="procedureNote">Detailed Procedure Note</Label>
                <Textarea
                  id="procedureNote"
                  placeholder="Complete description of procedure..."
                  {...register("procedureNote")}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  placeholder="Any complications or adverse events..."
                  {...register("complications")}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient Instructions & Consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientInstructions">Instructions Given</Label>
                <Textarea
                  id="patientInstructions"
                  placeholder="Care instructions provided to patient/caregiver..."
                  {...register("patientInstructions")}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="consentObtained" {...register("consentObtained")} />
                  <Label htmlFor="consentObtained">Informed Consent Obtained</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="patientTolerated" {...register("patientTolerated")} />
                  <Label htmlFor="patientTolerated">Patient Tolerated Well</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalComments">Additional Comments</Label>
                <Textarea
                  id="additionalComments"
                  placeholder="Any other relevant information..."
                  {...register("additionalComments")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 border-t pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={handleSubmit((data) => onSubmit(data, true))}
          disabled={isSubmitting}
        >
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={handleSubmit((data) => onSubmit(data, false))}
          disabled={isSubmitting}
        >
          Submit Procedure
        </Button>
      </div>
    </form>
    </>
  );
}
