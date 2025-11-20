import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWound } from "@/app/actions/wounds";
import WoundForm from "@/components/wounds/wound-form";

type PageProps = {
  params: Promise<{
    id: string;
    woundId: string;
  }>;
};

export default async function EditWoundPage({ params }: PageProps) {
  const { id: patientId, woundId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const wound = await getWound(woundId);

  if (!wound || wound.patientId !== patientId) {
    redirect(`/dashboard/patients/${patientId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Wound</h1>
        <p className="text-muted-foreground">
          Patient: {wound.patient.firstName} {wound.patient.lastName}
          {wound.patient.facility && ` (${wound.patient.facility.name})`}
        </p>
      </div>
      <WoundForm
        patientId={patientId}
        wound={{
          id: wound.id,
          woundNumber: wound.woundNumber,
          location: wound.location,
          woundType: wound.woundType,
          onsetDate: wound.onsetDate,
          status: wound.status,
        }}
      />
    </div>
  );
}
