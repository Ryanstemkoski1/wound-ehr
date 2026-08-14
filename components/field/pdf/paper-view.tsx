// =====================================================
// PaperView — HTML mirror of the client's paper
// "Wound Care Field Visit Note".
// =====================================================
// Pure presentational server-component-safe rendering (no hooks,
// no handlers). Driven entirely by the shared paper model in
// ./field-map, which the PDF template also consumes — the preview
// Mary approves is literally what prints.

import { cn } from "@/lib/utils";
import { NOTE_TYPE_LABELS } from "@/lib/field-note/registry";
import type { FieldNoteDTO } from "@/app/actions/field-notes";
import {
  PAPER_TITLE,
  buildPaperHeader,
  buildPaperSections,
  formatPaperDateTime,
  type PaperRow,
  type PaperSection,
  type PaperSignature,
  type PaperWoundBlock,
} from "./field-map";

// ─── Atoms ───

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-foreground/50 bg-background"
    >
      {checked ? <span className="h-2 w-2 rounded-[1px] bg-primary" /> : null}
    </span>
  );
}

function BlankLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block min-w-24 border-b border-foreground/30 align-baseline", className)}
    >
      &nbsp;
    </span>
  );
}

function FieldRow({ row }: { row: PaperRow }) {
  if (row.kind === "check") {
    return (
      <div className="py-1 text-sm leading-6">
        <span className="mr-2 font-medium text-foreground/80">{row.label}:</span>
        {row.options.map((o) => (
          <span
            key={o.value}
            className={cn(
              "mr-3 inline-flex items-center gap-1.5 whitespace-nowrap align-middle",
              o.checked ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <CheckSquare checked={o.checked} />
            <span>{o.label}</span>
            {o.checked ? <span className="sr-only">(selected)</span> : null}
          </span>
        ))}
        {row.detail ? (
          <div className="mt-0.5 pl-5 text-sm text-muted-foreground">
            {row.detail.label}:{" "}
            {row.detail.value ? (
              <span className="text-foreground">{row.detail.value}</span>
            ) : (
              <BlankLine className="min-w-40" />
            )}
          </div>
        ) : null}
      </div>
    );
  }

  if (row.kind === "line") {
    return (
      <div className="py-1 text-sm leading-6">
        <span className="mr-2 font-medium text-foreground/80">{row.label}:</span>
        {row.value ? <span className="text-foreground">{row.value}</span> : <BlankLine className="min-w-32" />}
      </div>
    );
  }

  // block (textarea)
  return (
    <div className="py-1.5 text-sm">
      <div className="mb-1 font-medium text-foreground/80">{row.label}:</div>
      {row.value ? (
        <div className="min-h-12 whitespace-pre-wrap rounded-sm border border-border px-2.5 py-1.5 text-foreground">
          {row.value}
        </div>
      ) : (
        <div className="min-h-12 rounded-sm border border-dashed border-foreground/25" aria-hidden />
      )}
    </div>
  );
}

function SectionBand({ paperNumber, title }: { paperNumber: number; title: string }) {
  return (
    <div className="mt-6 flex items-baseline gap-2.5 border-l-4 border-primary bg-primary/10 px-3 py-2">
      <span className="text-[11px] font-bold tabular-nums text-primary/70">{paperNumber}</span>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
    </div>
  );
}

function WoundBlock({ wound }: { wound: PaperWoundBlock }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        {wound.title}
      </div>
      {wound.rows.map((row) => (
        <FieldRow key={row.key} row={row} />
      ))}
    </div>
  );
}

function Section({ section }: { section: PaperSection }) {
  return (
    <section>
      <SectionBand paperNumber={section.paperNumber} title={section.title} />
      {section.kind === "stub" ? (
        section.stub === "attested" ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm font-medium text-foreground">
            <CheckSquare checked />
            <span>{section.text}</span>
          </div>
        ) : (
          <p className="px-1 py-2 text-sm italic text-muted-foreground">{section.text}</p>
        )
      ) : section.kind === "wounds" ? (
        // Two wound blocks per row — the paper form's two-per-page feel.
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {section.wounds.map((w) => (
            <WoundBlock key={w.title} wound={w} />
          ))}
        </div>
      ) : (
        <div className="px-1 pt-1">
          {section.rows.map((row) => (
            <FieldRow key={row.key} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── PaperView ───

export function PaperView({
  note,
  visitNumber,
  facilityName,
  signature,
}: {
  note: FieldNoteDTO;
  visitNumber?: number | null;
  facilityName?: string | null;
  signature?: PaperSignature | null;
}) {
  const header = buildPaperHeader(note, { visitNumber, facilityName });
  const sections = buildPaperSections(note);

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold tracking-tight">{PAPER_TITLE}</h2>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {NOTE_TYPE_LABELS[note.noteType]}
        </p>
      </div>

      {/* Header table (paper section 1) */}
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
        {header.map((cell) => (
          <div key={cell.label} className="bg-card px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {cell.label}
            </div>
            <div className="mt-0.5 min-h-5 text-sm text-foreground">
              {cell.value || <BlankLine className="min-w-16" />}
            </div>
          </div>
        ))}
      </div>

      {/* Sections 2–19 */}
      {sections.map((section) => (
        <Section key={section.key} section={section} />
      ))}

      {/* Signature area */}
      <div className="mt-8 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nurse signature
        </div>
        {signature ? (
          <div className="mt-2">
            {/* Signature images are data URIs — next/image does not apply. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signature.data}
              alt={`Signature of ${signature.signerName}`}
              className="h-16 w-auto max-w-full rounded-sm border border-border bg-background px-2 py-1"
            />
            <p className="mt-1.5 text-sm text-foreground">
              {signature.signerName}
              {signature.signedAt ? (
                <span className="text-muted-foreground">
                  {" "}
                  · signed {formatPaperDateTime(signature.signedAt)}
                </span>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-4 text-sm text-muted-foreground">
            <span>
              Signature: <BlankLine className="min-w-48" />
            </span>
            <span>
              Date: <BlankLine className="min-w-28" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
