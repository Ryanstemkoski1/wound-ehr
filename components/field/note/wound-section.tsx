"use client";

// §10 Wound Assessment — the per-wound card list. Fields come from
// WOUND_FIELDS (registry), with two hand-tuned groups: the L×W×D trio
// (auto-advancing focus for rapid measurement entry) and the wound-bed
// percentage trio with a live sum indicator.

import { useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { WOUND_FIELDS, type FieldDef } from "@/lib/field-note/registry";
import { FieldRenderer } from "@/components/field/form/field-renderer";
import { NumericField } from "@/components/field/form/numeric-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NumericDef = Extract<FieldDef, { kind: "numeric" }>;

const DIM_KEYS = ["length_cm", "width_cm", "depth_cm"];
const BED_KEYS = ["bed_granulation_pct", "bed_slough_pct", "bed_eschar_pct"];

function numericDefs(keys: string[]): NumericDef[] {
  return keys
    .map((key) => WOUND_FIELDS.fields.find((f) => f.key === key))
    .filter((f): f is NumericDef => !!f && f.kind === "numeric");
}

const DIM_DEFS = numericDefs(DIM_KEYS);
const BED_DEFS = numericDefs(BED_KEYS);

function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

export interface WoundSectionProps {
  wounds: Record<string, unknown>[];
  disabled: boolean;
  onChange: (wounds: Record<string, unknown>[]) => void;
}

export function WoundSection({ wounds, disabled, onChange }: WoundSectionProps) {
  const patchWound = (index: number, patch: Record<string, unknown>) => {
    onChange(wounds.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const removeWound = (index: number) => {
    if (!window.confirm(`Remove Wound #${index + 1}? Its documentation will be deleted.`)) return;
    onChange(wounds.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      {wounds.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No wounds documented yet. At least one wound is required before signing.
        </p>
      )}
      {wounds.map((wound, index) => (
        <WoundCard
          key={index}
          index={index}
          wound={wound}
          disabled={disabled}
          onPatch={(patch) => patchWound(index, patch)}
          onRemove={() => removeWound(index)}
        />
      ))}
      {!disabled && (
        // The section schema caps wounds at 20; adding a 21st would make
        // every subsequent autosave of this section fail validation.
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={wounds.length >= 20}
          onClick={() => onChange([...wounds, {}])}
        >
          <Plus /> {wounds.length >= 20 ? "Wound limit reached (20)" : "Add wound"}
        </Button>
      )}
    </div>
  );
}

function WoundCard({
  index,
  wound,
  disabled,
  onPatch,
  onRemove,
}: {
  index: number;
  wound: Record<string, unknown>;
  disabled: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const widthRef = useRef<HTMLInputElement>(null);
  const depthRef = useRef<HTMLInputElement>(null);
  const location = typeof wound.location === "string" && wound.location.trim() ? wound.location.trim() : null;

  const granulation = asNumber(wound.bed_granulation_pct);
  const slough = asNumber(wound.bed_slough_pct);
  const eschar = asNumber(wound.bed_eschar_pct);
  const anyBed = granulation !== null || slough !== null || eschar !== null;
  const bedSum = (granulation ?? 0) + (slough ?? 0) + (eschar ?? 0);

  const advance = [() => widthRef.current?.focus(), () => depthRef.current?.focus(), undefined] as const;
  const dimRefs = [undefined, widthRef, depthRef] as const;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">
          Wound #{index + 1}
          {location && <span className="ml-2 font-normal text-muted-foreground">{location}</span>}
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Remove wound ${index + 1}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {WOUND_FIELDS.fields.map((field) => {
          // The trio members after the first render inside their group.
          if (DIM_KEYS.slice(1).includes(field.key) || BED_KEYS.slice(1).includes(field.key)) return null;

          if (field.key === DIM_KEYS[0]) {
            return (
              <div key="dims">
                <p className="mb-1.5 text-sm font-medium text-foreground">Size — L × W × D</p>
                <div className="grid grid-cols-3 gap-2">
                  {DIM_DEFS.map((def, i) => (
                    <NumericField
                      key={def.key}
                      id={`w${index}-${def.key}`}
                      label={def.label}
                      value={asNumber(wound[def.key])}
                      unit={def.unit}
                      min={def.min}
                      max={def.max}
                      disabled={disabled}
                      inputRef={dimRefs[i]}
                      onAutoAdvance={advance[i]}
                      onChange={(n) => onPatch({ [def.key]: n })}
                    />
                  ))}
                </div>
              </div>
            );
          }

          if (field.key === BED_KEYS[0]) {
            return (
              <div key="bed">
                <p className="mb-1.5 text-sm font-medium text-foreground">Wound bed composition</p>
                <div className="grid grid-cols-3 gap-2">
                  {BED_DEFS.map((def) => (
                    <NumericField
                      key={def.key}
                      id={`w${index}-${def.key}`}
                      label={def.label.replace("Wound bed — ", "")}
                      value={asNumber(wound[def.key])}
                      unit={def.unit}
                      min={def.min}
                      max={def.max}
                      disabled={disabled}
                      onChange={(n) => onPatch({ [def.key]: n })}
                    />
                  ))}
                </div>
                {anyBed && (
                  <p
                    className={cn(
                      "mt-1.5 text-xs tabular-nums",
                      bedSum === 100 ? "text-success" : "font-medium text-warning"
                    )}
                  >
                    Bed total {bedSum}%{bedSum !== 100 && " — should equal 100%"}
                  </p>
                )}
              </div>
            );
          }

          return (
            <FieldRenderer
              key={field.key}
              field={field}
              payload={wound}
              disabled={disabled}
              onPatch={onPatch}
              idPrefix={`w${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}
