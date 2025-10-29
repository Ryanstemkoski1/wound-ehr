import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import PatientForm from "@/components/patients/patient-form";

export default async function NewPatientPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's facilities
  const userFacilities = await prisma.userFacility.findMany({
    where: { userId: user.id },
    include: { facility: true },
  });

  const facilities = userFacilities.map(
    (uf: { facility: { id: string; name: string } }) => ({
      id: uf.facility.id,
      name: uf.facility.name,
    })
  );

  if (facilities.length === 0) {
    redirect("/dashboard/facilities/new");
  }

  return <PatientForm facilities={facilities} />;
}
