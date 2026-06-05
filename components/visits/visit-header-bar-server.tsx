"use client";

// VisitHeaderBarServer — Phase 3 client wrapper around VisitHeaderBar.
//
// VisitHeaderBar takes `onSignClick` / `onCopyForwardClick` callbacks. Server
// components cannot pass closures across the RSC boundary, so this thin
// "use client" wrapper exists solely to provide no-op handlers. The actual
// SignVisitDialog + CopyForwardDialog mounts will be wired in a follow-up
// iteration (TODO below). For Phase 3 v1 the dialogs remain reachable via
// the existing chrome that is still rendered alongside the tabbed shell.

import { VisitHeaderBar } from "@/components/visits/visit-header-bar";

export type VisitHeaderBarServerProps = {
  visitId: string;
  patientId: string;
  patientName: string;
  status: string;
  canSign: boolean;
  canCopyForward: boolean;
  format?: "summary" | "full" | "leave-behind";
  signedAtIso?: string | null;
};

export function VisitHeaderBarServer(props: VisitHeaderBarServerProps) {
  // TODO(phase3): wire onSignClick to the SignVisitDialog and
  // onCopyForwardClick to the CopyForwardDialog. For v1 these CTAs are
  // intentionally no-ops; users continue to sign + copy forward via the
  // existing page-hero buttons.
  return (
    <VisitHeaderBar
      {...props}
      onSignClick={() => {
        /* no-op for v1 — see TODO above */
      }}
      onCopyForwardClick={() => {
        /* no-op for v1 — see TODO above */
      }}
    />
  );
}

export default VisitHeaderBarServer;
