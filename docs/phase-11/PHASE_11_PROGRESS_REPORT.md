# Wound EHR — Phase 11 Update

**Last Updated:** March 16, 2026

---

## March 16, 2026 — Treatment Order Builder COMPLETE

### Phase 11.6: Treatment Order Builder — Done

All 8 sub-tasks completed in a single session. The Treatment Order Builder is now fully integrated into the clinical assessment workflow.

**What was built:**

| Component                         | Description                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Migration 00029**               | Added `wound_id` FK, `treatment_tab`, `cleanser`, `coverage`, `secondary_treatment` (JSONB), `generated_order_text` to `treatments` table               |
| **`lib/treatment-options.ts`**    | ~590 lines — all dropdown options for 4 tabs, TypeScript types (`TreatmentOrderData`, `TreatmentTab`), sentence builder functions per tab               |
| **`app/actions/treatments.ts`**   | ~356 lines — `createTreatment` (upsert), `updateTreatment`, `getTreatmentsByVisit`, `getTreatmentForWound`, `autosaveTreatmentDraft`, `deleteTreatment` |
| **`treatment-order-builder.tsx`** | 4-tab UI component — Topical, Compression/NPWT, Skin/Moisture, Rash/Dermatitis. Sentence builder with dropdowns, live preview                           |
| **Multi-wound form integration**  | Per-wound treatment state, saves alongside assessments on submit, per-tab FormData mapping                                                              |
| **Edit form integration**         | `AssessmentForm` now has `<TreatmentOrderBuilder>` with `existingTreatment` pre-loading from DB                                                         |
| **Visit detail display**          | Treatment Orders card shows per-wound order sentences with wound number, location, tab type                                                             |
| **PDF integration**               | Treatment orders included in wound progress PDF                                                                                                         |

**Bugs fixed during implementation:**

- Save guard was too restrictive (`if (orderText)` → `if (hasChanges)` via JSON comparison)
- Only topical tab data was sent regardless of active tab → added per-tab `switch` for correct FormData
- Silent failures on save → added `toast.error()` feedback

### Updated Priority Order

1. ~~Treatment Order Builder~~ ✅ DONE
2. Clinical summary PDFs (once templates arrive) ← **NEXT**
3. Facility access control (hide pending notes)
4. Mobile UI optimization
5. PDF printing enhancements
6. Final polish

---

## March 16, 2026 — Client Meeting Update

### New Feature: Treatment Order Builder

Dr. May presented a new treatment order concept during this meeting. This is a **tabbed form** that replaces the treatment order section from the old Aprima system. Instead of typing treatment orders from scratch, clinicians will pick options from dropdowns that auto-generate a readable order sentence.

**4 tabs:**

| Tab                    | How It Works                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Topical Treatment**  | Sentence builder: "Cleanse wound with [saline ▼], pad dry, loosely apply [treatment ▼] to wound bed, cover with [dressing ▼] every [N] day(s) and PRN" |
| **Compression / NPWT** | Pick one of 4 options (NPWT, UNNA boot, ACE wrap, multi-layer) + pressure/frequency                                                                    |
| **Skin / Moisture**    | Similar sentence builder with moisture barrier options + coverage (open air, hydrocolloid, film)                                                       |
| **Rash / Dermatitis**  | Cream/ointment selection + frequency (daily, every shift, etc.)                                                                                        |

Clinicians typically pick **one** tab per wound. They can add a secondary treatment line if needed. The generated sentence becomes the nursing order.

**Why it matters:** This is the missing piece of the clinical note. Right now the system does assessment (wound size, composition, etc.) but has no structured way to enter treatment orders. The `treatments` table already exists in the database — it just needs a UI.

**Estimated effort:** 5–7 days. This is now the **#1 priority** before the other remaining work.

### Other Meeting Takeaways

- **AI Notetaker:** Dr. May is interested ("very intriguing") — plans to test with Aaron
- **Recording bug:** Audio sometimes lost when navigating between screens. Known issue, will fix.
- **Weekly check-ins:** Dr. May wants 30-minute Monday meetings to control scope and track progress. Alana scheduling.
- **Timeline:** Ryan estimated 3–4 weeks remaining for all work (before the Treatment Order Builder was added)
- **Clinical summary PDFs:** Dr. May confirmed templates are coming (separate from this meeting)

### Updated Priority Order

1. **Treatment Order Builder** ← new, doing this first
2. Clinical summary PDFs (once templates arrive)
3. Facility access control (hide pending notes)
4. Mobile UI optimization
5. PDF printing enhancements
6. Final polish

---

## March 9, 2026 — AI Notetaker Complete

This was the #1 priority coming out of the last client meeting — and it was a big one. Building a real-time audio recording system that connects to AI for transcription and clinical note generation touched a lot of moving parts: browser audio APIs, secure file upload, cloud storage, two different AI models, background processing, real-time status updates, error recovery, and a full clinician review workflow.

**It's mostly ready for testing.** The core pipeline works end-to-end: record a visit → upload → AI generates a structured clinical note → clinician reviews and approves. That said, there are still a few improvements and edge-case fixes we want to button up over the next few days before we'd call it fully production-ready.

### How It Works (the short version)

1. Patient gives one-time recording consent (with signature — stored for compliance)
2. Clinician hits "Record" during the visit — sees a live waveform and timer
3. When done, the audio uploads to secure cloud storage (Supabase Storage, private bucket)
4. **Two AI models process the recording:**
   - **OpenAI Whisper** (`whisper-1`) — converts speech to text. This is the same model that powers most modern transcription tools. High accuracy, handles medical terminology well.
   - **OpenAI GPT-4 Turbo** — takes the raw transcript and generates a structured clinical note with sections for chief complaint, wound assessment, treatment, plan of care, and patient education.
5. Clinician reviews the AI-generated note. They can approve as-is, edit and approve, reject, or ask AI to regenerate.
6. Approved note is saved to the visit record. Full edit history is tracked.

**Time savings:** Estimated 10–15 minutes per visit (from ~20 min typing notes → ~5 min reviewing the AI draft).

### What Still Needs Work (next few days)

- A few UI polish items and edge-case handling
- Admin transcript management page (browse/search all transcripts)
- Final round of real-world testing with actual clinical recordings
- Production deployment prep (API key, storage bucket configuration)

### AI Cost

Very reasonable — roughly **$0.10–0.30 per visit**. At 300 visits/month that's about **$30–80/month** total. Breakdown:

- Whisper (speech-to-text): ~$0.06/visit
- GPT-4 Turbo (note generation): ~$0.05–0.20/visit

---

## Next Up: Phase 11.2 — PDF Clinical Summaries & Facility Access

Clinical summary templates are needed from Aaron/Erin. Once received:

- G-tube clinical summary PDF
- Wound care clinical summary PDF
- Facility access control (hide pending/unapproved notes from facility users)

Estimated time: **~3 days** once templates received. Facility access: **~1 day**.

## After That: Phases 11.3–11.5

The client is sending PDF form templates soon. We'll be building:

- G-tube clinical summary PDF
- Wound care clinical summary PDF
- Facility access control (hide pending/unapproved notes from facility users)

Estimated time: **~1.5 weeks** once templates received.

---

## Remaining Work

| What                        | Time Estimate | Notes                                                          |
| --------------------------- | ------------- | -------------------------------------------------------------- |
| Treatment Order Builder     | ~~1 week~~    | ✅ COMPLETE — Mar 16, 2026                                     |
| Clinical summary PDFs       | ~3 days       | G-tube + wound care summaries — awaiting templates             |
| Facility access control     | ~1 day        | Hide pending notes from facility users                         |
| Mobile UI optimization      | ~1.5 weeks    | Touch-friendly, offline support, bottom nav for phones/tablets |
| Printing & PDF enhancements | ~1 week       | Clinician signatures on PDFs, photo size options               |
| Final polish                | ~1 week       | Global search, notifications, admin tools, recording bug fix   |

**Target for everything:** April 24, 2026

---

## Suggested Talking Points for Client

- Treatment Order Builder is COMPLETE — 4-tab sentence builder, per-wound, saves/loads/displays/PDFs
- AI notetaker is working and ready for a live demo — let's schedule with Dr. May and clinicians
- PDF clinical summaries are next (once templates arrive from Aaron/Erin)
- Weekly Monday check-ins will help us stay on track and control scope
- Monthly AI cost will be minimal (~$30–80/month)
- Need to confirm production OpenAI API key before go-live
- Recording persistence bug is known and will be fixed
