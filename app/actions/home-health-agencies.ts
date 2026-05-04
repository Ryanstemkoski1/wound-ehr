// Server actions for Home Health Agencies.
// Backed by table introduced in supabase/migrations/00041_home_health_agencies.sql.
//
// Tenant-scoped. RLS contract:
//   - SELECT: any user in the tenant
//   - WRITE:  tenant_admin or facility_admin in the tenant

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, requireAdmin } from "@/lib/rbac";

export type HomeHealthAgency = {
  id: string;
  tenant_id: string;
  name: string;
  npi: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const hhaSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  npi: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9]{6,15}$/.test(v), {
      message: "NPI must be 6-15 digits",
    }),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  fax: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().max(160).email().optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

const TABLE = "home_health_agencies" as const;

export async function listHomeHealthAgencies(
  options: { includeInactive?: boolean } = {}
): Promise<ActionResult<HomeHealthAgency[]>> {
  try {
    const role = await getUserRole();
    if (!role?.tenant_id) {
      return { success: false, error: "No tenant on file" };
    }
    const supabase = await createClient();

    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("tenant_id", role.tenant_id)
      .order("name", { ascending: true });

    if (!options.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data ?? []) as HomeHealthAgency[] };
  } catch (err) {
    return errorResult(err, "Failed to load home health agencies");
  }
}

export async function createHomeHealthAgency(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const role = await getUserRole();
    if (!role?.tenant_id) {
      return { success: false, error: "No tenant on file" };
    }

    const parsed = parseFormData(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: role.tenant_id,
        ...emptyToNull(parsed.data),
        name: parsed.data.name,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin/agencies");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return errorResult(err, "Failed to create home health agency");
  }
}

export async function updateHomeHealthAgency(
  agencyId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = parseFormData(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE)
      .update(emptyToNull(parsed.data))
      .eq("id", agencyId);

    if (error) throw error;

    revalidatePath("/dashboard/admin/agencies");
    return { success: true };
  } catch (err) {
    return errorResult(err, "Failed to update home health agency");
  }
}

export async function setHomeHealthAgencyActive(
  agencyId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE)
      .update({ is_active: isActive })
      .eq("id", agencyId);

    if (error) throw error;

    revalidatePath("/dashboard/admin/agencies");
    return { success: true };
  } catch (err) {
    return errorResult(err, "Failed to update home health agency");
  }
}

function parseFormData(formData: FormData) {
  return hhaSchema.safeParse({
    name: formData.get("name") ?? "",
    npi: formData.get("npi") ?? "",
    phone: formData.get("phone") ?? "",
    fax: formData.get("fax") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    zip: formData.get("zip") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

function emptyToNull<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out;
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
  if (msg.toLowerCase().includes("unauthorized")) {
    return { success: false, error: "You don't have permission to do that" };
  }
  return { success: false, error: msg };
}
