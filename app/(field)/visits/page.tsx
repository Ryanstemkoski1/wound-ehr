// Nurse home — /visits. Phone-first, single column always.
// Three stacked groups: Needs Attention (only when non-empty),
// Today, Upcoming (next 7 days, grouped by day).

import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { getMyVisits, type VisitCard } from "@/app/actions/field-schedule";
import { HomeVisitCard } from "@/components/field/home/visit-card";

interface DayGroup {
  key: string;
  label: string;
  cards: VisitCard[];
}

function cardStartIso(card: VisitCard): string {
  return card.scheduledStartAt ?? card.visitDate;
}

/** Group already-sorted upcoming cards by calendar day, next 7 days only. */
function groupUpcomingByDay(cards: VisitCard[]): DayGroup[] {
  const horizon = addDays(startOfDay(new Date()), 8);
  const groups = new Map<string, DayGroup>();
  for (const card of cards) {
    const start = parseISO(cardStartIso(card));
    if (!isBefore(start, horizon)) continue;
    const key = format(start, "yyyy-MM-dd");
    const existing = groups.get(key);
    if (existing) {
      existing.cards.push(card);
    } else {
      groups.set(key, { key, label: format(start, "EEEE MMM d"), cards: [card] });
    }
  }
  return [...groups.values()];
}

function GroupHeading({
  id,
  children,
  tone = "muted",
}: {
  id: string;
  children: React.ReactNode;
  tone?: "muted" | "destructive";
}) {
  return (
    <h2
      id={id}
      className={
        tone === "destructive"
          ? "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive"
          : "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      }
    >
      {children}
    </h2>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default async function VisitsPage() {
  const result = await getMyVisits();

  if (!result.success) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            My visits
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </h1>
        </header>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <CircleAlert className="size-6 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            Could not load your visits
          </p>
          <p className="text-sm text-muted-foreground">{result.error}</p>
        </div>
      </main>
    );
  }

  const { needsAttention, today, upcoming } = result;
  const dayGroups = groupUpcomingByDay(upcoming);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          My visits
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {format(new Date(), "EEEE, MMMM d")}
        </h1>
      </header>

      {needsAttention.length > 0 ? (
        <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-3">
          <GroupHeading id="needs-attention-heading" tone="destructive">
            <TriangleAlert className="size-3.5" aria-hidden />
            Needs attention · {needsAttention.length}
          </GroupHeading>
          {needsAttention.map((card) => (
            <HomeVisitCard
              key={card.noteId}
              card={card}
              variant={card.status === "needs_correction" ? "correction" : "overdue"}
            />
          ))}
        </section>
      ) : null}

      <section aria-labelledby="today-heading" className="flex flex-col gap-3">
        <GroupHeading id="today-heading">Today</GroupHeading>
        {today.length === 0 ? (
          <EmptyState>No visits today.</EmptyState>
        ) : (
          today.map((card) => (
            <HomeVisitCard key={card.noteId} card={card} variant="today" />
          ))
        )}
      </section>

      <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
        <GroupHeading id="upcoming-heading">Upcoming</GroupHeading>
        {dayGroups.length === 0 ? (
          <EmptyState>Nothing scheduled in the next 7 days.</EmptyState>
        ) : (
          dayGroups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h3 className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                {group.label}
              </h3>
              {group.cards.map((card) => (
                <HomeVisitCard key={card.noteId} card={card} variant="upcoming" />
              ))}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
