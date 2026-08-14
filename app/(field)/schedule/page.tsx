// Scheduler surface — server page. Parses ?week= (Monday anchor,
// defaults to the current week), loads the range + nurse roster +
// accessible facilities, and hands DTOs to the client ScheduleView.

import { addDays, endOfDay, format, startOfWeek } from "date-fns";
import { getFieldNurses, getScheduleRange } from "@/app/actions/field-schedule";
import { getAccessibleFacilities } from "@/lib/rbac";
import { ScheduleView } from "@/components/field/schedule/schedule-view";

interface SchedulePageProps {
  searchParams: Promise<{ week?: string | string[] }>;
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams;
  const weekParam = Array.isArray(params.week) ? params.week[0] : params.week;

  const anchor =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? new Date(`${weekParam}T00:00:00`)
      : new Date();
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const weekStart = startOfWeek(safeAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const [scheduleRes, nursesRes, facilities] = await Promise.all([
    getScheduleRange(weekStart.toISOString(), weekEnd.toISOString()),
    getFieldNurses(),
    getAccessibleFacilities(),
  ]);

  if (!scheduleRes.success) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Field schedule
          </p>
          <h1 className="mt-2 text-lg font-semibold text-foreground">
            Couldn&apos;t load the schedule
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{scheduleRes.error}</p>
          <a
            href="/schedule"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <ScheduleView
        cards={scheduleRes.cards}
        nurses={nursesRes.success ? nursesRes.nurses : []}
        nursesLoadError={nursesRes.success ? null : nursesRes.error}
        facilities={(facilities ?? []).map((f) => ({ id: f.id, name: f.name }))}
        weekStart={format(weekStart, "yyyy-MM-dd")}
      />
    </div>
  );
}
