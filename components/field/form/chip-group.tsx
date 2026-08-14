"use client";

// Controlled chip (pill) group — the workhorse input of the field note.
// Mirrors the paper form's checkboxes: multi-select by default,
// single-select (radio-like) when `single`. Never touches react-hook-form.

import { cn } from "@/lib/utils";

export interface ChipGroupProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChipGroup({ options, value, onChange, single, disabled, className }: ChipGroupProps) {
  const toggle = (v: string) => {
    if (single) {
      onChange(value.includes(v) ? [] : [v]);
      return;
    }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group">
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => toggle(option.value)}
            className={cn(
              "min-h-11 rounded-full border px-3 py-2 text-sm transition-colors",
              selected
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
