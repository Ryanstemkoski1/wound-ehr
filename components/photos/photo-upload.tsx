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

type SelectedPhoto = {
  file: File;
  preview: string;
  caption: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
};

export function PhotoUpload({
  woundId,
  visitId,
  assessmentId,
  onUploadComplete,
  className,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map((file) => {
      const reader = new FileReader();
      const preview = URL.createObjectURL(file);

      return {
        file,
        preview,
        caption: "",
        uploading: false,
        uploaded: false,
      };
    });

    setPhotos((prev) => [...prev, ...newPhotos]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "image/*": [".jpeg", ".jpg", ".png", ".webp", ".heic"],
      },
      maxSize: 10 * 1024 * 1024, // 10MB
      multiple: true,
    });

  const handleUploadSingle = async (index: number) => {
    const photo = photos[index];
    if (!photo || photo.uploading || photo.uploaded) return;

    // Mark as uploading
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, uploading: true } : p))
    );

    try {
      const formData = new FormData();
      formData.append("file", photo.file);
      formData.append("woundId", woundId);
      if (visitId) formData.append("visitId", visitId);
      if (assessmentId) formData.append("assessmentId", assessmentId);
      if (photo.caption) formData.append("caption", photo.caption);

      const result = await uploadPhoto(formData);

      if (result.error) {
        setPhotos((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, uploading: false, error: result.error }
              : p
          )
        );
      } else {
        setPhotos((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, uploading: false, uploaded: true } : p
          )
        );
        onUploadComplete?.();
      }
    } catch (err) {
      setPhotos((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, uploading: false, error: "Failed to upload photo" }
            : p
        )
      );
      console.error(err);
    }
  };

  const handleUploadAll = async () => {
    const unuploadedPhotos = photos
      .map((p, index) => ({ photo: p, index }))
      .filter(({ photo }) => !photo.uploaded && !photo.uploading);

    for (const { index } of unuploadedPhotos) {
      await handleUploadSingle(index);
    }
  };

  const handleRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  };

  // Show file rejection errors
  const fileRejectionError = fileRejections[0]?.errors[0]?.message;

  const hasUploading = photos.some((p) => p.uploading);
  const hasUnuploaded = photos.some((p) => !p.uploaded);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload zone - always visible */}
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
                ? "Drop photos here"
                : "Drag & drop photos or click to browse"}
            </p>
            <p className="text-muted-foreground text-xs">
              JPEG, PNG, WEBP, or HEIC up to 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Selected photos list */}
      {photos.length > 0 && (
        <div className="space-y-3">
          {photos.map((photo, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-4",
                photo.uploaded && "bg-green-50 border-green-200"
              )}
            >
              <div className="flex gap-4">
                {/* Preview thumbnail */}
                <div className="bg-muted relative h-24 w-24 flex-shrink-0 overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.preview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  {photo.uploaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                      <div className="bg-green-500 text-white rounded-full p-1">
                        ✓
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {photo.file.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {(photo.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {!photo.uploaded && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemove(index)}
                        disabled={photo.uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {!photo.uploaded && (
                    <Textarea
                      placeholder="Add a caption (optional)..."
                      value={photo.caption}
                      onChange={(e) =>
                        handleCaptionChange(index, e.target.value)
                      }
                      disabled={photo.uploading}
                      rows={2}
                      className="text-sm"
                    />
                  )}

                  {photo.uploaded && photo.caption && (
                    <p className="text-muted-foreground text-sm">
                      {photo.caption}
                    </p>
                  )}

                  {photo.error && (
                    <p className="text-destructive text-sm">{photo.error}</p>
                  )}

                  {!photo.uploaded && (
                    <Button
                      size="sm"
                      onClick={() => handleUploadSingle(index)}
                      disabled={photo.uploading}
                      className="w-full"
                    >
                      {photo.uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload This Photo"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Upload all button */}
          {hasUnuploaded && photos.length > 1 && (
            <Button
              onClick={handleUploadAll}
              disabled={hasUploading}
              className="w-full"
            >
              {hasUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload All Photos (${photos.filter((p) => !p.uploaded).length})`
              )}
            </Button>
          )}
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
