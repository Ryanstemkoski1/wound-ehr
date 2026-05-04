import Link from "next/link";
import {
  MapPin,
  Clock,
  FileText,
  Calendar as CalendarIcon,
  ShieldAlert,
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
  /** When true, visit is restricted — show "Pending Review" and hide link/details */
  restricted?: boolean;
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

export default function VisitCard({
  visit,
  patientId,
  restricted = false,
}: VisitCardProps) {
  const isCompleted = visit.status === "completed";
  const isCancelled =
    visit.status === "cancelled" || visit.status === "no-show";

  // Restricted view for facility users on unapproved visits
  if (restricted) {
    return (
      <Card className="group relative overflow-hidden border-l-4 border-l-amber-400">
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-linear-to-br from-amber-500/10 to-orange-500/10 p-2.5 ring-1 ring-amber-500/20">
                <ShieldAlert
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <CardTitle className="text-foreground text-lg font-bold">
                  {new Date(visit.visitDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription className="mt-1 font-medium">
                  {VISIT_TYPE_LABELS[visit.visitType] || visit.visitType}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-amber-300 font-semibold text-amber-700 dark:border-amber-700 dark:text-amber-400"
            >
              Pending Review
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This visit note is pending office review and approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusVariant = isCompleted ? "secondary" : "default";
  const statusColor = isCompleted
    ? "border-l-green-500"
    : isCancelled
      ? "border-l-gray-400"
      : "border-l-blue-500";
  const iconBg = isCompleted
    ? "bg-linear-to-br from-green-500/10 to-emerald-500/10 ring-1 ring-green-500/20"
    : isCancelled
      ? "bg-muted/50 ring-1 ring-border"
      : "bg-linear-to-br from-blue-500/10 to-cyan-500/10 ring-1 ring-blue-500/20";
  const iconColor = isCompleted
    ? "text-green-600 dark:text-green-400"
    : isCancelled
      ? "text-muted-foreground"
      : "text-blue-600 dark:text-blue-400";

  return (
    <Card
      className={`hover-lift group relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-md ${statusColor}`}
    >
      {/* Subtle gradient overlay */}
      <div className="from-muted/50 absolute inset-0 bg-linear-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

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
                  className="hover:text-primary transition-colors"
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
        <div className="bg-muted/30 dark:bg-muted/20 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <Clock
            className="text-muted-foreground/60 h-4 w-4"
            aria-hidden="true"
          />
          <span className="text-foreground font-medium">
            {new Date(visit.visitDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        {visit.location && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPin
              className="text-muted-foreground/60 h-4 w-4"
              aria-hidden="true"
            />
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
