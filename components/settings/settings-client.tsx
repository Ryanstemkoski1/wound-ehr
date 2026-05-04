"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Loader2,
  Check,
  ImageIcon,
  FileText,
  Ruler,
  Globe,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  savePDFPreferences,
  type PDFPreferences,
} from "@/app/actions/preferences";

type Facility = { id: string; name: string };

type Props = {
  initialPreferences: PDFPreferences;
  facilities?: Facility[];
};

const photoSizeDescriptions: Record<PDFPreferences["pdf_photo_size"], string> =
  {
    small: "Thumbnail — 100pt height, fits more content per page",
    medium: "Standard — 150pt height, good balance of detail and space",
    large: "Full detail — 220pt height, best for clinical review",
  };

// Common IANA timezone identifiers with human-readable labels
const IANA_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Puerto_Rico", label: "Puerto Rico (AST)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Manila", label: "Philippines (PHT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
] as const;

export default function SettingsClient({
  initialPreferences,
  facilities = [],
}: Props) {
  const [prefs, setPrefs] = useState<PDFPreferences>(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-clear saved indicator after 3 seconds
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const hasChanges =
    prefs.pdf_include_photos !== initialPreferences.pdf_include_photos ||
    prefs.pdf_photo_size !== initialPreferences.pdf_photo_size ||
    prefs.pdf_max_photos_per_assessment !==
      initialPreferences.pdf_max_photos_per_assessment ||
    prefs.pdf_page_size !== initialPreferences.pdf_page_size ||
    prefs.timezone !== initialPreferences.timezone ||
    prefs.default_facility_id !== initialPreferences.default_facility_id;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await savePDFPreferences(prefs);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* General Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General
          </CardTitle>
          <CardDescription>Display and workspace defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-sm font-medium">
              Timezone
            </Label>
            <Select
              value={prefs.timezone ?? ""}
              onValueChange={(tz) =>
                setPrefs((p) => ({ ...p, timezone: tz || undefined }))
              }
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {IANA_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Used to display visit dates and times in your local time
            </p>
          </div>

          {/* Default facility */}
          {facilities.length > 0 && (
            <div className="space-y-2">
              <Label
                htmlFor="default-facility"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <Building2 className="h-3.5 w-3.5" />
                Default Facility
              </Label>
              <Select
                value={prefs.default_facility_id ?? ""}
                onValueChange={(fid) =>
                  setPrefs((p) => ({
                    ...p,
                    default_facility_id: fid || undefined,
                  }))
                }
              >
                <SelectTrigger id="default-facility" className="w-full">
                  <SelectValue placeholder="No default (show all facilities)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    No default (show all facilities)
                  </SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Pre-selected when creating new patients or visits
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Wound Photos in PDFs
          </CardTitle>
          <CardDescription>
            Control how wound photos appear when exporting visit and wound
            progress reports to PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Include photos toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-photos" className="text-sm font-medium">
                Include wound photos
              </Label>
              <p className="text-muted-foreground text-sm">
                When disabled, PDFs will contain only text-based clinical data
              </p>
            </div>
            <Switch
              id="include-photos"
              checked={prefs.pdf_include_photos}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({ ...p, pdf_include_photos: checked }))
              }
            />
          </div>

          <Separator />

          {/* Photo size */}
          <div
            className={cn(
              "space-y-3 transition-opacity",
              !prefs.pdf_include_photos && "pointer-events-none opacity-40"
            )}
          >
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Photo size</Label>
              <p className="text-muted-foreground text-sm">
                {photoSizeDescriptions[prefs.pdf_photo_size]}
              </p>
            </div>
            <div className="flex gap-2">
              {(["small", "medium", "large"] as const).map((size) => (
                <Button
                  key={size}
                  variant={
                    prefs.pdf_photo_size === size ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setPrefs((p) => ({ ...p, pdf_photo_size: size }))
                  }
                  className="flex-1 capitalize"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Max photos per assessment */}
          <div
            className={cn(
              "space-y-3 transition-opacity",
              !prefs.pdf_include_photos && "pointer-events-none opacity-40"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  Photos per assessment
                </Label>
                <p className="text-muted-foreground text-sm">
                  Maximum number of wound photos to include per assessment entry
                </p>
              </div>
              <Badge variant="secondary" className="text-sm tabular-nums">
                {prefs.pdf_max_photos_per_assessment}
              </Badge>
            </div>
            <Slider
              value={[prefs.pdf_max_photos_per_assessment]}
              onValueChange={([value]) =>
                setPrefs((p) => ({
                  ...p,
                  pdf_max_photos_per_assessment: value,
                }))
              }
              min={1}
              max={6}
              step={1}
              className="w-full"
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>1</span>
              <span>6</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Settings
          </CardTitle>
          <CardDescription>
            General PDF export formatting options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Page size</Label>
            <Select
              value={prefs.pdf_page_size}
              onValueChange={(value: "letter" | "a4") =>
                setPrefs((p) => ({ ...p, pdf_page_size: value }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5" />
                    US Letter (8.5 × 11 in)
                  </div>
                </SelectItem>
                <SelectItem value="a4">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5" />
                    A4 (210 × 297 mm)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-lg border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <div className="text-sm">
          {error && <span className="text-red-500">{error}</span>}
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600">
              <Check className="h-4 w-4" />
              Preferences saved
            </span>
          )}
          {!error && !saved && !saving && (
            <span className="text-muted-foreground">
              {hasChanges
                ? "You have unsaved changes"
                : "All preferences are saved"}
            </span>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
