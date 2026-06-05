# Phase 3 — Scope Update (post-meeting + Dr. May email)

**Date:** May 22, 2026
**Sources:** 5/22 client meeting transcript + Dr. May follow-up email (5/22)
**Purpose:** Capture what's confirmed, what's off-target, and what's new — so the next 4–6 weeks are scoped accurately.

---

## Confirmed (matches what we built)

- Left wound rail: wound list + recent visits → ✅ matches built version
- Collapsible / compact "click-click-click" layout → ✅ pattern matches
- Copy-forward across notes → ✅ exists (Phase 5), needs cross-template handling
- New Encounter entry from typeahead → ✅ exists, needs note-type selection step added

## Off-target (built but Dr. May said not needed)

- **E/M sub-sections (Vitals · CC/HPI · ROS · PE)** — built as Slice 5; Dr. May explicitly said *"you probably don't need the vitals tab, the chief complaint, review of systems, the physical exam"* (transcript ~11:37). Hide behind the existing `clinical_ux_v2` flag for now; revisit if billing requires it later.
- **Single-scroll layout (Option A)** — what's built today. He wants tab structure (see below).

## New / changed scope

### Layout — 2-tab structure with sub-sections
- **Tab 1: Wound Assessment** — wound type/measurements/features + Procedure Documentation + Treatment Order Builder all inside
- **Tab 2: Diagnoses + Studies + Notes + Orders** — ICD-10 picker, Study Order Form, additional clinical notes, orders
- Header bar with: copy-forward · download · print · sign (currently scattered)

### Note-type selector on entry
On opening a patient/visit, a pop-up asks which note type: Advanced Wound Care · G-Tube · Arobella (Debridement) · Patient Not Seen · etc. Routes to a sub-portal with the right modules. **This is the biggest architectural change** — see [PHASE3_NOTE_TYPE_DATA_MODEL.md](PHASE3_NOTE_TYPE_DATA_MODEL.md).

### Per-wound template granularity
A visit may have 5 wounds where the MD does Standard assessments on 3 and a nurse does Arobella on 1 — same visit, different templates per wound. The 8 existing templates need to merge behind one type-selector with template-driven module show/hide.

### Cross-clinician measurement consistency
A nurse should be able to defer to the senior clinician's measurements from the same visit week (Erin's ask). Patient-level copy-forward, not just visit-level.

### Submit gating
Clinician can't submit a visit until every wound has been addressed (or marked unable-to-assess).

### ICD-10 typeahead
Already baked in — `lib/billing-codes.ts` has the database. Just needs UI wiring in the new Tab 2. **No subscription required.**

### Wound add/delete from the left rail
Currently only available from the patient detail page; needs to surface in the wound rail inside the visit screen.

### Studies tab + Study Order Form
Net-new surface (labs, vascular studies, biopsies). Doesn't exist today.

### Single-page-per-wound "leave-behind" PDF
New PDF variant: one page per wound (or procedure) for facility staff to follow treatment orders. Sample format coming from Dr. May.

### Template access by provider type
Admin-configurable which templates each provider type can use (e.g. RNs can't access Grafting). Currently no such control.

## Permission gaps surfaced (audit findings — fix this sprint)

| Rule | State | Fix |
|---|---|---|
| Clinicians can't add patients | UI button shown + `createPatient` accepts | Hide button + `requireAdmin()` in createPatient + tighten RLS INSERT policy |
| Clinicians can't change patient status | `PatientDeleteButton` shown to all + `deletePatient` has no role check | Hide button + `requireAdmin()` in deletePatient + role-aware RLS UPDATE |
| Clinicians can't see billing | `<VisitBillingPanel>` leaks on every visit page; `field-permissions.ts:155` sets billing:`edit` for clinicians; CRUD actions skip role check | Gate `<VisitBillingPanel>` by `hasAdminEntitlement()`; set clinician billing to `none`; add role check to billing CRUD; tighten RLS |
| Clinicians see only assigned patients | `patient_clinicians` table exists but unused for patient list | Filter `getPatients`/`getPatient`/`searchPatientsForEncounter` by `patient_clinicians` for non-admin clinical users; add RLS predicate |

These are concrete, code-located, and well-scoped — a tidy ~2–3 days of work.

## Open / waiting on Dr. May

- Updated layout artifact (he's sending; referenced two Claude artifact URLs in his email)
- Sample of the single-page-per-wound PDF format
- Exact attestation statement wording
- Final list of which templates each provider type may access

## Estimated remaining effort

| Track | Estimate |
|---|---|
| Permission fixes (4 gaps above) | 2–3 days |
| Layout rework to 2-tab + header bar + wound add/delete in rail | 4–6 days |
| Note-type selector + template-driven module show/hide (data model — see linked doc) | 1.5–2 weeks |
| Per-wound template granularity (schema additions to debridement/grafting + junction table) | 4–6 days |
| Cross-clinician measurement deferral | 2–3 days |
| Submit gating + Studies tab + Study Order Form | 3–5 days |
| ICD-10 typeahead UI wiring | 1 day |
| Single-page-per-wound PDF | 2–3 days after Dr. May's sample lands |
| **Total** | **~4–6 weeks** (matches what Ryan committed to in the meeting) |
