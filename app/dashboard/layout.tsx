import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";
import { getUserRole, getUserCredentials, type UserRole } from "@/lib/rbac";
import {
  getActiveSurface,
  getSurfaceEntitlements,
  type Surface,
} from "@/lib/surface";
import { isTenantFeatureEnabled } from "@/lib/features";
import { getTodayUnsignedCount } from "@/app/actions/visits";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const roleData = await getUserRole();
  const userRole: UserRole | null = roleData?.role || null;
  const credentials = await getUserCredentials();

  const entitlements = getSurfaceEntitlements(userRole, credentials);
  const activeSurface =
    (await getActiveSurface(userRole, credentials)) ??
    // Fallback for users with no entitlements yet (newly invited, no role/cred):
    // give them a clinical shell so they don't see ops chrome they can't use.
    ("clinical" as Surface);

  // Defensive: if a user somehow has no entitlements at all, still pass an
  // empty entitlements list so the switcher hides itself.
  const safeEntitlements =
    entitlements.length > 0 ? entitlements : ["clinical" as Surface];

  const clinicalUxV2 = await isTenantFeatureEnabled("clinical_ux_v2");
  const todayUnsignedCount =
    activeSurface === "clinical" ? await getTodayUnsignedCount() : 0;

  return (
    <DashboardLayoutClient
      user={user}
      userRole={userRole}
      surface={activeSurface}
      entitlements={safeEntitlements}
      clinicalUxV2={clinicalUxV2}
      todayUnsignedCount={todayUnsignedCount}
    >
      {children}
    </DashboardLayoutClient>
  );
}
