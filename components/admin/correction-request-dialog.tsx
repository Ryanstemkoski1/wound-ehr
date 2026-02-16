"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requestCorrection } from "@/app/actions/approval-workflow";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CorrectionRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string | null;
  patientName?: string;
  onSuccess?: () => void;
};

export function CorrectionRequestDialog({
  open,
  onOpenChange,
  visitId,
  patientName,
  onSuccess,
}: CorrectionRequestDialogProps) {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!visitId) {
      toast.error("No visit selected");
      return;
    }

    if (!notes.trim()) {
      toast.error("Please enter correction notes");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestCorrection(visitId, notes);

      if (result.success) {
        toast.success("Correction request sent to clinician");
        setNotes("");
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to request correction");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Correction</DialogTitle>
            <DialogDescription>
              {patientName
                ? `Request corrections for ${patientName}'s visit note`
                : "Request corrections for this visit note"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="correction-notes">
                What needs to be corrected? *
              </Label>
              <Textarea
                id="correction-notes"
                placeholder="Example: Please verify left vs right heel location. Check Stage 3 vs Stage 4 classification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what needs correction. The clinician will see
                these notes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send to Clinician"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
