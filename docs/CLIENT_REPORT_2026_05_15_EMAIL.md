**Subject:** WoundNote status + 14 questions for Monday

**To:** Dr. May, Alana, Erin
**From:** Ryan
**Date:** May 15, 2026

---

Hi all,

Quick status before Monday's meeting, plus the list of decisions I need from you so we can keep moving on the clinical screen.

## Where we are

The structural work we agreed on April 27 is shipped:

- **Two front doors are live.** Admin lands in Operations, clinicians in Clinical. Dual-role users (you, Alana, Erin) get a top-right switcher — no second login.
- **Scheduling is fixed.** Clinician picker, structured service-location dropdown, optional time window, no-show reason field on New Visit.
- **Patient intake is fixed.** Facility required on creation. Home Health Agency field on the patient record. Facilities can be classified by type (SNF, ALF, Home Health, etc.).
- **Consent is informational.** A persistent banner appears when consent is missing, with a one-click capture link. Nothing is blocked.
- **Billing is at the visit level.** CPT and ICD-10 selectors on the visit detail page for admin/QA. Clinicians don't see Billing at all.
- **Batch print** in the visit log.
- **Copy Forward** is live — pre-fill from a prior visit instead of retyping.
- **Two PDF formats** downloadable from the visit screen: short Clinical Note Summary and full Clinical Note.
- **Incidents** has a working form (the old 404 link is gone).
- **Branding swap done.** "WoundNote — by The Wound Well Co.", forest/teal/cream palette, Inter / Nunito.

The clinical visit screen also has a first round of WoundNote-style polish — breadcrumb patient strip, wound rail down the left, collapsible cards, attestation overlay, searchable dressing picker — shipped behind a per-tenant toggle so existing users see no change until we flip it on.

## Under the hood

A few quiet items that matter as we scale:

- **Audit logging is complete.** Every read/write of patient info is recorded for HIPAA.
- **Roles and permissions** are enforced in three layers — URL, server, and database. Nothing leaks across facilities.
- **Type safety and code quality checks** are green across the codebase.
- **Recent bug sweep:** I caught and fixed three small issues this week — the "Mark No-Show" button wasn't actually saving, the consent banner button pointed at a missing page, and a couple of internal calendar status checks were inconsistent. All resolved. None reached you because Alana hadn't gotten to no-show testing yet — better to fix now than at the demo.

## What Monday is about

Translating Dr. May's WoundNote v10 sketch into the shipped product without a full rewrite. Scaffolding is good; a few decisions are still open. I want to keep the meeting on outcomes, not screens.

### Questions for Monday (with my recommendation)

1. **Visit screen layout** — one long scrollable form, four tabs (Encounter · Wound · History · Documents), or Dr. May's 11-tab layout? → **Four tabs.** Structure Dr. May wanted without 11 context switches per visit.

2. **Past Medical History on the visit screen** — link out to the patient record, or inline read-only? → **Inline read-only.** Always visible, never asks the clinician to leave the visit.

3. **"Studies"** — attaching documents (labs, imaging PDFs), structured lab values, or skip for now? → **Attach documents.** Structured labs would need a separate build later.

4. **"Orders"** on the visit screen — same as the Treatment Order Builder, or separate? → Need your read. If same, we're done. If separate, we need to talk about what "Orders" means.

5. **"Timeline"** — the wound rail already shows prior visits. Separate timeline view, or is the rail enough? → **The rail is enough**, unless you have a specific gap it doesn't fill.

6. **"Records"** — same as Patient Documents we already have? → Need to confirm.

7. **Prevention Interventions** — chip-select pills, checkboxes, or free text? → **Chip-select pills.** Matches the v10 sketch.

8. **Wound rail width** — fixed, or drag-to-resize? → **Drag-to-resize.** Small effort, big quality-of-life win.

9. **Extra treatment categories** (Eschar/Surgical, Custom, Graft) — build now or later? → **Later**, unless Dr. May considers one critical.

10. **Google Chat embed** — feasibility check came back with a HIPAA gap. → Recommendation: drop, or replace with a simple link to the chat web app. Hard constraint from Google's side. I'll explain on the call.

11. **Supply Requisition (Medline)** — scope it later or drop entirely? → Need your direction.

12. **"Today" section in the sidebar** (unsigned count, supplies) — already live. → Confirm it's working the way you wanted.

13. **Attestation statement** — exact wording for the "I attest…" checkbox. → This should be your clinical/legal language, not mine. Bring a draft.

14. **The new palette and typography.** → Show in the room. Confirm the look before we commit.

Answers to **1, 2, 7, and 8** in particular will shape the next 4–5 weeks. Everything else is smaller scope.

## Timeline outlook

Once decisions are in:

- **Phase 3 polish** (clinical screen, finalized to your spec): 4–5 weeks
- **Phase 3 walkthrough** with you and Erin against a real visit: mid-cycle, not at the end. I'd rather catch workflow issues at week 2 than week 5.
- **Buffer for real-world testing fallout:** 1–2 weeks, as planned in the April brief.

The operational side is settled. The clinical side benefits from iteration with the people actually using it.

## What I need from you before Monday

Nothing heavy — three things if you can:

1. **Dr. May:** Re-read your WoundNote v10 sketch and flag the two or three things you consider non-negotiable. I want those in v1 scope, not on the deferred list by accident.
2. **Alana:** Quick check on the new scheduling and no-show flow on staging. If anything feels wrong, even minor, send it before Monday.
3. **Erin:** Same as Alana, but on patient intake — particularly the Home Health Agency field and the consent banner.

Anything you don't get to, we can cover live. The intent is to walk in with as few open questions as possible so we spend the time on direction, not catch-up.

See you Monday.

— Ryan
