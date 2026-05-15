import Link from "next/link";
import { Activity, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWounds } from "@/app/actions/wounds";
import { getVisits } from "@/app/actions/visits";

type WoundRailProps = {
  patientId: string;
  /** The visit currently being viewed; that visit gets a highlight ring. */
  currentVisitId?: string | null;
  className?: string;
};

const WOUND_STATUS_DOT: Record<string, string> = {
  active: "bg-red-500",
  improving: "bg-amber-500",
  stable: "bg-primary",
  healed: "bg-emerald-500",
};

/**
 * Left wound rail (R-062). Server component — fetches the patient's wounds
 * + recent visits and renders a compact navigation column on the open-visit
 * screen. Resizable behavior is intentionally deferred (CSS-only column for
 * v1); a clinician-facing resize handle can land in a follow-up slice.
 */
export async function WoundRail({
  patientId,
  currentVisitId,
  className,
}: WoundRailProps) {
  const [wounds, visits] = await Promise.all([
    getWounds(patientId),
    getVisits(patientId),
  ]);

  const recentVisits = visits.slice(0, 8);

  return (
    <aside
      aria-label="Wound rail"
      className={cn(
        "bg-muted/30 flex h-full w-full flex-col gap-6 rounded-md border p-4 text-sm",
        className
      )}
    >
      <section>
        <h2 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          Wounds
          <span className="ml-auto text-[10px] font-normal normal-case">
            {wounds.length}
          </span>
        </h2>
        {wounds.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No wounds documented yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {wounds.map((w) => {
              const dot =
                WOUND_STATUS_DOT[(w.status || "active").toLowerCase()] ||
                WOUND_STATUS_DOT.active;
              return (
                <li key={w.id}>
                  <Link
                    href={`/dashboard/patients/${patientId}/wounds/${w.id}`}
                    className="hover:bg-muted flex items-start gap-2 rounded px-2 py-1.5 transition"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        dot
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        #{w.woundNumber} · {w.location}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {w.woundType} · {w.status}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          Recent Visits
        </h2>
        {recentVisits.length === 0 ? (
          <p className="text-muted-foreground text-xs">No prior visits.</p>
        ) : (
          <ul className="space-y-1">
            {recentVisits.map((v) => {
              const isCurrent = v.id === currentVisitId;
              const dateStr = v.visitDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "2-digit",
              });
              return (
                <li key={v.id}>
                  <Link
                    href={`/dashboard/patients/${patientId}/visits/${v.id}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "hover:bg-muted flex items-center justify-between rounded px-2 py-1.5 transition",
                      isCurrent &&
                        "bg-primary/10 ring-primary/40 hover:bg-primary/15 ring-1"
                    )}
                  >
                    <span
                      className={cn(
                        "truncate",
                        isCurrent ? "font-semibold" : "font-medium"
                      )}
                    >
                      {dateStr}
                    </span>
                    <span className="text-muted-foreground ml-2 shrink-0 text-[10px] tracking-wide uppercase">
                      {v.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
