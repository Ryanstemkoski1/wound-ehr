"use client";

// Renders any registry FieldDef against a snake_case section payload.
// The single place where a FieldDef.kind becomes UI — the section
// renderer, wound cards, and (via registry keys) the zod schemas all
// stay in lockstep through this component.

import type { FieldDef } from "@/lib/field-note/registry";
import { ChipGroup } from "@/components/field/form/chip-group";
import { NumericField } from "@/components/field/form/numeric-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface FieldRendererProps {
  field: FieldDef;
  /** The whole section (or wound) payload — snake_case registry keys. */
  payload: Record<string, unknown>;
  disabled?: boolean;
  /** Merge a partial patch into the payload (parent owns the save). */
  onPatch: (patch: Record<string, unknown>) => void;
  /** Namespaces input ids so the same field can repeat (wound cards). */
  idPrefix?: string;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

export function FieldRenderer({ field, payload, disabled, onPatch, idPrefix = "f" }: FieldRendererProps) {
  const id = `${idPrefix}-${field.key}`;

  switch (field.kind) {
    case "chips": {
      const selected = asStringArray(payload[field.key]);
      const detail = field.detail;
      const showDetail = !!detail && (!detail.when || detail.when.some((w) => selected.includes(w)));
      return (
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">{field.label}</p>
          <ChipGroup
            options={field.options}
            value={selected}
            single={field.single}
            disabled={disabled}
            onChange={(next) => onPatch({ [field.key]: next })}
          />
          {showDetail && detail && (
            <div className="mt-2 max-w-md">
              <label htmlFor={`${id}-detail`} className="mb-1 block text-xs font-medium text-muted-foreground">
                {detail.label}
              </label>
              <Input
                id={`${id}-detail`}
                value={asString(payload[detail.key])}
                maxLength={2000}
                disabled={disabled}
                onChange={(e) => onPatch({ [detail.key]: e.target.value })}
              />
            </div>
          )}
        </div>
      );
    }

    case "numeric":
      return (
        <NumericField
          id={id}
          label={field.label}
          value={asNumber(payload[field.key])}
          unit={field.unit}
          min={field.min}
          max={field.max}
          disabled={disabled}
          onChange={(n) => onPatch({ [field.key]: n })}
        />
      );

    case "text":
      return (
        <div>
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
          </label>
          <Input
            id={id}
            value={asString(payload[field.key])}
            placeholder={field.placeholder}
            maxLength={2000}
            disabled={disabled}
            onChange={(e) => onPatch({ [field.key]: e.target.value })}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
          </label>
          <Textarea
            id={id}
            value={asString(payload[field.key])}
            maxLength={10000}
            disabled={disabled}
            onChange={(e) => onPatch({ [field.key]: e.target.value })}
          />
        </div>
      );
  }
}
