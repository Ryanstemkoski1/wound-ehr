"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Eye, Loader2 } from "lucide-react";
import { ConsentDocumentViewer } from "./consent-document-viewer";
import { getConsentDocumentUrl } from "@/app/actions/signatures";
import { toast } from "sonner";

type ConsentStatusCardProps = {
  hasConsent: boolean;
  patientId?: string;
  consentData?: {
    consent_document_url?: string | null;
    consent_document_name?: string | null;
    created_at?: string;
    consent_type?: string;
  } | null;
};

export function ConsentStatusCard({
  hasConsent,
  patientId,
  consentData,
}: ConsentStatusCardProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!hasConsent) {
    return null; // Dialog will handle display when no consent
  }

  const hasDocument =
    consentData?.consent_document_url && consentData?.consent_document_name;
  const consentDate = consentData?.created_at
    ? new Date(consentData.created_at).toLocaleDateString()
    : "Unknown";

  return (
    <>
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-green-900 dark:text-green-100">
                Consent on File
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="border-green-600 text-green-700 dark:text-green-300"
            >
              {consentData?.consent_type === "initial_treatment"
                ? "Initial Treatment"
                : "Active"}
            </Badge>
          </div>
          <CardDescription className="text-green-700 dark:text-green-300">
            Patient consent obtained on {consentDate}
          </CardDescription>
        </CardHeader>
        {hasDocument && (
          <CardContent>
            <div className="border-border/60 bg-card flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <FileText className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {consentData.consent_document_name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Scanned consent document
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!patientId) return;

                  setIsLoading(true);
                  try {
                    const result = await getConsentDocumentUrl(patientId);
                    if (result.error) {
                      toast.error("Failed to load document: " + result.error);
                    } else if (result.data?.consent_document_url) {
                      setSignedUrl(result.data.consent_document_url);
                      setViewerOpen(true);
                    } else {
                      toast.error("No document URL found");
                    }
                  } catch {
                    toast.error("Failed to load document");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                View Document
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {hasDocument && signedUrl && consentData.consent_document_name && (
        <ConsentDocumentViewer
          documentUrl={signedUrl}
          documentName={consentData.consent_document_name}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      )}
    </>
  );
}
