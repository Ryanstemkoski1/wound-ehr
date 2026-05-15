"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRecordingContext } from "@/lib/recording-context";
import { formatDuration, formatFileSize } from "@/lib/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  Pause,
  Play,
  Square,
  ArrowRight,
  Loader2,
  BrainCircuit,
  X,
} from "lucide-react";

/**
 * A fixed-position bar at the top of the dashboard that appears when
 * a recording is active but the user has navigated away from the visit page.
 * This ensures the user always knows recording is in progress and can
 * quickly return to the visit, stop, or see upload progress.
 */
export function PersistentRecorderBar() {
  const {
    isActive,
    session,
    recorder,
    uploadState,
    uploadProgress,
    uploadError,
    endSession,
  } = useRecordingContext();

  const pathname = usePathname();

  // Don't show if no active session
  if (!isActive || !session) return null;

  // Don't show if user is on the visit page where recording is happening
  const visitPath = `/dashboard/patients/${session.patientId}/visits/${session.visitId}`;
  if (pathname === visitPath) return null;

  const isRecording =
    recorder.state === "recording" || recorder.state === "paused";
  const isCompleted = recorder.state === "completed" && uploadState === "idle";
  const isUploading =
    uploadState === "uploading" || uploadState === "processing";
  const isDone = uploadState === "done";

  return (
    <div className="sticky top-0 z-50 border-b border-teal-300 bg-teal-50 px-4 py-2 shadow-sm dark:border-teal-800 dark:bg-teal-950/80">
      <div className="flex items-center justify-between gap-4">
        {/* Left: status info */}
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          {recorder.state === "recording" && (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
          )}
          {recorder.state === "paused" && (
            <Pause className="h-4 w-4 shrink-0 text-amber-600" />
          )}
          {isCompleted && <Mic className="h-4 w-4 shrink-0 text-teal-600" />}
          {isUploading &&
            (uploadState === "uploading" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
            ) : (
              <BrainCircuit className="h-4 w-4 shrink-0 animate-pulse text-blue-600" />
            ))}

          <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
            {isRecording && "Recording in progress"}
            {isCompleted && "Recording ready to upload"}
            {uploadState === "uploading" && "Uploading audio..."}
            {uploadState === "processing" && "AI processing..."}
            {isDone && "AI note generated"}
            {uploadState === "error" && "Upload failed"}
          </span>

          {/* Duration / file size badges */}
          {(isRecording || isCompleted) && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-teal-300 font-mono text-xs tabular-nums dark:border-teal-700"
              >
                {formatDuration(recorder.duration)}
              </Badge>
              {recorder.fileSize > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(recorder.fileSize)}
                </Badge>
              )}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="flex w-32 items-center gap-2">
              <Progress
                value={uploadProgress}
                className="h-1.5 [&>div]:bg-blue-500"
              />
              <span className="text-xs text-blue-600 tabular-nums dark:text-blue-400">
                {uploadProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Recording controls */}
          {recorder.state === "recording" && (
            <Button
              variant="outline"
              size="sm"
              onClick={recorder.pauseRecording}
              className="h-7 gap-1 border-teal-300 text-xs dark:border-teal-700"
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
          )}
          {recorder.state === "paused" && (
            <Button
              variant="outline"
              size="sm"
              onClick={recorder.resumeRecording}
              className="h-7 gap-1 border-teal-300 text-xs dark:border-teal-700"
            >
              <Play className="h-3 w-3" />
              Resume
            </Button>
          )}
          {isRecording && (
            <Button
              variant="outline"
              size="sm"
              onClick={recorder.stopRecording}
              className="h-7 gap-1 border-zinc-400 text-xs"
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          )}

          {/* Return to visit link */}
          {!isDone && (
            <Link href={visitPath}>
              <Button variant="default" size="sm" className="h-7 gap-1 text-xs">
                Return to Visit
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}

          {/* Done — reload visit page */}
          {isDone && (
            <Link href={visitPath}>
              <Button variant="default" size="sm" className="h-7 gap-1 text-xs">
                View AI Note
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}

          {/* Discard button */}
          {(isRecording || isCompleted) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={endSession}
              className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
            >
              <X className="h-3 w-3" />
              Discard
            </Button>
          )}

          {/* Error — dismiss */}
          {uploadState === "error" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={endSession}
              className="h-7 gap-1 text-xs text-red-600"
            >
              <X className="h-3 w-3" />
              Dismiss
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {uploadState === "error" && uploadError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}
    </div>
  );
}
