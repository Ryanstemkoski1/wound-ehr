import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

type VisitTopbarPillProps = {
  patientName: string;
  mrn: string;
  dob?: string | Date | null;
  facilityName?: string | null;
  visitDate: Date;
  clinicianName?: string | null;
  clinicianCredentials?: string | null;
  className?: string;
};

/**
 * WoundNote-style patient topbar pill (R-060). Renders inline above the
 * open-visit screen so the clinician can see who/where/when at a glance
 * without scrolling. Server component — pure presentation.
 *
 * Layout: [name • MRN • DOB] [facility] [DOS] [provider]
 */
export function VisitTopbarPill({
  patientName,
  mrn,
  dob,
  facilityName,
  visitDate,
  clinicianName,
  clinicianCredentials,
  className,
}: VisitTopbarPillProps) {
  const dobStr = dob
    ? new Date(dob).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;
  const dosStr = visitDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const provider = [clinicianName, clinicianCredentials]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn(
        "bg-muted/40 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border px-4 py-2 text-sm",
        className
      )}
      aria-label="Patient context"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Stethoscope
          className="text-muted-foreground h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span className="font-semibold">{patientName}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">MRN {mrn}</span>
        {dobStr && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">DOB {dobStr}</span>
          </>
        )}
      </div>
      {facilityName && (
        <div className="text-muted-foreground">
          <span className="sr-only">Facility: </span>
          {facilityName}
        </div>
      )}
      <div className="text-muted-foreground">
        <span className="sr-only">Date of service: </span>
        DOS {dosStr}
      </div>
      {provider && (
        <div className="text-muted-foreground ml-auto text-xs">
          <span className="sr-only">Provider: </span>
          {provider}
        </div>
      )}
    </div>
  );
}
