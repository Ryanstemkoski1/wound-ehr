"use server";

// =====================================================
// Field Ops — scheduling & visit lifecycle actions
// =====================================================
// createFieldVisit provisions EVERYTHING the nurse needs to see the
// work (user_facilities + patient_clinicians — post-00060 a clinical-
// only nurse is otherwise blind to the patient), then creates the
// visit + note atomically-enough (visit rolled back if provisioning
// or note creation fails). Lifecycle actions retire assignments so
// cancelled/reassigned visits don't leave standing PHI access.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, type UserRoleData } from "@/lib/rbac";
import { auditPhiAccess } from "@/lib/audit-log";
import { statusChip, computeReviewFlags, noteProgress, EDITABLE_VISIT_STATUSES } from "@/lib/field-note/logic";
import { NOTE_TYPE_LABELS, type NoteType } from "@/lib/field-note/registry";
import { isOfficeAdmin, userNames, type CorrectionEntry } from "@/lib/field-note/server-helpers";

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

const uuid = z.string().uuid();

async function requireOfficeAdmin(): Promise<
  { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: UserRoleData } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const role = await getUserRole();
  if (!isOfficeAdmin(role) || !role) return { error: "Admin access required" };
  return { supabase, userId: user.id, role };
}

function revalidateSurface() {
  revalidatePath("/schedule");
  revalidatePath("/visits");
  revalidatePath("/inbox");
}

// ─────────────────────────────────────────────────────
// Create visit + note (with nurse provisioning)
// ─────────────────────────────────────────────────────

const createSchema = z.object({
  patientId: uuid,
  nurseId: uuid,
  startAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(5).max(480).default(60),
  noteType: z.enum(["initial_evaluation", "follow_up"]),
  room: z.string().trim().max(120).optional(),
  repeatWeeks: z.number().int().min(1).max(12).default(1),
});

export async function createFieldVisit(
  input: z.input<typeof createSchema>
): Promise<Result<{ noteIds: string[]; warnings: string[] }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase, userId } = guard;
  const { patientId, nurseId, startAt, durationMin, noteType, room, repeatWeeks } = parsed.data;
  const warnings: string[] = [];

  // Patient (RLS-checked read).
  const { data: patient } = await supabase
    .from("patients")
    .select("id, facility_id, first_name, last_name")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return { success: false, error: "Patient not found or access denied" };

  // Nurse must exist with a clinical credential.
  const { data: nurse } = await supabase
    .from("users")
    .select("id, name, credentials")
    .eq("id", nurseId)
    .maybeSingle();
  if (!nurse) return { success: false, error: "Nurse not found" };
  if (!nurse.credentials || nurse.credentials === "Admin") {
    return { success: false, error: "The assigned user must hold a clinical credential" };
  }

  // Provision BEFORE creating visits: without these rows the nurse
  // cannot SELECT the patient/visit at the RLS layer (00060 + 00001).
  const { data: uf } = await supabase
    .from("user_facilities")
    .select("user_id")
    .eq("user_id", nurseId)
    .eq("facility_id", patient.facility_id)
    .maybeSingle();
  if (!uf) {
    const { error: ufError } = await supabase
      .from("user_facilities")
      .insert({ user_id: nurseId, facility_id: patient.facility_id, is_default: false });
    if (ufError) {
      return { success: false, error: "Could not grant the nurse access to this facility — check your admin rights for it" };
    }
  }

  const { data: pc } = await supabase
    .from("patient_clinicians")
    .select("id, is_active")
    .eq("patient_id", patientId)
    .eq("user_id", nurseId)
    .maybeSingle();
  if (!pc) {
    const { error: pcError } = await supabase.from("patient_clinicians").insert({
      patient_id: patientId,
      user_id: nurseId,
      role: "covering",
      is_active: true,
      assigned_by: userId,
    });
    if (pcError) return { success: false, error: "Could not assign the nurse to this patient" };
  } else if (!pc.is_active) {
    const { error: pcError } = await supabase
      .from("patient_clinicians")
      .update({ is_active: true })
      .eq("id", pc.id);
    if (pcError) return { success: false, error: "Could not re-activate the nurse's patient assignment" };
  }

  // Same-day duplicate warning (non-blocking), same-day judged in the
  // practice's timezone: fetch a ±24h window and compare day keys.
  const firstStart = new Date(startAt);
  const windowStart = new Date(firstStart.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(firstStart.getTime() + 24 * 60 * 60 * 1000);
  const { data: nearby } = await supabase
    .from("visits")
    .select("id, scheduled_start_at")
    .eq("patient_id", patientId)
    .gte("scheduled_start_at", windowStart.toISOString())
    .lt("scheduled_start_at", windowEnd.toISOString())
    .not("status", "in", '("cancelled","no-show")');
  const targetDay = dayKey(firstStart);
  if ((nearby ?? []).some((v) => v.scheduled_start_at && dayKey(v.scheduled_start_at) === targetDay)) {
    warnings.push("This patient already has a visit scheduled that day.");
  }

  const noteIds: string[] = [];
  for (let week = 0; week < repeatWeeks; week++) {
    const start = new Date(firstStart);
    start.setDate(start.getDate() + week * 7);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .insert({
        patient_id: patientId,
        visit_date: start.toISOString(),
        visit_type: "in_person",
        visit_kind: "wound_care",
        status: "scheduled",
        clinician_id: nurseId,
        scheduled_by: userId,
        requires_patient_signature: false,
        scheduled_start_at: start.toISOString(),
        scheduled_end_at: end.toISOString(),
        duration_minutes: durationMin,
      })
      .select("id")
      .single();
    if (visitError || !visit) {
      return {
        success: false,
        error: week === 0 ? "Failed to create the visit" : `Created ${week} of ${repeatWeeks} visits, then failed`,
      };
    }

    // Only the first visit of a series is an Initial Evaluation.
    const thisNoteType: NoteType = week === 0 ? noteType : "follow_up";
    const { data: note, error: noteError } = await supabase
      .from("field_notes")
      .insert({
        visit_id: visit.id,
        patient_id: patientId,
        note_type: thisNoteType,
        room: room ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (noteError || !note) {
      await supabase.from("visits").delete().eq("id", visit.id);
      return { success: false, error: "Failed to create the note for the visit" };
    }
    noteIds.push(note.id);
  }

  void auditPhiAccess({ action: "create", table: "field_notes", recordId: noteIds[0], recordType: "field_visit_create" });
  revalidateSurface();
  return { success: true, noteIds, warnings };
}

// ─────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────

async function loadVisit(visitId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visits")
    .select("id, status, patient_id, clinician_id, scheduled_start_at, duration_minutes")
    .eq("id", visitId)
    .maybeSingle();
  return data;
}

/** Deactivate the nurse↔patient assignment when no other open visits remain (minimum-necessary access). */
async function retireAssignmentIfIdle(nurseId: string | null, patientId: string, excludeVisitId: string) {
  if (!nurseId) return;
  const supabase = await createClient();
  // sent_to_office / approved count as open: QA can still bounce those
  // back to the nurse (needs_correction), and she must keep seeing the
  // patient for that round-trip.
  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("clinician_id", nurseId)
    .eq("patient_id", patientId)
    .neq("id", excludeVisitId)
    .in("status", [...EDITABLE_VISIT_STATUSES, "submitted", "sent_to_office", "approved"]);
  if ((count ?? 0) === 0) {
    await supabase
      .from("patient_clinicians")
      .update({ is_active: false })
      .eq("patient_id", patientId)
      .eq("user_id", nurseId);
  }
}

const CANCELABLE = ["scheduled", "in-progress"];

export async function cancelVisit(visitId: string): Promise<Result> {
  if (!uuid.safeParse(visitId).success) return { success: false, error: "Invalid visit id" };
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const visit = await loadVisit(visitId);
  if (!visit) return { success: false, error: "Visit not found" };
  if (!CANCELABLE.includes(visit.status)) return { success: false, error: "Visit can no longer be cancelled" };

  const { supabase, userId } = guard;
  const { error } = await supabase
    .from("visits")
    .update({ status: "cancelled" })
    .eq("id", visitId)
    .in("status", CANCELABLE);
  if (error) return { success: false, error: "Cancel failed" };
  await retireAssignmentIfIdle(visit.clinician_id, visit.patient_id, visitId);
  void auditPhiAccess({ action: "update", table: "visits", recordId: visitId, recordType: "field_visit_cancel" });
  revalidateSurface();
  void userId;
  return { success: true };
}

export async function markNoShow(visitId: string, reason: string): Promise<Result> {
  if (!uuid.safeParse(visitId).success) return { success: false, error: "Invalid visit id" };
  const reasonParsed = z.string().trim().min(1).max(500).safeParse(reason);
  if (!reasonParsed.success) return { success: false, error: "A reason is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const visit = await loadVisit(visitId);
  if (!visit) return { success: false, error: "Visit not found" };
  const role = await getUserRole();
  // Office staff or the assigned nurse (she's the one standing at the empty room).
  if (!isOfficeAdmin(role) && visit.clinician_id !== user.id) {
    return { success: false, error: "Not permitted" };
  }
  if (!CANCELABLE.includes(visit.status)) return { success: false, error: "Visit can no longer be marked no-show" };

  const { error } = await supabase
    .from("visits")
    .update({ status: "no-show", no_show_reason: reasonParsed.data, no_show_at: new Date().toISOString() } as never)
    .eq("id", visitId)
    .in("status", CANCELABLE);
  if (error) return { success: false, error: "Update failed" };
  await retireAssignmentIfIdle(visit.clinician_id, visit.patient_id, visitId);
  revalidateSurface();
  return { success: true };
}

export async function rescheduleFieldVisit(
  visitId: string,
  newStartAt: string,
  durationMin?: number
): Promise<Result> {
  const parsed = z
    .object({
      visitId: uuid,
      newStartAt: z.string().datetime({ offset: true }),
      durationMin: z.number().int().min(5).max(480).optional(),
    })
    .safeParse({ visitId, newStartAt, durationMin });
  if (!parsed.success) return { success: false, error: "Invalid input" };
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const visit = await loadVisit(visitId);
  if (!visit) return { success: false, error: "Visit not found" };
  if (!CANCELABLE.includes(visit.status)) return { success: false, error: "Finalized visits cannot be rescheduled" };

  const duration = parsed.data.durationMin ?? visit.duration_minutes ?? 60;
  const start = new Date(parsed.data.newStartAt);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  // visit_date and the scheduled window move TOGETHER (legacy desync bug avoided).
  const { supabase } = guard;
  const { error } = await supabase
    .from("visits")
    .update({
      visit_date: start.toISOString(),
      scheduled_start_at: start.toISOString(),
      scheduled_end_at: end.toISOString(),
      duration_minutes: duration,
    })
    .eq("id", visitId);
  if (error) return { success: false, error: "Reschedule failed" };
  revalidateSurface();
  return { success: true };
}

export async function reassignVisit(visitId: string, newNurseId: string): Promise<Result> {
  const parsed = z.object({ visitId: uuid, newNurseId: uuid }).safeParse({ visitId, newNurseId });
  if (!parsed.success) return { success: false, error: "Invalid input" };
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase, userId } = guard;
  const visit = await loadVisit(visitId);
  if (!visit) return { success: false, error: "Visit not found" };
  if (![...EDITABLE_VISIT_STATUSES].includes(visit.status as never)) {
    return { success: false, error: "Finalized visits cannot be reassigned" };
  }

  const { data: nurse } = await supabase.from("users").select("id, credentials").eq("id", newNurseId).maybeSingle();
  if (!nurse || !nurse.credentials || nurse.credentials === "Admin") {
    return { success: false, error: "The new assignee must hold a clinical credential" };
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id, facility_id")
    .eq("id", visit.patient_id)
    .maybeSingle();
  if (!patient) return { success: false, error: "Patient not found" };

  // Provision the new nurse (same as create).
  const { data: uf } = await supabase
    .from("user_facilities")
    .select("user_id")
    .eq("user_id", newNurseId)
    .eq("facility_id", patient.facility_id)
    .maybeSingle();
  if (!uf) {
    const { error: ufError } = await supabase
      .from("user_facilities")
      .insert({ user_id: newNurseId, facility_id: patient.facility_id, is_default: false });
    if (ufError) return { success: false, error: "Could not grant the new nurse facility access" };
  }
  const { data: pc } = await supabase
    .from("patient_clinicians")
    .select("id, is_active")
    .eq("patient_id", visit.patient_id)
    .eq("user_id", newNurseId)
    .maybeSingle();
  if (!pc) {
    const { error: pcError } = await supabase.from("patient_clinicians").insert({
      patient_id: visit.patient_id,
      user_id: newNurseId,
      role: "covering",
      is_active: true,
      assigned_by: userId,
    });
    if (pcError) return { success: false, error: "Could not assign the new nurse to this patient" };
  } else if (!pc.is_active) {
    await supabase.from("patient_clinicians").update({ is_active: true }).eq("id", pc.id);
  }

  const oldNurseId = visit.clinician_id;
  const { error } = await supabase.from("visits").update({ clinician_id: newNurseId }).eq("id", visitId);
  if (error) return { success: false, error: "Reassign failed" };
  await retireAssignmentIfIdle(oldNurseId, visit.patient_id, visitId);
  void auditPhiAccess({ action: "update", table: "visits", recordId: visitId, recordType: "field_visit_reassign" });
  revalidateSurface();
  return { success: true };
}

// ─────────────────────────────────────────────────────
// List reads (every query inner-joins field_notes: legacy
// visits are invisible to the Field Ops surface by construction)
// ─────────────────────────────────────────────────────

// !inner on visits so that .eq("visits.status", ...) filters restrict the
// PARENT field_notes rows (a plain embed only nulls the join, which breaks
// limits and fetches every note's sections on every list call).
const LIST_SELECT = `
  id, note_type, prepped_at, time_in, time_out, sections, sections_meta, added_sections,
  visits!field_notes_visit_id_fkey!inner (
    id, status, visit_date, clinician_id, scheduled_start_at, scheduled_end_at,
    duration_minutes, sent_to_office_at, approved_at, correction_notes
  ),
  patients!field_notes_patient_id_fkey ( id, first_name, last_name, mrn, facility_id, facilities ( name ) )
`;

/**
 * The practice operates in one region; day bucketing ("today",
 * "overdue", same-day duplicate checks) uses this zone rather than the
 * server's (UTC in production would misfile evening visits).
 */
const PRACTICE_TIME_ZONE = "America/Los_Angeles";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar-day key (YYYY-MM-DD) of an instant, in the practice's timezone. */
function dayKey(iso: string | Date): string {
  return dayKeyFormat.format(typeof iso === "string" ? new Date(iso) : iso);
}

interface ListRow {
  id: string;
  note_type: string;
  prepped_at: string | null;
  time_in: string | null;
  time_out: string | null;
  sections: Record<string, Record<string, unknown>>;
  sections_meta: Record<string, { not_assessed?: boolean; attestation?: boolean }>;
  added_sections: string[];
  visits: {
    id: string;
    status: string;
    visit_date: string;
    clinician_id: string | null;
    scheduled_start_at: string | null;
    scheduled_end_at: string | null;
    duration_minutes: number | null;
    sent_to_office_at: string | null;
    approved_at: string | null;
    correction_notes: CorrectionEntry[] | null;
  };
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string | null;
    facility_id: string;
    facilities: { name: string } | null;
  };
}

export interface VisitCard {
  noteId: string;
  visitId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  facilityName: string | null;
  nurseId: string | null;
  nurseName: string | null;
  noteType: NoteType;
  noteTypeLabel: string;
  status: string;
  chip: { label: string; tone: string };
  scheduledStartAt: string | null;
  visitDate: string;
  preppedAt: string | null;
  sentToOfficeAt: string | null;
  approvedAt: string | null;
  progressDone: number;
  progressTotal: number;
  flags: string[];
  correctionPreview: string | null;
  unresolvedCorrections: number;
}

function toCard(row: ListRow, names: Record<string, string>): VisitCard {
  const noteType: NoteType = row.note_type === "follow_up" ? "follow_up" : "initial_evaluation";
  const progress = noteProgress(noteType, row.sections, row.sections_meta, row.added_sections);
  const corrections = row.visits.correction_notes ?? [];
  const unresolved = corrections.filter((c) => !c.resolved);
  return {
    noteId: row.id,
    visitId: row.visits.id,
    patientId: row.patients.id,
    patientName: `${row.patients.first_name} ${row.patients.last_name}`,
    mrn: row.patients.mrn,
    facilityName: row.patients.facilities?.name ?? null,
    nurseId: row.visits.clinician_id,
    nurseName: row.visits.clinician_id ? (names[row.visits.clinician_id] ?? null) : null,
    noteType,
    noteTypeLabel: NOTE_TYPE_LABELS[noteType],
    status: row.visits.status,
    chip: statusChip(row.visits.status, row.prepped_at),
    scheduledStartAt: row.visits.scheduled_start_at,
    visitDate: row.visits.visit_date,
    preppedAt: row.prepped_at,
    sentToOfficeAt: row.visits.sent_to_office_at,
    approvedAt: row.visits.approved_at,
    progressDone: progress.done,
    progressTotal: progress.total,
    flags: computeReviewFlags(noteType, row.sections, row.sections_meta, row.added_sections, row.time_out),
    correctionPreview: unresolved[0]?.note ?? null,
    unresolvedCorrections: unresolved.length,
  };
}

async function collectNames(rows: ListRow[]): Promise<Record<string, string>> {
  return userNames(rows.map((r) => r.visits.clinician_id ?? "").filter(Boolean));
}

/** Nurse home: needs-attention / today / upcoming. */
export async function getMyVisits(): Promise<
  Result<{ needsAttention: VisitCard[]; today: VisitCard[]; upcoming: VisitCard[] }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 8);
  const { data, error } = await supabase
    .from("field_notes")
    .select(LIST_SELECT)
    .eq("visits.clinician_id", user.id)
    .in("visits.status", ["scheduled", "in-progress", "needs_correction"])
    .lte("visits.scheduled_start_at", horizon.toISOString())
    .order("scheduled_start_at", { referencedTable: "visits", ascending: true });
  if (error) return { success: false, error: "Failed to load visits" };

  const rows = (data ?? []) as unknown as ListRow[];
  const names = await collectNames(rows);
  const cards = rows
    .filter((r) => r.visits)
    .map((r) => toCard(r, names))
    // referencedTable .order() does not sort parent rows — sort here.
    .sort((a, b) => (a.scheduledStartAt ?? a.visitDate).localeCompare(b.scheduledStartAt ?? b.visitDate));

  // Day bucketing in the practice's timezone, not the server's.
  const todayKey = dayKey(new Date());
  const cardDay = (card: VisitCard) => dayKey(card.scheduledStartAt ?? card.visitDate);

  const needsAttention = cards.filter(
    (card) => card.status === "needs_correction" || cardDay(card) < todayKey
  );
  const today = cards.filter((card) => !needsAttention.includes(card) && cardDay(card) === todayKey);
  const upcoming = cards.filter((card) => !needsAttention.includes(card) && !today.includes(card));

  return { success: true, needsAttention, today, upcoming };
}

/** Scheduler grid: all field visits in a date range. */
export async function getScheduleRange(
  fromIso: string,
  toIso: string
): Promise<Result<{ cards: VisitCard[]; nurses: { id: string; name: string }[] }>> {
  const parsed = z
    .object({ fromIso: z.string().datetime({ offset: true }), toIso: z.string().datetime({ offset: true }) })
    .safeParse({ fromIso, toIso });
  if (!parsed.success) return { success: false, error: "Invalid range" };
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };

  const { supabase } = guard;
  const { data, error } = await supabase
    .from("field_notes")
    .select(LIST_SELECT)
    .gte("visits.scheduled_start_at", fromIso)
    .lte("visits.scheduled_start_at", toIso)
    .order("scheduled_start_at", { referencedTable: "visits", ascending: true });
  if (error) return { success: false, error: "Failed to load schedule" };

  const rows = ((data ?? []) as unknown as ListRow[]).filter((r) => r.visits);
  const names = await collectNames(rows);
  const cards = rows
    .map((r) => toCard(r, names))
    .sort((a, b) => (a.scheduledStartAt ?? a.visitDate).localeCompare(b.scheduledStartAt ?? b.visitDate));
  const nurses = [...new Map(cards.filter((c) => c.nurseId).map((c) => [c.nurseId as string, { id: c.nurseId as string, name: c.nurseName ?? "Unknown" }])).values()];
  return { success: true, cards, nurses };
}

/** QA inbox: all five queues in one call. */
export async function getInboxQueues(): Promise<
  Result<{
    pendingReview: VisitCard[];
    prepDue: VisitCard[];
    overdue: VisitCard[];
    correctionsOut: VisitCard[];
    completed: VisitCard[];
  }>
> {
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase } = guard;

  const prepHorizon = new Date();
  prepHorizon.setDate(prepHorizon.getDate() + 3);
  const now = new Date().toISOString();

  // LIST_SELECT's !inner join makes the visits.status filters restrict
  // the parent rows, so the completed .limit(30) is now correct.
  // referencedTable .order() never sorts parent rows — every queue is
  // sorted in JS after mapping instead.
  const [pending, open, corrections, completed] = await Promise.all([
    supabase.from("field_notes").select(LIST_SELECT).eq("visits.status", "sent_to_office"),
    supabase
      .from("field_notes")
      .select(LIST_SELECT)
      .in("visits.status", ["scheduled", "in-progress"])
      .lte("visits.scheduled_start_at", prepHorizon.toISOString()),
    supabase.from("field_notes").select(LIST_SELECT).eq("visits.status", "needs_correction"),
    // Bounded fetch, newest-30 selected after the JS sort (top-level
    // ordering by an embedded column isn't reliably supported).
    supabase.from("field_notes").select(LIST_SELECT).eq("visits.status", "approved").limit(200),
  ]);

  const shape = async (data: unknown) => {
    const rows = ((data ?? []) as unknown as ListRow[]).filter((r) => r.visits);
    const names = await collectNames(rows);
    return rows.map((r) => toCard(r, names));
  };

  if (pending.error || open.error || corrections.error || completed.error) {
    return { success: false, error: "Failed to load inbox" };
  }

  const bySchedule = (a: VisitCard, b: VisitCard) =>
    (a.scheduledStartAt ?? a.visitDate).localeCompare(b.scheduledStartAt ?? b.visitDate);

  const openCards = (await shape(open.data)).sort(bySchedule);
  return {
    success: true,
    // Oldest submissions first (FIFO queue position; markAsCorrected-style
    // resubmits keep their original sent_to_office_at on purpose).
    pendingReview: (await shape(pending.data)).sort((a, b) =>
      (a.sentToOfficeAt ?? "").localeCompare(b.sentToOfficeAt ?? "")
    ),
    prepDue: openCards.filter((c) => !c.preppedAt && c.scheduledStartAt !== null && c.scheduledStartAt >= now),
    overdue: openCards.filter((c) => c.scheduledStartAt !== null && c.scheduledStartAt < now),
    correctionsOut: (await shape(corrections.data)).sort((a, b) =>
      (a.sentToOfficeAt ?? "").localeCompare(b.sentToOfficeAt ?? "")
    ),
    completed: (await shape(completed.data))
      .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? ""))
      .slice(0, 30),
  };
}

/** Clinical users in the caller's facilities — the nurse picker. */
export async function getFieldNurses(): Promise<
  Result<{ nurses: { id: string; name: string; credentials: string; todayCount: number }[] }>
> {
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase } = guard;

  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, credentials")
    .not("credentials", "is", null)
    .neq("credentials", "Admin");
  if (error) return { success: false, error: "Failed to load nurses" };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const { data: todays } = await supabase
    .from("visits")
    .select("clinician_id")
    .gte("scheduled_start_at", todayStart.toISOString())
    .lt("scheduled_start_at", todayEnd.toISOString())
    .in("status", ["scheduled", "in-progress"]);
  const counts = new Map<string, number>();
  for (const v of todays ?? []) {
    if (v.clinician_id) counts.set(v.clinician_id, (counts.get(v.clinician_id) ?? 0) + 1);
  }

  return {
    success: true,
    nurses: (users ?? []).map((u) => ({
      id: u.id,
      name: u.name ?? "Unknown",
      credentials: u.credentials as string,
      todayCount: counts.get(u.id) ?? 0,
    })),
  };
}
