"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { auditPhiAccess } from "@/lib/audit-log";
import { COMMON_ICD10_CODES } from "@/lib/billing-codes";

// =====================================================
// Patient-level ICD-10 problem list (PMH tab)
// =====================================================
//
// This module manages the patient's *running* active diagnoses list
// (the PMH / ICD-10 tab), which is distinct from billings.icd10_codes
// (those are per-visit claim-coding selections).
//
// Backing table: patient_icd10_codes (migration 00056)
// Columns: id, patient_id, icd10_code, description, added_by,
//          added_at, is_active, notes
// Constraint: partial unique on (patient_id, icd10_code) WHERE is_active.
// Soft-delete via is_active=false preserves history (and lets us cleanly
// re-activate without violating the partial unique).
//
// TODO: Types haven't been regenerated for patient_icd10_codes yet, so
// every supabase.from('patient_icd10_codes' as never) call below is a
// boundary cast. Drop the `as never` and replace the row casts once
// `lib/database.types.ts` is regenerated.

// ---------------- Zod schemas ----------------

// ICD-10 codes are 3-7 chars: a letter, then digits, optionally a dot
// and 1-4 more alphanumerics (e.g. "E11.621", "L89.150", "T81.30XA").
const icd10CodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(8)
  .regex(/^[A-TV-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/i, {
    message: "Invalid ICD-10 code format",
  })
  .transform((s) => s.toUpperCase());

const addPatientIcd10Schema = z.object({
  patientId: z.string().uuid(),
  icd10Code: icd10CodeSchema,
  description: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const deactivateSchema = z.object({
  id: z.string().uuid(),
});

const listSchema = z.object({
  patientId: z.string().uuid(),
});

const searchSchema = z.object({
  query: z.string().trim().max(100),
});

// ---------------- Result types ----------------

export type PatientIcd10Row = {
  id: string;
  patient_id: string;
  icd10_code: string;
  description: string | null;
  added_by: string | null;
  added_at: string;
  is_active: boolean;
  notes: string | null;
};

export type Icd10SearchHit = { code: string; description: string };

// Shape of a row in patient_icd10_codes prior to type regen.
// Used purely as a boundary cast — see TODO at top of file.
type PatientIcd10RowRaw = {
  id: string;
  patient_id: string;
  icd10_code: string;
  description: string | null;
  added_by: string | null;
  added_at: string;
  is_active: boolean;
  notes: string | null;
};

// =====================================================
// addPatientIcd10
// =====================================================
//
// Adds an ICD-10 code to a patient's active problem list. If a row
// already exists for (patient_id, icd10_code) — active or inactive —
// it is reactivated and its description/notes are refreshed. This is
// the only safe way to "re-add" a previously soft-deleted code without
// hitting the partial unique index.

export async function addPatientIcd10(
  patientId: string,
  icd10Code: string,
  description?: string,
  notes?: string
) {
  try {
    const input = addPatientIcd10Schema.parse({
      patientId,
      icd10Code,
      description,
      notes,
    });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Not authenticated" };
    }

    // If the description was omitted, try to fill it from our local
    // ICD-10 catalogue so the problem list isn't blank.
    const resolvedDescription =
      input.description ??
      COMMON_ICD10_CODES.find((c) => c.code === input.icd10Code)?.description ??
      null;

    // Look up any existing row (active or inactive) for this pair.
    // We deliberately use `maybeSingle` because the row may not exist.
    // TODO: drop `as never` once database.types.ts knows patient_icd10_codes.
    const { data: existingRaw, error: fetchErr } = await supabase
      .from("patient_icd10_codes" as never)
      .select("id, is_active")
      .eq("patient_id", input.patientId)
      .eq("icd10_code", input.icd10Code)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const existing = existingRaw as { id: string; is_active: boolean } | null;

    if (existing) {
      // Reactivate (or refresh) an existing row.
      const { data: updatedRaw, error: updateErr } = await supabase
        .from("patient_icd10_codes" as never)
        .update({
          is_active: true,
          description: resolvedDescription,
          notes: input.notes ?? null,
          added_by: user.id,
          added_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      void auditPhiAccess({
        action: "update",
        table: "patient_icd10_codes",
        recordId: existing.id,
        recordType: "patient_problem_list",
        reason: existing.is_active
          ? "Refresh active ICD-10"
          : "Reactivate ICD-10",
      });

      revalidatePath(`/dashboard/patients/${input.patientId}`);

      return {
        success: true as const,
        row: updatedRaw as PatientIcd10RowRaw as PatientIcd10Row,
        reactivated: !existing.is_active,
      };
    }

    // No existing row — insert a fresh active one.
    const { data: insertedRaw, error: insertErr } = await supabase
      .from("patient_icd10_codes" as never)
      .insert({
        patient_id: input.patientId,
        icd10_code: input.icd10Code,
        description: resolvedDescription,
        notes: input.notes ?? null,
        added_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const inserted = insertedRaw as PatientIcd10RowRaw as PatientIcd10Row;

    void auditPhiAccess({
      action: "create",
      table: "patient_icd10_codes",
      recordId: inserted.id,
      recordType: "patient_problem_list",
    });

    revalidatePath(`/dashboard/patients/${input.patientId}`);

    return { success: true as const, row: inserted, reactivated: false };
  } catch (error) {
    console.error("Failed to add patient ICD-10:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to add ICD-10 code",
    };
  }
}

// =====================================================
// listActivePatientIcd10
// =====================================================
//
// Returns active diagnoses on the patient's problem list, newest first.
// RLS scopes the rows to the caller's tenant/facility — we do not
// re-check membership here.

export async function listActivePatientIcd10(patientId: string) {
  try {
    const input = listSchema.parse({ patientId });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Not authenticated", rows: [] };
    }

    // TODO: drop `as never` once database.types.ts knows patient_icd10_codes.
    const { data, error } = await supabase
      .from("patient_icd10_codes" as never)
      .select(
        "id, patient_id, icd10_code, description, added_by, added_at, is_active, notes"
      )
      .eq("patient_id", input.patientId)
      .eq("is_active", true)
      .order("added_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as PatientIcd10RowRaw[] as PatientIcd10Row[];

    void auditPhiAccess({
      action: "read",
      table: "patient_icd10_codes",
      recordId: input.patientId,
      recordType: "patient_problem_list",
    });

    return { success: true as const, rows };
  } catch (error) {
    console.error("Failed to list patient ICD-10:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to load ICD-10 list",
      rows: [],
    };
  }
}

// =====================================================
// deactivatePatientIcd10
// =====================================================
//
// Soft-deletes a row by setting is_active=false. Preserves history so
// the diagnosis can be re-activated later via addPatientIcd10 without
// losing the original added_by / added_at trail (those get refreshed
// on reactivation — see addPatientIcd10).

export async function deactivatePatientIcd10(id: string) {
  try {
    const input = deactivateSchema.parse({ id });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Not authenticated" };
    }

    // Look up the row first so we can revalidate the patient page
    // even after the update. TODO: drop `as never` after types regen.
    const { data: rowRaw, error: fetchErr } = await supabase
      .from("patient_icd10_codes" as never)
      .select("id, patient_id, is_active")
      .eq("id", input.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const row = rowRaw as {
      id: string;
      patient_id: string;
      is_active: boolean;
    } | null;

    if (!row) {
      return { success: false as const, error: "ICD-10 row not found" };
    }

    if (!row.is_active) {
      // Idempotent: already inactive.
      return { success: true as const, patientId: row.patient_id };
    }

    const { error: updateErr } = await supabase
      .from("patient_icd10_codes" as never)
      .update({ is_active: false })
      .eq("id", input.id);

    if (updateErr) throw updateErr;

    void auditPhiAccess({
      action: "delete",
      table: "patient_icd10_codes",
      recordId: input.id,
      recordType: "patient_problem_list",
      reason: "Soft delete (deactivate)",
    });

    revalidatePath(`/dashboard/patients/${row.patient_id}`);

    return { success: true as const, patientId: row.patient_id };
  } catch (error) {
    console.error("Failed to deactivate patient ICD-10:", error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to deactivate ICD-10 code",
    };
  }
}

// =====================================================
// searchIcd10Codes
// =====================================================
//
// Typeahead helper backed by the local COMMON_ICD10_CODES dataset
// from lib/billing-codes.ts. Matches case-insensitively on either the
// code or the description. Returns at most 20 hits.
//
// This is a pure utility — no Supabase, no audit, no auth. Kept here
// so the PMH UI has a single import surface for everything ICD-10.

export async function searchIcd10Codes(
  query: string
): Promise<Icd10SearchHit[]> {
  const { query: q } = searchSchema.parse({ query });
  if (q.length === 0) return [];

  const needle = q.toLowerCase();
  const hits: Icd10SearchHit[] = [];

  for (const entry of COMMON_ICD10_CODES) {
    if (
      entry.code.toLowerCase().includes(needle) ||
      entry.description.toLowerCase().includes(needle)
    ) {
      hits.push({ code: entry.code, description: entry.description });
      if (hits.length >= 20) break;
    }
  }

  return hits;
}
