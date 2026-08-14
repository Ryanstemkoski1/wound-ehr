// Nurse home — one visit card. Server component: the whole card is a
// stretched-link tap target into the note; the only client leaf is the
// "Start visit" button on a scheduled Today card.

import Link from "next/link";
import { format, isYesterday, parseISO } from "date-fns";
import { ChevronRight, CircleCheck } from "lucide-react";
import type { VisitCard } from "@/app/actions/field-schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/field/ui/status-chip";
import { StartVisitButton } from "./start-visit-button";
import { cn } from "@/lib/utils";

export type HomeCardVariant = "correction" | "overdue" | "today" | "upcoming";

function startDate(card: VisitCard): Date | null {
  const iso = card.scheduledStartAt ?? card.visitDate;
  return iso ? parseISO(iso) : null;
}

function overdueLabel(start: Date | null): string {
  if (!start) return "Not finalized";
  if (isYesterday(start)) return "Yesterday — not finalized";
  return `${format(start, "EEE, MMM d")} — not finalized`;
}

function correctionLabel(count: number): string {
  if (count === 0) return "Returned for corrections";
  return `${count} correction${count === 1 ? "" : "s"} requested`;
}

export function HomeVisitCard({
  card,
  variant,
}: {
  card: VisitCard;
  variant: HomeCardVariant;
}) {
  const start = startDate(card);
  const noteHref = `/notes/${card.noteId}`;
  const attention = variant === "correction" || variant === "overdue";

  return (
    <article
      className={cn(
        "relative flex min-h-[44px] flex-col gap-2 rounded-lg border border-border bg-card p-4",
        attention && "border-destructive/30"
      )}
    >
      {/* Stretched link: the whole card opens the note. Interactive
          children sit above it with relative z-10. */}
      <Link
        href={noteHref}
        aria-label={`Open note for ${card.patientName}`}
        className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        {variant === "correction" ? (
          <span className="text-xs font-semibold text-destructive">
            {correctionLabel(card.unresolvedCorrections)}
          </span>
        ) : variant === "overdue" ? (
          <span className="text-xs font-semibold text-destructive">
            {overdueLabel(start)}
          </span>
        ) : (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {start ? format(start, "h:mm a") : "Time TBD"}
          </span>
        )}
        <StatusChip chip={card.chip} />
      </div>

      {/* Patient */}
      <p className="text-base font-semibold leading-snug text-foreground">
        {card.patientName}
      </p>

      {/* Facility + note type */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {card.facilityName ? (
          <span className="text-sm text-muted-foreground">{card.facilityName}</span>
        ) : null}
        <Badge variant="secondary" className="text-xs font-medium">
          {card.noteTypeLabel}
        </Badge>
      </div>

      {/* Prep indicator */}
      {card.preppedAt && card.status === "scheduled" ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <CircleCheck className="size-3.5" aria-hidden />
          Prepped · {card.progressDone}/{card.progressTotal}
        </p>
      ) : null}

      {/* Correction preview */}
      {variant === "correction" && card.correctionPreview ? (
        <p className="line-clamp-2 border-l-2 border-destructive/40 pl-3 text-sm text-muted-foreground">
          {card.correctionPreview}
        </p>
      ) : null}

      {/* Footer affordance */}
      {variant === "correction" ? (
        <Button asChild className="relative z-10 mt-1 h-11 w-full">
          <Link href={noteHref}>Fix &amp; re-sign</Link>
        </Button>
      ) : variant === "today" && card.status === "scheduled" ? (
        <StartVisitButton noteId={card.noteId} className="relative z-10 mt-1" />
      ) : variant === "today" || variant === "overdue" ? (
        <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary">
          Open note
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </article>
  );
}
