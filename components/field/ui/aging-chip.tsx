// Field surface — shared aging chip.
// Shows how long something has been waiting since `since`:
//   < 24h  → muted gray  "3h"
//   >= 24h → amber       "1d"
//   >= 48h → red         "2d"
// Renders nothing when `since` is null.

import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function AgingChip({ since }: { since: string | null }) {
  if (!since) return null;

  const sinceMs = new Date(since).getTime();
  if (Number.isNaN(sinceMs)) return null;

  const hours = Math.max(0, Math.floor((Date.now() - sinceMs) / 3_600_000));
  const label = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;

  const toneClass =
    hours >= 48
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
      : hours >= 24
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
        : "border-border bg-muted text-muted-foreground";

  return (
    <span
      title={`Since ${format(new Date(sinceMs), "MMM d, h:mm a")}`}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-xs font-medium tabular-nums",
        toneClass
      )}
    >
      {label}
    </span>
  );
}
