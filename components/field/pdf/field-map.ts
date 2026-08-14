// =====================================================
// Field Note paper model — shared by PaperView (HTML) and
// FieldNotePDF (@react-pdf/renderer). Both renderers consume
// THIS module's output, so the on-screen paper preview and
// the downloaded PDF can never diverge.
// =====================================================
// Pure module: no React, no server imports — safe in server
// components, client components, and PDF generation code.

import { format } from "date-fns";
import {
  SECTIONS,
  WOUND_FIELDS,
  applicableSections,
  type FieldDef,
  type SectionDef,
} from "@/lib/field-note/registry";
import type { FieldNoteDTO } from "@/app/actions/field-notes";

export const PAPER_TITLE = "Wound Care Field Visit Note";

// ─── Paper model types ───

export interface PaperCheckOption {
  value: string;
  label: string;
  checked: boolean;
}

export type PaperRow =
  | {
      kind: "check";
      key: string;
      label: string;
      options: PaperCheckOption[];
      /** The paper always prints the detail line ("If yes: ____"); value is "" when blank. */
      detail: { label: string; value: string } | null;
    }
  | { kind: "line"; key: string; label: string; value: string }
  | { kind: "block"; key: string; label: string; value: string };

export interface PaperWoundBlock {
  title: string;
  rows: PaperRow[];
}

export type PaperSection =
  | { kind: "fields"; key: string; paperNumber: number; title: string; rows: PaperRow[] }
  | { kind: "wounds"; key: string; paperNumber: number; title: string; wounds: PaperWoundBlock[] }
  | {
      kind: "stub";
      key: string;
      paperNumber: number;
      title: string;
      stub: "omitted" | "not_assessed" | "attested";
      text: string;
    };

export interface PaperHeaderCell {
  label: string;
  value: string;
}

export interface PaperSignature {
  data: string;
  signerName: string;
  signedAt: string;
}

// ─── Formatting helpers ───

/** Date-only or ISO timestamp → "MM/dd/yyyy". Date-only strings are parsed as local (no UTC day shift). */
export function formatPaperDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "MM/dd/yyyy");
}

/** ISO timestamp → "h:mm a". */
export function formatPaperTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "h:mm a");
}

/** ISO timestamp → "MM/dd/yyyy h:mm a" (signature stamp line). */
export function formatPaperDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "MM/dd/yyyy h:mm a");
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ─── Row building ───

function stringValue(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function rowForField(field: FieldDef, payload: Record<string, unknown>): PaperRow {
  switch (field.kind) {
    case "chips": {
      const raw = payload[field.key];
      const selected = new Set(Array.isArray(raw) ? raw.map((v) => String(v)) : []);
      return {
        kind: "check",
        key: field.key,
        label: field.label,
        options: field.options.map((o) => ({
          value: o.value,
          label: o.label,
          checked: selected.has(o.value),
        })),
        detail: field.detail
          ? { label: field.detail.label, value: stringValue(payload[field.detail.key]) }
          : null,
      };
    }
    case "numeric": {
      const v = payload[field.key];
      const num = typeof v === "number" && Number.isFinite(v) ? String(v) : stringValue(v);
      return {
        kind: "line",
        key: field.key,
        label: field.label,
        value: num ? `${num}${field.unit ? ` ${field.unit}` : ""}` : "",
      };
    }
    case "text":
      return { kind: "line", key: field.key, label: field.label, value: stringValue(payload[field.key]) };
    case "textarea":
      return { kind: "block", key: field.key, label: field.label, value: stringValue(payload[field.key]) };
  }
}

export function rowsForFields(fields: FieldDef[], payload: Record<string, unknown>): PaperRow[] {
  return fields.map((f) => rowForField(f, payload));
}

// ─── Section building ───

type NoteForPaper = Pick<FieldNoteDTO, "noteType" | "sections" | "sectionsMeta" | "addedSections">;

function stubSection(
  s: SectionDef,
  stub: "omitted" | "not_assessed" | "attested",
  text: string
): PaperSection {
  return { kind: "stub", key: s.key, paperNumber: s.paperNumber, title: s.title, stub, text };
}

/**
 * Every registry section in paper order, resolved against this note:
 * - follow-up-omitted (and not added back) → "Not included in follow-up visit." stub
 * - not_assessed                           → "Not assessed this visit." stub
 * - attested (§12/§13 one-tap)             → checked attestation-label stub
 * - otherwise                              → full field rows (all chip options, checked/unchecked)
 * The wounds section becomes one "Wound #N" block per documented wound
 * (one blank template block when none are documented yet).
 */
export function buildPaperSections(note: NoteForPaper): PaperSection[] {
  const applicable = new Set(applicableSections(note.noteType, note.addedSections).map((s) => s.key));

  return SECTIONS.map((s): PaperSection => {
    if (!applicable.has(s.key)) {
      return stubSection(s, "omitted", "Not included in follow-up visit.");
    }
    const meta = note.sectionsMeta[s.key];
    if (meta?.not_assessed) {
      return stubSection(s, "not_assessed", "Not assessed this visit.");
    }
    if (meta?.attestation) {
      return stubSection(s, "attested", s.attestationLabel ?? "No change since last visit");
    }

    const payload = note.sections[s.key] ?? {};

    if (s.kind === "wounds") {
      const raw = payload["wounds"];
      const wounds = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      const list = wounds.length > 0 ? wounds : [{}];
      return {
        kind: "wounds",
        key: s.key,
        paperNumber: s.paperNumber,
        title: s.title,
        wounds: list.map((w, i) => ({
          title: `Wound #${i + 1}`,
          rows: rowsForFields(WOUND_FIELDS.fields, w ?? {}),
        })),
      };
    }

    return {
      kind: "fields",
      key: s.key,
      paperNumber: s.paperNumber,
      title: s.title,
      rows: rowsForFields(s.fields, payload),
    };
  });
}

// ─── Header table (paper section 1) ───

/**
 * The paper form's header block: Patient / DOB / Date / Nurse /
 * Time In-Out / Visit # / Facility / Room. Visit # and Facility come
 * from the PDF data action; pre-sign previews leave them blank.
 */
export function buildPaperHeader(
  note: FieldNoteDTO,
  extras?: { visitNumber?: number | null; facilityName?: string | null }
): PaperHeaderCell[] {
  return [
    { label: "Patient", value: note.patient.name },
    { label: "DOB", value: formatPaperDate(note.patient.dob) },
    { label: "Visit date", value: formatPaperDate(note.visitDate) },
    { label: "Nurse", value: note.nurseName ?? "" },
    { label: "Time in", value: formatPaperTime(note.timeIn) },
    { label: "Time out", value: formatPaperTime(note.timeOut) },
    {
      label: "Visit #",
      value:
        extras?.visitNumber !== null && extras?.visitNumber !== undefined
          ? String(extras.visitNumber)
          : "",
    },
    { label: "Facility", value: extras?.facilityName ?? "" },
    { label: "Room", value: note.room ?? "" },
  ];
}
