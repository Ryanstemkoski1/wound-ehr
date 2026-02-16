import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisit } from "@/app/actions/visits";
import VisitForm from "@/components/visits/visit-form";
import {
  getAllowedProcedures,
  getRestrictedProcedures,
} from "@/lib/procedures";
import { getUserRole } from "@/lib/rbac";
import type { Credentials } from "@/lib/credentials";

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

  // Get user credentials for procedure restrictions using RPC to bypass RLS
  const { data: userDataArray } = await supabase.rpc(
    "get_current_user_credentials"
  );

  const userData =
    userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
  const userCredentials = (userData?.credentials as Credentials) || null;

  // Get user role for permission checks
  const role = await getUserRole();

  // Get allowed and restricted procedures for this user
  const allowedProcedures = await getAllowedProcedures(userCredentials);
  const restrictedProcedures = await getRestrictedProcedures(userCredentials);

  // Extract CPT codes
  const allowedCPTCodes = allowedProcedures.map((p) => p.procedure_code);
  const restrictedCPTCodes = restrictedProcedures.map((p) => ({
    code: p.procedure_code,
    name: p.procedure_name,
    requiredCredentials: p.required_credentials,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Visit</h1>
        <p className="text-muted-foreground">
          Patient: {visit.patient.firstName} {visit.patient.lastName}
          {visit.patient.facility && ` (${visit.patient.facility.name})`}
        </p>
      </div>
      <VisitForm
        patientId={patientId}
        userId={user.id}
        userCredentials={userCredentials}
        userRole={role?.role || null}
        allowedCPTCodes={allowedCPTCodes}
        restrictedCPTCodes={restrictedCPTCodes}
        visit={{
          id: visit.id,
          clinicianId: visit.clinicianId,
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
