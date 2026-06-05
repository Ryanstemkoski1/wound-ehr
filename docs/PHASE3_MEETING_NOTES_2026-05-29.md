# Phase 3 — Meeting Notes (Ryan's Prep)

**Meeting:** Friday May 29, 3:00 pm · Dr. May + (Erin?)
**Time budget:** ~45 min
**Goal:** Confirm the architecture against his two artifacts, lock the permission fix plan, leave with a clear 4–6 week runway.

---

## 1. Opening (2 min)

*"I went through both reference artifacts in detail this week and reworked the data model around what you actually showed me — it's cleaner than what I had drafted before. I also caught a few permission gaps from last week's feedback and have fixes lined up. Want to walk you through what I learned, get a few confirmations, and we're clear to build."*

---

## 2. Recap (1 min)

Phase 1–2 shipped (surface split, scheduling, intake, consents). Phase 3 in progress: built first-pass behind `clinical_ux_v2` flag (still off). This week was design correction based on his artifacts.

---

## 3. Permission audit — what I found and fixed plan (4 min)

*"I went and verified the four rules you mentioned. Wanted to flag what I found."*

| Rule | What I found | Fix |
|---|---|---|
| Clinicians can't add patients | UI button + server both accept | Hide + admin guard + tighten RLS |
| Clinicians can't discharge patients | Delete button shown, no role check | Hide + admin guard |
| Clinicians can't see billing | Top-level gated, but VisitBillingPanel still shows on every visit page | Gate the panel + clinician field-permission to none |
| Clinicians only see assigned patients | `patient_clinicians` table exists but isn't used to filter the list | Filter `getPatients` by `patient_clinicians` for clinical users |

~2–3 days total, planned for next week.

---

## 4. Architecture confirmations from his artifacts (15 min) — the main event

Open: [`docs/PHASE3_NOTE_TYPE_DATA_MODEL.md`](PHASE3_NOTE_TYPE_DATA_MODEL.md) — share screen.

### What I read from the artifacts

- **10-tab layout confirmed:** Vitals · CC · ROS · PE · Wound Assessment · PMH/ICD-10 · Studies · Clinical Notes · Rx Orders · Timeline. Vitals/CC/ROS/PE present but optional per visit.
- **Per-wound differentiation is procedure tagging, not separate templates.** Inside Wound Assessment, procedures are chips that expand inline documentation. One assessment per wound; multiple procedures can tag onto it.
- **Visit-type selection is the higher-level decision.** Wound Care vs Skilled Nursing vs Skin Sweep vs Patient Not Seen — these are different visit-level forms entirely, not procedures.

### Confirmations to get from him today

**Q1 — Procedure tagging interpretation.** *"My read: procedures inside Wound Assessment are chips that expand a doc block per procedure (Sharp Debridement, Biologic Graft, Arobella). One wound = one assessment with N procedures tagged. Is that right?"*

**Q2 — Feeding Tube Change + Urinary Catheter Change.** *"I see them as chips in the Procedures list but didn't see a documentation form for them. What fields do you want captured for each?"*

**Q3 — Vitals / CC / ROS / PE — optional or always-on?** *"You mentioned in the meeting these aren't strictly needed, but your artifact keeps them as tabs. Optional/skippable per visit, or always there?"*

**Q4 — Treatment Order Builder.** *"This is a real wizard in your artifact — 6 categories with sentence-builder templates that output natural-language orders ('Cleanse \[location\] wound with \[cleanser\] and pat dry…'). Big change from what's built today, which is a flat chip list. Confirming we go with the wizard."*

**Q5 — Leave-behind PDF.** *"My read: the PDF renders the Treatment Order Builder sentences as the orders facility staff follows. Plus the wound summary above. One page per wound. Right interpretation?"*

**Q6 — "Sign Off" healing status chip.** *"I see Sign Off as a healing-status chip alongside Improving/Stable/Deteriorating/Healed/Declined. Is that a separate state, or does it mean 'this wound is done, archive it'?"*

**Q7 — Skilled Nursing and Skin Sweep visit types.** *"These don't fit inside a Wound Care visit's procedure list — they're whole different visit types. Keeping them as their own visit-type pick at visit open. Confirming."*

---

## 5. Smaller confirmations (5 min)

- **ICD-10 typeahead — already there.** Built-in database, no subscription, ~1 day to wire the search.
- **Header function bar** (Copy Forward · Download · Save Draft · Sign Note) — confirmed from artifact, will consolidate.
- **Wound add/delete from rail** — confirmed (`+ ADD` affordance in his design).
- **Copy Forward visit picker modal** — confirmed shape.
- **Read-only historical visit modal** — confirmed pattern.

---

## 6. Items I'm making the call on (2 min)

*"None of these are blocking — I'll draft a v1 and you tell me where to adjust:"*

- **Leave-behind PDF** — building a single-page-per-wound layout from your artifact patterns; you red-line.
- **Attestation statement** — placeholder text on the sign dialog now; swap when you have legal-approved wording.
- **FTC / UCC docs** — drafting from existing G-tube schema and standard catheter patterns; you red-line.
- **Provider-type procedure access** — shipping chips ungated by default + a simple admin UI you can flip per credential later.

---

## 7. Timeline + next checkpoint (3 min)

*"Roughly the same 4–6 weeks envelope as I committed to last week, just redistributed:"*

- Week 1 (5/29 → 6/5): permission fixes · ICD-10 typeahead · header function bar · wound add/delete in rail
- Week 2 (6/5 → 6/12): `procedure_documentation` migration · procedure chip expansion · visit-type selector at open
- Week 3 (6/12 → 6/19): Treatment Order Builder wizard rebuild · `treatment_orders` table
- Week 4 (6/19 → 6/26): Studies tab · PMH/ICD-10 tab · Clinical Notes tab · Rx Orders tab · Timeline tab
- Week 5–6: leave-behind PDF (after his sample) · validation pass with him and Erin · flip flag on for pilot

Next checkpoint: **next Friday, June 5, 3pm** — demo of permission fixes + ICD-10 typeahead + visit-type selector + wound add/delete.

---

## 8. Close

*"I'll send a recap with the decisions we made today. Anything else on your mind before we wrap?"*

---

## After the meeting — capture in `PHASE3_MEETING_RECAP_2026-05-29.md`

- Answers to Q1–Q7
- Any scope changes from his answers
- Any new asks he raised mid-meeting
- The four items I committed to drafting (PDF · attestation · FTC/UCC · provider access) so they don't slip
