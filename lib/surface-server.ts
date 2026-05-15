// Server-only entry point for the surface module. Anything that touches
// `next/headers` must live here — Next.js refuses to bundle that import
// into a client component, so keeping it out of `lib/surface.ts` lets
// the pure logic (types, labels, entitlements) be shared with client code.

import { cookies } from "next/headers";
import type { UserRole } from "@/lib/rbac";
import type { Credentials } from "@/lib/credentials";
import {
  SURFACE_COOKIE_NAME,
  getSurfaceEntitlements,
  getDefaultSurface,
  type Surface,
} from "@/lib/surface";

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
