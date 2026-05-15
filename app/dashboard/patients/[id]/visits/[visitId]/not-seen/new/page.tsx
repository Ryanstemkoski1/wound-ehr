import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisit } from "@/app/actions/visits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import PatientNotSeenForm from "@/components/assessments/patient-not-seen-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export default async function PatientNotSeenPage({ params }: PageProps) {
  const { id: patientId, visitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile for clinician name
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const visit = await getVisit(visitId);

  if (!visit || visit.patientId !== patientId) {
    notFound();
  }

  const clinicianName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "";

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Patients", href: "/dashboard/patients" },
          {
            label: `${visit.patient.firstName} ${visit.patient.lastName}`,
            href: `/dashboard/patients/${patientId}`,
          },
          {
            label: "Visit Details",
            href: `/dashboard/patients/${patientId}/visits/${visitId}`,
          },
          { label: "Patient Not Seen" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/patients/${patientId}/visits/${visitId}`}
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Visit
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Not Seen Report</CardTitle>
          <p className="text-muted-foreground text-sm">
            {visit.patient.firstName} {visit.patient.lastName} •{" "}
            {new Date(visit.visitDate).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <PatientNotSeenForm
            visitId={visitId}
            patientId={patientId}
            facilityId={visit.facilityId}
            userId={user.id}
            clinicianName={clinicianName}
            scheduledDate={
              typeof visit.visitDate === "string"
                ? visit.visitDate
                : new Date(visit.visitDate).toISOString().split("T")[0]
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
