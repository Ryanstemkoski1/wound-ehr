import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import IncidentReportForm from "@/components/forms/incident-report-form";

export const dynamic = "force-dynamic";

export default async function IncidentReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile (users table has name + credentials, not first_name/last_name/role)
  const { data: profile } = await supabase
    .from("users")
    .select("name, credentials")
    .eq("id", user.id)
    .single();

  // Get user's first facility
  const { data: facilityAssoc } = await supabase
    .from("user_facilities")
    .select("facility_id, facilities(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const employeeName = profile?.name || "";
  const employeeRole = profile?.credentials || "";
  const facilityId = facilityAssoc?.facility_id || "";

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Incidents", href: "/dashboard/incidents" },
          { label: "New Report" },
        ]}
      />

      <div className="page-hero flex items-start gap-4">
        <div className="rounded-xl bg-amber-100 p-3 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-800">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            New Incident Report
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Document workplace incidents, near-misses, or safety concerns.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <IncidentReportForm
            facilityId={facilityId}
            userId={user.id}
            employeeName={employeeName}
            employeeRole={employeeRole}
          />
        </CardContent>
      </Card>
    </div>
  );
}
