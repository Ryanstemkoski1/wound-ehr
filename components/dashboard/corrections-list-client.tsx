"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  markAsCorrected,
  type CorrectionVisit,
} from "@/app/actions/approval-workflow";
import { toast } from "sonner";

type CorrectionsListClientProps = {
  corrections: CorrectionVisit[];
};

export function CorrectionsListClient({
  corrections,
}: CorrectionsListClientProps) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);

  const handleMarkCorrected = async (visitId: string) => {
    setMarking(visitId);
    const result = await markAsCorrected(visitId);

    if (result.success) {
      toast.success("Note marked as corrected and sent back to office");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to mark as corrected");
    }
    setMarking(null);
  };

  if (corrections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-green-100 p-5 dark:bg-green-900/30">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg font-semibold">All caught up!</p>
          <p className="text-muted-foreground mt-1 text-sm">
            No corrections needed — all your notes are up to date
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {corrections.map((visit) => (
        <Card
          key={visit.id}
          className="border-destructive/40 border-l-destructive border-l-4 transition-all hover:shadow-md"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {visit.patient.first_name} {visit.patient.last_name}
                </CardTitle>
                <CardDescription>
                  MRN: {visit.patient.mrn} • Visit:{" "}
                  {format(new Date(visit.visit_date), "MMM d, yyyy")}
                </CardDescription>
              </div>
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3 w-3" />
                Correction Needed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {visit.correction_notes && visit.correction_notes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Correction Requests:</h4>
                {visit.correction_notes.map((correction, index) => (
                  <div
                    key={index}
                    className="bg-muted space-y-1 rounded-lg p-3"
                  >
                    <p className="text-sm">{correction.note}</p>
                    <p className="text-muted-foreground text-xs">
                      Requested:{" "}
                      {format(
                        new Date(correction.requested_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  router.push(
                    `/dashboard/patients/${visit.patient.id}/visits/${visit.id}`
                  )
                }
                variant="default"
              >
                Edit Visit Note
              </Button>
              <Button
                onClick={() => handleMarkCorrected(visit.id)}
                variant="outline"
                disabled={marking === visit.id}
              >
                {marking === visit.id
                  ? "Marking..."
                  : "Mark as Corrected & Resubmit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
