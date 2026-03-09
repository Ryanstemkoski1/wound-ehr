"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTranscriptionStatus } from "@/app/actions/ai-transcription";
import type { ProcessingStatus } from "@/lib/ai-config";

// =====================================================
// TYPES
// =====================================================

type UseTranscriptionPollingOptions = {
  /** Transcript ID to poll */
  transcriptId: string | null;
  /** Initial status (from server-rendered data) */
  initialStatus?: ProcessingStatus | null;
  /** Polling interval in ms (default: 3000) */
  intervalMs?: number;
  /** Stop polling after this many ms (default: 10 minutes) */
  timeoutMs?: number;
  /** Enable polling (set false to pause) */
  enabled?: boolean;
  /** Callback when status changes to "completed" */
  onCompleted?: () => void;
  /** Callback when status changes to "failed" */
  onFailed?: (error?: string) => void;
};

type UseTranscriptionPollingReturn = {
  status: ProcessingStatus | null;
  progress: string | null;
  error: string | null;
  isPolling: boolean;
  elapsedSeconds: number;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Stop polling */
  stop: () => void;
};

// =====================================================
// HOOK
// =====================================================

/**
 * Client-side hook that polls `getTranscriptionStatus` while a
 * transcript is in "pending" or "processing" state.
 *
 * Automatically stops polling when:
 * - Status reaches a terminal state (completed, failed, deleted)
 * - Timeout is exceeded
 * - Component unmounts
 */
export function useTranscriptionPolling({
  transcriptId,
  initialStatus = null,
  intervalMs = 3000,
  timeoutMs = 10 * 60 * 1000, // 10 minutes
  enabled = true,
  onCompleted,
  onFailed,
}: UseTranscriptionPollingOptions): UseTranscriptionPollingReturn {
  const [status, setStatus] = useState<ProcessingStatus | null>(initialStatus);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  // Track whether we've seen a non-terminal status so we only fire
  // callbacks on actual transitions, not on mount with stale status.
  const hasSeenActiveRef = useRef(
    !initialStatus ||
      initialStatus === "pending" ||
      initialStatus === "processing"
  );

  // Keep callback refs up to date
  onCompletedRef.current = onCompleted;
  onFailedRef.current = onFailed;

  const isTerminalStatus = useCallback(
    (s: ProcessingStatus | null): boolean => {
      return s === "completed" || s === "failed" || s === "deleted";
    },
    []
  );

  const shouldPoll = useCallback((): boolean => {
    if (!transcriptId || !enabled) return false;
    if (isTerminalStatus(status)) return false;
    return status === "pending" || status === "processing";
  }, [transcriptId, enabled, status, isTerminalStatus]);

  const fetchStatus = useCallback(async () => {
    if (!transcriptId) return;

    try {
      const result = await getTranscriptionStatus(transcriptId);

      if (result.error && !result.status) {
        setError(result.error);
        return;
      }

      const newStatus = result.status || null;
      setProgress(result.progress || null);
      setError(result.error || null);
      setStatus(newStatus);
    } catch {
      setError("Failed to check status");
    }
  }, [transcriptId]);

  // Fire callbacks only on status TRANSITIONS (not on initial mount
  // when the status is already terminal — that causes infinite reload).
  useEffect(() => {
    if (status === "pending" || status === "processing") {
      hasSeenActiveRef.current = true;
    }

    if (!hasSeenActiveRef.current) return; // skip — page loaded with terminal status

    if (status === "completed") {
      onCompletedRef.current?.();
    } else if (status === "failed") {
      onFailedRef.current?.();
    }
  }, [status]);

  // Start/stop polling based on state
  useEffect(() => {
    if (!shouldPoll()) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    // Reset start time when polling begins/restarts (e.g. after retry)
    startTimeRef.current = Date.now();

    // Immediate first check
    fetchStatus();

    intervalRef.current = setInterval(() => {
      // Check timeout
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedSeconds(Math.round(elapsed / 1000));

        if (elapsed > timeoutMs) {
          setError(
            "Processing is taking longer than expected. Please refresh the page."
          );
          setIsPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }
      }

      fetchStatus();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldPoll, fetchStatus, intervalMs, timeoutMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  return {
    status,
    progress,
    error,
    isPolling,
    elapsedSeconds,
    refresh,
    stop,
  };
}
