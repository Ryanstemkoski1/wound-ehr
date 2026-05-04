"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getUserCredentials } from "@/lib/rbac";
import {
  SURFACE_COOKIE_NAME,
  getSurfaceEntitlements,
  type Surface,
} from "@/lib/surface";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Switch the active surface (Operations vs Clinical) for the current user.
 *
 * Validates that the user is actually entitled to the requested surface
 * before persisting the cookie. Does not re-authenticate.
 */
export async function setActiveSurface(
  surface: Surface
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Defend against unauthenticated callers — the surface cookie should never
  // be set without a known user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const roleData = await getUserRole();
  const credentials = await getUserCredentials();
  const entitlements = getSurfaceEntitlements(
    roleData?.role ?? null,
    credentials
  );

  if (!entitlements.includes(surface)) {
    return { ok: false, error: "Not entitled to this surface" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SURFACE_COOKIE_NAME, surface, {
    httpOnly: false, // readable from client for hydration
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  // Refresh the dashboard tree so the sidebar/header pick up the new surface.
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
