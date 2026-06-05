import { getPatients } from "@/app/actions/patients";
import { getUserFacilities } from "@/app/actions/facilities";
import PatientsClient from "@/components/patients/patients-client";
import { hasAdminEntitlement } from "@/lib/rbac";

// Force dynamic rendering (requires auth)
export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const [patients, facilities, canAddPatient] = await Promise.all([
    getPatients(),
    getUserFacilities(),
    hasAdminEntitlement(),
  ]);

  return (
    <PatientsClient
      initialPatients={patients}
      facilities={facilities}
      canAddPatient={canAddPatient}
    />
  );
}
