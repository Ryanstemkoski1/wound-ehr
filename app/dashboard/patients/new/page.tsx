import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PatientForm from "@/components/patients/patient-form";
import { getUserRole, getUserCredentials } from "@/lib/rbac";

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

  return (
    <PatientForm
      facilities={facilities}
      userCredentials={credentials}
      userRole={role?.role || null}
    />
  );
}
