import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WoundsBoard } from "@/components/wounds/wounds-board";

export const dynamic = "force-dynamic";

export default async function WoundsPage() {
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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">No Facilities Assigned</h2>
          <p className="text-muted-foreground mt-2">
            Contact your administrator to get access to facilities.
          </p>
        </div>
      </div>
    );
  }

  // Get all patients in user's facilities
  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select("id, first_name, last_name, facility_id")
    .in("facility_id", facilityIds);

  if (patientsError) {
    console.error("Error fetching patients:", patientsError);
  }

  const patientIds = patients?.map((p) => p.id) || [];

  // If no patients, return empty wounds list
  if (patientIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wound Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all active wounds across your patients
          </p>
        </div>
        <WoundsBoard wounds={[]} />
      </div>
    );
  }

  // Get all wounds with patient and facility info
  const { data: wounds, error } = await supabase
    .from("wounds")
    .select(
      `
      *,
      patient:patients!inner (
        id,
        first_name,
        last_name,
        facility_id,
        facility:facilities (
          id,
          name
        )
      )
    `
    )
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching wounds:", error);
  }

  // Get latest assessment for each wound
  const woundIds = wounds?.map((w) => w.id) || [];
  let latestAssessments: Array<{
    wound_id: string;
    created_at: string;
    healing_status: string;
    length: string;
    width: string;
  }> = [];

  if (woundIds.length > 0) {
    const { data, error: assessmentError } = await supabase
      .from("assessments")
      .select("wound_id, created_at, healing_status, length, width")
      .in("wound_id", woundIds)
      .order("created_at", { ascending: false });

    if (assessmentError) {
      console.error("Error fetching assessments:", assessmentError);
    } else {
      latestAssessments = data || [];
    }
  }

  // Map latest assessment to each wound
  const woundsWithAssessments = wounds?.map((wound) => {
    const assessment = latestAssessments?.find((a) => a.wound_id === wound.id);
    return {
      ...wound,
      latestAssessment: assessment || null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Wound Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage all active wounds across your patients
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          💡 <strong>Quick Tip:</strong> Click "View Wound" to see full history and add assessments, or click "Patient" to access patient records
        </p>
      </div>

      <WoundsBoard wounds={woundsWithAssessments || []} />
    </div>
  );
}
