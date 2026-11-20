"use client";

// THE note — one continuous scrolling document in paper order.
// Sticky header (identity, status, progress, autosave state, Sign),
// prep/corrections/start-visit banners, section rail, registry-driven
// sections with per-section debounced autosave, collapse-to-summary,
// and the follow-up "Add section" escape hatch.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  Play,
  Plus,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import type { FieldNoteDTO } from "@/app/actions/field-notes";
import {
  addNoteSection,
  markPrepped,
  resolveCorrection,
  setSectionAttestation,
  setSectionNotAssessed,
  startVisit,
} from "@/app/actions/field-notes";
import {
  noteProgress,
  sectionState,
  statusChip,
  summarizeSection,
  type NoteSections,
} from "@/lib/field-note/logic";
import {
  applicableSections,
  omittedSections,
  NOTE_TYPE_LABELS,
  SECTION_MAP,
} from "@/lib/field-note/registry";
import { StatusChip } from "@/components/field/ui/status-chip";
import { Button } from "@/components/ui/button";
import { SectionRail, type RailItem } from "@/components/field/note/section-rail";
import { SectionRenderer } from "@/components/field/note/section-renderer";
import { useSectionAutosave, type AutosaveState } from "@/components/field/note/use-autosave";
import { cn } from "@/lib/utils";

type MetaMap = FieldNoteDTO["sectionsMeta"];

const AUTO_COLLAPSE_MS = 2000;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtWhen(iso: string): string {
  return format(parseISO(iso), "MMM d, h:mm a");
}

function SaveIndicator({ state, lastSavedAt }: { state: AutosaveState; lastSavedAt: Date | null }) {
  const dot =
    state === "error"
      ? "bg-destructive"
      : state === "saving"
        ? "animate-pulse bg-warning"
        : state === "saved"
          ? "bg-success"
          : "bg-muted-foreground/40";
  const label =
    state === "error"
      ? "Not saved"
      : state === "saving"
        ? "Saving…"
        : lastSavedAt
          ? `Saved ${format(lastSavedAt, "h:mm a")}`
          : "Autosave on";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="hidden whitespace-nowrap sm:inline">{label}</span>
    </span>
  );
}

export function NoteEditor({ note }: { note: FieldNoteDTO }) {
  const readOnly = !note.viewer.canEdit;

  const [sections, setSections] = useState<NoteSections>(note.sections);
  const [meta, setMeta] = useState<MetaMap>(note.sectionsMeta);
  const [added, setAdded] = useState<string[]>(note.addedSections);
  const [status, setStatus] = useState(note.status);
  const [preppedAt, setPreppedAt] = useState(note.preppedAt);
  const [timeIn, setTimeIn] = useState(note.timeIn);
  const [corrections, setCorrections] = useState(note.corrections);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const sectionsRef = useRef<NoteSections>(note.sections);
  const focusStamps = useRef(new Map<string, number>());

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of applicableSections(note.noteType, note.addedSections)) {
      init[s.key] = sectionState(s.key, note.sections, note.sectionsMeta) !== "untouched";
    }
    return init;
  });

  // Auto-collapse a section shortly after its save lands, unless the
  // viewer touched or is still focused inside it.
  const handleSaved = useCallback((key: string) => {
    const stamp = focusStamps.current.get(key) ?? 0;
    window.setTimeout(() => {
      if ((focusStamps.current.get(key) ?? 0) !== stamp) return;
      const el = document.getElementById(`section-${key}`);
      if (el && el.contains(document.activeElement)) return;
      setCollapsed((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    }, AUTO_COLLAPSE_MS);
  }, []);

  const { queueSave, retryAll, flushAll, state: saveState, dirtyKeys, lastSavedAt, hasError } = useSectionAutosave(
    note.id,
    !readOnly,
    handleSaved
  );

  // Debounced edits must reach the server before the Sign/Preview pages
  // load their server-side snapshot of the note.
  const flushBeforeNav = useCallback(() => {
    void flushAll();
  }, [flushAll]);

  const applicable = useMemo(() => applicableSections(note.noteType, added), [note.noteType, added]);
  const omitted = useMemo(() => omittedSections(note.noteType, added), [note.noteType, added]);
  const progress = useMemo(
    () => noteProgress(note.noteType, sections, meta, added),
    [note.noteType, sections, meta, added]
  );
  const chip = statusChip(status, preppedAt);
  const firstUntouched = progress.untouchedKeys[0] ?? null;

  const unresolvedBySection = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of corrections) {
      if (!c.resolved && c.sectionKey && !map.has(c.sectionKey)) map.set(c.sectionKey, c.note);
    }
    return map;
  }, [corrections]);

  const unresolvedList = useMemo(
    () => corrections.map((c, index) => ({ ...c, index })).filter((c) => !c.resolved),
    [corrections]
  );

  const interact = useCallback((key: string) => {
    focusStamps.current.set(key, (focusStamps.current.get(key) ?? 0) + 1);
  }, []);

  const patchSection = useCallback(
    (key: string, patch: Record<string, unknown>) => {
      if (readOnly) return;
      const current = sectionsRef.current[key] ?? {};
      const nextSection = { ...current, ...patch };
      const next = { ...sectionsRef.current, [key]: nextSection };
      sectionsRef.current = next;
      setSections(next);
      queueSave(key, nextSection);
    },
    [readOnly, queueSave]
  );

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const jumpTo = useCallback((key: string) => {
    setCollapsed((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
    window.requestAnimationFrame(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // Deep links from the sign screen: /notes/[id]#section-key
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#section-")) return;
    const key = hash.slice("#section-".length);
    if (!SECTION_MAP[key]) return;
    // Expand on the next frame rather than synchronously inside the effect,
    // then scroll once the section has rendered open.
    let scrollTimer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      setCollapsed((prev) => ({ ...prev, [key]: false }));
      scrollTimer = window.setTimeout(() => {
        document.getElementById(`section-${key}`)?.scrollIntoView({ block: "start" });
      }, 60);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(scrollTimer);
    };
  }, []);

  // Track which section is in view for the rail highlight.
  const applicableKeys = applicable.map((s) => s.key).join(",");
  useEffect(() => {
    const keys = applicableKeys.split(",").filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id?.startsWith("section-")) setActiveKey(id.slice("section-".length));
      },
      { rootMargin: "-96px 0px -55% 0px" }
    );
    for (const key of keys) {
      const el = document.getElementById(`section-${key}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [applicableKeys]);

  // Don't lose unsaved changes to an accidental navigation.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyKeys.size > 0 || hasError) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyKeys, hasError]);

  // ── Lifecycle actions ──

  const handleStartVisit = async () => {
    setPendingAction("start");
    const res = await startVisit(note.id);
    setPendingAction(null);
    if (res.success) {
      setTimeIn(new Date().toISOString());
      setStatus((s) => (s === "scheduled" ? "in-progress" : s));
      toast.success("Visit started — Time In stamped");
    } else {
      toast.error(res.error);
    }
  };

  const handleMarkPrepped = async () => {
    setPendingAction("prep");
    const res = await markPrepped(note.id);
    setPendingAction(null);
    if (res.success) {
      setPreppedAt(new Date().toISOString());
      toast.success("Marked ready for visit");
    } else {
      toast.error(res.error);
    }
  };

  const handleResolve = async (index: number) => {
    setPendingAction(`resolve-${index}`);
    const res = await resolveCorrection(note.id, index);
    setPendingAction(null);
    if (res.success) {
      setCorrections((cs) => cs.map((c, i) => (i === index ? { ...c, resolved: true } : c)));
      toast.success("Correction resolved");
    } else {
      toast.error(res.error);
    }
  };

  const handleAddSection = async (key: string) => {
    setPendingAction(`add-${key}`);
    const res = await addNoteSection(note.id, key);
    setPendingAction(null);
    if (res.success) {
      setAdded((a) => [...a, key]);
      setCollapsed((prev) => ({ ...prev, [key]: false }));
      window.requestAnimationFrame(() => {
        document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      toast.error(res.error);
    }
  };

  const handleNotAssessed = async (key: string, value: boolean) => {
    const prev = meta;
    setMeta((m) => ({ ...m, [key]: { ...m[key], not_assessed: value } }));
    const res = await setSectionNotAssessed(note.id, key, value);
    if (!res.success) {
      setMeta(prev);
      toast.error(res.error);
    }
  };

  const handleAttest = async (key: string, value: boolean) => {
    const prev = meta;
    setMeta((m) => ({ ...m, [key]: { ...m[key], attestation: value } }));
    const res = await setSectionAttestation(note.id, key, value);
    if (!res.success) {
      setMeta(prev);
      toast.error(res.error);
    }
  };

  // ── Derived UI data ──

  const railItems: RailItem[] = applicable.map((s) => {
    const m = meta[s.key];
    return {
      key: s.key,
      paperNumber: s.paperNumber,
      title: s.title,
      state: sectionState(s.key, sections, meta),
      dirty: dirtyKeys.has(s.key),
      initials: m?.last_edited_by_name ? initialsOf(m.last_edited_by_name) : null,
      hasCorrection: unresolvedBySection.has(s.key),
    };
  });

  const dob = note.patient.dob ? format(parseISO(note.patient.dob), "MM/dd/yyyy") : null;
  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="pb-24">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1 basis-52">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-semibold">{note.patient.name}</h1>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {NOTE_TYPE_LABELS[note.noteType]}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {dob ? `DOB ${dob}` : "DOB —"}
              {note.patient.mrn && ` · MRN ${note.patient.mrn}`}
              {` · ${format(parseISO(note.visitDate), "MMM d, yyyy")}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <StatusChip chip={chip} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {progress.done}/{progress.total}
            </span>
            <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/notes/${note.id}/preview`} onClick={flushBeforeNav}>
                <FileText />
                <span className="hidden sm:inline">Preview</span>
              </Link>
            </Button>
            {note.viewer.canSign ? (
              <Button size="sm" asChild>
                <Link href={`/notes/${note.id}/sign`} onClick={flushBeforeNav}>
                  Sign &amp; Finalize
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled>
                Sign &amp; Finalize
              </Button>
            )}
          </div>
        </div>
        {/* Phone: sticky progress bar */}
        <div className="h-1 w-full bg-muted lg:hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      {/* ── Banners ── */}
      <div className="mx-auto max-w-6xl space-y-3 px-4 pt-4 empty:hidden">
        {hasError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <WifiOff className="size-4 shrink-0" /> Not saved — check connection
            </p>
            <Button size="sm" variant="outline" onClick={retryAll}>
              Retry now
            </Button>
          </div>
        )}

        {readOnly && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" /> Read-only — this note is {chip.label} and can no longer be
            edited here.
          </div>
        )}

        {unresolvedList.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5">
            <p className="border-b border-destructive/20 px-4 py-2.5 text-xs font-semibold tracking-wide text-destructive uppercase">
              Corrections requested · {unresolvedList.length}
            </p>
            <ul className="divide-y divide-destructive/10">
              {unresolvedList.map((c) => {
                const sectionDef = c.sectionKey ? SECTION_MAP[c.sectionKey] : undefined;
                return (
                  <li key={c.index} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-sm">{c.note}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {sectionDef && `${sectionDef.paperNumber} · ${sectionDef.title} — `}
                        {c.requestedByName} · {fmtWhen(c.requestedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {sectionDef && (
                        <Button size="sm" variant="ghost" onClick={() => jumpTo(sectionDef.key)}>
                          Go to section
                        </Button>
                      )}
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingAction === `resolve-${c.index}`}
                          onClick={() => handleResolve(c.index)}
                        >
                          {pendingAction === `resolve-${c.index}` ? "Resolving…" : "Resolve"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {preppedAt && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/40 bg-info/10 px-4 py-3">
            <p className="text-sm">
              Sections prepped by <span className="font-medium">{note.preppedByName ?? "office staff"}</span>
              {firstUntouched ? " — pick up where they left off." : "."}
            </p>
            {firstUntouched && (
              <Button size="sm" variant="outline" onClick={() => jumpTo(firstUntouched)}>
                Jump to first untouched
              </Button>
            )}
          </div>
        )}

        {note.viewer.isAssignedNurse && !readOnly && !timeIn && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
            <p className="text-sm">Arrived? Start the visit to stamp your Time In.</p>
            <Button size="sm" onClick={handleStartVisit} disabled={pendingAction === "start"}>
              <Play /> {pendingAction === "start" ? "Starting…" : "Start visit"}
            </Button>
          </div>
        )}

        {note.viewer.isOfficeAdmin && !readOnly && !preppedAt && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              When phone prep is complete, mark this note ready for the nurse.
            </p>
            <Button size="sm" variant="outline" onClick={handleMarkPrepped} disabled={pendingAction === "prep"}>
              <CheckCircle2 /> {pendingAction === "prep" ? "Marking…" : "Ready for visit"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Document ── */}
      <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SectionRail
          items={railItems}
          activeKey={activeKey}
          done={progress.done}
          total={progress.total}
          nextUntouchedKey={readOnly ? null : firstUntouched}
          onJump={jumpTo}
        />

        <main className="min-w-0 space-y-5">
          {applicable.map((section) => (
            <SectionRenderer
              key={section.key}
              section={section}
              noteType={note.noteType}
              payload={sections[section.key] ?? {}}
              metaEntry={meta[section.key]}
              nurseId={note.nurseId}
              summary={summarizeSection(section.key, sections, meta)}
              collapsed={!!collapsed[section.key]}
              disabled={readOnly}
              correction={unresolvedBySection.get(section.key) ?? null}
              onPatch={(patch) => patchSection(section.key, patch)}
              onToggleCollapsed={() => toggleCollapsed(section.key)}
              onNotAssessed={(v) => handleNotAssessed(section.key, v)}
              onAttest={(v) => handleAttest(section.key, v)}
              onInteract={() => interact(section.key)}
            />
          ))}

          {note.noteType === "follow_up" && !readOnly && omitted.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add a section</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow-up notes omit these by default. Add one if today&apos;s visit needs it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {omitted.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={pendingAction === `add-${s.key}`}
                    onClick={() => handleAddSection(s.key)}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                  >
                    <Plus className="size-3.5" />
                    {s.paperNumber} · {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {note.viewer.canSign && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="text-sm font-medium">Done documenting?</p>
                <p className="text-xs text-muted-foreground">
                  Review the blank check, confirm times, and sign.
                </p>
              </div>
              <Button asChild>
                <Link href={`/notes/${note.id}/sign`} onClick={flushBeforeNav}>
                  Sign &amp; Finalize <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
