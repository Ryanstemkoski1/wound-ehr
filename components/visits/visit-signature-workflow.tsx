"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignVisitDialog } from "@/components/visits/sign-visit-dialog";
import { PatientSignatureDialog } from "@/components/visits/patient-signature-dialog";
import { VisitStatusBadge } from "@/components/visits/visit-status-badge";
import { SignatureDisplay } from "@/components/signatures/signature-display";
import { submitVisit, updateVisitStatus } from "@/app/actions/signatures";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  UserCheck,
  Send,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type VisitStatus = "draft" | "ready_for_signature" | "signed" | "submitted";

type VisitSignatureWorkflowProps = {
  visitId: string;
  patientId: string;
  patientName: string;
  currentStatus: VisitStatus;
  requiresPatientSignature: boolean;
  providerSignatureId: string | null;
  patientSignatureId: string | null;
  userName: string;
  userCredentials: string;
};

export function VisitSignatureWorkflow({
  visitId,
  patientId: _patientId, // eslint-disable-line @typescript-eslint/no-unused-vars
  patientName,
  currentStatus,
  requiresPatientSignature,
  providerSignatureId,
  patientSignatureId,
  userName,
  userCredentials,
}: VisitSignatureWorkflowProps) {
  const router = useRouter();
  const [status, setStatus] = useState<VisitStatus>(currentStatus);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkReady = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await updateVisitStatus(visitId, "ready_for_signature");

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setStatus("ready_for_signature");
      setIsSubmitting(false);
      router.refresh();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await submitVisit(visitId);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setStatus("submitted");
      setIsSubmitting(false);
      router.refresh();
    }
  };

  // Determine what actions are available based on status and signatures
  const canMarkReady = status === "draft";
  const canSign = status === "ready_for_signature" && !providerSignatureId;
  const needsPatientSig =
    status === "signed" && requiresPatientSignature && !patientSignatureId;
  const canSubmit =
    status === "signed" &&
    providerSignatureId &&
    (!requiresPatientSignature || patientSignatureId);
  const isReadOnly = status === "submitted";

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <VisitStatusBadge status={status} size="lg" />
        {isReadOnly && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Read-Only
          </Badge>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Workflow Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {status === "draft" &&
            "Complete all assessments and mark ready when finished."}
          {status === "ready_for_signature" &&
            !providerSignatureId &&
            "Visit is ready for provider signature."}
          {status === "signed" &&
            needsPatientSig &&
            "Provider has signed. Patient signature is required before submission."}
          {status === "signed" &&
            canSubmit &&
            "All required signatures collected. Ready to submit to office."}
          {status === "submitted" &&
            "Visit has been submitted to the office and is now read-only."}
        </AlertDescription>
      </Alert>

      {/* Signature Displays */}
      {providerSignatureId && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-2 text-sm font-semibold">Provider Signature</h3>
          <SignatureDisplay signatureId={providerSignatureId} />
        </div>
      )}

      {patientSignatureId && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-2 text-sm font-semibold">Patient Signature</h3>
          <SignatureDisplay signatureId={patientSignatureId} />
        </div>
      )}

      {/* Action Buttons */}
      {!isReadOnly && (
        <div className="flex flex-wrap gap-2">
          {canMarkReady && (
            <Button
              onClick={handleMarkReady}
              disabled={isSubmitting}
              variant="default"
              className="gap-2"
            >
              <FileSignature className="h-4 w-4" />
              Mark Ready for Signature
            </Button>
          )}

          {canSign && (
            <Button
              onClick={() => setShowSignDialog(true)}
              disabled={isSubmitting}
              variant="default"
              className="gap-2"
            >
              <FileSignature className="h-4 w-4" />
              Sign Visit
            </Button>
          )}

          {needsPatientSig && (
            <Button
              onClick={() => setShowPatientDialog(true)}
              disabled={isSubmitting}
              variant="default"
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Get Patient Signature
            </Button>
          )}

          {canSubmit && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              Submit to Office
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <SignVisitDialog
        visitId={visitId}
        open={showSignDialog}
        onOpenChange={setShowSignDialog}
        userName={userName}
        userCredentials={userCredentials}
      />

      <PatientSignatureDialog
        visitId={visitId}
        patientName={patientName}
        open={showPatientDialog}
        onOpenChange={setShowPatientDialog}
      />
    </div>
  );
}

function Badge({
  children,
  variant: _variant, // eslint-disable-line @typescript-eslint/no-unused-vars
  className,
}: {
  children: React.ReactNode;
  variant: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
