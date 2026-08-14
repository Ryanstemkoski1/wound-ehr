"use server";

// =====================================================
// Field Ops — note document actions
// =====================================================
// Everything that touches a field note's content or lifecycle:
// section saves (atomic merge RPC), prep/start metadata, sign &
// finalize, QA review (approve / corrections / reopen), reads.
//
// Every write: auth → role/credential guard → status guard →
// write → event append → auditPhiAccess → revalidatePath.
// Legacy updateVisit / signVisit / autosaveVisitDraft are never
// called from the Field Ops surface.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getUserCredentials } from "@/lib/rbac";
import { auditPhiAccess } from "@/lib/audit-log";
import {
  sectionSchema,
  statusChip,
  summarizeSection,
  noteProgress,
  computeReviewFlags,
  finalizeBlockers,
  SIGNABLE_VISIT_STATUSES,
  PDF_VISIBLE_STATUSES,
} from "@/lib/field-note/logic";
import { SECTION_MAP, applicableSections, omittedSections, type NoteType } from "@/lib/field-note/registry";
import {
  loadNote,
  isOfficeAdmin,
  isClinicalCredential,
  canEditNote,
  isEditableStatus,
  noteTypeOf,
  clientIpFrom,
  userNames,
  FIELD_ROUTES,
  type CorrectionEntry,
} from "@/lib/field-note/server-helpers";

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

const uuid = z.string().uuid();

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateNote(noteId: string) {
  revalidatePath(FIELD_ROUTES.note(noteId));
  revalidatePath(FIELD_ROUTES.visits);
  revalidatePath(FIELD_ROUTES.inbox);
  revalidatePath(FIELD_ROUTES.schedule);
}

async function appendEvent(
  noteId: string,
  eventType: string,
  sectionKey: string | null,
  payload: unknown,
  userId: string
) {
  const supabase = await createClient();
  await supabase.from("field_note_events").insert({
    note_id: noteId,
    event_type: eventType,
    section_key: sectionKey,
    payload: (payload ?? null) as never,
    edited_by: userId,
  });
}

// ─────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────

export async function getFieldNote(noteId: string): Promise<Result<{ data: FieldNoteDTO }>> {
  const parsed = uuid.safeParse(noteId);
  if (!parsed.success) return { success: false, error: "Invalid note id" };
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const loaded = await loadNote(noteId);
  if (!loaded) return { success: false, error: "Note not found or access denied" };
  const { note, visit, patient } = loaded;

  const [role, credentials] = await Promise.all([getUserRole(), getUserCredentials()]);
  const names = await userNames([
    visit.clinician_id ?? "",
    note.prepped_by ?? "",
    note.created_by,
    ...Object.values(note.sections_meta).map((m) => m.last_edited_by ?? ""),
  ]);

  void auditPhiAccess({ action: "read", table: "field_notes", recordId: noteId, recordType: "field_note" });

  const editable = isEditableStatus(visit.status) && canEditNote(role, visit.clinician_id, user.id);
  const noteType = noteTypeOf(note);

  return {
    success: true,
    data: {
      id: note.id,
      visitId: visit.id,
      noteType,
      sections: note.sections,
      sectionsMeta: note.sections_meta,
      addedSections: note.added_sections,
      status: visit.status,
      chip: statusChip(visit.status, note.prepped_at),
      preppedAt: note.prepped_at,
      preppedByName: note.prepped_by ? (names[note.prepped_by] ?? null) : null,
      timeIn: note.time_in,
      timeOut: note.time_out,
      room: note.room,
      visitDate: visit.visit_date,
      scheduledStartAt: visit.scheduled_start_at,
      nurseId: visit.clinician_id,
      nurseName: visit.clinician_id ? (names[visit.clinician_id] ?? null) : null,
      patient: {
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        dob: patient.date_of_birth,
        mrn: patient.mrn,
        facilityId: patient.facility_id,
      },
      corrections: (visit.correction_notes ?? []).map((c) => ({
        sectionKey: c.section_key ?? null,
        note: c.note,
        requestedByName: c.requested_by_name ?? names[c.requested_by] ?? "QA",
        requestedAt: c.requested_at,
        resolved: c.resolved === true,
      })),
      viewer: {
        isAssignedNurse: visit.clinician_id === user.id,
        isOfficeAdmin: isOfficeAdmin(role),
        isClinical: isClinicalCredential(credentials),
        canEdit: editable,
        canSign:
          visit.clinician_id === user.id &&
          isClinicalCredential(credentials) &&
          (SIGNABLE_VISIT_STATUSES as string[]).includes(visit.status),
        canReview: isOfficeAdmin(role) && visit.status === "sent_to_office",
      },
    },
  };
}

export interface FieldNoteDTO {
  id: string;
  visitId: string;
  noteType: NoteType;
  sections: Record<string, Record<string, unknown>>;
  sectionsMeta: Record<
    string,
    {
      last_edited_by?: string;
      last_edited_by_name?: string;
      last_edited_at?: string;
      not_assessed?: boolean;
      attestation?: boolean;
    }
  >;
  addedSections: string[];
  status: string;
  chip: { label: string; tone: string };
  preppedAt: string | null;
  preppedByName: string | null;
  timeIn: string | null;
  timeOut: string | null;
  room: string | null;
  visitDate: string;
  scheduledStartAt: string | null;
  nurseId: string | null;
  nurseName: string | null;
  patient: { id: string; name: string; dob: string | null; mrn: string | null; facilityId: string };
  corrections: {
    sectionKey: string | null;
    note: string;
    requestedByName: string;
    requestedAt: string;
    resolved: boolean;
  }[];
  viewer: {
    isAssignedNurse: boolean;
    isOfficeAdmin: boolean;
    isClinical: boolean;
    canEdit: boolean;
    canSign: boolean;
    canReview: boolean;
  };
}

/** Events since a timestamp — powers QA's changed-since-last-read highlighting. */
export async function getNoteEventsSince(
  noteId: string,
  sinceIso?: string
): Promise<Result<{ sectionKeys: string[] }>> {
  const parsed = uuid.safeParse(noteId);
  if (!parsed.success) return { success: false, error: "Invalid note id" };
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  let query = supabase
    .from("field_note_events")
    .select("section_key, edited_at")
    .eq("note_id", noteId)
    .eq("event_type", "section_save");
  if (sinceIso) query = query.gt("edited_at", sinceIso);
  const { data, error } = await query;
  if (error) return { success: false, error: "Failed to load events" };
  return {
    success: true,
    sectionKeys: [...new Set((data ?? []).map((e) => e.section_key).filter((k): k is string => !!k))],
  };
}

/** The patient's most recent completed note before this one — read-only "Last visit" reference. */
export async function getPreviousCompletedNote(
  patientId: string,
  currentNoteId: string
): Promise<Result<{ data: { visitDate: string; sections: Record<string, Record<string, unknown>>; noteType: NoteType } | null }>> {
  if (!uuid.safeParse(patientId).success) return { success: false, error: "Invalid patient id" };
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // !inner join so the approved filter restricts the parent rows
  // (a plain embed would only null the join and break the filter).
  const { data } = await supabase
    .from("field_notes")
    .select("id, note_type, sections, visits!field_notes_visit_id_fkey!inner (visit_date, status, scheduled_start_at)")
    .eq("patient_id", patientId)
    .neq("id", currentNoteId)
    .eq("visits.status", "approved");

  const prior = (data ?? [])
    .map((row) => row as unknown as { id: string; note_type: string; sections: Record<string, Record<string, unknown>>; visits: { visit_date: string; status: string; scheduled_start_at: string | null } })
    .filter((row) => row.visits)
    .sort((a, b) => (b.visits.scheduled_start_at ?? b.visits.visit_date).localeCompare(a.visits.scheduled_start_at ?? a.visits.visit_date))[0];

  if (!prior) return { success: true, data: null };
  void auditPhiAccess({ action: "read", table: "field_notes", recordId: prior.id, recordType: "field_note_prior_reference" });
  return {
    success: true,
    data: {
      visitDate: prior.visits.visit_date,
      sections: prior.sections,
      noteType: prior.note_type === "follow_up" ? "follow_up" : "initial_evaluation",
    },
  };
}

// ─────────────────────────────────────────────────────
// Section writes
// ─────────────────────────────────────────────────────

type NoteGuardOk = { user: { id: string }; role: Awaited<ReturnType<typeof getUserRole>> } & NonNullable<
  Awaited<ReturnType<typeof loadNote>>
>;

async function guardedNote(
  noteId: string,
  opts?: { requireEditable?: boolean }
): Promise<{ error: string } | NoteGuardOk> {
  const parsed = uuid.safeParse(noteId);
  if (!parsed.success) return { error: "Invalid note id" };
  const { user } = await requireUser();
  if (!user) return { error: "Unauthorized" };
  const loaded = await loadNote(noteId);
  if (!loaded) return { error: "Note not found or access denied" };
  const role = await getUserRole();
  if (!canEditNote(role, loaded.visit.clinician_id, user.id)) {
    return { error: "You do not have permission to edit this note" };
  }
  if (opts?.requireEditable !== false && !isEditableStatus(loaded.visit.status)) {
    return { error: "This note is finalized and can no longer be edited" };
  }
  return { user, role, ...loaded };
}

export async function updateFieldNoteSection(
  noteId: string,
  sectionKey: string,
  payload: unknown
): Promise<Result<{ summary: string }>> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };

  const schema = sectionSchema(sectionKey);
  if (!schema) return { success: false, error: `Unknown section: ${sectionKey}` };
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid section data" };
  }

  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("name").eq("id", g.user.id).maybeSingle();
  const meta = {
    last_edited_by: g.user.id,
    last_edited_by_name: userRow?.name ?? undefined,
    last_edited_at: new Date().toISOString(),
    not_assessed: false,
  };

  const { error } = await supabase.rpc("merge_field_note_section", {
    p_note_id: noteId,
    p_section_key: sectionKey,
    p_payload: parsed.data as never,
    p_meta: meta as never,
  });
  if (error) {
    return { success: false, error: "Save failed — the note may have been finalized. Refresh to check." };
  }

  void auditPhiAccess({ action: "update", table: "field_notes", recordId: noteId, recordType: `field_note_section:${sectionKey}` });
  revalidateNote(noteId);

  const sections = { ...g.note.sections, [sectionKey]: parsed.data as Record<string, unknown> };
  return { success: true, summary: summarizeSection(sectionKey, sections, g.note.sections_meta) };
}

export async function setSectionNotAssessed(
  noteId: string,
  sectionKey: string,
  notAssessed: boolean
): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };
  if (!SECTION_MAP[sectionKey]) return { success: false, error: "Unknown section" };

  const supabase = await createClient();
  // p_payload null = meta-only merge; the section's content is untouched,
  // so this can never race-overwrite an in-flight autosave.
  const { error } = await supabase.rpc("merge_field_note_section", {
    p_note_id: noteId,
    p_section_key: sectionKey,
    p_payload: null as never,
    p_meta: { not_assessed: notAssessed, last_edited_by: g.user.id, last_edited_at: new Date().toISOString() } as never,
  });
  if (error) return { success: false, error: "Update failed" };
  void appendEvent(noteId, "not_assessed", sectionKey, { notAssessed }, g.user.id);
  revalidateNote(noteId);
  return { success: true };
}

/** Follow-up one-tap attestation for §12/§13 ("No new labs" / "No change since last visit"). */
export async function setSectionAttestation(
  noteId: string,
  sectionKey: string,
  attested: boolean
): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };
  const section = SECTION_MAP[sectionKey];
  if (!section || section.followUp !== "attestation") {
    return { success: false, error: "This section does not support attestation" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_field_note_section", {
    p_note_id: noteId,
    p_section_key: sectionKey,
    p_payload: null as never, // meta-only: never clobbers section content
    p_meta: { attestation: attested, last_edited_by: g.user.id, last_edited_at: new Date().toISOString() } as never,
  });
  if (error) return { success: false, error: "Update failed" };
  revalidateNote(noteId);
  return { success: true };
}

/** Re-insert an omitted section into a follow-up note. */
export async function addNoteSection(noteId: string, sectionKey: string): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };
  const available = omittedSections(noteTypeOf(g.note), g.note.added_sections).some((s) => s.key === sectionKey);
  if (!available) return { success: false, error: "Section cannot be added to this note" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("field_notes")
    .update({ added_sections: [...g.note.added_sections, sectionKey] })
    .eq("id", noteId);
  if (error) return { success: false, error: "Update failed" };
  revalidateNote(noteId);
  return { success: true };
}

export async function updateNoteHeader(
  noteId: string,
  patch: { room?: string | null; timeIn?: string | null; timeOut?: string | null }
): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };
  const schema = z.object({
    room: z.string().trim().max(120).nullable().optional(),
    timeIn: z.string().datetime({ offset: true }).nullable().optional(),
    timeOut: z.string().datetime({ offset: true }).nullable().optional(),
  });
  const parsed = schema.safeParse(patch);
  if (!parsed.success) return { success: false, error: "Invalid header data" };

  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (parsed.data.room !== undefined) update.room = parsed.data.room;
  if (parsed.data.timeIn !== undefined) update.time_in = parsed.data.timeIn;
  if (parsed.data.timeOut !== undefined) update.time_out = parsed.data.timeOut;
  const { error } = await supabase.from("field_notes").update(update).eq("id", noteId);
  if (error) return { success: false, error: "Update failed" };
  revalidateNote(noteId);
  return { success: true };
}

/** Office: mark the pre-visit phone prep finished ("Ready for visit"). */
export async function markPrepped(noteId: string): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };
  if (!isOfficeAdmin(g.role)) return { success: false, error: "Only office staff mark prep complete" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("field_notes")
    .update({ prepped_at: new Date().toISOString(), prepped_by: g.user.id })
    .eq("id", noteId);
  if (error) return { success: false, error: "Update failed" };
  void appendEvent(noteId, "prepped", null, null, g.user.id);
  revalidateNote(noteId);
  return { success: true };
}

/** Nurse taps "Start visit": stamps Time In and moves the visit to In Progress. */
export async function startVisit(noteId: string): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };

  const supabase = await createClient();
  if (!g.note.time_in) {
    await supabase.from("field_notes").update({ time_in: new Date().toISOString() }).eq("id", noteId);
  }
  if (g.visit.status === "scheduled") {
    await supabase.from("visits").update({ status: "in-progress" }).eq("id", g.visit.id);
  }
  void appendEvent(noteId, "start_visit", null, null, g.user.id);
  revalidateNote(noteId);
  return { success: true };
}

// ─────────────────────────────────────────────────────
// Sign & finalize
// ─────────────────────────────────────────────────────

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export async function signFieldNote(input: {
  noteId: string;
  signatureData: string;
  signatureMethod: "draw" | "type";
  timeIn?: string | null;
  timeOut?: string | null;
}): Promise<Result> {
  const schema = z.object({
    noteId: uuid,
    signatureData: z.string().startsWith("data:image/"),
    signatureMethod: z.enum(["draw", "type"]),
    timeIn: z.string().datetime({ offset: true }).nullable().optional(),
    timeOut: z.string().datetime({ offset: true }).nullable().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid signature payload" };
  if (parsed.data.signatureData.length > MAX_SIGNATURE_BYTES) {
    return { success: false, error: "Signature image too large" };
  }

  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const loaded = await loadNote(parsed.data.noteId);
  if (!loaded) return { success: false, error: "Note not found or access denied" };
  const { note, visit, patient } = loaded;

  // Only the assigned nurse, holding a clinical credential, may finalize.
  if (visit.clinician_id !== user.id) {
    return { success: false, error: "Only the assigned nurse can sign this note" };
  }
  const credentials = await getUserCredentials();
  if (!isClinicalCredential(credentials)) {
    return { success: false, error: "A clinical credential is required to sign" };
  }
  if (!(SIGNABLE_VISIT_STATUSES as string[]).includes(visit.status)) {
    return { success: false, error: "This note cannot be signed in its current status" };
  }

  // Hard blockers (server-enforced; the sign screen surfaces them first).
  const timeIn = parsed.data.timeIn ?? note.time_in;
  const timeOut = parsed.data.timeOut ?? note.time_out ?? new Date().toISOString();
  const blockers = finalizeBlockers(note.sections, timeIn, timeOut);
  if (blockers.missingTimeIn) return { success: false, error: "Time In is required before signing" };
  if (blockers.missingWound) return { success: false, error: "Document at least one wound before signing" };

  const supabase = await createClient();
  const headerList = await headers();
  const { data: userRow } = await supabase.from("users").select("name, credentials").eq("id", user.id).maybeSingle();

  // 1. Immutable signature row.
  const { data: signature, error: sigError } = await supabase
    .from("signatures")
    .insert({
      signature_type: "provider",
      visit_id: visit.id,
      patient_id: patient.id,
      signer_name: userRow?.name ?? "Unknown",
      signer_role: credentials,
      signature_data: parsed.data.signatureData,
      signature_method: parsed.data.signatureMethod,
      ip_address: clientIpFrom(headerList),
      created_by: user.id,
    })
    .select("id, signed_at")
    .single();
  if (sigError || !signature) return { success: false, error: "Failed to record signature" };

  // 2. Note row (must happen BEFORE the status change locks field_notes at RLS level).
  const { error: noteError } = await supabase
    .from("field_notes")
    .update({ signature_id: signature.id, time_in: timeIn, time_out: timeOut })
    .eq("id", note.id);
  if (noteError) return { success: false, error: "Failed to finalize note" };

  // 3. Visit: signed metadata + straight into the review inbox.
  //    sent_to_office_at is preserved on resubmit so corrected notes keep queue position.
  const { error: visitError } = await supabase
    .from("visits")
    .update({
      status: "sent_to_office",
      sent_to_office_at: visit.sent_to_office_at ?? new Date().toISOString(),
      provider_signature_id: signature.id,
      clinician_name: userRow?.name ?? null,
      clinician_credentials: credentials,
      requires_patient_signature: false,
    })
    .eq("id", visit.id);
  if (visitError) return { success: false, error: "Signature saved but finalize failed — contact support" };

  void appendEvent(note.id, "sign", null, { signatureId: signature.id }, user.id);
  void auditPhiAccess({ action: "sign", table: "field_notes", recordId: note.id, recordType: "field_note_sign" });
  revalidateNote(note.id);
  return { success: true };
}

// ─────────────────────────────────────────────────────
// QA review
// ─────────────────────────────────────────────────────

/**
 * A corrections round-trip needs the nurse to still SEE the patient
 * (00060 scoping). Her patient_clinicians row may have been retired
 * when her other visits for this patient closed — re-activate it
 * whenever a note is sent back to her. Caller must be an office admin
 * (the pc INSERT/UPDATE policies require the role + assigned_by=self).
 */
async function reactivateNurseAssignment(
  patientId: string,
  nurseId: string | null,
  adminUserId: string
): Promise<void> {
  if (!nurseId) return;
  const supabase = await createClient();
  const { data: pc } = await supabase
    .from("patient_clinicians")
    .select("id, is_active")
    .eq("patient_id", patientId)
    .eq("user_id", nurseId)
    .maybeSingle();
  if (!pc) {
    await supabase.from("patient_clinicians").insert({
      patient_id: patientId,
      user_id: nurseId,
      role: "covering",
      is_active: true,
      assigned_by: adminUserId,
    });
  } else if (!pc.is_active) {
    await supabase.from("patient_clinicians").update({ is_active: true }).eq("id", pc.id);
  }
}

async function guardedReview(
  noteId: string,
  expectedStatus: string
): Promise<{ error: string } | NoteGuardOk> {
  const parsed = uuid.safeParse(noteId);
  if (!parsed.success) return { error: "Invalid note id" };
  const { user } = await requireUser();
  if (!user) return { error: "Unauthorized" };
  const role = await getUserRole();
  if (!isOfficeAdmin(role)) return { error: "Admin access required" };
  const loaded = await loadNote(noteId);
  if (!loaded) return { error: "Note not found or access denied" };
  if (loaded.visit.status !== expectedStatus) {
    return { error: `Note is not in a reviewable state (expected ${expectedStatus})` };
  }
  return { user, role, ...loaded };
}

export async function approveFieldNote(noteId: string): Promise<Result> {
  const g = await guardedReview(noteId, "sent_to_office");
  if ("error" in g) return { success: false, error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: g.user.id })
    .eq("id", g.visit.id)
    .eq("status", "sent_to_office");
  if (error) return { success: false, error: "Approve failed" };

  void appendEvent(noteId, "approve", null, null, g.user.id);
  void auditPhiAccess({ action: "update", table: "visits", recordId: g.visit.id, recordType: "field_note_approve" });
  revalidateNote(noteId);
  return { success: true };
}

export async function requestFieldNoteCorrections(
  noteId: string,
  comments: { sectionKey?: string | null; note: string }[]
): Promise<Result> {
  const schema = z
    .array(z.object({ sectionKey: z.string().nullable().optional(), note: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30);
  const parsedComments = schema.safeParse(comments);
  if (!parsedComments.success) return { success: false, error: "Add at least one correction comment" };

  const g = await guardedReview(noteId, "sent_to_office");
  if ("error" in g) return { success: false, error: g.error };

  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("name").eq("id", g.user.id).maybeSingle();
  const now = new Date().toISOString();
  const newEntries: CorrectionEntry[] = parsedComments.data.map((cm) => ({
    section_key: cm.sectionKey ?? null,
    note: cm.note,
    requested_by: g.user.id,
    requested_by_name: userRow?.name ?? "QA",
    requested_at: now,
    resolved: false,
  }));

  const { error } = await supabase
    .from("visits")
    .update({
      status: "needs_correction",
      correction_notes: [...(g.visit.correction_notes ?? []), ...newEntries] as never,
    })
    .eq("id", g.visit.id)
    .eq("status", "sent_to_office");
  if (error) return { success: false, error: "Failed to request corrections" };

  await reactivateNurseAssignment(g.patient.id, g.visit.clinician_id, g.user.id);
  void appendEvent(noteId, "correction_request", null, { count: newEntries.length }, g.user.id);
  revalidateNote(noteId);
  return { success: true };
}

/** Nurse (or office) marks one pinned correction comment resolved. */
export async function resolveCorrection(noteId: string, index: number): Promise<Result> {
  const g = await guardedNote(noteId);
  if ("error" in g) return { success: false, error: g.error };
  const entries = [...(g.visit.correction_notes ?? [])];
  if (index < 0 || index >= entries.length) return { success: false, error: "Unknown correction" };
  entries[index] = { ...entries[index], resolved: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({ correction_notes: entries as never })
    .eq("id", g.visit.id);
  if (error) return { success: false, error: "Update failed" };
  void appendEvent(noteId, "correction_resolved", null, { index }, g.user.id);
  revalidateNote(noteId);
  return { success: true };
}

/** QA-only: reopen an approved note (wrong measurement, late labs). Audit-logged. */
export async function reopenApprovedNote(noteId: string, reason: string): Promise<Result> {
  const reasonParsed = z.string().trim().min(3).max(2000).safeParse(reason);
  if (!reasonParsed.success) return { success: false, error: "A reason is required to reopen" };

  const g = await guardedReview(noteId, "approved");
  if ("error" in g) return { success: false, error: g.error };

  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("name").eq("id", g.user.id).maybeSingle();
  const entry: CorrectionEntry = {
    section_key: null,
    note: `Reopened after approval: ${reasonParsed.data}`,
    requested_by: g.user.id,
    requested_by_name: userRow?.name ?? "QA",
    requested_at: new Date().toISOString(),
    resolved: false,
  };
  const { error } = await supabase
    .from("visits")
    .update({
      status: "needs_correction",
      correction_notes: [...(g.visit.correction_notes ?? []), entry] as never,
    })
    .eq("id", g.visit.id)
    .eq("status", "approved");
  if (error) return { success: false, error: "Reopen failed" };

  await reactivateNurseAssignment(g.patient.id, g.visit.clinician_id, g.user.id);
  void appendEvent(noteId, "reopen", null, { reason: reasonParsed.data }, g.user.id);
  void auditPhiAccess({ action: "update", table: "visits", recordId: g.visit.id, recordType: "field_note_reopen", reason: reasonParsed.data });
  revalidateNote(noteId);
  return { success: true };
}

/** Office: nudge the nurse about an outstanding correction (in-app). */
export async function nudgeNote(noteId: string): Promise<Result> {
  const parsedId = uuid.safeParse(noteId);
  if (!parsedId.success) return { success: false, error: "Invalid note id" };
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const role = await getUserRole();
  if (!isOfficeAdmin(role)) return { success: false, error: "Admin access required" };
  const loaded = await loadNote(noteId);
  if (!loaded) return { success: false, error: "Note not found" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_field_note_section", {
    p_note_id: noteId,
    p_payload: null as never, // meta-only
    p_section_key: "additional_notes",
    p_meta: { nudged_at: new Date().toISOString() } as never,
  });
  if (error) return { success: false, error: "Nudge failed — note may be finalized" };
  revalidateNote(noteId);
  return { success: true };
}

// ─────────────────────────────────────────────────────
// PDF data (status floor enforced here, not in the UI)
// ─────────────────────────────────────────────────────

export async function getFieldNoteDataForPDF(noteId: string): Promise<Result<{ data: FieldNotePdfData }>> {
  const base = await getFieldNote(noteId);
  if (!base.success) return base;
  const d = base.data;

  if (!(PDF_VISIBLE_STATUSES as string[]).includes(d.status)) {
    return { success: false, error: "The PDF is available once the note is signed" };
  }

  const { supabase } = await requireUser();
  let signature: { data: string; signerName: string; signedAt: string } | null = null;
  const loaded = await loadNote(noteId);
  if (loaded?.note.signature_id) {
    const { data: sig } = await supabase
      .from("signatures")
      .select("signature_data, signer_name, signed_at")
      .eq("id", loaded.note.signature_id)
      .maybeSingle();
    if (sig) signature = { data: sig.signature_data, signerName: sig.signer_name, signedAt: sig.signed_at ?? "" };
  }

  // Visit # = ordinal among the patient's real visits (cancelled and
  // no-show excluded), ordered by scheduled date with created_at tiebreak.
  const { data: siblings } = await supabase
    .from("field_notes")
    .select("id, created_at, visits!field_notes_visit_id_fkey!inner (status, scheduled_start_at, visit_date)")
    .eq("patient_id", d.patient.id)
    .not("visits.status", "in", '("cancelled","no-show")');
  const ordered = ((siblings ?? []) as unknown as {
    id: string;
    created_at: string;
    visits: { status: string; scheduled_start_at: string | null; visit_date: string };
  }[])
    .filter((s) => s.visits)
    .sort((a, b) => {
      const aKey = a.visits.scheduled_start_at ?? a.visits.visit_date;
      const bKey = b.visits.scheduled_start_at ?? b.visits.visit_date;
      return aKey === bKey ? a.created_at.localeCompare(b.created_at) : aKey.localeCompare(bKey);
    });
  const visitNumber = Math.max(1, ordered.findIndex((s) => s.id === noteId) + 1);

  let facilityName: string | null = null;
  const { data: fac } = await supabase.from("facilities").select("name").eq("id", d.patient.facilityId).maybeSingle();
  facilityName = fac?.name ?? null;

  void auditPhiAccess({ action: "export", table: "field_notes", recordId: noteId, recordType: "field_note_pdf" });

  return {
    success: true,
    data: {
      note: d,
      visitNumber,
      facilityName,
      signature,
      progress: noteProgress(d.noteType, d.sections, d.sectionsMeta, d.addedSections),
      flags: computeReviewFlags(d.noteType, d.sections, d.sectionsMeta, d.addedSections, d.timeOut),
      applicableSectionKeys: applicableSections(d.noteType, d.addedSections).map((s) => s.key),
    },
  };
}

export interface FieldNotePdfData {
  note: FieldNoteDTO;
  visitNumber: number;
  facilityName: string | null;
  signature: { data: string; signerName: string; signedAt: string } | null;
  progress: { total: number; done: number; untouchedKeys: string[] };
  flags: string[];
  applicableSectionKeys: string[];
}
