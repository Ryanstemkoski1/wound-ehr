import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/rbac";
import FacilityForm from "@/components/facilities/facility-form";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditFacilityPage({
  params,
}: {
  params: Params;
}) {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: facility, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !facility) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs />
      <FacilityForm facility={facility} />
    </div>
  );
}
