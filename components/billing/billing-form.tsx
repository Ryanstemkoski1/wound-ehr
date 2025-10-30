"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, DollarSign, ChevronsUpDown, Check } from "lucide-react";
import {
  COMMON_CPT_CODES,
  COMMON_ICD10_CODES,
  COMMON_MODIFIERS,
} from "@/lib/billing-codes";
import { cn } from "@/lib/utils";

type BillingFormProps = {
  initialData?: {
    cptCodes?: string[];
    icd10Codes?: string[];
    modifiers?: string[];
    timeSpent?: boolean;
    notes?: string;
  };
  onChange?: (data: BillingFormData) => void;
};

export type BillingFormData = {
  cptCodes: string[];
  icd10Codes: string[];
  modifiers: string[];
  timeSpent: boolean;
  notes: string;
};

export default function BillingForm({
  initialData,
  onChange,
}: BillingFormProps) {
  const [cptCodes, setCptCodes] = useState<string[]>(
    initialData?.cptCodes || []
  );
  const [icd10Codes, setIcd10Codes] = useState<string[]>(
    initialData?.icd10Codes || []
  );
  const [modifiers, setModifiers] = useState<string[]>(
    initialData?.modifiers || []
  );
  const [timeSpent, setTimeSpent] = useState(initialData?.timeSpent || false);
  const [notes, setNotes] = useState(initialData?.notes || "");

  const [cptInput, setCptInput] = useState("");
  const [icd10Input, setIcd10Input] = useState("");
  const [modifierInput, setModifierInput] = useState("");

  const [cptOpen, setCptOpen] = useState(false);
  const [icd10Open, setIcd10Open] = useState(false);
  const [modifierOpen, setModifierOpen] = useState(false);

  // Notify parent of changes
  const notifyChange = (newData: Partial<BillingFormData>) => {
    const formData: BillingFormData = {
      cptCodes,
      icd10Codes,
      modifiers,
      timeSpent,
      notes,
      ...newData,
    };
    onChange?.(formData);
  };

  const addCptCode = (code?: string) => {
    const codeToAdd = code || cptInput.trim();
    if (codeToAdd && !cptCodes.includes(codeToAdd)) {
      const updated = [...cptCodes, codeToAdd];
      setCptCodes(updated);
      setCptInput("");
      setCptOpen(false);
      notifyChange({ cptCodes: updated });
    }
  };

  const removeCptCode = (code: string) => {
    const updated = cptCodes.filter((c) => c !== code);
    setCptCodes(updated);
    notifyChange({ cptCodes: updated });
  };

  const addIcd10Code = (code?: string) => {
    const codeToAdd = code || icd10Input.trim();
    if (codeToAdd && !icd10Codes.includes(codeToAdd)) {
      const updated = [...icd10Codes, codeToAdd];
      setIcd10Codes(updated);
      setIcd10Input("");
      setIcd10Open(false);
      notifyChange({ icd10Codes: updated });
    }
  };

  const removeIcd10Code = (code: string) => {
    const updated = icd10Codes.filter((c) => c !== code);
    setIcd10Codes(updated);
    notifyChange({ icd10Codes: updated });
  };

  const addModifier = (modifier?: string) => {
    const modifierToAdd = modifier || modifierInput.trim();
    if (modifierToAdd && !modifiers.includes(modifierToAdd)) {
      const updated = [...modifiers, modifierToAdd];
      setModifiers(updated);
      setModifierInput("");
      setModifierOpen(false);
      notifyChange({ modifiers: updated });
    }
  };

  const removeModifier = (modifier: string) => {
    const updated = modifiers.filter((m) => m !== modifier);
    setModifiers(updated);
    notifyChange({ modifiers: updated });
  };

  const handleTimeSpentChange = (checked: boolean) => {
    setTimeSpent(checked);
    notifyChange({ timeSpent: checked });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    notifyChange({ notes: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Billing Information
        </CardTitle>
        <CardDescription>
          Enter CPT codes, ICD-10 diagnosis codes, and billing modifiers for
          this visit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* CPT Codes */}
          <div className="space-y-3">
            <Label htmlFor="cpt-code">CPT Codes (Procedure Codes)</Label>
            <div className="flex gap-2">
              <Popover open={cptOpen} onOpenChange={setCptOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={cptOpen}
                    className="flex-1 justify-between"
                  >
                    {cptInput || "Select CPT code..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search CPT codes..."
                      value={cptInput}
                      onValueChange={setCptInput}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm">
                          No match found.{" "}
                          {cptInput && (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => addCptCode()}
                            >
                              Add &quot;{cptInput}&quot; as custom code
                            </Button>
                          )}
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Common CPT Codes">
                        {COMMON_CPT_CODES.filter(
                          (item) =>
                            !cptCodes.includes(item.code) &&
                            (item.code
                              .toLowerCase()
                              .includes(cptInput.toLowerCase()) ||
                              item.description
                                .toLowerCase()
                                .includes(cptInput.toLowerCase()))
                        ).map((item) => (
                          <CommandItem
                            key={item.code}
                            value={item.code}
                            onSelect={() => addCptCode(item.code)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                cptCodes.includes(item.code)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div>
                              <div className="font-medium">{item.code}</div>
                              <div className="text-muted-foreground text-sm">
                                {item.description}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {cptCodes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cptCodes.map((code) => (
                  <Badge key={code} variant="secondary" className="gap-1">
                    {code}
                    <button
                      type="button"
                      onClick={() => removeCptCode(code)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* ICD-10 Codes */}
          <div className="space-y-3">
            <Label htmlFor="icd10-code">ICD-10 Codes (Diagnosis Codes)</Label>
            <div className="flex gap-2">
              <Popover open={icd10Open} onOpenChange={setIcd10Open}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={icd10Open}
                    className="flex-1 justify-between"
                  >
                    {icd10Input || "Select ICD-10 code..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search ICD-10 codes..."
                      value={icd10Input}
                      onValueChange={setIcd10Input}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm">
                          No match found.{" "}
                          {icd10Input && (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => addIcd10Code()}
                            >
                              Add &quot;{icd10Input}&quot; as custom code
                            </Button>
                          )}
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Common ICD-10 Codes">
                        {COMMON_ICD10_CODES.filter(
                          (item) =>
                            !icd10Codes.includes(item.code) &&
                            (item.code
                              .toLowerCase()
                              .includes(icd10Input.toLowerCase()) ||
                              item.description
                                .toLowerCase()
                                .includes(icd10Input.toLowerCase()))
                        ).map((item) => (
                          <CommandItem
                            key={item.code}
                            value={item.code}
                            onSelect={() => addIcd10Code(item.code)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                icd10Codes.includes(item.code)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div>
                              <div className="font-medium">{item.code}</div>
                              <div className="text-muted-foreground text-sm">
                                {item.description}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {icd10Codes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {icd10Codes.map((code) => (
                  <Badge key={code} variant="secondary" className="gap-1">
                    {code}
                    <button
                      type="button"
                      onClick={() => removeIcd10Code(code)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Modifiers */}
          <div className="space-y-3">
            <Label htmlFor="modifier">Billing Modifiers (Optional)</Label>
            <div className="flex gap-2">
              <Popover open={modifierOpen} onOpenChange={setModifierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={modifierOpen}
                    className="flex-1 justify-between"
                  >
                    {modifierInput || "Select modifier..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search modifiers..."
                      value={modifierInput}
                      onValueChange={setModifierInput}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm">
                          No match found.{" "}
                          {modifierInput && (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => addModifier()}
                            >
                              Add &quot;{modifierInput}&quot; as custom modifier
                            </Button>
                          )}
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Common Modifiers">
                        {COMMON_MODIFIERS.filter(
                          (item) =>
                            !modifiers.includes(item.code) &&
                            (item.code
                              .toLowerCase()
                              .includes(modifierInput.toLowerCase()) ||
                              item.description
                                .toLowerCase()
                                .includes(modifierInput.toLowerCase()))
                        ).map((item) => (
                          <CommandItem
                            key={item.code}
                            value={item.code}
                            onSelect={() => addModifier(item.code)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                modifiers.includes(item.code)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div>
                              <div className="font-medium">{item.code}</div>
                              <div className="text-muted-foreground text-sm">
                                {item.description}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {modifiers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {modifiers.map((modifier) => (
                  <Badge key={modifier} variant="outline" className="gap-1">
                    {modifier}
                    <button
                      type="button"
                      onClick={() => removeModifier(modifier)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Time Spent */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="time-spent">Time-Based Billing</Label>
              <p className="text-muted-foreground text-sm">
                45+ minutes spent on examination, treatment, and counseling
              </p>
            </div>
            <Switch
              id="time-spent"
              checked={timeSpent}
              onCheckedChange={handleTimeSpentChange}
            />
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="billing-notes">Billing Notes (Optional)</Label>
            <Textarea
              id="billing-notes"
              placeholder="Additional billing notes or documentation..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
