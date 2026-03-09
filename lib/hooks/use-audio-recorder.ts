"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AI_CONFIG } from "@/lib/ai-config";

// =====================================================
// TYPES
// =====================================================

export type RecordingState =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "paused"
  | "stopping"
  | "uploading"
  | "completed"
  | "error";

export type AudioRecorderOptions = {
  /** Max recording duration in seconds (default: 3600 = 1hr) */
  maxDuration?: number;
  /** Audio MIME type preference */
  mimeType?: string;
  /** Called when audio level changes (0-1 range) */
  onAudioLevel?: (level: number) => void;
};

export type AudioRecorderReturn = {
  /** Current recording state */
  state: RecordingState;
  /** Recording duration in seconds */
  duration: number;
  /** Estimated file size in bytes */
  fileSize: number;
  /** Audio level 0-1 for visualization */
  audioLevel: number;
  /** Recorded audio blob (available after stop) */
  audioBlob: Blob | null;
  /** URL for playback (available after stop) */
  audioUrl: string | null;
  /** Error message if state is "error" */
  errorMessage: string | null;
  /** Available microphones */
  devices: MediaDeviceInfo[];
  /** Currently selected device ID */
  selectedDeviceId: string | null;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Pause recording */
  pauseRecording: () => void;
  /** Resume recording */
  resumeRecording: () => void;
  /** Stop recording and finalize audio */
  stopRecording: () => void;
  /** Discard current recording */
  discardRecording: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Select a different microphone */
  selectDevice: (deviceId: string) => void;
  /** Whether the browser supports MediaRecorder */
  isSupported: boolean;
};

// =====================================================
// HELPERS
// =====================================================

/** Determine best MIME type for the current browser */
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  if (typeof MediaRecorder === "undefined") return "audio/webm";

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

/** Get file extension from MIME type */
export function getExtensionForMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/** Format seconds as MM:SS */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Format bytes as human-readable size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =====================================================
// HOOK
// =====================================================

export function useAudioRecorder(
  options: AudioRecorderOptions = {}
): AudioRecorderReturn {
  const { maxDuration = AI_CONFIG.AUDIO.MAX_DURATION_SECONDS, onAudioLevel } =
    options;

  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>(getSupportedMimeType());
  const durationRef = useRef(0);

  const isSupported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  // Enumerate audio input devices
  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch {
      // Ignore — devices will be empty
    }
  }, [selectedDeviceId]);

  // Audio level analysis loop
  const startLevelAnalysis = useCallback(
    (stream: MediaStream) => {
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate RMS level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 255) ** 2;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const level = Math.min(1, rms * 2); // Scale up for visibility

          setAudioLevel(level);
          onAudioLevel?.(level);

          animationFrameRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch {
        // Audio analysis not critical — recording still works
      }
    },
    [onAudioLevel]
  );

  const stopLevelAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setState("error");
      setErrorMessage(
        "Your browser does not support audio recording. Please use Chrome, Edge, or Firefox."
      );
      return;
    }

    setState("requesting-permission");
    setErrorMessage(null);

    try {
      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Enumerate devices after permission (labels become available)
      await enumerateDevices();

      // Set up MediaRecorder
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128kbps — good quality, reasonable size
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      durationRef.current = 0;
      setDuration(0);
      setFileSize(0);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);

      // Collect data chunks
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          // Estimate total size
          const totalSize = chunksRef.current.reduce(
            (acc, c) => acc + c.size,
            0
          );
          setFileSize(totalSize);
        }
      };

      // On stop, finalize the blob
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setFileSize(blob.size);

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        stopLevelAnalysis();
        setState("completed");
      };

      recorder.onerror = () => {
        setState("error");
        setErrorMessage("Recording error occurred. Please try again.");
        stream.getTracks().forEach((t) => t.stop());
        stopLevelAnalysis();
      };

      // Start recording (request data every second for progress)
      recorder.start(1000);

      // Start level analysis
      startLevelAnalysis(stream);

      // Start duration timer
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);

        // Auto-stop at max duration
        if (durationRef.current >= maxDuration) {
          recorder.stop();
        }
      }, 1000);

      setState("recording");
    } catch (err) {
      setState("error");
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setErrorMessage(
            "Microphone access was denied. Please allow microphone access in your browser settings and try again."
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setErrorMessage(
            "No microphone found. Please connect a microphone and try again."
          );
        } else {
          setErrorMessage(`Microphone error: ${err.message}`);
        }
      } else {
        setErrorMessage("Failed to start recording. Please try again.");
      }
    }
  }, [
    isSupported,
    selectedDeviceId,
    enumerateDevices,
    audioUrl,
    startLevelAnalysis,
    stopLevelAnalysis,
    maxDuration,
  ]);

  // Pause
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState("paused");
    }
  }, []);

  // Resume
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);

        if (durationRef.current >= maxDuration) {
          mediaRecorderRef.current?.stop();
        }
      }, 1000);
      setState("recording");
    }
  }, [maxDuration]);

  // Stop
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" ||
        mediaRecorderRef.current.state === "paused")
    ) {
      setState("stopping");
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Discard
  const discardRecording = useCallback(() => {
    // Stop if still recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopLevelAnalysis();
    chunksRef.current = [];
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setFileSize(0);
    durationRef.current = 0;
    setState("idle");
    setErrorMessage(null);
  }, [audioUrl, stopLevelAnalysis]);

  // Reset
  const reset = useCallback(() => {
    discardRecording();
  }, [discardRecording]);

  // Select device
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  return {
    state,
    duration,
    fileSize,
    audioLevel,
    audioBlob,
    audioUrl,
    errorMessage,
    devices,
    selectedDeviceId,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    reset,
    selectDevice,
    isSupported,
  };
}
