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
import { SignaturePad } from "@/components/signatures/signature-pad";
import { signVisit } from "@/app/actions/signatures";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, FileCheck } from "lucide-react";

type SignVisitDialogProps = {
  visitId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userCredentials: string;
};

export function SignVisitDialog({
  visitId,
  open,
  onOpenChange,
  userName,
  userCredentials,
}: SignVisitDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);

  // Reset attestation each time the dialog re-opens so the clinician
  // must re-affirm rather than ride a stale checkbox state.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAttested(false);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSaveSignature = async (
    signatureData: string,
    method: "draw" | "type"
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signVisit(visitId, signatureData, userName, method);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Failed to sign visit");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileCheck className="text-primary h-5 w-5" />
            <DialogTitle>Sign Visit</DialogTitle>
          </div>
          <DialogDescription>
            Sign this visit to certify that all documentation is accurate and
            complete
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="border-primary/20 bg-primary/5 mb-4 rounded-lg border p-4">
          <div className="space-y-2 text-sm">
            <p className="text-foreground font-medium">
              Provider Certification
            </p>
            <p className="text-muted-foreground">
              Signing as:{" "}
              <strong className="text-foreground">{userName}</strong> (
              {userCredentials})
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <Checkbox
            id="attestation"
            checked={attested}
            onCheckedChange={(checked) => setAttested(checked === true)}
            disabled={isSubmitting}
            className="mt-0.5"
          />
          <Label
            htmlFor="attestation"
            className="text-sm leading-snug font-normal text-amber-900 dark:text-amber-100"
          >
            I attest that the documentation is true, accurate, and complete;
            that I personally performed (or directly supervised) the services
            described; and that the record reflects the care delivered to this
            patient.
          </Label>
        </div>

        {attested ? (
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={handleCancel}
            signerName={userName}
            title="Provider Signature"
            description="Sign to certify this visit documentation"
            certificationText="By signing, I certify that I have reviewed all assessments and documentation for this visit, and that the information provided is accurate, complete, and represents the care delivered."
          />
        ) : (
          <p className="border-border text-muted-foreground dark:border-border dark:text-muted-foreground/60 rounded-md border border-dashed p-6 text-center text-sm">
            Check the attestation above to enable the signature pad.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
