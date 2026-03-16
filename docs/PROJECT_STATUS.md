# Wound EHR - Project Status

**Last Updated:** March 16, 2026
**Current Phase:** Phase 11.2-11.5 remaining (11.1, 11.6, 11.7 complete)
**Code Quality:** Zero TypeScript errors, all builds passing
**Target Completion:** April 24, 2026

> **Documentation:**
>
> - [README.md](../README.md) - Quick start, tech stack, project structure
> - [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Architecture, database schema, design decisions
> - **This file** - Single source of truth for project status and what's remaining
> - [docs/phase-11/](./phase-11/) - Phase 11 plan, progress report, AI research, test plan, user guide
> - [docs/archive/](./archive/) - Historical phase completion reports

---

## Table of Contents

1. [Phase Completion Summary](#phase-completion-summary)
2. [Completed Feature Details](#completed-feature-details)
3. [What's Remaining](#whats-remaining)
4. [Blockers & Client Action Items](#blockers--client-action-items)
5. [Known Issues](#known-issues)
6. [Future Roadmap](#future-roadmap)

---

## Phase Completion Summary

| Phase  | Description                                                         | Status         | Date         |
| ------ | ------------------------------------------------------------------- | -------------- | ------------ |
| 1-8    | Core EHR (patients, wounds, visits, calendar, billing, photos, PDF) | Done, Deployed | Oct 2025     |
| 9.1    | Credentials-based role system                                       | Done, Deployed | Nov 2025     |
| 9.2    | Electronic signatures & audit trail                                 | Done, Deployed | Nov 2025     |
| 9.3    | High-priority compliance (7 sub-phases)                             | Done, Deployed | Nov 2025     |
| 9.4    | Advanced features (documents, assessments, patient page)            | Done, Deployed | Dec 2025     |
| 10     | Production features - **client approved**                           | Done, Deployed | Feb 20, 2026 |
| 11.1   | AI clinical note generation (Whisper + GPT-4)                       | Done           | Mar 9, 2026  |
| 11.6   | Treatment Order Builder (4-tab sentence builder)                    | Done           | Mar 16, 2026 |
| 11.7   | Client Forms (debridement, consents, incident, not-seen)            | Done           | Mar 16, 2026 |
| 11.2.1 | Facility access control (hide unapproved notes)                     | Not started    | -            |
| 11.3   | Mobile UI optimization                                              | Not started    | -            |
| 11.4   | Printing & PDF enhancements                                         | Not started    | -            |
| 11.5   | Final polish (search, notifications, admin tools)                   | Not started    | -            |

### Key Metrics

- **Components:** 135+ React components (16 assessment/form components)
- **Database Tables:** 28 with Row Level Security
- **Server Actions:** 23 action files, ~175 exported functions
- **API Routes:** 1 (audio upload via `app/api/upload-audio/route.ts`)
- **Migrations:** 6 files (00001, 00027, 00028, 00029, 00030, 00031)
- **Route Pages:** 41 total (8 public/auth + 33 dashboard)
- **Custom Hooks:** 3 (audio recorder, autosave, transcription polling)
- **AI Service Modules:** 3 (openai-service, transcription-pipeline, usage-tracking)

---

## Completed Feature Details

### Phase 11.1: AI-Powered Clinical Note Generation (Mar 9, 2026)

Full AI documentation system using OpenAI Whisper (speech-to-text) + GPT-4 Turbo (clinical note generation).

**What was built:**

- Patient recording consent workflow (HIPAA-compliant, one-time, annual renewal)
- Browser-based audio recording with real-time waveform visualization
- Transcription pipeline: download audio -> Whisper -> GPT-4 -> save
- AI note review/editing interface with diff view
- Clinician approve/reject/regenerate workflow
- Usage tracking and cost monitoring per clinician
- Status polling during AI processing

**Files created:**

- `supabase/migrations/00027_ai_transcription.sql` - visit_transcripts + patient_recording_consents tables
- `supabase/migrations/00028_fix_trigger_search_path.sql` - Auth trigger security fix
- `lib/ai/openai-service.ts` - Direct OpenAI REST calls with retry/backoff
- `lib/ai/transcription-pipeline.ts` - Full orchestration pipeline
- `lib/ai/usage-tracking.ts` - Per-clinician usage/cost monitoring
- `lib/ai-config.ts` - OpenAI config, wound care system prompt, consent text
- `lib/hooks/use-audio-recorder.ts` - MediaRecorder API wrapper
- `lib/hooks/use-transcription-polling.ts` - Poll for AI processing status
- `app/actions/ai-transcription.ts` - 14 server actions (upload, process, approve, reject, consent, etc.)
- `components/visits/audio-recorder.tsx` - Recording UI with waveform
- `components/visits/ai-note-review.tsx` - Note review/edit/approve interface
- `components/visits/visit-ai-status-card.tsx` - AI status display in visit detail
- `components/signatures/recording-consent-modal.tsx` - HIPAA consent modal
- `components/signatures/recording-consent-status.tsx` - Consent badge/status display

**Deferred items (non-blocking, planned for 11.5):**

- Admin transcript management page (`/dashboard/admin/transcripts`)
- Clinician AI preference settings (model selection, note style)
- Audio playback with waveform in review UI
- Batch audio retention cleanup (90-day policy automation)

### Phase 11.6: Treatment Order Builder (Mar 16, 2026)

4-tab sentence builder replacing Aprima's treatment order section. Audited and fixed against client's original 7 reference images (3 Aprima wound form pages + 4 TREATMENT MENU TABS pages).

**What was built (after audit fix):**

- Tab 1 (Topical): Cleanse/Irrigate action selector, cleanser dropdown (Saline/Sterile Water, Wound Cleanser, Vashe, 1/4 Dakins), 28 treatment options with type text boxes where needed, secondary dressing gated by checkbox, coverage options
- Tab 2 (Compression/NPWT): 4 treatment types (ACE Wrap/TED Hose/Tubi-Grips checkboxes, UNNA Boot/Layered Compression with frequency, NPWT with pressure+schedule MWF/TTS/Other, "Dressing applied by provider" checkbox)
- Tab 3 (Skin/Moisture): Skin cleanser options matching client doc, moisture barrier treatments (Hydrocolloid with mfr instructions note, Adhesive Film with infection check note, Barrier Wipe/Spray)
- Tab 4 (Rash/Dermatitis): Treatment select with "Other" free-text, coverage options (Open Air/Dry Dressing/Transparent Film), secondary+tertiary dressing checkboxes with selects, PRN toggle
- All tabs use frequency select (every 1 day, 2 days, 3 days, every shift)
- Special instructions field stored in TreatmentOrderData
- Auto-generated sentence preview for each tab

**Files created/modified:**

- `supabase/migrations/00029_treatment_wound_id.sql` - wound_id FK + new columns
- `lib/treatment-options.ts` (~690 lines) - All constants, types, sentence builders
- `components/assessments/treatment-order-builder.tsx` (~1050 lines) - Full 4-tab UI
- `app/actions/treatments.ts` (~365 lines) - CRUD + autosave + JSON state parsing
- Integration in assessment-form.tsx, multi-wound-assessment-form.tsx, edit page, visit detail, PDF

**Data submission pattern:** Client sends full `TreatmentOrderData` as JSON via `treatmentState` field. Server parses and stores per-tab state in JSONB columns (`primary_dressings`, `compression`, `moisture_management`, `secondary_treatment`).

### Phase 11.7: Client Clinical Forms (Mar 16, 2026)

5 new forms built from client's 10 form PDFs. 4 forms already existed (Skilled Nursing, Skin Sweep, G-Tube, Wound Care Worksheet).

**What was built:**

- Arobella Debridement Assessment (4-tab: pre-treatment, procedure, post-treatment, notes)
- Patient Not Seen Report (reason checkboxes, follow-up plan, clinician SignaturePad)
- Consent to Treatment (multi-step with procedure selection + provider/patient/witness signatures, provider sig persisted to DB)
- Photo & Video Consent (HIPAA-compliant modal with representative name input)
- Incident Report (workplace incident with employee SignaturePad)
- Assessment type selector updated to 7 types

**Post-build audit fixes (Mar 16, 2026):**

- Patient Not Seen: Added `SignaturePad` for clinician signature (was missing from UI despite DB column existing); changed reason from single-select dropdown to checkbox list matching client PDF
- Incident Report: Added `SignaturePad` for employee signature (was missing from UI despite DB column existing)
- Consent to Treatment: Added `provider_signature_id` column to `patient_consents` table (migration 00031); updated `createConsentToTreatment` to persist provider signature; added benzocaine 20% topical anaesthesia note matching client PDF; updated "Other" procedure label
- Photo & Video Consent: Added representative name input field (defaults to patient name, editable for legal representatives)

**Files created:**

- `supabase/migrations/00030_new_clinical_forms.sql` - 3 new tables (debridement_assessments, patient_not_seen_reports, incident_reports) + RLS
- `supabase/migrations/00031_consent_provider_signature.sql` - ALTER patient_consents ADD provider_signature_id
- `app/actions/new-forms.ts` (~620 lines) - Types + CRUD for all 5 forms (12 exported functions)
- `components/assessments/debridement-assessment-form.tsx` - Multi-tab Arobella debridement
- `components/assessments/patient-not-seen-form.tsx` - Reason checkboxes + follow-up plan + clinician signature
- `components/consents/consent-to-treatment-form.tsx` - Procedure selection + 3 signatures + benzocaine note
- `components/consents/photo-video-consent-modal.tsx` - HIPAA photo/video consent + representative name
- `components/forms/incident-report-form.tsx` - Workplace incident + employee signature
- `lib/database.types.ts` - Updated patient_consents type with provider_signature_id
- Route pages: debridement/new, not-seen/new, consent, incidents/new

---

## What's Remaining

**Estimated timeline:** ~3 weeks (target April 10, 2026)

> Phase 11.2.2 (Clinical Summary PDFs) was dropped — client confirmed forms fulfill the requirement. This saves ~2 days.

### Phase 11.2.1: Facility Access Control (1 day)

Hide unapproved visit notes from facility read-only users. This is a **data disclosure risk** - facility users currently see clinician notes before office approval. **Highest-priority unblocked work item.**

| Task                                                               | Status      | Notes                |
| ------------------------------------------------------------------ | ----------- | -------------------- |
| Create `canViewVisitDetails(user, visit)` utility in `lib/rbac.ts` | Not started | Rules-based check    |
| Update visit list UI - hide content for unapproved visits          | Not started | Show "Pending" badge |
| Update visit detail page - block access for facility users         | Not started | Redirect or mask     |
| Update PDF download permissions - block for unapproved visits      | Not started | Check in pdf.ts      |

> **Phase 11.2.2 (Clinical Summary PDFs) — DROPPED.** Client confirmed the 10 form PDFs from Aaron/Erin ARE the clinical summary templates. All 5 new forms + 4 existing assessment forms fulfill this requirement. No separate abbreviated PDF format needed.

### Phase 11.3: Mobile UI Optimization (1.5 weeks)

**11.3.1: Mobile Assessment Forms** (2 days)

- Touch-friendly controls (min 44x44px tap targets)
- Larger checkboxes, radio buttons (18px -> 24px)
- Stack form fields vertically on small screens
- Larger signature canvas (full width on mobile)
- 16px font minimum to prevent iOS zoom

**11.3.2: Mobile Navigation & Layout** (2 days)

- Bottom navigation bar for screens < 768px (Home, Patients, Calendar, New Visit, Menu)
- Card-based patient list (not table) on mobile
- Day view default for calendar on mobile
- Swipe gestures for date navigation
- Hide sidebar on mobile (hamburger menu)

**11.3.3: Offline Support & Performance** (2 days)

- Service worker for offline page caching
- Queue actions when offline (drafts, photo uploads)
- Offline indicator banner
- Lazy load images, virtual scrolling for long lists
- Progressive image loading

**11.3.4: Mobile Testing** (1 day)

- Device matrix: iPhone SE, iPhone 14, iPad Mini, iPad Pro 11", iPad Pro 12.9", Android
- Core workflow testing on each device
- Orientation testing (portrait + landscape)

### Phase 11.4: Printing & PDF Enhancements (1 week)

**11.4.1: Clinician Signature on PDFs** (2 days)

- Signature footer component with clinician name, credentials, date/time
- Apply to visit summary PDF, wound progress PDF, clinical summaries
- Optional digital signature image

**11.4.2: Photo Printing Preferences** (2 days)

- New `user_preferences` table (migration needed)
- Settings page (`/dashboard/settings`) with PDF preferences:
  - Include/exclude wound photos
  - Include/exclude measurement charts
  - PDF page size (Letter, A4, Legal)
  - Photo size (Small, Medium, Large, Full Page)
- Load preferences before generating PDF

**11.4.3: Advanced PDF Features** (1 day, optional)

- Watermark option ("CONFIDENTIAL")
- Batch PDF export (select multiple visits -> ZIP)

### Phase 11.5: Final Polish (1 week)

**11.5.1: Auto-Save Visual Indicators** (1 day)

- Save status component (Saving.../Saved at 2:15 PM/Save failed - Retry)
- Fixed position in top-right of forms
- Ctrl+S / Cmd+S manual save
- Multi-wound progress indicator

**11.5.2: Global Search** (1 day)

- Cmd+K / Ctrl+K keyboard shortcut
- Search modal with instant results across patients, visits, facilities, users
- Recent patients quick access on dashboard

**11.5.3: In-app Notifications** (2 days)

- Bell icon in header with badge count
- Notification types: correction requested, note approved, AI note ready, new patient assigned, pending notes (admin)
- Click to navigate, mark-as-read
- Optional email notifications via Supabase Edge Functions + Resend

**11.5.4: Deferred AI Items** (1 day)

- Admin transcript management page (`/dashboard/admin/transcripts`)
- Clinician AI preference settings
- Audio playback with waveform in review UI
- Batch audio retention cleanup automation

---

## Blockers & Client Action Items

| #     | Item                                                     | Owner          | Status                                                         |
| ----- | -------------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| ~~1~~ | ~~Clinical summary templates~~                           | ~~Aaron/Erin~~ | ~~RESOLVED — Phase 11.2.2 dropped, forms fulfill requirement~~ |
| 2     | **AI demo scheduling** - demo for Dr. May and clinicians | Client         | Pending - Dr. May interested                                   |
| 3     | **Production OpenAI API key** - needed before AI go-live | Client         | Pending                                                        |
| 4     | **Weekly Monday check-ins** - 30 min, scope control      | Alana          | Scheduling with Ryan                                           |
| 5     | **AI recording persistence bug** - audio lost on nav     | Dev            | Known, fix in 11.5                                             |

**AI Cost Estimate:** ~$0.10-0.30/visit (~$30-80/month at 300 visits/month)

---

## Known Issues

### 1. Facility Access Control - Data Disclosure Risk

Unapproved notes are visible to facility users. Phase 11.2.1 will hide pending note content and block PDF downloads for facility users on unapproved visits. ~1 day fix. **This is the highest-priority unblocked work item.**

### 2. Mobile Responsiveness

Desktop-first design. Some forms not optimized for tablet/mobile. Signature pad needs touch optimization. Addressed in Phase 11.3.

### 3. Test Coverage

Primarily manual testing. No automated unit or E2E tests. 40+ test scenarios defined in [phase-11/AI_DOCUMENTATION_TEST_PLAN.md](./phase-11/AI_DOCUMENTATION_TEST_PLAN.md).

### 4. AI Recording Persistence

Audio recording sometimes lost when navigating to other screens during a visit. Ryan acknowledged in Mar 16 meeting - needs recording state persisted across navigation. Fix planned for Phase 11.5.

### 5. No User Preferences Table

The `user_preferences` table (for PDF preferences, timezone) does not exist yet. No migration has been created. Required for Phase 11.4 (PDF enhancements).

### 6. No Admin Transcript Management Page

The `/dashboard/admin/transcripts` route does not exist. Admin cannot yet browse/search/playback all AI transcripts. Deferred from Phase 11.1, planned for Phase 11.5.

---

## Full Codebase Inventory

### Database Migrations

| File                                              | Tables Created/Modified                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `00001_complete_schema.sql` (1881 lines)          | 25 tables: tenants, facilities, patients, wounds, visits, assessments, photos, treatments, billings, users, user_roles, user_invites, user_facilities, wound_notes, signatures, patient_consents, addendum_notifications, patient_clinicians, procedure_scopes, patient_documents, skilled_nursing_assessments, skilled_nursing_wounds, gtube_procedures, grafting_assessments, skin_sweep_assessments. 80+ indexes, 17+ functions, 17 triggers, RLS on all tables |
| `00027_ai_transcription.sql` (200 lines)          | visit_transcripts, patient_recording_consents; ALTER visits (4 new AI columns)                                                                                                                                                                                                                                                                                                                                                                                     |
| `00028_fix_trigger_search_path.sql` (46 lines)    | Fix handle_new_user() and auto_assign_user_role() SECURITY DEFINER search_path                                                                                                                                                                                                                                                                                                                                                                                     |
| `00029_treatment_wound_id.sql` (58 lines)         | ALTER treatments: wound_id FK, treatment_tab, cleanser, coverage, secondary_treatment (JSONB), generated_order_text                                                                                                                                                                                                                                                                                                                                                |
| `00030_new_clinical_forms.sql` (253 lines)        | debridement_assessments, patient_not_seen_reports, incident_reports + RLS                                                                                                                                                                                                                                                                                                                                                                                          |
| `00031_consent_provider_signature.sql` (10 lines) | ALTER patient_consents ADD provider_signature_id UUID FK to signatures                                                                                                                                                                                                                                                                                                                                                                                             |

### Server Actions (23 files, ~175 functions)

| File                       | Functions | Purpose                                         |
| -------------------------- | --------- | ----------------------------------------------- |
| admin.ts                   | 7         | User/invite management                          |
| ai-transcription.ts        | 14        | AI recording, transcription, consent            |
| approval-workflow.ts       | 8+        | Office inbox, corrections, approvals            |
| assessments.ts             | 6         | Wound assessment CRUD + autosave                |
| auth.ts                    | 6         | Login, signup, password reset                   |
| billing.ts                 | 6         | CPT/ICD-10 billing CRUD                         |
| calendar.ts                | 8         | Calendar events, scheduling                     |
| documents.ts               | 7         | Patient document attachments                    |
| facilities.ts              | 4         | Facility CRUD                                   |
| new-forms.ts               | 12        | Debridement, not-seen, incident, consents       |
| patient-clinicians.ts      | 7         | Clinician-patient assignments                   |
| patients.ts                | 5         | Patient CRUD                                    |
| pdf.ts                     | 5         | PDF data + CSV export                           |
| pdf-cached.ts              | 7         | PDF caching layer                               |
| photos.ts                  | 7         | Wound photo upload/management                   |
| reports.ts                 | 6         | Visit log, clinician activity, facility summary |
| signature-audit.ts         | 3         | Signature audit logs                            |
| signatures.ts              | 11+       | Signatures, consent, visit signing              |
| specialized-assessments.ts | 12        | Skilled nursing, G-tube, grafting, skin sweep   |
| treatments.ts              | 6         | Treatment order CRUD + autosave                 |
| visits.ts                  | 9+        | Visit CRUD + autosave + addendums               |
| wound-notes.ts             | 4         | Per-wound notes                                 |
| wounds.ts                  | 7         | Wound CRUD                                      |

### Assessment & Form Components (16 total)

| Component                                 | Type                                     |
| ----------------------------------------- | ---------------------------------------- |
| assessment-type-selector.tsx              | 7-card type chooser dialog               |
| assessment-form.tsx                       | Standard wound assessment                |
| assessment-card.tsx                       | Assessment display card                  |
| multi-wound-assessment-form.tsx           | Multi-wound with Treatment Order Builder |
| treatment-order-builder.tsx (~1050 lines) | 4-tab sentence builder                   |
| debridement-assessment-form.tsx           | Arobella debridement (4 tabs)            |
| patient-not-seen-form.tsx                 | Not seen report                          |
| skilled-nursing-assessment-form.tsx       | Comprehensive RN/LVN assessment          |
| skin-sweep-assessment-form.tsx            | Full-body skin inspection                |
| grafting-assessment-form.tsx              | Skin graft procedure                     |
| gtube-procedure-form.tsx                  | G-tube replacement                       |
| consent-to-treatment-form.tsx             | Multi-step consent + 3 signatures        |
| photo-video-consent-modal.tsx             | HIPAA photo/video consent                |
| incident-report-form.tsx                  | Workplace incident                       |
| new-assessment-button.tsx                 | Button + type selector routing           |
| wound-switcher.tsx                        | Tab switcher for multi-wound flow        |

---

## Future Roadmap

### Post-Phase 11 (Q2-Q3 2026)

- AI-powered wound analysis (healing prediction)
- Patient portal (view own wound progress)
- Practice Fusion / PointClickCare integration (read-only patient data)
- Advanced reporting templates & schedulers
- Mobile app (React Native for iOS/Android)
- HL7/FHIR interoperability

---

**Architecture & schema:** [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
**Phase 11 details:** [phase-11/PHASE_11_PLAN.md](./phase-11/PHASE_11_PLAN.md)
**Phase history:** [archive/PHASE_HISTORY.md](./archive/PHASE_HISTORY.md)
