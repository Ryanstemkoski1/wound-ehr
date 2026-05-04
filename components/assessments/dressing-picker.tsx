"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreatmentOption } from "@/lib/treatment-options";

type DressingPickerProps = {
  value: string;
  onChange: (value: string) => void;
  options: TreatmentOption[];
  placeholder?: string;
  /** When true, an explicit "None" entry is rendered at the top. */
  allowNone?: boolean;
  disabled?: boolean;
};

/**
 * R-066 (clinical_ux_v2) — Searchable dressing / treatment picker.
 *
 * Drop-in replacement for the grouped `<Select>` used in the Treatment
 * Order Builder. Renders a Command popover so clinicians can type
 * partial names ("alginate", "foam", "Xeroform") instead of scrolling
 * through long category lists. Categories from `option.category` are
 * preserved as Command groups for visual scannability.
 */
export function DressingPicker({
  value,
  onChange,
  options,
  placeholder = "Select treatment…",
  allowNone = false,
  disabled = false,
}: DressingPickerProps) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, TreatmentOption[]>();
    for (const opt of options) {
      const cat = opt.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(opt);
    }
    return Array.from(map.entries());
  }, [options]);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search treatments…" />
          <CommandList>
            <CommandEmpty>No matching treatments.</CommandEmpty>
            {allowNone && (
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  None
                </CommandItem>
              </CommandGroup>
            )}
            {grouped.map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.value}`}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
