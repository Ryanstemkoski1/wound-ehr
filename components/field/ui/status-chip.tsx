// Field surface — shared status chip.
// Renders the lifecycle chip produced by statusChip() in
// lib/field-note/logic.ts. Pure presentational; safe in server
// and client components alike.

import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  active:
    "border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/15",
  review:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  muted: "border-transparent bg-muted/60 text-muted-foreground/70",
};

export function StatusChip({
  chip,
  className,
}: {
  chip: { label: string; tone: string };
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[chip.tone] ?? TONE_CLASSES.neutral,
        className
      )}
    >
      {chip.label}
    </span>
  );
}
