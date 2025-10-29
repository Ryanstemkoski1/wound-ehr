import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import VisitForm from "@/components/visits/visit-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewVisitPage({ params }: PageProps) {
  const { id: patientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify user has access to this patient
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      facility: {
        users: {
          some: { userId: user.id },
        },
      },
    },
    include: {
      facility: true,
    },
  });

  if (!patient) {
    redirect("/dashboard/patients");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">New Visit</h1>
        <p className="text-muted-foreground">
          Patient: {patient.firstName} {patient.lastName} (
          {patient.facility.name})
        </p>
      </div>
      <VisitForm patientId={patientId} />
    </div>
  );
}
