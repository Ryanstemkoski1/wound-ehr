"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SignaturePad } from "@/components/signatures/signature-pad";
import { createSignature } from "@/app/actions/signatures";
import { createPhotoVideoConsent } from "@/app/actions/new-forms";
import { toast } from "sonner";
import { Camera, ShieldCheck } from "lucide-react";

const CONSENT_TEXT = `PATIENT PHOTO & VIDEO CONSENT FOR TRAINING & EDUCATIONAL PURPOSES

I hereby authorize May MD, Inc. DBA The Wound Well Company & Tubes On Demand and its providers, clinicians, employees, and authorized representatives to take photographs, video recordings, and/or digital images of me and/or my medical condition during the course of my care.

These images and recordings may be used for the following purposes:
• Clinical documentation
• Internal staff training and education
• Quality assurance and improvement
• Provider education and case review

I understand that these images and recordings will be used solely for professional, educational, and training purposes and will not be used for marketing, advertising, or public media without my separate written authorization.

Privacy & Confidentiality:
• All images and recordings will be handled in accordance with HIPAA privacy regulations
• Reasonable efforts will be made to protect my identity
• Images may be de-identified when appropriate
• These materials may be stored securely in electronic systems used by The Wound Well Company
• My decision to grant or deny this consent will not affect my medical care
• I may revoke this consent at any time by submitting a written request`;

type Props = {
  patientId: string;
  patientName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
};

export function PhotoVideoConsentModal({
  patientId,
  patientName,
  open: controlledOpen,
  onOpenChange,
  trigger = false,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [representativeName, setRepresentativeName] = useState(patientName);

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const handleAgree = () => {
    if (agreed) {
      setShowSignature(true);
    }
  };

  const handleSaveSignature = async (
    signatureData: string,
    method: "draw" | "type"
  ) => {
    setIsSubmitting(true);

    try {
      // Create signature record
      const sigResult = await createSignature({
        signatureType: "consent",
        patientId,
        signerName: representativeName || patientName,
        signerRole:
          representativeName !== patientName ? "Representative" : "Patient",
        signatureData,
        signatureMethod: method,
      });

      if (sigResult.error || !sigResult.data) {
        toast.error("Failed to save signature");
        setIsSubmitting(false);
        return;
      }

      // Create consent record
      const consentResult = await createPhotoVideoConsent({
        patientId,
        representativeName: representativeName || patientName,
        patientSignatureId: sigResult.data.id,
      });

      if (consentResult.success) {
        toast.success("Photo & video consent saved");
        setIsOpen(false);
        resetState();
        router.refresh();
      } else {
        toast.error(consentResult.error || "Failed to save consent");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setAgreed(false);
    setShowSignature(false);
    setRepresentativeName(patientName);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  };

  const content = (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photo & Video Consent
        </DialogTitle>
        <DialogDescription>
          Consent for clinical photography and video recording
        </DialogDescription>
      </DialogHeader>

      {!showSignature ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-900">
            <p className="text-sm font-medium">Patient: {patientName}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="representativeName" className="text-sm">
              Representative / Person Signing (if different from patient)
            </Label>
            <Input
              id="representativeName"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Patient name or legal representative"
            />
          </div>

          <ScrollArea className="h-72 rounded-md border p-4">
            <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {CONSENT_TEXT}
            </pre>
          </ScrollArea>

          <div className="flex items-start gap-2">
            <Checkbox
              id="photoAgree"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
            />
            <Label htmlFor="photoAgree" className="text-sm leading-snug">
              I, <strong>{representativeName || patientName}</strong> (or legal
              representative), have read and understand the above authorization
              and voluntarily consent to the use of my photographs, video
              recordings, and/or digital images for the purposes stated.
            </Label>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleAgree} disabled={!agreed}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Sign Consent
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={() => setShowSignature(false)}
            signerName={representativeName || patientName}
            title="Authorization Signature"
            description="Sign to authorize photo and video consent"
            certificationText="I authorize the use of my photographs and recordings for the purposes stated above."
          />
          {isSubmitting && (
            <p className="text-center text-sm text-zinc-500">
              Saving consent...
            </p>
          )}
        </div>
      )}
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Camera className="mr-2 h-4 w-4" />
            Photo & Video Consent
          </Button>
        </DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {content}
    </Dialog>
  );
}
