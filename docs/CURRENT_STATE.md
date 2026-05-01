# Wound EHR — Current State (Code Audit)

**Companion to:** [PROJECT_PLAN.md](PROJECT_PLAN.md)
**Date:** May 1, 2026
**Method:** File‑by‑file inspection of `app/`, `components/`, `lib/`, `supabase/migrations/`.

This document is the **as‑built** reference for the next development cycle. Anything not noted here either does not exist in the repository or was not material to the audit.

---

## 1. Authentication & Authorization

### 1.1 Files

- `lib/rbac.ts`, `lib/credentials.ts`, `lib/field-permissions.ts`
- `lib/supabase/{server,client,middleware}.ts`
- `proxy.ts` (route guarding at the Next.js middleware layer)
- `app/auth/{accept-invite,confirm-email,forgot-password,resend,reset-password}/`

### 1.2 Roles

Three system roles in `user_roles.role`:

- `tenant_admin` — full cross‑facility access in a tenant; can manage facilities, signatures audit, AI transcripts.
- `facility_admin` — single facility; can manage users + invites + inbox for assigned facility; cannot touch facilities table or signature audit.
- `user` — clinical or non‑clinical staff; access driven by `user_facilities` and credentials.

### 1.3 Credentials

Eight values in `users.credentials` (string, single value):

- Full clinical: `MD`, `DO`, `PA`, `NP`
- Limited clinical (require patient signature on visits): `RN`, `LVN`, `CNA`
- Non‑clinical: `Admin`

### 1.4 Field‑level permissions (lib/field-permissions.ts)

Patient fields:

- Tenant/Facility Admin → full edit on demographics, contact, insurance, clinical, documents.
- `Admin` credential → edit demographics/contact/insurance/documents; **view‑only** clinical.
- Clinical credentials → **view‑only** demographics/contact/insurance; edit medical history, allergies, wounds.

Visit fields:

- Tenant/Facility Admin → all.
- `Admin` credential → edit visit_details + billing; view‑only assessments/treatments/notes.
- Clinical → edit own visits only.

### 1.5 Route guarding (proxy.ts)

```
ADMIN_ROUTES         = ["/dashboard/admin"]
TENANT_ADMIN_ROUTES  = ["/dashboard/admin/facilities",
                        "/dashboard/admin/signatures",
                        "/dashboard/admin/transcripts"]
SHARED_ADMIN_ROUTES  = ["/dashboard/admin/users",
                        "/dashboard/admin/invites",
                        "/dashboard/admin/inbox"]
```

Users without a role redirect to `/dashboard?error=no_role`.

### 1.6 Multi‑tenancy

Many‑to‑many `user_facilities(user_id, facility_id, is_default)`. RLS policies on every PHI table join through this junction:

```sql
SELECT (patient_id IN (
  SELECT p.id FROM patients p
  JOIN user_facilities uf ON p.facility_id = uf.facility_id
  WHERE uf.user_id = auth.uid()
))
```

### 1.7 Gaps relevant to the next phase

- No "surface" concept (admin vs. clinical front door).
- No role switcher for dual‑role users.
- Field permissions hardcoded; not configurable per tenant.

---

## 2. Navigation & Layout

### 2.1 Files

- `app/dashboard/layout.tsx`
- `components/layout/{sidebar.tsx,dashboard-layout-client.tsx,header,...}`
- `lib/recording-context.tsx` (PersistentRecorderBar)

### 2.2 Sidebar today

Eight main items, visible to all users (visibility partly conditional but not surface‑split):

1. Dashboard → `/dashboard`
2. Patients → `/dashboard/patients`
3. Wounds → `/dashboard/wounds`
4. Calendar → `/dashboard/calendar`
5. Reports → `/dashboard/reports`
6. Billing → `/dashboard/billing`
7. **Incidents → `/dashboard/incidents/new` — 404 (stub)**
8. Settings → `/dashboard/settings`

Admin section, conditionally visible:

- Office Inbox, Users, Facilities (tenant only), Invites, Signatures (tenant only), AI Transcripts (tenant only).

### 2.3 Layout shell

`DashboardLayoutClient` wraps:

- Sidebar (collapsible on mobile)
- Header (mobile menu toggle)
- `PersistentRecorderBar`
- Main content
- `BottomNavBar` on mobile
- `RecordingProvider` context

### 2.4 Gaps

- No surface‑aware sidebar.
- Incidents nav item links to a missing page.
- No per‑role dashboard widgets.
- Global search dialog exists but integration not exercised.

---

## 3. Calendar / Visits / Scheduling

### 3.1 Files

- `app/actions/calendar.ts`, `app/actions/visits.ts`
- `app/dashboard/calendar/page.tsx`, `components/calendar/*`, `components/visits/*`

### 3.2 Visit data model (`visits` table)

Core: `id`, `patient_id`, `visit_date TIMESTAMPTZ`, `visit_type` (`in_person` | `telemed`), `location TEXT (free text)`, `status` (large enum incl. `scheduled`, `in-progress`, `completed`, `cancelled`, `no-show`, `incomplete`, `complete`, `draft`, `sent_to_office`, `needs_correction`, `being_corrected`, `approved`, `ready_for_signature`, `signed`, `submitted`, `voided`), `clinician_id`, `primary_clinician_id`, `time_spent BOOLEAN`, `additional_notes`.

Follow‑up: `follow_up_type` (`appointment` | `discharge`), `follow_up_date`, `follow_up_notes`.

Signing: `requires_patient_signature`, `provider_signature_id`, `patient_signature_id`, `approved_at`, `approved_by`, `sent_to_office_at`.

Correction: `correction_notes JSONB[]`, `number_of_addenda INT`.

### 3.3 Calendar features

`getCalendarEvents()` accepts date range + optional facility, patient, clinician filters (`"my-patients"` magic value scopes to current user's assigned patients). Returns React Big Calendar shape; default duration 60 minutes.

`createVisitFromCalendar()` accepts `patientId`, `visitDate`, `visitType` (default `routine`), `location` (free text), `notes`. **No `clinicianId` parameter.** **No no‑show reason.** **No service location code.**

### 3.4 Gaps

- No clinician assignment at creation.
- Free‑text location.
- No no‑show reason.
- No time window (single timestamp).
- Multiple entry points for visit creation that may diverge.
- `patient_clinicians` table exists for filtering but not consulted at visit creation.

---

## 4. Patient Management

### 4.1 Files

- `app/actions/patients.ts`, `app/dashboard/patients/*`, `components/patients/*`
- Consents: `app/actions/signatures.ts`, `components/consents/*`

### 4.2 Patient data model

Required: `first_name`, `last_name`, `dob`, `mrn`, `facility_id (NOT NULL)`, `gender (optional)`.

Optional: contact (phone, email, address), insurance (`insurance_info JSONB` with `primary`/`secondary`), emergency contact (JSONB), `allergies JSONB[]`, `medical_history JSONB[]` (with ICD‑10 codes).

Constraint: `UNIQUE(facility_id, mrn)`.

### 4.3 Consent model

`patient_consents` table: `consent_type` enum currently includes `initial_treatment` plus newer types added in Phase 11 (`recording_consent`, `ai_processing_consent`, `photo_video_consent`). Unique per patient per type.

Recording/AI consent additionally lives in `patient_recording_consents` with `consent_given`, `expires_at`, `revoked_at`, `ai_processing_consent_given`, `ai_processing_signature_id`.

### 4.4 Gaps

- No Home Health Agency field.
- No surfaced "Authorization to Treat" or "Procedure Consent" derived status.
- No persistent banner for missing consents.
- CSV export presence/role gating not verified in UI.

---

## 5. Billing

### 5.1 Files

- `app/actions/billing.ts`, `lib/billing-codes.ts`, `app/dashboard/billing/*`, `components/billing/*`

### 5.2 Codes available

40+ CPT (E/M, debridement 11042–11047, 97597–97598, NPWT 97605–97606, grafts 15271–15275, photography 96904, etc.) and 50+ ICD‑10 (pressure, diabetic, venous, arterial ulcers, infections, comorbidities).

### 5.3 Billing data model

`billings` table: `visit_id`, `patient_id`, `cpt_codes JSONB[]`, `icd10_codes JSONB[]`, `modifiers JSONB[]`, `time_spent BOOLEAN`, `notes TEXT`. Codes validated against user credentials via `procedure_scopes(procedure_code, allowed_credentials TEXT[])`.

### 5.4 Gaps

- CPT/ICD‑10 currently surfaced via the billing form, not at the visit level.
- Modifier list not predefined (no -LT/-RT helpers).
- No charge amounts / RVUs (intentional — Practice Fusion handles).

---

## 6. Reports

### 6.1 Files

- `app/actions/reports.ts`, `app/dashboard/reports/*`, `components/reports/*`

### 6.2 Tabs

1. **Visit Log** — `getVisitLog()` with date range (required), clinician multi‑select, facility multi‑select, patient ID, status; pagination 50/page.
2. **Clinician Activity** — `getClinicianActivityReport()` aggregates per clinician.
3. **Facility Summary** — `getFacilitySummaryReport()` aggregates per facility.
4. **Medical Records** — placeholder; not implemented.

### 6.3 Gaps

- No multi‑select / batch print.
- No CSV export action verified in `reports.ts`.

---

## 7. Admin Panel

### 7.1 Files

- `app/dashboard/admin/{inbox,users,facilities,invites,signatures,transcripts}/`
- `app/actions/admin.ts`
- `components/admin/{office-inbox-client,users-management-client,signature-audit-client,transcripts-management-client,invites-management-client,correction-request-dialog,void-note-dialog}.tsx`

### 7.2 Sections

- **Office Inbox** — review notes with status `sent_to_office`; request corrections (writes to `correction_notes JSONB[]`); approve.
- **Users Management** — list, edit role/credentials. No direct user creation.
- **Facilities Management** — tenant only; CRUD on facilities; **no `facility_type` column**.
- **Invites** — `inviteUser()` accepts email, role, credentials, facility_id; pre‑assigns at invite time; generates token with 7‑day expiration; emails via Resend.
- **Signatures Audit** — tenant only; signature_type, signer info, IP, timestamps.
- **AI Transcripts** — tenant only; status, draft note, approve/reject, cost tracking.

### 7.3 Gaps

- No Facility Type.
- Facility admin cannot manage signatures or transcripts (correct).
- User creation only via invite (acceptable per meeting).

---

## 8. Wound / Clinical Note Workflow

### 8.1 Files

- `app/actions/wounds.ts`, `wound-notes.ts`, `assessments.ts`, `signatures.ts`, `specialized-assessments.ts`, `treatments.ts`, `photos.ts`, `pdf.ts`, `pdf-cached.ts`, `ai-transcription.ts`, `approval-workflow.ts`
- `components/assessments/*` (13 files), `components/wounds/*`, `components/signatures/*`, `components/photos/*`, `components/pdf/*`
- `lib/recording-context.tsx`, `lib/ai/*`

### 8.2 Assessment types

1. Standard wound (`assessment-form.tsx`)
2. Debridement (`debridement-assessment-form.tsx`) — pre/post measurements, tissue removed, hemostasis, device (Arobella ultrasonic)
3. Grafting (`grafting-assessment-form.tsx`) — graft type, viability, donor site
4. Skin Sweep (`skin-sweep-assessment-form.tsx`)
5. Multi‑Wound (`multi-wound-assessment-form.tsx`)
6. G‑Tube (`gtube-procedure-form.tsx`) — PEG vs balloon, peri‑tube findings, replacement details
7. Skilled Nursing (`skilled-nursing-assessment-form.tsx`) — 150+ fields covering vitals, cardiovascular, respiratory, neuro, GU, GI, nutrition, integumentary
8. Patient Not Seen (`patient-not-seen-form.tsx`) — reason + follow‑up plan

Selector: `assessment-type-selector.tsx`.

### 8.3 Note structure

Existing tabs are wound‑centric (Assessments / Treatments / Photos / Notes / Signatures). There is **no** SOAP‑style tab structure (CC/HPI/ROS/PE/PMH/Studies/Orders/Timeline/Records). The Skilled Nursing form is the only place those E/M elements live, and it is monolithic.

### 8.4 Signatures & addendum

`signatures.ts` supports provider, patient, witness, consent types with draw/type/upload methods. Server captures IP. Addendums append to `wound_notes` with `note_type='addendum'`; `addendum_notifications` queues them for office review; `visits.number_of_addenda` increments.

### 8.5 AI transcription

Two‑stage consent gate:

1. `patient_recording_consents.consent_given = true` and not expired/revoked.
2. `ai_processing_consent_given = true` (HIPAA/BAA gate).

Pipeline: audio uploaded to Supabase Storage `visit-audio/{visitId}/...` → `visit_transcripts` row created with `processing_status='pending'` → Whisper for `transcript_raw` → GPT‑4 for `transcript_clinical` → clinician review and `final_note` → `clinician_approved_at`. Cost columns: `cost_transcription`, `cost_llm`. Retry: `retryTranscription()`, `regenerateClinicalNote()`.

### 8.6 PDF

`pdf.ts` and `pdf-cached.ts` produce a comprehensive patient summary with photos, recent visits, assessments. Honors `user_preferences` (include photos, photo size, max per assessment, page size).

### 8.7 Gaps

- No SOAP/E/M tabbed structure (acceptable per meeting; will be added incrementally in Phase 3).
- No collapsible card layout for wound assessment.
- No left wound rail with prior visits.
- No copy‑forward.
- One PDF format today; spec asks for two.

---

## 9. Database Schema

### 9.1 Migrations

`00001_complete_schema.sql` (baseline), `00027_ai_transcription.sql`, `00028_fix_trigger_search_path.sql`, `00029_treatment_wound_id.sql`, `00030_new_clinical_forms.sql`, `00031_consent_provider_signature.sql`, `00032_user_preferences.sql`, `00033_private_wound_photos.sql`, `00034_critical_security_fixes.sql`, `00035_high_severity_hardening.sql`, `00036_perf_indexes.sql`.

### 9.2 Tables (31)

Multi‑tenant & access: `tenants`, `facilities`, `user_facilities`.
Auth & RBAC: `users`, `user_roles`, `user_invites`.
Patient & care: `patients`, `wounds`, `visits`, `assessments`, `photos`, `treatments`.
Billing: `billings`.
Signatures & consent: `signatures`, `patient_consents`.
Clinical docs: `wound_notes`, `addendum_notifications`.
Assignments: `patient_clinicians`.
Procedures & scope: `procedure_scopes`.
Documents: `patient_documents`.
Specialized assessments: `skilled_nursing_assessments`, `skilled_nursing_wounds`, `gtube_procedures`, `grafting_assessments`, `debridement_assessments`, `skin_sweep_assessments`.
Patient not seen / incidents: `patient_not_seen_reports`, `incident_reports`.
AI transcription: `visit_transcripts`, `patient_recording_consents`.
Preferences: `user_preferences`.
Audit: `audit_logs`.

### 9.3 RLS

Facility‑scoped via `user_facilities`. RPCs include `get_user_role_info`, `get_tenant_user_roles`, `get_current_user_credentials`.

### 9.4 Gaps relevant to next phase

- No `facilities.facility_type`.
- No structured `service_locations` lookup.
- No `visits.no_show_reason`.
- No `visits.start_time`/`end_time`/`time_window`.
- No `patients.home_health_agency_id`.
- No `tenant_features` flag table.

---

## 10. Settings & Preferences

`user_preferences`: `pdf_include_photos`, `pdf_photo_size`, `pdf_max_photos_per_assessment`, `pdf_page_size`, `preferences JSONB`. Functions: `getUserPreferences()`, `savePDFPreferences()`. No timezone, no notification, no default facility, no theme.

---

## 11. Other

- **Incidents**: `incident_reports` table exists (facility, employee, patient, description, signature). **No** `app/actions/incidents.ts`. Sidebar links to a missing page.
- **Search**: `globalSearch()` searches patients (name/MRN/DOB) and facilities; ≥2 char minimum; 5+3 results.
- **Notifications**: `app/actions/notifications.ts` exists; surface incomplete.
- **Audit**: `audit_logs` table; `auditPhiAccess()` called in `signatures.ts`, `visits.ts`, `pdf.ts`.

---

## 12. Existing documentation

The `docs/` folder did not exist prior to this audit. References in README to `docs/SYSTEM_DESIGN.md`, `docs/PROJECT_STATUS.md`, and `docs/phase-11/` are dangling and should be replaced or removed in a follow‑up.

---

_End of audit._
