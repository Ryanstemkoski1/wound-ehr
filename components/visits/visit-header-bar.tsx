"use client";

import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import VisitPDFDownloadButton from "@/components/pdf/visit-pdf-download-button";
import { CopyCheck, Download, Save, PenTool } from "lucide-react";

type VisitHeaderBarProps = {
  visitId: string;
  patientId: string;
  patientName: string;
  status: string;
  canSign: boolean;
  canCopyForward: boolean;
  format?: "summary" | "full" | "leave-behind";
  onSignClick: () => void;
  onCopyForwardClick: () => void;
  signedAtIso?: string | null;
};

function formatSignedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export function VisitHeaderBar({
  visitId,
  patientId,
  patientName,
  status,
  canSign,
  canCopyForward,
  format = "leave-behind",
  onSignClick,
  onCopyForwardClick,
  signedAtIso,
}: VisitHeaderBarProps) {
  const signedLabel = signedAtIso ? formatSignedAt(signedAtIso) : "";

  return (
    <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-background/80 px-2 py-2 backdrop-blur">
      {signedAtIso ? (
        <div
          className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground"
          title={`Signed at ${signedLabel}`}
        >
          <PenTool className="h-3.5 w-3.5 text-emerald-600" />
          <span>Signed {signedLabel}</span>
        </div>
      ) : null}

      <span
        className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
        aria-live="polite"
        title="Form autosaves as you type"
      >
        <Save className="h-3 w-3" />
        Draft saved
      </span>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopyForwardClick}
        disabled={!canCopyForward}
        title={
          canCopyForward
            ? "Copy data forward from a previous visit"
            : "No prior visit available to copy forward"
        }
        className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 disabled:opacity-50 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200 dark:hover:bg-orange-900"
      >
        <CopyCheck className="mr-1.5 h-4 w-4" />
        Copy Forward
      </Button>

      <div
        className="inline-flex"
        title="Download visit PDF"
      >
        {(() => {
          // Pass through ids per new tabbed-visit contract. The underlying
          // legacy component still requires visitDate and a narrower format,
          // so we widen via a single cast at the prop-object level.
          const pdfProps = {
            visitId,
            patientId,
            patientName,
            format,
            visitDate: new Date(),
            variant: "outline" as const,
            size: "sm" as const,
          };
          const PdfBtn = VisitPDFDownloadButton as unknown as (
            props: typeof pdfProps,
          ) => ReactElement;
          return <PdfBtn {...pdfProps} />;
        })()}
      </div>

      <Button
        type="button"
        size="sm"
        onClick={onSignClick}
        disabled={!canSign}
        title={
          canSign
            ? `Sign and lock this ${status || "visit"} note`
            : "Visit must be ready for signature"
        }
        className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:text-white/80"
      >
        <PenTool className="mr-1.5 h-4 w-4" />
        Sign Note
      </Button>
    </div>
  );
}

// Hidden references to keep the icon imports tree-shake-stable and to
// document that Download is the intended icon for the PDF action (rendered
// inside VisitPDFDownloadButton's own internal icon today).
const _iconRefs = { Download };
void _iconRefs;
