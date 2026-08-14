"use client";

// The single autosave mechanism for the note editor.
// Per-section: latest payload wins, debounced 800 ms, one in-flight
// save per section (changes made mid-save are queued and flushed on
// completion). A failed save retries once; a second failure raises a
// persistent error that clears on the next successful save anywhere.
// Failed payloads stay pending so "Retry now" (or the next edit)
// resends them.

import { useCallback, useEffect, useRef, useState } from "react";
import { updateFieldNoteSection } from "@/app/actions/field-notes";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 800;

export interface SectionAutosave {
  /** Record the latest payload for a section and (re)start its debounce timer. */
  queueSave: (sectionKey: string, payload: Record<string, unknown>) => void;
  /** Immediately resend everything still pending (the error-banner button). */
  retryAll: () => void;
  /** Await all pending saves (call before navigating to Sign/Preview). */
  flushAll: () => Promise<void>;
  state: AutosaveState;
  /** Sections with local changes not yet confirmed saved. */
  dirtyKeys: ReadonlySet<string>;
  lastSavedAt: Date | null;
  hasError: boolean;
}

export function useSectionAutosave(
  noteId: string,
  enabled: boolean,
  onSaved?: (sectionKey: string) => void
): SectionAutosave {
  const pendingRef = useRef(new Map<string, Record<string, unknown>>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlightRef = useRef(new Set<string>());
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<string>>(new Set());
  const [savingCount, setSavingCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasError, setHasError] = useState(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const markDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((prev) => {
      if (prev.has(key) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const flush = useCallback(
    async (key: string): Promise<void> => {
      // One save in flight per section; the completion handler re-flushes
      // if a newer payload arrived meanwhile.
      if (inFlightRef.current.has(key)) return;
      const payload = pendingRef.current.get(key);
      if (payload === undefined) return;
      pendingRef.current.delete(key);
      inFlightRef.current.add(key);
      setSavingCount((c) => c + 1);

      // A rejected server-action call (network drop — the field-nurse
      // normal case) must behave exactly like { success: false }: without
      // the try/finally, the key would stay marked in-flight forever and
      // every later edit to the section would be silently discarded.
      let success = false;
      try {
        let result = await updateFieldNoteSection(noteId, key, payload);
        if (!result.success) {
          // One immediate retry before surfacing the failure.
          result = await updateFieldNoteSection(noteId, key, payload);
        }
        success = result.success;
      } catch {
        success = false;
      } finally {
        inFlightRef.current.delete(key);
        setSavingCount((c) => c - 1);
      }

      if (success) {
        setLastSavedAt(new Date());
        setHasError(false);
        if (pendingRef.current.has(key)) {
          // Newer payload arrived while saving — send it now.
          void flush(key);
        } else {
          markDirty(key, false);
          onSavedRef.current?.(key);
        }
      } else {
        // Keep the payload pending (unless a newer one superseded it) so a
        // later edit or Retry resends; stays dirty and raises the banner.
        if (!pendingRef.current.has(key)) pendingRef.current.set(key, payload);
        setHasError(true);
      }
    },
    [noteId, markDirty]
  );

  const queueSave = useCallback(
    (key: string, payload: Record<string, unknown>) => {
      if (!enabled) return;
      pendingRef.current.set(key, payload);
      markDirty(key, true);
      const timers = timersRef.current;
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          void flush(key);
        }, DEBOUNCE_MS)
      );
    },
    [enabled, flush, markDirty]
  );

  const retryAll = useCallback(() => {
    for (const key of [...pendingRef.current.keys()]) void flush(key);
  }, [flush]);

  /** Send everything pending immediately (called before Sign/Preview navigation). */
  const flushAll = useCallback(async (): Promise<void> => {
    const timers = timersRef.current;
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    await Promise.all([...pendingRef.current.keys()].map((key) => flush(key)));
  }, [flush]);

  useEffect(() => {
    const timers = timersRef.current;
    const pending = pendingRef.current;
    return () => {
      // Debounced edits must not die with the component (SPA navigation
      // to the Sign screen would otherwise drop the last keystrokes) —
      // fire the saves before clearing the timers. Fire-and-forget: the
      // server action outlives the unmounted component.
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      for (const [key, payload] of pending) {
        pending.delete(key);
        void updateFieldNoteSection(noteId, key, payload).catch(() => {});
      }
    };
    // noteId is stable for the lifetime of the editor instance.
  }, [noteId]);

  const state: AutosaveState = hasError
    ? "error"
    : savingCount > 0 || dirtyKeys.size > 0
      ? "saving"
      : lastSavedAt
        ? "saved"
        : "idle";

  return { queueSave, retryAll, flushAll, state, dirtyKeys, lastSavedAt, hasError };
}
