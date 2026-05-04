"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, User } from "lucide-react";
import { toast } from "sonner";
import {
  searchPatientsForEncounter,
  type EncounterPatientHit,
} from "@/app/actions/patients";
import { createVisitFromCalendar } from "@/app/actions/calendar";

/**
 * R-063 — New Encounter typeahead modal (clinical_ux_v2).
 *
 * One-screen flow: type ≥2 chars to search patients, click a match to
 * lock in patient + facility, pick the date of service, confirm. The
 * server action creates an "incomplete" visit and we navigate straight
 * into the visit screen so the clinician can start charting.
 */
export function NewEncounterModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EncounterPatientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<EncounterPatientHit | null>(null);
  const [dos, setDos] = useState<string>(toLocalDateInput(new Date()));
  const [submitting, startSubmit] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced patient search (≥2 chars)
  useEffect(() => {
    if (selected) return; // freeze search once a patient is locked in
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const hits = await searchPatientsForEncounter(trimmed);
        setResults(hits);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  // Reset everything when the dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setDos(toLocalDateInput(new Date()));
      setSearching(false);
    }
  }, [open]);

  const canConfirm = !!selected && !!dos && !submitting;

  function handleConfirm() {
    if (!selected || !dos) return;
    // Schedule for 09:00 local on the selected date — the visit screen
    // lets the clinician adjust if needed; this avoids forcing a time
    // picker at intake.
    const [yyyy, mm, dd] = dos.split("-").map(Number);
    const visitDate = new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, 9, 0, 0);

    startSubmit(async () => {
      const res = await createVisitFromCalendar({
        patientId: selected.id,
        visitDate,
        visitType: "routine",
        durationMinutes: 30,
      });
      if (!res.success || !res.visit) {
        toast.error(
          (!res.success && res.error) || "Failed to create encounter"
        );
        return;
      }
      toast.success(`Encounter created for ${res.visit.patientName}`);
      setOpen(false);
      router.push(`/dashboard/patients/${selected.id}/visits/${res.visit.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New encounter</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New encounter</DialogTitle>
          <DialogDescription>
            Find the patient, confirm the date of service, and start charting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient search / selected patient pill */}
          {selected ? (
            <div className="border-border/60 bg-muted/30 flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary rounded-full p-2">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selected.lastName}, {selected.firstName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    MRN {selected.mrn}
                    {selected.dob
                      ? ` · DOB ${new Date(selected.dob).toLocaleDateString()}`
                      : ""}
                  </p>
                  {selected.facilityName && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Facility: {selected.facilityName}
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="encounter-patient-search">Patient</Label>
              <div className="relative">
                <Search className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="encounter-patient-search"
                  autoFocus
                  className="pl-8"
                  placeholder="Search by name or MRN…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {query.trim().length >= 2 && (
                <div className="border-border/60 max-h-60 overflow-y-auto rounded-md border">
                  {searching ? (
                    <div className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                    </div>
                  ) : results.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-center text-sm">
                      No patients match that search.
                    </p>
                  ) : (
                    <ul className="divide-border/60 divide-y">
                      {results.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(p)}
                            className="hover:bg-muted/30 focus:bg-muted/30 dark:hover:bg-card dark:focus:bg-card flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm focus:outline-none"
                          >
                            <span>
                              <span className="font-medium">
                                {p.lastName}, {p.firstName}
                              </span>
                              <span className="text-muted-foreground block text-xs">
                                MRN {p.mrn}
                                {p.dob
                                  ? ` · DOB ${new Date(p.dob).toLocaleDateString()}`
                                  : ""}
                              </span>
                            </span>
                            {p.facilityName && (
                              <span className="text-muted-foreground text-xs">
                                {p.facilityName}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Date of service */}
          <div className="space-y-2">
            <Label htmlFor="encounter-dos">Date of service</Label>
            <Input
              id="encounter-dos"
              type="date"
              value={dos}
              onChange={(e) => setDos(e.target.value)}
              max={toLocalDateInput(addDays(new Date(), 30))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Start encounter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
