"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, ExternalLink, AlertCircle } from "lucide-react";

type ConsentDocumentViewerProps = {
  documentUrl: string;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConsentDocumentViewer({
  documentUrl,
  documentName,
  open,
  onOpenChange,
}: ConsentDocumentViewerProps) {
  const [loadError, setLoadError] = useState(false);
  
  const isPdf = documentName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png)$/i.test(documentName);

  const handleDownload = () => {
    window.open(documentUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Consent Document
          </DialogTitle>
          <DialogDescription>
            {documentName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden rounded-lg border bg-gray-50 dark:bg-gray-900">
          {loadError ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load document. Please try downloading it instead.
                </AlertDescription>
              </Alert>
              <Button onClick={handleDownload} className="mt-4">
                <Download className="mr-2 h-4 w-4" />
                Download Document
              </Button>
            </div>
          ) : isPdf ? (
            <iframe
              src={documentUrl}
              className="w-full h-full"
              title="Consent Document"
              onError={() => setLoadError(true)}
            />
          ) : isImage ? (
            <div className="w-full h-full overflow-auto p-4 flex items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src={documentUrl}
                  alt="Consent Document"
                  fill
                  className="object-contain"
                  onError={() => setLoadError(true)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Document
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(documentUrl, '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
