"use client";

// Scheduler surface: custom lightweight week grid (rows = nurses,
// columns = Mon–Sun), a prep-queue panel, a week pager driven by
// ?week=, a mobile day view with a day-pager, and the new-visit sheet.

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, format, isSameDay, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Phone, Plus } from "lucide-react";
import type { VisitCard } from "@/app/actions/field-schedule";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UNASSIGNED_ROW_ID, cardStart, fmtTime } from "./helpers";
import { NewVisitSheet, type NewVisitDefaults } from "./new-visit-sheet";
import type { FacilityOption, NurseOption } from "./types";
import { VisitBlock } from "./visit-popover";

// Nothing to subscribe to: used with useSyncExternalStore purely to tell the
// hydration render (server snapshot) apart from later client renders.
const subscribeNoop = () => () => {};

interface ScheduleRow {
  id: string;
  name: string;
}

interface ScheduleViewProps {
  cards: VisitCard[];
  nurses: NurseOption[];
  nursesLoadError?: string | null;
  facilities: FacilityOption[];
  /** Monday of the displayed week, yyyy-MM-dd. */
  weekStart: string;
}

export function ScheduleView({
  cards,
  nurses,
  nursesLoadError,
  facilities,
  weekStart,
}: ScheduleViewProps) {
  const router = useRouter();

  const week = useMemo(() => parseISO(weekStart), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);

  const sorted = useMemo(
    () =>
      [...cards].sort(
        (a, b) => (cardStart(a)?.getTime() ?? 0) - (cardStart(b)?.getTime() ?? 0)
      ),
    [cards]
  );

  // Rows: the nurse roster plus any nurse appearing on a card, plus Unassigned.
  const rows = useMemo<ScheduleRow[]>(() => {
    const map = new Map<string, ScheduleRow>();
    for (const n of nurses) map.set(n.id, { id: n.id, name: n.name });
    for (const c of sorted) {
      if (c.nurseId && !map.has(c.nurseId)) {
        map.set(c.nurseId, { id: c.nurseId, name: c.nurseName ?? "Unknown nurse" });
      }
    }
    const list = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (sorted.some((c) => !c.nurseId)) list.push({ id: UNASSIGNED_ROW_ID, name: "Unassigned" });
    return list;
  }, [nurses, sorted]);

  const prepQueue = useMemo(
    () => sorted.filter((c) => c.status === "scheduled" && !c.preppedAt),
    [sorted]
  );

  const cardsFor = (rowId: string, day: Date): VisitCard[] =>
    sorted.filter((c) => {
      const start = cardStart(c);
      if (!start || !isSameDay(start, day)) return false;
      return rowId === UNASSIGNED_ROW_ID ? !c.nurseId : c.nurseId === rowId;
    });

  // Mobile day pager. Defaults to today's column, resolved only after
  // hydration so the server and client render the same first frame; resets
  // to that default whenever the week changes.
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const todayIdx = hydrated ? days.findIndex((d) => isToday(d)) : -1;
  const [pagedIdx, setPagedIdx] = useState<number | null>(null);
  const [pagerWeek, setPagerWeek] = useState(weekStart);
  if (pagerWeek !== weekStart) {
    setPagerWeek(weekStart);
    setPagedIdx(null);
  }
  const dayIdx = pagedIdx ?? (todayIdx >= 0 ? todayIdx : 0);
  const selectedDay = days[Math.min(Math.max(dayIdx, 0), 6)];

  // New-visit sheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDefaults, setSheetDefaults] = useState<NewVisitDefaults>({});
  const openNewVisit = (defaults: NewVisitDefaults = {}) => {
    setSheetDefaults(defaults);
    setSheetOpen(true);
  };

  const defaultNewVisitDate = format(days.find((d) => isToday(d)) ?? days[0], "yyyy-MM-dd");

  const gotoWeek = (offsetDays: number | "today") => {
    if (offsetDays === "today") {
      router.push("/schedule");
      return;
    }
    router.push(`/schedule?week=${format(addDays(week, offsetDays), "yyyy-MM-dd")}`);
  };

  const weekVisitCount = sorted.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header: eyebrow, week label, pager, new visit */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Field schedule
          </p>
          <h1 className="mt-0.5 text-xl font-semibold text-foreground">
            {format(week, "MMM d")} – {format(addDays(week, 6), "MMM d, yyyy")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {weekVisitCount === 0
              ? "No visits this week"
              : `${weekVisitCount} visit${weekVisitCount === 1 ? "" : "s"} this week`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Previous week"
            onClick={() => gotoWeek(-7)}
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" className="h-11" onClick={() => gotoWeek("today")}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Next week"
            onClick={() => gotoWeek(7)}
          >
            <ChevronRight />
          </Button>
          <Button className="h-11" onClick={() => openNewVisit({ date: defaultNewVisitDate })}>
            <Plus />
            New visit
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Prep queue */}
        <aside className="lg:w-72 lg:shrink-0">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Prep queue
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {prepQueue.length === 0
                  ? "All scheduled visits are prepped"
                  : `${prepQueue.length} visit${prepQueue.length === 1 ? "" : "s"} need${
                      prepQueue.length === 1 ? "s" : ""
                    } phone prep`}
              </p>
            </div>
            {prepQueue.length > 0 ? (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {prepQueue.map((c) => {
                  const start = cardStart(c);
                  return (
                    <li key={c.noteId}>
                      <Link
                        href={`/notes/${c.noteId}`}
                        className="flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent"
                      >
                        <Phone className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {c.patientName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[
                              start ? `${format(start, "EEE")} ${fmtTime(start)}` : "Unscheduled",
                              c.nurseName,
                              c.facilityName,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                Nothing waiting on a pre-visit phone call.
              </p>
            )}
          </div>
        </aside>

        {/* Week grid (≥640px) */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="min-w-[64rem]">
              <div className="grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] border-b border-border">
                <div className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Nurse
                </div>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-l border-border px-2 py-2 text-center",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {format(day, "EEE")}
                    </p>
                    <p
                      className={cn(
                        "text-sm",
                        isToday(day) ? "font-semibold text-primary" : "text-foreground"
                      )}
                    >
                      {format(day, "MMM d")}
                    </p>
                  </div>
                ))}
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <p className="text-sm text-muted-foreground">
                    No field nurses or visits yet — schedule the first visit to get started.
                  </p>
                  <Button onClick={() => openNewVisit({ date: defaultNewVisitDate })}>
                    <Plus />
                    New visit
                  </Button>
                </div>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] border-b border-border last:border-b-0"
                  >
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{row.name}</p>
                    </div>
                    {days.map((day) => {
                      const dayCards = cardsFor(row.id, day);
                      const empty = dayCards.length === 0;
                      const defaults: NewVisitDefaults = {
                        date: format(day, "yyyy-MM-dd"),
                        nurseId: row.id === UNASSIGNED_ROW_ID ? undefined : row.id,
                      };
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={empty ? () => openNewVisit(defaults) : undefined}
                          className={cn(
                            "group relative min-h-24 border-l border-border p-1.5",
                            isToday(day) && "bg-primary/5",
                            empty && "cursor-pointer"
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            {dayCards.map((c) => (
                              <VisitBlock
                                key={c.noteId}
                                card={c}
                                nurses={nurses}
                                nursesLoadError={nursesLoadError}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            aria-label={`Add visit for ${row.name} on ${format(day, "MMM d")}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openNewVisit(defaults);
                            }}
                            className={cn(
                              "mt-1 flex h-8 w-full items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              empty
                                ? "opacity-40 group-hover:opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Day view (<640px) */}
        <div className="min-w-0 flex-1 sm:hidden">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-2">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Previous day"
              disabled={dayIdx === 0}
              onClick={() => setPagedIdx(Math.max(0, dayIdx - 1))}
            >
              <ChevronLeft />
            </Button>
            <div className="text-center">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isToday(selectedDay) ? "text-primary" : "text-foreground"
                )}
              >
                {format(selectedDay, "EEEE")}
              </p>
              <p className="text-xs text-muted-foreground">{format(selectedDay, "MMM d, yyyy")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Next day"
              disabled={dayIdx === 6}
              onClick={() => setPagedIdx(Math.min(6, dayIdx + 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {rows
              .map((row) => ({ row, dayCards: cardsFor(row.id, selectedDay) }))
              .filter(({ dayCards }) => dayCards.length > 0)
              .map(({ row, dayCards }) => (
                <section key={row.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {row.name}
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {dayCards.map((c) => (
                      <VisitBlock
                        key={c.noteId}
                        card={c}
                        nurses={nurses}
                        nursesLoadError={nursesLoadError}
                      />
                    ))}
                  </div>
                </section>
              ))}

            {rows.every((row) => cardsFor(row.id, selectedDay).length === 0) ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">No visits on this day.</p>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => openNewVisit({ date: format(selectedDay, "yyyy-MM-dd") })}
                >
                  <Plus />
                  Schedule a visit
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <NewVisitSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaults={sheetDefaults}
        nurses={nurses}
        nursesLoadError={nursesLoadError}
        facilities={facilities}
      />
    </div>
  );
}
