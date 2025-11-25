"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Download,
  Eye,
  Archive,
  MoreVertical,
  File,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentViewer } from "./document-viewer";
import {
  archivePatientDocument,
  getDocumentSignedUrl,
  type PatientDocument,
} from "@/app/actions/documents";
import { toast } from "sonner";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  face_sheet: "Face Sheet",
  lab_results: "Lab Results",
  radiology: "Radiology",
  insurance: "Insurance",
  referral: "Referral",
  discharge_summary: "Discharge Summary",
  medication_list: "Medication List",
  history_physical: "History & Physical",
  progress_note: "Progress Note",
  consent_form: "Consent Form",
  other: "Other",
};

type DocumentListProps = {
  documents: PatientDocument[];
  onDocumentChange?: () => void;
};

export function DocumentList({ documents, onDocumentChange }: DocumentListProps) {
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [documentToArchive, setDocumentToArchive] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleView = async (documentId: string) => {
    setLoading(documentId);
    try {
      const result = await getDocumentSignedUrl(documentId);
      if (result.success && result.url) {
        setViewingDocument({
          url: result.url,
          name: result.documentName || "Document",
          mimeType: result.mimeType || "application/octet-stream",
        });
      } else {
        toast.error("Failed to load document", {
          description: result.error || "Please try again",
        });
      }
    } catch {
      toast.error("Failed to load document", {
        description: "Please try again",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async (documentId: string, documentName: string) => {
    setLoading(documentId);
    try {
      const result = await getDocumentSignedUrl(documentId);
      if (result.success && result.url) {
        // Create temporary link and trigger download
        const link = document.createElement("a");
        link.href = result.url;
        link.download = documentName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("Failed to download document", {
          description: result.error || "Please try again",
        });
      }
    } catch {
      toast.error("Failed to download document", {
        description: "Please try again",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleArchive = async () => {
    if (!documentToArchive) return;

    setLoading(documentToArchive);
    try {
      const result = await archivePatientDocument(documentToArchive);
      if (result.success) {
        toast.success("Document archived successfully");
        onDocumentChange?.();
      } else {
        toast.error("Failed to archive document", {
          description: result.error || "Please try again",
        });
      }
    } catch {
      toast.error("Failed to archive document", {
        description: "Please try again",
      });
    } finally {
      setLoading(null);
      setArchiveDialogOpen(false);
      setDocumentToArchive(null);
    }
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No documents uploaded yet</p>
            <p className="text-sm mt-1">Upload a document to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.document_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, PatientDocument[]>);

  return (
    <>
      <div className="space-y-4">
        {Object.entries(groupedDocuments).map(([type, docs]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-lg">
                {DOCUMENT_TYPE_LABELS[type] || type}
              </CardTitle>
              <CardDescription>{docs.length} document(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {docs.map((doc) => {
                  const FileIcon = getFileIcon(doc.mime_type);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileIcon className="h-8 w-8 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.document_category && (
                              <>
                                <span>•</span>
                                <span>{doc.document_category}</span>
                              </>
                            )}
                            {doc.document_date && (
                              <>
                                <span>•</span>
                                <span>
                                  {format(new Date(doc.document_date), "MMM d, yyyy")}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>
                              Uploaded {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
                            </span>
                            {doc.uploader?.name && (
                              <>
                                <span>•</span>
                                <span>
                                  by {doc.uploader.name}
                                  {doc.uploader.credentials &&
                                    ` (${doc.uploader.credentials})`}
                                </span>
                              </>
                            )}
                          </div>
                          {doc.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              {doc.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(doc.id)}
                          disabled={loading === doc.id}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc.id, doc.document_name)}
                              disabled={loading === doc.id}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDocumentToArchive(doc.id);
                                setArchiveDialogOpen(true);
                              }}
                              disabled={loading === doc.id}
                              className="text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          url={viewingDocument.url}
          documentName={viewingDocument.name}
          mimeType={viewingDocument.mimeType}
          open={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this document? It will be hidden from the
              list but can be restored later by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
