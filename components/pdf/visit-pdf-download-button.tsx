"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import VisitSummaryPDF from "@/components/pdf/visit-summary-pdf";
import { getVisitDataForPDF } from "@/app/actions/pdf";
import { checkCachedVisitPDF, cacheVisitPDF } from "@/app/actions/pdf-cached";

type VisitPDFDownloadButtonProps = {
  visitId: string;
  visitDate: Date;
  patientName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export default function VisitPDFDownloadButton({
  visitId,
  visitDate,
  patientName,
  variant = "outline",
  size = "default",
}: VisitPDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 1. Check if cached PDF exists (80-95% faster)
      const cacheCheck = await checkCachedVisitPDF(visitId);

      if (cacheCheck.success && cacheCheck.isCached && cacheCheck.url) {
        // Download from cache (direct signed URL)
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

      // 2. Cache miss - generate PDF client-side
      // Fetch data from server
      const result = await getVisitDataForPDF(visitId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Generate PDF
      const blob = await pdf(<VisitSummaryPDF data={result.data} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `visit-summary-${patientName.replace(/\s+/g, "-")}-${new Date(visitDate).toLocaleDateString().replace(/\//g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 3. Cache the generated PDF for future use (async, don't wait)
      cacheVisitPDF(visitId, blob).catch((error) => {
        console.error("Failed to cache PDF:", error);
        // Silent fail - don't interrupt user flow
      });

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
          <FileDown className="mr-2 h-4 w-4" />
          Download Visit Summary
        </>
      )}
    </Button>
  );
}
