import Link from "next/link";
import {
  MapPin,
  Clock,
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react";
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

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

export default function VisitCard({ visit, patientId }: VisitCardProps) {
  const isCompleted = visit.status === "completed";
  const isCancelled = visit.status === "cancelled" || visit.status === "no-show";
  
  const statusVariant = isCompleted ? "secondary" : "default";
  const statusColor = isCompleted 
    ? "border-l-green-500" 
    : isCancelled 
    ? "border-l-gray-400" 
    : "border-l-blue-500";
  const iconBg = isCompleted
    ? "bg-linear-to-br from-green-500/10 to-emerald-500/10 ring-1 ring-green-500/20"
    : isCancelled
    ? "bg-linear-to-br from-gray-500/10 to-zinc-500/10 ring-1 ring-gray-500/20"
    : "bg-linear-to-br from-blue-500/10 to-cyan-500/10 ring-1 ring-blue-500/20";
  const iconColor = isCompleted
    ? "text-green-600 dark:text-green-400"
    : isCancelled
    ? "text-gray-600 dark:text-gray-400"
    : "text-blue-600 dark:text-blue-400";

  return (
    <Card
      className={`hover-lift group relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-md ${statusColor}`}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-zinc-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-zinc-900/50" />

      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
            >
              <CalendarIcon
                className={`h-5 w-5 ${iconColor}`}
                aria-hidden="true"
              />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                <Link
                  href={`/dashboard/patients/${patientId}/visits/${visit.id}`}
                  className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {new Date(visit.visitDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Link>
              </CardTitle>
              <CardDescription className="mt-1 font-medium">
                {VISIT_TYPE_LABELS[visit.visitType] || visit.visitType}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className="font-semibold">
              {STATUS_LABELS[visit.status] || visit.status}
            </Badge>
            <VisitActions visit={visit} patientId={patientId} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-2.5">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/50">
          <Clock className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {new Date(visit.visitDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        {visit.location && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <MapPin className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <span>{visit.location}</span>
          </div>
        )}
        {visit.followUpType && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20">
            <FileText
              className="h-4 w-4 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span className="text-amber-900 dark:text-amber-100">
              <span className="font-semibold">Follow-up:</span>{" "}
              {visit.followUpType}
              {visit.followUpDate &&
                ` on ${new Date(visit.followUpDate).toLocaleDateString()}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
