// Server actions for Service Locations (per-facility named visit locations).
// Backed by table introduced in supabase/migrations/00038_service_locations.sql.
//
// RLS contract (DB-enforced):
//   - SELECT: any user assigned to the facility via user_facilities
//   - WRITE:  tenant_admin or facility_admin in the facility's tenant
//
// Server-action layer additionally enforces facility-access on writes via
// requireFacilityAccess() so we get a clean error message before hitting RLS.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireFacilityAccess, requireAdmin } from "@/lib/rbac";

export type ServiceLocation = {
  id: string;
  facility_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const serviceLocationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z.coerce.boolean().default(true),
});

type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

const TABLE = "service_locations" as const;

export async function listServiceLocations(
  facilityId: string,
  options: { includeInactive?: boolean } = {}
): Promise<ActionResult<ServiceLocation[]>> {
  try {
    await requireFacilityAccess(facilityId);
    const supabase = await createClient();

    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("facility_id", facilityId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!options.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data ?? []) as ServiceLocation[] };
  } catch (err) {
    return errorResult(err, "Failed to load service locations");
  }
}

export async function createServiceLocation(
  facilityId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    await requireFacilityAccess(facilityId);

    const parsed = serviceLocationSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      sort_order: formData.get("sort_order") ?? 0,
      is_active: true,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        facility_id: facilityId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/admin/facilities/${facilityId}/locations`);
    return {
      success: true,
      data: { id: data.id },
    };
  } catch (err) {
    return errorResult(err, "Failed to create service location");
  }
}

export async function updateServiceLocation(
  facilityId: string,
  locationId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await requireFacilityAccess(facilityId);

    const parsed = serviceLocationSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      sort_order: formData.get("sort_order") ?? 0,
      is_active: formData.get("is_active") ?? true,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE)
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      })
      .eq("id", locationId)
      .eq("facility_id", facilityId);

    if (error) throw error;

    revalidatePath(`/dashboard/admin/facilities/${facilityId}/locations`);
    return { success: true };
  } catch (err) {
    return errorResult(err, "Failed to update service location");
  }
}

export async function setServiceLocationActive(
  facilityId: string,
  locationId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await requireFacilityAccess(facilityId);

    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE)
      .update({ is_active: isActive })
      .eq("id", locationId)
      .eq("facility_id", facilityId);

    if (error) throw error;

    revalidatePath(`/dashboard/admin/facilities/${facilityId}/locations`);
    return { success: true };
  } catch (err) {
    return errorResult(err, "Failed to update service location");
  }
}

function errorResult(
  err: unknown,
  fallback: string
): { success: false; error: string } {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : fallback;
  // Don't leak raw DB errors back to the client.
  if (msg.toLowerCase().includes("unauthorized")) {
    return { success: false, error: "You don't have permission to do that" };
  }
  return { success: false, error: msg };
}
