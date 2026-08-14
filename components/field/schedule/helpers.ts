// Small pure helpers shared by the scheduler components.

import { format, parseISO } from "date-fns";
import type { VisitCard } from "@/app/actions/field-schedule";

/** Synthetic row id for cards with no assigned nurse. */
export const UNASSIGNED_ROW_ID = "__unassigned__";

/** Best usable start timestamp for a card (scheduled window, falling back to visit_date). */
export function cardStart(card: VisitCard): Date | null {
  const iso = card.scheduledStartAt ?? card.visitDate;
  if (!iso) return null;
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtTime(d: Date): string {
  return format(d, "h:mm a");
}
