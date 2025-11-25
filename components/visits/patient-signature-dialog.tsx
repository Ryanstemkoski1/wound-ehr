"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/signatures/signature-pad";
import { addPatientSignature } from "@/app/actions/signatures";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserCheck } from "lucide-react";

type PatientSignatureDialogProps = {
  visitId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PatientSignatureDialog({
  visitId,
  patientName,
  open,
  onOpenChange,
}: PatientSignatureDialogProps) {
  const router = useRouter();
  const [signerName, setSignerName] = useState(patientName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleContinue = () => {
    if (signerName.trim().length > 0) {
      setShowSignaturePad(true);
    }
  };

  const handleSaveSignature = async (
    signatureData: string,
    method: "draw" | "type"
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addPatientSignature(
        visitId,
        signatureData,
        signerName,
        method
      );

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success
      onOpenChange(false);
      router.refresh();
    } catch (_err) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      setError("Failed to save patient signature");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      if (showSignaturePad) {
        setShowSignaturePad(false);
      } else {
        onOpenChange(false);
      }
    }
  };

  if (showSignaturePad) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="text-primary h-5 w-5" />
              <DialogTitle>Patient Signature</DialogTitle>
            </div>
            <DialogDescription>
              Patient or authorized representative signature acknowledging visit
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={handleCancel}
            signerName={signerName}
            title="Patient Signature"
            description="Patient or authorized representative should sign"
            certificationText="By signing, the patient (or authorized representative) acknowledges that wound care services were provided during this visit."
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="text-primary h-5 w-5" />
            <DialogTitle>Patient Signature Required</DialogTitle>
          </div>
          <DialogDescription>
            Please confirm the name of the person signing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Patient signature is required for visits
              documented by RN or LVN credentials. The patient or their
              authorized representative must sign to acknowledge the care
              provided.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signer-name">Name of Person Signing *</Label>
            <Input
              id="signer-name"
              type="text"
              placeholder="Patient or representative name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-zinc-500">
              Enter the patient&apos;s name or the name of their authorized
              representative
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-md border border-zinc-300 px-4 py-2 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={signerName.trim().length === 0 || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Signature
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
