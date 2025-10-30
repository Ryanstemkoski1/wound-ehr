"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import WoundProgressPDF from "@/components/pdf/wound-progress-pdf";
import { getWoundDataForPDF } from "@/app/actions/pdf";

type WoundPDFDownloadButtonProps = {
  woundId: string;
  location: string;
  patientName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export default function WoundPDFDownloadButton({
  woundId,
  location,
  patientName,
  variant = "outline",
  size = "default",
}: WoundPDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Fetch data from server
      const result = await getWoundDataForPDF(woundId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Generate PDF
      const blob = await pdf(<WoundProgressPDF data={result.data} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wound-progress-${patientName.replace(/\s+/g, "-")}-${location.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
          Download Progress Report
        </>
      )}
    </Button>
  );
}
