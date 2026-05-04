import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIncidentReport } from "@/app/actions/new-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import { AlertTriangle, ArrowLeft, Calendar, MapPin, User } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type Params = Promise<{ reportId: string }>;

export default async function IncidentDetailPage({
  params,
}: {
  params: Params;
}) {
  const { reportId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const incident = await getIncidentReport(reportId);
  if (!incident) notFound();

  // Get facility name
  let facilityName: string | null = null;
  if (incident.facility_id) {
    const { data: facility } = await supabase
      .from("facilities")
      .select("name")
      .eq("id", incident.facility_id)
      .maybeSingle();
    facilityName = facility?.name ?? null;
  }

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Incidents", href: "/dashboard/incidents" },
          { label: "Report Detail" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Incidents
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-3 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Incident Report</h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(incident.report_date), "MMMM d, yyyy")}
              {incident.report_time &&
                ` at ${incident.report_time.slice(0, 5)}`}
            </p>
          </div>
        </div>
        {incident.signature_id ? (
          <Badge className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Signed
          </Badge>
        ) : (
          <Badge variant="secondary">Unsigned</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incident Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Incident Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>
                {format(new Date(incident.report_date), "MMM d, yyyy")}
              </span>
            </div>
            {incident.report_time && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span>{incident.report_time.slice(0, 5)}</span>
              </div>
            )}
            {incident.incident_location && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground flex shrink-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Location
                </span>
                <span className="text-right">{incident.incident_location}</span>
              </div>
            )}
            {facilityName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facility</span>
                <span>{facilityName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{incident.employee_name}</span>
            </div>
            {incident.employee_role && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <span>{incident.employee_role}</span>
              </div>
            )}
            {incident.employee_contact && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span>{incident.employee_contact}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient (if applicable) */}
        {(incident.patient_name || incident.patient_id) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {incident.patient_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>
                    {incident.patient_id ? (
                      <Link
                        href={`/dashboard/patients/${incident.patient_id}`}
                        className="hover:underline"
                      >
                        {incident.patient_name}
                      </Link>
                    ) : (
                      incident.patient_name
                    )}
                  </span>
                </div>
              )}
              {incident.patient_dob && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DOB</span>
                  <span>
                    {format(new Date(incident.patient_dob), "MM/dd/yyyy")}
                  </span>
                </div>
              )}
              {incident.patient_facility_agency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facility/Agency</span>
                  <span>{incident.patient_facility_agency}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Description + Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Incident Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {incident.description}
            </p>
          </CardContent>
        </Card>

        {incident.immediate_actions && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Immediate Actions Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {incident.immediate_actions}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
