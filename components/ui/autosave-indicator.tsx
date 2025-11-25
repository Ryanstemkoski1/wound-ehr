// Autosave Indicator
// Phase 9.3.2: Visual indicator showing autosave status

"use client";

import { Cloud, CloudOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type AutosaveIndicatorProps = {
  status: "saving" | "saved" | "error" | "idle";
  lastSaved?: string;
  className?: string;
};

export default function AutosaveIndicator({
  status,
  lastSaved,
  className,
}: AutosaveIndicatorProps) {
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
