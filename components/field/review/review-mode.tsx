"use client";

// QA review mode for a note in Pending Review (sent_to_office).
// Read-only compact summaries per applicable section (paper numbers
// preserved), expandable to full registry-labeled detail; per-section
// pinned correction comments with a preview-before-send Return dialog;
// Approve with confirm; paper-view toggle; changed-since-last-look
// highlighting; A / R keyboard shortcuts.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, ChevronDown, CornerUpLeft, MessageSquarePlus, X } from "lucide-react";
import {
  approveFieldNote,
  getNoteEventsSince,
  requestFieldNoteCorrections,
  type FieldNoteDTO,
} from "@/app/actions/field-notes";
import { applicableSections, NOTE_TYPE_LABELS, SECTION_MAP } from "@/lib/field-note/registry";
import { computeReviewFlags, summarizeSection } from "@/lib/field-note/logic";
import { StatusChip } from "@/components/field/ui/status-chip";
import { PaperView } from "@/components/field/pdf/paper-view";
import { SectionReadView } from "@/components/field/review/section-read-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PinnedComment {
  id: number;
  sectionKey: string | null;
  note: string;
}

/** Sentinel for the note-level (no section) comment box. */
const GENERAL_KEY = "__note__";

function sectionLabelFor(sectionKey: string | null): string {
  if (sectionKey === null) return "Whole note";
  const section = SECTION_MAP[sectionKey];
  return section ? `${section.paperNumber}. ${section.title}` : sectionKey;
}

function formatDob(dob: string | null): string | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : dob;
}

export function ReviewMode({ note }: { note: FieldNoteDTO }) {
  const router = useRouter();
  const canReview = note.viewer.canReview;

  const sections = useMemo(
    () => applicableSections(note.noteType, note.addedSections),
    [note.noteType, note.addedSections]
  );
  const flags = useMemo(
    () => computeReviewFlags(note.noteType, note.sections, note.sectionsMeta, note.addedSections, note.timeOut),
    [note]
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<PinnedComment[]>([]);
  const [commentBoxKey, setCommentBoxKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [paperView, setPaperView] = useState(false);
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const nextIdRef = useRef(1);

  // ── Changed-since-last-look: compare against the stored timestamp,
  //    then stamp "now" back for the next visit.
  useEffect(() => {
    const storageKey = `fieldops-review-${note.id}`;
    let lastViewed: string | null = null;
    try {
      lastViewed = window.localStorage.getItem(storageKey);
    } catch {
      // storage unavailable — skip highlighting
    }
    if (lastViewed) {
      getNoteEventsSince(note.id, lastViewed).then((result) => {
        if (result.success) setChangedKeys(new Set(result.sectionKeys));
      });
    }
    try {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // ignore
    }
  }, [note.id]);

  const openReturnDialog = useCallback(() => {
    if (comments.length === 0) {
      toast.error("Pin at least one correction comment before returning");
      return;
    }
    setReturnOpen(true);
  }, [comments.length]);

  // ── Keyboard: A approve, R return (skipped while typing / in dialogs).
  useEffect(() => {
    if (!canReview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || approveOpen || returnOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        setApproveOpen(true);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        openReturnDialog();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canReview, approveOpen, returnOpen, openReturnDialog]);

  function openCommentBox(key: string) {
    setCommentBoxKey(key);
    setDraft("");
  }

  function pinComment() {
    const text = draft.trim();
    if (!text || commentBoxKey === null) return;
    setComments((prev) => [
      ...prev,
      {
        id: nextIdRef.current++,
        sectionKey: commentBoxKey === GENERAL_KEY ? null : commentBoxKey,
        note: text,
      },
    ]);
    setCommentBoxKey(null);
    setDraft("");
  }

  function removeComment(id: number) {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleApprove() {
    setSubmitting(true);
    const result = await approveFieldNote(note.id);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Note approved");
    setApproveOpen(false);
    router.push("/inbox");
  }

  async function handleReturn() {
    setSubmitting(true);
    const result = await requestFieldNoteCorrections(
      note.id,
      comments.map((c) => ({ sectionKey: c.sectionKey, note: c.note }))
    );
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Returned to the nurse with comments");
    setReturnOpen(false);
    router.push("/inbox");
  }

  const dob = formatDob(note.patient.dob);
  const visitIso = note.scheduledStartAt ?? note.visitDate;
  let visitDateStr = visitIso;
  try {
    visitDateStr = format(new Date(visitIso), "EEE, MMM d, yyyy · h:mm a");
  } catch {
    // leave raw
  }

  const commentBox = (forKey: string) => (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Label
        htmlFor={`review-comment-${forKey}`}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Correction comment
      </Label>
      <Textarea
        id={`review-comment-${forKey}`}
        autoFocus
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="What should the nurse fix?"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setCommentBoxKey(null);
            setDraft("");
          }}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={pinComment} disabled={!draft.trim()}>
          Pin comment
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
      {/* ── Header ── */}
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">QA review</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{note.patient.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[dob && `DOB ${dob}`, note.patient.mrn && `MRN ${note.patient.mrn}`, note.room && `Room ${note.room}`]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {NOTE_TYPE_LABELS[note.noteType]} · {visitDateStr} · {note.nurseName ?? "Unassigned"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <StatusChip chip={note.chip} />
            <div className="flex min-h-11 items-center gap-2">
              <Switch id="paper-view-toggle" checked={paperView} onCheckedChange={setPaperView} />
              <Label htmlFor="paper-view-toggle" className="text-sm">
                Paper view
              </Label>
            </div>
          </div>
        </div>
        {changedKeys.size > 0 && !paperView && (
          <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
            {changedKeys.size} section{changedKeys.size === 1 ? "" : "s"} changed since your last
            look — outlined below.
          </p>
        )}
      </header>

      {/* ── Body ── */}
      <div className="mt-6 space-y-3 pb-28">
        {paperView ? (
          <div className="overflow-x-auto rounded-lg border bg-card p-2 sm:p-4">
            <PaperView note={note} />
          </div>
        ) : (
          <>
            {sections.map((section) => {
              const key = section.key;
              const isExpanded = !!expanded[key];
              const changed = changedKeys.has(key);
              const meta = note.sectionsMeta[key];
              const summary = summarizeSection(key, note.sections, note.sectionsMeta);
              const sectionComments = comments.filter((c) => c.sectionKey === key);
              const priorCorrections = note.corrections.filter((c) => c.sectionKey === key);

              return (
                <section
                  key={key}
                  className={cn("rounded-lg border bg-card", changed && "ring-2 ring-primary/25")}
                >
                  <div className="flex items-center gap-1 px-3 py-2 sm:px-4">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                        {section.paperNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{section.title}</span>
                          {changed && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Changed
                            </span>
                          )}
                          {sectionComments.length > 0 && (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                              {sectionComments.length} pinned
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                          {summary || "Blank"}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                    {canReview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Request correction on ${section.title}`}
                        onClick={() => openCommentBox(key)}
                      >
                        <MessageSquarePlus />
                      </Button>
                    )}
                  </div>

                  {sectionComments.length > 0 && (
                    <div className="space-y-1.5 border-t px-3 py-2 sm:px-4">
                      {sectionComments.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2"
                        >
                          <p className="text-sm text-amber-800 dark:text-amber-300">{c.note}</p>
                          <button
                            type="button"
                            aria-label="Remove pinned comment"
                            className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                            onClick={() => removeComment(c.id)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {commentBoxKey === key && (
                    <div className="border-t px-3 py-3 sm:px-4">{commentBox(key)}</div>
                  )}

                  {isExpanded && (
                    <div className="border-t px-3 py-4 sm:px-4">
                      {meta?.last_edited_by_name && (
                        <p className="mb-3 text-xs text-muted-foreground">
                          Last edited by {meta.last_edited_by_name}
                          {meta.last_edited_at
                            ? ` · ${format(new Date(meta.last_edited_at), "MMM d, h:mm a")}`
                            : ""}
                        </p>
                      )}
                      <SectionReadView section={section} payload={note.sections[key]} meta={meta} />
                      {priorCorrections.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Earlier corrections
                          </p>
                          {priorCorrections.map((c, i) => (
                            <div key={i} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                              <p>{c.note}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {c.requestedByName} ·{" "}
                                {format(new Date(c.requestedAt), "MMM d, h:mm a")} ·{" "}
                                {c.resolved ? "Resolved" : "Open"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}

            {/* ── Review summary panel ── */}
            {canReview && (
              <aside className="rounded-lg border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Return summary
                </p>
                {comments.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No correction comments pinned. Pin one on a section above, or add a note-level
                    comment.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {comments.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                            {sectionLabelFor(c.sectionKey)}
                          </p>
                          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
                            {c.note}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove pinned comment"
                          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => removeComment(c.id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  {commentBoxKey === GENERAL_KEY ? (
                    commentBox(GENERAL_KEY)
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openCommentBox(GENERAL_KEY)}
                    >
                      <MessageSquarePlus /> Add note-level comment
                    </Button>
                  )}
                </div>
              </aside>
            )}

            {!canReview && (
              <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Read-only — this note is not currently awaiting your review.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Sticky footer ── */}
      {canReview && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">
              Keyboard: A approve · R return
              {comments.length > 0
                ? ` · ${comments.length} comment${comments.length === 1 ? "" : "s"} pinned`
                : ""}
            </p>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={openReturnDialog}
                disabled={submitting}
              >
                <CornerUpLeft /> Return with comments
                {comments.length > 0 ? ` (${comments.length})` : ""}
              </Button>
              <Button className="min-h-11" onClick={() => setApproveOpen(true)} disabled={submitting}>
                <CheckCircle2 /> Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve confirm ── */}
      <Dialog open={approveOpen} onOpenChange={(next) => !submitting && setApproveOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this note?</DialogTitle>
            <DialogDescription>
              {note.patient.name} · {visitDateStr}. Approval completes the note, locks it from
              editing, and makes the PDF the record of the visit.
            </DialogDescription>
          </DialogHeader>
          {flags.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">Advisory flags</p>
              <ul className="mt-1 list-disc pl-5 text-amber-700 dark:text-amber-400">
                {flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              <CheckCircle2 /> {submitting ? "Approving…" : "Approve note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return confirm: previews exactly what the nurse will see ── */}
      <Dialog open={returnOpen} onOpenChange={(next) => !submitting && setReturnOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to {note.nurseName ?? "the nurse"}?</DialogTitle>
            <DialogDescription>
              The note reopens for editing with these pinned comments. This is exactly what{" "}
              {note.nurseName ?? "the nurse"} will see:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {sectionLabelFor(c.sectionKey)}
                </p>
                <p className="mt-1 text-sm">{c.note}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReturnOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleReturn} disabled={submitting || comments.length === 0}>
              <CornerUpLeft /> {submitting ? "Sending…" : "Send back with comments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
