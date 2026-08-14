"use client";

// Small mutation affordances used by inbox rows: Nudge (corrections
// out) and Reopen-for-correction (completed tab). Both stop click
// propagation so they don't trigger the row's navigation.

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, RotateCcw } from "lucide-react";
import { nudgeNote, reopenApprovedNote } from "@/app/actions/field-notes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ButtonSize = "default" | "sm";

export function NudgeButton({
  noteId,
  className,
  size = "sm",
}: {
  noteId: string;
  className?: string;
  size?: ButtonSize;
}) {
  const [pending, setPending] = useState(false);
  const [nudged, setNudged] = useState(false);

  async function handleNudge(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setPending(true);
    const result = await nudgeNote(noteId);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setNudged(true);
    toast.success("Nurse nudged about this correction");
  }

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      onClick={handleNudge}
      disabled={pending || nudged}
    >
      <BellRing /> {nudged ? "Nudged" : "Nudge"}
    </Button>
  );
}

export function ReopenDialog({
  noteId,
  patientName,
  className,
  size = "sm",
}: {
  noteId: string;
  patientName: string;
  className?: string;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    const result = await reopenApprovedNote(noteId, reason.trim());
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Note reopened for correction");
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <RotateCcw /> Reopen
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Reopen for correction</DialogTitle>
            <DialogDescription>
              The approved note for {patientName} returns to the nurse as Needs Correction. The
              reason is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`reopen-reason-${noteId}`}>Reason</Label>
            <Textarea
              id={`reopen-reason-${noteId}`}
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wound #2 length recorded incorrectly"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={pending || reason.trim().length < 3}>
              {pending ? "Reopening…" : "Reopen note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
