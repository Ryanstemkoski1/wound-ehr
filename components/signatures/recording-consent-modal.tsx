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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignaturePad } from "@/components/signatures/signature-pad";
import {
  saveRecordingConsent,
  revokeRecordingConsent,
} from "@/app/actions/ai-transcription";
import { createSignature } from "@/app/actions/signatures";
import {
  RECORDING_CONSENT_TEXT,
  RECORDING_CONSENT_VERSION,
  AI_PROCESSING_CONSENT_TEXT,
  AI_PROCESSING_CONSENT_VERSION,
  AI_PROCESSING_CONSENT_VENDOR,
} from "@/lib/ai-config";
import {
  AlertCircle,
  Mic,
  ShieldCheck,
  Clock,
  Trash2,
  XCircle,
} from "lucide-react";

type RecordingConsentModalProps = {
  patientId: string;
  patientName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If true, the modal opens via a trigger button instead of being always open */
  trigger?: boolean;
};

export function RecordingConsentModal({
  patientId,
  patientName,
  open: controlledOpen,
  onOpenChange,
  trigger = false,
}: RecordingConsentModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [aiAgreed, setAiAgreed] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
      // First, create a signature record (reuse existing signature system)
      const sigResult = await createSignature({
        signatureType: "consent",
        patientId,
        signerName: patientName,
        signerRole: "Patient",
        signatureData,
        signatureMethod: method,
      });

      if (sigResult.error || !sigResult.data) {
        setError(sigResult.error || "Failed to create signature");
        setIsSubmitting(false);
        return;
      }

      // Save the recording consent with the signature ID
      // 365 days expiration (annual renewal). aiAgreed gates the
      // separate third-party AI-processing consent (HIPAA / BAA).
      const result = await saveRecordingConsent(
        patientId,
        sigResult.data.id,
        365,
        aiAgreed
      );

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsOpen(false);
      setShowSignature(false);
      setAgreed(false);
      setAiAgreed(false);
      router.refresh();
    } catch {
      setError("Failed to save recording consent");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowSignature(false);
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowSignature(false);
    setAgreed(false);
    setAiAgreed(false);
    setError(null);
  };

  const signatureView = (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="text-primary h-5 w-5" />
          Sign Recording Consent
        </DialogTitle>
        <DialogDescription>
          {patientName} — Please sign below to consent to audio recording during
          visits
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
        description="Sign to consent to audio recording during wound care visits"
        certificationText="By signing, I acknowledge that I have read the recording consent form and agree to have my wound care visits audio recorded for clinical documentation purposes."
      />
    </DialogContent>
  );

  const consentFormView = (
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Mic className="text-primary h-5 w-5" />
          Audio Recording Consent
        </DialogTitle>
        <DialogDescription>
          Consent required before AI-powered clinical note generation can be
          used for {patientName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Key points summary */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border-primary/30 bg-primary/5/50 dark:border-primary/30 dark:bg-primary/5/20 flex items-start gap-2 rounded-lg border p-3">
            <Mic className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-foreground text-foreground text-xs font-semibold">
                What
              </p>
              <p className="text-primary text-primary text-xs">
                Visits will be audio recorded and transcribed using
                HIPAA-compliant AI
              </p>
            </div>
          </div>
          <div className="border-primary/30 bg-primary/5/50 dark:border-primary/30 dark:bg-primary/5/20 flex items-start gap-2 rounded-lg border p-3">
            <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-foreground text-foreground text-xs font-semibold">
                Security
              </p>
              <p className="text-primary text-primary text-xs">
                Recordings stored securely, only accessible to care team
              </p>
            </div>
          </div>
          <div className="border-primary/30 bg-primary/5/50 dark:border-primary/30 dark:bg-primary/5/20 flex items-start gap-2 rounded-lg border p-3">
            <Clock className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-foreground text-foreground text-xs font-semibold">
                Retention
              </p>
              <p className="text-primary text-primary text-xs">
                Audio deleted after 90 days. Transcripts kept as medical record.
              </p>
            </div>
          </div>
        </div>

        {/* Full consent text */}
        <ScrollArea className="h-[30vh] w-full rounded-md border p-4">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {RECORDING_CONSENT_TEXT}
          </div>
          <div className="mt-4 border-t pt-3">
            <p className="text-muted-foreground text-xs">
              Recording Consent Version: {RECORDING_CONSENT_VERSION}
            </p>
          </div>
          <div className="mt-6 border-t pt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {AI_PROCESSING_CONSENT_TEXT}
          </div>
          <div className="mt-4 border-t pt-3">
            <p className="text-muted-foreground text-xs">
              AI Processing Consent Version: {AI_PROCESSING_CONSENT_VERSION} ·
              Vendor: {AI_PROCESSING_CONSENT_VENDOR}
            </p>
          </div>
        </ScrollArea>

        {/* Agreement checkboxes */}
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/20">
            <p className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <strong>Voluntary:</strong> Both consents below are optional.
              Declining will not affect the quality of care received. Without
              recording consent, clinicians will use traditional manual
              documentation. Recording without AI-processing consent is allowed
              but the audio will not be uploaded for AI transcription.
            </p>

            <div className="bg-card flex items-start space-x-3 rounded-md border-2 border-amber-300 p-4 dark:border-amber-700">
              <Checkbox
                id="recording-agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-1 h-5 w-5 border-2"
              />
              <Label
                htmlFor="recording-agree"
                className="text-foreground cursor-pointer text-base leading-tight font-semibold"
              >
                I have read and understand the recording consent form, and I
                agree to have my wound care visits audio recorded
              </Label>
            </div>

            <div className="bg-card mt-3 flex items-start space-x-3 rounded-md border-2 border-amber-300 p-4 dark:border-amber-700">
              <Checkbox
                id="ai-processing-agree"
                checked={aiAgreed}
                onCheckedChange={(checked) => setAiAgreed(checked === true)}
                className="mt-1 h-5 w-5 border-2"
                disabled={!agreed}
              />
              <Label
                htmlFor="ai-processing-agree"
                className="text-foreground cursor-pointer text-base leading-tight font-semibold"
              >
                I additionally consent to having my recordings and transcripts
                processed by a third-party AI vendor (
                {AI_PROCESSING_CONSENT_VENDOR}) under a Business Associate
                Agreement, in order to generate draft clinical notes that my
                care team will review.
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Decline
            </Button>
            <Button
              onClick={handleAgree}
              disabled={!agreed || isSubmitting}
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Continue to Signature
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Mic className="h-4 w-4" />
            Obtain Recording Consent
          </Button>
        </DialogTrigger>
        {showSignature ? signatureView : consentFormView}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showSignature ? signatureView : consentFormView}
    </Dialog>
  );
}

// =====================================================
// REVOKE CONSENT MODAL
// =====================================================

type RevokeConsentModalProps = {
  patientId: string;
  patientName: string;
};

export function RevokeRecordingConsentModal({
  patientId,
  patientName,
}: RevokeConsentModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for revocation");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await revokeRecordingConsent(patientId, reason);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Failed to revoke consent");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
        >
          <XCircle className="h-3.5 w-3.5" />
          Revoke
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Revoke Recording Consent
          </DialogTitle>
          <DialogDescription>
            Revoke audio recording consent for {patientName}. Future visits will
            use manual documentation only.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Existing recordings and transcripts will not be affected. Only
              future visits will require manual documentation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Reason for revocation</Label>
            <textarea
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Patient requested to opt out of audio recording..."
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? "Revoking..." : "Revoke Consent"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
