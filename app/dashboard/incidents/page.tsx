import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIncidentReports } from "@/app/actions/new-forms";
import { getUserFacilities } from "@/app/actions/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import { AlertTriangle, Plus, FileText } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch incidents for all user facilities + facility list for display
  const [incidents, facilities] = await Promise.all([
    getIncidentReports(),
    getUserFacilities(),
  ]);

  const facilityMap = new Map(
    facilities.map((f: { id: string; name: string }) => [f.id, f.name])
  );

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs customSegments={[{ label: "Incidents" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Incident Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Document and track workplace incidents, near-misses, and safety
            concerns.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/incidents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Incident
          </Link>
        </Button>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <AlertTriangle className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">
              No incidents on record
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Document a new incident report when a safety event occurs.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/incidents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create First Incident Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <Card
              key={incident.id}
              className="group transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-100 p-2.5 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {incident.incident_location
                          ? `Incident at ${incident.incident_location}`
                          : "Incident Report"}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {format(new Date(incident.report_date), "MMMM d, yyyy")}
                        {incident.report_time &&
                          ` at ${incident.report_time.slice(0, 5)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {incident.facility_id && (
                      <Badge variant="outline" className="text-xs">
                        {facilityMap.get(incident.facility_id) ?? "Facility"}
                      </Badge>
                    )}
                    {incident.signature_id ? (
                      <Badge className="border-emerald-300 bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Unsigned
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground font-medium">
                      Employee:{" "}
                    </span>
                    <span>
                      {incident.employee_name}
                      {incident.employee_role && ` (${incident.employee_role})`}
                    </span>
                  </div>
                  {incident.patient_name && (
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Patient:{" "}
                      </span>
                      <span>{incident.patient_name}</span>
                    </div>
                  )}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <span className="text-muted-foreground font-medium">
                      Description:{" "}
                    </span>
                    <span className="line-clamp-2">{incident.description}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/incidents/${incident.id}`}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      View Full Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
