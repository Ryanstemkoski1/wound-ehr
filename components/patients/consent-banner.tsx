"use client";

import { useState } from "react";
import { AlertTriangle, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsentDialog } from "./consent-dialog";

type ConsentBannerProps = {
  patientId: string;
  patientName: string;
};

export function ConsentBanner({ patientId, patientName }: ConsentBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-600 dark:bg-amber-950/20">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Consent to Treat has not been obtained for this patient.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            A signed consent form is required before scheduling visits or
            performing assessments.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/30"
          onClick={() => setDialogOpen(true)}
        >
          <FileSignature className="mr-2 h-4 w-4" />
          Obtain Consent
        </Button>
      </div>

      <ConsentDialog
        patientId={patientId}
        patientName={patientName}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
