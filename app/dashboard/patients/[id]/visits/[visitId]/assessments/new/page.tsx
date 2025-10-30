import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssessmentForm from "@/components/assessments/assessment-form";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export default async function NewAssessmentPage({ params }: PageProps) {
  const { id: patientId, visitId } = await params;
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

  // Verify user has access to this visit
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select(
      `
      *,
      patient:patients!inner(
        *,
        facility:facilities!inner(*)
      )
    `
    )
    .eq("id", visitId)
    .eq("patient_id", patientId)
    .in("patient.facility_id", facilityIds)
    .maybeSingle();

  if (visitError || !visit) {
    redirect("/dashboard/patients");
  }

  // Get active wounds for the patient
  const { data: woundsData } = await supabase
    .from("wounds")
    .select("id, wound_number, location, wound_type")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (!woundsData || woundsData.length === 0) {
    redirect(`/dashboard/patients/${patientId}`);
  }

  const wounds = woundsData.map((w) => ({
    id: w.id,
    woundNumber: w.wound_number,
    location: w.location,
    woundType: w.wound_type,
  }));

  const patient = Array.isArray(visit.patient)
    ? visit.patient[0]
    : visit.patient;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">New Wound Assessment</h1>
        <p className="text-muted-foreground">
          Patient: {patient.first_name} {patient.last_name} • Visit:{" "}
          {new Date(visit.visit_date).toLocaleDateString()}
        </p>
      </div>
      <AssessmentForm visitId={visitId} patientId={patientId} wounds={wounds} />
    </div>
  );
}
