"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MicOff,
  CheckCircle,
  Loader2,
  AlertTriangle,
  BrainCircuit,
  FileCheck,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { RecordingConsentModal } from "@/components/signatures/recording-consent-modal";
import { AudioRecorder } from "@/components/visits/audio-recorder";
import { useTranscriptionPolling } from "@/lib/hooks/use-transcription-polling";
import { retryFailedTranscription } from "@/app/actions/ai-transcription";

type TranscriptStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "deleted"
  | null;

type VisitAIStatusCardProps = {
  visitId: string;
  patientId: string;
  patientName: string;
  hasRecordingConsent: boolean;
  hasAiProcessingConsent: boolean;
  hasTranscript: boolean;
  transcriptId: string | null;
  transcriptStatus: TranscriptStatus;
  aiNoteApproved: boolean;
  visitStatus: string;
};

const statusConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  pending: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-amber-500" />,
    label: "Awaiting Processing",
    color:
      "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20",
  },
  processing: {
    icon: <BrainCircuit className="h-4 w-4 animate-pulse text-blue-500" />,
    label: "AI Processing...",
    color:
      "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20",
  },
  completed: {
    icon: <FileCheck className="h-4 w-4 text-teal-600" />,
    label: "AI Note Ready",
    color:
      "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/20",
  },
  failed: {
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    label: "Processing Failed",
    color: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20",
  },
  deleted: {
    icon: <MicOff className="h-4 w-4 text-zinc-400" />,
    label: "Audio Deleted",
    color:
      "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50",
  },
};

export function VisitAIStatusCard({
  visitId,
  patientId,
  patientName,
  hasRecordingConsent,
  hasAiProcessingConsent,
  hasTranscript,
  transcriptId,
  transcriptStatus,
  aiNoteApproved,
  visitStatus,
}: VisitAIStatusCardProps) {
  const router = useRouter();
  const isVisitEditable =
    visitStatus !== "signed" && visitStatus !== "submitted";

  const [isRetrying, setIsRetrying] = useState(false);

  // Poll for status updates while processing
  const polling = useTranscriptionPolling({
    transcriptId,
    initialStatus: transcriptStatus,
    enabled:
      transcriptStatus === "pending" || transcriptStatus === "processing",
    onCompleted: () => {
      // Refresh server data without full page reload
      router.refresh();
    },
  });

  // Use polled status if available, fall back to server-rendered
  const currentStatus = polling.status || transcriptStatus;

  const handleRetry = useCallback(async () => {
    if (!transcriptId) return;
    setIsRetrying(true);
    try {
      await retryFailedTranscription(transcriptId);
      router.refresh();
    } catch {
      setIsRetrying(false);
    }
  }, [transcriptId, router]);

  // No recording consent — prompt to obtain it
  if (!hasRecordingConsent) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MicOff className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-base">AI Documentation</CardTitle>
          </div>
          <CardDescription>
            Recording consent required for AI-powered clinical notes
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

  // Has consent but no transcript yet — show audio recorder
  if (!hasTranscript || !transcriptStatus) {
    if (isVisitEditable) {
      return (
        <AudioRecorder
          visitId={visitId}
          patientId={patientId}
          hasAiProcessingConsent={hasAiProcessingConsent}
        />
      );
    }

    return (
      <Card className="border-zinc-200 dark:border-zinc-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MicOff className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-base">AI Documentation</CardTitle>
          </div>
          <CardDescription>
            No AI recording was made for this visit.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Has transcript — show status
  const config =
    statusConfig[currentStatus || "pending"] || statusConfig.pending;

  return (
    <Card className={config.color}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">AI Documentation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {config.icon}
              {config.label}
            </Badge>
            {aiNoteApproved && (
              <Badge
                variant="outline"
                className="gap-1 border-green-400 text-green-700 dark:text-green-300"
              >
                <CheckCircle className="h-3 w-3" />
                Approved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentStatus === "completed" && !aiNoteApproved && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              AI-generated clinical note is ready below. Review, edit if needed,
              and approve before signing the visit.
            </p>
          </div>
        )}
        {currentStatus === "completed" && aiNoteApproved && (
          <p className="text-sm text-green-700 dark:text-green-300">
            Clinical note has been reviewed and approved by clinician.
          </p>
        )}
        {currentStatus === "processing" && (
          <div className="space-y-2">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              OpenAI is transcribing and generating the clinical note. This
              typically takes 30-60 seconds.
            </p>
            {polling.elapsedSeconds > 0 && (
              <p className="text-xs text-blue-500">
                {polling.progress ||
                  `Processing for ${polling.elapsedSeconds}s...`}
              </p>
            )}
          </div>
        )}
        {currentStatus === "failed" && (
          <div className="space-y-2">
            <p className="text-sm text-red-700 dark:text-red-300">
              AI processing failed.{" "}
              {polling.error || "You can retry or use manual documentation."}
            </p>
            {isVisitEditable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="gap-2"
              >
                {isRetrying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {isRetrying ? "Retrying..." : "Retry Processing"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
