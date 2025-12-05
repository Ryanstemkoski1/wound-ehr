"use client";

import Link from "next/link";
import { format } from "date-fns";
import { FileText, Calendar, Ruler, Activity, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Assessment = {
  id: string;
  visitId: string;
  assessmentType: string;
  length: number | null;
  width: number | null;
  depth: number | null;
  area: number | null;
  healingStatus: string | null;
  createdAt: string;
  visit: {
    id: string;
    visitDate: Date;
    visitType: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  photos: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
};

type WoundAssessmentHistoryProps = {
  patientId: string;
  woundId: string;
  assessments: Assessment[];
};

export function WoundAssessmentHistory({
  patientId,
  woundId,
  assessments,
}: WoundAssessmentHistoryProps) {
  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">No assessments yet</h3>
        <p className="text-muted-foreground mt-2">
          Assessments will appear here as they are documented during visits
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        {/* Assessment cards */}
        <div className="space-y-6">
          {assessments.map((assessment, index) => {
            const hasMeasurements =
              assessment.length !== null ||
              assessment.width !== null ||
              assessment.depth !== null ||
              assessment.area !== null;

            return (
              <div key={assessment.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 h-8 w-8 rounded-full bg-background border-4 border-primary flex items-center justify-center">
                  <FileText className="h-3 w-3 text-primary" />
                </div>

                {/* Card */}
                <Link
                  href={`/dashboard/patients/${patientId}/visits/${assessment.visitId}/assessments/${assessment.id}/edit`}
                >
                  <Card className="group hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="font-semibold"
                            >
                              {assessment.assessmentType === "standard"
                                ? "Standard Assessment"
                                : assessment.assessmentType === "wound_note"
                                ? "Wound Note"
                                : assessment.assessmentType === "grafting"
                                ? "Grafting Assessment"
                                : assessment.assessmentType === "skin_sweep"
                                ? "Skin Sweep"
                                : assessment.assessmentType}
                            </Badge>

                            {assessment.healingStatus && (
                              <Badge
                                variant={
                                  assessment.healingStatus === "improving"
                                    ? "default"
                                    : assessment.healingStatus === "stable"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="capitalize"
                              >
                                {assessment.healingStatus}
                              </Badge>
                            )}

                            {index === 0 && (
                              <Badge variant="outline" className="text-primary">
                                Latest
                              </Badge>
                            )}
                          </div>

                          {/* Visit Info */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {format(
                                  new Date(assessment.visit.visitDate),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 capitalize">
                              <span className="text-muted-foreground">•</span>
                              {assessment.visit.visitType.replace("_", " ")}
                            </div>
                            {assessment.photos.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5" />
                                <span>{assessment.photos.length} photo(s)</span>
                              </div>
                            )}
                          </div>

                          {/* Measurements */}
                          {hasMeasurements && (
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Ruler className="h-3.5 w-3.5" />
                                <span>Measurements:</span>
                              </div>
                              {assessment.length !== null && (
                                <span className="font-medium">
                                  L: {assessment.length} cm
                                </span>
                              )}
                              {assessment.width !== null && (
                                <span className="font-medium">
                                  W: {assessment.width} cm
                                </span>
                              )}
                              {assessment.depth !== null && (
                                <span className="font-medium">
                                  D: {assessment.depth} cm
                                </span>
                              )}
                              {assessment.area !== null && (
                                <span className="font-medium">
                                  Area: {assessment.area} cm²
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Photos preview */}
                        {assessment.photos.length > 0 && (
                          <div className="flex gap-2">
                            {assessment.photos.slice(0, 3).map((photo) => (
                              <div
                                key={photo.id}
                                className="w-16 h-16 rounded-md overflow-hidden border"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.filename}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {assessment.photos.length > 3 && (
                              <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center text-xs font-medium">
                                +{assessment.photos.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Click to edit hint */}
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          Click to view full assessment details →
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
