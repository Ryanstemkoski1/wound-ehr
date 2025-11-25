import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/app/actions/patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import GTubeProcedureForm from "@/components/assessments/gtube-procedure-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewGTubeProcedurePage({ params }: PageProps) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const patient = await getPatient(patientId);

  if (!patient) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Patients", href: "/dashboard/patients" },
          {
            label: `${patient.firstName} ${patient.lastName}`,
            href: `/dashboard/patients/${patientId}`,
          },
          { label: "New G-tube Procedure" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MEND G-tube Procedure Documentation</CardTitle>
          <p className="text-sm text-muted-foreground">
            {patient.firstName} {patient.lastName}
            {patient.facility && ` • ${patient.facility.name}`}
          </p>
        </CardHeader>
        <CardContent>
          <GTubeProcedureForm
            patientId={patientId}
            facilityId={patient.facilityId}
            userId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
