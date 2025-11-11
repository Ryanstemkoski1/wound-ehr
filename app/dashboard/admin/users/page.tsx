import { redirect } from "next/navigation";
import { isAdmin, getUserRole } from "@/lib/rbac";
import { getTenantUsers } from "@/app/actions/admin";
import { getUserFacilities } from "@/app/actions/facilities";
import { UsersManagementClient } from "@/components/admin/users-management-client";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const currentRole = await getUserRole();
  const [{ data: users, error }, facilities] = await Promise.all([
    getTenantUsers(),
    getUserFacilities(),
  ]);

  if (error || !users) {
    return (
      <div className="p-6">
        <DynamicBreadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin" },
            { label: "Users" },
          ]}
        />
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-900 dark:bg-red-900/20 dark:text-red-200">
          <p>Failed to load users: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Users" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage users and their roles in your organization
        </p>
      </div>

      <UsersManagementClient
        users={users}
        currentUserRole={currentRole?.role || "user"}
        facilities={facilities}
      />
    </div>
  );
}
