// =====================================================
// Field Ops — patients surface: defensive payload shaping
// =====================================================
// The actions module (app/actions/field-patients.ts) is built
// concurrently by another agent. These normalizers destructure
// exactly what this surface needs with fallbacks, so either
// camelCase or snake_case payload keys (and either flat or
// nested shapes) render correctly. Pure module — safe on the
// server and the client.

import { format } from "date-fns";
import { statusChip } from "@/lib/field-note/logic";
import type { NoteType } from "@/lib/field-note/registry";

// ─── tiny unknown-safe accessors ───

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function firstArray(...candidates: unknown[]): unknown[] {
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

// ─── action result helpers ───

/** TRUE only when the action returned { success: true, ... }. */
export function actionOk(res: unknown): res is Record<string, unknown> {
  const r = rec(res);
  return !!r && r.success === true;
}

/** Human-readable error from a failed action result. */
export function actionError(res: unknown, fallback: string): string {
  const r = rec(res);
  return (r && str(r.error)) || fallback;
}

// ─── dates ───

/** "Aug 14, 2026" — handles both date-only ("1948-03-02") and ISO datetime strings. */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "MMM d, yyyy");
}

// ─── facilities (for the dialogs' facility pickers) ───

export interface FacilityOption {
  id: string;
  name: string;
}

/** Shape rows from lib/rbac getAccessibleFacilities() (or any {id,name}-ish list). */
export function toFacilityOptions(rows: unknown): FacilityOption[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const r = rec(row);
      if (!r) return null;
      const id = str(r.id);
      if (!id) return null;
      return { id, name: str(r.name) ?? "Facility" };
    })
    .filter((f): f is FacilityOption => f !== null);
}

// ─── directory ───

export interface DirectoryPatient {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  /** date-only or ISO string as provided */
  dob: string | null;
  mrn: string | null;
  facilityId: string | null;
  facilityName: string | null;
  lastVisitAt: string | null;
}

export function normalizePatient(raw: unknown): DirectoryPatient | null {
  const r = rec(raw);
  if (!r) return null;
  const id = str(r.id) ?? str(r.patientId) ?? str(r.patient_id);
  if (!id) return null;

  const firstName = str(r.firstName) ?? str(r.first_name) ?? "";
  const lastName = str(r.lastName) ?? str(r.last_name) ?? "";
  const joined = [firstName, lastName].filter(Boolean).join(" ");
  const name = str(r.name) ?? (joined || "Unknown patient");

  const facility = rec(r.facility) ?? rec(r.facilities);
  const facilityName =
    str(r.facilityName) ?? str(r.facility_name) ?? (facility ? str(facility.name) : null);
  const facilityId =
    str(r.facilityId) ?? str(r.facility_id) ?? (facility ? str(facility.id) : null);

  let lastVisitAt =
    str(r.lastVisitAt) ??
    str(r.last_visit_at) ??
    str(r.lastVisitDate) ??
    str(r.last_visit_date) ??
    str(r.lastVisit) ??
    str(r.last_visit);
  if (!lastVisitAt) {
    const lv = rec(r.lastVisit) ?? rec(r.last_visit);
    if (lv) {
      lastVisitAt =
        str(lv.visitDate) ??
        str(lv.visit_date) ??
        str(lv.scheduledStartAt) ??
        str(lv.scheduled_start_at) ??
        str(lv.date);
    }
  }

  return {
    id,
    name,
    firstName,
    lastName,
    dob: str(r.dob) ?? str(r.dateOfBirth) ?? str(r.date_of_birth),
    mrn: str(r.mrn),
    facilityId,
    facilityName,
    lastVisitAt,
  };
}

/** Pull the patient list out of a successful getPatientsDirectory result. */
export function normalizeDirectoryPatients(res: Record<string, unknown>): DirectoryPatient[] {
  const data = rec(res.data);
  const arr = firstArray(res.patients, data?.patients, res.data, res.rows, res.results);
  return arr.map(normalizePatient).filter((p): p is DirectoryPatient => p !== null);
}

// ─── chart ───

export interface ChartNote {
  noteId: string;
  visitDate: string | null;
  scheduledStartAt: string | null;
  noteType: NoteType;
  status: string;
  preppedAt: string | null;
  chip: { label: string; tone: string };
  nurseName: string | null;
}

export interface WoundSummary {
  location: string | null;
  lengthCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  etiology: string[];
}

export interface PatientChart {
  patient: DirectoryPatient;
  notes: ChartNote[];
  /** From the most recent approved note's wound_assessment; empty when the payload has no sections. */
  wounds: WoundSummary[];
  /** Visit date of the note the wounds came from, when known. */
  woundsAsOf: string | null;
}

type ChartNoteInternal = ChartNote & { sections: unknown };

function normalizeChartNote(raw: unknown): ChartNoteInternal | null {
  const r = rec(raw);
  if (!r) return null;
  const visit = rec(r.visits) ?? rec(r.visit);
  const noteId = str(r.noteId) ?? str(r.note_id) ?? str(r.id);
  if (!noteId) return null;

  const status =
    str(r.status) ?? str(r.visitStatus) ?? str(r.visit_status) ?? (visit ? str(visit.status) : null) ?? "scheduled";
  const visitDate = str(r.visitDate) ?? str(r.visit_date) ?? (visit ? str(visit.visit_date) : null);
  const scheduledStartAt =
    str(r.scheduledStartAt) ?? str(r.scheduled_start_at) ?? (visit ? str(visit.scheduled_start_at) : null);
  const noteTypeRaw = str(r.noteType) ?? str(r.note_type);
  const noteType: NoteType = noteTypeRaw === "follow_up" ? "follow_up" : "initial_evaluation";
  const preppedAt = str(r.preppedAt) ?? str(r.prepped_at);

  const chipRec = rec(r.chip);
  const chip =
    chipRec && typeof chipRec.label === "string" && typeof chipRec.tone === "string"
      ? { label: chipRec.label, tone: chipRec.tone }
      : statusChip(status, preppedAt);

  return {
    noteId,
    visitDate,
    scheduledStartAt,
    noteType,
    status,
    preppedAt,
    chip,
    nurseName: str(r.nurseName) ?? str(r.nurse_name) ?? str(r.clinicianName) ?? str(r.clinician_name),
    sections: r.sections,
  };
}

function normalizeWound(raw: unknown): WoundSummary {
  const r = rec(raw) ?? {};
  return {
    location: str(r.location),
    lengthCm: num(r.length_cm) ?? num(r.lengthCm),
    widthCm: num(r.width_cm) ?? num(r.widthCm),
    depthCm: num(r.depth_cm) ?? num(r.depthCm),
    etiology: Array.isArray(r.etiology) ? r.etiology.filter((x): x is string => typeof x === "string") : [],
  };
}

function woundHasContent(w: WoundSummary): boolean {
  return (
    w.location !== null ||
    w.lengthCm !== null ||
    w.widthCm !== null ||
    w.depthCm !== null ||
    w.etiology.length > 0
  );
}

/** wound_assessment.wounds out of a sections object (or the sections object itself). */
function woundsFromSections(sections: unknown): WoundSummary[] | null {
  const s = rec(sections);
  if (!s) return null;
  const wa = rec(s.wound_assessment) ?? rec(s.woundAssessment);
  if (!wa) return null;
  if (!Array.isArray(wa.wounds)) return null;
  const wounds = wa.wounds.map(normalizeWound).filter(woundHasContent);
  return wounds.length > 0 ? wounds : null;
}

function noteSortKey(n: { scheduledStartAt: string | null; visitDate: string | null }): string {
  return n.scheduledStartAt ?? n.visitDate ?? "";
}

/** Shape a successful getPatientChart result. Returns null when no recognizable patient is present. */
export function normalizeChart(res: Record<string, unknown>): PatientChart | null {
  const data = rec(res.data);

  const patientRaw =
    rec(res.patient) ??
    (data ? rec(data.patient) : null) ??
    (data && ("first_name" in data || "firstName" in data || "name" in data) ? data : null);
  const patient = patientRaw ? normalizePatient(patientRaw) : null;
  if (!patient) return null;

  const rawNotes = firstArray(
    res.notes,
    res.noteHistory,
    res.note_history,
    data?.notes,
    data?.noteHistory,
    res.visits,
    data?.visits
  );
  const notesFull = rawNotes
    .map(normalizeChartNote)
    .filter((n): n is ChartNoteInternal => n !== null)
    .sort((a, b) => noteSortKey(b).localeCompare(noteSortKey(a)));

  // Wounds: dedicated latest-approved payloads first, then approved note
  // rows that carry sections, then a pre-shaped top-level wounds array.
  // If none exist, the card is simply omitted.
  let wounds: WoundSummary[] = [];
  let woundsAsOf: string | null = null;

  for (const cand of [
    res.latestApprovedNote,
    res.latestApproved,
    res.lastApprovedNote,
    data?.latestApprovedNote,
    data?.latestApproved,
  ]) {
    const n = rec(cand);
    if (!n) continue;
    const found = woundsFromSections(n.sections ?? n);
    if (found) {
      wounds = found;
      woundsAsOf = str(n.visitDate) ?? str(n.visit_date);
      break;
    }
  }

  if (wounds.length === 0) {
    const found = woundsFromSections(res.latestApprovedSections ?? data?.latestApprovedSections);
    if (found) wounds = found;
  }

  if (wounds.length === 0) {
    for (const n of notesFull) {
      if (n.status !== "approved") continue;
      const found = woundsFromSections(n.sections);
      if (found) {
        wounds = found;
        woundsAsOf = n.visitDate ?? n.scheduledStartAt;
        break;
      }
    }
  }

  if (wounds.length === 0) {
    const arr = res.wounds ?? data?.wounds;
    if (Array.isArray(arr)) wounds = arr.map(normalizeWound).filter(woundHasContent);
  }

  const notes: ChartNote[] = notesFull.map(({ sections: _sections, ...note }) => note);
  return { patient, notes, wounds, woundsAsOf };
}
