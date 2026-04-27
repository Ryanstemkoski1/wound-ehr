# Client Feedback Synthesis — Meeting Prep

**Date:** April 27, 2026
**Sources:**

- `feedback 1.txt` — Alana Roberts, Practice Manager (operational/admin restructure)
- `feedback 2.txt` + `woundnote-v10.jsx` — Dr. Alvin May, Owner / Medical Director (UX target prototype)

---

## Who's Asking for What

| Source            | Role                     | Document type                                                                  | Tone                               |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------ | ---------------------------------- |
| **Alana Roberts** | Practice Manager         | Operational/admin restructure (numbered action items, priority order included) | Tactical, specific, ready-to-build |
| **Dr. Alvin May** | Owner / Medical Director | Reference prototype (`woundnote-v10.jsx`) + feature overview                   | Visionary, "here's the target UX"  |

These are **complementary, not conflicting**. Alana = how the admin side must work. Dr. May = how the entire product should look and feel + what the clinical note must contain. Most importantly: **Alana's #1 priority (split admin/clinical login) is the same architectural pivot Dr. May's prototype implies** (the prototype shows a clinician-only single-user view).

---

## The Single Biggest Theme

**Today's app is a one-size-fits-all view. They want two product surfaces with one identity layer.**

- Today: every user sees the dashboard, wounds, signatures, AI transcripts, billing, etc.
- Wanted: a **Role-Switcher** post-login. One credential per person. Default landing depends on primary role; dual-role users (Erin Torres, Alana, Dr. May) toggle.
- This needs to land **first** — every other item depends on it.

---

## Mapping Alana's Items to Our Codebase

### 1. Role-based login & navigation (foundation)

- We already have `tenant_admin / facility_admin / user` (via `lib/rbac.ts`) and credentials enum `RN/LVN/MD/DO/PA/NP/CNA/Admin`. **What's missing is a "view mode" concept distinct from RBAC** — a person can be both `MD` (clinical) and `tenant_admin` (operations).
- Recommended ask: introduce a per-user **`view_mode` preference** ("admin" | "clinical") + middleware that gates entire route trees + a header switcher.
- Sidebar today is one component → needs to render two distinct nav sets. Currently lives in `components/layout/`.

### 2. Calendar — single scheduling path

- **2A (clinician assignment in modal)**: We have `patient_clinicians` (Phase 10). The "New Visit" modal needs an `assigned_clinician_id` dropdown. Estimate: small.
- **2B (one path)**: Audit any "schedule visit" entry points outside the calendar. There's at least one path inside patient detail.
- **2C (Schedule Follow-Up)**: New action on completed/cancelled/no-show visits. Pre-populates patient + facility + clinician.
- **2D (No-Show reason)**: New required column on `visits` (likely `no_show_reason TEXT` + `no_show_reason_other TEXT`). Migration needed.
- **2E (visit window)**: Today we likely have a single `visit_date` + time. Add `end_time` or `time_window` enum. Migration needed.
- **2F (Service Location dropdown)**: This is a **billing-correctness** item. Today's `location` is free text. Must become a structured CMS Place-of-Service (POS) code dropdown. Map: 12 = Home, 31 = SNF, 32 = Nursing Facility, 13 = Assisted Living, 33 = Custodial Care. **This is non-negotiable** because it drives Practice Fusion claim mapping. Migration: rename column or add `service_location_code` enum.
- **2G (clinician filter behavior)**: Default "All Clinicians" for admins, hide filter entirely for clinicians (force them to their own).

### 3. Patient management

- **3A (CSV restrict)**: Hide on clinical view.
- **3B (Facility required at creation)**: Today facility may be optional. Add server-side validation in `app/actions/patients.ts createPatient`.
- **3C (Home Health Agency field)**: New column on `patients` (FK to a new `agencies` table OR reuse `facilities` with type discrimination — see 6B). Migration needed. Drives read-only access for external agency users.
- **3D (Two consent statuses)**: We already have `patient_consents`. Today it's a single consent flow. They want it modeled as two distinct statuses with **persistent banners** but **non-blocking** behavior. Worth confirming: do they want two rows in `patient_consents` (typed), or two separate columns/tables? My recommendation: discriminator column on `patient_consents` (`consent_type ENUM('treat_authorization','procedure_consent')`).

### 4. Billing

- **4A (CPT at visit level, admin-facing)**: We have `billings` table with CPT codes. Today CPT entry is buried in clinical workflow. Need an admin-side CPT picker on the visit record.
- **4B (ICD-10 on patient + visit)**: Same — surface diagnoses outside clinical notes. Patient-level diagnosis list = new concept, possibly a new table `patient_diagnoses`.
- **4C (Export CSV)**: Already have it, keep it.
- **4D (Hide billing from clinical view)**: Trivial nav gating once role-switching exists.

### 5. Reports

- **5A (keep three tabs for admin)**: Visit Log, Clinician Activity, Facility Summary — keep.
- **5B (Medical Records tab)**: Move to clinical or defer.
- **5C (Batch print)**: This is **also Dr. May's request** (his prototype Reports view has Select All / batch Download / Print). High-value, multi-select + zip-of-PDFs. We have per-PDF generation already (`app/actions/pdf.ts`). New action: `generateBatchPdf(visitIds[]) → ZIP`. Was on our backlog as Phase 11.4.3.

### 6. Admin panel

- **6A**: No changes.
- **6B (Facility Type)**: New column `facility_type ENUM('snf','assisted_living','home_health_agency','internal')`. Drives 2F default + 3C agency access.
- **6C (Pre-assign role on invite)**: Today `user_invites` has role; verify the invite UI surfaces it at send time, not after.

### 7. Hide/defunctionize (UI cleanup, low-effort)

All gated by Item 1. Once role-switching exists, these are nav-config flips.

---

## Mapping Dr. May's Prototype

The prototype is **not a "rewrite this UI" mandate** — it's the design language and feature target. Treat it as: "here is the product I want you to converge on." Key signals:

### Brand & visual language

- WoundNote brand: deep forest green `#0d2b24`, mint accent `#3ecfaa`, cream surface, Inter + Nunito, bandaged-apple logo.
- Our current brand: teal/amber/red on zinc, "Wound EHR" name.
- **Question to ask in the meeting**: are we rebranding to "WoundNote by The Wound Well Co." with the new palette and logo? This affects every component, the marketing site, and the favicon. Treat as **separate workstream** — not blocking.

### App-shell layout

- Persistent 200px left sidebar with: Search, Navigate (pill nav), Today (Unsigned badge with live count, Supplies), Chat (5 contacts).
- Pill-style active states.
- Our sidebar is more conventional. The Today + Chat panels are **net-new modules** (Chat especially — that's a real feature, not styling).

### Clinical note — the big one

The prototype's clinical note has **11 tabs** in a single full-screen view:

1. Vitals
2. Chief Complaint
3. ROS (10 organ systems)
4. Physical Exam
5. **Wound Assessment** (the meat)
6. PMH/ICD-10
7. Studies
8. Clinical Notes
9. Orders
10. Timeline
11. Records

**Today we have**: visit form + assessments + treatments + photos + signatures, but NOT structured Vitals, ROS, PE, PMH/ICD-10, Studies (labs), Orders, or Timeline as first-class tabs. **This is a major scope expansion** — full encounter documentation, not just wound documentation.

### Wound Assessment tab — collapsible sections

1. Type & Measurements (pre/post-debridement L×W×D, auto-calc area)
2. Wound Features (bed, edges, periwound, exudate, infection)
3. Healing Status (trajectory, granulation %, epithelialization %, last-measured banner)
4. **Procedure Documentation tabbed**: Sharp Debridement, Biologic Graft Application, Arobella Treatment — **with auto-generated clinical note text** per procedure
5. Treatment Order Builder tabbed by wound type (Open Wound, Eschar/Surgical, Compression/NPWT, Skin/Moisture, Graft Tx, Custom)
6. Prevention Interventions (6 categories, chip layout)
7. Assessment Notes (free text)

**We already have**: assessment forms, debridement assessment form, grafting assessment form, treatment builder. **Gap**: auto-generated narrative text per procedure, prevention interventions section, the unified "collapsible sections under one tab" UX.

### Sign & Addendum workflow

- Sign → attestation modal → note locks with **semi-transparent overlay**.
- Addendum types: Correction, Clarification, Additional Finding, Late Entry. Original-reference field. Attestation. Displayed below tab content.
- We already have signature workflow + addendum notifications. **Gap**: typed addendums, locked-note overlay UX, original-reference field.

### Print / report output

Two formats, both rendered as HTML in iframes for print preview:

1. **Clinical Note Summary** — one page per wound, two-column layout matching their existing template.
2. **Full Clinical Note** — one page per wound, 9 sections, ICD-10 table + short/long-term goals + provider attestation block.

Today our PDFs are React-PDF. **Question**: does Dr. May want HTML/iframe print preview specifically (so he can edit before printing), or is PDF acceptable as long as the **layout** matches his templates exactly? This is a critical answer — affects whether `app/actions/pdf.ts` gets restructured or just gets new templates.

### Supporting modals

- **New Encounter modal** (typeahead patient search, auto-fill facility, disabled-until-valid confirm) ↔ matches Alana 2A
- **Supply Requisition** (Medline catalog, qty controls, line totals, submit toast) — **net-new feature**
- **Copy Forward** (select prior visit → pre-populate current note) — **net-new, high-value clinical efficiency**
- **Patient Profile** (demographics, insurance, placement, **facesheet viewer/uploader**) — facesheet is a new doc type
- **Prior Visit Popup** (view-only historical) — partially exists

---

## Where Alana and Dr. May Reinforce Each Other

| Alana's item                                      | Dr. May's prototype                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2A — Clinician assignment in New Visit modal      | "New Encounter modal — typeahead patient search, auto-fill facility, disabled until patient + facility selected" |
| 2C — Schedule Follow-Up button                    | "Copy Forward — select prior visit, pre-populates current note fields" (related concept)                         |
| 4A/4B — CPT/ICD at visit level                    | "PMH / ICD-10" tab + Orders tab                                                                                  |
| 5C — Batch print in Reports                       | Reports page in prototype: Select All / batch Download / Print + note preview popup                              |
| 6B — Facility Type field                          | Facility shown contextually throughout prototype                                                                 |
| 7 — Hide signatures/transcripts/wounds from admin | Prototype clinician view never shows admin-only items                                                            |

---

## Proposed Workstream Grouping

I'd present this to them as **5 buckets** rather than 1 long list:

### Bucket A — Foundation (must precede everything)

- A1. Role-switcher (view_mode preference) + dual-nav rendering
- A2. Hide-from-admin nav cleanup (Wounds, Incidents, Signatures, AI Transcripts) — falls out of A1 nearly free
- A3. Hide-from-clinical: Billing module, CSV export on Patients, calendar clinician filter
- _Unblocks_: every other bucket

### Bucket B — Calendar & Scheduling (Alana's operational priority)

- B1. Clinician assignment in New Visit modal (2A)
- B2. Service Location structured dropdown (2F) — **billing-blocker, do early**
- B3. Schedule Follow-Up button (2C)
- B4. No-Show reason field (2D) + migration
- B5. Visit time window (2E) + migration
- B6. Single scheduling path enforcement (2B)

### Bucket C — Patient & Billing data model

- C1. Facility required at patient creation (3B)
- C2. Home Health Agency field on patient (3C) + new agency model
- C3. Two-status consent model + persistent banners (3D)
- C4. CPT picker at visit level for admin (4A)
- C5. ICD-10 picker at patient + visit level (4B)
- C6. Facility Type field (6B)

### Bucket D — Reports

- D1. Batch print / select-all in Visit Log (5C) — **also Dr. May**
- D2. Move Medical Records tab to clinical view (5B)

### Bucket E — Clinical UX convergence (Dr. May's prototype)

This is where you need to push back gently on scope. Break this out into sub-phases:

- E1. **Brand refresh** — palette, logo, fonts (separate effort, can run in parallel)
- E2. **Encounter expansion** — Vitals, ROS, PE, PMH/ICD-10, Studies, Orders, Timeline tabs (this is a Phase 13-sized lift, 4–8 weeks)
- E3. **Wound Assessment unification** — collapsible sections under one tab, auto-generated procedure narrative, Prevention Interventions
- E4. **Print templates** — match exact two-column / 9-section layouts; decide HTML-iframe vs React-PDF
- E5. **Net-new modules**: Copy Forward, Supply Requisition, in-app Chat, Today panel with live unsigned count, Facesheet upload
- E6. **Sign workflow polish** — locked-note overlay, typed addendums

---

## Questions to Get Answered in the Meeting

These are the unknowns that, if left ambiguous, will burn weeks:

1. **Brand**: Are we rebranding to "WoundNote by The Wound Well Co." with the green/mint palette? If yes — when? Big bang or gradual?
2. **Scope of clinical expansion**: Do you want full E&M-style encounter notes (Vitals/ROS/PE/Studies/Orders) **now**, or keep current wound-focused workflow and expand later?
3. **Print output**: Is React-PDF acceptable if the layouts match exactly, or must we produce HTML/iframe print previews like the prototype?
4. **Chat module**: Is this a real ask (build messaging) or aspirational/inspirational?
5. **Supply Requisition**: Real procurement workflow with vendor (Medline) integration, or internal request log?
6. **Home Health Agency access**: Read-only login for external agency staff = new tenancy model. Do we need it in v1?
7. **Practice Fusion integration**: Alana's 2F implies billing data flows out to Practice Fusion. Is there an actual export/API integration, or is this manual today?
8. **Consent model (3D)**: Two rows in `patient_consents` discriminated by type, or two separate workflows entirely?
9. **Facility Type vs Home Health Agency**: Is HHA a `facility_type` value or a separate entity? (Affects schema.)
10. **Existing data**: Any production data yet? Will migrations 00037+ need backfill scripts for `service_location_code`, `facility_type`, `assigned_clinician`?
11. **Erin / Alana / Dr. May dual-role accounts**: Confirm exact list of dual-role users + which view they default to on login.
12. **Removal of "Wounds" nav item**: Confirm — wound list is reachable only via patient chart? Currently `/dashboard/wounds` is a top-level page. OK to delete the route, or keep it for clinicians?
13. **Incidents page**: 404 today. Do they want it built (we have `incident_reports` in the schema!) or removed entirely?
14. **AI Transcripts admin**: Hide from admin nav per 1C — but admin transcript management was a Phase 11.5.4 deliverable. Confirm: hide from operations admins, keep for tenant admins?

---

## Risk Flags

- **Scope creep**: Dr. May's prototype is essentially a different product (full encounter EHR + chat + supply ordering). If you accept it as a literal spec without phasing, the timeline triples.
- **Brand change ripple**: Rebranding mid-build affects screenshots, docs, signature templates, PDF headers, marketing site. Plan it as one focused sprint.
- **Migration 00036 still unapplied** + at least 4–6 new migrations coming out of this feedback. Sequence carefully.
- **Practice Fusion claim mapping**: Alana flagged 2F (Service Location) as billing-correctness. If wrong codes have been flowing out, may need backfill / audit.
- **Compliance**: New consent model (3D) and locked-note overlay (Dr. May) intersect with HIPAA audit trail. Audit log we just built handles this — confirm in meeting.

---

## Suggested Meeting Flow (60 min)

1. **(5 min) Confirm understanding** — read back the "two-view product, one identity" thesis. Get explicit "yes, that's right."
2. **(10 min) Brand decision** — answer Q1 first; everything visual depends on it.
3. **(15 min) Scope of E2 (clinical expansion)** — push for phased delivery. Aim to land on "Phase 13 = Bucket A + B + C + D, Phase 14 = E2/E3, Phase 15 = E4/E5."
4. **(15 min) Walk through Alana's items** — confirm all "hide" items, validate Service Location codes list, lock the consent model decision.
5. **(10 min) Q&A from the question list above**.
6. **(5 min) Next steps** — written scope doc + timeline by [date].

---

## What to Walk Out With

- ✅ Confirmed Phase 13 scope (Buckets A + B + C + D, ~3–5 weeks)
- ✅ Brand decision: yes/no/when
- ✅ E-bucket phasing agreement (E1–E6 sequenced, not bundled)
- ✅ Answers to Q3 (print), Q4 (chat), Q5 (supply), Q6 (HHA access) — these single-handedly determine 50% of the remaining timeline
- ✅ Confirmation that Migration 00036 + cron jobs can be applied this week independently
- ✅ Permission to start Bucket A immediately (role-switcher) since it's a prerequisite for everything
