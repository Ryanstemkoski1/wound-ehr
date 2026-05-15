import { redirect, notFound } from "next/navigation";
import { isAdmin, requireFacilityAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { listServiceLocations } from "@/app/actions/service-locations";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import { ServiceLocationsClient } from "@/components/admin/service-locations-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function FacilityServiceLocationsPage({
  params,
}: {
  params: Params;
}) {
  const { id: facilityId } = await params;

  const hasAccess = await isAdmin();
  if (!hasAccess) redirect("/dashboard");

  // Throws (caught by error boundary) if user doesn't have facility access.
  try {
    await requireFacilityAccess(facilityId);
  } catch {
    redirect("/dashboard?error=insufficient_permissions");
  }

  const supabase = await createClient();
  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("id", facilityId)
    .maybeSingle();

  if (!facility) notFound();

  const result = await listServiceLocations(facilityId, {
    includeInactive: true,
  });
  const locations = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Facilities", href: "/dashboard/admin/facilities" },
          { label: facility.name },
          { label: "Service Locations" },
        ]}
      />

      <div className="page-hero">
        <h1 className="text-3xl font-bold tracking-tight">Service Locations</h1>
        <p className="text-muted-foreground mt-1">
          Named visit locations at {facility.name} (e.g. &ldquo;Wound Clinic
          Suite A&rdquo;, &ldquo;Patient Room&rdquo;, &ldquo;Telehealth&rdquo;).
          These appear in the New Visit dropdown.
        </p>
      </div>

      <ServiceLocationsClient
        facilityId={facilityId}
        initialLocations={locations}
      />
    </div>
  );
}
