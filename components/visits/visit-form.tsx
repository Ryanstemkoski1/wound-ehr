"use client";

import { useState, useEffect } from "react";
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
  createVisit,
  updateVisit,
  autosaveVisitDraft,
} from "@/app/actions/visits";
import {
  createBilling,
  updateBilling,
  getBillingForVisit,
} from "@/app/actions/billing";
import BillingFormWithCredentials, {
  type BillingFormData,
} from "@/components/billing/billing-form-with-credentials";
import type { Credentials } from "@/lib/credentials";
import { toast } from "sonner";
import { useAutosave } from "@/lib/hooks/use-autosave";
import AutosaveIndicator from "@/components/ui/autosave-indicator";
import AutosaveRecoveryModal from "@/components/ui/autosave-recovery-modal";
import { hasRecentAutosave } from "@/lib/autosave";

type VisitFormProps = {
  patientId: string;
  userId: string; // Added for autosave
  userCredentials: Credentials | null;
  allowedCPTCodes: string[];
  restrictedCPTCodes: Array<{
    code: string;
    name: string;
    requiredCredentials: string[];
  }>;
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

type VisitFormData = {
  visitDate: string;
  visitType: string;
  location: string;
  followUpType: string;
  followUpDate: string;
  followUpNotes: string;
  additionalNotes: string;
  timeSpent: boolean;
  billingData: BillingFormData;
};

export default function VisitForm({
  patientId,
  userId,
  userCredentials,
  allowedCPTCodes,
  restrictedCPTCodes,
  visit,
  onSuccess,
}: VisitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [visitDate, setVisitDate] = useState(
    visit?.visitDate ? new Date(visit.visitDate).toISOString().slice(0, 16) : ""
  );
  const [visitType, setVisitType] = useState(visit?.visitType || "");
  const [location, setLocation] = useState(visit?.location || "");
  const [status, setStatus] = useState(visit?.status || "scheduled");
  const [timeSpent, setTimeSpent] = useState(visit?.timeSpent || false);
  const [followUpType, setFollowUpType] = useState(visit?.followUpType || "");
  const [followUpDate, setFollowUpDate] = useState(
    visit?.followUpDate
      ? new Date(visit.followUpDate).toISOString().split("T")[0]
      : ""
  );
  const [followUpNotes, setFollowUpNotes] = useState(
    visit?.followUpNotes || ""
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    visit?.additionalNotes || ""
  );
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

  // Autosave state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "saving" | "saved" | "error" | "idle"
  >("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Prepare form data for autosave
  const formData: VisitFormData = {
    visitDate,
    visitType,
    location,
    followUpType,
    followUpDate,
    followUpNotes,
    additionalNotes,
    timeSpent,
    billingData,
  };

  // Client-side autosave hook (localStorage)
  const { loadSavedData, clearSavedData } = useAutosave({
    formType: "visit",
    entityId: visit?.id || patientId,
    userId,
    data: formData,
    interval: 30000, // 30 seconds
    enabled: !visit || visit.status === "draft", // Only autosave for new visits or drafts
    onSave: () => {
      setAutosaveStatus("saved");
      setLastSavedTime("just now");
    },
  });

  // Check for autosaved data on mount
  useEffect(() => {
    const autosaveKey = `wound-ehr-autosave-visit-${visit?.id || patientId}-${userId}`;
    if (hasRecentAutosave(autosaveKey) && !visit) {
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
      setVisitDate(data.visitDate || "");
      setVisitType(data.visitType || "");
      setLocation(data.location || "");
      setFollowUpType(data.followUpType || "");
      setFollowUpDate(data.followUpDate || "");
      setFollowUpNotes(data.followUpNotes || "");
      setAdditionalNotes(data.additionalNotes || "");
      setTimeSpent(data.timeSpent || false);
      setBillingData(
        data.billingData || {
          cptCodes: [],
          icd10Codes: [],
          modifiers: [],
          timeSpent: false,
          notes: "",
        }
      );
      toast.success("Restored unsaved data");
    }
    setShowRecoveryModal(false);
  };

  // Discard autosaved data
  const handleDiscardAutosave = () => {
    clearSavedData();
    setShowRecoveryModal(false);
    toast.info("Starting fresh");
  };

  // Server-side autosave (every 2 minutes for drafts)
  useEffect(() => {
    if (!visit || visit.status !== "draft") return;

    const interval = setInterval(async () => {
      if (!visitDate || !visitType) return; // Skip if required fields are empty

      setAutosaveStatus("saving");
      const result = await autosaveVisitDraft(visit.id, {
        patientId,
        visitDate,
        visitType,
        location,
        followUpType,
        followUpDate,
        followUpNotes,
        timeSpent,
        additionalNotes,
      });

      if (result.success) {
        setAutosaveStatus("saved");
        setLastSavedTime("just now");
      } else {
        setAutosaveStatus("error");
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [
    visit,
    visitDate,
    visitType,
    location,
    followUpType,
    followUpDate,
    followUpNotes,
    timeSpent,
    additionalNotes,
    patientId,
  ]);

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
    if (!visitType || !visitDate) {
      setError("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    const submitFormData = new FormData();
    submitFormData.append("patientId", patientId);
    submitFormData.append("visitDate", visitDate);
    submitFormData.append("visitType", visitType);
    submitFormData.append("location", location);
    submitFormData.append("timeSpent", timeSpent.toString());
    if (followUpType) {
      submitFormData.append("followUpType", followUpType);
    }
    if (followUpDate) {
      submitFormData.append("followUpDate", followUpDate);
    }
    if (followUpNotes) {
      submitFormData.append("followUpNotes", followUpNotes);
    }
    if (additionalNotes) {
      submitFormData.append("additionalNotes", additionalNotes);
    }
    if (visit) {
      submitFormData.append("status", status);
    }

    const result = visit
      ? await updateVisit(visit.id, submitFormData)
      : await createVisit(submitFormData);

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
      // Clear autosaved data on successful submission
      clearSavedData();

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
    <>
      {/* Recovery Modal */}
      <AutosaveRecoveryModal
        isOpen={showRecoveryModal}
        onRestore={handleRestoreAutosave}
        onDiscard={handleDiscardAutosave}
        timestamp={loadSavedData().timestamp || ""}
        formType="visit"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Autosave Indicator */}
        {(!visit || visit.status === "draft") && (
          <div className="flex justify-end">
            <AutosaveIndicator
              status={autosaveStatus}
              lastSaved={lastSavedTime}
            />
          </div>
        )}

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
              type="datetime-local"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
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
            placeholder="e.g., Facility Room 101, Patient Home, etc."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
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
              <Select value={followUpType} onValueChange={setFollowUpType}>
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
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="followUpNotes">Follow-Up Notes</Label>
            <Textarea
              id="followUpNotes"
              placeholder="Notes about follow-up plan..."
              rows={3}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalNotes">Additional Notes</Label>
          <Textarea
            id="additionalNotes"
            placeholder="Additional visit notes..."
            rows={4}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
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
        <BillingFormWithCredentials
          visitId={visit?.id || ""}
          patientId={patientId}
          userCredentials={userCredentials}
          allowedCPTCodes={allowedCPTCodes}
          restrictedCPTCodes={restrictedCPTCodes}
          existingBilling={
            visit && existingBillingId
              ? {
                  id: existingBillingId,
                  cptCodes: billingData.cptCodes,
                  icd10Codes: billingData.icd10Codes,
                  modifiers: billingData.modifiers,
                  timeSpent: billingData.timeSpent,
                  notes: billingData.notes,
                }
              : null
          }
          onChange={setBillingData}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : visit
                ? "Update Visit"
                : "Create Visit"}
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
    </>
  );
}
