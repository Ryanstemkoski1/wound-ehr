import Link from "next/link";
import { CalendarPlus, ChevronRight, FileText } from "lucide-react";
import { StatusChip } from "@/components/field/ui/status-chip";
import { NOTE_TYPE_LABELS } from "@/lib/field-note/registry";
import { fmtDate, type ChartNote } from "./normalize";

/**
 * Chart note history: date, note-type label, status chip; rows open the note.
 * Approved rows get a separate PDF link (paper-mirror preview). Server component.
 */
export function NoteHistory({ notes }: { notes: ChartNote[] }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Note history
        </h2>
      </div>

      {notes.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule a visit to start this patient&apos;s first note.
          </p>
          <Link
            href="/schedule"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Open schedule
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((n) => (
            <li key={n.noteId} className="flex items-center gap-2 px-4 py-1.5 sm:gap-3">
              <Link
                href={`/notes/${n.noteId}`}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-1.5 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {fmtDate(n.visitDate ?? n.scheduledStartAt)}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {NOTE_TYPE_LABELS[n.noteType]}
                  {n.nurseName ? ` · ${n.nurseName}` : ""}
                </span>
              </Link>
              <StatusChip chip={n.chip} />
              {n.status === "approved" ? (
                <Link
                  href={`/notes/${n.noteId}/preview`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary hover:underline"
                  aria-label={`PDF for ${fmtDate(n.visitDate ?? n.scheduledStartAt)} note`}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  PDF
                </Link>
              ) : null}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
