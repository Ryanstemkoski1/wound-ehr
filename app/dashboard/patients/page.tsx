import { getPatients } from "@/app/actions/patients";
import { getUserFacilities } from "@/app/actions/facilities";
import PatientsClient from "@/components/patients/patients-client";

// Force dynamic rendering (requires auth)
export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const [patients, facilities] = await Promise.all([
    getPatients(),
    getUserFacilities(),
  ]);

  return <PatientsClient initialPatients={patients} facilities={facilities} />;
}
