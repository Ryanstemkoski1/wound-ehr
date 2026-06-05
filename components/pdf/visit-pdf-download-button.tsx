"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import VisitSummaryPDF from "@/components/pdf/visit-summary-pdf";
import VisitFullNotePDF from "@/components/pdf/visit-full-note-pdf";
import VisitLeaveBehindPDF from "@/components/pdf/visit-leave-behind-pdf";
import {
  getVisitDataForPDF,
  getVisitDataForFullPDF,
  getVisitDataForLeaveBehindPDF,
} from "@/app/actions/pdf";
import { checkCachedVisitPDF, cacheVisitPDF } from "@/app/actions/pdf-cached";

type VisitPDFDownloadButtonProps = {
  visitId: string;
  visitDate: Date;
  patientName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  format?: "summary" | "full" | "leave-behind";
};

export default function VisitPDFDownloadButton({
  visitId,
  visitDate,
  patientName,
  variant = "outline",
  size = "default",
  format = "summary",
}: VisitPDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // For full notes and leave-behind, skip cache — always fresh
      if (format === "summary") {
        // 1. Check if cached PDF exists (80-95% faster)
        const cacheCheck = await checkCachedVisitPDF(visitId);

        if (cacheCheck.success && cacheCheck.isCached && cacheCheck.url) {
          const link = document.createElement("a");
          link.href = cacheCheck.url;
          link.download = `visit-summary-${patientName.replace(/\s+/g, "-")}-${new Date(visitDate).toLocaleDateString().replace(/\//g, "-")}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("PDF downloaded (cached)");
          setIsGenerating(false);
          return;
        }
      }

      // Fetch data
      let result;
      if (format === "leave-behind") {
        result = await getVisitDataForLeaveBehindPDF(visitId);
      } else if (format === "full") {
        result = await getVisitDataForFullPDF(visitId);
      } else {
        result = await getVisitDataForPDF(visitId);
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Generate PDF
      let element;
      if (format === "leave-behind") {
        const data = result.data as unknown as Parameters<
          typeof VisitLeaveBehindPDF
        >[0]["data"];
        element = <VisitLeaveBehindPDF data={data} />;
      } else if (format === "full") {
        const data = result.data as unknown as Parameters<
          typeof VisitFullNotePDF
        >[0]["data"];
        element = <VisitFullNotePDF data={data} />;
      } else {
        const data = result.data as unknown as Parameters<
          typeof VisitSummaryPDF
        >[0]["data"];
        element = <VisitSummaryPDF data={data} />;
      }
      const blob = await pdf(element).toBlob();

      const safeName = patientName.replace(/\s+/g, "-");
      const safeDate = new Date(visitDate)
        .toLocaleDateString()
        .replace(/\//g, "-");
      let filename;
      if (format === "leave-behind") {
        filename = `visit-leave-behind-${safeName}-${safeDate}.pdf`;
      } else if (format === "full") {
        filename = `visit-full-note-${safeName}-${safeDate}.pdf`;
      } else {
        filename = `visit-summary-${safeName}-${safeDate}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Cache only summary PDFs
      if (format === "summary") {
        cacheVisitPDF(visitId, blob).catch((error) => {
          console.error("Failed to cache PDF:", error);
        });
      }

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant={variant}
      size={size}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          {format === "leave-behind" ? (
            <ScrollText className="mr-2 h-4 w-4" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          {format === "leave-behind"
            ? "Download Leave-Behind PDF"
            : format === "full"
              ? "Full Note PDF"
              : "Summary PDF"}
        </>
      )}
    </Button>
  );
}
