"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Camera, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  addStudyOrder,
  addStudyResult,
  listStudyOrders,
  listStudyResults,
  removeStudyOrder,
  removeStudyResult,
  type StudyCategory,
  type StudyFlag,
  type StudyOrder,
  type StudyResult,
} from "@/app/actions/studies";

// ============================================================================
// StudiesTab — Phase 3 clinical UX, per Dr. May's artifact.
//
// Three sections:
//   1. Order Studies — five chip grids (one per StudyCategory). Clicking a
//      chip toggles addStudyOrder / removeStudyOrder.
//   2. Study Results — table of existing results with a manual-entry row
//      above (test code, date, value, flag, Add).
//   3. Upload / Capture Document — stub buttons for future file upload work.
//
// All mutations run through useTransition so the UI stays responsive and
// the chips/buttons can show pending state. Lists are kept in local state
// so individual chip toggles don't refetch the world.
// ============================================================================

// ----------------------------------------------------------------------------
// Predefined common tests per category. Each entry's `code` is what gets
// persisted as `test_code`; `label` is what the clinician sees on the chip.
// "Other" is a placeholder — wiring up free-text capture for it is left to
// a follow-up; for now it inserts the literal "Other" code.
// ----------------------------------------------------------------------------
type StudyChip = { code: string; label: string };

const CATEGORY_LABELS: Record<StudyCategory, string> = {
  lab: "Labs",
  vascular_imaging: "Vascular Imaging",
  pathology_procedure: "Pathology Procedure",
  tissue_culture: "Tissue Culture",
  biopsy: "Biopsy",
};

const CATEGORY_CHIPS: Record<StudyCategory, readonly StudyChip[]> = {
  lab: [
    { code: "CBC", label: "CBC" },
    { code: "BMP", label: "BMP" },
    { code: "HbA1c", label: "HbA1c" },
    { code: "ESR", label: "ESR" },
    { code: "Prealbumin", label: "Prealbumin" },
    { code: "CRP", label: "CRP" },
    { code: "Other", label: "Other" },
  ],
  vascular_imaging: [
    { code: "ABI", label: "ABI" },
    { code: "Venous doppler", label: "Venous doppler" },
    { code: "Arterial duplex", label: "Arterial duplex" },
    { code: "Other", label: "Other" },
  ],
  pathology_procedure: [
    { code: "Skin Biopsy", label: "Skin Biopsy" },
    { code: "Tissue Culture", label: "Tissue Culture" },
    { code: "Bone Biopsy", label: "Bone Biopsy" },
    { code: "Nerve Conduction", label: "Nerve Conduction" },
    { code: "Other", label: "Other" },
  ],
  tissue_culture: [
    { code: "PCR (Lavine technique)", label: "PCR (Lavine technique)" },
    { code: "Wound swab culture", label: "Wound swab culture" },
    { code: "Tissue culture", label: "Tissue culture" },
    { code: "Other", label: "Other" },
  ],
  biopsy: [
    { code: "Punch biopsy", label: "Punch biopsy" },
    { code: "Shave biopsy", label: "Shave biopsy" },
    { code: "Excisional biopsy", label: "Excisional biopsy" },
    { code: "Other", label: "Other" },
  ],
};

const CATEGORY_ORDER: readonly StudyCategory[] = [
  "lab",
  "vascular_imaging",
  "pathology_procedure",
  "tissue_culture",
  "biopsy",
];

const FLAG_OPTIONS: readonly StudyFlag[] = ["normal", "abnormal", "critical"];

// ----------------------------------------------------------------------------
// Flag visual treatment — green / amber / red per spec.
// ----------------------------------------------------------------------------
function flagClasses(flag: StudyFlag): string {
  switch (flag) {
    case "normal":
      return "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "abnormal":
      return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "critical":
      return "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  }
}

function flagLabel(flag: StudyFlag): string {
  return flag.charAt(0).toUpperCase() + flag.slice(1);
}

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------
export type StudiesTabProps = {
  visitId: string;
  readOnly?: boolean;
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function StudiesTab({ visitId, readOnly = false }: StudiesTabProps) {
  const [orders, setOrders] = useState<StudyOrder[]>([]);
  const [results, setResults] = useState<StudyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  // Manual-entry row state for the Results section.
  const [newTestCode, setNewTestCode] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newFlag, setNewFlag] = useState<StudyFlag>("normal");

  // ------------------------------------------------------------------------
  // Initial load — orders + results in parallel.
  // `loading` initializes to true via useState, so we don't need to flip
  // it in the effect body — that would trip react-hooks/set-state-in-effect.
  // ------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    Promise.all([listStudyOrders(visitId), listStudyResults(visitId)])
      .then(([nextOrders, nextResults]) => {
        if (cancelled) return;
        setOrders(nextOrders);
        setResults(nextResults);
      })
      .catch((error) => {
        console.error("StudiesTab: failed to load", error);
        if (!cancelled) {
          toast.error("Failed to load studies for this visit");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visitId]);

  // ------------------------------------------------------------------------
  // Index orders by category+code so we can answer "is this chip selected?"
  // in O(1) per render without rescanning the array each time.
  // ------------------------------------------------------------------------
  const ordersByKey = useMemo(() => {
    const map = new Map<string, StudyOrder>();
    for (const order of orders) {
      map.set(`${order.category}::${order.test_code}`, order);
    }
    return map;
  }, [orders]);

  // ------------------------------------------------------------------------
  // Chip toggle: if an order with (category, testCode) already exists,
  // remove it; otherwise add it.
  // ------------------------------------------------------------------------
  const handleToggleChip = (category: StudyCategory, chip: StudyChip) => {
    if (readOnly || pending) return;
    const key = `${category}::${chip.code}`;
    const existing = ordersByKey.get(key);

    startTransition(async () => {
      if (existing) {
        const result = await removeStudyOrder(existing.id);
        if (!result.success) {
          toast.error(result.error || "Failed to remove study order");
          return;
        }
        setOrders((prev) => prev.filter((o) => o.id !== existing.id));
        toast.success(`Removed ${chip.label}`);
      } else {
        const result = await addStudyOrder({
          visitId,
          category,
          testCode: chip.code,
          testName: chip.label,
        });
        if (!result.success) {
          toast.error(result.error || "Failed to add study order");
          return;
        }
        // Optimistic-ish: refetch the list so we get server-side fields
        // (ordered_at, ordered_by, created_at). Cheap, since it's one visit.
        const next = await listStudyOrders(visitId);
        setOrders(next);
        toast.success(`Ordered ${chip.label}`);
      }
    });
  };

  // ------------------------------------------------------------------------
  // Manual result entry
  // ------------------------------------------------------------------------
  const handleAddResult = () => {
    if (readOnly || pending) return;
    const trimmedCode = newTestCode.trim();
    if (!trimmedCode) {
      toast.error("Test code is required");
      return;
    }

    startTransition(async () => {
      const result = await addStudyResult({
        visitId,
        testCode: trimmedCode,
        resultDate: newDate ? newDate : undefined,
        resultValue: newValue ? newValue : undefined,
        flag: newFlag,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to add result");
        return;
      }
      const next = await listStudyResults(visitId);
      setResults(next);
      setNewTestCode("");
      setNewDate("");
      setNewValue("");
      setNewFlag("normal");
      toast.success("Result added");
    });
  };

  const handleRemoveResult = (id: string) => {
    if (readOnly || pending) return;
    startTransition(async () => {
      const result = await removeStudyResult(id);
      if (!result.success) {
        toast.error(result.error || "Failed to remove result");
        return;
      }
      setResults((prev) => prev.filter((r) => r.id !== id));
      toast.success("Result removed");
    });
  };

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">
          Loading studies&hellip;
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Order Studies                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Order Studies</CardTitle>
          <CardDescription>
            Tap a chip to order or un-order a study for this visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {CATEGORY_ORDER.map((category) => (
            <div key={category} className="space-y-2">
              <h4 className="text-foreground text-sm font-semibold">
                {CATEGORY_LABELS[category]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_CHIPS[category].map((chip) => {
                  const selected = ordersByKey.has(
                    `${category}::${chip.code}`
                  );
                  return (
                    <button
                      key={chip.code}
                      type="button"
                      onClick={() => handleToggleChip(category, chip)}
                      disabled={readOnly || pending}
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-150",
                        "hover:shadow-md focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:outline-none",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        selected
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      )}
                    >
                      {selected ? (
                        <X className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Study Results                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Study Results</CardTitle>
          <CardDescription>
            Enter results manually or remove rows as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual entry row */}
          {!readOnly && (
            <div className="border-border bg-muted/30 grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_1.4fr_1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor="studies-new-code" className="text-xs">
                  Test code
                </Label>
                <Input
                  id="studies-new-code"
                  value={newTestCode}
                  onChange={(e) => setNewTestCode(e.target.value)}
                  placeholder="e.g. CBC"
                  disabled={pending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="studies-new-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="studies-new-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="studies-new-value" className="text-xs">
                  Value
                </Label>
                <Input
                  id="studies-new-value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. 12.3 g/dL"
                  disabled={pending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="studies-new-flag" className="text-xs">
                  Flag
                </Label>
                <Select
                  value={newFlag}
                  onValueChange={(value) => setNewFlag(value as StudyFlag)}
                  disabled={pending}
                >
                  <SelectTrigger id="studies-new-flag" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAG_OPTIONS.map((flag) => (
                      <SelectItem key={flag} value={flag}>
                        {flagLabel(flag)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddResult}
                  disabled={pending || !newTestCode.trim()}
                  className="w-full md:w-auto"
                >
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Results table */}
          {results.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              No results recorded yet.
            </div>
          ) : (
            <div className="border-border overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Flag</TableHead>
                    {!readOnly && (
                      <TableHead className="w-12 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.test_code}
                        {row.test_name ? (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({row.test_name})
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.result_date ?? "—"}
                      </TableCell>
                      <TableCell>{row.result_value ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", flagClasses(row.flag))}
                        >
                          {flagLabel(row.flag)}
                        </Badge>
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${row.test_code} result`}
                            onClick={() => handleRemoveResult(row.id)}
                            disabled={pending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Upload / Capture Document — stubs                                */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Upload / Capture Document</CardTitle>
          <CardDescription>
            Attach a lab printout, imaging report, or pathology document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO(phase3): wire up to the document-upload pipeline used on the
              Patient Documents tab. The buttons below are intentionally stubs
              so the layout is in place ahead of the file-upload integration. */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={readOnly}
              onClick={() =>
                toast.info("File upload coming soon", {
                  description:
                    "This will attach a document to the visit's studies.",
                })
              }
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={readOnly}
              onClick={() =>
                toast.info("Camera capture coming soon", {
                  description:
                    "This will let you snap a photo of a paper result.",
                })
              }
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
