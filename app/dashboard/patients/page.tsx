import { getPatients } from "@/app/actions/patients";
import { getUserFacilities } from "@/app/actions/facilities";
import PatientsClient from "@/components/patients/patients-client";

export default async function PatientsPage() {
  const [patients, facilities] = await Promise.all([
    getPatients(),
    getUserFacilities(),
  ]);

  return <PatientsClient initialPatients={patients} facilities={facilities} />;
}
