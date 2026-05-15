"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  RecordingConsentModal,
  RevokeRecordingConsentModal,
} from "./recording-consent-modal";
import type { RecordingConsent } from "@/lib/ai-config";

type RecordingConsentStatusProps = {
  patientId: string;
  patientName: string;
  consent: RecordingConsent | null;
  hasConsent: boolean;
};

export function RecordingConsentStatus({
  patientId,
  patientName,
  consent,
  hasConsent,
}: RecordingConsentStatusProps) {
  // Compute current time once for expiration checks
  // Use a stable reference to avoid React Compiler purity warnings
  const [now] = useState(() => Date.now());

  // Check if consent is expiring soon (within 30 days)
  const isExpiringSoon =
    consent?.expires_at &&
    new Date(consent.expires_at).getTime() - now < 30 * 24 * 60 * 60 * 1000 &&
    new Date(consent.expires_at).getTime() > now;

  const isExpired =
    consent?.expires_at && new Date(consent.expires_at).getTime() < now;

  const isRevoked = !!consent?.revoked_at;

  // No consent at all
  if (!consent || !hasConsent || isExpired || isRevoked) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-700">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MicOff className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-base text-zinc-700 dark:text-zinc-300">
                AI Recording Consent
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="border-zinc-400 text-zinc-600 dark:text-zinc-400"
            >
              {isRevoked ? "Revoked" : isExpired ? "Expired" : "Not Obtained"}
            </Badge>
          </div>
          <CardDescription>
            {isRevoked
              ? `Consent was revoked${consent.revoked_at ? ` on ${new Date(consent.revoked_at).toLocaleDateString()}` : ""}. AI recording is disabled.`
              : isExpired
                ? "Recording consent has expired and needs renewal for AI documentation."
                : "Recording consent is required to enable AI-powered clinical note generation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordingConsentModal
            patientId={patientId}
            patientName={patientName}
            trigger
          />
        </CardContent>
      </Card>
    );
  }

  // Has active consent
  const consentDate = consent.consented_at
    ? new Date(consent.consented_at).toLocaleDateString()
    : "Unknown";

  const expiresDate = consent.expires_at
    ? new Date(consent.expires_at).toLocaleDateString()
    : null;

  return (
    <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <CardTitle className="text-base text-teal-900 dark:text-teal-100">
              AI Recording Consent
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isExpiringSoon && (
              <Badge
                variant="outline"
                className="border-amber-500 text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Expiring Soon
              </Badge>
            )}
            <Badge
              variant="outline"
              className="border-teal-600 text-teal-700 dark:text-teal-300"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>
        <CardDescription className="text-teal-700 dark:text-teal-300">
          Patient has consented to audio recording for AI clinical documentation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-teal-700 dark:text-teal-300">
              <div className="flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5" />
                <span>Obtained: {consentDate}</span>
              </div>
              {expiresDate && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires: {expiresDate}</span>
                </div>
              )}
              <div className="text-xs text-teal-600 dark:text-teal-400">
                v{consent.consent_version}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpiringSoon && (
                <RecordingConsentModal
                  patientId={patientId}
                  patientName={patientName}
                  trigger
                />
              )}
              <RevokeRecordingConsentModal
                patientId={patientId}
                patientName={patientName}
              />
            </div>
          </div>

          {/* AI processing consent sub-status */}
          <div className="flex items-center justify-between border-t border-teal-200 pt-3 dark:border-teal-800">
            <div className="flex items-center gap-2 text-sm">
              {consent.ai_processing_consent_given ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-teal-700 dark:text-teal-300">
                    AI processing authorized
                    {consent.ai_vendor ? ` (${consent.ai_vendor})` : ""}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-700 dark:text-amber-300">
                    AI processing NOT authorized — audio uploads will be
                    rejected
                  </span>
                </>
              )}
            </div>
            <Badge
              variant="outline"
              className={
                consent.ai_processing_consent_given
                  ? "border-teal-600 text-teal-700 dark:text-teal-300"
                  : "border-amber-500 text-amber-700 dark:text-amber-300"
              }
            >
              {consent.ai_processing_consent_given
                ? "AI Consent Active"
                : "AI Consent Missing"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// INLINE BADGE (for patient lists, visit headers)
// =====================================================

type RecordingConsentBadgeProps = {
  hasConsent: boolean;
  isExpiringSoon?: boolean;
};

/**
 * Compact badge showing recording consent status.
 * Use in patient list rows, visit headers, etc.
 */
export function RecordingConsentBadge({
  hasConsent,
  isExpiringSoon = false,
}: RecordingConsentBadgeProps) {
  if (hasConsent && !isExpiringSoon) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300"
      >
        <Mic className="h-3 w-3" />
        AI Ready
      </Badge>
    );
  }

  if (hasConsent && isExpiringSoon) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="h-3 w-3" />
        Consent Expiring
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
    >
      <MicOff className="h-3 w-3" />
      No AI Consent
    </Badge>
  );
}
