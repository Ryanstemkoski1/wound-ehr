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
import { SignaturePad } from "@/components/signatures/signature-pad";
import { createSignature } from "@/app/actions/signatures";
import { toast } from "sonner";
import {
  createPatientNotSeenReport,
  type PatientNotSeenData,
} from "@/app/actions/new-forms";

const REASONS = [
  { value: "patient_refused", label: "Patient Refused Visit" },
  { value: "doctors_appointment", label: "Doctor's Appointment" },
  { value: "hospitalized", label: "Hospitalized" },
  { value: "not_available", label: "Not Available / Not at Location" },
  { value: "scheduling_error", label: "Scheduling Error" },
  { value: "duplicate_referral", label: "Duplicate Referral" },
  { value: "other", label: "Other" },
];

type Props = {
  visitId: string;
  patientId: string;
  facilityId: string;
  userId: string;
  clinicianName?: string;
  scheduledDate?: string;
};

export default function PatientNotSeenForm({
  visitId,
  patientId,
  facilityId,
  clinicianName,
  scheduledDate,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureId, setSignatureId] = useState<string | null>(null);

  const { register, handleSubmit, setValue, control } =
    useForm<PatientNotSeenData>({
      defaultValues: {
        visitId,
        patientId,
        facilityId,
        scheduledDate: scheduledDate || new Date().toISOString().split("T")[0],
        clinicianName: clinicianName || "",
        reason: "",
        followUpRescheduled: false,
        facilityNotified: false,
        familyNotified: false,
        referralSourceNotified: false,
        noFurtherAction: false,
      },
    });

  const reason = useWatch({ control, name: "reason" });
  const followUpRescheduled = useWatch({
    control,
    name: "followUpRescheduled",
  });
  const facilityNotified = useWatch({ control, name: "facilityNotified" });
  const familyNotified = useWatch({ control, name: "familyNotified" });
  const referralSourceNotified = useWatch({
    control,
    name: "referralSourceNotified",
  });
  const noFurtherAction = useWatch({ control, name: "noFurtherAction" });

  const handleSign = async (signatureData: string, method: "draw" | "type") => {
    try {
      const result = await createSignature({
        signatureType: "consent",
        patientId,
        signerName: clinicianName || "Clinician",
        signerRole: "Clinician",
        signatureData,
        signatureMethod: method,
      });
      if (result.data) {
        setSignatureId(result.data.id);
        setValue("clinicianSignatureId", result.data.id);
        toast.success("Signature captured");
      } else {
        toast.error("Failed to save signature");
      }
    } catch {
      toast.error("Error saving signature");
    }
  };

  const onSubmit = async (data: PatientNotSeenData) => {
    if (!data.reason) {
      toast.error("Please select a reason");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createPatientNotSeenReport(data);
      if (result.success) {
        toast.success("Patient Not Seen report saved");
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
      {/* Visit Info */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="scheduledDate">Date of Scheduled Visit *</Label>
            <Input
              id="scheduledDate"
              type="date"
              {...register("scheduledDate", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="clinicianName">Clinician Name</Label>
            <Input id="clinicianName" {...register("clinicianName")} />
          </div>
        </CardContent>
      </Card>

      {/* Reason */}
      <Card>
        <CardHeader>
          <CardTitle>Reason Patient Was Not Seen *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <Checkbox
                  id={`reason-${r.value}`}
                  checked={reason === r.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue("reason", r.value);
                    } else if (reason === r.value) {
                      setValue("reason", "");
                    }
                  }}
                />
                <Label htmlFor={`reason-${r.value}`}>{r.label}</Label>
              </div>
            ))}
          </div>
          {reason === "other" && (
            <Input
              placeholder="Specify other reason..."
              {...register("reasonOther")}
            />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Pertinent Information / Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Additional notes..."
            {...register("pertinentNotes")}
          />
        </CardContent>
      </Card>

      {/* Follow-Up Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-Up Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="followUpRescheduled"
                checked={followUpRescheduled || false}
                onCheckedChange={(c) =>
                  setValue("followUpRescheduled", c === true)
                }
              />
              <Label htmlFor="followUpRescheduled">Rescheduled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="facilityNotified"
                checked={facilityNotified || false}
                onCheckedChange={(c) =>
                  setValue("facilityNotified", c === true)
                }
              />
              <Label htmlFor="facilityNotified">Facility Notified</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="familyNotified"
                checked={familyNotified || false}
                onCheckedChange={(c) => setValue("familyNotified", c === true)}
              />
              <Label htmlFor="familyNotified">Family Notified</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="referralSourceNotified"
                checked={referralSourceNotified || false}
                onCheckedChange={(c) =>
                  setValue("referralSourceNotified", c === true)
                }
              />
              <Label htmlFor="referralSourceNotified">
                Referral Source Notified
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="noFurtherAction"
                checked={noFurtherAction || false}
                onCheckedChange={(c) => setValue("noFurtherAction", c === true)}
              />
              <Label htmlFor="noFurtherAction">
                No Further Action Required
              </Label>
            </div>
          </div>

          {followUpRescheduled && (
            <div>
              <Label htmlFor="followUpNewDate">New Scheduled Date</Label>
              <Input
                id="followUpNewDate"
                type="date"
                className="w-60"
                {...register("followUpNewDate")}
              />
            </div>
          )}

          <div>
            <Label htmlFor="followUpOther">Other Follow-Up Notes</Label>
            <Textarea
              id="followUpOther"
              rows={2}
              placeholder="Additional follow-up details..."
              {...register("followUpOther")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clinician Signature */}
      <Card>
        <CardHeader>
          <CardTitle>Clinician Signature</CardTitle>
        </CardHeader>
        <CardContent>
          {signatureId ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              Signature captured successfully
            </div>
          ) : (
            <SignaturePad
              onSave={handleSign}
              onCancel={() => {}}
              signerName={clinicianName || "Clinician"}
              title="Clinician Signature"
              description="Sign to confirm this report"
              certificationText="I certify that the patient was not seen for the reason stated above."
            />
          )}
        </CardContent>
      </Card>

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
          {isSubmitting ? "Saving..." : "Save Not Seen Report"}
        </Button>
      </div>
    </form>
  );
}
