import Link from "next/link";
import { Ruler, Activity, Edit2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AssessmentCardProps = {
  assessment: {
    id: string;
    woundId: string;
    wound: {
      woundNumber: string;
      location: string;
    };
    healingStatus: string | null;
    length: number | null;
    width: number | null;
    depth: number | null;
    area: number | null;
    createdAt: Date;
  };
  patientId: string;
  visitId: string;
};

const HEALING_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Initial: "outline",
  Healing: "secondary",
  Stable: "default",
  Declined: "destructive",
  Healed: "secondary",
  "Sign-off": "secondary",
};

export default function AssessmentCard({
  assessment,
  patientId,
  visitId,
}: AssessmentCardProps) {
  const statusVariant =
    HEALING_STATUS_VARIANTS[assessment.healingStatus || ""] || "outline";

  return (
    <Link
      href={`/dashboard/patients/${patientId}/visits/${visitId}/assessments/${assessment.id}/edit`}
      className="block transition-all hover:shadow-md"
    >
      <Card className="group cursor-pointer border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-primary hover:underline">
                  {assessment.wound.woundNumber}
                </CardTitle>
                <Edit2 className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-primary" />
              </div>
              <CardDescription>{assessment.wound.location}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {assessment.healingStatus && (
                <Badge variant={statusVariant}>{assessment.healingStatus}</Badge>
              )}
              <Badge variant="outline" className="text-xs">
                Click to Edit
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(assessment.length || assessment.width || assessment.depth) && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Ruler className="h-4 w-4" />
              <span>
                {assessment.length && `L: ${assessment.length}cm`}
                {assessment.width && ` × W: ${assessment.width}cm`}
                {assessment.depth && ` × D: ${assessment.depth}cm`}
                {assessment.area && ` (${Number(assessment.area).toFixed(2)}cm²)`}
              </span>
            </div>
          )}
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            <span>
              Assessed {new Date(assessment.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
