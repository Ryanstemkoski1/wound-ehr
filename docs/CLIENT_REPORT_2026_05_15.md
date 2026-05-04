# WoundNote — Status Report

Prepared for The Wound Well Co. / May MD Inc.
May 15, 2026

---

## 1. Where we are

The structural work we agreed on at the April 27th meeting is in place. As of today:

- **The two front doors are live.** Admin staff land in Operations. Clinicians land in Clinical. Dual-role users (you, Alana, Erin) get a switcher in the top-right to flip between them — no second login.
- **Scheduling is fixed.** A clinician picker, a structured service-location dropdown, an optional time window, and a no-show reason field are all on the New Visit screen.
- **Patient intake is fixed.** Facility is required on creation. A Home Health Agency field is on the patient record. Facilities can now be classified by type (SNF, ALF, Home Health, etc.).
- **Consent is informational, not blocking.** A persistent banner appears on patient pages when consent is missing or incomplete, with a one-click link to capture it. Nothing gets blocked.
- **Billing is at the visit level.** CPT and ICD-10 selectors are on the visit detail page for admin/QA. Clinicians don't see Billing at all.
- **Reports support batch print.** The visit log lets you multi-select and download a day's worth of notes.
- **Copy Forward is live.** Clinicians can pre-fill from a prior visit instead of retyping.
- **Two PDF formats.** A short Clinical Note Summary and a full Clinical Note are both downloadable from the visit screen.
- **Incidents has a working form** (the old 404 link is gone).
- **Branding swap is done.** The product is now "WoundNote — by The Wound Well Co." with the forest/teal/cream palette and Inter / Nunito typography.

The clinical visit screen has also had a first round of WoundNote-style polish: the breadcrumb patient strip, the wound rail down the left side, collapsible cards, the attestation overlay, and the searchable dressing picker. This is shipped behind a per-tenant toggle so existing users see no change until we flip it on for them.

---

## 2. What's working under the hood

A few quiet items worth mentioning, because they will matter as we scale:

- **Audit logging is complete.** Every read and write of patient information is recorded for HIPAA.
- **Roles and permissions** are enforced in three independent layers — at the URL, at the server, and at the database. Nothing leaks across facilities.
- **Type safety and code quality checks** are green across the codebase.
- **Recent bug sweep:** I caught and fixed three small issues this week — the "Mark No-Show" button wasn't actually saving, the consent banner button was pointing at a missing page, and a couple of internal calendar status checks were inconsistent. All resolved.

None of those reached you because Alana hadn't gotten around to testing no-show yet, but better to fix them now than at the demo.

---

## 3. What Monday is about

The next big block of work is the **clinical visit screen** — taking Dr. May's WoundNote v10 sketch and translating it into the shipped product without doing a full rewrite. The current scaffolding is good, but a few decisions are still open. Monday is for closing those.

I want to keep the meeting focused on outcomes, not screens. Below is the short list of questions I need answered before development continues. I have a recommendation on each — push back where it doesn't fit your workflow.

### Questions for Monday

| # | Question | My recommendation |
|---|---|---|
| 1 | How should the visit screen be organized? One long scrollable form with collapsible sections, **four tabs (Encounter · Wound · History · Documents)**, or Dr. May's full 11-tab layout? | **Four tabs.** Gives the structure Dr. May wanted without the cognitive load of switching contexts 11 times per visit. |
| 2 | Past Medical History on the visit screen — link out to the patient record, or show it inline read-only? | **Inline read-only.** Always visible, never asks the clinician to leave the visit. |
| 3 | "Studies" — is that attaching documents (labs, imaging PDFs), or entering structured lab values, or skip for now? | **Attach documents.** Structured labs would need a separate build later. |
| 4 | "Orders" on the visit screen — is that the same as the Treatment Order Builder, or a separate concept? | Need your read on this. If they're the same thing, we're done. If separate, we need to talk about what "Orders" means. |
| 5 | "Timeline" — the wound rail already shows prior visits. Do you want a separate timeline view, or is the rail enough? | **The rail is enough**, unless you have a specific gap it doesn't fill. |
| 6 | "Records" — is that the same as Patient Documents we already have? | Need to confirm. |
| 7 | Prevention Interventions — chip-select pills, checkboxes, or free text? | **Chip-select pills.** Matches the v10 sketch. |
| 8 | Wound rail width — fixed, or drag-to-resize? | **Drag-to-resize**, small extra effort, big quality-of-life win. |
| 9 | Extra treatment categories (Eschar/Surgical, Custom, Graft) — build now or later? | **Later**, unless Dr. May considers one critical. |
| 10 | Google Chat embed — feasibility check came back with a HIPAA gap. Recommendation: drop or replace with a simple link to the chat web app. | Hard constraint from Google's side. I'll explain on the call. |
| 11 | Supply Requisition (Medline) — scope it later or drop it entirely? | Need your direction. |
| 12 | The "Today" section in the sidebar (unsigned count, supplies). Already live. Confirm it's working the way you wanted. | Confirm. |
| 13 | Attestation statement — exact wording for the "I attest…" checkbox. | This should be your clinical/legal language, not mine. Bring a draft. |
| 14 | The new palette and typography. Show in the room. | Confirm the look is what you wanted before we commit. |

The answers to 1, 2, 7, and 8 in particular will shape the next 4–5 weeks of work. Everything else is smaller scope.

---

## 4. Timeline outlook

Once decisions are in:

- **Phase 3 polish** (the clinical screen, finalized to your spec): 4–5 weeks
- **Phase 3 walkthrough** with you and Erin against a real visit: mid-cycle, not at the end. I'd rather catch the workflow issues at week 2 than week 5.
- **Buffer for real-world testing fallout:** 1–2 weeks, as planned in the April brief.

I don't expect surprises on the operational side — that work is settled. The clinical side is the one that benefits from iteration with the people actually using it.

---

## 5. What I need from you before Monday

Nothing heavy. Three things if you can:

1. **Dr. May:** Re-read your WoundNote v10 sketch and flag the two or three things you consider non-negotiable. I want to make sure those are in the v1 scope and not on the deferred list by accident.
2. **Alana:** A quick check on the new scheduling and no-show flow on staging. If anything feels wrong, even minor, send it before Monday so we can review together.
3. **Erin:** Same as Alana, but on the patient intake side — particularly the Home Health Agency field and the consent banner.

Anything you don't get to before Monday, we can cover live. The intent is to walk in with as few open questions as possible so we spend the time on direction, not catch-up.

See you Monday.

— Ryan
