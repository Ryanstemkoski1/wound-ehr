"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Healing status options per Dr. May's resolved spec (2026-05-29).
 *
 * Note: "Declined" was dropped because clinically it duplicates
 * "Deteriorating" — both denote a wound trending worse. A single
 * status avoids ambiguity in reporting and downstream MIPS measures.
 *
 * "Sign Off" carries the semantic of "care transferred / no longer
 * following" — used when the patient is being discharged from the
 * wound-care service (e.g., transferred to PCP, moved facilities,
 * or otherwise off-panel) without the wound being fully healed.
 */
export type HealingStatus =
  | "improving"
  | "stable"
  | "deteriorating"
  | "healed"
  | "sign_off";

export const HEALING_STATUS_LABELS: Record<HealingStatus, string> = {
  improving: "Improving",
  stable: "Stable",
  deteriorating: "Deteriorating",
  healed: "Healed",
  sign_off: "Sign Off",
};

/** Long-form semantic descriptions for tooltips / a11y. */
const HEALING_STATUS_DESCRIPTIONS: Record<HealingStatus, string> = {
  improving: "Wound is trending toward healing",
  stable: "Wound is unchanged since last assessment",
  deteriorating: "Wound is trending worse",
  healed: "Wound is fully closed",
  sign_off: "Care transferred / no longer following",
};

/** Display order locked per spec. */
const HEALING_STATUS_ORDER: readonly HealingStatus[] = [
  "improving",
  "stable",
  "deteriorating",
  "healed",
  "sign_off",
] as const;

/**
 * Accent ring colors per status. Applied only when selected so the
 * chip row reads as a colored selection rather than a rainbow palette
 * of always-on hints (matches the assessment-form INFECTION_SIGNS
 * styling intent).
 */
const HEALING_STATUS_RING: Record<HealingStatus, string> = {
  improving: "ring-2 ring-green-500 ring-offset-2 ring-offset-background",
  stable: "ring-2 ring-blue-500 ring-offset-2 ring-offset-background",
  deteriorating: "ring-2 ring-red-500 ring-offset-2 ring-offset-background",
  healed: "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background",
  sign_off: "ring-2 ring-slate-500 ring-offset-2 ring-offset-background",
};

export type HealingStatusChipsProps = {
  value: HealingStatus | null;
  onChange: (next: HealingStatus) => void;
  disabled?: boolean;
  className?: string;
};

export default function HealingStatusChips({
  value,
  onChange,
  disabled,
  className,
}: HealingStatusChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Healing status"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {HEALING_STATUS_ORDER.map((status) => {
        const isSelected = value === status;
        return (
          <Button
            key={status}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={HEALING_STATUS_DESCRIPTIONS[status]}
            title={HEALING_STATUS_DESCRIPTIONS[status]}
            size="sm"
            variant={isSelected ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={cn(
              "rounded-full",
              isSelected && HEALING_STATUS_RING[status]
            )}
          >
            {HEALING_STATUS_LABELS[status]}
          </Button>
        );
      })}
    </div>
  );
}
