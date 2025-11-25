"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AssessmentTypeSelector from "@/components/assessments/assessment-type-selector";

type NewAssessmentButtonProps = {
  patientId: string;
  visitId: string;
  disabled?: boolean;
};

export default function NewAssessmentButton({
  patientId,
  visitId,
  disabled = false,
}: NewAssessmentButtonProps) {
  const router = useRouter();
  const [showSelector, setShowSelector] = useState(false);

  const handleSelectType = (
    type: "standard" | "skilled-nursing" | "gtube-procedure"
  ) => {
    if (type === "standard") {
      router.push(
        `/dashboard/patients/${patientId}/visits/${visitId}/assessments/new`
      );
    } else if (type === "skilled-nursing") {
      router.push(
        `/dashboard/patients/${patientId}/visits/${visitId}/skilled-nursing/new`
      );
    } else if (type === "gtube-procedure") {
      router.push(`/dashboard/patients/${patientId}/gtube-procedure/new`);
    }
  };

  return (
    <>
      <Button
        size="sm"
        className="gap-1"
        onClick={() => setShowSelector(true)}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        Add Assessment
      </Button>
      <AssessmentTypeSelector
        open={showSelector}
        onOpenChange={setShowSelector}
        onSelectType={handleSelectType}
      />
    </>
  );
}
