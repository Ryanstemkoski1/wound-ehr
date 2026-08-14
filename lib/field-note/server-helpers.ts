// Server-side helpers shared by the Field Ops action files
// (app/actions/field-notes.ts, app/actions/field-schedule.ts).
// NOT a "use server" file — plain module, server-only imports.

import { createClient } from "@/lib/supabase/server";
import type { UserRoleData } from "@/lib/rbac";
import type { Credentials } from "@/lib/credentials";
import type { NoteSections, NoteSectionsMeta } from "@/lib/field-note/logic";
import { EDITABLE_VISIT_STATUSES } from "@/lib/field-note/logic";
import type { NoteType } from "@/lib/field-note/registry";

export interface FieldNoteRow {
  id: string;
  visit_id: string;
  patient_id: string;
  note_type: string;
  sections: NoteSections;
  sections_meta: NoteSectionsMeta;
  added_sections: string[];
  prepped_at: string | null;
  prepped_by: string | null;
  time_in: string | null;
  time_out: string | null;
  room: string | null;
  signature_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FieldVisitRow {
  id: string;
  status: string;
  visit_date: string;
  clinician_id: string | null;
  scheduled_by: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  duration_minutes: number | null;
  sent_to_office_at: string | null;
  approved_at: string | null;
  correction_notes: CorrectionEntry[] | null;
  provider_signature_id: string | null;
}

export interface CorrectionEntry {
  section_key?: string | null;
  note: string;
  requested_by: string;
  requested_by_name?: string;
  requested_at: string;
  resolved?: boolean;
}

export interface FieldPatientRow {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  mrn: string | null;
  facility_id: string;
}

export interface LoadedNote {
  note: FieldNoteRow;
  visit: FieldVisitRow;
  patient: FieldPatientRow;
}

/** Load a note with its visit + patient. Returns null if RLS hides it or it doesn't exist. */
export async function loadNote(noteId: string): Promise<LoadedNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("field_notes")
    .select(
      `*,
       visits!field_notes_visit_id_fkey (
         id, status, visit_date, clinician_id, scheduled_by,
         scheduled_start_at, scheduled_end_at, duration_minutes,
         sent_to_office_at, approved_at, correction_notes, provider_signature_id
       ),
       patients!field_notes_patient_id_fkey (
         id, first_name, last_name, date_of_birth:dob, mrn, facility_id
       )`
    )
    .eq("id", noteId)
    .maybeSingle();

  if (error || !data) return null;
  const { visits, patients, ...note } = data as unknown as FieldNoteRow & {
    visits: FieldVisitRow;
    patients: FieldPatientRow;
  };
  if (!visits || !patients) return null;
  return { note, visit: visits, patient: patients };
}

export function isOfficeAdmin(role: UserRoleData | null): boolean {
  return role?.role === "tenant_admin" || role?.role === "facility_admin";
}

export function isClinicalCredential(credentials: Credentials | null): boolean {
  return credentials !== null && credentials !== "Admin";
}

/** Draft-edit guard: office admins or the assigned nurse. */
export function canEditNote(
  role: UserRoleData | null,
  visitClinicianId: string | null,
  userId: string
): boolean {
  return isOfficeAdmin(role) || (visitClinicianId !== null && visitClinicianId === userId);
}

export function isEditableStatus(status: string): boolean {
  return (EDITABLE_VISIT_STATUSES as string[]).includes(status);
}

export function noteTypeOf(note: FieldNoteRow): NoteType {
  return note.note_type === "follow_up" ? "follow_up" : "initial_evaluation";
}

/** Best-effort client IP for signature rows (server-derived, never caller-supplied). */
export function clientIpFrom(headerList: Headers): string | null {
  const fwd = headerList.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? headerList.get("cf-connecting-ip");
}

/** Display-name lookup for a set of auth user ids (public.users mirror). */
export async function userNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("id, name").in("id", unique);
  return Object.fromEntries((data ?? []).map((u) => [u.id, u.name ?? "Unknown"]));
}

/**
 * TRUE when a visit belongs to the Field Ops surface (has a field_notes row).
 * Legacy visit mutators call this and refuse to touch field visits — they are
 * deployed POST endpoints regardless of UI routing, and e.g. legacy
 * updateVisitStatus could otherwise reopen an approved field note.
 */
export async function isFieldVisit(visitId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("field_notes")
    .select("id")
    .eq("visit_id", visitId)
    .maybeSingle();
  return !!data;
}

export const FIELD_ROUTES = {
  note: (id: string) => `/notes/${id}`,
  visits: "/visits",
  schedule: "/schedule",
  inbox: "/inbox",
};
