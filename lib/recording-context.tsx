"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import type { AudioRecorderReturn } from "@/lib/hooks/use-audio-recorder";
import { getExtensionForMime } from "@/lib/hooks/use-audio-recorder";
import { processTranscription } from "@/app/actions/ai-transcription";

// =====================================================
// TYPES
// =====================================================

export type UploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

type RecordingSession = {
  visitId: string;
  patientId: string;
};

type RecordingContextValue = {
  /** Whether a recording session is active (recording, paused, completed, or uploading) */
  isActive: boolean;
  /** The visit/patient this recording is for */
  session: RecordingSession | null;
  /** The underlying audio recorder (MediaRecorder state, controls, level, etc.) */
  recorder: AudioRecorderReturn;
  /** Upload/processing state */
  uploadState: UploadState;
  /** Upload progress 0–100 */
  uploadProgress: number;
  /** Upload error message */
  uploadError: string | null;
  /** Start a recording session for a visit */
  startSession: (visitId: string, patientId: string) => void;
  /** End the current session (discards recording) */
  endSession: () => void;
  /** Upload and process the recorded audio */
  uploadAndProcess: (
    onProcessingStarted?: (transcriptId: string) => void
  ) => Promise<void>;
  /** Reset upload state for retry */
  resetUpload: () => void;
};

const RecordingContext = createContext<RecordingContextValue | null>(null);

// =====================================================
// HOOK
// =====================================================

export function useRecordingContext(): RecordingContextValue {
  const ctx = useContext(RecordingContext);
  if (!ctx) {
    throw new Error(
      "useRecordingContext must be used within a RecordingProvider"
    );
  }
  return ctx;
}

// =====================================================
// PROVIDER
// =====================================================

export function RecordingProvider({ children }: { children: ReactNode }) {
  const recorder = useAudioRecorder();

  const [session, setSession] = useState<RecordingSession | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Whether the recording context is "active" (anything other than idle+idle)
  const isActive =
    session !== null && (recorder.state !== "idle" || uploadState !== "idle");

  // ---------------------------------------------------
  // beforeunload guard
  // ---------------------------------------------------
  useEffect(() => {
    if (!isActive) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue =
        "You have an active recording. Leaving will lose the audio.";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isActive]);

  // ---------------------------------------------------
  // Progress simulation helpers (same as original AudioRecorder)
  // ---------------------------------------------------
  const startProgressSimulation = useCallback(
    (from: number, to: number, durationMs: number) => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      const steps = Math.max(1, Math.floor(durationMs / 300));
      const increment = (to - from) / steps;
      let current = from;
      setUploadProgress(from);
      progressIntervalRef.current = setInterval(() => {
        current += increment;
        if (current >= to) {
          current = to;
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
        setUploadProgress(Math.round(current));
      }, 300);
    },
    []
  );

  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => stopProgressSimulation();
  }, [stopProgressSimulation]);

  // ---------------------------------------------------
  // Session management
  // ---------------------------------------------------
  const startSession = useCallback(
    (visitId: string, patientId: string) => {
      // If there's already an active session for a different visit, discard it
      if (session && session.visitId !== visitId) {
        recorder.discardRecording();
        setUploadState("idle");
        setUploadProgress(0);
        setUploadError(null);
      }
      setSession({ visitId, patientId });
    },
    [session, recorder]
  );

  const endSession = useCallback(() => {
    recorder.discardRecording();
    setSession(null);
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError(null);
  }, [recorder]);

  // ---------------------------------------------------
  // Upload & process (moved from AudioRecorder component)
  // ---------------------------------------------------
  const uploadAndProcess = useCallback(
    async (onProcessingStarted?: (transcriptId: string) => void) => {
      if (!recorder.audioBlob || !session) return;

      setUploadState("uploading");
      setUploadProgress(10);
      setUploadError(null);

      try {
        // Build file from blob
        const ext = getExtensionForMime(recorder.audioBlob.type);
        const filename = `visit-recording-${Date.now()}.${ext}`;
        const file = new File([recorder.audioBlob], filename, {
          type: recorder.audioBlob.type,
        });

        console.log("[RecordingContext] File ready:", {
          name: filename,
          type: recorder.audioBlob.type,
          size: recorder.audioBlob.size,
        });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("visitId", session.visitId);
        formData.append("patientId", session.patientId);

        // Animate progress 5→55% during upload
        startProgressSimulation(5, 55, 15000);

        console.log("[RecordingContext] Calling /api/upload-audio...");
        const response = await fetch("/api/upload-audio", {
          method: "POST",
          body: formData,
        });

        stopProgressSimulation();

        const uploadResult = await response.json();
        console.log(
          "[RecordingContext] Upload response:",
          response.status,
          uploadResult
        );

        if (!response.ok || uploadResult.error || !uploadResult.transcript) {
          setUploadState("error");
          setUploadError(
            uploadResult.error || `Upload failed (${response.status})`
          );
          return;
        }

        setUploadProgress(60);

        // Start AI processing
        setUploadState("processing");
        setUploadProgress(65);

        const transcriptId = uploadResult.transcript.id;
        onProcessingStarted?.(transcriptId);

        // Animate progress 65→95% during AI processing (~60s)
        startProgressSimulation(65, 95, 60000);

        const processResult = await processTranscription(transcriptId);

        stopProgressSimulation();
        setUploadProgress(100);

        if (processResult.error) {
          // Processing failed but upload succeeded
          setUploadState("done");
          setUploadError(
            `Upload successful but AI processing failed: ${processResult.error}. You can retry from the visit page.`
          );
        } else {
          setUploadState("done");
        }
      } catch (err) {
        stopProgressSimulation();
        setUploadState("error");
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during upload.";
        console.error("[RecordingContext] Error:", message);
        setUploadError(message);
      }
    },
    [
      recorder.audioBlob,
      session,
      startProgressSimulation,
      stopProgressSimulation,
    ]
  );

  const resetUpload = useCallback(() => {
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  // ---------------------------------------------------
  // Context value
  // ---------------------------------------------------
  const value: RecordingContextValue = {
    isActive,
    session,
    recorder,
    uploadState,
    uploadProgress,
    uploadError,
    startSession,
    endSession,
    uploadAndProcess,
    resetUpload,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}
