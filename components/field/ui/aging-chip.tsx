"use client";

// Field surface — shared aging chip.
// Shows how long something has been waiting since `since`:
//   < 24h  → muted gray  "3h"
//   >= 24h → amber       "1d"
//   >= 48h → red         "2d"
// Renders nothing when `since` is null.

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const REFRESH_MS = 60_000;

// Current time, captured once on mount and refreshed every minute so the
// chip stays accurate while the page is open (reading the clock directly
// during render would make rendering impure).
function useNow(refreshMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);
  return now;
}

export function AgingChip({ since }: { since: string | null }) {
  const now = useNow(REFRESH_MS);
  if (!since) return null;

  const sinceMs = new Date(since).getTime();
  if (Number.isNaN(sinceMs)) return null;

  const hours = Math.max(0, Math.floor((now - sinceMs) / 3_600_000));
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
