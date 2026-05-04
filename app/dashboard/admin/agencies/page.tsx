import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";
import { listHomeHealthAgencies } from "@/app/actions/home-health-agencies";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import { HomeHealthAgenciesClient } from "@/components/admin/home-health-agencies-client";

export const dynamic = "force-dynamic";

export default async function AdminHomeHealthAgenciesPage() {
  const hasAccess = await isAdmin();
  if (!hasAccess) redirect("/dashboard");

  const result = await listHomeHealthAgencies({ includeInactive: true });
  const agencies = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Home Health Agencies" },
        ]}
      />

      <div className="page-hero">
        <h1 className="text-3xl font-bold tracking-tight">
          Home Health Agencies
        </h1>
        <p className="text-muted-foreground mt-1">
          Partner agencies your patients receive home health services from.
        </p>
      </div>

      <HomeHealthAgenciesClient initialAgencies={agencies} />
    </div>
  );
}
