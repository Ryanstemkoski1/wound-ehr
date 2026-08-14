"use client";

// A visit block on the schedule grid. Clicking it opens a popover with
// visit details and lifecycle actions (open note / reschedule / reassign /
// cancel / no-show). Every mutation toasts its error branch and refreshes
// the server-rendered grid on success.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, UserRound } from "lucide-react";
import {
  cancelVisit,
  markNoShow,
  reassignVisit,
  rescheduleFieldVisit,
  type VisitCard,
} from "@/app/actions/field-schedule";
import { StatusChip } from "@/components/field/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { cardStart, fmtTime } from "./helpers";
import type { NurseOption } from "./types";

type Mode = "menu" | "reschedule" | "reassign" | "cancel" | "noshow";

/** Statuses where the visit can still be cancelled / rescheduled / no-showed. */
const LIFECYCLE_STATUSES = ["scheduled", "in-progress"];
/** Statuses where the visit can be handed to another nurse. */
const REASSIGNABLE_STATUSES = ["scheduled", "in-progress", "needs_correction"];

const DURATION_OPTIONS = ["30", "45", "60", "90", "120"];

interface VisitBlockProps {
  card: VisitCard;
  nurses: NurseOption[];
  nursesLoadError?: string | null;
}

export function VisitBlock({ card, nurses, nursesLoadError }: VisitBlockProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [pending, startTransition] = useTransition();

  const start = cardStart(card);

  const [rescheduleAt, setRescheduleAt] = useState("");
  const [duration, setDuration] = useState("keep");
  const [newNurseId, setNewNurseId] = useState("");
  const [noShowReason, setNoShowReason] = useState("");

  const canLifecycle = LIFECYCLE_STATUSES.includes(card.status);
  const canReassign = REASSIGNABLE_STATUSES.includes(card.status);
  const reassignOptions = nurses.filter((n) => n.id !== card.nurseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setMode("menu");
    if (next) {
      setRescheduleAt(start ? format(start, "yyyy-MM-dd'T'HH:mm") : "");
      setDuration("keep");
      setNewNurseId("");
      setNoShowReason("");
    }
  };

  const run = (
    action: () => Promise<{ success: true } | { success: false; error: string }>,
    successMessage: string
  ) => {
    startTransition(async () => {
      const res = await action();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      setMode("menu");
      router.refresh();
    });
  };

  const handleReschedule = () => {
    const d = new Date(rescheduleAt);
    if (Number.isNaN(d.getTime())) {
      toast.error("Enter a valid date and time");
      return;
    }
    run(
      () =>
        rescheduleFieldVisit(
          card.visitId,
          d.toISOString(),
          duration === "keep" ? undefined : Number(duration)
        ),
      "Visit rescheduled"
    );
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="min-h-11 w-full rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex items-center gap-1.5">
            {start ? (
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {fmtTime(start)}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground">No time</span>
            )}
            {card.status === "scheduled" ? (
              <span
                className={cn(
                  "ml-auto inline-block size-2 shrink-0 rounded-full",
                  card.preppedAt ? "bg-primary" : "bg-amber-500"
                )}
              >
                <span className="sr-only">{card.preppedAt ? "Prepped" : "Needs phone prep"}</span>
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs font-medium text-foreground">
            {card.patientName}
          </span>
          <StatusChip chip={card.chip} className="mt-1 px-2 py-0.5 text-[10px]" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{card.patientName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[card.noteTypeLabel, card.facilityName].filter(Boolean).join(" · ")}
              </p>
            </div>
            <StatusChip chip={card.chip} className="shrink-0" />
          </div>
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 shrink-0" />
              {start ? `${format(start, "EEE, MMM d")} · ${fmtTime(start)}` : "Not scheduled"}
            </span>
            <span className="flex items-center gap-1.5">
              <UserRound className="size-3.5 shrink-0" />
              {card.nurseName ?? "Unassigned"}
            </span>
          </div>
        </div>

        {mode === "menu" ? (
          <div className="flex flex-col gap-0.5 p-2">
            <Button asChild variant="ghost" className="h-11 w-full justify-start">
              <Link href={`/notes/${card.noteId}`}>Open note</Link>
            </Button>
            {canLifecycle ? (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start"
                onClick={() => setMode("reschedule")}
              >
                Reschedule
              </Button>
            ) : null}
            {canReassign ? (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start"
                onClick={() => setMode("reassign")}
              >
                Reassign
              </Button>
            ) : null}
            {canLifecycle ? (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start"
                onClick={() => setMode("noshow")}
              >
                Mark no-show
              </Button>
            ) : null}
            {canLifecycle ? (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setMode("cancel")}
              >
                Cancel visit
              </Button>
            ) : null}
          </div>
        ) : null}

        {mode === "reschedule" ? (
          <div className="p-3">
            <ModeHeader title="Reschedule" onBack={() => setMode("menu")} />
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`resched-${card.visitId}`}>New date &amp; time</Label>
                <Input
                  id={`resched-${card.visitId}`}
                  type="datetime-local"
                  value={rescheduleAt}
                  onChange={(e) => setRescheduleAt(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Keep current duration</SelectItem>
                    {DURATION_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="h-11 w-full"
                disabled={pending || !rescheduleAt}
                onClick={handleReschedule}
              >
                {pending ? "Rescheduling…" : "Reschedule visit"}
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "reassign" ? (
          <div className="p-3">
            <ModeHeader title="Reassign" onBack={() => setMode("menu")} />
            <div className="mt-2 flex flex-col gap-3">
              {reassignOptions.length === 0 ? (
                <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {nursesLoadError ?? "No other nurses are available to take this visit."}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label>New nurse</Label>
                  <Select value={newNurseId} onValueChange={setNewNurseId}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Choose a nurse" />
                    </SelectTrigger>
                    <SelectContent>
                      {reassignOptions.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} ({n.todayCount} today)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="h-11 w-full"
                disabled={pending || !newNurseId}
                onClick={() => run(() => reassignVisit(card.visitId, newNurseId), "Visit reassigned")}
              >
                {pending ? "Reassigning…" : "Reassign visit"}
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "noshow" ? (
          <div className="p-3">
            <ModeHeader title="Mark no-show" onBack={() => setMode("menu")} />
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`noshow-${card.visitId}`}>Reason</Label>
                <Input
                  id={`noshow-${card.visitId}`}
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  placeholder="e.g. Patient not home, no answer"
                  maxLength={500}
                  className="h-11"
                />
              </div>
              <Button
                className="h-11 w-full"
                disabled={pending || noShowReason.trim().length === 0}
                onClick={() =>
                  run(() => markNoShow(card.visitId, noShowReason.trim()), "Marked as no-show")
                }
              >
                {pending ? "Saving…" : "Mark no-show"}
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "cancel" ? (
          <div className="p-3">
            <ModeHeader title="Cancel visit" onBack={() => setMode("menu")} />
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-sm text-foreground">
                Cancel this visit for {card.patientName}?
              </p>
              {card.progressDone > 0 ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
                  The note has documentation ({card.progressDone} section
                  {card.progressDone === 1 ? "" : "s"} started). Cancelling keeps it read-only.
                </p>
              ) : null}
              <Button
                variant="destructive"
                className="h-11 w-full"
                disabled={pending}
                onClick={() => run(() => cancelVisit(card.visitId), "Visit cancelled")}
              >
                {pending ? "Cancelling…" : "Cancel visit"}
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ModeHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back">
        <ArrowLeft />
      </Button>
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  );
}
