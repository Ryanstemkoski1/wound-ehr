"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Trash2, Calendar, User, FileText } from "lucide-react";
import { deletePhoto } from "@/app/actions/photos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

type Photo = {
  id: string;
  url: string;
  filename: string;
  caption: string | null;
  uploadedAt: Date;
  wound: {
    id: string;
    woundNumber: string;
    location: string;
  };
  visit: {
    id: string;
    visitDate: Date;
    visitType: string;
  } | null;
  assessment: {
    id: string;
    healingStatus: string | null;
  } | null;
  uploader: {
    name: string | null;
    email: string;
  };
};

type PhotoGalleryProps = {
  photos: Photo[];
  onPhotoDeleted?: () => void;
  className?: string;
};

export function PhotoGallery({
  photos,
  onPhotoDeleted,
  className,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!photoToDelete) return;

    setDeleting(true);
    try {
      const result = await deletePhoto(photoToDelete);
      if (!result.error) {
        setPhotoToDelete(null);
        setSelectedPhoto(null);
        onPhotoDeleted?.();
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (photos.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <div className="flex flex-col items-center gap-2">
          <div className="bg-muted rounded-full p-4">
            <FileText className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-muted-foreground text-sm">
            No photos uploaded yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
          className
        )}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group bg-muted hover:ring-primary relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all hover:ring-2"
            onClick={() => setSelectedPhoto(photo)}
          >
            <Image
              src={photo.url}
              alt={
                photo.caption ||
                `Photo from ${format(photo.uploadedAt, "MMM d, yyyy")}`
              }
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 flex items-end bg-black/0 p-2 transition-colors group-hover:bg-black/40">
              <p className="text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {format(photo.uploadedAt, "MMM d, yyyy")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Detail Dialog */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo Details</DialogTitle>
            <DialogDescription>
              {selectedPhoto?.caption ||
                format(
                  selectedPhoto?.uploadedAt || new Date(),
                  "MMMM d, yyyy 'at' h:mm a"
                )}
            </DialogDescription>
          </DialogHeader>

          {selectedPhoto && (
            <div className="space-y-4">
              {/* Photo */}
              <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Wound photo"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Upload Date</p>
                      <p className="text-muted-foreground">
                        {format(
                          selectedPhoto.uploadedAt,
                          "MMMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <User className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Uploaded By</p>
                      <p className="text-muted-foreground">
                        {selectedPhoto.uploader.name ||
                          selectedPhoto.uploader.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedPhoto.visit && (
                    <div>
                      <p className="font-medium">Visit Date</p>
                      <p className="text-muted-foreground">
                        {format(selectedPhoto.visit.visitDate, "MMMM d, yyyy")}
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {selectedPhoto.visit.visitType.replace("_", " ")}
                      </p>
                    </div>
                  )}

                  {selectedPhoto.assessment?.healingStatus && (
                    <div>
                      <p className="font-medium">Healing Status</p>
                      <p className="text-muted-foreground capitalize">
                        {selectedPhoto.assessment.healingStatus.replace(
                          "_",
                          " "
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedPhoto.caption && (
                <div>
                  <p className="mb-1 text-sm font-medium">Caption</p>
                  <p className="text-muted-foreground text-sm">
                    {selectedPhoto.caption}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  {selectedPhoto.filename}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPhotoToDelete(selectedPhoto.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!photoToDelete}
        onOpenChange={(open: boolean) => !open && setPhotoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
