// Surface entitlements: which top-level UX shell ("Admin" vs "Clinical")
// a given user is allowed to use.
//
// Per the WoundNote phase plan (docs/PROJECT_PLAN.md §7.1), the active surface
// is derived from a user's existing role + credentials — we do NOT introduce a
// third role tier. Dual-surface users (Tenant Admin, anyone holding both an
// admin role and a clinical credential) get a surface switcher in the top nav.

import { cookies } from "next/headers";
import type { UserRole } from "@/lib/rbac";
import type { Credentials } from "@/lib/credentials";

export type Surface = "admin" | "clinical";

export const SURFACE_COOKIE_NAME = "wn_surface";

const CLINICAL_CREDENTIALS: Credentials[] = [
  "MD",
  "DO",
  "PA",
  "NP",
  "RN",
  "LVN",
  "CNA",
];

/**
 * Compute which surfaces a user is entitled to.
 *
 * Rules:
 *  - Admin surface: any admin role (`tenant_admin` or `facility_admin`) OR
 *    `Admin` credential.
 *  - Clinical surface: any clinical credential (MD/DO/PA/NP/RN/LVN/CNA).
 *  - Tenant admins always have BOTH surfaces (they oversee everything).
 *
 * Returns surfaces in display priority order. The first entry is the natural
 * default for a fresh login.
 */
export function getSurfaceEntitlements(
  role: UserRole | null,
  credentials: Credentials | null
): Surface[] {
  const surfaces = new Set<Surface>();

  if (
    role === "tenant_admin" ||
    role === "facility_admin" ||
    credentials === "Admin"
  ) {
    surfaces.add("admin");
  }

  if (credentials && CLINICAL_CREDENTIALS.includes(credentials)) {
    surfaces.add("clinical");
  }

  // Tenant admins always have full clinical access too.
  if (role === "tenant_admin") {
    surfaces.add("clinical");
  }

  // Stable order: admin first (operations-heavy default), then clinical.
  const ordered: Surface[] = [];
  if (surfaces.has("admin")) ordered.push("admin");
  if (surfaces.has("clinical")) ordered.push("clinical");
  return ordered;
}

/**
 * Pick the default surface for a user with no cookie set yet.
 *
 * Heuristic: a clinical-only user (no admin role, no Admin credential) lands
 * on the clinical surface; everyone else lands on admin. This matches the
 * spirit of the 4/27 meeting: clinicians should never see admin clutter on
 * first login, and operations staff should never see clinical clutter.
 */
export function getDefaultSurface(
  role: UserRole | null,
  credentials: Credentials | null
): Surface | null {
  const entitlements = getSurfaceEntitlements(role, credentials);
  if (entitlements.length === 0) return null;

  const isAdminOnly = entitlements.length === 1 && entitlements[0] === "admin";
  const isClinicalOnly =
    entitlements.length === 1 && entitlements[0] === "clinical";

  if (isAdminOnly) return "admin";
  if (isClinicalOnly) return "clinical";

  // Dual-surface user. If they hold a clinical credential (e.g. Dr. May,
  // Erin RN), default to clinical so a fresh login lands them in the place
  // they actually do most of their day-to-day work. Tenant admins with the
  // synthetic "Admin" credential or no clinical credential default to admin.
  if (credentials && CLINICAL_CREDENTIALS.includes(credentials)) {
    return "clinical";
  }
  return "admin";
}

/**
 * Read the active surface from the request cookie, falling back to the user's
 * default. Always returns a surface the user is actually entitled to (defends
 * against a stale cookie after a role change).
 */
export async function getActiveSurface(
  role: UserRole | null,
  credentials: Credentials | null
): Promise<Surface | null> {
  const entitlements = getSurfaceEntitlements(role, credentials);
  if (entitlements.length === 0) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(SURFACE_COOKIE_NAME)?.value;

  if (raw === "admin" || raw === "clinical") {
    if (entitlements.includes(raw)) return raw;
  }

  return getDefaultSurface(role, credentials);
}

/**
 * Convenience: does this entitlement set warrant rendering a surface switcher?
 */
export function canSwitchSurface(entitlements: Surface[]): boolean {
  return entitlements.length > 1;
}

export const SURFACE_LABELS: Record<Surface, string> = {
  admin: "Operations",
  clinical: "Clinical",
};

export const SURFACE_DESCRIPTIONS: Record<Surface, string> = {
  admin: "Scheduling, intake, billing, reports, admin",
  clinical: "Your patients, visits, wounds, notes",
};
