import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/app/actions/patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import ConsentToTreatmentForm from "@/components/consents/consent-to-treatment-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ConsentToTreatmentPage({ params }: PageProps) {
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

  // Get provider profile
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  // Get facility name
  const { data: facility } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", patient.facilityId)
    .single();

  const providerName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "";
  const facilityName = facility?.name || "";

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Patients", href: "/dashboard/patients" },
          {
            label: `${patient.firstName} ${patient.lastName}`,
            href: `/dashboard/patients/${patientId}`,
          },
          { label: "Consent to Treatment" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground dark:text-muted-foreground/60 dark:hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Consent to Treatment</CardTitle>
          <p className="text-muted-foreground text-sm">
            {patient.firstName} {patient.lastName} •{" "}
            {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <ConsentToTreatmentForm
            patientId={patientId}
            patientName={`${patient.firstName} ${patient.lastName}`}
            providerName={providerName}
            facilityName={facilityName}
          />
        </CardContent>
      </Card>
    </div>
  );
}
