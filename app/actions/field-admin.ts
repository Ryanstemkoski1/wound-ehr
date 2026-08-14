"use server";

// =====================================================
// Field Ops — admin-surface reads (/admin)
// =====================================================
// Small, admin-gated reads that back the Users page. User
// provisioning itself (invite / role change / removal) reuses the
// existing actions in app/actions/admin.ts — this file only adds
// the field-surface context those flows need:
//
//   getOpenNoteCountsByNurse  — "does this nurse still have open
//     work?" check preloaded by the page for the deactivate flow.
//   getUserFacilityAssignments — facility names per user for the
//     Users table (user_facilities is self-SELECT-only at RLS, so
//     this read uses the service client AFTER the admin gate — the
//     same pattern app/actions/admin.ts already uses).

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole, type UserRoleData } from "@/lib/rbac";
import { isOfficeAdmin } from "@/lib/field-note/server-helpers";
import { EDITABLE_VISIT_STATUSES } from "@/lib/field-note/logic";

type Result<T = Record<string, never>> =
  | ({ success: true } & T)
  | { success: false; error: string };

async function requireOfficeAdmin(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: UserRoleData }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const role = await getUserRole();
  if (!role || !isOfficeAdmin(role)) return { error: "Admin access required" };
  return { supabase, userId: user.id, role };
}

/**
 * Open field notes per nurse: visits in scheduled / in-progress /
 * needs_correction, restricted to field visits by construction (the
 * query starts from field_notes, so legacy visits never count).
 * Keyed by visits.clinician_id (auth user id).
 */
export async function getOpenNoteCountsByNurse(): Promise<
  Result<{ counts: Record<string, number> }>
> {
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("field_notes")
    .select("id, visits!field_notes_visit_id_fkey ( clinician_id, status )")
    .in("visits.status", [...EDITABLE_VISIT_STATUSES]);
  if (error) return { success: false, error: "Failed to load open-note counts" };

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as {
    visits: { clinician_id: string | null; status: string } | null;
  }[]) {
    const visit = row.visits;
    // The embedded status filter nulls non-matching joins rather than
    // dropping parent rows — re-check both presence and status here.
    if (!visit?.clinician_id) continue;
    if (!(EDITABLE_VISIT_STATUSES as string[]).includes(visit.status)) continue;
    counts[visit.clinician_id] = (counts[visit.clinician_id] ?? 0) + 1;
  }
  return { success: true, counts };
}

/**
 * Facility names per user for the Users table.
 *
 * user_facilities keeps a self-only SELECT policy (00046), so an admin
 * cannot read other users' rows through the RLS client. After the
 * explicit admin gate this read goes through the service client —
 * mirroring how app/actions/admin.ts reads user_facilities for its
 * facility-scope checks. Results are scoped to the caller's tenant
 * (tenant admins) or the caller's own facility (facility admins).
 */
export async function getUserFacilityAssignments(): Promise<
  Result<{ byUser: Record<string, string[]> }>
> {
  const guard = await requireOfficeAdmin();
  if ("error" in guard) return { success: false, error: guard.error };
  const { role } = guard;

  const serviceClient = createServiceClient();
  let query = serviceClient
    .from("user_facilities")
    .select("user_id, facilities!inner ( id, name, tenant_id )")
    .eq("facilities.tenant_id", role.tenant_id);
  if (role.role === "facility_admin" && role.facility_id) {
    query = query.eq("facility_id", role.facility_id);
  }
  const { data, error } = await query;
  if (error) return { success: false, error: "Failed to load facility assignments" };

  const byUser: Record<string, string[]> = {};
  for (const row of (data ?? []) as unknown as {
    user_id: string;
    facilities: { id: string; name: string; tenant_id: string | null } | null;
  }[]) {
    if (!row.facilities) continue;
    (byUser[row.user_id] ??= []).push(row.facilities.name);
  }
  for (const key of Object.keys(byUser)) byUser[key].sort((a, b) => a.localeCompare(b));
  return { success: true, byUser };
}
