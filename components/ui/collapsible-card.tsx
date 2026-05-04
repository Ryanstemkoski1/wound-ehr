"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CollapsibleCardProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Whether the section is expanded on first render. Defaults to true so
   *  collapsing is opt-in for the clinician — visual parity with the
   *  pre-Phase-3 layout when a tenant has clinical_ux_v2 disabled. */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Visual badge shown next to the title (e.g., "Required", count). */
  headerBadge?: ReactNode;
  /** Optional id for anchor-style navigation from the wound rail later. */
  id?: string;
};

/**
 * A `<Card>` whose header is a click-to-collapse toggle. Pure React +
 * `useState`; no extra package required. Accessible via aria-expanded /
 * aria-controls and keyboard activatable (Enter/Space) because the
 * toggle is a real `<button>`.
 *
 * Drop-in replacement for the existing `<Card><CardHeader><CardTitle>…`
 * pattern used throughout the assessment forms.
 */
export function CollapsibleCard({
  title,
  description,
  defaultOpen = true,
  children,
  className,
  headerBadge,
  id,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Stable id for aria-controls; falls back to a React-generated suffix
  // — not perfect for SSR but server-rendered open=true so a11y tools
  // see the expanded state on first paint regardless.
  const contentId = id ? `${id}-content` : undefined;

  return (
    <Card className={className} id={id}>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          className={cn(
            "flex w-full items-start gap-2 text-left",
            "focus-visible:ring-ring focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          )}
        >
          <ChevronDown
            className={cn(
              "text-muted-foreground mt-1 h-4 w-4 shrink-0 transition-transform",
              !open && "-rotate-90"
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex items-center gap-2">
              <span className="min-w-0 truncate">{title}</span>
              {headerBadge}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </button>
      </CardHeader>
      {open && (
        <CardContent id={contentId} className="space-y-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
