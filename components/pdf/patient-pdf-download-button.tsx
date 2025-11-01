"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import PatientSummaryPDF from "@/components/pdf/patient-summary-pdf";
import { getPatientDataForPDF } from "@/app/actions/pdf";

type PatientPDFDownloadButtonProps = {
  patientId: string;
  patientName: string;
  mrn: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export default function PatientPDFDownloadButton({
  patientId,
  patientName,
  mrn,
  variant = "outline",
  size = "default",
  className,
}: PatientPDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Fetch patient data
      const result = await getPatientDataForPDF(patientId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Generate PDF
      const blob = await pdf(<PatientSummaryPDF data={result.data} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `patient-summary-${patientName.replace(/\s+/g, "-")}-${mrn}.pdf`;
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
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Download</span> PDF
        </>
      )}
    </Button>
  );
}
