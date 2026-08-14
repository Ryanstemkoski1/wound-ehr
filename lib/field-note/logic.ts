// =====================================================
// Field Note logic: zod schemas built FROM the registry,
// status mapping, section state, and summary generation.
// Pure module — safe on server, client, and in PDF code.
// =====================================================
// The zod schemas are generated from the registry so the
// server can never accept a shape the UI doesn't render or
// silently strip a key the UI writes (the legacy
// em_documentation bug class).

import { z } from "zod";
import {
  SECTIONS,
  SECTION_MAP,
  WOUND_FIELDS,
  applicableSections,
  type FieldDef,
  type NoteType,
  type SectionDef,
} from "./registry";

// ─── Status mapping: visits.status → what users see ───

/** Visit statuses the field pipeline writes, in lifecycle order. */
export const FIELD_PIPELINE_STATUSES = [
  "scheduled",
  "in-progress",
  "submitted",
  "sent_to_office",
  "needs_correction",
  "approved",
  "cancelled",
  "no-show",
] as const;

export type FieldVisitStatus = (typeof FIELD_PIPELINE_STATUSES)[number];

/** Statuses in which the note (and visit) accept edits. Mirrors the field_notes UPDATE RLS policy in 00061 — keep in lockstep. */
export const EDITABLE_VISIT_STATUSES: FieldVisitStatus[] = ["scheduled", "in-progress", "needs_correction"];

/** Statuses from which the assigned nurse may sign & finalize. */
export const SIGNABLE_VISIT_STATUSES: FieldVisitStatus[] = ["scheduled", "in-progress", "needs_correction"];

/** Statuses from which the field-note PDF may be generated (status floor). */
export const PDF_VISIBLE_STATUSES: FieldVisitStatus[] = ["submitted", "sent_to_office", "approved"];

export interface StatusChipSpec {
  label: string;
  /** semantic tone consumed by the StatusChip component */
  tone: "neutral" | "info" | "active" | "review" | "warn" | "done" | "muted";
}

export function statusChip(visitStatus: string, preppedAt?: string | null): StatusChipSpec {
  switch (visitStatus) {
    case "scheduled":
      return preppedAt ? { label: "Prepped", tone: "info" } : { label: "Scheduled", tone: "neutral" };
    case "in-progress":
      return { label: "In Progress", tone: "active" };
    case "submitted":
    case "sent_to_office":
      return { label: "Pending Review", tone: "review" };
    case "needs_correction":
      return { label: "Needs Correction", tone: "warn" };
    case "approved":
      return { label: "Completed", tone: "done" };
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
    case "no-show":
      return { label: "No-show", tone: "muted" };
    default:
      // Legacy statuses never appear in the field surface (queries inner-join field_notes),
      // but render something sane if one leaks through.
      return { label: visitStatus, tone: "neutral" };
  }
}

// ─── Zod schemas from the registry ───

const detailString = z.string().trim().max(2000);
const freeText = z.string().trim().max(10000);

function fieldSchemas(field: FieldDef): Record<string, z.ZodTypeAny> {
  switch (field.kind) {
    case "chips": {
      const allowed = new Set(field.options.map((o) => o.value));
      const values = z
        .array(z.string().refine((v) => allowed.has(v), { message: `Unknown option for ${field.key}` }))
        .max(field.options.length);
      const out: Record<string, z.ZodTypeAny> = {
        [field.key]: (field.single ? values.max(1) : values).optional(),
      };
      if (field.detail) out[field.detail.key] = detailString.optional();
      return out;
    }
    case "numeric": {
      let n = z.number();
      if (field.min !== undefined) n = n.min(field.min);
      if (field.max !== undefined) n = n.max(field.max);
      return { [field.key]: n.nullable().optional() };
    }
    case "text":
      return { [field.key]: detailString.optional() };
    case "textarea":
      return { [field.key]: freeText.optional() };
  }
}

function buildStandardSchema(section: SectionDef): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of section.fields) Object.assign(shape, fieldSchemas(f));
  // strict(): unknown keys FAIL LOUDLY instead of being silently stripped.
  return z.object(shape).strict();
}

const woundShape: Record<string, z.ZodTypeAny> = {};
for (const f of WOUND_FIELDS.fields) Object.assign(woundShape, fieldSchemas(f));

export const woundSchema = z.object(woundShape).strict();

const woundsSectionSchema = z.object({ wounds: z.array(woundSchema).max(20) }).strict();

export function sectionSchema(sectionKey: string): z.ZodTypeAny | null {
  const section = SECTION_MAP[sectionKey];
  if (!section) return null;
  if (section.kind === "wounds") return woundsSectionSchema;
  return buildStandardSchema(section);
}

export type SectionPayload = Record<string, unknown>;
export type NoteSections = Record<string, SectionPayload>;

export interface SectionMetaEntry {
  last_edited_by?: string;
  last_edited_by_name?: string;
  last_edited_at?: string;
  not_assessed?: boolean;
  /** follow-up attestation for sections 12/13 ("No new labs" / "No change") */
  attestation?: boolean;
}
export type NoteSectionsMeta = Record<string, SectionMetaEntry>;

// ─── Section state (drives the rail, blank-check, progress) ───

export type SectionState = "untouched" | "started" | "not_assessed" | "attested";

function payloadHasContent(payload: SectionPayload | undefined): boolean {
  if (!payload) return false;
  return Object.values(payload).some((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.some((x) => payloadHasContent(typeof x === "object" ? (x as SectionPayload) : { x }));
    if (typeof v === "object") return payloadHasContent(v as SectionPayload);
    return true; // numbers, booleans
  });
}

export function sectionState(
  sectionKey: string,
  sections: NoteSections,
  meta: NoteSectionsMeta
): SectionState {
  const m = meta[sectionKey];
  if (m?.not_assessed) return "not_assessed";
  if (m?.attestation) return "attested";
  return payloadHasContent(sections[sectionKey]) ? "started" : "untouched";
}

export interface NoteProgress {
  total: number;
  done: number;
  untouchedKeys: string[];
}

export function noteProgress(
  noteType: NoteType,
  sections: NoteSections,
  meta: NoteSectionsMeta,
  addedSections: string[] = []
): NoteProgress {
  const applicable = applicableSections(noteType, addedSections);
  const untouchedKeys: string[] = [];
  let done = 0;
  for (const s of applicable) {
    const state = sectionState(s.key, sections, meta);
    if (state === "untouched") untouchedKeys.push(s.key);
    else done += 1;
  }
  return { total: applicable.length, done, untouchedKeys };
}

// ─── Summaries (rail collapse lines, review skim, inbox flags) ───

function optionLabel(field: Extract<FieldDef, { kind: "chips" }>, value: string): string {
  return field.options.find((o) => o.value === value)?.label ?? value;
}

/** One-line human summary of a section's answers, e.g. "Pain: Denies · Drainage: None · Odor: None". */
export function summarizeSection(sectionKey: string, sections: NoteSections, meta: NoteSectionsMeta): string {
  const section = SECTION_MAP[sectionKey];
  if (!section) return "";
  const m = meta[sectionKey];
  if (m?.not_assessed) return "Not assessed this visit";
  if (m?.attestation) return section.attestationLabel ?? "No change since last visit";
  const payload = sections[sectionKey];
  if (!payload) return "";

  if (section.kind === "wounds") {
    const wounds = (payload.wounds as SectionPayload[] | undefined) ?? [];
    if (wounds.length === 0) return "";
    return wounds
      .map((w, i) => {
        const loc = typeof w.location === "string" && w.location ? w.location : `Wound #${i + 1}`;
        const dims = [w.length_cm, w.width_cm, w.depth_cm]
          .map((d) => (typeof d === "number" ? d : "–"))
          .join("×");
        return `${loc} ${dims} cm`;
      })
      .join(" · ");
  }

  const parts: string[] = [];
  for (const f of section.fields) {
    const v = payload[f.key];
    if (v === null || v === undefined) continue;
    if (f.kind === "chips" && Array.isArray(v) && v.length > 0) {
      parts.push(`${f.label}: ${v.map((x) => optionLabel(f, String(x))).join(", ")}`);
    } else if (f.kind === "numeric" && typeof v === "number") {
      parts.push(`${f.label} ${v}${f.unit ?? ""}`);
    } else if ((f.kind === "text" || f.kind === "textarea") && typeof v === "string" && v.trim()) {
      parts.push(`${f.label}: ${v.trim().slice(0, 60)}`);
    }
  }
  return parts.slice(0, 6).join(" · ");
}

// ─── QA auto-flags (computed server-side in getInboxQueues) ───

export function computeReviewFlags(
  noteType: NoteType,
  sections: NoteSections,
  meta: NoteSectionsMeta,
  addedSections: string[] = [],
  timeOut?: string | null
): string[] {
  const flags: string[] = [];
  const progress = noteProgress(noteType, sections, meta, addedSections);
  if (progress.untouchedKeys.length > 0) {
    flags.push(`${progress.untouchedKeys.length} section${progress.untouchedKeys.length === 1 ? "" : "s"} blank`);
  }
  const procedures = sections["procedures"];
  if (procedures && Array.isArray(procedures.graft) && (procedures.graft as string[]).includes("performed")) {
    const missing = !procedures.graft_product || !procedures.graft_lot || !procedures.graft_exp;
    if (missing) flags.push("Graft — verify product/lot/exp");
  }
  if (!timeOut) flags.push("No time out recorded");
  const wounds = (sections["wound_assessment"]?.wounds as SectionPayload[] | undefined) ?? [];
  for (const [i, w] of wounds.entries()) {
    const g = typeof w.bed_granulation_pct === "number" ? w.bed_granulation_pct : 0;
    const s = typeof w.bed_slough_pct === "number" ? w.bed_slough_pct : 0;
    const e = typeof w.bed_eschar_pct === "number" ? w.bed_eschar_pct : 0;
    if (g + s + e > 0 && g + s + e !== 100) {
      flags.push(`Wound #${i + 1} bed % ≠ 100`);
      break;
    }
  }
  return flags;
}

// ─── Hard finalize blockers (advisory items live in the blank-check UI) ───

export interface FinalizeBlockers {
  missingTimeIn: boolean;
  missingTimeOut: boolean;
  missingWound: boolean;
}

export function finalizeBlockers(
  sections: NoteSections,
  timeIn?: string | null,
  timeOut?: string | null
): FinalizeBlockers {
  const wounds = (sections["wound_assessment"]?.wounds as SectionPayload[] | undefined) ?? [];
  const hasWound = wounds.some((w) => payloadHasContent(w));
  return {
    missingTimeIn: !timeIn,
    missingTimeOut: !timeOut, // stamped automatically at finalize if absent; blocker only if both mechanisms failed
    missingWound: !hasWound,
  };
}

export const SECTION_KEYS = SECTIONS.map((s) => s.key);
