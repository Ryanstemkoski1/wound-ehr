"use client";

import { useState } from "react";
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
import { createVisit, updateVisit } from "@/app/actions/visits";
import {
  createBilling,
  updateBilling,
  getBillingForVisit,
} from "@/app/actions/billing";
import BillingForm, {
  type BillingFormData,
} from "@/components/billing/billing-form";
import { useEffect } from "react";
import { toast } from "sonner";

type VisitFormProps = {
  patientId: string;
  visit?: {
    id: string;
    visitDate: Date;
    visitType: string;
    location: string | null;
    status: string;
    followUpType: string | null;
    followUpDate: Date | null;
    followUpNotes: string | null;
    timeSpent: boolean;
    additionalNotes: string | null;
  };
  onSuccess?: () => void;
};

export default function VisitForm({
  patientId,
  visit,
  onSuccess,
}: VisitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [visitType, setVisitType] = useState(visit?.visitType || "");
  const [status, setStatus] = useState(visit?.status || "scheduled");
  const [timeSpent, setTimeSpent] = useState(visit?.timeSpent || false);
  const [followUpType, setFollowUpType] = useState(visit?.followUpType || "");
  const [billingData, setBillingData] = useState<BillingFormData>({
    cptCodes: [],
    icd10Codes: [],
    modifiers: [],
    timeSpent: false,
    notes: "",
  });
  const [existingBillingId, setExistingBillingId] = useState<string | null>(
    null
  );

  // Load existing billing data if editing a visit
  useEffect(() => {
    if (visit?.id) {
      getBillingForVisit(visit.id).then((result) => {
        if (result.success && result.billing) {
          setBillingData({
            cptCodes: Array.isArray(result.billing.cptCodes)
              ? (result.billing.cptCodes as string[])
              : [],
            icd10Codes: Array.isArray(result.billing.icd10Codes)
              ? (result.billing.icd10Codes as string[])
              : [],
            modifiers:
              result.billing.modifiers &&
              Array.isArray(result.billing.modifiers)
                ? (result.billing.modifiers as string[])
                : [],
            timeSpent: result.billing.timeSpent,
            notes: result.billing.notes || "",
          });
          setExistingBillingId(result.billing.id);
        }
      });
    }
  }, [visit?.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validate required fields
    if (!visitType) {
      setError("Please select a visit type");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("patientId", patientId);
    formData.append("visitType", visitType);
    formData.append("timeSpent", timeSpent.toString());
    if (followUpType) {
      formData.append("followUpType", followUpType);
    }
    if (visit) {
      formData.append("status", status);
    }

    const result = visit
      ? await updateVisit(visit.id, formData)
      : await createVisit(formData);

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    // Save or update billing information
    const billingResult = existingBillingId
      ? await updateBilling(existingBillingId, billingData)
      : await createBilling({
          visitId: result.visit.id,
          patientId,
          ...billingData,
        });

    if (billingResult.success) {
      toast.success(
        visit ? "Visit updated successfully" : "Visit created successfully"
      );
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/patients/${patientId}`);
      }
    } else {
      toast.error("Visit saved but billing failed: " + billingResult.error);
      setError("Visit saved but billing failed: " + billingResult.error);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="visitDate">Visit Date & Time</Label>
          <Input
            id="visitDate"
            name="visitDate"
            type="datetime-local"
            defaultValue={
              visit?.visitDate
                ? new Date(visit.visitDate).toISOString().slice(0, 16)
                : ""
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visitType">Visit Type</Label>
          <Select value={visitType} onValueChange={setVisitType} required>
            <SelectTrigger>
              <SelectValue placeholder="Select visit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_person">In-Person</SelectItem>
              <SelectItem value="telemed">Telemedicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location (Optional)</Label>
        <Input
          id="location"
          name="location"
          placeholder="e.g., Facility Room 101, Patient Home, etc."
          defaultValue={visit?.location || ""}
        />
      </div>

      {visit && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no-show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Follow-Up</h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="followUpType">Follow-Up Type</Label>
            <Select
              value={followUpType}
              onValueChange={setFollowUpType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select follow-up type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="discharge">Discharge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {followUpType === "appointment" && (
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-Up Date</Label>
              <Input
                id="followUpDate"
                name="followUpDate"
                type="date"
                defaultValue={
                  visit?.followUpDate
                    ? new Date(visit.followUpDate).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="followUpNotes">Follow-Up Notes</Label>
          <Textarea
            id="followUpNotes"
            name="followUpNotes"
            placeholder="Notes about follow-up plan..."
            rows={3}
            defaultValue={visit?.followUpNotes || ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">Additional Notes</Label>
        <Textarea
          id="additionalNotes"
          name="additionalNotes"
          placeholder="Additional visit notes..."
          rows={4}
          defaultValue={visit?.additionalNotes || ""}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="timeSpent"
          checked={timeSpent}
          onCheckedChange={(checked) => setTimeSpent(checked as boolean)}
        />
        <Label
          htmlFor="timeSpent"
          className="text-sm leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          45+ minutes spent on this visit
        </Label>
      </div>

      {/* Billing Information */}
      <BillingForm initialData={billingData} onChange={setBillingData} />

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : visit ? "Update Visit" : "Create Visit"}
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
