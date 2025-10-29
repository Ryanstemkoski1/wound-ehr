"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/library";

type ComparisonPhoto = {
  id: string;
  url: string;
  caption: string | null;
  uploadedAt: Date;
  visit: {
    visitDate: Date;
  } | null;
  assessment: {
    healingStatus: string | null;
    length: Decimal | null;
    width: Decimal | null;
    depth: Decimal | null;
    area: Decimal | null;
  } | null;
};

type PhotoComparisonProps = {
  photos: ComparisonPhoto[];
  className?: string;
};

export function PhotoComparison({ photos, className }: PhotoComparisonProps) {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(Math.min(1, photos.length - 1));

  if (photos.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <p className="text-muted-foreground text-sm">
          No photos available for comparison
        </p>
      </div>
    );
  }

  if (photos.length === 1) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <p className="text-muted-foreground text-sm">
          Add more photos to enable comparison view
        </p>
      </div>
    );
  }

  const leftPhoto = photos[leftIndex];
  const rightPhoto = photos[rightIndex];

  const handleSwap = () => {
    const temp = leftIndex;
    setLeftIndex(rightIndex);
    setRightIndex(temp);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left Photo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {leftPhoto.visit
                ? format(leftPhoto.visit.visitDate, "MMM d, yyyy")
                : format(leftPhoto.uploadedAt, "MMM d, yyyy")}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setLeftIndex(
                    leftIndex > 0 ? leftIndex - 1 : photos.length - 1
                  )
                }
                disabled={photos.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setLeftIndex(
                    leftIndex < photos.length - 1 ? leftIndex + 1 : 0
                  )
                }
                disabled={photos.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
            <Image
              src={leftPhoto.url}
              alt={leftPhoto.caption || "Wound photo"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {leftPhoto.assessment && (
            <div className="space-y-2 text-sm">
              {leftPhoto.assessment.healingStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="capitalize">
                    {leftPhoto.assessment.healingStatus.replace("_", " ")}
                  </Badge>
                </div>
              )}
              {leftPhoto.assessment.length && leftPhoto.assessment.width && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">
                    {leftPhoto.assessment.length.toString()} ×{" "}
                    {leftPhoto.assessment.width.toString()} cm
                  </span>
                </div>
              )}
              {leftPhoto.assessment.depth && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Depth:</span>
                  <span className="font-medium">
                    {leftPhoto.assessment.depth.toString()} cm
                  </span>
                </div>
              )}
              {leftPhoto.assessment.area && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Area:</span>
                  <span className="font-medium">
                    {leftPhoto.assessment.area.toString()} cm²
                  </span>
                </div>
              )}
            </div>
          )}

          {leftPhoto.caption && (
            <p className="text-muted-foreground text-sm">{leftPhoto.caption}</p>
          )}
        </div>

        {/* Right Photo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {rightPhoto.visit
                ? format(rightPhoto.visit.visitDate, "MMM d, yyyy")
                : format(rightPhoto.uploadedAt, "MMM d, yyyy")}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setRightIndex(
                    rightIndex > 0 ? rightIndex - 1 : photos.length - 1
                  )
                }
                disabled={photos.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setRightIndex(
                    rightIndex < photos.length - 1 ? rightIndex + 1 : 0
                  )
                }
                disabled={photos.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
            <Image
              src={rightPhoto.url}
              alt={rightPhoto.caption || "Wound photo"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {rightPhoto.assessment && (
            <div className="space-y-2 text-sm">
              {rightPhoto.assessment.healingStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="capitalize">
                    {rightPhoto.assessment.healingStatus.replace("_", " ")}
                  </Badge>
                </div>
              )}
              {rightPhoto.assessment.length && rightPhoto.assessment.width && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">
                    {rightPhoto.assessment.length.toString()} ×{" "}
                    {rightPhoto.assessment.width.toString()} cm
                  </span>
                </div>
              )}
              {rightPhoto.assessment.depth && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Depth:</span>
                  <span className="font-medium">
                    {rightPhoto.assessment.depth.toString()} cm
                  </span>
                </div>
              )}
              {rightPhoto.assessment.area && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Area:</span>
                  <span className="font-medium">
                    {rightPhoto.assessment.area.toString()} cm²
                  </span>
                </div>
              )}
            </div>
          )}

          {rightPhoto.caption && (
            <p className="text-muted-foreground text-sm">
              {rightPhoto.caption}
            </p>
          )}
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={handleSwap}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Swap Photos
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="text-muted-foreground text-center text-xs">
        Showing {leftIndex + 1} and {rightIndex + 1} of {photos.length} photos
      </div>
    </div>
  );
}
