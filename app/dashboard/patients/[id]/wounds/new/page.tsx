import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WoundForm from "@/components/wounds/wound-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewWoundPage({ params }: PageProps) {
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Wound</h1>
        <p className="text-muted-foreground">
          Patient: {patient.first_name} {patient.last_name} ({facility?.name})
        </p>
      </div>
      <WoundForm patientId={patientId} />
    </div>
  );
}
