"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload as UploadIcon } from "lucide-react";
import { DocumentUpload } from "./document-upload";
import { DocumentList } from "./document-list";
import { getPatientDocuments, type PatientDocument } from "@/app/actions/documents";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PatientDocumentsTabProps = {
  patientId: string;
  initialDocuments: PatientDocument[];
};

export function PatientDocumentsTab({
  patientId,
  initialDocuments,
}: PatientDocumentsTabProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>(initialDocuments);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshDocuments = async () => {
    setIsRefreshing(true);
    try {
      const result = await getPatientDocuments(patientId);
      if (result.success) {
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUploadComplete = async () => {
    setUploadDialogOpen(false);
    await handleRefreshDocuments();
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Documents</CardTitle>
              <CardDescription>
                Upload and manage patient documents (face sheets, labs, radiology, etc.)
              </CardDescription>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Patient Document</DialogTitle>
                  <DialogDescription>
                    Upload a new document for this patient. Supported formats: PDF, images,
                    Word documents (max 10MB).
                  </DialogDescription>
                </DialogHeader>
                <DocumentUpload
                  patientId={patientId}
                  onUploadComplete={handleUploadComplete}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Click &quot;Upload Document&quot; above to add files
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supported: PDF, JPG, PNG, DOC, TXT (max 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <DocumentList documents={documents} onDocumentChange={handleRefreshDocuments} />
    </div>
  );
}
