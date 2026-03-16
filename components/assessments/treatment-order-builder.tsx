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

  // Grouped topical treatments by category for the select
  const groupedTopicals = useMemo(() => {
    const groups: Record<string, typeof TOPICAL_TREATMENTS> = {};
    TOPICAL_TREATMENTS.forEach((t) => {
      const cat = t.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, []);

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
    (field: keyof TreatmentOrderData["topical"], v: string | boolean) => {
      onChange({ ...value, topical: { ...value.topical, [field]: v } });
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
        (t) => t.value === value.topical.primaryTreatment
      ),
    [value.topical.primaryTreatment]
  );
  const selectedSecondaryOption = useMemo(
    () =>
      TOPICAL_TREATMENTS.find(
        (t) => t.value === value.topical.secondaryTreatment
      ),
    [value.topical.secondaryTreatment]
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
            value={value.topical.cleansingAction}
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
            value={value.topical.cleanser}
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
          value={value.topical.applicationMethod}
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
        <Select
          value={value.topical.primaryTreatment}
          onValueChange={(v) => {
            updateTopical("primaryTreatment", v);
            // Clear type box when treatment changes
            if (v !== value.topical.primaryTreatment) {
              updateTopical("primaryTreatmentType", "");
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select treatment..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedTopicals).map(([category, items]) => (
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

      {/* Primary Treatment Type Box (conditional) */}
      {selectedPrimaryOption?.hasTypeBox && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {selectedPrimaryOption.typeBoxLabel || "Type"}
          </Label>
          <Input
            value={value.topical.primaryTreatmentType}
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
            checked={!!value.topical.secondaryTreatment}
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

        {(value.topical.secondaryTreatment ||
          !value.topical.secondaryTreatment) && (
          <div className="space-y-3 pl-6">
            <Select
              value={value.topical.secondaryTreatment || "none"}
              onValueChange={(v) => {
                updateTopical("secondaryTreatment", v === "none" ? "" : v);
                updateTopical("secondaryTreatmentType", "");
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Object.entries(groupedTopicals).map(([category, items]) => (
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

            {selectedSecondaryOption?.hasTypeBox &&
              value.topical.secondaryTreatment && (
                <Input
                  value={value.topical.secondaryTreatmentType}
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
          value={value.topical.coverage}
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
            value={value.topical.frequency}
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
            checked={value.topical.prn}
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
        <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-blue-800 dark:text-blue-300">
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
        {/* 4-Tab Selector */}
        <Tabs
          value={value.activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
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

          <TabsContent value="topical" className="mt-4">
            {TopicalTab}
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
