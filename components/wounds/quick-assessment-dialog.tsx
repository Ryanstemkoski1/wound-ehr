"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Plus, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Visit = {
  id: string;
  visitDate: Date;
  visitType: string;
  assessmentCount: number;
};

type QuickAssessmentDialogProps = {
  patientId: string;
  woundId: string;
  woundNumber: string;
  visits: Visit[];
  children?: React.ReactNode;
};

export function QuickAssessmentDialog({
  patientId,
  woundId,
  woundNumber,
  visits,
  children,
}: QuickAssessmentDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleVisitSelect = (visitId: string) => {
    // Navigate to the visit page which has the Add Assessment button
    // The URL will show the assessment type selector
    router.push(
      `/dashboard/patients/${patientId}/visits/${visitId}?wound=${woundId}&quick=true`
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Assessment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Assessment for Wound #{woundNumber}</DialogTitle>
          <DialogDescription>
            Select the visit date when you want to document this wound
            assessment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {visits.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No visits found</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Create a visit first before adding assessments
              </p>
              <Button
                onClick={() => {
                  router.push(`/dashboard/patients/${patientId}?tab=visits`);
                  setOpen(false);
                }}
              >
                Go to Patient Visits
              </Button>
            </div>
          ) : (
            <>
              <p className="text-primary/80 bg-primary/5 border-primary/20 rounded-lg border px-3 py-2 text-sm">
                <strong>Quick Tip:</strong> Select a recent visit or create a
                new one. You&apos;ll be able to choose the assessment type next.
              </p>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {visits.map((visit) => (
                    <button
                      key={visit.id}
                      onClick={() => handleVisitSelect(visit.id)}
                      className="hover:border-primary hover:bg-accent group w-full rounded-lg border p-4 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <Calendar className="text-muted-foreground h-4 w-4" />
                            <span className="font-semibold">
                              {format(
                                new Date(visit.visitDate),
                                "EEEE, MMMM d, yyyy"
                              )}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {visit.visitType.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground ml-7 text-sm">
                            {visit.assessmentCount === 0
                              ? "No assessments yet"
                              : `${visit.assessmentCount} assessment${visit.assessmentCount > 1 ? "s" : ""} documented`}
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    router.push(
                      `/dashboard/patients/${patientId}?tab=visits&new=true`
                    );
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Visit
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
