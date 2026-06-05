# Phase 3 — Progress Report

**Week of:** May 22 → May 29, 2026
**For:** Friday 3pm review with Dr. May
**Prepared by:** Ryan

---

## This week

Design + audit week. The two reference artifacts you sent over the weekend were detailed enough to rework the data model around what you actually showed, which simplified some of what I had drafted previously. I also went through the four permission rules you flagged at last week's meeting in detail.

## Completed

- **Full review of both reference artifacts** (Clinical Interface; Procedure Documentation + Diagnostic Orders + Treatment Order Builder). Mapped every tab, every field, every chip against the existing data model. Notes captured in the architecture doc.
- **Permission audit — 4 rules from last meeting.** Verified each in code (UI gating + server enforcement + RLS). Identified concrete gaps in all four, with the fix line-of-code located. Plan in the meeting notes.
- **Architecture rework based on the artifacts.** The earlier draft had a junction-table approach for "different template per wound" — the artifact shows that's actually procedure tagging on a single per-wound assessment, which is significantly cleaner. Existing 8 specialized tables collapse to one `procedure_documentation` child of `assessments` with a `procedure_type` discriminator.
- **Treatment Order Builder design read.** Confirmed it's a 6-category wizard with sentence-builder templates (Open wound / Eschar / Compression-NPWT / Skin-moisture / Rash-dermatitis / Graft Tx / Custom). Significantly more sophisticated than the current chip list — rebuild scoped.
- **ICD-10 typeahead feasibility — confirmed.** The CPT/ICD-10 database is already in the codebase. No subscription required.
- **Updated scope and timeline.** Net 4–6 weeks remaining, in line with last week's commitment.

## Designed, ready for confirmation today

- **Data model:** `assessments.procedures_performed[]` tag + `procedure_documentation(assessment_id, procedure_type, payload)` table replacing the 3 procedure-specific tables. Additive migration, no data loss.
- **Visit-type selector at visit open:** Wound Care · Skilled Nursing · Skin Sweep · Patient Not Seen — routes to the right top-level form.
- **Tab structure:** the full 10 tabs from your artifact (Vitals / CC / ROS / PE / Wound Assessment / PMH-ICD10 / Studies / Clinical Notes / Rx Orders / Timeline). Confirming Vitals/CC/ROS/PE are optional per visit.
- **Permission fix plan for the four rules** — ~2–3 days to implement once confirmed.
- **Treatment Order Builder rebuild approach:** category wizard + `rendered_text` field per order (what the PDF prints).

## Where I'll make the call and want your red-line later

None of these are blocking — I'll build a reasonable v1 of each and you correct course when you see it:

- **Leave-behind PDF format** — I'll draft a single-page-per-wound layout from your artifact patterns (header + wound summary + rendered Treatment Order sentences + signatures) using the existing `@react-pdf/renderer` pipeline. You red-line when it's in front of you.
- **Attestation statement** — placeholder text on the sign dialog now; swap to your legal-approved wording when ready.
- **Feeding Tube Change + Urinary Catheter Change docs** — drafting streamlined forms from existing G-tube schema fields and standard catheter patterns. You red-line.
- **Provider-type procedure access** — shipping chips ungated by default + a simple admin UI for you to flip per credential, so you can tighten in 30 seconds when you have a moment to think it through.

## Roadmap — next 4–6 weeks

| Week | Track |
|---|---|
| **Week 1 (5/29 → 6/5)** | Permission fixes (4 rules) · ICD-10 typeahead UI · header function bar · wound add/delete in rail |
| **Week 2 (6/5 → 6/12)** | `procedure_documentation` migration · procedure chip → inline doc expansion · visit-type selector at open |
| **Week 3 (6/12 → 6/19)** | Treatment Order Builder wizard rebuild · `treatment_orders` table with sentence rendering |
| **Week 4 (6/19 → 6/26)** | Studies tab · PMH/ICD-10 tab · Clinical Notes tab · Rx Orders tab · Timeline tab |
| **Week 5–6** | Leave-behind PDF (after sample lands) · validation pass with you and Erin · flip the flag on for the pilot |

## Risks I'm watching

- The 6-category sentence-builder Treatment Order is the biggest single rebuild — needs the wizard structure right the first time.
- Procedure-tagging UX (chip → inline expansion) needs to feel snappy on phone, not modal-heavy. Worth a mid-week eyes-on check.
- FTC and UCC docs are unspecified — if you want them in v1 of Phase 3, I need fields this week to keep Week 2 on schedule.
