"use client";

// Sign & Finalize — the full-screen final step. Blank check with
// jump-back links, the three hard blockers (signature, Time In,
// ≥1 wound — everything else advisory), editable visit times,
// key-answer summary, attestation, and the signature capture.
// Submitting calls signFieldNote, which re-checks every blocker
// server-side.

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import type { FieldNoteDTO } from "@/app/actions/field-notes";
import { signFieldNote } from "@/app/actions/field-notes";
import { finalizeBlockers, noteProgress, summarizeSection } from "@/lib/field-note/logic";
import { applicableSections, NOTE_TYPE_LABELS, type SectionDef } from "@/lib/field-note/registry";
import { StatusChip } from "@/components/field/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SignaturePad, type SignaturePadHandle } from "@/components/field/note/signature-pad";
import { cn } from "@/lib/utils";

const toLocalInput = (iso: string) => format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");

/** Now, rounded to the nearest 5 minutes, as a datetime-local value. */
function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function SectionLinkList({
  noteId,
  sections,
  tone,
  suffixFor,
}: {
  noteId: string;
  sections: SectionDef[];
  tone: "warn" | "muted" | "info";
  suffixFor?: (s: SectionDef) => string | null;
}) {
  return (
    <ul className="space-y-1.5">
      {sections.map((s) => {
        const suffix = suffixFor?.(s) ?? null;
        return (
          <li key={s.key}>
            <Link
              href={`/notes/${noteId}#section-${s.key}`}
              className={cn(
                "flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted",
                tone === "warn" && "border-warning/50",
                tone === "muted" && "border-border text-muted-foreground",
                tone === "info" && "border-info/40"
              )}
            >
              <span className="min-w-0 truncate">
                <span className="tabular-nums">{s.paperNumber}</span> · {s.title}
                {suffix && <span className="ml-2 text-xs text-muted-foreground">{suffix}</span>}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SignFinalize({ note }: { note: FieldNoteDTO }) {
  const router = useRouter();
  const padRef = useRef<SignaturePadHandle>(null);

  const [timeInLocal, setTimeInLocal] = useState(note.timeIn ? toLocalInput(note.timeIn) : "");
  const [timeOutLocal, setTimeOutLocal] = useState(note.timeOut ? toLocalInput(note.timeOut) : "");
  const [attested, setAttested] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const applicable = useMemo(
    () => applicableSections(note.noteType, note.addedSections),
    [note.noteType, note.addedSections]
  );
  const progress = useMemo(
    () => noteProgress(note.noteType, note.sections, note.sectionsMeta, note.addedSections),
    [note]
  );

  const untouched = useMemo(
    () => applicable.filter((s) => progress.untouchedKeys.includes(s.key)),
    [applicable, progress]
  );
  const notAssessed = useMemo(
    () => applicable.filter((s) => note.sectionsMeta[s.key]?.not_assessed),
    [applicable, note.sectionsMeta]
  );
  // Advisory: sections last saved by someone other than the signing
  // nurse (approximated from meta attribution — "prep you never opened").
  const prefilled = useMemo(
    () =>
      applicable.filter((s) => {
        const m = note.sectionsMeta[s.key];
        return !!m?.last_edited_by && !!note.nurseId && m.last_edited_by !== note.nurseId && !m.not_assessed;
      }),
    [applicable, note.sectionsMeta, note.nurseId]
  );

  const blockers = finalizeBlockers(note.sections, timeInLocal || null, timeOutLocal || null);
  const woundsRaw = note.sections.wound_assessment?.wounds;
  const wounds = Array.isArray(woundsRaw) ? (woundsRaw as Record<string, unknown>[]) : [];
  const woundSummary = summarizeSection("wound_assessment", note.sections, note.sectionsMeta);
  const procedureSummary = summarizeSection("procedures", note.sections, note.sectionsMeta);

  const missing: string[] = [];
  if (blockers.missingTimeIn) missing.push("Time In");
  if (blockers.missingWound) missing.push("at least one wound");
  if (!hasSignature) missing.push("your signature");
  if (!attested) missing.push("the attestation");
  const canSubmit = missing.length === 0 && !submitting;

  const submit = async () => {
    const signature = padRef.current?.getSignature();
    if (!signature) {
      toast.error("Add your signature first");
      return;
    }
    setSubmitting(true);
    const res = await signFieldNote({
      noteId: note.id,
      signatureData: signature.dataUrl,
      signatureMethod: signature.method,
      timeIn: timeInLocal ? new Date(timeInLocal).toISOString() : null,
      timeOut: timeOutLocal ? new Date(timeOutLocal).toISOString() : null,
    });
    if (res.success) {
      toast.success("Note signed and sent for review");
      router.push("/visits");
    } else {
      toast.error(res.error);
      setSubmitting(false);
    }
  };

  const blankCheckClean = untouched.length === 0 && notAssessed.length === 0 && prefilled.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* ── Header ── */}
      <div className="mb-5">
        <Link
          href={`/notes/${note.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to note
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Sign &amp; Finalize</h1>
          <StatusChip chip={note.chip} />
        </div>
        <p className="text-sm text-muted-foreground">
          {note.patient.name} · {NOTE_TYPE_LABELS[note.noteType]} ·{" "}
          {format(parseISO(note.visitDate), "MMM d, yyyy")}
        </p>
      </div>

      <div className="space-y-5">
        {/* ── Hard blockers ── */}
        {(blockers.missingTimeIn || blockers.missingWound) && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="size-4 shrink-0" /> Before you can sign
            </p>
            <ul className="mt-2 space-y-1 text-sm text-destructive">
              {blockers.missingTimeIn && <li>Time In is required — set it below.</li>}
              {blockers.missingWound && (
                <li>
                  <Link
                    href={`/notes/${note.id}#section-wound_assessment`}
                    className="underline underline-offset-4"
                  >
                    Document at least one wound
                  </Link>{" "}
                  before signing.
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ── Re-sign warning ── */}
        {note.status === "needs_correction" && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3">
            <RotateCcw className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-sm">
              Re-signing after corrections — <span className="font-medium">this will void your previous
              signature</span>. A new signature record is created and the note returns to Pending Review.
            </p>
          </div>
        )}

        {/* ── Visit times ── */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Clock className="size-3.5" /> Visit times
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sign-time-in" className="mb-1.5 block text-sm font-medium">
                Time In{" "}
                {blockers.missingTimeIn && <span className="font-semibold text-destructive">· required</span>}
              </label>
              <div className="flex gap-2">
                <Input
                  id="sign-time-in"
                  type="datetime-local"
                  step={300}
                  value={timeInLocal}
                  aria-invalid={blockers.missingTimeIn || undefined}
                  onChange={(e) => setTimeInLocal(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => setTimeInLocal(nowLocal())}>
                  Now
                </Button>
              </div>
            </div>
            <div>
              <label htmlFor="sign-time-out" className="mb-1.5 block text-sm font-medium">
                Time Out
              </label>
              <div className="flex gap-2">
                <Input
                  id="sign-time-out"
                  type="datetime-local"
                  step={300}
                  value={timeOutLocal}
                  onChange={(e) => setTimeOutLocal(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => setTimeOutLocal(nowLocal())}>
                  Now
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Left blank, it is stamped automatically when you sign.
              </p>
            </div>
          </div>
        </section>

        {/* ── Blank check ── */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Blank check</h2>
          {blankCheckClean ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" /> Every section has answers.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {untouched.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-warning">
                    {untouched.length} section{untouched.length === 1 ? "" : "s"} untouched — sign anyway, or
                    jump back:
                  </p>
                  <SectionLinkList noteId={note.id} sections={untouched} tone="warn" />
                </div>
              )}
              {notAssessed.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-muted-foreground">Marked not assessed:</p>
                  <SectionLinkList noteId={note.id} sections={notAssessed} tone="muted" />
                </div>
              )}
              {prefilled.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium">
                    Pre-filled by the office — review before signing:
                  </p>
                  <SectionLinkList
                    noteId={note.id}
                    sections={prefilled}
                    tone="info"
                    suffixFor={(s) => {
                      const name = note.sectionsMeta[s.key]?.last_edited_by_name;
                      return name ? `Pre-filled by ${name}` : null;
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Key answers ── */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Key answers</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Time In → Out</dt>
              <dd className="text-right tabular-nums">
                {timeInLocal ? format(new Date(timeInLocal), "h:mm a") : "—"} →{" "}
                {timeOutLocal ? format(new Date(timeOutLocal), "h:mm a") : "stamped at sign"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Wounds ({wounds.length})
              </dt>
              <dd className="mt-0.5">{woundSummary || "None documented"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Procedures</dt>
              <dd className="mt-0.5">{procedureSummary || "None documented"}</dd>
            </div>
          </dl>
        </section>

        {/* ── Attestation ── */}
        <section className="rounded-lg border border-border bg-card p-4">
          <label htmlFor="sign-attest" className="flex cursor-pointer items-start gap-3">
            <Checkbox
              id="sign-attest"
              checked={attested}
              onCheckedChange={(v) => setAttested(v === true)}
              className="mt-0.5 size-5"
            />
            <span className="text-sm leading-relaxed">
              I attest that I personally performed this visit, that the documentation above is accurate and
              complete to the best of my knowledge, and that this electronic signature is the legal equivalent
              of my handwritten signature.
            </span>
          </label>
        </section>

        {/* ── Signature ── */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Signature</h2>
          <SignaturePad ref={padRef} onStateChange={setHasSignature} />
        </section>

        {/* ── Submit ── */}
        <div>
          <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
            {submitting ? "Signing…" : "Sign & Finalize"}
          </Button>
          {missing.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">Still needed: {missing.join(", ")}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
