import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisit } from "@/app/actions/visits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import { SkilledNursingAssessmentForm } from "@/components/assessments/skilled-nursing-assessment-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export default async function NewSkilledNursingAssessmentPage({
  params,
}: PageProps) {
  const { id: patientId, visitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const visit = await getVisit(visitId);

  if (!visit || visit.patientId !== patientId) {
    notFound();
  }

  // Check visit status - don't allow new assessments on signed/submitted visits
  if (visit.status === "signed" || visit.status === "submitted") {
    redirect(`/dashboard/patients/${patientId}/visits/${visitId}`);
  }

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
          { label: "New RN/LVN Assessment" },
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
          <CardTitle>RN/LVN Skilled Nursing Visit Assessment</CardTitle>
          <p className="text-sm text-muted-foreground">
            {visit.patient.firstName} {visit.patient.lastName} •{" "}
            {new Date(visit.visitDate).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <SkilledNursingAssessmentForm
            visitId={visitId}
            patientId={patientId}
            facilityId={visit.facilityId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
