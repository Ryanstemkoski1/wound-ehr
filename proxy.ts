import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";

// Admin routes that require specific roles
const ADMIN_ROUTES = ["/dashboard/admin"];
const TENANT_ADMIN_ROUTES = [
  "/dashboard/admin/users",
  "/dashboard/admin/facilities",
];
const SHARED_ADMIN_ROUTES = [
  "/dashboard/admin/invites", // Both tenant_admin and facility_admin can access
];

export async function proxy(request: NextRequest) {
  // Update Supabase session
  const response = await updateSession(request);

  // Check if accessing admin routes
  const pathname = request.nextUrl.pathname;

  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not authenticated, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get user role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole) {
      // No role assigned, redirect to dashboard with error
      return NextResponse.redirect(
        new URL("/dashboard?error=no_role", request.url)
      );
    }

    // Check if user has required role for specific routes
    // Tenant admin only routes
    if (
      TENANT_ADMIN_ROUTES.some((route) => pathname.startsWith(route)) &&
      userRole.role !== "tenant_admin"
    ) {
      // Insufficient permissions
      return NextResponse.redirect(
        new URL("/dashboard?error=insufficient_permissions", request.url)
      );
    }

    // Shared admin routes (both tenant_admin and facility_admin)
    if (
      SHARED_ADMIN_ROUTES.some((route) => pathname.startsWith(route)) &&
      userRole.role !== "tenant_admin" &&
      userRole.role !== "facility_admin"
    ) {
      return NextResponse.redirect(
        new URL("/dashboard?error=insufficient_permissions", request.url)
      );
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
