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

  const handleSaveSignature = async (signatureData: string, method: "draw" | "type") => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signVisit(
        visitId,
        signatureData,
        userName,
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
    } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      setError("Failed to sign visit");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <DialogTitle>Sign Visit</DialogTitle>
          </div>
          <DialogDescription>
            Sign this visit to certify that all documentation is accurate and complete
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Provider Certification
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Signing as: <strong>{userName}</strong> ({userCredentials})
            </p>
          </div>
        </div>

        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={handleCancel}
          signerName={userName}
          title="Provider Signature"
          description="Sign to certify this visit documentation"
          certificationText="By signing, I certify that I have reviewed all assessments and documentation for this visit, and that the information provided is accurate, complete, and represents the care delivered."
        />
      </DialogContent>
    </Dialog>
  );
}
