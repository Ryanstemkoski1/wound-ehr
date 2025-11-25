"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { uploadPatientDocument, type DocumentType } from "@/app/actions/documents";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "face_sheet", label: "Face Sheet" },
  { value: "lab_results", label: "Lab Results" },
  { value: "radiology", label: "Radiology / Imaging" },
  { value: "insurance", label: "Insurance Card" },
  { value: "referral", label: "Referral" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "medication_list", label: "Medication List" },
  { value: "history_physical", label: "History & Physical" },
  { value: "progress_note", label: "Progress Note" },
  { value: "consent_form", label: "Consent Form" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

type DocumentUploadProps = {
  patientId: string;
  onUploadComplete?: () => void;
};

export function DocumentUpload({ patientId, onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [documentCategory, setDocumentCategory] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 10MB";
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File type not supported. Please upload PDF, image, or document file.";
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
      } else {
        setFile(selectedFile);
        setError(null);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
      } else {
        setFile(droppedFile);
        setError(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      // Create FormData for Server Action
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      formData.append("documentType", documentType);
      if (documentCategory) formData.append("documentCategory", documentCategory);
      if (documentDate) formData.append("documentDate", documentDate);
      if (notes) formData.append("notes", notes);

      const result = await uploadPatientDocument(formData);

      clearInterval(progressInterval);
      setProgress(100);

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      // Reset form
      setTimeout(() => {
        setFile(null);
        setDocumentType("other");
        setDocumentCategory("");
        setDocumentDate("");
        setNotes("");
        setProgress(0);
        setUploading(false);
        onUploadComplete?.();
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(0);
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? "border-primary bg-primary/5" : "border-border"}
          ${file ? "bg-muted/50" : ""}
        `}
      >
        {!file ? (
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                Choose a file
              </Label>
              {" or drag and drop"}
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG, DOC, or TXT (max 10MB)
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Metadata Form */}
      {file && !uploading && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type *</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-category">Category (optional)</Label>
            <Input
              id="document-category"
              placeholder="e.g., CBC Panel, Chest X-Ray, Blue Cross"
              value={documentCategory}
              onChange={(e) => setDocumentCategory(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-date">Document Date (optional)</Label>
            <Input
              id="document-date"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about this document..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleUpload} className="w-full" disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      )}
    </div>
  );
}
