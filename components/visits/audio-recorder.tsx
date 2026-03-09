"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useAudioRecorder,
  formatDuration,
  formatFileSize,
  getExtensionForMime,
} from "@/lib/hooks/use-audio-recorder";
import { processTranscription } from "@/app/actions/ai-transcription";
import { AI_CONFIG } from "@/lib/ai-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  BrainCircuit,
  Volume2,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

type AudioRecorderProps = {
  visitId: string;
  patientId: string;
  /** Called when upload + processing starts successfully */
  onProcessingStarted?: (transcriptId: string) => void;
  /** Whether the visit is in an editable state */
  disabled?: boolean;
};

// =====================================================
// AUDIO LEVEL VISUALIZER
// =====================================================

function AudioLevelBar({ level }: { level: number }) {
  const bars = 20;
  const activeBars = Math.round(level * bars);

  return (
    <div className="flex items-end gap-0.5" style={{ height: 32 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = i < activeBars;
        const barHeight = ((i + 1) / bars) * 100;
        let color = "bg-teal-500";
        if (i > bars * 0.7) color = "bg-amber-500";
        if (i > bars * 0.9) color = "bg-red-500";

        return (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-all duration-75 ${
              isActive ? color : "bg-zinc-200 dark:bg-zinc-700"
            }`}
            style={{ height: `${barHeight}%` }}
          />
        );
      })}
    </div>
  );
}

// =====================================================
// WAVEFORM VISUALIZER
// =====================================================

function WaveformVisualizer({
  isRecording,
  level,
}: {
  isRecording: boolean;
  level: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording) {
      historyRef.current = [];
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Push new level
      historyRef.current.push(level);
      // Keep last N points to fill canvas width
      const maxPoints = Math.floor(canvas.width / 3);
      if (historyRef.current.length > maxPoints) {
        historyRef.current = historyRef.current.slice(-maxPoints);
      }

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const history = historyRef.current;

      // Draw waveform bars
      ctx.fillStyle =
        getComputedStyle(canvas).getPropertyValue("--tw-fill") || "#14b8a6";

      for (let i = 0; i < history.length; i++) {
        const x = (i / maxPoints) * width;
        const barHeight = Math.max(2, history[i] * height * 0.8);
        ctx.fillStyle =
          history[i] > 0.8
            ? "#ef4444"
            : history[i] > 0.5
              ? "#f59e0b"
              : "#14b8a6";
        ctx.fillRect(x, centerY - barHeight / 2, 2, barHeight);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isRecording, level]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={64}
      className="h-16 w-full rounded-md border bg-zinc-50 dark:bg-zinc-900"
    />
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function AudioRecorder({
  visitId,
  patientId,
  onProcessingStarted,
  disabled = false,
}: AudioRecorderProps) {
  const recorder = useAudioRecorder();
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Simulate gradual progress between two bounds while waiting for async work
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

  // Max duration warning threshold (50 mins of 60 = 83%)
  const durationPercent =
    (recorder.duration / AI_CONFIG.AUDIO.MAX_DURATION_SECONDS) * 100;
  const isDurationWarning = durationPercent > 83;

  // Upload and process the recorded audio
  const handleUploadAndProcess = useCallback(async () => {
    if (!recorder.audioBlob) return;

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

      console.log("[AudioRecorder] File ready:", {
        name: filename,
        type: recorder.audioBlob.type,
        size: recorder.audioBlob.size,
      });

      // Upload via API route (not server action — binary FormData hangs in RSC protocol)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visitId", visitId);
      formData.append("patientId", patientId);

      // Animate progress 5→55% during upload
      startProgressSimulation(5, 55, 15000);

      console.log("[AudioRecorder] Calling /api/upload-audio...");
      const response = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      stopProgressSimulation();

      const uploadResult = await response.json();
      console.log(
        "[AudioRecorder] Upload response:",
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

      // Start AI processing (server action is fine for non-binary data)
      setUploadState("processing");
      setUploadProgress(65);

      const transcriptId = uploadResult.transcript.id;
      onProcessingStarted?.(transcriptId);

      // Animate progress 65→95% during AI processing (estimate ~60s)
      startProgressSimulation(65, 95, 60000);

      const processResult = await processTranscription(transcriptId);

      stopProgressSimulation();
      setUploadProgress(100);

      if (processResult.error) {
        // Processing failed but upload succeeded — not a hard error
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
      console.error("[AudioRecorder] Error:", message);
      setUploadError(message);
    }
  }, [
    recorder.audioBlob,
    visitId,
    patientId,
    onProcessingStarted,
    startProgressSimulation,
    stopProgressSimulation,
  ]);

  // Idle state — show start button
  if (recorder.state === "idle" && uploadState === "idle") {
    return (
      <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base text-teal-900 dark:text-teal-100">
              AI Audio Recording
            </CardTitle>
          </div>
          <CardDescription className="text-teal-700 dark:text-teal-300">
            Record the visit conversation for AI-powered clinical note
            generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Microphone selector */}
          {recorder.devices.length > 1 && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-zinc-500" />
              <Select
                value={recorder.selectedDeviceId || ""}
                onValueChange={recorder.selectDevice}
              >
                <SelectTrigger className="max-w-xs text-sm">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {recorder.devices.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!recorder.isSupported && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your browser does not support audio recording. Please use
                Chrome, Edge, or Firefox.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={recorder.startRecording}
            disabled={disabled || !recorder.isSupported}
            className="w-full gap-2 bg-red-600 text-white hover:bg-red-700"
            size="lg"
          >
            <Mic className="h-5 w-5" />
            Start Recording
          </Button>
          <p className="text-center text-xs text-zinc-500">
            Max {Math.floor(AI_CONFIG.AUDIO.MAX_DURATION_SECONDS / 60)} minutes
            • WebM/Opus format • Recording is encrypted and HIPAA-compliant
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (recorder.state === "error") {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="space-y-3 pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {recorder.errorMessage || "Recording error occurred"}
            </AlertDescription>
          </Alert>
          <Button onClick={recorder.reset} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Recording / Paused state
  if (recorder.state === "recording" || recorder.state === "paused") {
    return (
      <Card
        className={
          recorder.state === "recording"
            ? "border-red-300 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10"
            : "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10"
        }
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recorder.state === "recording" ? (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                </span>
              ) : (
                <Pause className="h-4 w-4 text-amber-600" />
              )}
              <CardTitle className="text-base">
                {recorder.state === "recording" ? "Recording..." : "Paused"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="font-mono text-lg tabular-nums"
              >
                {formatDuration(recorder.duration)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatFileSize(recorder.fileSize)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Waveform */}
          <WaveformVisualizer
            isRecording={recorder.state === "recording"}
            level={recorder.audioLevel}
          />

          {/* Level meter */}
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 shrink-0 text-zinc-500" />
            <AudioLevelBar level={recorder.audioLevel} />
            <span className="w-12 text-right text-xs text-zinc-500 tabular-nums">
              {Math.round(recorder.audioLevel * 100)}%
            </span>
          </div>

          {/* Duration warning */}
          {isDurationWarning && (
            <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Approaching maximum recording time (
                {formatDuration(AI_CONFIG.AUDIO.MAX_DURATION_SECONDS)}).
                Recording will auto-stop at the limit.
              </AlertDescription>
            </Alert>
          )}

          {/* Duration progress bar */}
          <Progress
            value={durationPercent}
            className={`h-1 ${isDurationWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-teal-500"}`}
          />

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {recorder.state === "recording" ? (
              <Button
                variant="outline"
                size="lg"
                onClick={recorder.pauseRecording}
                className="gap-2"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                size="lg"
                onClick={recorder.resumeRecording}
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                Resume
              </Button>
            )}

            <Button
              size="lg"
              onClick={recorder.stopRecording}
              className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={recorder.discardRecording}
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Completed state — review & upload
  if (recorder.state === "completed" && uploadState === "idle") {
    return (
      <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-base text-teal-900 dark:text-teal-100">
                Recording Complete
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono tabular-nums">
                {formatDuration(recorder.duration)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatFileSize(recorder.fileSize)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Audio playback */}
          {recorder.audioUrl && (
            <audio
              controls
              src={recorder.audioUrl}
              className="w-full rounded-md"
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleUploadAndProcess}
              className="flex-1 gap-2"
              size="lg"
            >
              <Upload className="h-4 w-4" />
              Upload & Generate AI Note
            </Button>
            <Button
              variant="ghost"
              onClick={recorder.discardRecording}
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-500">
            Audio will be securely uploaded and processed by OpenAI Whisper +
            GPT-4 for clinical note generation
          </p>
        </CardContent>
      </Card>
    );
  }

  // Uploading / Processing state
  if (uploadState === "uploading" || uploadState === "processing") {
    const statusMessage =
      uploadState === "uploading"
        ? uploadProgress < 30
          ? "Preparing and uploading audio..."
          : "Uploading to secure storage..."
        : uploadProgress < 80
          ? "Transcribing audio with Whisper..."
          : "Generating clinical note with GPT-4...";

    return (
      <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {uploadState === "uploading" ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : (
              <BrainCircuit className="h-5 w-5 animate-pulse text-blue-600" />
            )}
            <CardTitle className="text-base text-blue-900 dark:text-blue-100">
              {uploadState === "uploading"
                ? "Uploading Audio..."
                : "AI Processing..."}
            </CardTitle>
          </div>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            {statusMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress
            value={uploadProgress}
            className="[&>div]:bg-blue-500 [&>div]:transition-all [&>div]:duration-300"
          />
          <p className="text-center text-xs text-blue-600 dark:text-blue-400">
            {uploadProgress}% — Please do not close this page
          </p>
        </CardContent>
      </Card>
    );
  }

  // Done state
  if (uploadState === "done") {
    return (
      <Card className="border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="font-medium text-green-900 dark:text-green-100">
              AI Clinical Note Generated
            </p>
          </div>

          {uploadError && (
            <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {uploadError}
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-green-700 dark:text-green-300">
            Refresh the page to review and approve the AI-generated clinical
            note.
          </p>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Upload error state
  if (uploadState === "error") {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="space-y-3 pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {uploadError || "Upload failed"}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button
              onClick={handleUploadAndProcess}
              variant="outline"
              className="flex-1"
            >
              Retry Upload
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setUploadState("idle");
                setUploadError(null);
                recorder.reset();
              }}
              className="text-red-600"
            >
              Discard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback — requesting permission / stopping
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {recorder.state === "requesting-permission"
            ? "Requesting microphone access..."
            : "Finalizing recording..."}
        </p>
      </CardContent>
    </Card>
  );
}
