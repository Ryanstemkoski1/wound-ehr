import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { getAssessment } from "@/app/actions/assessments";
import AssessmentForm from "@/components/assessments/assessment-form";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
    assessmentId: string;
  }>;
};

export default async function EditAssessmentPage({ params }: PageProps) {
  const { id: patientId, visitId, assessmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const assessment = await getAssessment(assessmentId);

  if (!assessment || assessment.visitId !== visitId) {
    redirect(`/dashboard/patients/${patientId}/visits/${visitId}`);
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Wound Assessment</h1>
        <p className="text-muted-foreground">
          Patient: {assessment.visit.patient.firstName}{" "}
          {assessment.visit.patient.lastName} • Visit:{" "}
          {new Date(assessment.visit.visitDate).toLocaleDateString()}
        </p>
      </div>
      <AssessmentForm
        visitId={visitId}
        patientId={patientId}
        wounds={wounds}
        assessment={{
          id: assessment.id,
          woundId: assessment.woundId,
          woundType: assessment.woundType,
          pressureStage: assessment.pressureStage,
          healingStatus: assessment.healingStatus,
          atRiskReopening: assessment.atRiskReopening,
          length: assessment.length ? Number(assessment.length) : null,
          width: assessment.width ? Number(assessment.width) : null,
          depth: assessment.depth ? Number(assessment.depth) : null,
          undermining: assessment.undermining,
          tunneling: assessment.tunneling,
          epithelialPercent: assessment.epithelialPercent,
          granulationPercent: assessment.granulationPercent,
          sloughPercent: assessment.sloughPercent,
          exudateAmount: assessment.exudateAmount,
          exudateType: assessment.exudateType,
          odor: assessment.odor,
          periwoundCondition: assessment.periwoundCondition,
          painLevel: assessment.painLevel,
          infectionSigns: assessment.infectionSigns,
          assessmentNotes: assessment.assessmentNotes,
        }}
      />
    </div>
  );
}
