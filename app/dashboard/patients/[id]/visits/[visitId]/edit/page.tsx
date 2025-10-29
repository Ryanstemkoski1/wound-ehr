import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisit } from "@/app/actions/visits";
import VisitForm from "@/components/visits/visit-form";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export default async function EditVisitPage({ params }: PageProps) {
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
    redirect(`/dashboard/patients/${patientId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Visit</h1>
        <p className="text-muted-foreground">
          Patient: {visit.patient.firstName} {visit.patient.lastName} (
          {visit.patient.facility.name})
        </p>
      </div>
      <VisitForm
        patientId={patientId}
        visit={{
          id: visit.id,
          visitDate: visit.visitDate,
          visitType: visit.visitType,
          location: visit.location,
          status: visit.status,
          followUpType: visit.followUpType,
          followUpDate: visit.followUpDate,
          followUpNotes: visit.followUpNotes,
          timeSpent: visit.timeSpent,
          additionalNotes: visit.additionalNotes,
        }}
      />
    </div>
  );
}
