// Autosave Indicator
// Phase 9.3.2 + Phase 11.5: Visual indicator showing autosave status

"use client";

import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AutosaveIndicatorProps = {
  status: "saving" | "saved" | "error" | "idle";
  lastSaved?: string;
  className?: string;
  /** When true, renders as a fixed badge in the bottom-right corner */
  floating?: boolean;
};

export default function AutosaveIndicator({
  status,
  lastSaved,
  className,
  floating = false,
}: AutosaveIndicatorProps) {
  // Floating variant: fixed badge with colored background
  if (floating) {
    // Don't show when idle
    if (status === "idle") return null;

    return (
      <div
        className={cn(
          "fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-md transition-all duration-300 md:right-6 md:bottom-6",
          status === "saving" && "border-primary/20 bg-primary/5 text-primary",
          status === "saved" &&
            "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
          status === "error" &&
            "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
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
            Saved {lastSaved && <span className="opacity-70">{lastSaved}</span>}
          </>
        )}
        {status === "error" && (
          <>
            <CloudOff className="h-3.5 w-3.5" />
            Save failed
          </>
        )}
      </div>
    );
  }

  // Inline variant (original behavior)
  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-xs",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Cloud className="h-3.5 w-3.5 animate-pulse" />
          <span>Saving...</span>
        </>
      )}

      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
          <span className="text-green-600 dark:text-green-500">
            {lastSaved ? `Saved ${lastSaved}` : "All changes saved"}
          </span>
        </>
      )}

      {status === "error" && (
        <>
          <CloudOff className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
          <span className="text-red-600 dark:text-red-500">
            Save failed - changes stored locally
          </span>
        </>
      )}

      {status === "idle" && (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Autosave enabled</span>
        </>
      )}
    </div>
  );
}
