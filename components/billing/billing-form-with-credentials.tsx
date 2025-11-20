/**
 * BillingFormWithCredentials - Credential-Aware Billing Form
 * 
 * This component replaces the original billing-form.tsx with credential-based
 * procedure restrictions. It filters CPT codes based on user credentials to
 * prevent RN/LVN from documenting procedures outside their scope (e.g., sharp debridement).
 * 
 * Key Features:
 * - Filters CPT code dropdown to show only allowed procedures
 * - Visual indicators (red badges, AlertCircle icons) for restricted codes
 * - Alert banners warn when restricted procedures are selected
 * - Tooltips explain required credentials for restricted procedures
 * - Prevents adding restricted codes with validation dialogs
 * 
 * Integration:
 * - Use BillingFormServerWrapper (server component) to fetch credentials and procedures
 * - Server-side validation in app/actions/billing.ts prevents bypassing UI restrictions
 * 
 * @see lib/procedures.ts - Validation utilities
 * @see app/actions/billing.ts - Server-side validation
 * @see components/billing/billing-form-server-wrapper.tsx - Server component wrapper
 */
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
import { X, DollarSign, ChevronsUpDown, Check, AlertCircle } from "lucide-react";
import {
  COMMON_CPT_CODES,
  COMMON_ICD10_CODES,
  COMMON_MODIFIERS,
} from "@/lib/billing-codes";
import { cn } from "@/lib/utils";
import type { Credentials } from "@/lib/credentials";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BillingFormWithCredentialsProps = {
  visitId: string;
  patientId: string;
  userCredentials: Credentials | null;
  allowedCPTCodes: string[]; // Passed from server after filtering
  restrictedCPTCodes: Array<{
    code: string;
    name: string;
    requiredCredentials: string[];
  }>;
  existingBilling?: {
    id: string;
    cptCodes: string[];
    icd10Codes: string[];
    modifiers: string[];
    timeSpent: boolean;
    notes: string | null;
  } | null;
  onChange?: (data: BillingFormData) => void;
};

export type BillingFormData = {
  cptCodes: string[];
  icd10Codes: string[];
  modifiers: string[];
  timeSpent: boolean;
  notes: string;
};

export default function BillingFormWithCredentials({
  visitId: _visitId, // eslint-disable-line @typescript-eslint/no-unused-vars
  patientId: _patientId, // eslint-disable-line @typescript-eslint/no-unused-vars
  userCredentials,
  allowedCPTCodes,
  restrictedCPTCodes,
  existingBilling,
  onChange,
}: BillingFormWithCredentialsProps) {
  const [cptCodes, setCptCodes] = useState<string[]>(
    existingBilling?.cptCodes || []
  );
  const [icd10Codes, setIcd10Codes] = useState<string[]>(
    existingBilling?.icd10Codes || []
  );
  const [modifiers, setModifiers] = useState<string[]>(
    existingBilling?.modifiers || []
  );
  const [timeSpent, setTimeSpent] = useState(existingBilling?.timeSpent || false);
  const [notes, setNotes] = useState(existingBilling?.notes || "");

  const [cptInput, setCptInput] = useState("");
  const [icd10Input, setIcd10Input] = useState("");
  const [modifierInput, setModifierInput] = useState("");

  const [cptOpen, setCptOpen] = useState(false);
  const [icd10Open, setIcd10Open] = useState(false);
  const [modifierOpen, setModifierOpen] = useState(false);

  // Create map for quick lookup of restricted codes
  const restrictedCodesMap = new Map(
    restrictedCPTCodes.map((r) => [r.code, r])
  );

  // Filter CPT codes to only show allowed ones
  const filteredCPTCodes = COMMON_CPT_CODES.filter((item) =>
    allowedCPTCodes.includes(item.code)
  );

  // Check if any currently selected codes are restricted (shouldn't happen but validate)
  const hasRestrictedCodes = cptCodes.some((code) =>
    restrictedCodesMap.has(code)
  );

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
    
    // Check if code is restricted
    if (restrictedCodesMap.has(codeToAdd)) {
      alert(
        `Cannot add CPT ${codeToAdd}: This procedure requires ${restrictedCodesMap.get(codeToAdd)?.requiredCredentials.join(", ")} credentials`
      );
      return;
    }

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

  // Get CPT code details for display
  const getCPTCodeDetails = (code: string) => {
    return COMMON_CPT_CODES.find((c) => c.code === code);
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
          {userCredentials && (
            <span className="ml-2 text-muted-foreground text-xs">
              (Your credentials: {userCredentials})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Show warning if has restricted codes */}
          {hasRestrictedCodes && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some selected CPT codes are outside your scope of practice and
                will be removed upon save.
              </AlertDescription>
            </Alert>
          )}

          {/* Show info about restricted procedures */}
          {restrictedCPTCodes.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{restrictedCPTCodes.length} procedures</strong> are
                restricted for {userCredentials} credentials (e.g., sharp
                debridement requires MD/DO/PA/NP).
              </AlertDescription>
            </Alert>
          )}

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
                      <CommandGroup heading="Allowed CPT Codes">
                        {filteredCPTCodes.filter(
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
                {cptCodes.map((code) => {
                  const isRestricted = restrictedCodesMap.has(code);
                  const details = getCPTCodeDetails(code);
                  
                  return (
                    <TooltipProvider key={code}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={isRestricted ? "destructive" : "secondary"}
                            className="gap-1"
                          >
                            {code}
                            {isRestricted && (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeCptCode(code)}
                              className="hover:text-destructive ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm max-w-xs">
                            {details?.description || code}
                            {isRestricted && (
                              <span className="block mt-1 text-destructive font-semibold">
                                ⚠️ Restricted - Requires{" "}
                                {restrictedCodesMap
                                  .get(code)
                                  ?.requiredCredentials.join(", ")}
                              </span>
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            )}
          </div>

          {/* ICD-10 Codes - No restrictions */}
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

          {/* Modifiers - No restrictions */}
          <div className="space-y-3">
            <Label htmlFor="modifier">Billing Modifiers</Label>
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
                <PopoverContent className="w-[400px] p-0">
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
                  <Badge key={modifier} variant="secondary" className="gap-1">
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
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="time-spent">
                45+ Minutes Spent (Includes exam, treatment, counseling)
              </Label>
              <p className="text-muted-foreground text-sm">
                Required for time-based billing codes
              </p>
            </div>
            <Switch
              id="time-spent"
              checked={timeSpent}
              onCheckedChange={handleTimeSpentChange}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-3">
            <Label htmlFor="billing-notes">
              Additional Billing Notes (Optional)
            </Label>
            <Textarea
              id="billing-notes"
              placeholder="Enter any additional billing notes, counseling topics, or time documentation..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { BillingFormWithCredentials };
