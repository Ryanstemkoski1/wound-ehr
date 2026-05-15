"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { copyForwardToVisit } from "@/app/actions/visits";

type PriorVisit = {
  id: string;
  visitDate: Date;
  visitType: string;
  assessmentCount: number;
};

type Props = {
  targetVisitId: string;
  patientId?: string;
  priorVisits: PriorVisit[];
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  routine: "Routine",
  initial: "Initial",
  follow_up: "Follow-up",
  in_person: "In-Person",
  telemed: "Telemedicine",
};

export function CopyForwardDialog({ targetVisitId, priorVisits }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [pending, setPending] = useState(false);

  const eligibleVisits = priorVisits.filter(
    (v) => v.id !== targetVisitId && v.assessmentCount > 0
  );

  const selectedVisit = eligibleVisits.find((v) => v.id === selectedVisitId);

  async function handleCopy() {
    if (!selectedVisitId) {
      toast.error("Select a visit to copy from");
      return;
    }
    setPending(true);
    try {
      const result = await copyForwardToVisit(selectedVisitId, targetVisitId);
      if (!result.success) {
        toast.error(result.error ?? "Copy forward failed");
        return;
      }
      const parts: string[] = [];
      if (result.assessmentsCopied) {
        parts.push(
          `${result.assessmentsCopied} assessment${result.assessmentsCopied !== 1 ? "s" : ""}`
        );
      }
      if (result.treatmentsCopied) {
        parts.push(
          `${result.treatmentsCopied} treatment order${result.treatmentsCopied !== 1 ? "s" : ""}`
        );
      }
      toast.success(
        parts.length > 0
          ? `Copied ${parts.join(" and ")} from prior visit`
          : "Nothing new to copy — wounds already have entries on this visit"
      );
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (eligibleVisits.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" />
          Copy Forward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Forward from Prior Visit</DialogTitle>
          <DialogDescription>
            Pre-populate this visit&apos;s assessments and treatment orders from
            a previously documented visit. Wounds that already have entries on
            this visit are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="source-visit">Select source visit</Label>
            <Select value={selectedVisitId} onValueChange={setSelectedVisitId}>
              <SelectTrigger id="source-visit">
                <SelectValue placeholder="Pick a visit…" />
              </SelectTrigger>
              <SelectContent>
                {eligibleVisits.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="flex items-center gap-2">
                      {format(new Date(v.visitDate), "MMM d, yyyy")}
                      <span className="text-muted-foreground text-xs">
                        {VISIT_TYPE_LABELS[v.visitType] ?? v.visitType}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {v.assessmentCount} wound
                        {v.assessmentCount !== 1 ? "s" : ""}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVisit && (
            <div className="rounded-lg border bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900">
              <p className="text-muted-foreground mb-1 font-medium">
                What will be copied:
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-zinc-700 dark:text-zinc-300">
                <li>
                  {selectedVisit.assessmentCount} wound assessment
                  {selectedVisit.assessmentCount !== 1 ? "s" : ""}{" "}
                  (measurements, tissue status, characteristics)
                </li>
                <li>
                  Matching treatment orders (dressings, debridement, NPWT)
                </li>
              </ul>
              <p className="text-muted-foreground mt-2 text-xs">
                Wounds already documented on this visit will not be overwritten.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!selectedVisitId || pending}>
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
