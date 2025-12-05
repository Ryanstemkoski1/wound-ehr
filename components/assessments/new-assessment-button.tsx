"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AssessmentTypeSelector from "@/components/assessments/assessment-type-selector";

type NewAssessmentButtonProps = {
  patientId: string;
  visitId: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
};

export default function NewAssessmentButton({
  patientId,
  visitId,
  disabled = false,
  variant = "outline",
  size = "sm",
}: NewAssessmentButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSelector, setShowSelector] = useState(false);

  // Auto-open if coming from quick assessment flow
  useEffect(() => {
    const quick = searchParams.get("quick");
    if (quick === "true") {
      setShowSelector(true);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("quick");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const handleSelectType = (
    type:
      | "standard"
      | "skilled-nursing"
      | "gtube-procedure"
      | "grafting"
      | "skin-sweep"
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
    } else if (type === "grafting") {
      router.push(
        `/dashboard/patients/${patientId}/visits/${visitId}/grafting/new`
      );
    } else if (type === "skin-sweep") {
      router.push(
        `/dashboard/patients/${patientId}/visits/${visitId}/skin-sweep/new`
      );
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
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
