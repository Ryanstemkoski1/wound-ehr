"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, CloudOff } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

type SaveStatusIndicatorProps = {
  status: SaveStatus;
  /** Optional timestamp string for "last saved at" */
  lastSavedAt?: string | null;
  className?: string;
};

/**
 * Fixed-position autosave status badge.
 * Shows Saving… / Saved / Error with appropriate icons.
 * Uses CSS animation to fade out after "Saved" state (3s visible + 0.5s fade).
 * Fully React Compiler compliant — no refs or setState during render.
 */
export function SaveStatusIndicator({
  status,
  lastSavedAt,
  className,
}: SaveStatusIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-md md:right-6 md:bottom-6",
        status === "saving" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        status === "saved" &&
          "animate-[save-fadeout_3.5s_ease-in-out_forwards] border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
        status === "error" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
        status === "offline" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5" />
          Saved
          {lastSavedAt && (
            <span className="text-[0.65rem] opacity-70">
              {new Date(lastSavedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          Save failed
        </>
      )}
      {status === "offline" && (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          Offline — changes saved locally
        </>
      )}
    </div>
  );
}

/**
 * Hook that wraps useAutosave and provides a SaveStatus + keyboard shortcut.
 * Use alongside the SaveStatusIndicator component.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const markSaving = useCallback(() => setStatus("saving"), []);
  const markSaved = useCallback(() => {
    setStatus("saved");
    setLastSavedAt(new Date().toISOString());
  }, []);
  const markError = useCallback(() => setStatus("error"), []);

  // Detect online/offline
  useEffect(() => {
    const goOffline = () => setStatus("offline");
    const goOnline = () => setStatus("idle");
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return { status, lastSavedAt, markSaving, markSaved, markError };
}

/**
 * Hook that listens for Ctrl+S / Cmd+S and calls the provided save function.
 */
export function useKeyboardSave(onSave: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);
}
