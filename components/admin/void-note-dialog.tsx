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
import { voidNote } from "@/app/actions/approval-workflow";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

type VoidNoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string | null;
  patientName?: string;
  onSuccess?: () => void;
};

export function VoidNoteDialog({
  open,
  onOpenChange,
  visitId,
  patientName,
  onSuccess,
}: VoidNoteDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!visitId) {
      toast.error("No visit selected");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please enter a reason for voiding");
      return;
    }

    setIsLoading(true);
    try {
      const result = await voidNote(visitId, reason);

      if (result.success) {
        toast.success("Note voided successfully");
        setReason("");
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to void note");
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
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Void Note
            </DialogTitle>
            <DialogDescription>
              {patientName
                ? `Permanently void ${patientName}'s visit note`
                : "Permanently void this visit note"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Voiding will mark this note as invalid. It will be visible for
                audit purposes but cannot be edited or restored.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="void-reason">Reason for voiding *</Label>
              <Textarea
                id="void-reason"
                placeholder="Example: Note documented on wrong patient (John Doe vs Jane Doe)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be saved in the audit trail and cannot be
                changed.
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
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading}
            >
              {isLoading ? "Voiding..." : "Void Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
