"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import Image from "next/image";

type DocumentViewerProps = {
  url: string;
  documentName: string;
  mimeType: string;
  open: boolean;
  onClose: () => void;
};

export function DocumentViewer({
  url,
  documentName,
  mimeType,
  open,
  onClose,
}: DocumentViewerProps) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = documentName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-8">{documentName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30">
          {isPdf && (
            <iframe
              src={url}
              className="w-full h-full"
              title={documentName}
              style={{ border: "none" }}
            />
          )}

          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <div className="relative max-w-full max-h-full">
                <Image
                  src={url}
                  alt={documentName}
                  width={1200}
                  height={1600}
                  className="object-contain w-auto h-auto max-w-full max-h-full"
                  unoptimized
                />
              </div>
            </div>
          )}

          {!isPdf && !isImage && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed in the browser.
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download to View
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
