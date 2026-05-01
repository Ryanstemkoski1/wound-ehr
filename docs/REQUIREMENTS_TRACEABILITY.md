# Requirements Traceability Matrix

**Companion to:** [PROJECT_PLAN.md](PROJECT_PLAN.md)
**Date:** May 1, 2026

Every line item from Alana's email, Dr. May's email, and the 4/27 meeting transcript is listed below and mapped to (a) a requirement ID in [PROJECT_PLAN.md §5](PROJECT_PLAN.md#5-new-phase-requirements), (b) a target phase, and (c) status. "Status" is one of:

- **Planned** — accepted, in scope of named phase
- **Accepted/Existing** — already implemented in current code
- **Modified** — accepted but reshaped per meeting decision
- **Deferred** — accepted but pushed past Phase 6
- **Rejected** — not building (with rationale)

---

## A. Alana's email (4/27)

| #   | Item                                                                                                                                                           | Req ID                                        | Phase | Status            | Notes                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----- | ----------------- | --------------------------------------------------------------- |
| 1A  | Two distinct login navigations (Admin vs Clinical)                                                                                                             | R-001                                         | 1     | Planned           | One login + role switcher per meeting                           |
| 1B  | Dual‑role accounts via role switcher                                                                                                                           | R-002                                         | 1     | Planned           |                                                                 |
| 1C  | Hide Wounds from Admin nav                                                                                                                                     | R-004                                         | 1     | Planned           |                                                                 |
| 1C  | Remove Incidents nav (404)                                                                                                                                     | R-006                                         | 1     | Planned           | Module deferred to Phase 5+                                     |
| 1C  | Hide Signatures from Admin nav                                                                                                                                 | R-004                                         | 1     | Planned           |                                                                 |
| 1C  | Hide AI Transcripts from Admin nav                                                                                                                             | R-004                                         | 1     | Planned           | Tenant Admin keeps via Admin section                            |
| 2A  | Clinician dropdown on New Visit modal                                                                                                                          | R-010                                         | 2     | Planned           | Ryan agreed in meeting                                          |
| 2B  | Schedule only from calendar                                                                                                                                    | R-011                                         | 2     | Modified          | Both entry points allowed; both invoke same modal/server action |
| 2C  | Schedule Follow‑Up button on completed/cancelled/no‑show                                                                                                       | R-012                                         | 2     | Planned           |                                                                 |
| 2D  | Mandatory No‑Show reason (dropdown + Other)                                                                                                                    | R-013                                         | 2     | Planned           |                                                                 |
| 2E  | Time window vs fixed time                                                                                                                                      | R-014                                         | 2     | Planned           | start/end + AM/PM/Specific enum                                 |
| 2F  | Service Location structured dropdown (CMS POS)                                                                                                                 | R-015                                         | 2     | Planned           | New `service_locations` lookup                                  |
| 2G  | Admin default = "All Clinicians"; clinicians scoped to self                                                                                                    | R-016                                         | 1/2   | Planned           | Defense in depth at server                                      |
| 3A  | Restrict Patients CSV export to admin                                                                                                                          | R-020                                         | 1     | Planned           |                                                                 |
| 3B  | Facility required at patient creation                                                                                                                          | R-021                                         | 2     | Planned           | DB already enforces; add validation + audit                     |
| 3C  | Home Health Agency field on patient                                                                                                                            | R-022                                         | 2     | Planned           | New `home_health_agencies` lookup                               |
| 3D  | Two persistent consent statuses + non‑blocking banner                                                                                                          | R-023                                         | 2     | Planned           | Banner only                                                     |
| 4A  | CPT dropdown at visit level                                                                                                                                    | R-030                                         | 4     | Planned           |                                                                 |
| 4B  | ICD‑10 selectable at patient + visit                                                                                                                           | R-031                                         | 4     | Planned           |                                                                 |
| 4C  | Retain Billing CSV export filters                                                                                                                              | R-032                                         | 4     | Accepted/Existing | Verify gating                                                   |
| 4D  | Hide Billing from Clinical                                                                                                                                     | R-033                                         | 1/4   | Planned           |                                                                 |
| 5A  | Retain Visit Log, Clinician Activity, Facility Summary                                                                                                         | R-040                                         | 1     | Accepted/Existing | Verify surface gating                                           |
| 5B  | Hide Medical Records (defer)                                                                                                                                   | R-041                                         | 1/5   | Planned           |                                                                 |
| 5C  | Batch print in Visit Log                                                                                                                                       | R-042                                         | 5     | Planned           |                                                                 |
| 6A  | Retain Users/Facilities/Invites in Admin                                                                                                                       | —                                             | —     | Accepted/Existing | No work                                                         |
| 6B  | Facility Type field                                                                                                                                            | R-051                                         | 2     | Planned           | New `facilities.facility_type`                                  |
| 6C  | Pre‑assign role at invite                                                                                                                                      | R-052                                         | 1/2   | Accepted/Existing | Verify UI surfaces correctly                                    |
| 7   | Hide Wounds, Incidents, Signatures, AI Transcripts, Medical Records, free‑text Location, billing for clinicians, CSV for clinicians, clinician calendar filter | R-004 / R-005 / R-006 / R-015 / R-020 / R-033 | 1–2   | Planned           | Consolidated                                                    |

---

## B. Dr. Alvin May's email + WoundNote v10 prototype (4/27)

| #       | Item                                                                                                                                        | Req ID | Phase | Status            | Notes                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ----------------- | ----------------------------------------------------------------------------------- |
| Brand   | Rename to "WoundNote by The Wound Well Co."                                                                                                 | R-070  | 6     | Planned           |                                                                                     |
| Brand   | Forest/teal/cream palette + Inter/Nunito                                                                                                    | R-071  | 6     | Planned           |                                                                                     |
| Brand   | Bandaged‑apple logo                                                                                                                         | R-070  | 6     | Planned           |                                                                                     |
| Page    | Home calendar + stats bar + task strip                                                                                                      | —      | 1     | Modified          | Adopt for Admin & Clinical dashboards (R‑007)                                       |
| Page    | Patients search by name/MRN/DOB/SSN/facility/insurance                                                                                      | —      | —     | Accepted/Existing | Already implemented; SSN search not implemented today, deferred                     |
| Page    | Reports filter + checkboxes + Select All + batch download                                                                                   | R-042  | 5     | Planned           |                                                                                     |
| Page    | Clinical Note full‑screen view                                                                                                              | R-060  | 3     | Planned           |                                                                                     |
| Sidebar | Left sidebar 200 px with Today section                                                                                                      | R-072  | 6     | Planned           |                                                                                     |
| Sidebar | Chat section (5 contacts)                                                                                                                   | R-080  | 6     | Modified          | Spike only; not v1                                                                  |
| Note    | New Encounter typeahead modal                                                                                                               | R-063  | 3     | Planned           |                                                                                     |
| Note    | Dark green breadcrumb bar                                                                                                                   | R-060  | 3     | Planned           |                                                                                     |
| Note    | Left wound rail (resizable, color dots, prior visits)                                                                                       | R-062  | 3     | Planned           |                                                                                     |
| Note    | Patient topbar pill                                                                                                                         | R-060  | 3     | Planned           |                                                                                     |
| Note    | 11 clinical tabs (Vitals, CC, ROS, PE, Wound, PMH, Studies, Notes, Orders, Timeline, Records)                                               | R-065  | 3     | Modified          | Adopt as sub‑sections inside existing assessment screen, not 11 separate tabs in v1 |
| Wound   | Collapsible card sections (Type & Measurements, Wound Features, Healing Status, Procedure, Treatment Builder, Prevention, Assessment Notes) | R-061  | 3     | Planned           |                                                                                     |
| Wound   | Procedure tabs (Sharp Debridement, Biologic Graft, Arobella)                                                                                | R-061  | 3     | Accepted/Existing | Forms exist; UI re‑skin                                                             |
| Wound   | Treatment Order Builder tabbed by wound type                                                                                                | R-066  | 3     | Planned           |                                                                                     |
| Wound   | Prevention Interventions chips                                                                                                              | R-061  | 3     | Planned           |                                                                                     |
| Sign    | Sign Note → attestation → locked overlay → Signed bar                                                                                       | R-064  | 3     | Planned           | Existing data model                                                                 |
| Sign    | Add Addendum (Correction, Clarification, Additional Finding, Late Entry)                                                                    | R-064  | 3     | Planned           | Reuse existing addendum tables                                                      |
| Print   | Clinical Note Summary (1 page/wound)                                                                                                        | R-068  | 5     | Planned           |                                                                                     |
| Print   | Full Clinical Note (long form)                                                                                                              | R-068  | 5     | Planned           |                                                                                     |
| Print   | Addenda as page‑break pages                                                                                                                 | R-068  | 5     | Planned           |                                                                                     |
| Modal   | Supply Requisition (Medline catalog)                                                                                                        | —      | —     | Deferred          | Not in feedback priority list; no migration needed yet                              |
| Modal   | Copy Forward (select prior visit, pre‑populate)                                                                                             | R-067  | 5     | Planned           |                                                                                     |
| Modal   | Patient Profile (demographics, facesheet)                                                                                                   | —      | —     | Accepted/Existing | Already implemented                                                                 |
| Modal   | Prior Visit Popup (view‑only)                                                                                                               | —      | 3     | Planned           | Subset of left wound rail UX                                                        |

---

## C. Meeting transcript (4/27) — binding decisions

| Topic                           | Outcome                                                   | Affects        |
| ------------------------------- | --------------------------------------------------------- | -------------- |
| Strategic posture               | Strip & defunctionalize, do not delete                    | All phases     |
| Login model                     | One login + role switcher (not two logins)                | R‑002          |
| "Note gal" role                 | Treat as Admin user, not new tier                         | RBAC scope     |
| Schedule‑only‑from‑calendar     | Softened; both entry points allowed if same modal         | R‑011          |
| Clinician dropdown on New Visit | Confirmed in scope                                        | R‑010          |
| Branding rename + colors        | In scope, but later (Phase 6)                             | R‑070, R‑071   |
| Chat embed                      | Investigate Google Chat API; not v1; internal staff only  | R‑080          |
| Prototype as rewrite            | Rejected — incremental adoption only                      | R‑060–R‑068    |
| 11 clinical tabs                | Modified — sub‑sections inside existing screen            | R‑065          |
| Workflow cadence                | Weekly Monday session, alternating admin/clinical         | Timeline       |
| Sequence                        | Foundation → admin flow → clinical → notes/billing        | Phase ordering |
| Persistent consent banners      | Non‑blocking                                              | R‑023          |
| Existing super‑admin testing    | Replace with role‑specific test users before next session | Pre‑work       |

---

## D. Cross‑references

- Schema artifacts in [PROJECT_PLAN.md §6.1](PROJECT_PLAN.md#61-schema-gaps).
- Server‑action artifacts in [PROJECT_PLAN.md §6.2](PROJECT_PLAN.md#62-server-action-gaps).
- UI artifacts in [PROJECT_PLAN.md §6.3](PROJECT_PLAN.md#63-ui-gaps).
- Open client questions in [PROJECT_PLAN.md §10.3](PROJECT_PLAN.md#103-open-questions-for-the-next-client-session).

---

_End of traceability matrix._
