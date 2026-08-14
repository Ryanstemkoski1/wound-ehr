"use client";

// The section map. Desktop: sticky 240px rail beside the document.
// Phone: a floating "Sections" pill opening a bottom sheet (the sticky
// top progress bar lives in the editor header). Paper numbers are
// ALWAYS shown — Vitals is "8" even on follow-ups. Contributor
// initials ride on each row (attribution instead of color-coding).

import { useState } from "react";
import { ArrowDown, Check, Flag, List, Minus } from "lucide-react";
import type { SectionState } from "@/lib/field-note/logic";
import { cn } from "@/lib/utils";

export interface RailItem {
  key: string;
  paperNumber: number;
  title: string;
  state: SectionState;
  /** Local changes not yet confirmed saved — renders the half dot. */
  dirty: boolean;
  initials: string | null;
  hasCorrection: boolean;
}

export interface SectionRailProps {
  items: RailItem[];
  activeKey: string | null;
  done: number;
  total: number;
  nextUntouchedKey: string | null;
  onJump: (key: string) => void;
}

function StateIcon({ state, dirty }: { state: SectionState; dirty: boolean }) {
  if (state === "not_assessed") {
    return (
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <Minus className="size-3" />
      </span>
    );
  }
  if (state === "started" && dirty) {
    return (
      <span className="relative size-4 shrink-0 overflow-hidden rounded-full border-2 border-primary">
        <span className="absolute inset-y-0 left-0 w-1/2 bg-primary" />
      </span>
    );
  }
  if (state === "started" || state === "attested") {
    return (
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success/15 text-success">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  return <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />;
}

function RailRow({ item, active, onClick }: { item: RailItem; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <StateIcon state={item.state} dirty={item.dirty} />
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{item.paperNumber}</span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.hasCorrection && <Flag className="size-3.5 shrink-0 text-destructive" />}
      {item.initials && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {item.initials}
        </span>
      )}
    </button>
  );
}

export function SectionRail({ items, activeKey, done, total, nextUntouchedKey, onJump }: SectionRailProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const jumpFromSheet = (key: string) => {
    setSheetOpen(false);
    onJump(key);
  };

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Note sections"
        className="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pr-1 lg:block"
      >
        <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Sections · <span className="tabular-nums">{done}/{total}</span>
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.key}>
              <RailRow item={item} active={activeKey === item.key} onClick={() => onJump(item.key)} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Floating next-untouched jump */}
      {nextUntouchedKey && (
        <button
          type="button"
          onClick={() => jumpFromSheet(nextUntouchedKey)}
          className="fixed right-4 bottom-5 z-30 flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          Next section <ArrowDown className="size-4" />
        </button>
      )}

      {/* Phone: section-map trigger */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-5 left-4 z-30 flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium shadow-lg lg:hidden"
      >
        <List className="size-4" />
        Sections
        <span className="text-xs tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      </button>

      {/* Phone: bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close section list"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Note sections"
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 pb-8 shadow-xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sections · <span className="tabular-nums">{done}/{total}</span>
            </p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.key}>
                  <RailRow item={item} active={activeKey === item.key} onClick={() => jumpFromSheet(item.key)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
