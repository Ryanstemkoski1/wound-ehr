import Link from "next/link";
import { MapPin, Clock, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VisitActions from "./visit-actions";

type VisitCardProps = {
  visit: {
    id: string;
    visitDate: Date;
    visitType: string;
    location: string | null;
    status: string;
    followUpType: string | null;
    followUpDate: Date | null;
  };
  patientId: string;
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  in_person: "In-Person",
  telemed: "Telemedicine",
};

export default function VisitCard({ visit, patientId }: VisitCardProps) {
  const statusVariant = visit.status === "complete" ? "secondary" : "default";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              <Link
                href={`/dashboard/patients/${patientId}/visits/${visit.id}`}
                className="hover:underline"
              >
                {new Date(visit.visitDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Link>
            </CardTitle>
            <CardDescription>
              {VISIT_TYPE_LABELS[visit.visitType] || visit.visitType}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{visit.status}</Badge>
            <VisitActions visit={visit} patientId={patientId} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {new Date(visit.visitDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        {visit.location && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            <span>{visit.location}</span>
          </div>
        )}
        {visit.followUpType && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>
              Follow-up: {visit.followUpType}
              {visit.followUpDate &&
                ` on ${new Date(visit.followUpDate).toLocaleDateString()}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
