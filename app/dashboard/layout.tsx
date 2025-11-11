import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";
import { getUserRole, type UserRole } from "@/lib/rbac";

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

  // Get user role for RBAC
  const roleData = await getUserRole();
  const userRole: UserRole | null = roleData?.role || null;

  return (
    <DashboardLayoutClient user={user} userRole={userRole}>
      {children}
    </DashboardLayoutClient>
  );
}
