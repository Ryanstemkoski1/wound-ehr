"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { uploadScannedConsent } from "@/app/actions/signatures";

type ScannedConsentUploadProps = {
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ScannedConsentUpload({
  patientId,
  patientName,
  onSuccess,
  onCancel,
}: ScannedConsentUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload PDF, JPG, or PNG files only.");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patientId", patientId);
      formData.append("patientName", patientName);
      formData.append("consentType", "initial_treatment");
      formData.append("consentText", "Scanned paper consent form uploaded");

      setUploadProgress(30);

      const result = await uploadScannedConsent(formData);

      setUploadProgress(90);

      if (result.error) {
        setError(result.error);
        setUploadProgress(0);
        setIsUploading(false);
        return;
      }

      setUploadProgress(100);
      setSuccess(true);

      // Wait a moment to show success state
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }, 1500);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload consent document");
      setUploadProgress(0);
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 dark:border-gray-700">
        {!selectedFile ? (
          <div className="text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a scanned consent form (PDF, JPG, or PNG)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Maximum file size: 10MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              id="consent-file-upload"
            />
            <label htmlFor="consent-file-upload">
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <div className="flex flex-1 items-start space-x-3">
                <FileText className="text-primary mt-1 h-6 w-6" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              {!isUploading && !success && (
                <button
                  onClick={handleRemoveFile}
                  className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Uploading...
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Consent uploaded successfully!
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> Upload a scanned copy of a previously signed
          paper consent form. This is typically used when digitizing existing
          paper records.
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || success}
        >
          {isUploading
            ? "Uploading..."
            : success
              ? "Uploaded"
              : "Upload Consent"}
        </Button>
      </div>
    </div>
  );
}
