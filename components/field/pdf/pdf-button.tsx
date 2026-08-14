"use client";

// =====================================================
// FieldNotePdfButton — client-side PDF generation.
// =====================================================
// Click → fetch PDF data (status floor enforced server-side) →
// dynamic-import @react-pdf/renderer + the template (keeps the
// heavy renderer out of the main bundle) → blob → anchor download.

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getFieldNoteDataForPDF } from "@/app/actions/field-notes";

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned || "field-visit-note";
}

export function FieldNotePdfButton({ noteId, fileName }: { noteId: string; fileName: string }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await getFieldNoteDataForPDF(noteId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const [{ pdf }, { FieldNotePDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./field-note-pdf"),
      ]);
      const blob = await pdf(<FieldNotePDF data={result.data} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(fileName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch (error) {
      console.error("Field note PDF generation failed:", error);
      toast.error("Failed to generate the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={generating} className="h-11">
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
