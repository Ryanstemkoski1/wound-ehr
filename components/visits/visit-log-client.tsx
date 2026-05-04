"use client";

import { useState, useCallback } from "react";
import { Printer, Loader2, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import VisitSummaryPDF from "@/components/pdf/visit-summary-pdf";
import { getVisitDataForPDF } from "@/app/actions/pdf";
import VisitCard from "@/components/visits/visit-card";
import { Button } from "@/components/ui/button";

type Visit = {
  id: string;
  visitDate: Date;
  visitType: string;
  location: string | null;
  status: string;
  followUpType: string | null;
  followUpDate: Date | null;
};

type Props = {
  visits: Visit[];
  patientId: string;
  patientName: string;
  /** Which visits should be hidden from batch-print (e.g. restricted facility visits) */
  restrictedVisitIds?: Set<string>;
};

export function VisitLogClient({
  visits,
  patientId,
  patientName,
  restrictedVisitIds = new Set(),
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  const printableVisits = visits.filter(
    (v) =>
      !restrictedVisitIds.has(v.id) &&
      (v.status === "signed" ||
        v.status === "submitted" ||
        v.status === "complete" ||
        v.status === "completed")
  );

  const toggleVisit = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(printableVisits.map((v) => v.id)));
  }, [printableVisits]);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const handleBatchPrint = async () => {
    if (selected.size === 0) return;
    setPrinting(true);
    let successCount = 0;
    let failCount = 0;

    for (const visitId of Array.from(selected)) {
      const visit = visits.find((v) => v.id === visitId);
      try {
        const result = await getVisitDataForPDF(visitId);
        if (!result.success || !result.data) {
          failCount++;
          continue;
        }
        const blob = await pdf(<VisitSummaryPDF data={result.data} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const safeName = patientName.replace(/\s+/g, "-");
        const safeDate = visit
          ? new Date(visit.visitDate).toLocaleDateString().replace(/\//g, "-")
          : visitId.slice(0, 8);
        link.download = `visit-${safeName}-${safeDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
        // Small delay between downloads to avoid browser blocking
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        failCount++;
      }
    }

    setPrinting(false);
    if (successCount > 0 && failCount === 0) {
      toast.success(
        `Downloaded ${successCount} PDF${successCount !== 1 ? "s" : ""}`
      );
    } else if (successCount > 0) {
      toast.warning(`Downloaded ${successCount}, failed ${failCount}`);
    } else {
      toast.error("Failed to generate PDFs");
    }
    clearAll();
  };

  return (
    <div className="space-y-4">
      {/* Batch print toolbar */}
      {printableVisits.length > 0 && (
        <div className="bg-muted/30 dark:bg-card flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2">
          <span className="text-muted-foreground text-sm font-medium">
            Batch Print:
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={
              selected.size === printableVisits.length ? clearAll : selectAll
            }
            className="gap-1.5"
          >
            {selected.size === printableVisits.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selected.size === printableVisits.length
              ? "Deselect All"
              : "Select All"}
          </Button>
          {selected.size > 0 && (
            <>
              <span className="text-muted-foreground text-xs">
                {selected.size} selected
              </span>
              <Button
                size="sm"
                onClick={handleBatchPrint}
                disabled={printing}
                className="ml-auto gap-2"
              >
                {printing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {printing ? "Generating…" : `Print Selected (${selected.size})`}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Visit cards with optional checkboxes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visits.map((visit) => {
          const isPrintable = printableVisits.some((v) => v.id === visit.id);
          const isRestricted = restrictedVisitIds.has(visit.id);
          const isChecked = selected.has(visit.id);

          return (
            <div
              key={visit.id}
              className={`relative ${isPrintable ? "cursor-pointer" : ""}`}
              onClick={isPrintable ? () => toggleVisit(visit.id) : undefined}
            >
              {isPrintable && (
                <div
                  className={`absolute top-3 left-3 z-10 rounded p-0.5 transition-colors ${
                    isChecked
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground ring-border dark:bg-muted/80 bg-white/80 ring-1"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisit(visit.id);
                  }}
                >
                  {isChecked ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </div>
              )}
              <VisitCard
                visit={visit}
                patientId={patientId}
                restricted={isRestricted}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
