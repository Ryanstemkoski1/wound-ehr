"use client";

// Controlled numeric input tuned for one-handed field entry:
// inputmode=decimal keyboard, unit suffix, out-of-range warning
// (never clamps clinical data silently — it warns and withholds the
// value from the payload so the server schema can't reject the save),
// and optional auto-advance for rapid L×W×D entry.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumericFieldProps {
  id?: string;
  label?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Called on Enter, or automatically once a one-decimal value (e.g. "3.5") is typed. */
  onAutoAdvance?: () => void;
  className?: string;
}

const NUMERIC_PATTERN = /^-?\d*\.?\d*$/;

export function NumericField({
  id,
  label,
  value,
  onChange,
  unit,
  min,
  max,
  disabled,
  inputRef,
  onAutoAdvance,
  className,
}: NumericFieldProps) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // Sync external value in when the field isn't being typed in. Adjusting
  // state while rendering (instead of in an effect) avoids an extra render
  // pass with stale text.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (!focused) setText(value == null ? "" : String(value));
  }

  const parsed = text === "" || text === "-" || text === "." ? null : Number(text);
  const outOfRange =
    parsed !== null &&
    !Number.isNaN(parsed) &&
    ((min !== undefined && parsed < min) || (max !== undefined && parsed > max));

  const handleChange = (raw: string) => {
    if (!NUMERIC_PATTERN.test(raw)) return;
    setText(raw);
    const n = raw === "" || raw === "-" || raw === "." ? null : Number(raw);
    if (n === null || Number.isNaN(n)) {
      onChange(null);
      return;
    }
    const bad = (min !== undefined && n < min) || (max !== undefined && n > max);
    onChange(bad ? null : n);
    if (!bad && onAutoAdvance && /^\d+\.\d$/.test(raw)) onAutoAdvance();
  };

  const rangeHint =
    min !== undefined && max !== undefined
      ? `${min}–${max}${unit ? ` ${unit}` : ""}`
      : min !== undefined
        ? `at least ${min}`
        : max !== undefined
          ? `at most ${max}`
          : "";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          disabled={disabled}
          aria-invalid={outOfRange || undefined}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            if (!outOfRange) setText(value == null ? "" : String(value));
          }}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAutoAdvance?.();
            }
          }}
          className={cn(unit && "pr-12")}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {outOfRange && (
        <p className="mt-1 text-xs font-medium text-warning">Outside expected range ({rangeHint}) — not saved</p>
      )}
    </div>
  );
}
