import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisit } from "@/app/actions/visits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import DebridementAssessmentForm from "@/components/assessments/debridement-assessment-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export default async function NewDebridementAssessmentPage({
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
          { label: "New Debridement Assessment" },
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
          <CardTitle>Contactless Debridement Assessment</CardTitle>
          <p className="text-muted-foreground text-sm">
            Arobella Qoustic Wound Therapy System • {visit.patient.firstName}{" "}
            {visit.patient.lastName} •{" "}
            {new Date(visit.visitDate).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <DebridementAssessmentForm
            visitId={visitId}
            patientId={patientId}
            facilityId={visit.facilityId}
            userId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
