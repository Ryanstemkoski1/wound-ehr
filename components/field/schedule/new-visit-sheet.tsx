"use client";

// "+ New visit" sheet: right sheet on desktop, full-screen on mobile.
// Patient searchable combobox (server-searched directory) with an inline
// "+ New patient" mini-form, nurse picker with per-day load hints,
// date/time/duration, note-type segmented control (defaulted from the
// patient's history), optional weekly repeat, and a post-create step
// offering "Open note to pre-fill" or "Done".

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { createFieldVisit } from "@/app/actions/field-schedule";
import { createFieldPatient, getPatientsDirectory } from "@/app/actions/field-patients";
import { NOTE_TYPE_LABELS, type NoteType } from "@/lib/field-note/registry";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DirectoryPatient, FacilityOption, NurseOption } from "./types";

// Another agent owns app/actions/field-patients — call through loose
// signatures and shape the returns defensively (see extractors below).
const searchPatientsAction = getPatientsDirectory as unknown as (
  search?: string
) => Promise<unknown>;
const createPatientAction = createFieldPatient as unknown as (input: {
  firstName: string;
  lastName: string;
  dob: string;
  facilityId: string;
}) => Promise<unknown>;

export interface NewVisitDefaults {
  /** yyyy-MM-dd */
  date?: string;
  /** HH:mm */
  time?: string;
  nurseId?: string;
}

interface NewVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: NewVisitDefaults;
  nurses: NurseOption[];
  nursesLoadError?: string | null;
  facilities: FacilityOption[];
}

// ─── Defensive shaping of the field-patients action returns ───

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function normalizePatient(row: unknown): DirectoryPatient | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = asString(r.id);
  if (!id) return null;
  const first = asString(r.firstName) ?? asString(r.first_name);
  const last = asString(r.lastName) ?? asString(r.last_name);
  const name = asString(r.name) ?? [first, last].filter(Boolean).join(" ");
  return {
    id,
    name: name || "Unknown patient",
    dob: asString(r.dob) ?? asString(r.dateOfBirth) ?? asString(r.date_of_birth),
    mrn: asString(r.mrn),
    facilityName: asString(r.facilityName) ?? asString(r.facility_name),
    lastVisitDate: asString(r.lastVisitDate) ?? asString(r.last_visit_date),
  };
}

/** Treat any array field found on a successful result as the patient list. */
function extractPatientList(res: unknown): { list: DirectoryPatient[] } | { error: string } {
  if (!res || typeof res !== "object") return { error: "Couldn't search patients" };
  const obj = res as Record<string, unknown>;
  if (obj.success === false) {
    return { error: asString(obj.error) ?? "Couldn't search patients" };
  }
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      return {
        list: value
          .map(normalizePatient)
          .filter((p): p is DirectoryPatient => p !== null),
      };
    }
  }
  return { list: [] };
}

function extractCreatedPatientId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const obj = res as Record<string, unknown>;
  if (obj.success === false) return null;
  if (typeof obj.patientId === "string") return obj.patientId;
  if (typeof obj.id === "string") return obj.id;
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const id = (value as Record<string, unknown>).id;
      if (typeof id === "string") return id;
    }
  }
  return null;
}

function extractError(res: unknown): string | null {
  if (res && typeof res === "object") {
    return asString((res as Record<string, unknown>).error);
  }
  return null;
}

const DURATION_OPTIONS = ["30", "45", "60", "90", "120"];
const REPEAT_OPTIONS = Array.from({ length: 11 }, (_, i) => i + 2); // 2..12

export function NewVisitSheet({
  open,
  onOpenChange,
  defaults,
  nurses,
  nursesLoadError,
  facilities,
}: NewVisitSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Patient picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<DirectoryPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);
  const searchSeq = useRef(0);

  // New-patient mini-form
  const [newPatientMode, setNewPatientMode] = useState(false);
  const [npFirst, setNpFirst] = useState("");
  const [npLast, setNpLast] = useState("");
  const [npDob, setNpDob] = useState("");
  const [npFacilityId, setNpFacilityId] = useState("");

  // Visit fields
  const [nurseId, setNurseId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [noteType, setNoteType] = useState<NoteType>("initial_evaluation");
  const [noteTypeTouched, setNoteTypeTouched] = useState(false);
  const [room, setRoom] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);

  // Post-create step
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);

  // Reset to the clicked-slot defaults each time the sheet transitions
  // closed → open. Guarded with a ref so prop-identity churn from
  // router.refresh() (e.g. right after creating a visit) never wipes
  // in-progress state or the post-create step while the sheet is open.
  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!justOpened) return;
    setNurseId(defaults.nurseId ?? "");
    setDate(defaults.date ?? format(new Date(), "yyyy-MM-dd"));
    setTime(defaults.time ?? "09:00");
    setDuration("60");
    setNoteType("initial_evaluation");
    setNoteTypeTouched(false);
    setRoom("");
    setRepeat(false);
    setRepeatWeeks(4);
    setSelectedPatient(null);
    setSearch("");
    setSearchError(null);
    setNewPatientMode(false);
    setNpFirst("");
    setNpLast("");
    setNpDob("");
    setNpFacilityId(facilities[0]?.id ?? "");
    setCreatedNoteId(null);
  }, [open, defaults, facilities]);

  // Debounced server-side patient search.
  useEffect(() => {
    if (!open) return;
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchPatientsAction(search.trim() || undefined);
        if (seq !== searchSeq.current) return;
        const shaped = extractPatientList(res);
        if ("error" in shaped) {
          setSearchError(shaped.error);
          setPatients([]);
        } else {
          setSearchError(null);
          setPatients(shaped.list);
        }
      } catch {
        if (seq === searchSeq.current) {
          setSearchError("Couldn't search patients");
          setPatients([]);
        }
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, open]);

  const selectPatient = (p: DirectoryPatient) => {
    setSelectedPatient(p);
    setPickerOpen(false);
    if (!noteTypeTouched) {
      setNoteType(p.lastVisitDate ? "follow_up" : "initial_evaluation");
    }
  };

  const handleCreatePatient = () => {
    if (!npFirst.trim() || !npLast.trim() || !npDob || !npFacilityId) {
      toast.error("Name, date of birth, and facility are all required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createPatientAction({
          firstName: npFirst.trim(),
          lastName: npLast.trim(),
          dob: npDob,
          facilityId: npFacilityId,
        });
        const id = extractCreatedPatientId(res);
        if (!id) {
          toast.error(extractError(res) ?? "Couldn't create the patient");
          return;
        }
        const facilityName = facilities.find((f) => f.id === npFacilityId)?.name ?? null;
        selectPatient({
          id,
          name: `${npFirst.trim()} ${npLast.trim()}`,
          dob: npDob,
          mrn: null,
          facilityName,
          lastVisitDate: null,
        });
        setNewPatientMode(false);
        toast.success("Patient created");
      } catch {
        toast.error("Couldn't create the patient");
      }
    });
  };

  const canSubmit =
    !pending && selectedPatient !== null && nurseId !== "" && date !== "" && time !== "";

  const handleSubmit = () => {
    if (!selectedPatient) return;
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Enter a valid date and time");
      return;
    }
    startTransition(async () => {
      const res = await createFieldVisit({
        patientId: selectedPatient.id,
        nurseId,
        startAt: start.toISOString(),
        durationMin: Number(duration) || 60,
        noteType,
        room: room.trim() || undefined,
        repeatWeeks: repeat ? repeatWeeks : 1,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      for (const warning of res.warnings) toast.warning(warning);
      toast.success(
        res.noteIds.length > 1 ? `${res.noteIds.length} visits scheduled` : "Visit scheduled"
      );
      router.refresh();
      if (res.noteIds[0]) {
        setCreatedNoteId(res.noteIds[0]);
      } else {
        onOpenChange(false);
      }
    });
  };

  const nurseName = nurses.find((n) => n.id === nurseId)?.name ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>New visit</SheetTitle>
          <SheetDescription>
            Schedule a field visit — the note is created with it, ready to pre-fill.
          </SheetDescription>
        </SheetHeader>

        {createdNoteId ? (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Scheduled
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{selectedPatient?.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[
                  date && time ? format(new Date(`${date}T${time}`), "EEE, MMM d · h:mm a") : null,
                  nurseName,
                  NOTE_TYPE_LABELS[noteType],
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {repeat ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Repeats weekly for {repeatWeeks} weeks. Later visits are follow-ups.
                </p>
              ) : null}
            </div>
            <Button
              className="h-11 w-full"
              onClick={() => {
                onOpenChange(false);
                router.push(`/notes/${createdNoteId}`);
              }}
            >
              Open note to pre-fill
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                onOpenChange(false);
                router.refresh();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              {/* Patient */}
              <div className="flex flex-col gap-1.5">
                <Label>Patient</Label>
                {newPatientMode ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      New patient
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="np-first">First name</Label>
                        <Input
                          id="np-first"
                          value={npFirst}
                          onChange={(e) => setNpFirst(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="np-last">Last name</Label>
                        <Input
                          id="np-last"
                          value={npLast}
                          onChange={(e) => setNpLast(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="np-dob">Date of birth</Label>
                      <Input
                        id="np-dob"
                        type="date"
                        value={npDob}
                        max={format(new Date(), "yyyy-MM-dd")}
                        onChange={(e) => setNpDob(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Facility</Label>
                      {facilities.length === 0 ? (
                        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                          No facilities available — check your facility access.
                        </p>
                      ) : (
                        <Select value={npFacilityId} onValueChange={setNpFacilityId}>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Choose a facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilities.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="h-11 flex-1"
                        disabled={pending || facilities.length === 0}
                        onClick={handleCreatePatient}
                      >
                        {pending ? "Creating…" : "Create patient"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11"
                        onClick={() => setNewPatientMode(false)}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={pickerOpen}
                          className="h-11 w-full justify-between font-normal"
                        >
                          <span className={cn("truncate", !selectedPatient && "text-muted-foreground")}>
                            {selectedPatient ? selectedPatient.name : "Search patients…"}
                          </span>
                          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[min(24rem,calc(100vw-2rem))] p-0"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search by name or MRN"
                            value={search}
                            onValueChange={setSearch}
                          />
                          <CommandList>
                            {searchError ? (
                              <p className="px-3 py-6 text-center text-sm text-destructive">
                                {searchError}
                              </p>
                            ) : (
                              <>
                                <CommandEmpty>
                                  {searching ? "Searching…" : "No patients found"}
                                </CommandEmpty>
                                <CommandGroup>
                                  {patients.map((p) => (
                                    <CommandItem
                                      key={p.id}
                                      value={p.id}
                                      onSelect={() => selectPatient(p)}
                                      className="min-h-11 items-start gap-2 py-2.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{p.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {[
                                            p.dob ? `DOB ${p.dob}` : null,
                                            p.mrn ? `MRN ${p.mrn}` : null,
                                            p.facilityName,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ") || "No details on file"}
                                        </p>
                                      </div>
                                      {selectedPatient?.id === p.id ? (
                                        <Check className="size-4 shrink-0 text-primary" />
                                      ) : null}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </>
                            )}
                            <CommandSeparator />
                            <CommandGroup>
                              <CommandItem
                                value="__new_patient__"
                                onSelect={() => {
                                  setNewPatientMode(true);
                                  setPickerOpen(false);
                                }}
                                className="min-h-11"
                              >
                                <UserPlus className="size-4" />
                                New patient
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedPatient ? (
                      <p className="text-xs text-muted-foreground">
                        {[
                          selectedPatient.dob ? `DOB ${selectedPatient.dob}` : null,
                          selectedPatient.mrn ? `MRN ${selectedPatient.mrn}` : null,
                          selectedPatient.facilityName,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              {/* Nurse */}
              <div className="flex flex-col gap-1.5">
                <Label>Nurse</Label>
                {nurses.length === 0 ? (
                  <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {nursesLoadError ?? "No field nurses found — invite one from Admin first."}
                  </p>
                ) : (
                  <Select value={nurseId} onValueChange={setNurseId}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Choose a nurse" />
                    </SelectTrigger>
                    <SelectContent>
                      {nurses.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} ({n.todayCount} today)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Date, time, duration */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nv-date">Date</Label>
                  <Input
                    id="nv-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nv-time">Time</Label>
                  <Input
                    id="nv-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note type */}
              <div className="flex flex-col gap-1.5">
                <Label>Note type</Label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                  {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={noteType === t}
                      onClick={() => {
                        setNoteType(t);
                        setNoteTypeTouched(true);
                      }}
                      className={cn(
                        "h-11 rounded-md text-sm font-medium transition-colors",
                        noteType === t
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {NOTE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {selectedPatient && !noteTypeTouched ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.lastVisitDate
                      ? "Suggested from the patient's prior visits"
                      : "No prior visits on file"}
                  </p>
                ) : null}
              </div>

              {/* Room */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nv-room">Room (optional)</Label>
                <Input
                  id="nv-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. 204B"
                  maxLength={120}
                  className="h-11"
                />
              </div>

              {/* Repeat weekly */}
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="nv-repeat">Repeat weekly</Label>
                  <Switch id="nv-repeat" checked={repeat} onCheckedChange={setRepeat} />
                </div>
                {repeat ? (
                  <>
                    <Select
                      value={String(repeatWeeks)}
                      onValueChange={(v) => setRepeatWeeks(Number(v))}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPEAT_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} weeks
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      One visit per week. Visits after the first are created as follow-ups.
                    </p>
                  </>
                ) : null}
              </div>
            </div>

            <div className="border-t border-border p-4">
              <Button className="h-11 w-full" disabled={!canSubmit} onClick={handleSubmit}>
                {pending
                  ? "Scheduling…"
                  : repeat
                    ? `Schedule ${repeatWeeks} visits`
                    : "Schedule visit"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
