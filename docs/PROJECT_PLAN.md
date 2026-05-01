# Wound EHR — Project Specification, Current Status & Phased Development Plan

**Document version:** 1.0
**Date:** May 1, 2026
**Author:** Engineering (Ryan)
**Audience:** The Wound Well Co. / May MD Inc. (Dr. Alvin May, Alana, Erin Torres, ops team) and engineering
**Status:** Authoritative plan replacing prior phase-11 docs as the entry point for the next development cycle.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Specification Overview](#2-project-specification-overview)
3. [Current State of the System (May 1, 2026)](#3-current-state-of-the-system-may-1-2026)
4. [Synthesized Client Feedback](#4-synthesized-client-feedback)
5. [New Phase Requirements (functional + non-functional)](#5-new-phase-requirements)
6. [Gap Analysis — Spec vs. Reality](#6-gap-analysis)
7. [Implementation Plan (architectural design decisions)](#7-implementation-plan)
8. [Phased Development Plan](#8-phased-development-plan)
9. [Timeline](#9-timeline)
10. [Risks, Assumptions, and Open Questions](#10-risks-assumptions-and-open-questions)
11. [Definition of Done & Acceptance Criteria](#11-definition-of-done)
12. [Appendices](#12-appendices)

Companion documents:

- [docs/CURRENT_STATE.md](CURRENT_STATE.md) — exhaustive codebase audit (RBAC, schema, modules)
- [docs/REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) — every line item from Alana, Dr. May, and the 4/27 meeting mapped to a backlog ID and target phase

---

## 1. Executive Summary

### 1.1 What Wound Well Co. has today

Wound EHR is a multi-tenant, HIPAA-aware Next.js 16 / Supabase application that supports the entire wound‑care workflow used by The Wound Well Co. and May MD Inc.: patient intake, scheduling, eight specialized clinical assessment forms (standard wound, debridement, grafting, skilled nursing, G‑tube, multi‑wound, skin sweep, patient‑not‑seen), photo capture, electronic signatures with addendum support, an office‑inbox approval workflow, AI‑assisted transcription (Whisper + GPT‑4) gated by two-stage consent, billing with credential‑validated CPT/ICD‑10 codes, three reports, and PDF generation. The schema has 31 tables with 75+ RLS policies and credential‑driven row and field permissions.

### 1.2 What the 4/27 client feedback and meeting changed

- **Strategic shift**: stop adding clinical surface area; **strip the UI down** to "muscle memory" simplicity. Anything that does not serve a daily user is **defunctionalized** (hidden), not deleted.
- **Two distinct front doors**: an **Admin / Operations** experience (scheduling, intake, billing oversight, reports, admin panel) and a **Clinical** experience (own calendar, own patients, wounds, notes). Dual‑role users (Erin, Alana, Dr. May) get **one login** with a **role switcher**, not two accounts.
- **Scheduling is the operational center**: one path to create a visit, mandatory clinician assignment, mandatory structured service‑location codes, mandatory no‑show reason, an optional time window, and a one‑click follow‑up.
- **Billing alignment with Practice Fusion**: CPT and ICD‑10 must be selectable at the visit level (not buried in clinical notes); billing module is **hidden** from clinicians entirely.
- **Reports**: keep Visit Log, Clinician Activity, Facility Summary; defer or move Medical Records; **add multi‑select batch print/PDF**.
- **Admin**: pre‑assign role at invite; classify facilities by type; tighten consents to two persistent statuses (Authorization to Treat, Procedure Consent) with **non‑blocking persistent banners**.
- **Clinical UX (Dr. May)**: the WoundNote v10 prototype is a **UX north star**, not a rewrite mandate. Engineer to **incrementally adopt** layout, modal, and workflow ideas (typeahead New Encounter, collapsible Wound Assessment cards, treatment builder, sign/addendum overlay, Google‑style sidebar) **on top of** the existing data layer. Branding rename to "WoundNote by The Wound Well Co." and palette update will happen alongside.
- **Workflow for delivery**: Ryan refines user levels and ships the foundational role split first, then runs a session with Alana / Erin / Yestinian (admin flow), followed by a session with Dr. May / Erin (clinical flow), then iterates module by module in patient‑journey order (intake → scheduling → clinical → notes/billing).

### 1.3 What this document delivers

A single source of truth that (a) describes the product as it exists, (b) restates what the clients asked for in unambiguous engineering language, (c) locks down the architectural decisions needed before code is written, and (d) lays out a six‑phase delivery plan with acceptance criteria and a timeline.

---

## 2. Project Specification Overview

### 2.1 Product vision

WoundNote is the operational and clinical EHR for The Wound Well Co. / May MD Inc., a SNF‑based wound‑care provider group. It is purpose‑built — not a generalized EHR — and optimizes for two outcomes:

1. **Operational throughput** — admin staff can schedule, intake, document service location, and route notes to billing with zero friction and zero free‑text fields that break downstream Practice Fusion mapping.
2. **Defensible clinical documentation** — clinicians produce billable, signed, addendable wound‑care notes that capture E/M reimbursable elements (vitals, ROS, exam, assessment, plan) plus wound‑specific procedure detail (debridement, grafting, NPWT, Arobella, etc.) without leaving the app or duplicating data already in PCC/Practice Fusion.

### 2.2 Users and personas

| Persona                         | Login type                       | Examples                                             | Primary workflows                                                                                              |
| ------------------------------- | -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Tenant Admin**                | Admin (with optional credential) | Erin Torres                                          | All admin functions across all facilities; signature audit; AI transcripts oversight; facility CRUD            |
| **Operations / Office Admin**   | Admin                            | Alana, intake/QA staff, "the gal who does the notes" | Schedule visits, intake patients, assign clinicians, manage consents, run reports, batch print, manage invites |
| **Facility Admin**              | Admin (facility‑scoped)          | Per‑facility liaison                                 | Same as Operations Admin but limited to one facility                                                           |
| **Clinician (full scope)**      | Clinical                         | Dr. May (MD), NPs, PAs, DOs                          | Own calendar, own patients, wound assessment, sign notes, addendums                                            |
| **Clinician (limited scope)**   | Clinical                         | RNs, LVNs, CNAs                                      | Same as above with credential‑restricted procedures and required patient signature on visits                   |
| **Dual role**                   | Switcher                         | Erin, Alana, Dr. May                                 | One login; role switcher in top nav toggles between Admin and Clinical surfaces                                |
| **Read‑only external (future)** | Agency                           | Home health agencies                                 | Read‑only access to their assigned patients only                                                               |

### 2.3 Scope (in)

- Patient intake, demographics, consents, documents
- Facility & clinician administration
- Calendar‑centric scheduling with structured fields
- Eight specialized wound/clinical assessment forms
- Wound photography (private, RLS‑gated)
- Electronic signatures (provider, patient, witness) with addendum workflow
- AI transcription (consent‑gated) → clinician‑editable draft note
- CPT/ICD‑10 coding at the visit level with credential validation
- Reports: Visit Log, Clinician Activity, Facility Summary, batch print
- Office Inbox approval workflow with correction requests
- PDF generation (per‑visit summary and full clinical note)
- Audit logging for PHI access and signature events

### 2.4 Scope (out — explicitly)

- **Full general‑purpose EHR**: no labs ordering integration in v1, no e‑prescribing, no in‑app revenue cycle (claims, denials, recoupments live in Practice Fusion / billing software).
- **Public patient portal**: no patient‑facing login.
- **Telehealth video**: out for now (visit_type already supports `telemed` flag for documentation only).
- **In‑app messaging duplicating Google Chat** — feedback was explicit: do not replicate Chat as a writable surface that fragments communication. _(See §10 for the conditional embed option.)_
- **Generic notifications fan‑out (SMS)**: deferred.

### 2.5 Compliance constraints

- HIPAA: PHI access logged via `audit_logs`; signatures immutable; addendums are append‑only; AI processing requires a separate explicit consent with BAA.
- Multi‑tenancy: every PHI table is RLS‑scoped via `tenants` → `facilities` → `user_facilities`.
- Patient signature: automatically required when the signing clinician's credential is RN or LVN (`requires_patient_signature`).
- Photos: stored in private Supabase Storage buckets; signed URLs only.

### 2.6 Tech stack (locked)

Next.js 16.0.7 (App Router, RSC default) · React 19.2 · TypeScript strict · Tailwind v4 (`@theme`) · shadcn/ui (new‑york) · Supabase (Postgres + Auth + Storage) · `@supabase/ssr` · `react-hook-form` + `zod` · `@react-pdf/renderer` · React Big Calendar · Lucide · Resend (email) · OpenAI Whisper + GPT‑4.

### 2.7 Branding

- **Product name**: _WoundNote by The Wound Well Co._ (rename from "Wound EHR")
- **Palette**: deep forest `#0d2b24`, mint `#3ecfaa`, mint dark `#2db885`, cream surface `#eef5f2`, gText `#1f2d2a`
- **Typeface**: Inter (UI) + Nunito (display)
- **Logo**: bandaged‑apple mark from The Wound Well Co.
- **Aesthetic target**: "Google Workspace for clinical" — clean surfaces, card‑based layout, pill navigation with right‑edge active indicators, soft shadows.

---

## 3. Current State of the System (May 1, 2026)

> This section is a high‑level dashboard. Full file‑by‑file detail is in [docs/CURRENT_STATE.md](CURRENT_STATE.md).

### 3.1 What works today

| Capability                                                                       | Status                | Notes                                                                                               |
| -------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| Auth (email/password, invite, reset)                                             | ✅ Complete           | Supabase Auth, `accept-invite`, `forgot-password`, `confirm-email`, `resend` flows                  |
| Multi‑tenant RBAC (3 roles × 8 credentials)                                      | ✅ Complete           | `lib/rbac.ts`, `lib/credentials.ts`, `lib/field-permissions.ts`                                     |
| Facility scoping via `user_facilities`                                           | ✅ Complete           | RLS enforced                                                                                        |
| Patient CRUD with facility required                                              | ✅ Complete           | `app/actions/patients.ts`                                                                           |
| Wound CRUD                                                                       | ✅ Complete           | `app/actions/wounds.ts`                                                                             |
| 8 assessment forms                                                               | ✅ Complete           | Standard, Debridement, Grafting, Skin Sweep, G‑Tube, Multi‑Wound, Skilled Nursing, Patient‑Not‑Seen |
| Photos (private bucket, RLS)                                                     | ✅ Complete           | Migration `00033_private_wound_photos.sql`                                                          |
| Signatures (provider/patient/witness, draw/type/upload, IP captured server‑side) | ✅ Complete           | `app/actions/signatures.ts`                                                                         |
| Addendum workflow with office review                                             | ✅ Complete           | `wound_notes` + `addendum_notifications`                                                            |
| AI transcription pipeline (Whisper → GPT‑4)                                      | ✅ Complete           | Two‑stage consent gate, cost tracking                                                               |
| Billing CPT/ICD‑10 with credential validation                                    | ✅ Partial — see §3.2 | Codes selectable, but only inside billing form, not at visit creation                               |
| Office Inbox approval workflow                                                   | ✅ Complete           | Draft → sent_to_office → needs_correction/approved → signed                                         |
| Reports: Visit Log, Clinician Activity, Facility Summary                         | ✅ Complete           | Filters: date range, facility, clinician, status                                                    |
| PDF generation with photo preferences                                            | ✅ Complete           | `app/actions/pdf.ts`, `pdf-cached.ts`                                                               |
| Calendar (React Big Calendar, day/week, my‑patients filter)                      | ✅ Complete           | `app/actions/calendar.ts`                                                                           |
| Persistent recorder bar                                                          | ✅ Complete           | `lib/recording-context.tsx`                                                                         |
| Audit logging for PHI access                                                     | ✅ Complete           | `audit_logs` table; `auditPhiAccess()`                                                              |
| User preferences (PDF photo size, page size)                                     | ✅ Complete           | Migration `00032_user_preferences.sql`                                                              |
| Critical security & perf migrations                                              | ✅ Complete           | `00034_critical_security_fixes.sql`, `00035_high_severity_hardening.sql`, `00036_perf_indexes.sql`  |

### 3.2 What is partial or stubbed

| Capability                                                    | Status                          | Detail                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Incidents module                                              | ⚠️ Stub                         | `incident_reports` table exists; **nav links to `/dashboard/incidents/new` which 404s**; no `app/actions/incidents.ts` |
| Medical Records report tab                                    | ⚠️ Partial                      | Fourth tab present in nav but scope not implemented                                                                    |
| Clinician assignment at visit creation                        | ⚠️ Schema only                  | `visits.clinician_id` column exists; **not surfaced in the New Visit modal**                                           |
| No‑show reason                                                | ❌ Missing                      | Status can be `no-show` but no reason field/enum                                                                       |
| Service location codes                                        | ❌ Missing                      | `visits.location` is **free text**; breaks Practice Fusion mapping                                                     |
| Visit time window (start/end or AM/PM)                        | ❌ Missing                      | Single timestamp only                                                                                                  |
| Facility type classification                                  | ❌ Missing                      | `facilities` has no `facility_type` column                                                                             |
| Home Health Agency on patient                                 | ❌ Missing                      | No HHA field separate from facility                                                                                    |
| Persistent consent banners (Auth to Treat, Procedure Consent) | ❌ Missing                      | Consents exist but no surface‑level banner enforcement                                                                 |
| Batch print / multi‑select in Reports                         | ❌ Missing                      | No multi‑select UI; no batch PDF endpoint                                                                              |
| Patients CSV export                                           | ⚠️ Unverified / role‑restricted | If present, must be admin‑only                                                                                         |
| Role‑aware navigation (admin vs. clinical surfaces)           | ⚠️ Partial                      | One nav today; admin section conditionally rendered. Need a true split with role switcher.                             |
| Role switcher for dual‑role users                             | ❌ Missing                      | No UI                                                                                                                  |
| Notifications module                                          | ⚠️ Unknown                      | `app/actions/notifications.ts` exists; UI surface incomplete                                                           |
| Visit creation outside calendar                               | ⚠️ Inconsistent                 | Multiple entry points; must converge on one shared modal                                                               |
| Settings (timezone, default facility, theme)                  | ⚠️ Limited                      | Only PDF prefs today                                                                                                   |

### 3.3 Documentation state

The `docs/` directory was missing prior to this document. README references to `docs/SYSTEM_DESIGN.md`, `docs/PROJECT_STATUS.md`, and `docs/phase-11/` are dangling. This plan + companion files re‑establish the documentation baseline.

---

## 4. Synthesized Client Feedback

### 4.1 Sources

- **Email — Alana, 4/27 (admin/non‑clinical view)**: 7 sections + a priority order; focused on stripping the UI for ops and on calendar/billing/reports clean‑up.
- **Email — Dr. Alvin May, 4/27**: WoundNote v10 React JSX prototype (~268 KB, single file) describing branding, layout, 11 clinical tabs, collapsible wound assessment cards, sign/addendum overlay, and two PDF output formats.
- **Meeting transcript — 4/27**: clarifies _intent_. The prototype is a **direction**, not a contract. Priority is functional separation and ops simplification first; clinical UI evolves incrementally.

### 4.2 Reconciled meeting decisions (binding)

These supersede individual email items where they conflict:

1. **Do not rewrite from the prototype.** Use the existing app's data layer; adopt prototype UX patterns incrementally.
2. **Defunctionalize (hide), don't delete.** Anything that doesn't serve daily users gets removed from nav but kept in code/DB so it can be re‑enabled.
3. **Order of work follows the patient journey**: (a) admin foundation + role split → (b) intake + scheduling → (c) clinical workflow → (d) notes/billing → (e) reports/print → (f) clinical UX polish & branding.
4. **One login, multiple surfaces.** Dual‑role users use a role switcher in the top nav.
5. **Calendar feedback "schedule only from calendar" is softened**: visits can be created from inside a patient record too, **but they must invoke the same shared modal/form** — no second form, no different fields.
6. **Google Chat embed is a "creature comfort," not a v1 deliverable.** Investigate API feasibility; keep behind a feature flag for internal Wound Well staff only. Do not build a parallel writable chat.
7. **Branding rename + palette update is not blocked**, but it ships alongside Phase 6 (UX polish), not at the start.
8. **The "gal who does the notes" is an Admin user**, not a separate role tier.
9. **Workflow training cadence**: after Ryan refactors user levels (~1 week), schedule a Mon 11 AM session with Alana/Yestinian (admin), then with Dr. May/Erin (clinical), then iterate weekly.

### 4.3 What we are _not_ doing (per meeting)

- Not building a generic billing replacement (Practice Fusion stays as the system of record for claims).
- Not adding chat as a first‑class authoring surface that competes with Google Chat.
- Not blocking visit creation/note saving when consents are missing — banner only.
- Not over‑restructuring the clinical note into 11 separate tabs immediately; keep the existing assessment‑centric model, fold in vitals/CC/HPI fields where E/M billing requires them.

---

## 5. New Phase Requirements

Each requirement is tagged with a stable ID (`R-###`) used in [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md). Format: **ID — Requirement — Source — Phase**.

### 5.1 Foundation: identity, roles, navigation

- **R-001** Implement a true split between an **Admin/Operations surface** and a **Clinical surface**, each with its own sidebar and routes. — _Alana §1A; Meeting §1._ — **Phase 1**
- **R-002** Implement a **role switcher** (top‑nav dropdown or pill) for users assigned both Admin and Clinical capabilities. Switch must update the active surface without re‑authentication and must persist across navigation. — _Alana §1B; Meeting §1._ — **Phase 1**
- **R-003** Re‑map the existing 3‑role × 8‑credential matrix into two effective **surface entitlements**: `admin_surface`, `clinical_surface`. A user can hold one or both. Tenant Admins always hold both. — _Meeting §1._ — **Phase 1**
- **R-004** **Hide from the Admin surface**: Wounds (top‑level), Incidents (until built), Signatures (clinical), AI Transcripts (unless a defined admin use case). — _Alana §1C, §7._ — **Phase 1**
- **R-005** **Hide from the Clinical surface**: Billing module entirely; Reports → restricted to clinician's own activity; Admin section. — _Alana §1C, §4D, §5B._ — **Phase 1**
- **R-006** **Remove Incidents nav entirely** (currently 404). Incident reporting deferred to a later phase. — _Alana §7._ — **Phase 1**
- **R-007** Provide **per‑surface dashboards**: Admin dashboard surfaces today's visits, unsigned notes, pending corrections, missing consents; Clinical dashboard surfaces own visits, own unsigned notes, own draft transcripts. — _Meeting §dashboard tweaks._ — **Phase 1**

### 5.2 Calendar & scheduling (operational center)

- **R-010** Add **Assigned Clinician** dropdown (active users with clinical credentials, optionally facility‑scoped) to the New Visit modal; required field. — _Alana §2A; Meeting (only schedule‑related ask Ryan agreed to outright)._ — **Phase 2**
- **R-011** **One canonical scheduling modal**, reachable from the calendar's "New Visit" button **and** from the patient record. Both entry points open the same component with the same fields and the same server action. — _Alana §2B (softened by meeting)._ — **Phase 2**
- **R-012** Add **Schedule Follow‑Up** action to completed/cancelled/no‑show visits. Pre‑populates patient, facility, and clinician; admin only confirms date/time. — _Alana §2C._ — **Phase 2**
- **R-013** Add **mandatory No‑Show Reason** when a visit's status is set to `no-show`. Dropdown: _Patient Hospitalized · Patient Declined · Scheduling Error · Facility Closed · Other (free text)_. Persist to a new `visits.no_show_reason` column + free‑text `no_show_reason_detail`. — _Alana §2D._ — **Phase 2**
- **R-014** Visit **time window**: replace single timestamp with `start_time`, optional `end_time`, and an optional `time_window` enum (_Morning / Afternoon / Evening / Specific_). Backwards‑compatible default = Specific. — _Alana §2E._ — **Phase 2**
- **R-015** Replace `visits.location` free text with **Service Location** structured dropdown driven by a new `service_locations` lookup table (codes 11 Office, 12 Home, 31 SNF, 32 Nursing Facility, 33 Custodial Care, 34 Hospice, 13 Assisted Living, 99 Other). Required. Old `location` retained for migration as `service_location_other_detail`. — _Alana §2F._ — **Phase 2**
- **R-016** Calendar default for Admin = "All Clinicians" filter visible; for Clinical = filter hidden, scoped to self via server enforcement (defense in depth). — _Alana §2G._ — **Phase 1/2**

### 5.3 Patient management

- **R-020** Patients list: **Export to CSV** restricted to Admin surface. Hide button for clinicians; server action checks surface entitlement. — _Alana §3A._ — **Phase 1**
- **R-021** **Facility required at patient creation** with explicit Zod validation, inline error message, and a backfill check that flags existing patients with null facility (zero expected, but verify). — _Alana §3B._ — **Phase 2**
- **R-022** Add **Home Health Agency** field on patient record (FK to a new `home_health_agencies` table, distinct from `facilities`). Optional at creation; required for HHA‑sourced patients. Drives future read‑only HHA portal. — _Alana §3C._ — **Phase 2**
- **R-023** Implement **two persistent consent statuses** per patient: _Authorization to Treat_ (payer auth) and _Procedure Consent_ (clinical). Both rendered as a sticky banner on visit & note pages when missing or expired. **Banner only — never blocks save.** — _Alana §3D; Meeting "non‑blocking."_ — **Phase 2**

### 5.4 Billing

- **R-030** Surface **CPT code dropdown at the visit level** (admin‑facing), pre‑loaded with the existing `lib/billing-codes.ts` set; admin/QA can assign without opening a clinical note. — _Alana §4A._ — **Phase 4**
- **R-031** Add **searchable ICD‑10 selector at the patient and visit levels**, not only inside the clinical note. — _Alana §4B._ — **Phase 4**
- **R-032** Retain Billing CSV export with date / facility / clinician filters; admin only. — _Alana §4C._ — **Phase 4**
- **R-033** Hide Billing module entirely from Clinical surface (route guard + nav). — _Alana §4D._ — **Phase 1** (nav) / **Phase 4** (route guard verification)

### 5.5 Reports

- **R-040** Retain Visit Log, Clinician Activity, Facility Summary on Admin surface. — _Alana §5A._ — **already complete; verify gating in Phase 1**
- **R-041** Move/defer **Medical Records** tab: hide from Admin surface; reconsider as part of clinical PDF print workflow. — _Alana §5B._ — **Phase 1** (hide) / **Phase 5** (decide)
- **R-042** **Batch print** in Visit Log: multi‑select rows, "Print Selected" / "Export Selected to PDF" using existing `pdf-cached.ts` infrastructure. — _Alana §5C._ — **Phase 5**

### 5.6 Admin panel

- **R-050** Retain Users, Facilities, Invites placement. — _Alana §6A._ — **no work**
- **R-051** Add **Facility Type** to facilities: _Home Health Agency · SNF · Assisted Living · Internal_ (enum). Drives default service location code (R‑015) and future agency‑access (R‑022 portal). — _Alana §6B._ — **Phase 2**
- **R-052** Invites: **pre‑assign role + credential** at the time the invite is sent (already supported in `inviteUser()` — verify UI surfaces the selectors and persists correctly so users land in the right surface on first login). — _Alana §6C._ — **Phase 1** (verify) / **Phase 2** (any UI gap)

### 5.7 Clinical (Dr. May)

- **R-060** Adopt the **WoundNote breadcrumb + patient topbar pill** layout for the open‑visit screen (logo, ← Home › Clinical Note · Patient · Facility; patient name/MRN/DOB/insurance/facility/DOS/provider). — _Dr. May §Clinical Note._ — **Phase 3**
- **R-061** Adopt **collapsible Wound Assessment cards** (Type & Measurements, Wound Features, Healing Status, Procedure Documentation tabs, Treatment Order Builder, Prevention Interventions, Assessment Notes). Use existing assessment data model; UI is the change. — _Dr. May §Wound Assessment Tab._ — **Phase 3**
- **R-062** Add **left wound rail** (resizable) showing wound list (color dots, healing status indicators) and prior visits list. — _Dr. May._ — **Phase 3**
- **R-063** Add a **New Encounter typeahead modal** (patient search ≥2 chars, auto‑fill facility, disabled confirm until patient + DOS selected) as the canonical clinician entry point into a visit. — _Dr. May._ — **Phase 3**
- **R-064** **Sign Note → attestation modal → locked overlay → Signed bar with Add Addendum** (Correction · Clarification · Additional Finding · Late Entry). Reuse existing signatures + addendum tables. — _Dr. May._ — **Phase 3**
- **R-065** Add minimal **E/M reimbursable fields** (Vitals, Chief Complaint/HPI, ROS, Physical Exam) as **optional sub‑sections inside the existing assessment screen** — not as 11 separate tabs in v1. Driven by Dr. May / Practice Fusion billing requirements. — _Dr. May; Meeting (don't overhaul)._ — **Phase 3**
- **R-066** **Treatment Order Builder** with category tabs (Open Wound, Eschar/Surgical, Compression/NPWT, Skin/Moisture, Graft Tx, Custom) and dressing selector popup. Backed by `treatments` table. — _Dr. May._ — **Phase 3**
- **R-067** **Copy Forward** action: select prior visit → pre‑populate current note's assessment & treatment fields. — _Dr. May._ — **Phase 5**
- **R-068** **Two PDF formats**: _Clinical Note Summary_ (one page per wound) and _Full Clinical Note_ (long form, sections appear only on relevant pages); addenda append as page‑break pages. Adapt existing `@react-pdf/renderer` pipeline. — _Dr. May._ — **Phase 5**

### 5.8 Branding & UX polish

- **R-070** Rename product to **WoundNote by The Wound Well Co.**; update logo, favicon, page titles, email templates. — _Dr. May._ — **Phase 6**
- **R-071** Apply WoundNote palette + Inter/Nunito typography globally via Tailwind `@theme`. — _Dr. May._ — **Phase 6**
- **R-072** Sidebar redesign: 200 px persistent left rail, pill‑right active states, Today section (Unsigned badge with live count, Supplies). — _Dr. May._ — **Phase 6**

### 5.9 Conditional / deferred

- **R-080** **Google Chat embed**: feasibility spike using Google Chat REST API. If feasible, expose as a right‑rail panel **only** for users on `*@thewoundwellco.com` and behind a tenant feature flag. Do not duplicate as a writable surface. — _Dr. May; Meeting._ — **Phase 6 spike, ship later if green‑lit**
- **R-081** **Incidents module**: implement `app/actions/incidents.ts`, page component, and a simple incident form using existing `incident_reports` table. Deferred until clinical phases are done. — _Alana (defer)._ — **Phase 5+**
- **R-082** **Read‑only HHA agency portal**: gated by R‑022 + R‑051. — **Phase 6+**
- **R-083** **PCC integration** to pull vitals/PMH/meds rather than hand‑enter. — **Future**

### 5.10 Non‑functional requirements

- **NFR‑1** Performance: New Visit modal P50 < 200 ms server time; calendar month view P95 < 1.2 s for 500 events.
- **NFR‑2** Accessibility: WCAG 2.1 AA on Admin surface (keyboard, contrast, focus); maintain existing skip links.
- **NFR‑3** Security: every new server action passes through `getCurrentUser` + role/credential check + RLS; CSV exports stream and never load full PHI in client memory.
- **NFR‑4** Audit: every new PHI read/write surface added in Phases 1–6 calls `auditPhiAccess()`.
- **NFR‑5** Backwards compat: any schema change is **additive** (new column / new table / new enum value) with a default — no destructive migrations on production data.
- **NFR‑6** Feature flagging: each phase ships behind `tenant_features` flag rows so changes can be staged per‑tenant during testing.

---

## 6. Gap Analysis

### 6.1 Schema gaps

| Gap                               | New artifact                                                                                                                                                            | Migration                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| No facility type                  | `facilities.facility_type ENUM('home_health_agency','snf','assisted_living','internal','other')`                                                                        | `00037_facility_type.sql`        |
| Free‑text visit location          | `service_locations` lookup table + `visits.service_location_id FK` + `visits.service_location_other_detail TEXT`                                                        | `00038_service_locations.sql`    |
| No no‑show reason                 | `visits.no_show_reason ENUM(...)` + `visits.no_show_reason_detail TEXT`                                                                                                 | `00039_no_show_reason.sql`       |
| No time window on visits          | `visits.start_time TIMESTAMPTZ`, `visits.end_time TIMESTAMPTZ NULL`, `visits.time_window ENUM('morning','afternoon','evening','specific')` (backfill from `visit_date`) | `00040_visit_time_window.sql`    |
| No HHA on patients                | `home_health_agencies` table + `patients.home_health_agency_id FK NULL`                                                                                                 | `00041_home_health_agencies.sql` |
| No surface entitlements           | `user_surface_entitlements(user_id, surface)` view or column on `user_roles`                                                                                            | `00042_surface_entitlements.sql` |
| No tenant feature flags           | `tenant_features(tenant_id, flag, enabled, payload JSONB)`                                                                                                              | `00043_tenant_features.sql`      |
| No persistent consent state cache | `patient_consent_status` materialized view (auth_to_treat_status, procedure_consent_status, expires_at) for fast banner rendering                                       | `00044_consent_status_view.sql`  |

All migrations are additive; no `DROP COLUMN` on existing columns until the data is verified migrated.

### 6.2 Server‑action gaps

| Action file                 | Required additions                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `calendar.ts` / `visits.ts` | Accept `clinicianId`, `serviceLocationId`, `startTime`, `endTime`, `timeWindow`, `noShowReason`, `noShowReasonDetail`          |
| `visits.ts`                 | `scheduleFollowUp(prevVisitId, date, time)`                                                                                    |
| `patients.ts`               | `homeHealthAgencyId` field; CSV export action with role gate                                                                   |
| `facilities.ts`             | `facilityType` field                                                                                                           |
| `admin.ts` (invites)        | Verify role+credential persistence; default surface entitlement                                                                |
| `incidents.ts`              | **New**: full CRUD (deferred to Phase 5+)                                                                                      |
| `home-health-agencies.ts`   | **New**: list/create/edit                                                                                                      |
| `consents.ts`               | **New** or extend `signatures.ts`: derive `auth_to_treat` and `procedure_consent` status; expose `getConsentBanner(patientId)` |
| `reports.ts`                | `batchPdf(visitIds[])` returning a job id / streamed zip                                                                       |
| `surface.ts`                | **New**: `getActiveSurface()`, `setActiveSurface(surface)` (cookie‑backed)                                                     |

### 6.3 UI gaps

- Two layout shells: `app/(admin)/...` and `app/(clinical)/...` route groups, or a single `dashboard/layout.tsx` that pivots on active surface (preferred — less duplication).
- Top‑nav role switcher component.
- New Visit modal (canonical, shared).
- Service Location dropdown component.
- No‑Show Reason dialog.
- Schedule Follow‑Up button + dialog.
- Consent banner component (sticky, dismissible per session, never blocking).
- Patient form: HHA selector.
- Facility form: Facility Type selector.
- Reports: row checkbox + sticky action bar with "Print Selected".
- Visit screen: collapsible wound assessment cards, left wound rail, attestation overlay.

### 6.4 Gaps not addressed in this plan (parked)

- E‑prescribing, lab orders, full RCM.
- Patient portal.
- Native mobile app.
- PCC bidirectional sync.

---

## 7. Implementation Plan

### 7.1 Architectural decisions

1. **Single Next.js app, two surfaces, one layout shell.** A `useActiveSurface()` hook reads a server cookie set by `setActiveSurface()`. The `dashboard/layout.tsx` chooses sidebar/nav config from that value. This avoids route‑group duplication and keeps server actions, components, and DB access shared.
2. **Surface entitlement is derived, not stored as a third role.** A user's surface entitlements are computed from `(role, credentials)`:
   - `admin_surface = role IN ('tenant_admin','facility_admin') OR credentials = 'Admin'`
   - `clinical_surface = credentials IN ('RN','LVN','MD','DO','PA','NP','CNA')`
   - `tenant_admin` users always get both.
     This keeps the existing role table untouched and makes dual‑role users a natural fall‑out.
3. **Lookup tables over enums** for service locations and HHAs so admins can extend without a migration.
4. **Feature‑flag every phase rollout** via `tenant_features`. Old surface remains until flag flips.
5. **Reuse, don't rebuild.** The WoundNote v10 prototype is referenced for _layout, modals, and interaction patterns_; existing tables, server actions, signatures, transcription, and PDF pipeline stay.
6. **Defunctionalization = nav hiding + route 404 + flag gating**, not deletion. Code remains in repo. This matches client direction.
7. **All new write paths**: `auth → role/surface guard → Zod → server action → RLS‑backed query → audit log → revalidate path`.
8. **Migrations are additive only** during this cycle (no destructive changes on prod).
9. **Branding rename is a Phase 6 swap** via centralized brand tokens (mirror the prototype's `B` object) so it's a single edit.
10. **Google Chat is a spike**, gated by feasibility and Google Workspace admin consent for `thewoundwellco.com`. If green‑lit, embed via signed iframe or Chat REST API on a right rail.

### 7.2 Cross‑cutting workstreams

- **Schema migrations** (Phase 2 mostly; staged in feature branches with `supabase db diff`).
- **Type regeneration** (`npm run db:types`) after each migration; CI must fail on type drift.
- **Feature flags** seeded per tenant during pilot.
- **Pilot tenant**: The Wound Well Co. itself, with Erin, Alana, Dr. May as first testers.
- **Test data**: extend `supabase/seed.ts` with HHA, facility types, service locations, surface entitlements.

### 7.3 Testing strategy

- **Unit**: Zod schemas, RBAC helpers, surface entitlement derivation.
- **Integration (server action)**: each new action exercised against a Supabase test schema with seeded users per role/credential combination.
- **End‑to‑end (Playwright, optional)**: critical paths — schedule visit (admin), sign note (clinician), batch print (admin), role switch.
- **Regression**: before each phase ships, walk the eight assessment forms and the AI transcription pipeline to confirm no breakage.
- **Client UAT**: per cadence in §9.

### 7.4 Rollout strategy

1. Merge to `main` behind flag.
2. Enable flag on a staging tenant.
3. Internal walkthrough with Ryan + Erin.
4. Schedule Monday session with Alana/Yestinian (admin) or Dr. May/Erin (clinical).
5. Iterate, then enable flag on production tenant.
6. Old surface available for 1 cycle as fallback, then removed in code cleanup.

---

## 8. Phased Development Plan

### Phase 1 — Surface Split, Role Switcher, Nav Cleanup (foundation)

**Goal**: every user lands in the correct surface on first login; admins never see clinical clutter; clinicians never see admin/billing.

**Scope (must‑haves)**:

- R‑001, R‑002, R‑003, R‑004, R‑005, R‑006, R‑007, R‑016 (default filter), R‑020 (CSV gate), R‑033 (nav hide), R‑041 (Medical Records hide), R‑052 (verify invite role assignment).
- Migration `00042_surface_entitlements.sql` and `00043_tenant_features.sql`.
- New `lib/surface.ts` + `app/actions/surface.ts`.
- Top‑nav role switcher.
- Two sidebar configs (admin, clinical) selected by active surface.
- Remove `Incidents` from nav.
- Admin dashboard widgets (today's visits, unsigned, pending corrections, missing consents).
- Clinical dashboard widgets (own visits, own unsigned, own draft transcripts).

**Out of scope**: schema changes for visits/patients/facilities (Phase 2).

**Acceptance**:

- Logging in as clinician shows: Calendar (own only), Patients (own only), Wounds, Notes — and nothing else.
- Logging in as admin shows: Dashboard, Patients, Calendar, Reports, Billing, Admin — and nothing else.
- Erin (dual role) sees a switcher and can toggle without re‑login.
- `/dashboard/incidents/*` no longer appears in nav (404 acceptable).
- CSV export button is gone for clinicians.

---

### Phase 2 — Scheduling, Intake, and Consent Foundations

**Goal**: every operational asks Alana flagged in the calendar and patient flow are addressed; downstream Practice Fusion mapping is unbroken.

**Scope**:

- R‑010, R‑011, R‑012, R‑013, R‑014, R‑015 (calendar/visit changes)
- R‑021, R‑022, R‑023 (patient + consent banner)
- R‑051 (facility type)
- Migrations `00037`–`00041`, `00044`.
- One canonical `<NewVisitDialog />` component shared by calendar + patient record entry points.
- Backfill scripts for facility type (default `snf`), service location (default 31 SNF), and time window (default `specific`).
- Persistent consent banner component on visit and note pages.

**Acceptance**:

- New Visit modal opens identically from calendar and patient record.
- Cannot save a visit without Assigned Clinician + Service Location.
- Setting a visit to `no-show` requires a reason.
- Visit Service Location dropdown contains code + label (e.g., "31 — SNF").
- Cannot save a patient without Facility.
- Patient record shows HHA optional field.
- Missing Auth‑to‑Treat or Procedure Consent shows a sticky banner on visit/note pages but never blocks save.
- Facility form has Facility Type dropdown; existing facilities backfilled.

---

### Phase 3 — Clinical Note UX (incremental WoundNote adoption)

**Goal**: clinicians get a faster, more billable note without a rewrite.

**Scope**:

- R‑060, R‑061, R‑062, R‑063, R‑064, R‑065, R‑066.
- New layout for the open‑visit screen (breadcrumb, patient topbar pill, left wound rail).
- Refactor wound assessment screen into collapsible cards using existing data.
- New Encounter typeahead modal as the clinician entry point.
- E/M sub‑sections (Vitals, CC/HPI, ROS short‑form, PE short‑form) added to the existing assessment screen — **flag‑gated** per tenant so older clients can opt in.
- Sign + Addendum overlay (reusing `signatures` + `wound_notes` + `addendum_notifications`).

**Acceptance**:

- A clinician can open a visit, see the wound rail + topbar pill, expand/collapse cards, complete vitals + assessment + treatment order, sign with attestation, and add an addendum.
- All data persists to existing tables; no schema changes other than additive nullable columns for new E/M fields if required.

---

### Phase 4 — Billing Surfacing at Visit Level

**Goal**: admin/QA staff can confirm CPT/ICD‑10 without opening clinical notes; clinicians never see billing.

**Scope**:

- R‑030, R‑031, R‑032, R‑033 (route guard verification).
- New `<VisitBillingPanel />` on the admin visit detail page with CPT multi‑select (filtered by clinician's credentials via `procedure_scopes`) and ICD‑10 search.
- Patient‑level ICD‑10 list (chronic dx) that auto‑suggests on new visit billing.

**Acceptance**:

- Admin opens a completed visit, sees a Billing panel with searchable CPT and ICD‑10, saves, and the `billings` row updates.
- Clinician hitting `/dashboard/billing/*` is redirected to `/dashboard?error=forbidden`.

---

### Phase 5 — Reports, Batch Print, Follow‑up & Copy‑Forward, Incidents

**Goal**: operational reporting closes the loop; clinicians regain the time savings of copy‑forward.

**Scope**:

- R‑042 (batch print Visit Log).
- R‑067 (copy forward).
- R‑068 (two PDF formats).
- R‑081 (incidents — minimum viable: list + create form + signature + facility scope).

**Acceptance**:

- Admin selects 10 visits in Visit Log → "Print Selected" → receives a single combined PDF (or zipped per‑visit PDFs).
- Clinician uses Copy Forward in a new visit and sees prior assessment & treatment pre‑populated.
- Two PDF formats render and match the shapes described in the WoundNote spec.
- Incidents page renders, allows creation of an incident report, and lists prior incidents per facility.

---

### Phase 6 — Branding, Polish, Optional Google Chat Spike

**Goal**: the product _looks_ like WoundNote and feels cohesive with the team's Google Workspace habits.

**Scope**:

- R‑070, R‑071, R‑072.
- Centralize brand tokens in Tailwind `@theme`; swap logo, favicon, email templates, login/signup pages.
- Sidebar redesign matching prototype (Today section, Unsigned badge, Supplies).
- R‑080 spike: investigate Google Chat REST API; document feasibility, BAA implications, scope; ship behind feature flag if approved.

**Acceptance**:

- Brand audit: every visible "Wound EHR" string replaced with "WoundNote by The Wound Well Co."
- Palette + typography match.
- Spike report delivered with go/no‑go recommendation for chat embed.

---

### Cross‑phase: Documentation, Tests, Cleanup

- After each phase, update `docs/PROJECT_STATUS.md` and `docs/CURRENT_STATE.md`.
- After Phase 6, archive the old top‑level nav code and remove the legacy `dashboard/incidents/new` stub permanently.

---

## 9. Timeline

The team's internal cadence is **weekly Monday sessions** (preferring 11 AM). Estimates assume one full‑time engineer (Ryan) plus client review bandwidth. No exact dates beyond the next session per the meeting agreement.

| Phase                                                                        | Approx. duration | Client checkpoint                                                           |
| ---------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| **Pre‑work** (this document, refactor user levels, seed test users per role) | ~1 short cycle   | Internal walkthrough with Erin                                              |
| **Phase 1** — Surface split, role switcher, nav cleanup                      | 1 cycle          | Monday session: Alana + Yestinian (admin walkthrough)                       |
| **Phase 2** — Scheduling, intake, consents                                   | 2 cycles         | Monday session: Alana review of New Visit, Service Location, Consent banner |
| **Phase 3** — Clinical UX adoption                                           | 2–3 cycles       | Monday session: Dr. May + Erin walk a real visit                            |
| **Phase 4** — Billing at visit level                                         | 1 cycle          | Monday session: Alana + billing reviewer                                    |
| **Phase 5** — Reports / batch print / copy‑forward / incidents               | 1–2 cycles       | Monday session: full team                                                   |
| **Phase 6** — Branding, polish, Chat spike                                   | 1 cycle          | Monday session: brand sign‑off                                              |

A "cycle" = one week of focused work + a Monday review. Ryan committed in the meeting to a couple of days to align user levels first; that aligns with the **Pre‑work** row.

---

## 10. Risks, Assumptions, and Open Questions

### 10.1 Risks

| #   | Risk                                                                                     | Mitigation                                                                                                           |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| R1  | Scope creep from clinical prototype during Phase 3                                       | Lock R‑060–R‑067 to listed items; capture extras as Phase 7 backlog                                                  |
| R2  | Free‑text `visits.location` data exists and breaks migration                             | Backfill script audits unique values, maps to nearest service code, writes others to `service_location_other_detail` |
| R3  | Surface entitlement derivation surprises a tenant admin who isn't credentialled clinical | Tenant Admin always gets both surfaces by rule; explicit override in `user_roles`                                    |
| R4  | Google Chat embed runs into Workspace admin consent issues                               | Treat as spike, ship later under feature flag; not in critical path                                                  |
| R5  | Persistent consent banner is annoying or ignored                                         | Make banner dismissible per session, color‑coded, with one‑click "Add Consent" link                                  |
| R6  | Practice Fusion service‑location code map drifts from CMS POS list                       | Use CMS POS codes as source of truth; document mapping in `lib/service-locations.ts`                                 |
| R7  | Clinical UX changes break muscle memory for current clinicians                           | Phase 3 changes hidden behind tenant feature flag; opt‑in pilot                                                      |
| R8  | Two PDF formats add maintenance load                                                     | Share a base PDF template; differ only in section visibility                                                         |

### 10.2 Assumptions

- Existing Phase 11 work (AI transcription, debridement, specialized forms) remains in production unchanged.
- The Wound Well Co. is the pilot tenant; second tenant onboarding is post‑Phase 6.
- Clinicians will continue to use Google Chat externally; no in‑app chat is being built.
- Practice Fusion remains the system of record for claims; this app's billing is **assignment + handoff**, not adjudication.
- Existing `audit_logs` infrastructure is sufficient for HIPAA audit needs through Phase 6.

### 10.3 Open questions for the next client session

1. **Service Location codes**: confirm the exact list Practice Fusion expects (we currently propose CMS POS 11/12/13/31/32/33/34/99). Need Alana's billing‑team confirmation.
2. **Home Health Agencies**: do we need a starter list seeded, or will Erin/Alana manage in admin?
3. **Consent banners**: dismissible per session, per device, or persistent until resolved?
4. **No‑show reasons**: is the proposed list exhaustive? Add "Facility Refused Entry"?
5. **Time window**: is the AM/PM/Evening grouping useful, or only start+end times?
6. **E/M fields in clinical note (R‑065)**: which exact fields does Practice Fusion need to count for E/M level?
7. **Batch print**: combined single PDF, or zip of per‑visit PDFs? (We recommend single PDF with bookmarks.)
8. **Google Chat embed**: which user emails are in `*@thewoundwellco.com`? Workspace admin willing to grant embed/iframe scope?
9. **HHA portal (R‑082)**: what data must they see vs. not see? (Out of scope for this plan but flag now.)
10. **Branding rename**: are there any external integrations or printed forms that reference "Wound EHR" today that need a coordinated cutover?

---

## 11. Definition of Done

A phase is **Done** when:

1. Every R‑### in scope is implemented or explicitly deferred (with backlog ID).
2. New migrations applied to staging; types regenerated; CI green (lint, type, build).
3. Acceptance criteria for the phase pass during internal walkthrough.
4. Server actions added in the phase have matching unit/integration tests; coverage of new code paths ≥ 80 %.
5. `auditPhiAccess()` invoked on every new PHI read/write surface (NFR‑4).
6. Feature flag enabled on staging; Monday client UAT session held; UAT notes captured in `docs/uat/<phase>.md`.
7. Flag enabled on production tenant; rollback plan documented (flag flip).
8. `docs/PROJECT_STATUS.md` updated with completion date and any deferred items.

---

## 12. Appendices

### 12.1 Glossary

- **Surface** — a top‑level UX context (Admin or Clinical). A user can have one or both.
- **Credential** — clinical license held by a user (RN, LVN, MD, DO, PA, NP, CNA, Admin).
- **Facility Type** — operational classification of a facility (HHA, SNF, Assisted Living, Internal, Other).
- **Service Location (POS)** — CMS Place of Service code; drives Practice Fusion billing translation.
- **Authorization to Treat** — payer authorization required before scheduling a visit.
- **Procedure Consent** — clinical consent required before finalizing a procedure note.
- **Defunctionalize** — hide from nav and gate route, but keep code/DB so it can be re‑enabled.
- **WoundNote prototype (v10.jsx)** — Dr. May's single‑file React reference design; informs UX, not architecture.

### 12.2 Reference materials

- Alana feedback email — 4/27/2026
- Dr. Alvin May feedback email + WoundNote v10.jsx — 4/27/2026
- Meeting transcript — 4/27/2026
- Existing migrations: `supabase/migrations/00001_complete_schema.sql` through `00036_perf_indexes.sql`
- Existing server actions: `app/actions/*` (27 files)
- Existing components: `components/*` (134 files)

### 12.3 Companion documents

- [docs/CURRENT_STATE.md](CURRENT_STATE.md) — full code audit
- [docs/REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) — requirement → source → phase → status

---

_End of document. Sign‑off pending review by Dr. May and Alana._
