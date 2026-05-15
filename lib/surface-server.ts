import "server-only";

import { cookies } from "next/headers";
import type { UserRole } from "@/lib/rbac";
import type { Credentials } from "@/lib/credentials";
import {
  SURFACE_COOKIE_NAME,
  getDefaultSurface,
  getSurfaceEntitlements,
  type Surface,
} from "@/lib/surface";

/**
 * Read the active surface from the request cookie, falling back to the user's
 * default. Always returns a surface the user is actually entitled to (defends
 * against a stale cookie after a role change).
 *
 * Server-only: lives in its own module so client components can safely import
 * the rest of `lib/surface` (labels, types, pure helpers) without pulling in
 * `next/headers`.
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
