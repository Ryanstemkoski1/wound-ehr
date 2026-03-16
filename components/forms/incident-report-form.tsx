"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/signatures/signature-pad";
import { createSignature } from "@/app/actions/signatures";
import { toast } from "sonner";
import {
  createIncidentReport,
  type IncidentReportData,
} from "@/app/actions/new-forms";

type Props = {
  facilityId: string;
  userId: string;
  employeeName?: string;
  employeeRole?: string;
  /** Pre-fill patient info when creating from a patient context */
  patientId?: string;
  patientName?: string;
  patientDob?: string;
  facilityAgency?: string;
};

export default function IncidentReportForm({
  facilityId,
  employeeName,
  employeeRole,
  patientId,
  patientName,
  patientDob,
  facilityAgency,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureId, setSignatureId] = useState<string | null>(null);

  const { register, handleSubmit, setValue } = useForm<IncidentReportData>({
    defaultValues: {
      facilityId,
      reportDate: new Date().toISOString().split("T")[0],
      reportTime: new Date().toTimeString().slice(0, 5), // HH:MM
      employeeName: employeeName || "",
      employeeRole: employeeRole || "",
      patientId: patientId || undefined,
      patientName: patientName || "",
      patientDob: patientDob || "",
      patientFacilityAgency: facilityAgency || "",
    },
  });

  const handleSign = async (signatureData: string, method: "draw" | "type") => {
    try {
      const result = await createSignature({
        signatureType: "consent",
        patientId: patientId || "",
        signerName: employeeName || "Employee",
        signerRole: employeeRole || "Staff",
        signatureData,
        signatureMethod: method,
      });
      if (result.data) {
        setSignatureId(result.data.id);
        setValue("signatureId", result.data.id);
        toast.success("Signature captured");
      } else {
        toast.error("Failed to save signature");
      }
    } catch {
      toast.error("Error saving signature");
    }
  };

  const onSubmit = async (data: IncidentReportData) => {
    if (!data.employeeName.trim()) {
      toast.error("Employee name is required");
      return;
    }
    if (!data.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createIncidentReport(data);
      if (result.success) {
        toast.success("Incident report saved");
        router.push("/dashboard");
        router.refresh();
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
      {/* Date & Location */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="reportDate">Date *</Label>
            <Input
              id="reportDate"
              type="date"
              {...register("reportDate", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="reportTime">Time</Label>
            <Input id="reportTime" type="time" {...register("reportTime")} />
          </div>
          <div>
            <Label htmlFor="incidentLocation">Location</Label>
            <Input
              id="incidentLocation"
              placeholder="e.g., Patient room, clinic..."
              {...register("incidentLocation")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="employeeName">Name *</Label>
            <Input
              id="employeeName"
              {...register("employeeName", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="employeeRole">Role / Title</Label>
            <Input id="employeeRole" {...register("employeeRole")} />
          </div>
          <div>
            <Label htmlFor="employeeContact">Phone / Email</Label>
            <Input id="employeeContact" {...register("employeeContact")} />
          </div>
        </CardContent>
      </Card>

      {/* Patient (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information (if applicable)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="patientName">Patient Name</Label>
            <Input id="patientName" {...register("patientName")} />
          </div>
          <div>
            <Label htmlFor="patientDob">Date of Birth</Label>
            <Input id="patientDob" type="date" {...register("patientDob")} />
          </div>
          <div>
            <Label htmlFor="patientFacilityAgency">Facility / Agency</Label>
            <Input
              id="patientFacilityAgency"
              {...register("patientFacilityAgency")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Description & Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Description of Incident *</Label>
            <Textarea
              id="description"
              rows={5}
              placeholder="Describe the incident in detail..."
              {...register("description", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="immediateActions">Immediate Actions Taken</Label>
            <Textarea
              id="immediateActions"
              rows={3}
              placeholder="Describe any immediate actions or responses..."
              {...register("immediateActions")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Signature */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Signature</CardTitle>
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
              signerName={employeeName || "Employee"}
              title="Employee Signature"
              description="Sign to confirm the accuracy of this incident report"
              certificationText="I certify that the information provided in this incident report is accurate and complete to the best of my knowledge."
            />
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Submit Incident Report"}
        </Button>
      </div>
    </form>
  );
}
