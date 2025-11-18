"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWound, updateWound } from "@/app/actions/wounds";

type WoundFormProps = {
  patientId: string;
  wound?: {
    id: string;
    woundNumber: string;
    location: string;
    woundType: string;
    onsetDate: Date;
    status: string;
  };
  onSuccess?: () => void;
};

const WOUND_TYPES = [
  { value: "pressure_injury", label: "Pressure Injury" },
  { value: "diabetic", label: "Diabetic" },
  { value: "surgical", label: "Surgical" },
  { value: "venous", label: "Venous" },
  { value: "arterial", label: "Arterial" },
  { value: "traumatic", label: "Traumatic" },
  { value: "burn", label: "Burn" },
  { value: "other", label: "Other" },
];

const ANATOMICAL_LOCATIONS = [
  { value: "head", label: "Head" },
  { value: "neck", label: "Neck" },
  { value: "chest", label: "Chest" },
  { value: "abdomen", label: "Abdomen" },
  { value: "back", label: "Back" },
  { value: "sacrum", label: "Sacrum" },
  { value: "coccyx", label: "Coccyx" },
  { value: "left_shoulder", label: "Left Shoulder" },
  { value: "right_shoulder", label: "Right Shoulder" },
  { value: "left_arm", label: "Left Arm" },
  { value: "right_arm", label: "Right Arm" },
  { value: "left_elbow", label: "Left Elbow" },
  { value: "right_elbow", label: "Right Elbow" },
  { value: "left_forearm", label: "Left Forearm" },
  { value: "right_forearm", label: "Right Forearm" },
  { value: "left_hand", label: "Left Hand" },
  { value: "right_hand", label: "Right Hand" },
  { value: "left_hip", label: "Left Hip" },
  { value: "right_hip", label: "Right Hip" },
  { value: "left_thigh", label: "Left Thigh" },
  { value: "right_thigh", label: "Right Thigh" },
  { value: "left_knee", label: "Left Knee" },
  { value: "right_knee", label: "Right Knee" },
  { value: "left_leg", label: "Left Leg" },
  { value: "right_leg", label: "Right Leg" },
  { value: "left_ankle", label: "Left Ankle" },
  { value: "right_ankle", label: "Right Ankle" },
  { value: "left_foot", label: "Left Foot" },
  { value: "right_foot", label: "Right Foot" },
  { value: "left_heel", label: "Left Heel" },
  { value: "right_heel", label: "Right Heel" },
  { value: "other", label: "Other" },
];

export default function WoundForm({
  patientId,
  wound,
  onSuccess,
}: WoundFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("patientId", patientId);

    const result = wound
      ? await updateWound(wound.id, formData)
      : await createWound(formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      toast.error(wound ? "Failed to update wound" : "Failed to create wound", {
        description: result.error,
      });
    } else {
      toast.success(
        wound ? "Wound updated successfully" : "Wound created successfully",
        {
          description: wound
            ? `Wound ${wound.woundNumber} has been updated.`
            : "You can now schedule visits and assessments.",
        }
      );
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
        router.push(`/dashboard/patients/${patientId}`);
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

      <div className="space-y-2">
        <Label htmlFor="woundNumber">Wound Number</Label>
        <Input
          id="woundNumber"
          name="woundNumber"
          placeholder="e.g., Wound 1, Wound 2"
          defaultValue={wound?.woundNumber}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Select name="location" defaultValue={wound?.location} required>
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {ANATOMICAL_LOCATIONS.map((location) => (
              <SelectItem key={location.value} value={location.value}>
                {location.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="woundType">Wound Type</Label>
        <Select name="woundType" defaultValue={wound?.woundType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select wound type" />
          </SelectTrigger>
          <SelectContent>
            {WOUND_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onsetDate">Onset Date</Label>
        <Input
          id="onsetDate"
          name="onsetDate"
          type="date"
          defaultValue={
            wound?.onsetDate
              ? new Date(wound.onsetDate).toISOString().split("T")[0]
              : ""
          }
          required
        />
      </div>

      {wound && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={wound.status}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="healed">Healed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : wound ? "Update Wound" : "Create Wound"}
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
