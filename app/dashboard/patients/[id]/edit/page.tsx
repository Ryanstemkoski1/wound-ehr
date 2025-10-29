import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
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

  // Get patient with facility access check
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      isDeleted: false,
      facility: {
        userFacilities: {
          some: { userId: user.id },
        },
      },
    },
  });

  if (!patient) {
    notFound();
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

  return <PatientForm patient={patient} facilities={facilities} />;
}
