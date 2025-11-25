"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-8">{documentName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-muted/30 min-h-0 flex-1 overflow-hidden rounded-lg border">
          {isPdf && (
            <iframe
              src={url}
              className="h-full w-full"
              title={documentName}
              style={{ border: "none" }}
            />
          )}

          {isImage && (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
              <div className="relative max-h-full max-w-full">
                <Image
                  src={url}
                  alt={documentName}
                  width={1200}
                  height={1600}
                  className="h-auto max-h-full w-auto max-w-full object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {!isPdf && !isImage && (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed in the browser.
              </p>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download to View
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
