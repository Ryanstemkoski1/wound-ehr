# Wound EHR — System Design Document

> **Version:** 7.0
> **Date:** March 17, 2026
> **Status:** Phases 1–11.1, 11.6, 11.7 complete | Phase 11.2–11.5 remaining

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Frontend Architecture](#frontend-architecture)
6. [Server Actions & API](#server-actions--api)
7. [Key Features & Workflows](#key-features--workflows)
8. [Security & Access Control](#security--access-control)
9. [Design Decisions](#design-decisions)

---

## Executive Summary

### Project Goal

A custom EHR (Electronic Health Record) system designed for wound care documentation. Clinicians can:

- Track multiple wounds per patient with photo documentation
- Record detailed assessments with measurements, tissue composition, and healing status
- Document treatment orders via a 4-tab sentence builder
- Generate visit summaries and PDF/CSV exports
- Electronically sign visits with full audit trail
- Use AI-powered clinical note generation (Whisper + GPT-4)
- Manage users, facilities, and billing with role-based access control

### Core Problem

Existing EHR systems (Aprima, Practice Fusion, PointClickCare) lack wound-specific workflows, have no API for writing clinical data, and cannot be customized for specialized wound care documentation.

### Solution

A fully custom, web-based EHR platform with wound-centric UI design, adaptive assessment forms, built-in billing with credential-based procedure restrictions, and AI-assisted clinical note generation.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│       Desktop · Tablet · Phone (responsive web app)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Application Layer (Next.js 16 App Router)          │
│                                                              │
│  Server Components ─── Direct Supabase queries (reads)       │
│  Server Actions ─────── "use server" mutations, file ops     │
│  Client Components ──── Interactive UIs, forms, charts       │
│  API Route Handler ──── Binary audio upload (1 route)        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase (Backend Platform)                   │
│                                                              │
│  PostgreSQL ─── 31 tables, 75+ RLS policies, 20+ RPCs       │
│  Auth ────────── Email/password, JWT sessions                │
│  Storage ─────── wound-photos, patient-documents,            │
│                  visit-audio, patient-consents, pdf-cache     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  OpenAI Whisper ─── Speech-to-text (visit audio)            │
│  OpenAI GPT-4 ───── Clinical note synthesis                  │
│  Resend ──────────── Invite emails                           │
└─────────────────────────────────────────────────────────────┘
```

**Key architectural patterns:**

- **Server-first:** Data fetching in async Server Components. Client Components only for interactivity.
- **Server Actions for mutations:** All database writes use `"use server"` functions — no custom API routes except for binary audio upload.
- **Row-Level Security:** Supabase RLS enforces tenant and facility isolation at the database level.
- **Multi-tenant:** Single-database multi-tenancy with `tenants` → `facilities` → `patients` hierarchy.

---

## Technology Stack

### Frontend

| Technology             | Version        | Purpose                                                                    |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| Next.js                | 16.0.7         | App Router, Server Components, Server Actions                              |
| React                  | 19.2.0         | UI library                                                                 |
| TypeScript             | 5.x            | Strict mode enabled                                                        |
| Tailwind CSS           | 4.x            | Styling via PostCSS (no tailwind.config.js — uses `@theme` in globals.css) |
| shadcn/ui              | new-york style | 39 base UI components                                                      |
| React Hook Form + Zod  | 7.x / 4.x      | Form management and validation                                             |
| Recharts               | 3.x            | Dashboard charts (bar, line, pie)                                          |
| React Big Calendar     | 1.19           | Scheduling calendar with DnD                                               |
| @react-pdf/renderer    | 4.x            | Client-side PDF generation                                                 |
| react-dropzone         | 14.x           | Photo drag-and-drop upload                                                 |
| react-signature-canvas | 1.1            | E-signature capture                                                        |
| Lucide React           | 0.548          | Icons                                                                      |
| sonner                 | 2.x            | Toast notifications                                                        |
| date-fns               | 4.x            | Date formatting                                                            |

### Backend & Data

| Technology                            | Purpose                                           |
| ------------------------------------- | ------------------------------------------------- |
| Supabase PostgreSQL                   | Database with JSONB, RLS, triggers, RPC functions |
| @supabase/supabase-js + @supabase/ssr | Database client with cookie-based auth            |
| OpenAI Whisper (whisper-1)            | Speech-to-text for visit recordings               |
| OpenAI GPT-4 Turbo                    | Clinical note generation from transcripts         |
| Resend                                | Transactional email (invite system)               |

### Development

| Tool         | Purpose                                       |
| ------------ | --------------------------------------------- |
| ESLint       | Flat config with Next.js preset + Prettier    |
| Prettier     | Code formatting with Tailwind class sorting   |
| supabase CLI | Database type generation (`npm run db:types`) |
| tsx          | TypeScript script runner (seed)               |

---

## Database Schema

### Table Overview (31 tables)

#### Core Clinical Tables

| Table         | Description                 | Key Columns                                                                                                                                       |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patients`    | Patient demographics        | `facility_id` FK, `insurance_info` (JSONB), `allergies` (JSONB), `medical_history` (JSONB), `is_active`                                           |
| `wounds`      | Wound records               | `patient_id` FK, `location`, `wound_type`, `status` (active/healed/archived)                                                                      |
| `visits`      | Visit records               | `patient_id` FK, full signature workflow status, AI transcript links, `addendum_count`                                                            |
| `assessments` | Wound assessments           | `visit_id` + `wound_id` FKs, measurements (L×W×D), tissue %, healing status, infection signs                                                      |
| `photos`      | Wound photos                | `wound_id` + `visit_id` + `assessment_id` FKs, stored in Supabase Storage                                                                         |
| `treatments`  | Treatment orders            | `visit_id` + `wound_id` FKs, 4-tab JSONB state (primary_dressings, compression, moisture_management, secondary_treatment), `generated_order_text` |
| `billings`    | CPT/ICD-10 billing          | `visit_id` + `patient_id` FKs, `cpt_codes` (JSONB), `icd10_codes` (JSONB), modifiers                                                              |
| `wound_notes` | Per-wound notes + addendums | `wound_id` + `visit_id` FKs, `note_type` (note/addendum), `created_by`                                                                            |

#### Auth & Multi-Tenancy

| Table             | Description             | Key Columns                                                                                                       |
| ----------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tenants`         | SaaS organizations      | `name`, `subdomain`, `is_active`                                                                                  |
| `users`           | Public user profiles    | Synced from `auth.users` via trigger, `credentials` (RN/LVN/MD/DO/PA/NP/CNA/Admin), `tenant_id`                   |
| `user_roles`      | RBAC roles              | `user_id`, `role` (tenant_admin/facility_admin/user), `tenant_id`, `facility_id` — RLS disabled, accessed via RPC |
| `user_invites`    | Email invites           | `email`, `role`, `invite_token`, `expires_at`                                                                     |
| `user_facilities` | User ↔ Facility access | `user_id` + `facility_id` junction                                                                                |
| `facilities`      | Medical facilities      | `tenant_id` FK, `name`, address fields, `is_active`                                                               |

#### Signature & Compliance

| Table                    | Description              | Key Columns                                                                                                                 |
| ------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `signatures`             | E-signatures (immutable) | `signature_type` (patient/provider/consent), `signature_data` (base64), `signature_method` (draw/type/upload), `ip_address` |
| `patient_consents`       | Consent-to-treat         | `patient_id`, `consent_type`, `patient_signature_id`, `witness_signature_id`, `provider_signature_id`                       |
| `patient_clinicians`     | Clinician assignments    | `patient_id` + `user_id`, `role` (primary/supervisor/covering), `is_active`                                                 |
| `addendum_notifications` | Post-approval changes    | `visit_id`, `addendum_id`, tracks office acknowledgment                                                                     |
| `procedure_scopes`       | CPT → credential mapping | `procedure_code`, `allowed_credentials` (text array)                                                                        |
| `patient_documents`      | Document attachments     | 11 document types, Supabase Storage, `is_archived` soft delete                                                              |

#### Specialized Assessments

| Table                         | Description                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `skilled_nursing_assessments` | Comprehensive RN/LVN assessments (100+ fields: vitals, neuro, cardio, GI, GU, nutrition) |
| `skilled_nursing_wounds`      | Sub-table: wound entries within skilled nursing assessment                               |
| `gtube_procedures`            | G-tube replacement/removal documentation                                                 |
| `grafting_assessments`        | Skin graft procedure documentation                                                       |
| `skin_sweep_assessments`      | Full-body skin inspection (Braden scale, prevention plan)                                |
| `debridement_assessments`     | Arobella ultrasonic debridement (pre/post wound assessment)                              |
| `patient_not_seen_reports`    | Reason patient was not seen + follow-up plan                                             |
| `incident_reports`            | Facility incident reports                                                                |

#### AI Transcription

| Table                        | Description                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `visit_transcripts`          | Audio URL → Whisper transcript → GPT-4 clinical note → clinician review status |
| `patient_recording_consents` | One-time consent per patient for audio recording (unique on `patient_id`)      |

### Migrations (6 files)

| File                                     | Purpose                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `00001_complete_schema.sql` (1881 lines) | Consolidated base schema: 25 tables, 80+ indexes, 17+ RPC functions, 17 triggers, full RLS |
| `00027_ai_transcription.sql`             | `visit_transcripts` + `patient_recording_consents` tables; adds 4 AI columns to `visits`   |
| `00028_fix_trigger_search_path.sql`      | Security fix: `search_path` on DEFINER auth triggers                                       |
| `00029_treatment_wound_id.sql`           | Adds `wound_id` FK + treatment builder columns to `treatments`                             |
| `00030_new_clinical_forms.sql`           | `debridement_assessments`, `patient_not_seen_reports`, `incident_reports` + RLS            |
| `00031_consent_provider_signature.sql`   | Adds `provider_signature_id` to `patient_consents`                                         |

### RPC Functions (20+)

Key server-side PostgreSQL functions (most are `SECURITY DEFINER` to bypass RLS):

| Function                                           | Purpose                                                     |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `handle_new_user()`                                | Trigger: sync `auth.users` → `public.users` on signup       |
| `auto_assign_user_role()`                          | Trigger: auto-assign default tenant/facility role on signup |
| `get_tenant_user_roles(uuid)`                      | List all user roles in a tenant (bypasses RLS recursion)    |
| `get_current_user_credentials()`                   | Return current user's credentials and name                  |
| `get_user_role_info(uuid)`                         | Get user's role without RLS recursion                       |
| `can_perform_procedure(text, text)`                | Credential-based procedure authorization                    |
| `get_allowed_procedures(text)`                     | List procedures allowed for a credential                    |
| `get_signature_audit_logs(...)`                    | Query signature audit trail with filters                    |
| `get_signature_audit_stats(...)`                   | Aggregate signature statistics                              |
| `get_visit_addendums(uuid)`                        | Get addendums with author info                              |
| `get_skilled_nursing_assessment_with_wounds(uuid)` | Assessment + wound sub-records as JSON                      |
| `is_visit_ready_for_signature(uuid)`               | Check if visit can be signed                                |

### Supabase Storage Buckets (5)

| Bucket              | Visibility            | Purpose                                   |
| ------------------- | --------------------- | ----------------------------------------- |
| `wound-photos`      | Public                | Wound assessment photos                   |
| `patient-documents` | Private (signed URLs) | Patient document attachments (10MB limit) |
| `visit-audio`       | Private (signed URLs) | AI recording audio files (500MB limit)    |
| `patient-consents`  | Private (signed URLs) | Scanned consent documents                 |
| `pdf-cache`         | Private (signed URLs) | Cached generated PDFs                     |

---

## Frontend Architecture

### Route Structure (41 pages + 1 API route)

#### Public Routes (8 pages)

| Route                   | Type   | Description                                     |
| ----------------------- | ------ | ----------------------------------------------- |
| `/`                     | Server | Redirects to `/dashboard`                       |
| `/login`                | Client | Login form                                      |
| `/signup`               | Client | Invite-required signup (disabled without token) |
| `/auth/accept-invite`   | Client | Invite acceptance + signup form                 |
| `/auth/confirm-email`   | Server | Email confirmation instructions                 |
| `/auth/forgot-password` | Client | Password reset request                          |
| `/auth/reset-password`  | Client | New password form                               |
| `/auth/resend`          | Client | Resend confirmation email                       |

#### Dashboard Routes (33 pages)

All protected by auth guard in `app/dashboard/layout.tsx`.

**Patient Management:**

| Route                                          | Type   | Description                                                                       |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `/dashboard/patients`                          | Server | Patient list with search, filter, sort                                            |
| `/dashboard/patients/new`                      | Server | New patient form                                                                  |
| `/dashboard/patients/[id]`                     | Server | Patient detail — tabbed: Overview, Wounds, Visits, Documents, Clinicians, Consent |
| `/dashboard/patients/[id]/edit`                | Server | Edit patient demographics                                                         |
| `/dashboard/patients/[id]/consent`             | Server | Consent-to-treatment form                                                         |
| `/dashboard/patients/[id]/gtube-procedure/new` | Server | G-tube procedure form                                                             |

**Wound Management:**

| Route                                            | Type   | Description                                            |
| ------------------------------------------------ | ------ | ------------------------------------------------------ |
| `/dashboard/wounds`                              | Server | Global wound board (Kanban by status)                  |
| `/dashboard/patients/[id]/wounds/new`            | Server | New wound form                                         |
| `/dashboard/patients/[id]/wounds/[woundId]`      | Server | Wound detail — tabbed: Assessments, Photos, Comparison |
| `/dashboard/patients/[id]/wounds/[woundId]/edit` | Server | Edit wound                                             |

**Visit Management:**

| Route                                            | Type   | Description                                                                                                 |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| `/dashboard/patients/[id]/visits/new`            | Server | New visit form with CPT restrictions                                                                        |
| `/dashboard/patients/[id]/visits/[visitId]`      | Server | Visit detail (737 lines — largest page): assessments, billing, treatments, signatures, AI status, addendums |
| `/dashboard/patients/[id]/visits/[visitId]/edit` | Server | Edit visit                                                                                                  |

**Assessment & Form Routes (7 pages):**

| Route                                        | Description                              |
| -------------------------------------------- | ---------------------------------------- |
| `.../visits/[visitId]/assessments/new`       | Multi-wound assessment form              |
| `.../visits/[visitId]/assessments/[id]/edit` | Edit single assessment + treatment order |
| `.../visits/[visitId]/skin-sweep/new`        | Skin sweep form                          |
| `.../visits/[visitId]/skilled-nursing/new`   | Skilled nursing assessment               |
| `.../visits/[visitId]/not-seen/new`          | Patient not seen report                  |
| `.../visits/[visitId]/debridement/new`       | Debridement assessment                   |
| `.../visits/[visitId]/grafting/new`          | Grafting assessment                      |

**Admin Routes (6 pages, `isAdmin()` gated):**

| Route                                   | Description                |
| --------------------------------------- | -------------------------- |
| `/dashboard/admin/users`                | User management            |
| `/dashboard/admin/invites`              | Invite management          |
| `/dashboard/admin/facilities`           | Facility list              |
| `/dashboard/admin/facilities/new`       | New facility form          |
| `/dashboard/admin/facilities/[id]/edit` | Edit facility              |
| `/dashboard/admin/signatures`           | Signature audit logs       |
| `/dashboard/admin/inbox`                | Office note approval inbox |

**Other Dashboard Routes:**

| Route                      | Type   | Description                                                                           |
| -------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `/dashboard`               | Server | Stats cards, recent visits, wound chart, admin stats                                  |
| `/dashboard/calendar`      | Client | Calendar view (only client page in dashboard)                                         |
| `/dashboard/billing`       | Server | Billing reports with filters                                                          |
| `/dashboard/reports`       | Server | Report hub — 4 tabs: Visit Log, Clinician Activity, Facility Summary, Medical Records |
| `/dashboard/corrections`   | Server | Clinician corrections needed list                                                     |
| `/dashboard/incidents/new` | Server | Incident report form                                                                  |

**API Route:**

| Route               | Method | Description                                                                         |
| ------------------- | ------ | ----------------------------------------------------------------------------------- |
| `/api/upload-audio` | POST   | Audio file upload for AI transcription (binary FormData — can't use Server Actions) |

### Component Organization (134 files)

| Directory                 | Files | Description                                                                                                                                      |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/ui/`          | 39    | shadcn/ui primitives + custom (autosave indicator, dynamic breadcrumbs, loading skeletons)                                                       |
| `components/layout/`      | 4     | App shell: sidebar, header, footer, dashboard layout                                                                                             |
| `components/admin/`       | 6     | User/invite management, office inbox, signature audit, void/correction dialogs                                                                   |
| `components/assessments/` | 13    | All clinical forms: standard, multi-wound, debridement, grafting, G-tube, skilled nursing, skin sweep, patient-not-seen, treatment order builder |
| `components/billing/`     | 4     | Billing forms with credential-based CPT filtering                                                                                                |
| `components/calendar/`    | 4     | Calendar view, filters, event modal, new visit dialog                                                                                            |
| `components/consents/`    | 2     | Consent-to-treat, photo/video consent                                                                                                            |
| `components/dashboard/`   | 4     | Dashboard charts (lazy-loaded), correction banner                                                                                                |
| `components/facilities/`  | 2     | Facility form and actions                                                                                                                        |
| `components/forms/`       | 1     | Incident report form                                                                                                                             |
| `components/patients/`    | 14    | Patient CRUD, documents (upload/list/viewer), consent management, clinician assignment                                                           |
| `components/pdf/`         | 7     | 3 PDF templates (@react-pdf) + 3 download buttons + CSV export                                                                                   |
| `components/photos/`      | 3     | Photo gallery, upload, side-by-side comparison                                                                                                   |
| `components/reports/`     | 5     | 4 report types under tabbed interface                                                                                                            |
| `components/signatures/`  | 4     | Signature pad, display, recording consent modal/status                                                                                           |
| `components/visits/`      | 13    | Visit form, actions, signature workflow, addendums, AI recorder/review/status                                                                    |
| `components/wounds/`      | 9     | Wound card, form, actions, assessment history, board view, list view, quick stats                                                                |

**Split: 114 Client Components (85%) / 20 Server Components (15%).** Server components are used for read-only cards (assessment, patient, visit), PDF templates, and base UI primitives.

### Library Utilities (24 files in `lib/`)

| File                                 | Purpose                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `utils.ts`                           | `cn()` — Tailwind class merging (clsx + tailwind-merge)                                                         |
| `rbac.ts`                            | Core RBAC: `getUserRole()`, `isAdmin()`, `requireTenantAdmin()`, `getUserCredentials()`, facility access checks |
| `credentials.ts`                     | Credential types (RN/LVN/MD/DO/PA/NP/CNA/Admin), access level classification, patient signature requirements    |
| `field-permissions.ts`               | Field-level edit permissions based on credentials + role (8 patient categories, 6 visit categories)             |
| `procedures.ts`                      | Credential-based CPT code filtering via `procedure_scopes` table                                                |
| `billing-codes.ts`                   | Reference data: ~30 CPT codes, ~40 ICD-10 codes, ~20 modifiers                                                  |
| `treatment-options.ts`               | Treatment Order Builder: all dropdown options, sentence generators for 4 tabs (692 lines)                       |
| `ai-config.ts`                       | OpenAI config, system prompt for clinical notes, consent text, pricing                                          |
| `autosave.ts`                        | localStorage-based form persistence (24hr window)                                                               |
| `email.ts`                           | Invite email via Resend with branded HTML template                                                              |
| `pdf-cache.ts`                       | PDF caching in Supabase Storage                                                                                 |
| `database.types.ts`                  | Auto-generated TypeScript types from Supabase schema (3,437 lines)                                              |
| `validations/assessment.ts`          | Clinical validation: treatment-exudate compatibility, tissue=100%, measurement sanity                           |
| `ai/openai-service.ts`               | Whisper + GPT-4 API client with retries, backoff, timeouts                                                      |
| `ai/transcription-pipeline.ts`       | 4-step pipeline: download → transcribe → generate note → save                                                   |
| `ai/usage-tracking.ts`               | Per-clinician AI cost monitoring and warnings                                                                   |
| `hooks/use-audio-recorder.ts`        | MediaRecorder hook with waveform analysis                                                                       |
| `hooks/use-autosave.ts`              | Periodic form autosave hook                                                                                     |
| `hooks/use-transcription-polling.ts` | Poll AI processing status every 3s                                                                              |
| `supabase/server.ts`                 | Server-side Supabase client (cookie-based)                                                                      |
| `supabase/client.ts`                 | Browser-side Supabase client                                                                                    |
| `supabase/admin.ts`                  | Service-role client (bypasses RLS — user deletion)                                                              |
| `supabase/service.ts`                | Service-role client (bypasses RLS — user queries)                                                               |
| `supabase/middleware.ts`             | Auth middleware: token refresh, route protection                                                                |

---

## Server Actions & API

### 23 Action Files (~175 exported functions)

| File                         | #   | Purpose                                                      | Key Tables                                                                                          |
| ---------------------------- | --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `admin.ts`                   | 7   | User/invite management                                       | `user_roles`, `user_invites`, `user_facilities`                                                     |
| `ai-transcription.ts`        | 14  | Recording consent, audio upload, transcription, approval     | `visit_transcripts`, `patient_recording_consents`                                                   |
| `approval-workflow.ts`       | 9   | Office inbox, corrections, approvals, addendum notifications | `visits`, `wound_notes`, `addendum_notifications`                                                   |
| `assessments.ts`             | 6   | Wound assessment CRUD + autosave                             | `assessments`, `wounds`                                                                             |
| `auth.ts`                    | 6   | Login, signup, password reset                                | `user_invites`, `user_roles`                                                                        |
| `billing.ts`                 | 6   | CPT/ICD-10 billing CRUD                                      | `billings`                                                                                          |
| `calendar.ts`                | 8   | Calendar events, scheduling, patient search                  | `visits`, `patient_clinicians`                                                                      |
| `documents.ts`               | 7   | Patient document upload/archive                              | `patient_documents`                                                                                 |
| `facilities.ts`              | 4   | Facility CRUD                                                | `facilities`, `user_facilities`                                                                     |
| `new-forms.ts`               | 12  | Debridement, not-seen, incident, consent forms               | `debridement_assessments`, `patient_not_seen_reports`, `incident_reports`, `patient_consents`       |
| `patient-clinicians.ts`      | 7   | Clinician assignments                                        | `patient_clinicians`                                                                                |
| `patients.ts`                | 5   | Patient CRUD with field permissions                          | `patients`                                                                                          |
| `pdf.ts`                     | 5   | PDF data aggregation + CSV export                            | Multiple (read-only)                                                                                |
| `pdf-cached.ts`              | 7   | PDF caching layer                                            | `visits` (status check)                                                                             |
| `photos.ts`                  | 7   | Wound photo management                                       | `photos`                                                                                            |
| `reports.ts`                 | 6   | Visit log, clinician activity, facility summary              | `visits`, `assessments`, `users`                                                                    |
| `signature-audit.ts`         | 3   | Signature audit logs (admin only)                            | Via RPC                                                                                             |
| `signatures.ts`              | 13  | Signatures, consent, visit signing workflow                  | `signatures`, `patient_consents`, `visits`                                                          |
| `specialized-assessments.ts` | 13  | Skilled nursing, G-tube, grafting, skin sweep                | `skilled_nursing_assessments`, `gtube_procedures`, `grafting_assessments`, `skin_sweep_assessments` |
| `treatments.ts`              | 6   | Treatment order CRUD + autosave                              | `treatments`                                                                                        |
| `visits.ts`                  | 10  | Visit CRUD, autosave, addendums                              | `visits`, `wound_notes`                                                                             |
| `wound-notes.ts`             | 4   | Per-wound free-text notes                                    | `wound_notes`                                                                                       |
| `wounds.ts`                  | 7   | Wound CRUD + mark healed                                     | `wounds`                                                                                            |

### Cross-Cutting Patterns

| Pattern                    | Where Used                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod validation**         | admin, assessments, auth, billing, calendar, facilities, patients, visits, wound-notes, wounds                                              |
| **RPC calls (bypass RLS)** | admin, billing, signatures, visits, signature-audit, specialized-assessments, documents, pdf                                                |
| **Supabase Storage**       | ai-transcription (visit-audio), documents (patient-documents), photos (wound-photos), signatures (patient-consents), pdf-cached (pdf-cache) |
| **Service/Admin client**   | admin (user management), auth (login validation)                                                                                            |
| **RBAC imports**           | admin, patients, visits, signature-audit                                                                                                    |
| **Field permissions**      | patients (demographics/insurance), visits (ownership)                                                                                       |
| **Autosave draft**         | assessments, treatments, visits                                                                                                             |
| **Soft delete**            | facilities, patients, patient-clinicians, documents                                                                                         |
| **revalidatePath**         | All mutation actions                                                                                                                        |

---

## Key Features & Workflows

### 1. Visit Lifecycle

```
Draft → Ready for Signature → Signed → Submitted to Office
                                              ↓
                                   Approved / Needs Correction / Voided
```

- **Draft:** Clinician saves incomplete work. Autosave every 30s (localStorage) + server draft.
- **Ready for Signature:** All required fields validated. Visit becomes read-only.
- **Signed:** Clinician signs electronically (draw or type). Patient signature collected if credentials are RN/LVN.
- **Submitted:** Sent to office approval queue via `sendNoteToOffice()`.
- **Approved/Correction/Voided:** Office reviews in inbox. Corrections loop back to clinician with notes.
- **Addendums:** Post-approval changes are addendums only — original note is immutable.

### 2. Two-Layer Assessment System

**Standard Assessment per wound per visit (`assessments` table):**

- Measurements: L × W × D, area auto-calculated
- Tissue composition: Must total 100%
- Wound characteristics: Healing status, exudate, stage, odor, pain, periwound, infection signs, risk factors
- Treatment Order Builder: 4-tab sentence generator (Topical / Compression / Skin / Rash)

**Specialized Assessments (5 types, separate tables):**

- Skilled Nursing (RN/LVN comprehensive — 100+ fields)
- Grafting (skin graft procedure)
- Skin Sweep (full-body inspection + Braden scale)
- Debridement (Arobella ultrasonic)
- G-Tube (gastrostomy procedure)

### 3. Treatment Order Builder

4-tab sentence builder that auto-generates readable treatment orders per wound:

- **Tab 1 (Topical):** Cleanser → treatment → coverage → frequency → sentence
- **Tab 2 (Compression/NPWT):** ACE/TED/UNNA/Layered/NPWT with pressure+schedule
- **Tab 3 (Skin/Moisture):** Skin cleanser → moisture barrier → coverage
- **Tab 4 (Rash/Dermatitis):** Treatment → coverage → secondary/tertiary dressings → frequency

Data stored as JSONB in `treatments` table per wound per visit. `generated_order_text` stores the human-readable sentence.

### 4. AI Clinical Note Generation

End-to-end pipeline: patient consent → audio recording → Whisper transcription → GPT-4 note synthesis → clinician review/approval.

- **Consent:** One-time per patient, HIPAA-compliant, revocable
- **Recording:** Browser MediaRecorder with waveform visualization
- **Processing:** Background pipeline with atomic claim guard, intermediate saves
- **Review:** Tabbed view (AI note / Edit / Raw transcript / Diff), approve/reject/regenerate
- **Cost tracking:** Per-clinician monthly usage monitoring (~$0.10-0.30/visit)

### 5. Electronic Signatures

Three-tier system:

1. **Initial Consent-to-Treat** (one-time per patient) — patient + optional witness + provider signatures
2. **Patient Signature** (per visit, RN/LVN only) — collected at bedside
3. **Provider Signature** (per visit, all clinicians) — certifies documentation accuracy

Methods: canvas drawing or typed name. All include timestamp, IP address. Signatures are immutable after creation. Full audit trail via `get_signature_audit_logs` RPC.

### 6. Note Approval Workflow

Office inbox at `/dashboard/admin/inbox` for reviewing submitted visit notes:

- **Review:** Admin reviews clinician documentation
- **Approve:** Note locked, becomes visible to facility users
- **Request Correction:** Returns to clinician with notes, clinician sees banner on dashboard
- **Void:** Invalidate with reason (audit trail)
- **Addendum Notifications:** Post-approval changes tracked and require office acknowledgment

### 7. Photo Documentation

- Upload: Drag-and-drop via react-dropzone (JPEG, PNG, WEBP, HEIC, 10MB limit)
- Gallery: Grid view with lightbox
- Comparison: Side-by-side before/after with timeline navigation
- Storage: Supabase Storage `wound-photos` bucket (public, CDN-backed)
- Linked to wounds, visits, and assessments for proper timeline tracking

### 8. PDF & CSV Export

Three PDF types generated client-side via @react-pdf/renderer:

| Type            | Content                                              |
| --------------- | ---------------------------------------------------- |
| Visit Summary   | Assessments, photos, signatures, treatments, billing |
| Wound Progress  | Multi-visit measurement trends, photo timeline       |
| Patient Summary | Demographics, wounds, recent visits                  |

Caching: Generated PDFs cached in Supabase Storage (`pdf-cache` bucket) for signed/submitted visits.

CSV exports: Patients list, wounds list, visit log, billing data.

### 9. Calendar & Scheduling

React Big Calendar with:

- Month/week/day views
- Color-coded by visit status
- Drag-and-drop rescheduling
- Click → modal (not page redirect)
- "My Patients" filter via `patient_clinicians`
- New Visit dialog with patient search

---

## Security & Access Control

### Authentication

- Supabase Auth with email/password
- JWT sessions managed via middleware cookie refresh
- Protected routes: all `/dashboard/**` require authenticated user
- Auth middleware in `lib/supabase/middleware.ts`

### Two-Layer Authorization

**1. Administrative Roles** (data access scope):

| Role             | Scope                                                       |
| ---------------- | ----------------------------------------------------------- |
| `tenant_admin`   | All facilities in tenant, full admin panel, user management |
| `facility_admin` | Single facility, can invite users within facility           |
| `user`           | Assigned facilities only, no admin access                   |

**2. Clinical Credentials** (procedure scope):

| Credential     | Clinical Access                                           | Patient Signature Required |
| -------------- | --------------------------------------------------------- | -------------------------- |
| MD, DO, PA, NP | Full procedure access (incl. sharp debridement, grafting) | No                         |
| RN, LVN        | Limited procedures (no sharp debridement or grafting)     | Yes (every visit)          |
| CNA            | View-only                                                 | N/A                        |
| Admin          | Non-clinical (admin only)                                 | N/A                        |

### Enforcement Layers

1. **Middleware:** Route protection (redirect unauthenticated users)
2. **Dashboard Layout:** Server-side auth check on every dashboard page
3. **Admin Pages:** `isAdmin()` RBAC check — redirect non-admins
4. **Server Actions:** Auth + ownership + credential checks before mutations
5. **Database RLS:** 75+ policies enforce tenant/facility isolation at the query level
6. **Field Permissions:** `lib/field-permissions.ts` — admins edit demographics/insurance, clinicians edit clinical data only
7. **Procedure Scopes:** `procedure_scopes` table — CPT codes filtered by credentials in billing and assessment forms

### Row-Level Security

RLS enabled on 30/31 tables (`user_roles` disabled — uses RPC to avoid recursion).

Key patterns:

- **Facility-scoped:** Data visible only for patients in user's assigned facilities
- **Role-based writes:** Admin operations restricted to admin roles
- **Immutable records:** `signatures` and `patient_consents` allow INSERT only
- **Owner-based:** Wound notes, photos, documents editable only by creator
- **Clinician assignment:** AI transcripts accessible to assigned clinician or visit performer

---

## Design Decisions

### 1. No API Routes (Server Actions Only)

All database mutations use Server Actions (`"use server"`). The single exception is `/api/upload-audio` for binary FormData handling (Next.js Server Actions can't handle raw binary streams efficiently).

### 2. Supabase over Prisma

Direct Supabase JS client for all queries — no ORM. Types auto-generated from the database schema. This provides tight integration with Supabase Auth, Storage, and RLS.

### 3. Wound-Centric UI Philosophy

Patient detail page centers on wound cards rather than visit history. Clinicians think in terms of wounds, not visits. Each wound card shows location, status, latest measurements, latest photo, and recent visit history. Visits are accessible as a secondary tab.

### 4. JSONB for Flexible Fields

`insurance_info`, `emergency_contact`, `allergies`, `medical_history`, `cpt_codes`, `icd10_codes`, treatment state — all stored as JSONB to avoid rigid schema from evolving clinical requirements.

### 5. Soft Deletes for Compliance

Patients, facilities, patient-clinician assignments, and documents use `is_active`/`is_archived` flags. No hard deletes for HIPAA audit trail compliance.

### 6. Dual Autosave

Client-side localStorage (30s interval) for offline resilience + server-side draft saves (via autosave server actions) for cross-device access. Recovery modal on page load if unsaved data detected.

### 7. PDF Caching Strategy

Generated PDFs cached in Supabase Storage. Only signed/submitted visits are cached. Cache invalidated when addendums are added. Expected 80-95% faster PDF downloads for repeat access.

### 8. No Data Migration

Clean start — no legacy data migration from Aprima or other EHR systems. CSV export provides data portability.

### 9. Multi-Tenant Single-Database

All tenants share one PostgreSQL database. Isolation enforced by RLS policies using `tenant_id` chains through `facilities` → `user_facilities`. Simplifies deployment while maintaining data separation.

### 10. OpenAI for Transcription (Not Medical-Specific)

Chose OpenAI Whisper + GPT-4 over medical-specific services (Nuance DAX, Amazon Transcribe Medical) for cost, accuracy, and flexibility. Clinical note format controlled via GPT-4 system prompt. Cost: ~$0.10-0.30/visit (~$30-80/month at 300 visits).

---

**For current project status and remaining work:** See [PROJECT_STATUS.md](./PROJECT_STATUS.md)
**For implementation history:** See [archive/PHASE_HISTORY.md](./archive/PHASE_HISTORY.md)
**For Phase 11 details:** See [phase-11/PHASE_11_PLAN.md](./phase-11/PHASE_11_PLAN.md)
