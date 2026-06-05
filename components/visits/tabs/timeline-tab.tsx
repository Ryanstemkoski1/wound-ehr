import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { getVisits } from "@/app/actions/visits";
import { getWounds } from "@/app/actions/wounds";
import { listStudyResults } from "@/app/actions/studies";

// ============================================================================
// TimelineTab — Phase 3, per Dr. May's artifact.
//
// Read-only chronological aggregate of three event streams for a single
// patient (with the current visit providing the study-results scope):
//
//   1. Prior visits          (type: "visit")  — link to the visit detail page
//   2. Wound creation events (type: "wound")  — when each wound was opened
//   3. Study results         (type: "study")  — labs / imaging / pathology
//
// This is a server component on purpose: every source is a server action,
// and rendering on the server means we avoid an extra round-trip + loading
// flicker. The tabs shell wraps this in <Suspense> so the rest of the visit
// page can paint while the timeline streams in.
// ============================================================================

type TimelineEventType = "visit" | "wound" | "study";

type TimelineEvent = {
  // ISO date string used both for sort and for display. Wounds use
  // onset_date; visits use visit_date; studies use result_date (falling back
  // to created_at when the result has no recorded date).
  date: string;
  type: TimelineEventType;
  description: string;
  href?: string;
};

// ----------------------------------------------------------------------------
// Visual treatment per event type — matches the Dr. May color spec:
// visits = blue, wounds = violet, studies = amber. Kept inline so each pill
// is one small class string, no extra cn() lookup per row.
// ----------------------------------------------------------------------------
const TYPE_PILL: Record<TimelineEventType, string> = {
  visit:
    "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  wound:
    "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  study:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

const TYPE_LABEL: Record<TimelineEventType, string> = {
  visit: "Visit",
  wound: "Wound",
  study: "Study",
};

// ----------------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------------

/**
 * Format an ISO-ish date string as a short, locale-stable label. Splits on
 * "T" so we avoid timezone drift when only a YYYY-MM-DD was provided (which
 * is what study.result_date and wound.onset_date both look like).
 */
function formatDateLabel(iso: string): string {
  // Strip time portion if present — keeps the column narrow and consistent.
  const datePart = iso.includes("T") ? iso.slice(0, iso.indexOf("T")) : iso;
  const parsed = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return datePart;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Coerce whatever date-shaped value the action returned into an ISO string.
 * getVisits / getWounds already return Date objects; studies return strings.
 */
function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------
export type TimelineTabProps = {
  patientId: string;
  visitId: string;
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default async function TimelineTab({
  patientId,
  visitId,
}: TimelineTabProps) {
  // Parallel fan-out — none of these depend on each other, so we eat the
  // latency of the slowest action rather than summing them.
  const [visits, wounds, studyResults] = await Promise.all([
    getVisits(patientId),
    getWounds(patientId),
    listStudyResults(visitId),
  ]);

  // --------------------------------------------------------------------------
  // Aggregate into a single event stream. Each branch is responsible for its
  // own date coercion and human description; the unified shape lets the
  // renderer stay dumb.
  // --------------------------------------------------------------------------
  const events: TimelineEvent[] = [];

  for (const visit of visits) {
    const iso = toIso(visit.visitDate);
    if (!iso) continue;
    const typeLabel = visit.visitType ?? "Visit";
    const location = visit.location ? ` — ${visit.location}` : "";
    events.push({
      date: iso,
      type: "visit",
      description: `${typeLabel}${location}`,
      href: `/dashboard/patients/${patientId}/visits/${visit.id}`,
    });
  }

  for (const wound of wounds) {
    const iso = toIso(wound.onsetDate);
    if (!iso) continue;
    const parts = [
      `Wound ${wound.woundNumber}`,
      wound.location,
      wound.woundType,
    ].filter(Boolean);
    events.push({
      date: iso,
      type: "wound",
      description: `${parts.join(" • ")} opened`,
    });
  }

  for (const result of studyResults) {
    // Studies prefer the clinician-entered result_date; fall back to the
    // row's created_at so the event still has a sensible position.
    const iso = toIso(result.result_date) ?? toIso(result.created_at);
    if (!iso) continue;
    const name = result.test_name ?? result.test_code;
    const value = result.result_value ? ` = ${result.result_value}` : "";
    events.push({
      date: iso,
      type: "study",
      description: `${name}${value}`,
    });
  }

  // Sort newest-first. Comparing ISO strings is fine — they're lexicographically
  // ordered when the format is consistent, and we've normalized to ISO above.
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // --------------------------------------------------------------------------
  // Empty state — same Card chrome as the populated view so the tab doesn't
  // visually jump when the first event lands.
  // --------------------------------------------------------------------------
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Chronological history of visits, wounds, and study results for
            this patient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            No events yet for this patient.
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // Populated render — a simple vertical list. Each row is:
  //   [ short date column ] [ type pill ] [ description ]
  // Visit rows wrap in a Link so the whole row is clickable.
  // --------------------------------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          Chronological history of visits, wounds, and study results for this
          patient.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-border border-border divide-y rounded-lg border">
          {events.map((event, idx) => {
            const row = (
              <div
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3",
                  event.href &&
                    "hover:bg-accent/40 focus-visible:bg-accent/40 transition-colors"
                )}
              >
                <div className="text-muted-foreground w-24 shrink-0 text-xs tabular-nums sm:text-sm">
                  {formatDateLabel(event.date)}
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    TYPE_PILL[event.type]
                  )}
                >
                  {TYPE_LABEL[event.type]}
                </span>
                <div className="text-foreground min-w-0 flex-1 text-sm break-words">
                  {event.description}
                </div>
              </div>
            );

            return (
              <li
                // Same date can appear on multiple events of the same type
                // (e.g. two studies recorded the same day), so we include the
                // index in the key to keep React's reconciler happy.
                key={`${event.type}-${event.date}-${idx}`}
              >
                {event.href ? (
                  <Link
                    href={event.href}
                    className="focus-visible:ring-primary/30 block focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
