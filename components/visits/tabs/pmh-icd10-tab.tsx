"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  PMH_KEYS,
  PMH_LABELS,
  type PmhFlags,
  type PmhKey,
  getPatientPmhFlags,
  updatePatientPmhFlags,
} from "@/app/actions/patient-pmh";
import {
  type Icd10SearchHit,
  type PatientIcd10Row,
  addPatientIcd10,
  deactivatePatientIcd10,
  listActivePatientIcd10,
  searchIcd10Codes,
} from "@/app/actions/patient-icd10";

// =====================================================
// PmhIcd10Tab — combined Past Medical History + active
// ICD-10 problem list surface for the visit screen.
// =====================================================
//
// Two stacked sections backed by patient-level state (not visit-level):
//   1. Active ICD-10 diagnoses chip list + typeahead + manual add
//   2. PMH flag grid (toggleable checkbox chips) with auto-save
//
// Writes funnel through the patient-pmh / patient-icd10 server actions;
// RLS handles tenant scoping. We optimistically update local state so
// the UI stays responsive while useTransition runs the action.

export type PmhIcd10TabProps = {
  patientId: string;
  visitId: string;
  readOnly?: boolean;
};

// Build an "all false" PmhFlags scaffold so the grid can render before
// the initial fetch resolves without keys being `undefined`.
function emptyPmhFlags(): PmhFlags {
  const out = {} as PmhFlags;
  for (const k of PMH_KEYS) out[k] = false;
  return out;
}

export function PmhIcd10Tab({
  patientId,
  // visitId is accepted for parity with sibling tabs and future per-visit
  // hooks (e.g. "copy active ICD-10s into billing for this visit"). The
  // current PMH/ICD-10 surface is patient-scoped, so it's intentionally
  // unused at the moment — keep the prop to avoid breaking callers.
  visitId: _visitId,
  readOnly = false,
}: PmhIcd10TabProps) {
  // ---------- ICD-10 state ----------
  const [icd10Rows, setIcd10Rows] = useState<PatientIcd10Row[]>([]);
  const [icd10Loading, setIcd10Loading] = useState(true);

  // Typeahead
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<Icd10SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  // Manual add
  const [manualCode, setManualCode] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  // ---------- PMH state ----------
  const [pmhFlags, setPmhFlags] = useState<PmhFlags>(() => emptyPmhFlags());
  const [pmhLoading, setPmhLoading] = useState(true);

  const [isPending, startTransition] = useTransition();

  // ---------- Initial load ----------
  // pmhLoading / icd10Loading initialize to `true` (see useState defaults
  // above), so we don't need to flip them in the effect body — that would
  // trip react-hooks/set-state-in-effect. If patientId ever changes mid-
  // mount, the stale loading state stays false until new data arrives,
  // which is acceptable for this surface.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getPatientPmhFlags(patientId).then(
        (flags) => ({ kind: "pmh" as const, flags }),
        (err: unknown) => ({ kind: "pmh-error" as const, err })
      ),
      listActivePatientIcd10(patientId).then(
        (res) => ({ kind: "icd10" as const, res }),
        (err: unknown) => ({ kind: "icd10-error" as const, err })
      ),
    ]).then((results) => {
      if (cancelled) return;
      for (const r of results) {
        if (r.kind === "pmh") {
          setPmhFlags(r.flags);
        } else if (r.kind === "pmh-error") {
          toast.error(
            r.err instanceof Error
              ? r.err.message
              : "Failed to load past medical history"
          );
        } else if (r.kind === "icd10") {
          if (r.res.success) {
            setIcd10Rows(r.res.rows);
          } else {
            toast.error(r.res.error ?? "Failed to load ICD-10 list");
          }
        } else {
          toast.error(
            r.err instanceof Error
              ? r.err.message
              : "Failed to load ICD-10 list"
          );
        }
      }
      setPmhLoading(false);
      setIcd10Loading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // ---------- Debounced ICD-10 typeahead ----------
  //
  // We track the "in-flight" query via a ref so a stale response from
  // an earlier keystroke can't clobber the newer one's results.
  const latestQueryRef = useRef("");

  useEffect(() => {
    const q = searchQuery.trim();
    latestQueryRef.current = q;

    if (q.length === 0) {
      // Synchronizing derived UI state with the empty-input case is a
      // legitimate setState-in-effect use (the alternative would be to
      // derive everything from `searchQuery` on every render, which would
      // also re-fire the debounced fetch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchHits([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handle = window.setTimeout(() => {
      searchIcd10Codes(q)
        .then((hits) => {
          // Drop the result if the user has typed further since.
          if (latestQueryRef.current !== q) return;
          setSearchHits(hits.slice(0, 10));
          setSearchOpen(true);
          setSearching(false);
        })
        .catch((err: unknown) => {
          if (latestQueryRef.current !== q) return;
          setSearching(false);
          toast.error(
            err instanceof Error ? err.message : "ICD-10 search failed"
          );
        });
    }, 200);

    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  // ---------- Mutations ----------

  const handleAddIcd10 = useCallback(
    (code: string, description?: string) => {
      if (readOnly) return;
      const trimmedCode = code.trim();
      if (!trimmedCode) return;

      startTransition(async () => {
        const res = await addPatientIcd10(
          patientId,
          trimmedCode,
          description?.trim() || undefined
        );
        if (!res.success) {
          toast.error(res.error ?? "Failed to add ICD-10 code");
          return;
        }

        // Splice the new row in: if it was a reactivation, replace any
        // existing entry with the same code; otherwise prepend.
        setIcd10Rows((prev) => {
          const without = prev.filter(
            (r) => r.icd10_code !== res.row.icd10_code
          );
          return [res.row, ...without];
        });
        toast.success(
          res.reactivated
            ? `Reactivated ${res.row.icd10_code}`
            : `Added ${res.row.icd10_code}`
        );
      });
    },
    [patientId, readOnly]
  );

  const handleTypeaheadPick = useCallback(
    (hit: Icd10SearchHit) => {
      setSearchQuery("");
      setSearchHits([]);
      setSearchOpen(false);
      handleAddIcd10(hit.code, hit.description);
    },
    [handleAddIcd10]
  );

  const handleManualAdd = useCallback(() => {
    if (!manualCode.trim()) {
      toast.error("Enter an ICD-10 code");
      return;
    }
    handleAddIcd10(manualCode, manualDescription);
    setManualCode("");
    setManualDescription("");
  }, [manualCode, manualDescription, handleAddIcd10]);

  const handleRemoveIcd10 = useCallback(
    (row: PatientIcd10Row) => {
      if (readOnly) return;
      // Optimistic removal — we restore on failure.
      const snapshot = icd10Rows;
      setIcd10Rows((prev) => prev.filter((r) => r.id !== row.id));

      startTransition(async () => {
        const res = await deactivatePatientIcd10(row.id);
        if (!res.success) {
          setIcd10Rows(snapshot);
          toast.error(res.error ?? "Failed to remove ICD-10 code");
        }
      });
    },
    [icd10Rows, readOnly]
  );

  const handleTogglePmh = useCallback(
    (key: PmhKey) => {
      if (readOnly) return;
      // Optimistic flip + snapshot for rollback.
      const next: PmhFlags = { ...pmhFlags, [key]: !pmhFlags[key] };
      const snapshot = pmhFlags;
      setPmhFlags(next);

      startTransition(async () => {
        const res = await updatePatientPmhFlags(patientId, next);
        if (!res.success) {
          setPmhFlags(snapshot);
          toast.error(res.error ?? "Failed to save PMH flag");
        } else {
          // Server returns the canonical full set — adopt it.
          setPmhFlags(res.flags);
        }
      });
    },
    [pmhFlags, patientId, readOnly]
  );

  // ---------- Render ----------

  const pmhEntries = useMemo(
    () =>
      PMH_KEYS.map((key) => ({
        key,
        label: PMH_LABELS[key],
        checked: pmhFlags[key],
      })),
    [pmhFlags]
  );

  return (
    <div className="flex flex-col gap-8">
      {/* =========================================================
          Section 1 — Active ICD-10 diagnoses
          ========================================================= */}
      <section
        aria-labelledby="pmh-icd10-active-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h3
            id="pmh-icd10-active-heading"
            className="text-base font-semibold"
          >
            Active ICD-10 Diagnoses
          </h3>
          {isPending ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </span>
          ) : null}
        </div>

        {/* Chip list */}
        <div className="flex flex-wrap gap-2">
          {icd10Loading ? (
            <span className="text-muted-foreground text-sm">Loading…</span>
          ) : icd10Rows.length === 0 ? (
            <span className="text-muted-foreground text-sm italic">
              No active diagnoses on the problem list.
            </span>
          ) : (
            icd10Rows.map((row) => (
              <span
                key={row.id}
                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              >
                <span className="font-mono font-semibold">
                  {row.icd10_code}
                </span>
                {row.description ? (
                  <span className="text-muted-foreground max-w-[28ch] truncate">
                    {row.description}
                  </span>
                ) : null}
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveIcd10(row)}
                    className="hover:bg-destructive/10 hover:text-destructive ml-0.5 inline-flex size-5 items-center justify-center rounded-full transition-colors"
                    aria-label={`Remove ${row.icd10_code}`}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </span>
            ))
          )}
        </div>

        {/* Typeahead */}
        {!readOnly ? (
          <div className="relative">
            <Label
              htmlFor="icd10-search"
              className="text-muted-foreground mb-1 block text-xs uppercase tracking-wide"
            >
              Search ICD-10
            </Label>
            <div className="relative">
              <Input
                id="icd10-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchHits.length > 0) setSearchOpen(true);
                }}
                onBlur={() => {
                  // Defer close so click on a result still registers.
                  window.setTimeout(() => setSearchOpen(false), 120);
                }}
                placeholder="Type a code or description…"
                autoComplete="off"
              />
              {searching ? (
                <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
              ) : null}
            </div>

            {searchOpen && searchHits.length > 0 ? (
              <ul
                role="listbox"
                className="bg-popover absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border shadow-md"
              >
                {searchHits.map((hit) => (
                  <li key={hit.code}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur from closing the list before click.
                        e.preventDefault();
                      }}
                      onClick={() => handleTypeaheadPick(hit)}
                      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                    >
                      <span className="font-mono font-semibold">
                        {hit.code}
                      </span>
                      <span className="text-muted-foreground flex-1 truncate">
                        {hit.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Manual entry */}
        {!readOnly ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label
                htmlFor="icd10-manual-code"
                className="text-muted-foreground mb-1 block text-xs uppercase tracking-wide"
              >
                Manual code
              </Label>
              <Input
                id="icd10-manual-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. E11.621"
                autoComplete="off"
              />
            </div>
            <div className="flex-[2]">
              <Label
                htmlFor="icd10-manual-desc"
                className="text-muted-foreground mb-1 block text-xs uppercase tracking-wide"
              >
                Description (optional)
              </Label>
              <Input
                id="icd10-manual-desc"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Diagnosis description"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              onClick={handleManualAdd}
              disabled={!manualCode.trim() || isPending}
              className="sm:self-end"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        ) : null}
      </section>

      {/* =========================================================
          Section 2 — Past Medical History flag grid
          ========================================================= */}
      <section
        aria-labelledby="pmh-flag-grid-heading"
        className="flex flex-col gap-4"
      >
        <h3
          id="pmh-flag-grid-heading"
          className="text-base font-semibold"
        >
          Past Medical History
        </h3>

        {pmhLoading ? (
          <span className="text-muted-foreground text-sm">Loading…</span>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {pmhEntries.map(({ key, label, checked }) => (
              <button
                key={key}
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={readOnly}
                onClick={() => handleTogglePmh(key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                  checked
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background hover:bg-accent border-input",
                  readOnly && "cursor-not-allowed opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {checked ? (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="size-3"
                    >
                      <path
                        d="M3 8.5L6.5 12L13 4.5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default PmhIcd10Tab;
