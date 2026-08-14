// =====================================================
// /notes/[id]/preview — paper-mirror preview + PDF download.
// =====================================================
// Server component. The PDF data action enforces the status
// floor (signed onward); the on-screen paper preview itself is
// allowed pre-sign, fed by getFieldNote instead — with a quiet
// notice in place of the download button.

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, FileWarning, Lock } from "lucide-react";
import { getFieldNote, getFieldNoteDataForPDF, type FieldNoteDTO } from "@/app/actions/field-notes";
import { NOTE_TYPE_LABELS } from "@/lib/field-note/registry";
import { PaperView } from "@/components/field/pdf/paper-view";
import { FieldNotePdfButton } from "@/components/field/pdf/pdf-button";
import { StatusChip } from "@/components/field/ui/status-chip";
import { formatPaperDate } from "@/components/field/pdf/field-map";

export const metadata = { title: "Paper preview" };

function PreviewShell({
  note,
  action,
  children,
}: {
  note: FieldNoteDTO;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/notes/${note.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to note
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Paper preview
          </p>
          <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-foreground">
            {note.patient.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{NOTE_TYPE_LABELS[note.noteType]}</span>
            <span aria-hidden>·</span>
            <span>{formatPaperDate(note.visitDate)}</span>
            <StatusChip chip={note.chip} />
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default async function NotePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Signed onward: full PDF data (visit #, facility, signature) + download.
  const pdfResult = await getFieldNoteDataForPDF(id);
  if (pdfResult.success) {
    const { data } = pdfResult;
    const note = data.note;
    const fileName = `field-visit-note-${note.patient.name}-${note.visitDate}`;
    return (
      <PreviewShell note={note} action={<FieldNotePdfButton noteId={note.id} fileName={fileName} />}>
        <PaperView
          note={note}
          visitNumber={data.visitNumber}
          facilityName={data.facilityName}
          signature={data.signature}
        />
      </PreviewShell>
    );
  }

  // Below the status floor (or the PDF data call failed): the preview itself
  // is still allowed — fall back to the plain note read.
  const noteResult = await getFieldNote(id);
  if (!noteResult.success) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="mx-auto mt-12 max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <FileWarning className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h1 className="mt-3 text-base font-semibold text-foreground">Unable to load this note</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{noteResult.error}</p>
          <Link
            href="/visits"
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to my visits
          </Link>
        </div>
      </div>
    );
  }

  const note = noteResult.data;
  return (
    <PreviewShell note={note}>
      <div className="mx-auto mb-4 flex w-full max-w-3xl items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          The PDF becomes available once the note is signed. This preview shows the paper form as it
          stands now.
        </p>
      </div>
      <PaperView note={note} />
    </PreviewShell>
  );
}
