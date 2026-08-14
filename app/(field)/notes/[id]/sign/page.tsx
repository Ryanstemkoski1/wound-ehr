// /notes/[id]/sign — Sign & Finalize. Server-loads the note and hands
// it to the client step. Only the assigned nurse with a clinical
// credential, in a signable status, gets the screen (signFieldNote
// re-checks all of it server-side regardless).

import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";
import { getFieldNote } from "@/app/actions/field-notes";
import { SignFinalize } from "@/components/field/note/sign-finalize";

export default async function SignFieldNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getFieldNote(id);

  if (!result.success) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <AlertTriangle className="size-8 text-warning" />
        <h1 className="text-lg font-semibold">Can&apos;t open this note</h1>
        <p className="text-sm text-muted-foreground">{result.error}</p>
        <Link
          href="/visits"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to my visits
        </Link>
      </div>
    );
  }

  if (!result.data.viewer.canSign) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">This note can&apos;t be signed right now</h1>
        <p className="text-sm text-muted-foreground">
          Only the assigned nurse, holding a clinical credential, can sign — and only while the note is
          Scheduled, In Progress, or returned for corrections.
        </p>
        <Link
          href={`/notes/${result.data.id}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to the note
        </Link>
      </div>
    );
  }

  return <SignFinalize note={result.data} />;
}
