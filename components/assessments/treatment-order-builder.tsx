"use client";

import { useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DressingPicker } from "./dressing-picker";
import { AlertCircle, FileText, Stethoscope } from "lucide-react";
import {
  type TreatmentTab,
  type TreatmentOrderData,
  TREATMENT_TABS,
  CLEANSING_ACTIONS,
  CLEANSERS,
  TOPICAL_TREATMENTS,
  TOPICAL_COVERAGE,
  APPLICATION_METHODS,
  FREQUENCY_OPTIONS,
  COMPRESSION_TYPE_OPTIONS,
  COMPRESSION_ITEMS,
  NPWT_PRESSURE_OPTIONS,
  NPWT_SCHEDULE_OPTIONS,
  SKIN_CLEANSERS,
  MOISTURE_TREATMENTS,
  RASH_TREATMENTS,
  RASH_COVERAGE,
  RASH_FREQUENCY,
  buildOrderText,
} from "@/lib/treatment-options";

// ============================================================================
// Props
// ============================================================================

type TreatmentOrderBuilderProps = {
  value: TreatmentOrderData;
  onChange: (data: TreatmentOrderData) => void;
  exudateAmount?: string;
  disabled?: boolean;
};

// ============================================================================
// Component
// ============================================================================

export default function TreatmentOrderBuilder({
  value,
  onChange,
  exudateAmount,
  disabled = false,
}: TreatmentOrderBuilderProps) {
  // Generated order text (live preview)
  const generatedOrder = useMemo(() => buildOrderText(value), [value]);

  // Grouped moisture treatments by category
  const groupedMoisture = useMemo(() => {
    const groups: Record<string, typeof MOISTURE_TREATMENTS> = {};
    MOISTURE_TREATMENTS.forEach((t) => {
      const cat = t.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, []);

  // Tab change handler
  const handleTabChange = useCallback(
    (tab: string) => {
      onChange({ ...value, activeTab: tab as TreatmentTab });
    },
    [value, onChange]
  );

  // Field updaters per tab
  const updateTopical = useCallback(
    (field: keyof TreatmentOrderData["openWound"], v: string | boolean) => {
      onChange({ ...value, openWound: { ...value.openWound, [field]: v } });
    },
    [value, onChange]
  );

  const updateCompression = useCallback(
    (
      field: keyof TreatmentOrderData["compressionNpwt"],
      v: string | boolean | string[]
    ) => {
      onChange({
        ...value,
        compressionNpwt: { ...value.compressionNpwt, [field]: v },
      });
    },
    [value, onChange]
  );

  const updateSkinMoisture = useCallback(
    (field: keyof TreatmentOrderData["skinMoisture"], v: string | boolean) => {
      onChange({
        ...value,
        skinMoisture: { ...value.skinMoisture, [field]: v },
      });
    },
    [value, onChange]
  );

  const updateRash = useCallback(
    (
      field: keyof TreatmentOrderData["rashDermatitis"],
      v: string | boolean
    ) => {
      onChange({
        ...value,
        rashDermatitis: { ...value.rashDermatitis, [field]: v },
      });
    },
    [value, onChange]
  );

  const updateEschar = useCallback(
    <K extends keyof TreatmentOrderData["eschar"]>(
      field: K,
      v: TreatmentOrderData["eschar"][K]
    ) => {
      onChange({
        ...value,
        eschar: { ...value.eschar, [field]: v },
      });
    },
    [value, onChange]
  );

  const updateGraftTx = useCallback(
    <K extends keyof TreatmentOrderData["graftTx"]>(
      field: K,
      v: TreatmentOrderData["graftTx"][K]
    ) => {
      onChange({
        ...value,
        graftTx: { ...value.graftTx, [field]: v },
      });
    },
    [value, onChange]
  );

  const updateCustom = useCallback(
    <K extends keyof TreatmentOrderData["custom"]>(
      field: K,
      v: TreatmentOrderData["custom"][K]
    ) => {
      onChange({
        ...value,
        custom: { ...value.custom, [field]: v },
      });
    },
    [value, onChange]
  );

  // Toggle compression item checkbox
  const toggleCompressionItem = useCallback(
    (item: string) => {
      const current = value.compressionNpwt.compressionItems;
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      updateCompression("compressionItems", updated);
    },
    [value.compressionNpwt.compressionItems, updateCompression]
  );

  // Find selected treatment option (for type box rendering)
  const selectedPrimaryOption = useMemo(
    () =>
      TOPICAL_TREATMENTS.find(
        (t) => t.value === value.openWound.primaryTreatment
      ),
    [value.openWound.primaryTreatment]
  );
  const selectedSecondaryOption = useMemo(
    () =>
      TOPICAL_TREATMENTS.find(
        (t) => t.value === value.openWound.secondaryTreatment
      ),
    [value.openWound.secondaryTreatment]
  );
  const selectedMoistureOption = useMemo(
    () =>
      MOISTURE_TREATMENTS.find((t) => t.value === value.skinMoisture.treatment),
    [value.skinMoisture.treatment]
  );

  // ============================================================================
  // Tab 1: Open Wound / Topical Treatment
  // ============================================================================

  const TopicalTab = (
    <div className="space-y-5">
      {/* Row: Cleansing Action + Cleanser */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Action</Label>
          <Select
            value={value.openWound.cleansingAction}
            onValueChange={(v) => updateTopical("cleansingAction", v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLEANSING_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Cleanser</Label>
          <Select
            value={value.openWound.cleanser}
            onValueChange={(v) => updateTopical("cleanser", v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLEANSERS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Application Method */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Application Method</Label>
        <Select
          value={value.openWound.applicationMethod}
          onValueChange={(v) => updateTopical("applicationMethod", v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Primary Treatment (grouped) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Primary Treatment *</Label>
        <DressingPicker
          value={value.openWound.primaryTreatment}
          onChange={(v) => {
            updateTopical("primaryTreatment", v);
            // Clear type box when treatment changes
            if (v !== value.openWound.primaryTreatment) {
              updateTopical("primaryTreatmentType", "");
            }
          }}
          options={TOPICAL_TREATMENTS}
          placeholder="Select treatment…"
          disabled={disabled}
        />
      </div>

      {/* Primary Treatment Type Box (conditional) */}
      {selectedPrimaryOption?.hasTypeBox && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {selectedPrimaryOption.typeBoxLabel || "Type"}
          </Label>
          <Input
            value={value.openWound.primaryTreatmentType}
            onChange={(e) =>
              updateTopical("primaryTreatmentType", e.target.value)
            }
            placeholder={`Enter ${selectedPrimaryOption.typeBoxLabel?.toLowerCase() || "type"}...`}
            disabled={disabled}
          />
        </div>
      )}

      {/* Secondary Dressing */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="secondary-dressing"
            checked={!!value.openWound.secondaryTreatment}
            onCheckedChange={(c) => {
              if (!c) {
                updateTopical("secondaryTreatment", "");
                updateTopical("secondaryTreatmentType", "");
              }
            }}
            disabled={disabled}
          />
          <Label
            htmlFor="secondary-dressing"
            className="cursor-pointer text-sm font-medium"
          >
            Secondary Dressing
          </Label>
        </div>

        {(value.openWound.secondaryTreatment ||
          !value.openWound.secondaryTreatment) && (
          <div className="space-y-3 pl-6">
            <DressingPicker
              value={value.openWound.secondaryTreatment || ""}
              onChange={(v) => {
                updateTopical("secondaryTreatment", v);
                updateTopical("secondaryTreatmentType", "");
              }}
              options={TOPICAL_TREATMENTS}
              placeholder="None"
              allowNone
              disabled={disabled}
            />

            {selectedSecondaryOption?.hasTypeBox &&
              value.openWound.secondaryTreatment && (
                <Input
                  value={value.openWound.secondaryTreatmentType}
                  onChange={(e) =>
                    updateTopical("secondaryTreatmentType", e.target.value)
                  }
                  placeholder={`Enter ${selectedSecondaryOption.typeBoxLabel?.toLowerCase() || "type"}...`}
                  disabled={disabled}
                />
              )}
          </div>
        )}
      </div>

      {/* Coverage */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Coverage / Dressing</Label>
        <Select
          value={value.openWound.coverage}
          onValueChange={(v) => updateTopical("coverage", v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOPICAL_COVERAGE.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency + PRN */}
      <div className="flex items-end gap-4">
        <div className="w-40 space-y-2">
          <Label className="text-sm font-medium">Frequency</Label>
          <Select
            value={value.openWound.frequency}
            onValueChange={(v) => updateTopical("frequency", v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="topical-prn"
            checked={value.openWound.prn}
            onCheckedChange={(c) => updateTopical("prn", c as boolean)}
            disabled={disabled}
          />
          <Label htmlFor="topical-prn" className="cursor-pointer font-normal">
            and PRN
          </Label>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Tab 2: Compression / NPWT
  // ============================================================================

  const CompressionTab = (
    <div className="space-y-5">
      {/* Treatment Type selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Treatment Type *</Label>
        <Select
          value={value.compressionNpwt.selectedType}
          onValueChange={(v) => updateCompression("selectedType", v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select treatment type..." />
          </SelectTrigger>
          <SelectContent>
            {COMPRESSION_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Compression Therapy — sub-item checkboxes */}
      {value.compressionNpwt.selectedType === "compression_therapy" && (
        <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">
            Select compression items:
          </p>
          <div className="flex flex-wrap gap-4">
            {COMPRESSION_ITEMS.map((item) => (
              <div key={item.value} className="flex items-center gap-2">
                <Checkbox
                  id={`comp-${item.value}`}
                  checked={value.compressionNpwt.compressionItems.includes(
                    item.value
                  )}
                  onCheckedChange={() => toggleCompressionItem(item.value)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`comp-${item.value}`}
                  className="cursor-pointer font-normal"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UNNA Boot / Layered Compression — frequency + provider */}
      {(value.compressionNpwt.selectedType === "unna_boot" ||
        value.compressionNpwt.selectedType === "layered_compression") && (
        <div className="bg-muted/50 space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dressing-provider"
              checked={value.compressionNpwt.dressingByProvider}
              onCheckedChange={(c) =>
                updateCompression("dressingByProvider", c as boolean)
              }
              disabled={disabled}
            />
            <Label
              htmlFor="dressing-provider"
              className="cursor-pointer font-normal"
            >
              Dressing applied by the provider
            </Label>
          </div>

          <div className="flex items-end gap-4">
            <div className="w-40 space-y-2">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select
                value={value.compressionNpwt.frequency}
                onValueChange={(v) => updateCompression("frequency", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="comp-prn"
                checked={value.compressionNpwt.prn}
                onCheckedChange={(c) => updateCompression("prn", c as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="comp-prn" className="cursor-pointer font-normal">
                and PRN
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* NPWT Settings */}
      {value.compressionNpwt.selectedType === "npwt" && (
        <div className="bg-muted/50 space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="npwt-provider"
              checked={value.compressionNpwt.dressingByProvider}
              onCheckedChange={(c) =>
                updateCompression("dressingByProvider", c as boolean)
              }
              disabled={disabled}
            />
            <Label
              htmlFor="npwt-provider"
              className="cursor-pointer font-normal"
            >
              Dressing applied by the provider
            </Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Pressure (mmHg)</Label>
              <Select
                value={value.compressionNpwt.npwtPressure}
                onValueChange={(v) => updateCompression("npwtPressure", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPWT_PRESSURE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Schedule</Label>
              <Select
                value={value.compressionNpwt.npwtSchedule}
                onValueChange={(v) => updateCompression("npwtSchedule", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPWT_SCHEDULE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {value.compressionNpwt.npwtSchedule === "other" && (
            <Input
              value={value.compressionNpwt.npwtScheduleOther}
              onChange={(e) =>
                updateCompression("npwtScheduleOther", e.target.value)
              }
              placeholder="Specify schedule..."
              disabled={disabled}
            />
          )}
        </div>
      )}

      {/* Description preview */}
      {value.compressionNpwt.selectedType && (
        <div className="border-primary/20 bg-primary/5 flex gap-2 rounded-md border p-3 text-sm">
          <AlertCircle className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-primary/80">
            {
              COMPRESSION_TYPE_OPTIONS.find(
                (o) => o.value === value.compressionNpwt.selectedType
              )?.description
            }
          </p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Tab 3: Skin / Moisture
  // ============================================================================

  const SkinMoistureTab = (
    <div className="space-y-5">
      {/* Cleanser */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Cleanser</Label>
        <Select
          value={value.skinMoisture.cleanser}
          onValueChange={(v) => updateSkinMoisture("cleanser", v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SKIN_CLEANSERS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Treatment (grouped) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Treatment *</Label>
        <Select
          value={value.skinMoisture.treatment}
          onValueChange={(v) => {
            updateSkinMoisture("treatment", v);
            if (v !== value.skinMoisture.treatment) {
              updateSkinMoisture("treatmentType", "");
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select treatment..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedMoisture).map(([category, items]) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {items.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Treatment Type Box (conditional) */}
      {selectedMoistureOption?.hasTypeBox && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {selectedMoistureOption.typeBoxLabel || "Type"}
          </Label>
          <Input
            value={value.skinMoisture.treatmentType}
            onChange={(e) =>
              updateSkinMoisture("treatmentType", e.target.value)
            }
            placeholder={`Enter ${selectedMoistureOption.typeBoxLabel?.toLowerCase() || "type"}...`}
            disabled={disabled}
          />
        </div>
      )}

      {/* Frequency + PRN */}
      <div className="flex items-end gap-4">
        <div className="w-40 space-y-2">
          <Label className="text-sm font-medium">Frequency</Label>
          <Select
            value={value.skinMoisture.frequency}
            onValueChange={(v) => updateSkinMoisture("frequency", v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="skin-prn"
            checked={value.skinMoisture.prn}
            onCheckedChange={(c) => updateSkinMoisture("prn", c as boolean)}
            disabled={disabled}
          />
          <Label htmlFor="skin-prn" className="cursor-pointer font-normal">
            and PRN
          </Label>
        </div>
      </div>

      {/* Auto-notes for hydrocolloid / adhesive film */}
      {(value.skinMoisture.treatment === "hydrocolloid" ||
        value.skinMoisture.treatment === "adhesive_film") && (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-amber-800 dark:text-amber-300">
            {value.skinMoisture.treatment === "hydrocolloid"
              ? "Hydrocolloid — follow manufacturer's recommendations. Change as indicated and PRN."
              : "Adhesive Film — follow manufacturer's recommendations. Change as indicated and PRN."}
          </p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Tab 4: Rash / Dermatitis
  // ============================================================================

  const RashTab = (
    <div className="space-y-5">
      {/* Treatment */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Treatment *</Label>
        <Select
          value={value.rashDermatitis.treatment}
          onValueChange={(v) => updateRash("treatment", v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select treatment..." />
          </SelectTrigger>
          <SelectContent>
            {RASH_TREATMENTS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Other text box */}
      {value.rashDermatitis.treatment === "other" && (
        <Input
          value={value.rashDermatitis.treatmentOther}
          onChange={(e) => updateRash("treatmentOther", e.target.value)}
          placeholder="Specify treatment..."
          disabled={disabled}
        />
      )}

      {/* Coverage */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Coverage</Label>
        <Select
          value={value.rashDermatitis.coverage}
          onValueChange={(v) => updateRash("coverage", v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RASH_COVERAGE.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Secondary Dressing */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="rash-secondary"
            checked={value.rashDermatitis.hasSecondaryDressing}
            onCheckedChange={(c) => {
              updateRash("hasSecondaryDressing", c as boolean);
              if (!c) updateRash("secondaryDressing", "");
            }}
            disabled={disabled}
          />
          <Label
            htmlFor="rash-secondary"
            className="cursor-pointer text-sm font-medium"
          >
            Secondary Dressing
          </Label>
          {value.rashDermatitis.hasSecondaryDressing && (
            <span className="text-muted-foreground text-xs">
              then overlay to wound bed and leave open to air
            </span>
          )}
        </div>
        {value.rashDermatitis.hasSecondaryDressing && (
          <div className="pl-6">
            <Select
              value={value.rashDermatitis.secondaryDressing}
              onValueChange={(v) => updateRash("secondaryDressing", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dressing..." />
              </SelectTrigger>
              <SelectContent>
                {RASH_TREATMENTS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tertiary Dressing */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="rash-tertiary"
            checked={value.rashDermatitis.hasTertiaryDressing}
            onCheckedChange={(c) => {
              updateRash("hasTertiaryDressing", c as boolean);
              if (!c) updateRash("tertiaryDressing", "");
            }}
            disabled={disabled}
          />
          <Label
            htmlFor="rash-tertiary"
            className="cursor-pointer text-sm font-medium"
          >
            Tertiary Dressing
          </Label>
          {value.rashDermatitis.hasTertiaryDressing && (
            <span className="text-muted-foreground text-xs">
              then overlay to wound bed and leave open to air
            </span>
          )}
        </div>
        {value.rashDermatitis.hasTertiaryDressing && (
          <div className="pl-6">
            <Select
              value={value.rashDermatitis.tertiaryDressing}
              onValueChange={(v) => updateRash("tertiaryDressing", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dressing..." />
              </SelectTrigger>
              <SelectContent>
                {RASH_TREATMENTS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Frequency + PRN */}
      <div className="flex items-end gap-4">
        <div className="w-40 space-y-2">
          <Label className="text-sm font-medium">Frequency</Label>
          <Select
            value={value.rashDermatitis.frequency}
            onValueChange={(v) => updateRash("frequency", v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RASH_FREQUENCY.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="rash-prn"
            checked={value.rashDermatitis.prn}
            onCheckedChange={(c) => updateRash("prn", c as boolean)}
            disabled={disabled}
          />
          <Label htmlFor="rash-prn" className="cursor-pointer font-normal">
            and PRN
          </Label>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Tab 5: Eschar (Dr. May artifact 2026-05-29)
  // ============================================================================

  const EscharTab = (
    <div className="space-y-4">
      <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-semibold tracking-wide">
            SELECT ONE TREATMENT OPTION
          </span>
        </div>

        <RadioGroup
          value={value.eschar.selectedOption ?? ""}
          onValueChange={(v) =>
            updateEschar(
              "selectedOption",
              v as TreatmentOrderData["eschar"]["selectedOption"]
            )
          }
          disabled={disabled}
          className="gap-4"
        >
          {/* Option 1: Paint betadine */}
          <div className="space-y-3 rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="paint_betadine"
                id="eschar-paint-betadine"
                className="mt-1"
              />
              <Label
                htmlFor="eschar-paint-betadine"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Paint wound bed with betadine, allow to air dry and{" "}
                <span className="font-medium">[select cover]</span> daily and
                PRN.
              </Label>
            </div>
            {value.eschar.selectedOption === "paint_betadine" && (
              <div className="pl-7">
                <Select
                  value={value.eschar.paintBetadineCover ?? ""}
                  onValueChange={(v) =>
                    updateEschar(
                      "paintBetadineCover",
                      v as TreatmentOrderData["eschar"]["paintBetadineCover"]
                    )
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Select cover option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="air">Leave open to air</SelectItem>
                    <SelectItem value="dry_dressing">
                      Cover with dry, clean dressing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Option 2: Keep dry */}
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="keep_dry"
                id="eschar-keep-dry"
                className="mt-1"
              />
              <Label
                htmlFor="eschar-keep-dry"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Keep dry and cover with dry, clean dressing daily and PRN.
              </Label>
            </div>
          </div>

          {/* Option 3: Other */}
          <div className="space-y-3 rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="other"
                id="eschar-other"
                className="mt-1"
              />
              <Label
                htmlFor="eschar-other"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Other:
              </Label>
            </div>
            {value.eschar.selectedOption === "other" && (
              <div className="pl-7">
                <Input
                  value={value.eschar.otherText ?? ""}
                  onChange={(e) => updateEschar("otherText", e.target.value)}
                  placeholder="Specify treatment..."
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  // ============================================================================
  // Tab 6: Graft Tx (Dr. May artifact 2026-05-29)
  // ============================================================================

  const GraftTxTab = (
    <div className="space-y-4">
      {/* STEP 1 — Wound evaluation & frequency */}
      <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-semibold tracking-wide">
            STEP 1
          </span>
          <span className="text-sm font-medium">
            Wound evaluation &amp; treatment order
          </span>
        </div>

        <div className="text-sm leading-relaxed">
          Wound evaluation, prep and membrane application by MD{" "}
          <span className="inline-block align-middle">
            <Select
              value={value.graftTx.frequency ?? ""}
              onValueChange={(v) =>
                updateGraftTx(
                  "frequency",
                  v as TreatmentOrderData["graftTx"]["frequency"]
                )
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Select frequency..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">weekly</SelectItem>
                <SelectItem value="biweekly">every 2 weeks</SelectItem>
                <SelectItem value="as_indicated">as indicated</SelectItem>
              </SelectContent>
            </Select>
          </span>{" "}
          to facilitate wound healing.
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Continue daily treatment evaluation of wound, monitoring for
          intactness of dressing as well as signs and symptoms of infection.
        </p>
      </div>

      {/* STEP 2 — Dressing change interval */}
      <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-semibold tracking-wide">
            STEP 2
          </span>
          <span className="text-sm font-medium">
            Dressing change interval
          </span>
        </div>

        <RadioGroup
          value={value.graftTx.dressingChangeInterval ?? ""}
          onValueChange={(v) =>
            updateGraftTx(
              "dressingChangeInterval",
              v as TreatmentOrderData["graftTx"]["dressingChangeInterval"]
            )
          }
          disabled={disabled}
          className="gap-3"
        >
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="7_days"
                id="graft-7-days"
                className="mt-1"
              />
              <Label
                htmlFor="graft-7-days"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Change dressing in 7 days. Continue treatment, evaluation, and
                monitor for signs of infection.
              </Label>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="custom"
                id="graft-custom-interval"
                className="mt-1"
              />
              <Label
                htmlFor="graft-custom-interval"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Custom interval:
              </Label>
            </div>
            {value.graftTx.dressingChangeInterval === "custom" && (
              <div className="pl-7">
                <Input
                  value={value.graftTx.customInterval ?? ""}
                  onChange={(e) =>
                    updateGraftTx("customInterval", e.target.value)
                  }
                  placeholder="describe dressing change schedule..."
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </div>

      {/* STEP 3 — If soiled or dislodged before day 7 */}
      <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-semibold tracking-wide">
            STEP 3
          </span>
          <span className="text-sm font-medium">
            If dressing becomes soiled or dislodged before day 7
          </span>
        </div>

        <RadioGroup
          value={value.graftTx.ifSoiledDislodged ?? ""}
          onValueChange={(v) =>
            updateGraftTx(
              "ifSoiledDislodged",
              v as TreatmentOrderData["graftTx"]["ifSoiledDislodged"]
            )
          }
          disabled={disabled}
          className="gap-3"
        >
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="remove_secondary"
                id="graft-remove-secondary"
                className="mt-1"
              />
              <Label
                htmlFor="graft-remove-secondary"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Remove secondary dry gauze dressing leaving graft and
                non-adherent dressing in place. Replace gauze and re-secure.
              </Label>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="cleanse_apply"
                id="graft-cleanse-apply"
                className="mt-1"
              />
              <Label
                htmlFor="graft-cleanse-apply"
                className="cursor-pointer text-sm leading-relaxed font-normal"
              >
                Cleanse wound with saline, pad dry and apply{" "}
                <span className="font-medium">
                  [select primary dressing]
                </span>{" "}
                as primary, cover with dry dressing daily.
              </Label>
            </div>
            {value.graftTx.ifSoiledDislodged === "cleanse_apply" && (
              <div className="pl-7">
                <Input
                  value={value.graftTx.ifSoiledDressing ?? ""}
                  onChange={(e) =>
                    updateGraftTx("ifSoiledDressing", e.target.value)
                  }
                  placeholder="Select primary dressing..."
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  // ============================================================================
  // Tab 7: Custom (Dr. May artifact 2026-05-29)
  // ============================================================================

  const CustomTab = (
    <div className="space-y-3">
      <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
        <Label htmlFor="custom-order-text" className="text-sm font-medium">
          Custom Order
        </Label>
        <Textarea
          id="custom-order-text"
          value={value.custom.orderText ?? ""}
          onChange={(e) => updateCustom("orderText", e.target.value)}
          placeholder="Type your custom order here..."
          rows={6}
          disabled={disabled}
        />
      </div>
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Treatment Order
            </CardTitle>
            <CardDescription>
              Build a treatment order for this wound using the tabbed selector
              below
            </CardDescription>
          </div>
          {exudateAmount && (
            <Badge variant="outline" className="text-xs">
              Exudate: {exudateAmount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 7-Tab Selector */}
        <Tabs
          value={value.activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-3 md:grid-cols-7">
            {TREATMENT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs sm:text-sm"
                disabled={disabled}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="open_wound" className="mt-4">
            {TopicalTab}
          </TabsContent>

          <TabsContent value="eschar" className="mt-4">
            {EscharTab}
          </TabsContent>

          <TabsContent value="compression_npwt" className="mt-4">
            {CompressionTab}
          </TabsContent>

          <TabsContent value="skin_moisture" className="mt-4">
            {SkinMoistureTab}
          </TabsContent>

          <TabsContent value="rash_dermatitis" className="mt-4">
            {RashTab}
          </TabsContent>

          <TabsContent value="graft_tx" className="mt-4">
            {GraftTxTab}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            {CustomTab}
          </TabsContent>
        </Tabs>

        {/* Generated Order Preview */}
        {generatedOrder && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Generated Treatment Order
              </Label>
              <div className="bg-muted/50 rounded-lg border p-3">
                <p className="text-sm leading-relaxed">{generatedOrder}</p>
              </div>
            </div>
          </>
        )}

        {/* Special Instructions (collapsible) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-special"
              checked={!!value.specialInstructions}
              onCheckedChange={(c) => {
                if (!c) {
                  onChange({ ...value, specialInstructions: "" });
                }
              }}
              disabled={disabled}
            />
            <Label
              htmlFor="show-special"
              className="cursor-pointer text-sm font-normal"
            >
              Add special instructions
            </Label>
          </div>
          {(value.specialInstructions || value.specialInstructions === "") && (
            <Textarea
              value={value.specialInstructions}
              onChange={(e) =>
                onChange({ ...value, specialInstructions: e.target.value })
              }
              placeholder="Additional treatment instructions or clinical notes..."
              rows={3}
              disabled={disabled}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
