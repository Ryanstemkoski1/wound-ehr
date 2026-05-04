import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAssessment } from "@/app/actions/assessments";
import { getTreatmentForWound } from "@/app/actions/treatments";
import AssessmentForm from "@/components/assessments/assessment-form";
import { Badge } from "@/components/ui/badge";
import {
  type TreatmentOrderData,
  EMPTY_TREATMENT_ORDER,
} from "@/lib/treatment-options";

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

  // Fetch existing treatment order for this wound + visit
  const treatmentResult = await getTreatmentForWound(
    visitId,
    assessment.woundId
  );
  let existingTreatment: TreatmentOrderData | null = null;
  if (treatmentResult.treatment) {
    const t = treatmentResult.treatment;
    const activeTab =
      (t.treatment_tab as TreatmentOrderData["activeTab"]) || "topical";

    // Helper: detect new-format JSONB (full tab state stored as object)
    const isObj = (d: unknown): d is Record<string, unknown> =>
      d != null && typeof d === "object" && !Array.isArray(d);

    const topical =
      isObj(t.primary_dressings) && "cleansingAction" in t.primary_dressings
        ? { ...EMPTY_TREATMENT_ORDER.topical, ...t.primary_dressings }
        : EMPTY_TREATMENT_ORDER.topical;

    const compressionNpwt =
      isObj(t.compression) && "selectedType" in t.compression
        ? { ...EMPTY_TREATMENT_ORDER.compressionNpwt, ...t.compression }
        : EMPTY_TREATMENT_ORDER.compressionNpwt;

    const skinMoisture =
      isObj(t.moisture_management) && "treatmentType" in t.moisture_management
        ? { ...EMPTY_TREATMENT_ORDER.skinMoisture, ...t.moisture_management }
        : EMPTY_TREATMENT_ORDER.skinMoisture;

    const rashDermatitis =
      isObj(t.secondary_treatment) && "treatmentOther" in t.secondary_treatment
        ? { ...EMPTY_TREATMENT_ORDER.rashDermatitis, ...t.secondary_treatment }
        : EMPTY_TREATMENT_ORDER.rashDermatitis;

    existingTreatment = {
      activeTab,
      specialInstructions: (t.special_instructions as string) || "",
      topical: topical as TreatmentOrderData["topical"],
      compressionNpwt: compressionNpwt as TreatmentOrderData["compressionNpwt"],
      skinMoisture: skinMoisture as TreatmentOrderData["skinMoisture"],
      rashDermatitis: rashDermatitis as TreatmentOrderData["rashDermatitis"],
    };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="page-hero space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Edit Wound Assessment
          </h1>
          <Badge variant="secondary">Editing Mode</Badge>
        </div>
        <p className="text-muted-foreground">
          Patient: {assessment.visit.patient.firstName}{" "}
          {assessment.visit.patient.lastName} • Visit:{" "}
          {new Date(assessment.visit.visitDate).toLocaleDateString()}
        </p>
        <p className="text-primary/80 bg-primary/5 border-primary/20 w-fit rounded-lg border px-3 py-1.5 text-sm">
          Modify any field below and click &quot;Update Assessment&quot; to save
          changes
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
        existingTreatment={existingTreatment}
      />
    </div>
  );
}
