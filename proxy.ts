import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";

// Admin routes that require specific roles
const ADMIN_ROUTES = ["/dashboard/admin"];
const TENANT_ADMIN_ROUTES = [
  "/dashboard/admin/facilities", // Only tenant admins can manage facilities
  "/dashboard/admin/signatures", // Signature audit log (tenant-wide PHI access)
  "/dashboard/admin/transcripts", // AI transcripts management (tenant-wide PHI)
];
const SHARED_ADMIN_ROUTES = [
  "/dashboard/admin/users", // Both tenant_admin and facility_admin can manage users
  "/dashboard/admin/invites", // Both tenant_admin and facility_admin can access
  "/dashboard/admin/inbox", // Office inbox — facility admins handle their own facility
  "/dashboard/admin/agencies", // Home Health Agencies — both admin tiers can curate
];

// Operations-surface-only routes. A clinician with no admin entitlement
// (i.e. not tenant_admin / facility_admin and not holding the "Admin"
// credential) should never reach these — even via a stale link or bookmark.
// See docs/PROJECT_PLAN.md §7.1 (R-007, R-008).
const ADMIN_SURFACE_ROUTES = ["/dashboard/billing", "/dashboard/reports"];

export async function proxy(request: NextRequest) {
  // Update Supabase session
  const response = await updateSession(request);

  // Check if accessing admin routes
  const pathname = request.nextUrl.pathname;

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminSurfaceRoute = ADMIN_SURFACE_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isAdminRoute || isAdminSurfaceRoute) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not authenticated, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get user role using RPC to avoid RLS recursion
    const { data: userRoleData, error: roleError } = await supabase.rpc(
      "get_user_role_info",
      { user_uuid: user.id }
    );

    if (roleError || !userRoleData || userRoleData.length === 0) {
      // No role assigned, redirect to dashboard with error
      return NextResponse.redirect(
        new URL("/dashboard?error=no_role", request.url)
      );
    }

    const userRole = userRoleData[0];
    const roleName: string = userRole.role;

    // Look up the user's credential to compute admin entitlement.
    // (Credentials live on `users`, not `user_roles`.)
    let credentials: string | null = null;
    if (isAdminSurfaceRoute) {
      const { data: userRow } = await supabase
        .from("users")
        .select("credentials")
        .eq("id", user.id)
        .single();
      credentials = (userRow?.credentials as string | null) ?? null;
    }

    const hasAdminEntitlement =
      roleName === "tenant_admin" ||
      roleName === "facility_admin" ||
      credentials === "Admin";

    // Operations-surface routes (billing, reports): require admin entitlement.
    if (isAdminSurfaceRoute && !hasAdminEntitlement) {
      return NextResponse.redirect(
        new URL("/dashboard?error=insufficient_permissions", request.url)
      );
    }

    if (isAdminRoute) {
      // Tenant admin only routes
      if (
        TENANT_ADMIN_ROUTES.some((route) => pathname.startsWith(route)) &&
        roleName !== "tenant_admin"
      ) {
        return NextResponse.redirect(
          new URL("/dashboard?error=insufficient_permissions", request.url)
        );
      }

      // Shared admin routes (both tenant_admin and facility_admin)
      if (
        SHARED_ADMIN_ROUTES.some((route) => pathname.startsWith(route)) &&
        roleName !== "tenant_admin" &&
        roleName !== "facility_admin"
      ) {
        return NextResponse.redirect(
          new URL("/dashboard?error=insufficient_permissions", request.url)
        );
      }

      // Catch-all: anyone hitting /dashboard/admin/** must have an admin role.
      if (roleName !== "tenant_admin" && roleName !== "facility_admin") {
        return NextResponse.redirect(
          new URL("/dashboard?error=insufficient_permissions", request.url)
        );
      }
    }
  }

  return response;
}

// Export as default as well for Next.js compatibility
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
