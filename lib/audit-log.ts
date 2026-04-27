// HIPAA PHI access audit logger
//
// Wraps the public.log_phi_access() RPC. Every call is fire-and-forget:
// audit failures NEVER break a PHI read. The DB function still runs
// inside the user's RLS context (SECURITY DEFINER but auth.uid() = caller),
// so logged user_id is always the genuine session user.
//
// Usage:
//   import { auditPhiAccess } from "@/lib/audit-log";
//   await auditPhiAccess({ action: "read", table: "patients", recordId: id });

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuditAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "print"
  | "sign"
  | "consent"
  | "audit_query";

export type AuditEntry = {
  action: AuditAction;
  table: string;
  recordId?: string | null;
  recordType?: string | null;
  reason?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
};

/**
 * Best-effort PHI access logger. Never throws.
 * Resolves the caller's tenant_id from user_roles when available
 * and forwards inbound IP / UA headers for the audit row.
 */
export async function auditPhiAccess(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Best-effort tenant lookup; null is fine.
    let tenantId: string | null = null;
    try {
      const { data: role } = await supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      tenantId = role?.tenant_id ?? null;
    } catch {
      tenantId = null;
    }

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const h = await headers();
      const xff = h.get("x-forwarded-for");
      ip =
        xff?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        h.get("cf-connecting-ip") ||
        null;
      ua = h.get("user-agent") || null;
    } catch {
      /* headers() not available outside request scope */
    }

    await supabase.rpc("log_phi_access", {
      p_action: entry.action,
      p_table_name: entry.table,
      p_record_id: entry.recordId ?? null,
      p_record_type: entry.recordType ?? null,
      p_old_values: entry.oldValues ?? null,
      p_new_values: entry.newValues ?? null,
      p_reason: entry.reason ?? null,
      p_ip_address: ip,
      p_user_agent: ua,
      p_tenant_id: tenantId,
    });
  } catch (err) {
    // Never break a PHI operation because of audit failure.
    // Just surface to server logs.
    console.error("[audit] log_phi_access failed:", err);
  }
}
