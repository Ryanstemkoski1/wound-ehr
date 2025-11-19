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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SignaturePad } from "@/components/signatures/signature-pad";
import { createPatientConsent } from "@/app/actions/signatures";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ConsentDialogProps = {
  patientId: string;
  patientName: string;
  open?: boolean;
};

const DEFAULT_CONSENT_TEXT = `
CONSENT FOR TREATMENT

I, the undersigned, hereby consent to wound care treatment and related medical services provided by the healthcare professionals at this facility.

I understand that:

1. **Purpose of Treatment**: The purpose of wound care is to promote healing, prevent infection, and manage pain. Treatment may include assessment, cleaning, debridement, dressing changes, and other therapeutic interventions.

2. **Procedures**: I consent to wound care procedures including but not limited to:
   - Wound assessment and measurement
   - Wound cleaning and debridement
   - Application of wound dressings and topical medications
   - Use of compression therapy, negative pressure wound therapy, or other advanced treatments
   - Photography of wounds for documentation purposes
   - Laboratory tests or cultures if needed

3. **Risks and Benefits**: I understand that wound care treatment carries certain risks, including but not limited to:
   - Temporary discomfort or pain during procedures
   - Bleeding or bruising
   - Infection (though treatment aims to prevent this)
   - Allergic reactions to materials or medications
   - Delayed healing

   I also understand the potential benefits include faster healing, reduced infection risk, decreased pain, and improved quality of life.

4. **Right to Refuse**: I understand I have the right to refuse any procedure or treatment. I can discuss my concerns with my healthcare provider at any time.

5. **Privacy**: I understand that wound photographs and medical records will be kept confidential in accordance with HIPAA regulations. These may be used for treatment planning, quality improvement, and education purposes.

6. **Alternative Treatments**: I have been informed about alternative treatment options and have had the opportunity to ask questions.

7. **Financial Responsibility**: I understand I am responsible for charges not covered by my insurance.

By signing below, I acknowledge that:
- I have read and understand this consent form (or it has been read to me)
- I have had the opportunity to ask questions and receive answers
- I freely and voluntarily consent to wound care treatment
- I authorize the healthcare team to proceed with necessary care

This consent remains in effect for all wound care treatment provided at this facility unless I revoke it in writing.
`.trim();

export function ConsentDialog({ patientId, patientName, open = true }: ConsentDialogProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgree = () => {
    if (agreed) {
      setShowSignature(true);
    }
  };

  const handleSaveSignature = async (signatureData: string, method: "draw" | "type") => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createPatientConsent({
        patientId,
        consentText: DEFAULT_CONSENT_TEXT,
        patientSignatureData: signatureData,
        patientSignerName: patientName,
        signatureMethod: method,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success - refresh to close dialog
      router.refresh();
    } catch (err) {
      setError("Failed to save consent");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowSignature(false);
  };

  if (showSignature) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sign Consent Form</DialogTitle>
            <DialogDescription>
              Please sign below to acknowledge your consent for treatment
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
            signerName={patientName}
            title="Patient Signature"
            description="Sign to acknowledge your consent for treatment"
            certificationText="By signing, I acknowledge that I have read and understand the consent form above, and I freely consent to wound care treatment."
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Consent for Treatment Required</DialogTitle>
          <DialogDescription>
            Please read and acknowledge this consent form before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <ScrollArea className="h-[40vh] w-full rounded-md border p-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {DEFAULT_CONSENT_TEXT}
            </div>
          </ScrollArea>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label
              htmlFor="agree"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I have read and understand the consent form above, and I agree to receive wound care
              treatment
            </Label>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> You must review and sign this consent form before
              accessing patient records or scheduling visits.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAgree}
              disabled={!agreed || isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Signature
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
