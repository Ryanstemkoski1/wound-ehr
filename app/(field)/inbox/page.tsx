import type { Metadata } from "next";
import { getInboxQueues } from "@/app/actions/field-schedule";
import { InboxTabs } from "@/components/field/inbox/inbox-tabs";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const result = await getInboxQueues();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Quality review</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Inbox</h1>
      </header>

      {result.success ? (
        <InboxTabs
          queues={{
            pendingReview: result.pendingReview,
            prepDue: result.prepDue,
            overdue: result.overdue,
            correctionsOut: result.correctionsOut,
            completed: result.completed,
          }}
        />
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <p className="font-medium">Could not load the inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      )}
    </div>
  );
}
