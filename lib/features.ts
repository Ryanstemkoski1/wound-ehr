// Tenant feature flag helpers.
//
// Backed by the `tenant_features` table (migration 00043). Server-side only —
// gates should be evaluated in server actions / RSC, never trusted from the
// client.
//
// Usage:
//   const enabled = await isTenantFeatureEnabled("require_consent_for_billing");
//   if (enabled) { ... }
//
// Flags are read on demand. Caching is left to React's per-request memoization
// (callers that need the same flag in multiple components within one request
// should wrap in `cache()` themselves — most pages only check 1-2 flags).

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";

export type TenantFeatureFlag =
  // Phase 2 — billing block when consent missing
  | "require_consent_for_billing"
  // Phase 5 — copy-forward defaults
  | "copy_forward_defaults_enabled"
  // Phase 5 — batch print (PDF combiner)
  | "batch_print_enabled"
  // Phase 6 — internal staff Google Chat spike
  | "chat_spike_enabled"
  // Phase 3 — opt-in WoundNote-style clinical UX (collapsible cards,
  // wound rail, attestation overlay, E/M sub-sections). Off by default
  // so existing tenants keep the legacy assessment UI until they opt in.
  | "clinical_ux_v2";

type Row = { enabled: boolean; payload: unknown };

/**
 * Return true if the named flag is enabled for the current user's tenant.
 * Returns false on any error (fail-closed) — callers should treat absent flags
 * as disabled.
 */
export async function isTenantFeatureEnabled(
  flag: TenantFeatureFlag
): Promise<boolean> {
  const row = await getTenantFeature(flag);
  return row?.enabled === true;
}

/**
 * Return the raw flag row (enabled + payload) for the current user's tenant,
 * or null if no row exists.
 */
export async function getTenantFeature(
  flag: TenantFeatureFlag
): Promise<Row | null> {
  const role = await getUserRole();
  if (!role?.tenant_id) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_features")
    .select("enabled, payload")
    .eq("tenant_id", role.tenant_id)
    .eq("flag", flag)
    .maybeSingle();

  if (error || !data) return null;
  return data as Row;
}
