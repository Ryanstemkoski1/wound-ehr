"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generatePatientsCSV, generateWoundsCSV } from "@/app/actions/pdf";

type CSVDownloadButtonProps = {
  type: "patients" | "wounds";
  facilityId?: string;
  patientId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export default function CSVDownloadButton({
  type,
  facilityId,
  patientId,
  variant = "outline",
  size = "default",
}: CSVDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Generate CSV
      const result =
        type === "patients"
          ? await generatePatientsCSV(facilityId)
          : await generateWoundsCSV(patientId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Create download link
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV downloaded successfully");
    } catch (error) {
      console.error("Failed to generate CSV:", error);
      toast.error("Failed to generate CSV");
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
          Generating...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Export to CSV
        </>
      )}
    </Button>
  );
}
