"use client";

// One inbox queue: table on desktop, cards on mobile.
// Row click opens the note (review mode renders at /notes/[id]);
// Completed rows open the paper-mirror preview/PDF instead.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, PencilLine } from "lucide-react";
import type { VisitCard } from "@/app/actions/field-schedule";
import { StatusChip } from "@/components/field/ui/status-chip";
import { AgingChip } from "@/components/field/ui/aging-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NudgeButton, ReopenDialog } from "@/components/field/inbox/row-actions";

export type QueueVariant = "pendingReview" | "prepDue" | "overdue" | "correctionsOut" | "completed";

const EMPTY_COPY: Record<QueueVariant, string> = {
  pendingReview: "Nothing waiting for review.",
  prepDue: "No visits need prep in the next few days.",
  overdue: "No overdue visits.",
  correctionsOut: "No corrections are out with nurses.",
  completed: "No completed notes yet.",
};

const AGING_LABEL: Record<QueueVariant, string | null> = {
  pendingReview: "Waiting",
  prepDue: null,
  overdue: "Overdue",
  correctionsOut: "Out for",
  completed: null,
};

function hrefFor(variant: QueueVariant, card: VisitCard): string {
  return variant === "completed" ? `/notes/${card.noteId}/preview` : `/notes/${card.noteId}`;
}

function agingSince(variant: QueueVariant, card: VisitCard): string | null {
  if (variant === "pendingReview" || variant === "correctionsOut") return card.sentToOfficeAt;
  if (variant === "overdue") return card.scheduledStartAt;
  return null;
}

function visitLabel(card: VisitCard): string {
  const iso = card.scheduledStartAt ?? card.visitDate;
  try {
    return format(new Date(iso), "EEE, MMM d · h:mm a");
  } catch {
    return iso;
  }
}

function FlagChips({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag}
          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400"
        >
          {flag}
        </span>
      ))}
    </div>
  );
}

function CorrectionPreview({ card, className }: { card: VisitCard; className?: string }) {
  if (!card.correctionPreview) return <span className="text-muted-foreground">—</span>;
  return (
    <div className={className}>
      <p className="line-clamp-2 text-sm">{card.correctionPreview}</p>
      {card.unresolvedCorrections > 1 && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          +{card.unresolvedCorrections - 1} more open
        </p>
      )}
    </div>
  );
}

function RowActions({
  variant,
  card,
  mobile,
}: {
  variant: QueueVariant;
  card: VisitCard;
  mobile?: boolean;
}) {
  const router = useRouter();
  const buttonClass = mobile ? "min-h-11 flex-1" : undefined;

  if (variant === "prepDue") {
    return (
      <Button
        variant="outline"
        size={mobile ? "default" : "sm"}
        className={buttonClass}
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/notes/${card.noteId}`);
        }}
      >
        <PencilLine /> Open note to pre-fill
      </Button>
    );
  }
  if (variant === "correctionsOut") {
    return <NudgeButton noteId={card.noteId} className={buttonClass} size={mobile ? "default" : "sm"} />;
  }
  if (variant === "completed") {
    return (
      <div className={mobile ? "flex w-full gap-2" : "flex justify-end gap-2"}>
        <Button asChild variant="outline" size={mobile ? "default" : "sm"} className={buttonClass}>
          <Link href={`/notes/${card.noteId}/preview`} onClick={(e) => e.stopPropagation()}>
            <FileText /> PDF
          </Link>
        </Button>
        <ReopenDialog
          noteId={card.noteId}
          patientName={card.patientName}
          className={buttonClass}
          size={mobile ? "default" : "sm"}
        />
      </div>
    );
  }
  return null;
}

export function InboxQueue({ variant, cards }: { variant: QueueVariant; cards: VisitCard[] }) {
  const router = useRouter();
  const agingLabel = AGING_LABEL[variant];
  const showProgress = variant === "prepDue" || variant === "overdue";
  const hasActions = variant === "prepDue" || variant === "correctionsOut" || variant === "completed";

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        {EMPTY_COPY[variant]}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Nurse</TableHead>
              <TableHead>Visit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              {variant === "correctionsOut" && <TableHead>Correction</TableHead>}
              <TableHead>Flags</TableHead>
              {agingLabel && <TableHead>{agingLabel}</TableHead>}
              {variant === "completed" && <TableHead>Approved</TableHead>}
              {hasActions && (
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow
                key={card.noteId}
                className="cursor-pointer"
                onClick={() => router.push(hrefFor(variant, card))}
              >
                <TableCell className="py-3">
                  <div className="font-medium">{card.patientName}</div>
                  {card.mrn && <div className="text-xs text-muted-foreground">MRN {card.mrn}</div>}
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">{card.facilityName ?? "—"}</TableCell>
                <TableCell className="py-3">{card.nurseName ?? "Unassigned"}</TableCell>
                <TableCell className="whitespace-nowrap py-3">{visitLabel(card)}</TableCell>
                <TableCell className="py-3">
                  {card.noteTypeLabel}
                  {showProgress && (
                    <div className="text-xs tabular-nums text-muted-foreground">
                      {card.progressDone}/{card.progressTotal} sections
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <StatusChip chip={card.chip} />
                </TableCell>
                {variant === "correctionsOut" && (
                  <TableCell className="py-3">
                    <CorrectionPreview card={card} className="max-w-56" />
                  </TableCell>
                )}
                <TableCell className="py-3">
                  <FlagChips flags={card.flags} />
                </TableCell>
                {agingLabel && (
                  <TableCell className="py-3">
                    <AgingChip since={agingSince(variant, card)} />
                  </TableCell>
                )}
                {variant === "completed" && (
                  <TableCell className="whitespace-nowrap py-3 text-muted-foreground">
                    {card.approvedAt ? format(new Date(card.approvedAt), "MMM d, h:mm a") : "—"}
                  </TableCell>
                )}
                {hasActions && (
                  <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions variant={variant} card={card} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {cards.map((card) => {
          const href = hrefFor(variant, card);
          return (
            <div
              key={card.noteId}
              role="link"
              tabIndex={0}
              className="cursor-pointer rounded-lg border bg-card p-4 transition-colors active:bg-accent/50"
              onClick={() => router.push(href)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(href);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{card.patientName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {card.facilityName ?? "—"}
                    {card.mrn ? ` · MRN ${card.mrn}` : ""}
                  </p>
                </div>
                <StatusChip chip={card.chip} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{card.nurseName ?? "Unassigned"}</span>
                <span>{visitLabel(card)}</span>
                <span>
                  {card.noteTypeLabel}
                  {showProgress ? ` · ${card.progressDone}/${card.progressTotal} sections` : ""}
                </span>
              </div>

              {(card.flags.length > 0 || agingLabel) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {agingLabel && <AgingChip since={agingSince(variant, card)} />}
                  <FlagChips flags={card.flags} />
                </div>
              )}

              {variant === "correctionsOut" && card.correctionPreview && (
                <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-300">
                  <CorrectionPreview card={card} />
                </div>
              )}

              {variant === "completed" && card.approvedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Approved {format(new Date(card.approvedAt), "MMM d, h:mm a")}
                </p>
              )}

              {hasActions && (
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <RowActions variant={variant} card={card} mobile />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
