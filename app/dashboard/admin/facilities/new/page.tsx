import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";
import FacilityForm from "@/components/facilities/facility-form";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewFacilityPage() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumbs />
      <FacilityForm />
    </div>
  );
}
