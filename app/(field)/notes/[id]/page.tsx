// /notes/[id] — THE note. One route, three renderings:
// QA review (viewer.canReview) → ReviewMode; otherwise the editor,
// which itself renders read-only when viewer.canEdit is false.

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getFieldNote } from "@/app/actions/field-notes";
import { NoteEditor } from "@/components/field/note/note-editor";
import { ReviewMode } from "@/components/field/review/review-mode";

export default async function FieldNotePage({ params }: { params: Promise<{ id: string }> }) {
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

  if (result.data.viewer.canReview) {
    return <ReviewMode note={result.data} />;
  }

  return <NoteEditor note={result.data} />;
}
