import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PatientForm from "@/components/patients/patient-form";
import { getUserRole, getUserCredentials } from "@/lib/rbac";
import { listHomeHealthAgencies } from "@/app/actions/home-health-agencies";

export default async function NewPatientPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role and credentials for field permissions
  const role = await getUserRole();
  const credentials = await getUserCredentials();

  // Get user's facilities
  const { data: userFacilities } = await supabase
    .from("user_facilities")
    .select("facility_id, facility:facilities!inner(id, name)")
    .eq("user_id", user.id);

  const facilities =
    userFacilities?.map((uf) => {
      const facility = Array.isArray(uf.facility)
        ? uf.facility[0]
        : uf.facility;
      return {
        id: facility.id,
        name: facility.name,
      };
    }) || [];

  if (facilities.length === 0) {
    redirect("/dashboard");
  }

  const hhaResult = await listHomeHealthAgencies();
  const homeHealthAgencies = hhaResult.success
    ? (hhaResult.data ?? []).map((h) => ({ id: h.id, name: h.name }))
    : [];

  return (
    <PatientForm
      facilities={facilities}
      homeHealthAgencies={homeHealthAgencies}
      userCredentials={credentials}
      userRole={role?.role || null}
    />
  );
}
