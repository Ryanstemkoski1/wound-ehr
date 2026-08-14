"use client";

// Deactivate flow. The page preloads per-user open-note counts
// (getOpenNoteCountsByNurse); when the user still has open field
// notes the admin must either reassign each visit from /schedule
// first, or explicitly acknowledge leaving the notes unassigned —
// they surface in the inbox Overdue queue until reassigned. The
// removal itself reuses the existing removeUserFromTenant action.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Loader2, UserX } from "lucide-react";
import { removeUserFromTenant } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminUserRow } from "./types";

export function DeactivateUserDialog({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const countUnknown = user.openNotes === null;
  const openNotes = user.openNotes ?? 0;
  const hasOpenWork = countUnknown || openNotes > 0;
  const canConfirm = (!hasOpenWork || acknowledged) && !submitting;

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const result = await removeUserFromTenant(user.userId);
      if ("error" in result) {
        // removeUserFromTenant removes the org role first, then tries a
        // full account delete. The delete fails for users referenced by
        // visit history (visits.clinician_id has no ON DELETE action) —
        // access is still revoked, so treat that branch as done.
        if (result.error?.startsWith("Failed to delete user account")) {
          toast.success(
            `${user.name} removed from your organization. The underlying account was kept because past visits reference it — their access is revoked either way.`
          );
          setOpen(false);
          setAcknowledged(false);
          router.refresh();
          return;
        }
        toast.error(result.error ?? "Failed to deactivate the user");
        return;
      }
      toast.success(result.message ?? `${user.name} deactivated`);
      setOpen(false);
      setAcknowledged(false);
      router.refresh();
    } catch {
      toast.error("Failed to deactivate the user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAcknowledged(false);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 text-destructive hover:text-destructive"
        >
          Deactivate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate {user.name}</DialogTitle>
          <DialogDescription>
            Removes {user.email} from your organization. If they belong to no other organization,
            the account is deleted entirely.
          </DialogDescription>
        </DialogHeader>

        {hasOpenWork && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
              <div className="min-w-0 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {countUnknown
                    ? "The open-note check is unavailable right now."
                    : `${openNotes} open note${openNotes === 1 ? "" : "s"} still assigned to ${user.name}.`}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {countUnknown
                    ? "Review the schedule for visits assigned to this user before continuing."
                    : "Reassign each visit to another nurse from the schedule, or deactivate anyway and leave the notes unassigned."}
                </p>
                <Button asChild variant="outline" size="sm" className="min-h-11">
                  <Link href="/schedule">
                    <CalendarClock />
                    Reassign in Schedule
                  </Link>
                </Button>
                <label className="flex cursor-pointer items-start gap-3 pt-1">
                  <Checkbox
                    checked={acknowledged}
                    onCheckedChange={(value) => setAcknowledged(value === true)}
                    className="mt-0.5"
                    aria-label={
                      countUnknown
                        ? "I have reviewed the schedule"
                        : "Leave these notes unassigned and flagged"
                    }
                  />
                  <span className="text-sm leading-snug text-foreground">
                    {countUnknown
                      ? "I have reviewed the schedule — proceed with deactivation."
                      : "Leave these notes unassigned and flagged — they stay visible in the inbox Overdue queue until reassigned."}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-h-11"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <UserX />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
