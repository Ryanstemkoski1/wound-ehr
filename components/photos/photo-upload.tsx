"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { uploadPhoto } from "@/app/actions/photos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PhotoUploadProps = {
  woundId: string;
  visitId?: string;
  assessmentId?: string;
  onUploadComplete?: () => void;
  className?: string;
};

export function PhotoUpload({
  woundId,
  visitId,
  assessmentId,
  onUploadComplete,
  className,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "image/*": [".jpeg", ".jpg", ".png", ".webp", ".heic"],
      },
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 1,
    });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("woundId", woundId);
      if (visitId) formData.append("visitId", visitId);
      if (assessmentId) formData.append("assessmentId", assessmentId);
      if (caption) formData.append("caption", caption);

      const result = await uploadPhoto(formData);

      if (result.error) {
        setError(result.error);
      } else {
        // Reset form
        setSelectedFile(null);
        setPreview(null);
        setCaption("");
        onUploadComplete?.();
      }
    } catch (err) {
      setError("Failed to upload photo");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    setError(null);
  };

  // Show file rejection errors
  const fileRejectionError = fileRejections[0]?.errors[0]?.message;

  return (
    <div className={cn("space-y-4", className)}>
      {!preview ? (
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            fileRejectionError && "border-destructive"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="bg-muted rounded-full p-4">
              <Upload className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Drop the photo here"
                  : "Drag & drop a photo or click to browse"}
              </p>
              <p className="text-muted-foreground text-xs">
                JPEG, PNG, WEBP, or HEIC up to 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-muted relative overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="h-auto max-h-96 w-full object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleCancel}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* File info */}
          <div className="text-muted-foreground flex items-start gap-2 text-sm">
            <ImageIcon className="mt-0.5 h-4 w-4" />
            <div>
              <p className="text-foreground font-medium">
                {selectedFile?.name}
              </p>
              <p>{(selectedFile!.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          {/* Caption */}
          <div>
            <label
              htmlFor="caption"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Caption (optional)
            </label>
            <Textarea
              id="caption"
              placeholder="Add a caption or notes about this photo..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={uploading}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Upload button */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Photo"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Error messages */}
      {(error || fileRejectionError) && (
        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
          <p className="text-destructive text-sm">
            {error || fileRejectionError}
          </p>
        </div>
      )}
    </div>
  );
}
