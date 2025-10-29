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
      isActive: true,
      facility: {
        users: {
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

  // Type-cast JSONB fields for the form
  const patientData = {
    ...patient,
    allergies: patient.allergies as string[] | null,
    medicalHistory: patient.medicalHistory as string[] | null,
    insuranceInfo: patient.insuranceInfo as {
      primary?: { provider: string; policyNumber: string; groupNumber: string };
      secondary?: {
        provider: string;
        policyNumber: string;
        groupNumber: string;
      };
    } | null,
    emergencyContact: patient.emergencyContact as {
      name: string;
      phone: string;
      relationship: string;
    } | null,
  };

  return <PatientForm patient={patientData} facilities={facilities} />;
}
