import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";
import { getPendingInvites } from "@/app/actions/admin";
import { getUserFacilities } from "@/app/actions/facilities";
import { InvitesManagementClient } from "@/components/admin/invites-management-client";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const [invitesResult, facilities] = await Promise.all([
    getPendingInvites(),
    getUserFacilities(),
  ]);

  if (invitesResult.error) {
    return (
      <div>
        <DynamicBreadcrumbs
          customSegments={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin" },
            { label: "Invites" },
          ]}
        />
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-900 dark:bg-red-900/20 dark:text-red-200">
          <p>Failed to load invites: {invitesResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Invites" },
        ]}
      />

      <div className="page-hero">
        <h1 className="text-3xl font-bold tracking-tight">User Invites</h1>
        <p className="text-muted-foreground mt-1">
          Invite new users to join your organization
        </p>
      </div>

      <InvitesManagementClient
        invites={invitesResult.data || []}
        facilities={facilities}
      />
    </div>
  );
}
