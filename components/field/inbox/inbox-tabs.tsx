"use client";

// QA inbox: five queues in tabs, counts in the tab labels.
// Data arrives fully shaped from getInboxQueues (server) — this
// component only lays it out and routes row interactions.

import type { VisitCard } from "@/app/actions/field-schedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InboxQueue, type QueueVariant } from "@/components/field/inbox/inbox-queue";

export interface InboxQueues {
  pendingReview: VisitCard[];
  prepDue: VisitCard[];
  overdue: VisitCard[];
  correctionsOut: VisitCard[];
  completed: VisitCard[];
}

const TABS: { value: QueueVariant; label: string }[] = [
  { value: "pendingReview", label: "Pending Review" },
  { value: "prepDue", label: "Prep Due" },
  { value: "overdue", label: "Overdue" },
  { value: "correctionsOut", label: "Corrections Out" },
  { value: "completed", label: "Completed" },
];

export function InboxTabs({ queues }: { queues: InboxQueues }) {
  return (
    <Tabs defaultValue="pendingReview" className="gap-4">
      <div className="overflow-x-auto pb-1">
        <TabsList className="w-max">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="min-h-8">
              {tab.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {queues[tab.value].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <InboxQueue variant={tab.value} cards={queues[tab.value]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
