"use client";

import { useState, useEffect, useMemo } from "react";
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
  createGraftingAssessment,
  type GraftingAssessmentData,
} from "@/app/actions/specialized-assessments";

type GraftingAssessmentFormProps = {
  visitId: string;
  patientId: string;
  facilityId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function GraftingAssessmentForm({
  visitId,
  patientId,
  facilityId,
  userId,
  onSuccess,
  onCancel,
}: GraftingAssessmentFormProps) {
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
  } = useForm<GraftingAssessmentData>({
    defaultValues: {
      visitId,
      patientId,
      facilityId,
      procedureDate: new Date().toISOString().split("T")[0],
      isDraft: true,
    },
  });

  // Watch fields for conditional rendering and calculations
  const watchGraftLength = watch("graftSizeLength");
  const watchGraftWidth = watch("graftSizeWidth");
  const watchDonorLength = watch("donorSizeLength");
  const watchDonorWidth = watch("donorSizeWidth");

  // Calculate graft area
  const graftArea = useMemo(() => {
    const length = watchGraftLength ? parseFloat(watchGraftLength.toString()) : 0;
    const width = watchGraftWidth ? parseFloat(watchGraftWidth.toString()) : 0;
    if (length > 0 && width > 0) {
      return (length * width).toFixed(2);
    }
    return "";
  }, [watchGraftLength, watchGraftWidth]);

  // Update graft area whenever it changes
  useEffect(() => {
    if (graftArea) {
      setValue("graftSizeArea", parseFloat(graftArea));
    }
  }, [graftArea, setValue]);

  // Get all form values for autosave
  const formValues = watch();

  // Client-side autosave hook (localStorage)
  const { loadSavedData, clearSavedData } = useAutosave({
    formType: "grafting-assessment",
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
    const autosaveKey = `wound-ehr-autosave-grafting-assessment-${visitId}-${userId}`;
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
        const typedKey = key as keyof GraftingAssessmentData;
        setValue(typedKey, (data as Record<string, unknown>)[key] as never);
      });
      toast.success("Restored unsaved grafting assessment");
    }
    setShowRecoveryModal(false);
  };

  // Discard autosaved data
  const handleDiscardAutosave = () => {
    clearSavedData();
    setShowRecoveryModal(false);
  };

  const onSubmit = async (data: GraftingAssessmentData, isDraft: boolean) => {
    setIsSubmitting(true);
    try {
      data.isDraft = isDraft;
      await createGraftingAssessment(data);
      clearSavedData(); // Clear autosave after successful submission
      toast.success(
        isDraft
          ? "Draft saved successfully"
          : "Grafting assessment submitted successfully"
      );
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/patients/${patientId}`);
      }
    } catch (error) {
      console.error("Error saving grafting assessment:", error);
      toast.error("Failed to save grafting assessment");
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
        formType="Grafting Assessment"
      />

      <div className="mb-4 flex items-center justify-between">
        <AutosaveIndicator status={autosaveStatus} lastSaved={lastSavedTime} />
      </div>

      <form className="space-y-6">
        <Tabs defaultValue="procedure-info" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="procedure-info">Procedure</TabsTrigger>
            <TabsTrigger value="graft-site">Graft Site</TabsTrigger>
            <TabsTrigger value="donor-site">Donor Site</TabsTrigger>
            <TabsTrigger value="treatment">Treatment</TabsTrigger>
            <TabsTrigger value="followup">Follow-up</TabsTrigger>
          </TabsList>

          {/* Procedure Information */}
          <TabsContent value="procedure-info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Procedure Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="procedureDate">Procedure Date *</Label>
                    <Input
                      id="procedureDate"
                      type="date"
                      {...register("procedureDate", {
                        required: "Date is required",
                      })}
                    />
                    {errors.procedureDate && (
                      <p className="text-destructive text-sm">
                        {errors.procedureDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postopDay">Post-Op Day</Label>
                    <Input
                      id="postopDay"
                      type="number"
                      min="0"
                      placeholder="Days since procedure"
                      {...register("postopDay", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="procedureType">Procedure Type *</Label>
                    <Select
                      onValueChange={(value) => setValue("procedureType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial_grafting">
                          Initial Grafting
                        </SelectItem>
                        <SelectItem value="regrafting">Regrafting</SelectItem>
                        <SelectItem value="touch_up">Touch-Up</SelectItem>
                        <SelectItem value="donor_site_check">
                          Donor Site Check
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Graft Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="graftType">Graft Type *</Label>
                    <Select onValueChange={(value) => setValue("graftType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select graft type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="split_thickness">
                          Split Thickness Skin Graft (STSG)
                        </SelectItem>
                        <SelectItem value="full_thickness">
                          Full Thickness Skin Graft (FTSG)
                        </SelectItem>
                        <SelectItem value="dermal_substitute">
                          Dermal Substitute
                        </SelectItem>
                        <SelectItem value="skin_substitute">
                          Skin Substitute
                        </SelectItem>
                        <SelectItem value="acellular_matrix">
                          Acellular Dermal Matrix
                        </SelectItem>
                        <SelectItem value="composite_graft">
                          Composite Graft
                        </SelectItem>
                        <SelectItem value="mesh_graft">Mesh Graft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meshRatio">Mesh Ratio (if applicable)</Label>
                    <Input
                      id="meshRatio"
                      placeholder="e.g., 1:1.5, 3:1"
                      {...register("meshRatio")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graftLocation">Graft Location *</Label>
                  <Input
                    id="graftLocation"
                    placeholder="e.g., Left lower leg, lateral aspect"
                    {...register("graftLocation", {
                      required: "Location is required",
                    })}
                  />
                  {errors.graftLocation && (
                    <p className="text-destructive text-sm">
                      {errors.graftLocation.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="graftSizeLength">Length (cm)</Label>
                    <Input
                      id="graftSizeLength"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("graftSizeLength", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graftSizeWidth">Width (cm)</Label>
                    <Input
                      id="graftSizeWidth"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("graftSizeWidth", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graftSizeArea">Area (cm²)</Label>
                    <Input
                      id="graftSizeArea"
                      value={graftArea}
                      disabled
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fixationMethod">Fixation Method</Label>
                  <Select
                    onValueChange={(value) => setValue("fixationMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fixation method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sutures">Sutures</SelectItem>
                      <SelectItem value="staples">Staples</SelectItem>
                      <SelectItem value="steri_strips">Steri-Strips</SelectItem>
                      <SelectItem value="tissue_glue">Tissue Glue</SelectItem>
                      <SelectItem value="bolster">Bolster Dressing</SelectItem>
                      <SelectItem value="negative_pressure">
                        Negative Pressure
                      </SelectItem>
                      <SelectItem value="combination">Combination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fixationDetails">Fixation Details</Label>
                  <Textarea
                    id="fixationDetails"
                    placeholder="Describe fixation technique, suture type, etc."
                    {...register("fixationDetails")}
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="suturesRemoved"
                      {...register("suturesRemoved")}
                    />
                    <Label htmlFor="suturesRemoved">Sutures Removed</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suturesRemovalDate">Removal Date</Label>
                    <Input
                      id="suturesRemovalDate"
                      type="date"
                      {...register("suturesRemovalDate")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Graft Site Assessment */}
          <TabsContent value="graft-site" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Graft Adherence & Viability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="graftAdherencePercent">
                      Graft Adherence (%)
                    </Label>
                    <Input
                      id="graftAdherencePercent"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      {...register("graftAdherencePercent", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="graftViable" {...register("graftViable")} />
                    <Label htmlFor="graftViable">Graft is Viable</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graftAdherenceNotes">Adherence Notes</Label>
                  <Textarea
                    id="graftAdherenceNotes"
                    placeholder="Describe graft take, areas of non-adherence, etc."
                    {...register("graftAdherenceNotes")}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Graft Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="graftColor">Graft Color</Label>
                    <Select onValueChange={(value) => setValue("graftColor", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pink">Pink (healthy)</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="pale">Pale</SelectItem>
                        <SelectItem value="dusky">Dusky</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="mottled">Mottled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graftTexture">Graft Texture</Label>
                    <Select
                      onValueChange={(value) => setValue("graftTexture", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select texture" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supple">Supple</SelectItem>
                        <SelectItem value="firm">Firm</SelectItem>
                        <SelectItem value="tense">Tense</SelectItem>
                        <SelectItem value="edematous">Edematous</SelectItem>
                        <SelectItem value="dry">Dry</SelectItem>
                        <SelectItem value="fragile">Fragile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complications & Signs of Concern</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="signsOfRejection"
                      {...register("signsOfRejection")}
                    />
                    <Label htmlFor="signsOfRejection">Signs of Rejection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="signsOfInfection"
                      {...register("signsOfInfection")}
                    />
                    <Label htmlFor="signsOfInfection">Signs of Infection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="hasHematoma" {...register("hasHematoma")} />
                    <Label htmlFor="hasHematoma">Hematoma Present</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="hasSeroma" {...register("hasSeroma")} />
                    <Label htmlFor="hasSeroma">Seroma Present</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="hasBlistering" {...register("hasBlistering")} />
                    <Label htmlFor="hasBlistering">Blistering</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="graftSeparation"
                      {...register("graftSeparation")}
                    />
                    <Label htmlFor="graftSeparation">Graft Separation</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="graftNecrosis" {...register("graftNecrosis")} />
                    <Label htmlFor="graftNecrosis">Necrosis Present</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="necrosisPercent">Necrosis (%)</Label>
                    <Input
                      id="necrosisPercent"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      {...register("necrosisPercent", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Infection Signs (if applicable)</Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="infectionSignIncreasedWarmth"
                        value="increased_warmth"
                        onCheckedChange={(checked) => {
                          const current = formValues.infectionSigns || [];
                          if (checked) {
                            setValue("infectionSigns", [
                              ...current,
                              "increased_warmth",
                            ]);
                          } else {
                            setValue(
                              "infectionSigns",
                              current.filter((s) => s !== "increased_warmth")
                            );
                          }
                        }}
                      />
                      <Label htmlFor="infectionSignIncreasedWarmth">
                        Increased Warmth
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="infectionSignPurulent"
                        value="purulent_drainage"
                        onCheckedChange={(checked) => {
                          const current = formValues.infectionSigns || [];
                          if (checked) {
                            setValue("infectionSigns", [
                              ...current,
                              "purulent_drainage",
                            ]);
                          } else {
                            setValue(
                              "infectionSigns",
                              current.filter((s) => s !== "purulent_drainage")
                            );
                          }
                        }}
                      />
                      <Label htmlFor="infectionSignPurulent">
                        Purulent Drainage
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="infectionSignOdor"
                        value="odor"
                        onCheckedChange={(checked) => {
                          const current = formValues.infectionSigns || [];
                          if (checked) {
                            setValue("infectionSigns", [...current, "odor"]);
                          } else {
                            setValue(
                              "infectionSigns",
                              current.filter((s) => s !== "odor")
                            );
                          }
                        }}
                      />
                      <Label htmlFor="infectionSignOdor">Odor</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="infectionSignErythema"
                        value="erythema"
                        onCheckedChange={(checked) => {
                          const current = formValues.infectionSigns || [];
                          if (checked) {
                            setValue("infectionSigns", [...current, "erythema"]);
                          } else {
                            setValue(
                              "infectionSigns",
                              current.filter((s) => s !== "erythema")
                            );
                          }
                        }}
                      />
                      <Label htmlFor="infectionSignErythema">Erythema</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Donor Site Assessment */}
          <TabsContent value="donor-site" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Donor Site Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="donorSite">Donor Site Location</Label>
                  <Input
                    id="donorSite"
                    placeholder="e.g., Right thigh, anterior"
                    {...register("donorSite")}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="donorSizeLength">Length (cm)</Label>
                    <Input
                      id="donorSizeLength"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("donorSizeLength", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donorSizeWidth">Width (cm)</Label>
                    <Input
                      id="donorSizeWidth"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("donorSizeWidth", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donorSiteCondition">Condition</Label>
                  <Select
                    onValueChange={(value) => setValue("donorSiteCondition", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healing_well">Healing Well</SelectItem>
                      <SelectItem value="epithelializing">
                        Epithelializing
                      </SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="moist">Moist</SelectItem>
                      <SelectItem value="drainage">Drainage Present</SelectItem>
                      <SelectItem value="infection">Infection</SelectItem>
                      <SelectItem value="delayed_healing">
                        Delayed Healing
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donorSiteDressing">Dressing Type</Label>
                  <Input
                    id="donorSiteDressing"
                    placeholder="e.g., Xeroform, Mepilex, etc."
                    {...register("donorSiteDressing")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donorSiteNotes">Donor Site Notes</Label>
                  <Textarea
                    id="donorSiteNotes"
                    placeholder="Additional observations about donor site"
                    {...register("donorSiteNotes")}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatment & Dressing */}
          <TabsContent value="treatment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dressing & Treatment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="graftDressingType">Graft Dressing Type</Label>
                  <Input
                    id="graftDressingType"
                    placeholder="e.g., Non-adherent gauze, foam, etc."
                    {...register("graftDressingType")}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dressingIntact"
                    {...register("dressingIntact")}
                  />
                  <Label htmlFor="dressingIntact">Dressing Intact</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dressingChangeFrequency">
                    Dressing Change Frequency
                  </Label>
                  <Input
                    id="dressingChangeFrequency"
                    placeholder="e.g., Daily, Every 3 days, PRN"
                    {...register("dressingChangeFrequency")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topicalTreatment">Topical Treatment</Label>
                  <Input
                    id="topicalTreatment"
                    placeholder="e.g., Silver sulfadiazine, Bacitracin, etc."
                    {...register("topicalTreatment")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moistureManagement">Moisture Management</Label>
                  <Textarea
                    id="moistureManagement"
                    placeholder="Describe moisture control strategies"
                    {...register("moistureManagement")}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="activityRestrictions">
                    Activity Restrictions
                  </Label>
                  <Textarea
                    id="activityRestrictions"
                    placeholder="e.g., No strenuous activity, avoid impact, etc."
                    {...register("activityRestrictions")}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevationInstructions">
                    Elevation Instructions
                  </Label>
                  <Textarea
                    id="elevationInstructions"
                    placeholder="e.g., Elevate leg above heart level when resting"
                    {...register("elevationInstructions")}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightBearingStatus">
                    Weight Bearing Status
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setValue("weightBearingStatus", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_weight_bearing">
                        Non-Weight Bearing (NWB)
                      </SelectItem>
                      <SelectItem value="partial_weight_bearing">
                        Partial Weight Bearing (PWB)
                      </SelectItem>
                      <SelectItem value="full_weight_bearing">
                        Full Weight Bearing (FWB)
                      </SelectItem>
                      <SelectItem value="as_tolerated">As Tolerated</SelectItem>
                      <SelectItem value="not_applicable">
                        Not Applicable
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathingInstructions">
                    Bathing Instructions
                  </Label>
                  <Textarea
                    id="bathingInstructions"
                    placeholder="e.g., Keep area dry for 48 hours, sponge bath only, etc."
                    {...register("bathingInstructions")}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Follow-up & Clinical Notes */}
          <TabsContent value="followup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Post-Op Instructions & Education</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="postopInstructions">
                    Post-Op Instructions
                  </Label>
                  <Textarea
                    id="postopInstructions"
                    placeholder="Comprehensive post-operative care instructions"
                    {...register("postopInstructions")}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientEducationProvided">
                    Patient Education Provided
                  </Label>
                  <Textarea
                    id="patientEducationProvided"
                    placeholder="Topics discussed with patient/caregiver"
                    {...register("patientEducationProvided")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followUpPlan">Follow-Up Plan</Label>
                  <Textarea
                    id="followUpPlan"
                    placeholder="Return visit schedule, monitoring plan, etc."
                    {...register("followUpPlan")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextDressingChangeDate">
                    Next Dressing Change Date
                  </Label>
                  <Input
                    id="nextDressingChangeDate"
                    type="date"
                    {...register("nextDressingChangeDate")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clinical Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="complications">Complications</Label>
                  <Textarea
                    id="complications"
                    placeholder="Any complications noted"
                    {...register("complications")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interventionsPerformed">
                    Interventions Performed
                  </Label>
                  <Textarea
                    id="interventionsPerformed"
                    placeholder="Procedures or treatments performed during this visit"
                    {...register("interventionsPerformed")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providerNotes">Provider Notes</Label>
                  <Textarea
                    id="providerNotes"
                    placeholder="Additional clinical observations and recommendations"
                    {...register("providerNotes")}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overallAssessment">Overall Assessment</Label>
                  <Select
                    onValueChange={(value) => setValue("overallAssessment", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="concerning">Concerning</SelectItem>
                    </SelectContent>
                  </Select>
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
