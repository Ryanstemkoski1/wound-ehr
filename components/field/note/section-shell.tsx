"use client";

// The chrome around every note section: paper-number eyebrow band,
// attribution line, "Not assessed" toggle, collapse-to-summary, and
// the pinned-correction strip. Content comes in as children.

import { ChevronDown, ChevronUp, Flag, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionShellProps {
  sectionKey: string;
  paperNumber: number;
  title: string;
  /** e.g. "Pre-filled by Dana · Aug 12, 2:10 PM" */
  attribution: string | null;
  summary: string;
  collapsed: boolean;
  disabled: boolean;
  notAssessed: boolean;
  showNotAssessed: boolean;
  /** Unresolved QA correction pinned to this section. */
  correction: string | null;
  onToggleCollapsed: () => void;
  onNotAssessedChange: (value: boolean) => void;
  /** Focus/tap bookkeeping for the auto-collapse timer. */
  onInteract: () => void;
  children: React.ReactNode;
}

export function SectionShell({
  sectionKey,
  paperNumber,
  title,
  attribution,
  summary,
  collapsed,
  disabled,
  notAssessed,
  showNotAssessed,
  correction,
  onToggleCollapsed,
  onNotAssessedChange,
  onInteract,
  children,
}: SectionShellProps) {
  return (
    <section
      id={`section-${sectionKey}`}
      onFocusCapture={onInteract}
      onPointerDownCapture={onInteract}
      className={cn(
        "scroll-mt-28 rounded-lg border border-border bg-card",
        correction && "border-destructive/50"
      )}
    >
      <header className="flex items-start justify-between gap-3 rounded-t-lg border-b border-border bg-primary/5 px-4 py-3">
        <button type="button" onClick={onToggleCollapsed} className="min-w-0 flex-1 py-1 text-left">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            <span className="tabular-nums">{paperNumber}</span> · {title}
          </p>
          {attribution && <p className="mt-0.5 truncate text-xs text-muted-foreground">{attribution}</p>}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {showNotAssessed && !disabled && (
            <button
              type="button"
              aria-pressed={notAssessed}
              onClick={() => onNotAssessedChange(!notAssessed)}
              className={cn(
                "min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                notAssessed
                  ? "border-transparent bg-muted-foreground/20 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              Not assessed
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          >
            {collapsed || notAssessed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
      </header>

      {correction && (
        <div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <Flag className="mt-0.5 size-3.5 shrink-0" />
          <span>{correction}</span>
        </div>
      )}

      {notAssessed ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <Minus className="size-4 shrink-0" /> Not assessed this visit
        </div>
      ) : collapsed ? (
        <button type="button" onClick={onToggleCollapsed} className="block w-full min-h-11 px-4 py-3.5 text-left">
          <p className="truncate text-sm text-muted-foreground">{summary || "No answers yet — tap to open"}</p>
        </button>
      ) : (
        <div className="px-4 py-5">{children}</div>
      )}
    </section>
  );
}
