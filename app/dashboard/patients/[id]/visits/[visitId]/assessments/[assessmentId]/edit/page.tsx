import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAssessment } from "@/app/actions/assessments";
import AssessmentForm from "@/components/assessments/assessment-form";
import { Badge } from "@/components/ui/badge";

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
  const { data: woundsData } = await supabase
    .from("wounds")
    .select("id, wound_number, location, wound_type")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const wounds =
    woundsData?.map((w) => ({
      id: w.id,
      woundNumber: w.wound_number,
      location: w.location,
      woundType: w.wound_type,
    })) || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Edit Wound Assessment</h1>
          <Badge variant="secondary">Editing Mode</Badge>
        </div>
        <p className="text-muted-foreground">
          Patient: {assessment.visit.patient.firstName}{" "}
          {assessment.visit.patient.lastName} • Visit:{" "}
          {new Date(assessment.visit.visitDate).toLocaleDateString()}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          💡 Modify any field below and click "Update Assessment" to save changes
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
