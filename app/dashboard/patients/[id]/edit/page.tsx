import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PatientForm from "@/components/patients/patient-form";

type Params = Promise<{ id: string }>;

export default async function EditPatientPage({ params }: { params: Params }) {
  const { id } = await params;
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
    notFound();
  }

  // Get patient with facility access check
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .in("facility_id", facilityIds)
    .maybeSingle();

  if (patientError || !patient) {
    notFound();
  }

  // Get user's facilities
  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name")
    .in("id", facilityIds);

  const facilities =
    facilitiesData?.map((f) => ({
      id: f.id,
      name: f.name,
    })) || [];

  // Type-cast JSONB fields for the form
  const patientData = {
    ...patient,
    allergies: patient.allergies as string[] | null,
    medical_history: patient.medical_history as string[] | null,
    insurance_info: patient.insurance_info as {
      primary?: { provider: string; policyNumber: string; groupNumber: string };
      secondary?: {
        provider: string;
        policyNumber: string;
        groupNumber: string;
      };
    } | null,
    emergency_contact: patient.emergency_contact as {
      name: string;
      phone: string;
      relationship: string;
    } | null,
  };

  return <PatientForm patient={patientData} facilities={facilities} />;
}
