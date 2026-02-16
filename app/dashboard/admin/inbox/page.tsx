import { getInboxNotes } from "@/app/actions/approval-workflow";
import OfficeInboxClient from "@/components/admin/office-inbox-client";

export const dynamic = "force-dynamic";

export default async function OfficeInboxPage() {
  const result = await getInboxNotes();
  const notes = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Office Inbox</h1>
        <p className="text-muted-foreground">
          Review and approve clinician notes before sending to facilities
        </p>
      </div>

      <OfficeInboxClient initialNotes={notes} />
    </div>
  );
}
