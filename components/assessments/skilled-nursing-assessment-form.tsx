"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Send } from "lucide-react";
import { createSkilledNursingAssessment } from "@/app/actions/specialized-assessments";
import type { SkilledNursingAssessmentData, SkilledNursingWoundData } from "@/app/actions/specialized-assessments";

type SkilledNursingAssessmentFormProps = {
  visitId: string;
  patientId: string;
  facilityId: string;
  onComplete?: () => void;
};

export function SkilledNursingAssessmentForm({
  visitId,
  patientId,
  facilityId,
  onComplete,
}: SkilledNursingAssessmentFormProps) {
  const [saving, setSaving] = useState(false);
  const [wounds, setWounds] = useState<SkilledNursingWoundData[]>([]);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SkilledNursingAssessmentData>({
    defaultValues: {
      visitId,
      patientId,
      facilityId,
      assessmentDate: new Date().toISOString(),
      isDraft: true,
    },
  });

  const watchPain = watch("hasPain");
  const watchCough = watch("hasCough");
  const watchOxygen = watch("onOxygen");
  const watchNebulizer = watch("onNebulizer");
  const watchTubeFeeding = watch("tubeFeeding");

  const onSubmit = async (data: SkilledNursingAssessmentData, isDraft: boolean) => {
    setSaving(true);
    try {
      const result = await createSkilledNursingAssessment(
        { ...data, isDraft },
        wounds
      );

      if (result.success) {
        toast.success(isDraft ? "Assessment saved as draft" : "Assessment submitted successfully");
        onComplete?.();
      } else {
        toast.error("Failed to save assessment", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Skilled Nursing Visit Assessment</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit((data) => onSubmit(data, true))}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, false))}
            disabled={saving}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pain" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="pain">Pain</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="cardio">Cardio</TabsTrigger>
          <TabsTrigger value="resp">Respiratory</TabsTrigger>
          <TabsTrigger value="neuro">Neuro</TabsTrigger>
          <TabsTrigger value="sensory">Sensory</TabsTrigger>
          <TabsTrigger value="gu">GU</TabsTrigger>
          <TabsTrigger value="gi">GI</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="more">More</TabsTrigger>
        </TabsList>

        {/* Pain Section */}
        <TabsContent value="pain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pain Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPain"
                  {...register("hasPain")}
                  onCheckedChange={(checked) => setValue("hasPain", checked as boolean)}
                />
                <Label htmlFor="hasPain">Patient has pain</Label>
              </div>

              {watchPain && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="painScale">Pain Scale (0-10)</Label>
                      <Input
                        id="painScale"
                        type="number"
                        min="0"
                        max="10"
                        {...register("painScale", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="painLocation">Location</Label>
                      <Input
                        id="painLocation"
                        placeholder="e.g., Lower back, Right knee"
                        {...register("painLocation")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="painQuality">Pain Quality</Label>
                    <Input
                      id="painQuality"
                      placeholder="e.g., Sharp, Dull, Aching, Burning"
                      {...register("painQuality")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="painManagement">Pain Management</Label>
                    <Textarea
                      id="painManagement"
                      placeholder="Current pain management interventions..."
                      {...register("painManagement")}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="painAggravatingFactors">Aggravating Factors</Label>
                    <Input
                      id="painAggravatingFactors"
                      placeholder="What makes the pain worse?"
                      {...register("painAggravatingFactors")}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vitals Section */}
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vital Signs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="temp">Temperature (°F)</Label>
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    {...register("temp", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    placeholder="72"
                    {...register("heartRate", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                  <Input
                    id="respiratoryRate"
                    type="number"
                    placeholder="16"
                    {...register("respiratoryRate", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bpSystolic">BP Systolic</Label>
                  <Input
                    id="bpSystolic"
                    type="number"
                    placeholder="120"
                    {...register("bpSystolic", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bpDiastolic">BP Diastolic</Label>
                  <Input
                    id="bpDiastolic"
                    type="number"
                    placeholder="80"
                    {...register("bpDiastolic", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oxygenSaturation">O2 Saturation (%)</Label>
                  <Input
                    id="oxygenSaturation"
                    type="number"
                    placeholder="98"
                    {...register("oxygenSaturation", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodSugar">Blood Sugar (mg/dL)</Label>
                  <Input
                    id="bloodSugar"
                    type="number"
                    placeholder="110"
                    {...register("bloodSugar", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cardiovascular Section */}
        <TabsContent value="cardio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cardiovascular Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cardiovascularWnl"
                  {...register("cardiovascularWnl")}
                  onCheckedChange={(checked) => setValue("cardiovascularWnl", checked as boolean)}
                />
                <Label htmlFor="cardiovascularWnl">Within Normal Limits</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="chestPain" {...register("chestPain")} />
                  <Label htmlFor="chestPain">Chest Pain</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="heartMurmur" {...register("heartMurmur")} />
                  <Label htmlFor="heartMurmur">Heart Murmur</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="heartGallop" {...register("heartGallop")} />
                  <Label htmlFor="heartGallop">Gallop</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="heartClick" {...register("heartClick")} />
                  <Label htmlFor="heartClick">Click</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="heartIrregular" {...register("heartIrregular")} />
                  <Label htmlFor="heartIrregular">Irregular</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="dizziness" {...register("dizziness")} />
                  <Label htmlFor="dizziness">Dizziness</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="neckVeinDistention" {...register("neckVeinDistention")} />
                  <Label htmlFor="neckVeinDistention">Neck Vein Distention</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="capRefillUnder3sec"
                    {...register("capRefillUnder3sec")}
                    defaultChecked
                  />
                  <Label htmlFor="capRefillUnder3sec">Cap Refill &lt; 3 sec</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="peripheralPulses">Peripheral Pulses</Label>
                  <Input
                    id="peripheralPulses"
                    placeholder="e.g., 2+ bilateral"
                    {...register("peripheralPulses")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edemaGrade">Edema Grade</Label>
                  <Select onValueChange={(value) => setValue("edemaGrade", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+2">+2</SelectItem>
                      <SelectItem value="+3">+3</SelectItem>
                      <SelectItem value="+4">+4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Respiratory Section */}
        <TabsContent value="resp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Respiratory Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lung Sounds</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsCta" {...register("lungSoundsCta")} />
                    <Label htmlFor="lungSoundsCta">Clear to Auscultation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsRales" {...register("lungSoundsRales")} />
                    <Label htmlFor="lungSoundsRales">Rales</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsRhonchi" {...register("lungSoundsRhonchi")} />
                    <Label htmlFor="lungSoundsRhonchi">Rhonchi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsWheezes" {...register("lungSoundsWheezes")} />
                    <Label htmlFor="lungSoundsWheezes">Wheezes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsCrackles" {...register("lungSoundsCrackles")} />
                    <Label htmlFor="lungSoundsCrackles">Crackles</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsAbsent" {...register("lungSoundsAbsent")} />
                    <Label htmlFor="lungSoundsAbsent">Absent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsDiminished" {...register("lungSoundsDiminished")} />
                    <Label htmlFor="lungSoundsDiminished">Diminished</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lungSoundsStridor" {...register("lungSoundsStridor")} />
                    <Label htmlFor="lungSoundsStridor">Stridor</Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasCough"
                    {...register("hasCough")}
                    onCheckedChange={(checked) => setValue("hasCough", checked as boolean)}
                  />
                  <Label htmlFor="hasCough">Cough</Label>
                </div>
                {watchCough && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="coughProductive" {...register("coughProductive")} />
                    <Label htmlFor="coughProductive">Productive</Label>
                  </div>
                )}
              </div>

              {watchCough && (
                <div className="space-y-2">
                  <Label htmlFor="sputumDescription">Sputum Description</Label>
                  <Input
                    id="sputumDescription"
                    placeholder="Color, consistency..."
                    {...register("sputumDescription")}
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onOxygen"
                    {...register("onOxygen")}
                    onCheckedChange={(checked) => setValue("onOxygen", checked as boolean)}
                  />
                  <Label htmlFor="onOxygen">On Oxygen</Label>
                </div>
                {watchOxygen && (
                  <div className="space-y-2">
                    <Label htmlFor="oxygenLpm">Liters per Minute</Label>
                    <Input
                      id="oxygenLpm"
                      type="number"
                      step="0.5"
                      placeholder="2.0"
                      {...register("oxygenLpm", { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onNebulizer"
                    {...register("onNebulizer")}
                    onCheckedChange={(checked) => setValue("onNebulizer", checked as boolean)}
                  />
                  <Label htmlFor="onNebulizer">Nebulizer</Label>
                </div>
                {watchNebulizer && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="nebulizerType">Type</Label>
                      <Select onValueChange={(value) => setValue("nebulizerType", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intermittent">Intermittent</SelectItem>
                          <SelectItem value="continuous">Continuous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nebulizerTime">Time</Label>
                      <Input id="nebulizerTime" {...register("nebulizerTime")} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neurological Section */}
        <TabsContent value="neuro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Neurological Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Orientation</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="orientedPerson" {...register("orientedPerson")} defaultChecked />
                    <Label htmlFor="orientedPerson">Person</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="orientedPlace" {...register("orientedPlace")} defaultChecked />
                    <Label htmlFor="orientedPlace">Place</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="orientedTime" {...register("orientedTime")} defaultChecked />
                    <Label htmlFor="orientedTime">Time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="disoriented" {...register("disoriented")} />
                    <Label htmlFor="disoriented">Disoriented</Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="forgetful" {...register("forgetful")} />
                  <Label htmlFor="forgetful">Forgetful</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="lethargic" {...register("lethargic")} />
                  <Label htmlFor="lethargic">Lethargic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="perrl" {...register("perrl")} defaultChecked />
                  <Label htmlFor="perrl">PERRL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hasSeizures" {...register("hasSeizures")} />
                  <Label htmlFor="hasSeizures">Seizures</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensory Section */}
        <TabsContent value="sensory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sensory Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="sensoryWnl" {...register("sensoryWnl")} />
                <Label htmlFor="sensoryWnl">Within Normal Limits</Label>
              </div>

              <div className="space-y-2">
                <Label>Hearing</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hearingImpairedLeft" {...register("hearingImpairedLeft")} />
                    <Label htmlFor="hearingImpairedLeft">Impaired Left</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hearingImpairedRight" {...register("hearingImpairedRight")} />
                    <Label htmlFor="hearingImpairedRight">Impaired Right</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hearingDeaf" {...register("hearingDeaf")} />
                    <Label htmlFor="hearingDeaf">Deaf</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="speechImpaired" {...register("speechImpaired")} />
                    <Label htmlFor="speechImpaired">Speech Impaired</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vision</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionWnl" {...register("visionWnl")} />
                    <Label htmlFor="visionWnl">Within Normal Limits</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionGlasses" {...register("visionGlasses")} />
                    <Label htmlFor="visionGlasses">Glasses</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionContacts" {...register("visionContacts")} />
                    <Label htmlFor="visionContacts">Contacts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionBlurred" {...register("visionBlurred")} />
                    <Label htmlFor="visionBlurred">Blurred</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionCataracts" {...register("visionCataracts")} />
                    <Label htmlFor="visionCataracts">Cataracts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionGlaucoma" {...register("visionGlaucoma")} />
                    <Label htmlFor="visionGlaucoma">Glaucoma</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="visionBlind" {...register("visionBlind")} />
                    <Label htmlFor="visionBlind">Blind</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visionMacularDegeneration"
                      {...register("visionMacularDegeneration")}
                    />
                    <Label htmlFor="visionMacularDegeneration">Macular Degeneration</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decreasedSensation">Decreased Sensation</Label>
                <Textarea
                  id="decreasedSensation"
                  placeholder="Location and description..."
                  {...register("decreasedSensation")}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GU Section */}
        <TabsContent value="gu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Genitourinary Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="guWnl" {...register("guWnl")} />
                <Label htmlFor="guWnl">Within Normal Limits</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="guIncontinence" {...register("guIncontinence")} />
                  <Label htmlFor="guIncontinence">Incontinence</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="guDistention" {...register("guDistention")} />
                  <Label htmlFor="guDistention">Distention</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="guBurning" {...register("guBurning")} />
                  <Label htmlFor="guBurning">Burning</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="guFrequency" {...register("guFrequency")} />
                  <Label htmlFor="guFrequency">Frequency</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="guDysuria" {...register("guDysuria")} />
                  <Label htmlFor="guDysuria">Dysuria</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="guRetention" {...register("guRetention")} />
                  <Label htmlFor="guRetention">Retention</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="guUrgency" {...register("guUrgency")} />
                  <Label htmlFor="guUrgency">Urgency</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="catheterType">Catheter Type</Label>
                <Select onValueChange={(value) => setValue("catheterType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="foley">Foley</SelectItem>
                    <SelectItem value="suprapubic">Suprapubic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Urine Characteristics</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="urineCloudy" {...register("urineCloudy")} />
                    <Label htmlFor="urineCloudy">Cloudy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="urineOdorous" {...register("urineOdorous")} />
                    <Label htmlFor="urineOdorous">Odorous</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="urineSediment" {...register("urineSediment")} />
                    <Label htmlFor="urineSediment">Sediment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="urineHematuria" {...register("urineHematuria")} />
                    <Label htmlFor="urineHematuria">Hematuria</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GI Section */}
        <TabsContent value="gi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gastrointestinal Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="giWnl" {...register("giWnl")} />
                <Label htmlFor="giWnl">Within Normal Limits</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="giNauseaVomiting" {...register("giNauseaVomiting")} />
                  <Label htmlFor="giNauseaVomiting">Nausea/Vomiting</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="giNpo" {...register("giNpo")} />
                  <Label htmlFor="giNpo">NPO</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="giReflux" {...register("giReflux")} />
                  <Label htmlFor="giReflux">Reflux</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="giDiarrhea" {...register("giDiarrhea")} />
                  <Label htmlFor="giDiarrhea">Diarrhea</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="giIncontinence" {...register("giIncontinence")} />
                  <Label htmlFor="giIncontinence">Incontinence</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="lastBm">Last BM</Label>
                  <Input id="lastBm" type="date" {...register("lastBm")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stool Characteristics</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="stoolWnl" {...register("stoolWnl")} />
                    <Label htmlFor="stoolWnl">Within Normal Limits</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="stoolGray" {...register("stoolGray")} />
                    <Label htmlFor="stoolGray">Gray</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="stoolTarry" {...register("stoolTarry")} />
                    <Label htmlFor="stoolTarry">Tarry</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="stoolFreshBlood" {...register("stoolFreshBlood")} />
                    <Label htmlFor="stoolFreshBlood">Fresh Blood</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="stoolBlack" {...register("stoolBlack")} />
                    <Label htmlFor="stoolBlack">Black</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="hasOstomy" {...register("hasOstomy")} />
                <Label htmlFor="hasOstomy">Ostomy Present</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nutrition Section */}
        <TabsContent value="nutrition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nutrition Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="nutritionWnl" {...register("nutritionWnl")} />
                <Label htmlFor="nutritionWnl">Within Normal Limits</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="dysphagia" {...register("dysphagia")} />
                  <Label htmlFor="dysphagia">Dysphagia</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="decreasedAppetite" {...register("decreasedAppetite")} />
                  <Label htmlFor="decreasedAppetite">Decreased Appetite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="dentures" {...register("dentures")} />
                  <Label htmlFor="dentures">Dentures</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="chewingSwallowingIssues"
                    {...register("chewingSwallowingIssues")}
                  />
                  <Label htmlFor="chewingSwallowingIssues">Chewing/Swallowing Issues</Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tubeFeeding"
                  {...register("tubeFeeding")}
                  onCheckedChange={(checked) => setValue("tubeFeeding", checked as boolean)}
                />
                <Label htmlFor="tubeFeeding">Tube Feeding</Label>
              </div>

              {watchTubeFeeding && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tubeFeedingFormula">Formula</Label>
                      <Input
                        id="tubeFeedingFormula"
                        placeholder="Formula name"
                        {...register("tubeFeedingFormula")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tubeFeedingType">Type</Label>
                      <Select onValueChange={(value) => setValue("tubeFeedingType", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bolus">Bolus</SelectItem>
                          <SelectItem value="continuous">Continuous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tubeFeedingRateCcHr">Rate (cc/hr)</Label>
                      <Input
                        id="tubeFeedingRateCcHr"
                        type="number"
                        {...register("tubeFeedingRateCcHr", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tubeFeedingMethod">Method</Label>
                      <Select onValueChange={(value) => setValue("tubeFeedingMethod", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pump">Pump</SelectItem>
                          <SelectItem value="gravity">Gravity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tubeFeedingPlacementChecked"
                      {...register("tubeFeedingPlacementChecked")}
                    />
                    <Label htmlFor="tubeFeedingPlacementChecked">Placement Checked</Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* More Section - Medications, Psychosocial, Musculoskeletal */}
        <TabsContent value="more" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medChangesSinceLastVisit"
                    {...register("medChangesSinceLastVisit")}
                  />
                  <Label htmlFor="medChangesSinceLastVisit">Changes Since Last Visit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="medCompliant" {...register("medCompliant")} defaultChecked />
                  <Label htmlFor="medCompliant">Compliant</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicationNotes">Notes</Label>
                <Textarea
                  id="medicationNotes"
                  placeholder="Medication changes, compliance issues..."
                  {...register("medicationNotes")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Psychosocial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="poorHomeEnvironment" {...register("poorHomeEnvironment")} />
                  <Label htmlFor="poorHomeEnvironment">Poor Home Environment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="poorCopingSkills" {...register("poorCopingSkills")} />
                  <Label htmlFor="poorCopingSkills">Poor Coping Skills</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="agitated" {...register("agitated")} />
                  <Label htmlFor="agitated">Agitated</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="depressedMood" {...register("depressedMood")} />
                  <Label htmlFor="depressedMood">Depressed Mood</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="impairedDecisionMaking"
                    {...register("impairedDecisionMaking")}
                  />
                  <Label htmlFor="impairedDecisionMaking">Impaired Decision Making</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="anxiety" {...register("anxiety")} />
                  <Label htmlFor="anxiety">Anxiety</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="inappropriateBehavior" {...register("inappropriateBehavior")} />
                  <Label htmlFor="inappropriateBehavior">Inappropriate Behavior</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="irritability" {...register("irritability")} />
                  <Label htmlFor="irritability">Irritability</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Musculoskeletal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="musculoskeletalWnl" {...register("musculoskeletalWnl")} />
                <Label htmlFor="musculoskeletalWnl">Within Normal Limits</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="weakness" {...register("weakness")} />
                  <Label htmlFor="weakness">Weakness</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="ambulationDifficulty" {...register("ambulationDifficulty")} />
                  <Label htmlFor="ambulationDifficulty">Ambulation Difficulty</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="jointPain" {...register("jointPain")} />
                  <Label htmlFor="jointPain">Joint Pain</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="balanceIssues" {...register("balanceIssues")} />
                  <Label htmlFor="balanceIssues">Balance Issues</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="bedbound" {...register("bedbound")} />
                  <Label htmlFor="bedbound">Bedbound</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="chairbound" {...register("chairbound")} />
                  <Label htmlFor="chairbound">Chairbound</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="contracture" {...register("contracture")} />
                  <Label htmlFor="contracture">Contracture</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="paralysis" {...register("paralysis")} />
                  <Label htmlFor="paralysis">Paralysis</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integumentary & Skin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="integumentaryWnl" {...register("integumentaryWnl")} />
                <Label htmlFor="integumentaryWnl">Within Normal Limits</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="skinDry" {...register("skinDry")} />
                  <Label htmlFor="skinDry">Dry</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="skinClammy" {...register("skinClammy")} />
                  <Label htmlFor="skinClammy">Clammy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="skinWarm" {...register("skinWarm")} />
                  <Label htmlFor="skinWarm">Warm</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="skinCool" {...register("skinCool")} />
                  <Label htmlFor="skinCool">Cool</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="skinPallor" {...register("skinPallor")} />
                  <Label htmlFor="skinPallor">Pallor</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skinTurgor">Skin Turgor</Label>
                <Select onValueChange={(value) => setValue("skinTurgor", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="decreased">Decreased</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Education & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="educationGiven">Education Given</Label>
                <Textarea
                  id="educationGiven"
                  placeholder="Patient/family education provided..."
                  {...register("educationGiven")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mdNotification">MD Notification</Label>
                <Textarea
                  id="mdNotification"
                  placeholder="Physician notifications..."
                  {...register("mdNotification")}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="problemsIssues">Problems/Issues</Label>
                <Textarea
                  id="problemsIssues"
                  placeholder="Problems identified and plan..."
                  {...register("problemsIssues")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
