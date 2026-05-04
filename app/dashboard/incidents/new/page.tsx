import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
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

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/incidents"
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Incidents
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Incident Report
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Document any workplace incident, near-miss, or safety concern.
          </p>
        </CardHeader>
        <CardContent>
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
