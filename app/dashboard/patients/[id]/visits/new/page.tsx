import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  }>;
};

export default async function NewVisitPage({ params }: PageProps) {
  const { id: patientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's facility IDs
  const { data: userFacilities } = await supabase
    .from("user_facilities")
    .select("facility_id")
    .eq("user_id", user.id);

  const facilityIds = userFacilities?.map((uf) => uf.facility_id) || [];

  if (facilityIds.length === 0) {
    redirect("/dashboard/patients");
  }

  // Verify user has access to this patient
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*, facility:facilities!inner(name)")
    .eq("id", patientId)
    .in("facility_id", facilityIds)
    .maybeSingle();

  if (error || !patient) {
    redirect("/dashboard/patients");
  }

  const facility = Array.isArray(patient.facility)
    ? patient.facility[0]
    : patient.facility;

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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Visit</h1>
        <p className="text-muted-foreground">
          Patient: {patient.first_name} {patient.last_name} ({facility?.name})
        </p>
      </div>
      <VisitForm
        patientId={patientId}
        userId={user.id}
        userCredentials={userCredentials}
        userRole={role?.role || null}
        allowedCPTCodes={allowedCPTCodes}
        restrictedCPTCodes={restrictedCPTCodes}
      />
    </div>
  );
}
