import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
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

  // Verify user has access to this visit
  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      patientId,
      patient: {
        facility: {
          users: {
            some: { userId: user.id },
          },
        },
      },
    },
    include: {
      patient: {
        include: {
          facility: true,
        },
      },
    },
  });

  if (!visit) {
    redirect("/dashboard/patients");
  }

  // Get active wounds for the patient
  const wounds = await prisma.wound.findMany({
    where: {
      patientId,
      status: "active",
    },
    select: {
      id: true,
      woundNumber: true,
      location: true,
      woundType: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (wounds.length === 0) {
    redirect(`/dashboard/patients/${patientId}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">New Wound Assessment</h1>
        <p className="text-muted-foreground">
          Patient: {visit.patient.firstName} {visit.patient.lastName} • Visit:{" "}
          {new Date(visit.visitDate).toLocaleDateString()}
        </p>
      </div>
      <AssessmentForm visitId={visitId} patientId={patientId} wounds={wounds} />
    </div>
  );
}
