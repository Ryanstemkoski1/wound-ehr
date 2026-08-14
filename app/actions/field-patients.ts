"use server";

// =====================================================
// Field Ops — patient actions
// =====================================================
// Directory, chart, and admin-gated demographic writes for the
// /patients surface. Reads ride RLS: office admins see their
// facility's (or tenant's) patients, clinical users see only
// their assigned set (00060) — no app-side assignment filtering.
//
// Every write: auth → role guard → validate → write →
// auditPhiAccess → revalidatePath. Nothing is imported from the
// legacy patient actions; conventions were copied, not code.
//
// patients NOT NULLs satisfied on insert: facility_id, first_name,
// last_name, dob, mrn, created_by. UNIQUE(facility_id, mrn) is
// handled with a readable error (and one auto-MRN retry).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";
import { auditPhiAccess } from "@/lib/audit-log";
import { statusChip, PDF_VISIBLE_STATUSES } from "@/lib/field-note/logic";
import { NOTE_TYPE_LABELS, type NoteType } from "@/lib/field-note/registry";
import { isOfficeAdmin, userNames } from "@/lib/field-note/server-helpers";

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

const uuid = z.string().uuid();

/** YYYY-MM-DD, a real calendar date, not in the future. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), {
    message: "Invalid date",
  })
  .refine((v) => new Date(`${v}T00:00:00Z`).getTime() <= Date.now(), {
    message: "Date of birth cannot be in the future",
  });

/** Strip characters that break PostgREST filter syntax / ilike patterns (legacy-proven set). */
function sanitizeForIlike(value: string): string {
  return value.replace(/[%_\\(),.*]/g, "").trim();
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Admin gate for patient writes: tenant_admin or facility_admin ROLE via
 * getUserRole. Deliberately NOT hasAdminEntitlement — the 00059 patients
 * INSERT policy (and the field-ops persona model) require the org-admin
 * role itself; an "Admin" credential alone is not enough.
 */
async function requireAdminRole(): Promise<
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string };
      role: Awaited<ReturnType<typeof getUserRole>>;
    }
> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Unauthorized" };
  const role = await getUserRole();
  if (!isOfficeAdmin(role)) return { error: "Admin access required" };
  return { supabase, user, role };
}

// ─────────────────────────────────────────────────────
// Directory
// ─────────────────────────────────────────────────────

export interface PatientDirectoryEntry {
  id: string;
  name: string;
  dob: string;
  mrn: string;
  facilityName: string | null;
  lastVisitDate: string | null;
}

/** Visit statuses that mean the visit actually happened — drives lastVisitDate. */
const OCCURRED_VISIT_STATUSES = [
  "in-progress",
  "submitted",
  "sent_to_office",
  "needs_correction",
  "approved",
];

/**
 * Thin patient directory for /patients. Office admins see every facility
 * patient; clinical users get their RLS-scoped assigned set automatically.
 * `search` filters name/MRN server-side.
 */
export async function getPatientsDirectory(
  search?: string
): Promise<Result<{ patients: PatientDirectoryEntry[] }>> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  let query = supabase
    .from("patients")
    .select("id, first_name, last_name, dob, mrn, facilities ( name )")
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(500);

  const sanitized = search ? sanitizeForIlike(search) : "";
  if (sanitized) {
    query = query.or(
      `first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,mrn.ilike.%${sanitized}%`
    );
  }

  const { data, error } = await query;
  if (error) return { success: false, error: "Failed to load patients" };

  const rows = (data ?? []) as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    dob: string;
    mrn: string;
    facilities: { name: string } | null;
  }[];

  // Last field visit per patient in one batched query. Field-note visits
  // only (inner concept of the new surface) — legacy visits never leak in.
  const lastVisit = new Map<string, string>();
  if (rows.length > 0) {
    const { data: noteRows } = await supabase
      .from("field_notes")
      .select("patient_id, visits!field_notes_visit_id_fkey ( visit_date, status )")
      .in(
        "patient_id",
        rows.map((r) => r.id)
      );
    const shaped = (noteRows ?? []) as unknown as {
      patient_id: string;
      visits: { visit_date: string; status: string } | null;
    }[];
    for (const row of shaped) {
      const visit = row.visits;
      if (!visit || !OCCURRED_VISIT_STATUSES.includes(visit.status)) continue;
      const prev = lastVisit.get(row.patient_id);
      if (!prev || visit.visit_date > prev) lastVisit.set(row.patient_id, visit.visit_date);
    }
  }

  return {
    success: true,
    patients: rows.map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      dob: r.dob,
      mrn: r.mrn,
      facilityName: r.facilities?.name ?? null,
      lastVisitDate: lastVisit.get(r.id) ?? null,
    })),
  };
}

// ─────────────────────────────────────────────────────
// Chart
// ─────────────────────────────────────────────────────

export interface PatientNoteHistoryEntry {
  noteId: string;
  visitId: string;
  noteType: NoteType;
  noteTypeLabel: string;
  status: string;
  chip: { label: string; tone: string };
  visitDate: string;
  scheduledStartAt: string | null;
  nurseId: string | null;
  nurseName: string | null;
  approvedAt: string | null;
  /** TRUE once the note has crossed the PDF status floor (signed onward). */
  pdfAvailable: boolean;
}

export interface PatientChartDTO {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dob: string;
  mrn: string;
  gender: string | null;
  phone: string | null;
  facilityId: string;
  facilityName: string | null;
  isActive: boolean;
  createdAt: string | null;
  /** Field-note history, most recent first. */
  notes: PatientNoteHistoryEntry[];
  viewer: { canEditDemographics: boolean };
}

/** Demographics + chronological field-note history + facility name for /patients/[id]. */
export async function getPatientChart(
  patientId: string
): Promise<Result<{ data: PatientChartDTO }>> {
  if (!uuid.safeParse(patientId).success) {
    return { success: false, error: "Invalid patient id" };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: patientRow, error } = await supabase
    .from("patients")
    .select(
      "id, first_name, last_name, dob, mrn, gender, phone, facility_id, is_active, created_at, facilities ( name )"
    )
    .eq("id", patientId)
    .maybeSingle();
  if (error || !patientRow) {
    // RLS hides unassigned patients from clinical users — same message either way.
    return { success: false, error: "Patient not found or access denied" };
  }

  void auditPhiAccess({
    action: "read",
    table: "patients",
    recordId: patientId,
    recordType: "field_patient_chart",
  });

  const { data: noteData, error: notesError } = await supabase
    .from("field_notes")
    .select(
      `id, note_type, prepped_at,
       visits!field_notes_visit_id_fkey (
         id, status, visit_date, scheduled_start_at, clinician_id, approved_at
       )`
    )
    .eq("patient_id", patientId);
  if (notesError) return { success: false, error: "Failed to load visit history" };

  const noteRows = (
    (noteData ?? []) as unknown as {
      id: string;
      note_type: string;
      prepped_at: string | null;
      visits: {
        id: string;
        status: string;
        visit_date: string;
        scheduled_start_at: string | null;
        clinician_id: string | null;
        approved_at: string | null;
      } | null;
    }[]
  ).filter((r) => r.visits !== null);

  const names = await userNames(noteRows.map((r) => r.visits?.clinician_id ?? ""));

  const notes: PatientNoteHistoryEntry[] = noteRows
    .map((r) => {
      const visit = r.visits!;
      const noteType: NoteType =
        r.note_type === "follow_up" ? "follow_up" : "initial_evaluation";
      return {
        noteId: r.id,
        visitId: visit.id,
        noteType,
        noteTypeLabel: NOTE_TYPE_LABELS[noteType],
        status: visit.status,
        chip: statusChip(visit.status, r.prepped_at),
        visitDate: visit.visit_date,
        scheduledStartAt: visit.scheduled_start_at,
        nurseId: visit.clinician_id,
        nurseName: visit.clinician_id ? (names[visit.clinician_id] ?? null) : null,
        approvedAt: visit.approved_at,
        pdfAvailable: (PDF_VISIBLE_STATUSES as string[]).includes(visit.status),
      };
    })
    .sort((a, b) =>
      (b.scheduledStartAt ?? b.visitDate).localeCompare(a.scheduledStartAt ?? a.visitDate)
    );

  const role = await getUserRole();
  const p = patientRow as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    dob: string;
    mrn: string;
    gender: string | null;
    phone: string | null;
    facility_id: string;
    is_active: boolean | null;
    created_at: string | null;
    facilities: { name: string } | null;
  };

  return {
    success: true,
    data: {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      name: `${p.first_name} ${p.last_name}`,
      dob: p.dob,
      mrn: p.mrn,
      gender: p.gender,
      phone: p.phone,
      facilityId: p.facility_id,
      facilityName: p.facilities?.name ?? null,
      isActive: p.is_active !== false,
      createdAt: p.created_at,
      notes,
      viewer: { canEditDemographics: isOfficeAdmin(role) },
    },
  };
}

// ─────────────────────────────────────────────────────
// Create (new-patient sheet: name, DOB, facility, optional MRN)
// ─────────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  dob: isoDate,
  facilityId: uuid,
  mrn: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(64).optional()
  ),
});

function generatedMrn(): string {
  return `WN-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Create a patient from the new-patient sheet (also reachable inline from
 * the schedule's visit-creation flow). MRN auto-generates when the practice
 * doesn't issue one; a same-name+DOB match returns a non-blocking warning.
 */
export async function createFieldPatient(input: {
  firstName: string;
  lastName: string;
  dob: string;
  facilityId: string;
  mrn?: string;
}): Promise<Result<{ patientId: string; mrn: string; warnings: string[] }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid patient data",
    };
  }
  const guard = await requireAdminRole();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase, user } = guard;
  const { firstName, lastName, dob, facilityId } = parsed.data;
  const warnings: string[] = [];

  // Facility must exist and be visible to the caller (RLS-checked read).
  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("id", facilityId)
    .maybeSingle();
  if (!facility) return { success: false, error: "Facility not found or access denied" };

  // Non-blocking duplicate check: same name + DOB at this facility.
  const firstPattern = sanitizeForIlike(firstName);
  const lastPattern = sanitizeForIlike(lastName);
  if (firstPattern && lastPattern) {
    const { data: dupes } = await supabase
      .from("patients")
      .select("id, mrn")
      .eq("facility_id", facilityId)
      .eq("dob", dob)
      .ilike("first_name", firstPattern)
      .ilike("last_name", lastPattern)
      .eq("is_active", true)
      .limit(1);
    if ((dupes ?? []).length > 0) {
      warnings.push(
        `A patient named ${firstName} ${lastName} with the same date of birth already exists at ${facility.name} (MRN ${dupes![0].mrn}). Double-check before documenting against the new record.`
      );
    }
  }

  const mrnProvided = parsed.data.mrn !== undefined;
  let mrn = mrnProvided ? (parsed.data.mrn as string) : generatedMrn();

  const insertPatient = (candidateMrn: string) =>
    supabase
      .from("patients")
      .insert({
        facility_id: facilityId,
        first_name: firstName,
        last_name: lastName,
        dob,
        mrn: candidateMrn,
        created_by: user.id,
      })
      .select("id")
      .single();

  let { data: created, error: insertError } = await insertPatient(mrn);

  // UNIQUE(facility_id, mrn): an auto-generated MRN retries once with a
  // random suffix; a caller-supplied MRN conflict is the caller's to fix.
  if (insertError && isUniqueViolation(insertError)) {
    if (mrnProvided) {
      return {
        success: false,
        error: "A patient with this MRN already exists at this facility",
      };
    }
    mrn = `${mrn}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    ({ data: created, error: insertError } = await insertPatient(mrn));
  }
  if (insertError || !created) {
    return { success: false, error: "Failed to create patient" };
  }

  void auditPhiAccess({
    action: "create",
    table: "patients",
    recordId: created.id,
    recordType: "field_patient_create",
    newValues: {
      first_name: firstName,
      last_name: lastName,
      dob,
      mrn,
      facility_id: facilityId,
    },
  });
  revalidatePath("/patients");
  return { success: true, patientId: created.id, mrn, warnings };
}

// ─────────────────────────────────────────────────────
// Update demographics (admin-gated)
// ─────────────────────────────────────────────────────

// Only fields that exist on patients are editable here. There is no
// room-like column on the patients table — room is per-visit and lives
// on field_notes (updateNoteHeader), so it is deliberately absent.
const demographicsPatchSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name cannot be empty").max(120).optional(),
    lastName: z.string().trim().min(1, "Last name cannot be empty").max(120).optional(),
    dob: isoDate.optional(),
    mrn: z.string().trim().min(1, "MRN cannot be empty").max(64).optional(),
  })
  .strict()
  .refine(
    (p) =>
      p.firstName !== undefined ||
      p.lastName !== undefined ||
      p.dob !== undefined ||
      p.mrn !== undefined,
    { message: "Nothing to update" }
  );

export async function updatePatientDemographics(
  patientId: string,
  patch: { firstName?: string; lastName?: string; dob?: string; mrn?: string }
): Promise<Result> {
  if (!uuid.safeParse(patientId).success) {
    return { success: false, error: "Invalid patient id" };
  }
  const parsed = demographicsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid patient data",
    };
  }
  const guard = await requireAdminRole();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase } = guard;

  const { data: existing } = await supabase
    .from("patients")
    .select("id, facility_id, first_name, last_name, dob, mrn")
    .eq("id", patientId)
    .maybeSingle();
  if (!existing) return { success: false, error: "Patient not found or access denied" };

  // MRN move: surface the UNIQUE(facility_id, mrn) conflict as a readable
  // error before the constraint fires.
  if (parsed.data.mrn !== undefined && parsed.data.mrn !== existing.mrn) {
    const { data: clash } = await supabase
      .from("patients")
      .select("id")
      .eq("facility_id", existing.facility_id)
      .eq("mrn", parsed.data.mrn)
      .neq("id", patientId)
      .maybeSingle();
    if (clash) {
      return {
        success: false,
        error: "A patient with this MRN already exists at this facility",
      };
    }
  }

  const update: Record<string, string> = {};
  const oldValues: Record<string, unknown> = {};
  if (parsed.data.firstName !== undefined && parsed.data.firstName !== existing.first_name) {
    update.first_name = parsed.data.firstName;
    oldValues.first_name = existing.first_name;
  }
  if (parsed.data.lastName !== undefined && parsed.data.lastName !== existing.last_name) {
    update.last_name = parsed.data.lastName;
    oldValues.last_name = existing.last_name;
  }
  if (parsed.data.dob !== undefined && parsed.data.dob !== existing.dob) {
    update.dob = parsed.data.dob;
    oldValues.dob = existing.dob;
  }
  if (parsed.data.mrn !== undefined && parsed.data.mrn !== existing.mrn) {
    update.mrn = parsed.data.mrn;
    oldValues.mrn = existing.mrn;
  }
  if (Object.keys(update).length === 0) {
    // Everything already matches — a no-op is a success, not an error.
    return { success: true };
  }

  const { error } = await supabase.from("patients").update(update).eq("id", patientId);
  if (error) {
    return {
      success: false,
      error: isUniqueViolation(error)
        ? "A patient with this MRN already exists at this facility"
        : "Update failed",
    };
  }

  void auditPhiAccess({
    action: "update",
    table: "patients",
    recordId: patientId,
    recordType: "field_patient_demographics",
    oldValues,
    newValues: update,
  });
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────
// Deactivate (chart affordance per the rebuild spec §04)
// ─────────────────────────────────────────────────────

/**
 * Soft-deactivate a patient: drops them from the directory and pickers.
 * Historical field notes remain readable through their direct routes.
 */
export async function deactivateFieldPatient(patientId: string): Promise<Result> {
  if (!uuid.safeParse(patientId).success) {
    return { success: false, error: "Invalid patient id" };
  }
  const guard = await requireAdminRole();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase } = guard;

  const { data: existing } = await supabase
    .from("patients")
    .select("id, is_active")
    .eq("id", patientId)
    .maybeSingle();
  if (!existing) return { success: false, error: "Patient not found or access denied" };

  const { error } = await supabase
    .from("patients")
    .update({ is_active: false })
    .eq("id", patientId);
  if (error) return { success: false, error: "Deactivate failed" };

  void auditPhiAccess({
    action: "update",
    table: "patients",
    recordId: patientId,
    recordType: "field_patient_deactivate",
    oldValues: { is_active: existing.is_active },
    newValues: { is_active: false },
  });
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}
