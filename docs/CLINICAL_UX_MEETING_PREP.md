# Clinical UX/UI Review — Meeting Prep

**Meeting:** Monday May 18, 2026 (afternoon)
**Attendees:** Dr. May, Erin, Ryan
**Purpose:** Align on the granular clinical UX and UI decisions before Phase 3 development begins

---

## 1. Context

Phase 1 (surface split, role switcher, navigation) and Phase 2 (scheduling, intake, consent foundations) are complete. Phase 3 — the clinical visit experience revamp — is the next phase to build. This is the phase most directly tied to Dr. May's WoundNote v10 prototype.

Dr. May's email indicates he wants to review "the more granular aspects of the clinical UX and UI" and find "a middle ground" between the current plan and his initial v10 presentation. This meeting is the right moment to nail down those details before development begins, so Phase 3 is built right the first time.

From the 4/27 meeting, the agreed approach was: fold the missing clinical sections (vitals, chief complaint, ROS, exam) into the existing assessment screen as collapsible sections rather than carving the note into eleven separate tabs out of the gate. This meeting is an opportunity to pressure-test that decision with Dr. May and Erin before committing to it in code.

---

## 2. What Dr. May's v10 sketch proposed vs. the current plan

Use this table to drive the conversation. It maps every v10 item to a disposition and a specific question to resolve in the meeting.

| Dr. May's v10 item | Current plan (from 4/27) | Open question |
|---|---|---|
| 11 clinical tabs (Vitals, CC, ROS, PE, Wound, PMH, Studies, Notes, Orders, Timeline, Records) | **Modified** — fold Vitals, CC/HPI, ROS, PE as collapsible sub-sections inside the existing assessment screen; no 11-tab switch | This is the biggest divergence. Walk through it explicitly. |
| Left wound rail — color dots, prior visits list, resizable | **Planned** — fixed-width left column showing wounds + recent visits | Does he want resize? Does the fixed rail serve the workflow? |
| New Encounter typeahead modal in the header | **Planned** — patient search → DOS → Start Encounter | Any changes to the flow vs. what he sketched? |
| Patient topbar breadcrumb strip (name · MRN · DOB · facility · DOS · provider) | **Planned** | Any additional fields? |
| Collapsible wound assessment cards | **Planned** | Which sections should default to open vs. collapsed on first load? |
| Attestation checkbox → sign → locked overlay → Signed bar with addendum | **Planned** | Any specific language for the attestation statement? |
| Treatment Order Builder with searchable dressing picker | **Planned** — searchable cmdk popover replacing the flat `<select>` | Additional treatment categories (Eschar/Surgical, Custom, Graft) — phase 3 or deferred? |
| Prevention Interventions chips | **Planned** | Chip-select pills, checkbox list, or free text? Chip-select is preferred. |
| PMH (Past Medical History) tab | **Not in current scope** — PMH lives on the patient record | Link out to patient record from the visit, or inline read-only block? |
| Studies tab | **Not in current scope** | Is this attaching PDFs/photos, entering lab values, or both? |
| Orders tab | **Not in current scope** | Is Orders = Treatment Order Builder, or a separate concept? |
| Timeline tab | **Not in current scope** — wound rail covers prior visits | Is the rail sufficient, or does he want a separate timeline view? |
| Records tab | **Not in current scope** | Is Records = uploaded patient documents? |
| Today section in sidebar | **Phase 6** — planned but not Phase 3 | Confirm this can wait. |
| Google Chat side panel | **Spike complete** — HIPAA/BAA gap found | Present the finding; get explicit go/no-go before Phase 6. |
| Supply Requisition (Medline catalog) | **Deferred** — not scoped | Does he want this in v1? What does the Medline integration look like? |
| Copy Forward (pre-populate from prior visit) | **Phase 5** | Confirm priority. |
| Two PDF formats (Clinical Note Summary + Full Clinical Note) | **Phase 5** | Any specific content changes vs. the current PDF layout? |

---

## 3. The "11 tabs" question — proposed middle ground to present

This is the most important decision of the meeting.

### What Dr. May sketched
A full tab-bar across the top of the visit note: Vitals · Chief Complaint · ROS · Physical Exam · Wound Assessment · PMH · Studies · Notes · Orders · Timeline · Records. Each tab is a full-screen context switch.

### What the current plan proposes
Four collapsible sub-sections (Vitals, CC/HPI, ROS, PE) nested inside the existing assessment form, with the wound assessment cards below them. No tab-switching. The reasoning: reduce the cognitive overhead of navigating between tabs mid-assessment, keep all wound data visible without losing context.

### A middle ground worth proposing
Rather than either extreme (full 11 tabs vs. one flat scrollable form), propose a **four-tab grouping** at the top of the visit screen:

1. **Encounter** — Vitals · CC/HPI · ROS · PE (the E/M reimbursement data, all in one place)
2. **Wound(s)** — the collapsible wound assessment cards, one per wound
3. **History** — read-only PMH pulled from the patient record + prior visit summary
4. **Documents** — photos, uploaded files, records

Within each tab, use the collapsible card pattern rather than nested tabs. This gives Dr. May the structural separation he wanted for the clinical workflow (E/M vs. procedure documentation) without the full 11-tab complexity. It also maps to the two billing categories: E/M (Encounter tab) and Procedure (Wound tab).

**Bring a rough sketch or wireframe to the meeting to show this layout alongside the single-form alternative.**

---

## 4. Meeting agenda

Suggested order. Budget approximately 90 minutes.

### Part 1 — Walk through the current plan (20 min)

Using the 4/27 meeting notes and the current wireframes/sketches as reference, walk Dr. May through what Phase 3 is currently scoped to build:

1. Surface switcher (already live — show it)
2. New Encounter modal concept
3. Visit screen layout: topbar pill → wound rail (left) → assessment (right)
4. E/M sub-sections inside the assessment
5. Collapsible wound cards
6. Treatment Order Builder with dressing picker
7. Attestation → sign → locked overlay → Signed bar
8. How addendums surface after signing

### Part 2 — Decision points (50 min)

Go through the items below and record Dr. May's answer before leaving the room.

| # | Question | Options | Recommendation |
|---|---|---|---|
| D1 | Clinical layout structure | (A) Single scrollable form with collapsible sub-sections, (B) 4-tab grouping (Encounter · Wound · History · Documents), (C) Full 11-tab layout | Option B — best balance of structure and simplicity |
| D2 | PMH in the visit screen | (A) Link to patient record, (B) Read-only inline block from patient demographics, (C) Editable PMH per visit | Option B — most useful without adding schema complexity |
| D3 | Studies tab | (A) Attach PDFs/photos only, (B) Structured lab fields, (C) Defer | Need his answer — scope changes significantly between A and B |
| D4 | Orders tab | (A) Orders = Treatment Order Builder (same thing), (B) Separate orders concept | Need clarification before building anything |
| D5 | Timeline tab | (A) The wound rail's prior visits list is sufficient, (B) Separate timeline view needed | Option A unless he has a specific gap to fill |
| D6 | Records tab | (A) Records = patient documents section, (B) Something different | Confirm |
| D7 | Prevention Interventions | (A) Chip-select pills (multi-select), (B) Checkbox list, (C) Free text | Option A — matches v10 sketch |
| D8 | Wound rail resize | (A) Fixed width, (B) Drag-to-resize | Option B preferred — 1–2 days of work |
| D9 | Treatment tabs (Eschar/Surgical, Custom, Graft) | (A) Include in Phase 3, (B) Defer to Phase 5 | Defer unless he flags as critical path |
| D10 | Google Chat embed | Present spike finding: PHI/BAA gap; recommend (A) plain Gmail link, (B) drop entirely | Hard HIPAA constraint — no in-app Chat without Google BAA extension |
| D11 | Supply Requisition | (A) Scope and build in a later sprint, (B) Drop from v1 | Need specifics on what the Medline integration looks like |
| D12 | Today section in sidebar | (A) Phase 6 (as planned), (B) Move earlier | Confirm Phase 6 is acceptable |
| D13 | Attestation statement wording | Open — bring a draft text for him to approve | Clinical/legal language should be his |
| D14 | Visual design direction | Open — show the forest/teal/cream palette + Inter/Nunito typography plan | Get explicit approval before Phase 6 branding |

### Part 3 — Next steps (20 min)

- Confirm which D1–D14 decisions are resolved vs. need follow-up
- Agree on the exact scope of Phase 3 based on decisions above
- Estimate: if D1(B), D2(B), D7(A), D8(B) are approved, Phase 3 is roughly 4–5 weeks of development
- Set a review date for a working prototype walkthrough (targeting mid-Phase 3, not end)

---

## 5. Estimated effort by decision outcome

| Item | Effort |
|---|---|
| Single scrollable form (D1-A) | Baseline — what's already scoped |
| 4-tab grouping instead (D1-B) | +2–3 days |
| Full 11-tab layout (D1-C) | +2–3 weeks — not recommended for v1 |
| PMH read-only inline block (D2-B) | +1 day |
| Studies as document attach (D3-A) | +1 day |
| Studies as structured lab fields (D3-B) | +3–5 days + schema migration |
| Prevention Interventions chips (D7-A) | +1 day |
| Wound rail drag-to-resize (D8-B) | +1–2 days |
| Treatment tabs (D9-A — include in Phase 3) | +3–4 days |
| Today section moved to Phase 3 (D12-B) | +2 days |

Total range for Phase 3 with D1(B), D2(B), D7(A), D8(B) selected: approximately **4–5 weeks** of development, followed by a working prototype walkthrough with Dr. May and Erin before launch.

---

## 6. What to send Dr. May before the meeting

A short pre-read email (2–3 paragraphs):
1. Confirm the purpose: this is a planning discussion to align on Phase 3 before development starts, not a product review
2. Ask him to re-review his v10 sketch and flag the 2–3 things he considers non-negotiable for v1
3. Flag the tab-structure question (D1) specifically — it will shape the entire visit screen architecture, so getting his instinct before the meeting saves time

Keep the pre-read light. Do not attach the full project plan or this document.
