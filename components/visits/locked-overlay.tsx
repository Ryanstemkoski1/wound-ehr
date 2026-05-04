"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type LockedOverlayProps = {
  locked: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
};

/**
 * R-064 (clinical_ux_v2) — Locked overlay applied to visit charting
 * surfaces once the note has been signed/submitted. Renders children
 * with reduced opacity, blocks pointer events, and surfaces a sticky
 * "Locked – addendums only" hint so clinicians know why fields are
 * uneditable. Use this around any block that should become read-only
 * post-attestation.
 */
export function LockedOverlay({
  locked,
  children,
  message = "Locked — addendums only",
  className,
}: LockedOverlayProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("relative isolate", className)}
      data-locked="true"
      aria-disabled="true"
    >
      <div className="pointer-events-none opacity-60 select-none">
        {children}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      />
      <div className="pointer-events-none sticky bottom-4 z-10 mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/95 px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm backdrop-blur dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
        <Lock className="h-3.5 w-3.5" />
        {message}
      </div>
    </div>
  );
}
