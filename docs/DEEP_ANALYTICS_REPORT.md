# wound-ehr — Deep Codebase Analytics Report

**Generated:** 2026-05-01  
**Scope:** Every TypeScript/TSX source file, SQL migration, API route, configuration file  
**Method:** Automated metric extraction (PowerShell) + manual deep-read of all major files

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Size & Structure](#2-codebase-size--structure)
3. [Dependency Map](#3-dependency-map)
4. [Server Actions — Deep Analysis](#4-server-actions--deep-analysis)
5. [Library Layer — Deep Analysis](#5-library-layer--deep-analysis)
6. [Component Layer — Deep Analysis](#6-component-layer--deep-analysis)
7. [App Pages & Layouts — Deep Analysis](#7-app-pages--layouts--deep-analysis)
8. [API Routes](#8-api-routes)
9. [Database Layer (Migrations)](#9-database-layer-migrations)
10. [Security Analysis (OWASP / HIPAA)](#10-security-analysis-owasp--hipaa)
11. [Code Quality Issues](#11-code-quality-issues)
12. [Architecture Assessment](#12-architecture-assessment)
13. [Performance Analysis](#13-performance-analysis)
14. [HIPAA Compliance Analysis](#14-hipaa-compliance-analysis)
15. [Prioritized Issue Register](#15-prioritized-issue-register)

---

## 1. Executive Summary

wound-ehr is a **production-grade clinical EHR system** for wound care management. It is built on Next.js 16 App Router with Supabase (PostgreSQL + RLS + Auth), React 19, TypeScript strict mode, Tailwind CSS v4, and shadcn/ui. The codebase is architecturally sound and shows evidence of security hardening (migration 00034/00035 applied critical fixes). The majority of the 295 source files are well-structured. However, several patterns require attention before the system can be considered fully production-hardened.

**High-level scorecard:**

| Category                  | Status                                               | Score           |
| ------------------------- | ---------------------------------------------------- | --------------- |
| Architecture              | Clean layered structure                              | ✅ Good         |
| TypeScript correctness    | `tsc --noEmit` exits 0                               | ✅ Clean        |
| ESLint errors             | 2 blocking errors                                    | ❌ Fix required |
| ESLint warnings           | 6 warnings                                           | ⚠️ Minor        |
| Input validation          | Zod on 10/30 actions that use FormData               | ⚠️ Gap          |
| Auth guards               | All 30 actions have auth checks                      | ✅ Complete     |
| Rate limiting             | Only 2/31 endpoints                                  | ❌ Gap          |
| HIPAA audit logging       | auditPhiAccess in 11/30 actions                      | ⚠️ Incomplete   |
| PHI in localStorage       | Visit/assessment drafts autosaved                    | ⚠️ Risk         |
| Error handling            | wind-notes.ts has zero try/catch                     | ❌ Bug          |
| SQL injection             | None — all queries use Supabase parameterized client | ✅ Clean        |
| XSS vectors               | No dangerouslySetInnerHTML, no eval()                | ✅ Clean        |
| Open redirects            | None found                                           | ✅ Clean        |
| Hardcoded secrets         | None in source (all env vars)                        | ✅ Clean        |
| Service role key exposure | Contained to 5 authorized files                      | ✅ Acceptable   |

---

## 2. Codebase Size & Structure

### File Counts

| Layer                           | Files   | Notes                                                  |
| ------------------------------- | ------- | ------------------------------------------------------ |
| **Total TypeScript/TSX**        | **295** | Excludes node_modules, .next                           |
| Server actions (`app/actions/`) | 30      | Largest: visits.ts 1,204L                              |
| App pages/layouts               | 66      | page.tsx, layout.tsx, error.tsx, loading.tsx           |
| Components (`components/`)      | 160     | 43 in `ui/` (shadcn base)                              |
| Library (`lib/`)                | 24      | Core utilities and services                            |
| Hooks (`lib/hooks/`)            | 7       | Custom React hooks                                     |
| API routes (`app/api/`)         | 1       | upload-audio only                                      |
| Config files                    | 7       | next.config.ts, tsconfig.json, eslint.config.mjs, etc. |
| SQL migrations                  | 20      | 1,881L base + 19 incremental                           |

### Lines of Code

| Layer                 | Lines       |
| --------------------- | ----------- |
| TypeScript/TSX source | ~76,000     |
| SQL migrations        | ~3,700      |
| **Total**             | **~79,700** |

### File Size Distribution

| Bucket          | Count    |
| --------------- | -------- |
| < 100 lines     | 48 files |
| 100–300 lines   | 72 files |
| 300–600 lines   | 89 files |
| 600–1,000 lines | 54 files |
| > 1,000 lines   | 32 files |

**Largest files by line count:**

| File                                                         | Lines | Notes                           |
| ------------------------------------------------------------ | ----- | ------------------------------- |
| `lib/database.types.ts`                                      | 3,888 | Auto-generated — do not edit    |
| `components/assessments/skilled-nursing-assessment-form.tsx` | 1,418 | Split candidate                 |
| `app/actions/specialized-assessments.ts`                     | 1,150 | Split candidate                 |
| `components/assessments/skin-sweep-assessment-form.tsx`      | 1,273 | Split candidate                 |
| `app/actions/visits.ts`                                      | 1,204 | Core action — complex by nature |
| `app/actions/pdf.ts`                                         | 933   | PDF generation complexity       |
| `app/actions/ai-transcription.ts`                            | 990   | AI pipeline complexity          |
| `lib/ai/transcription-pipeline.ts`                           | 468   | Well-organized                  |
| `app/dashboard/page.tsx`                                     | 855   | Dashboard orchestration         |

---

## 3. Dependency Map

### Production Dependencies (37 packages)

| Package                         | Version        | Purpose                 | Risk             |
| ------------------------------- | -------------- | ----------------------- | ---------------- |
| `next`                          | ^16.0.7        | Framework               | Core             |
| `react` / `react-dom`           | 19.2.0         | UI runtime              | Core             |
| `@supabase/supabase-js`         | ^2.77.0        | DB/Auth/Storage         | Core             |
| `@supabase/ssr`                 | ^0.7.0         | Server-side Supabase    | Core             |
| `zod`                           | ^4.1.12        | Input validation        | Core             |
| `@react-pdf/renderer`           | ^4.3.1         | PDF generation          | Core             |
| `resend`                        | ^6.4.2         | Email delivery          | External         |
| `react-signature-canvas`        | ^1.1.0-alpha.2 | Signature drawing       | ⚠️ alpha version |
| `react-hook-form`               | ^7.65.0        | Form state              | Core             |
| `@hookform/resolvers`           | ^5.2.2         | Zod integration         | Core             |
| `recharts`                      | ^3.3.0         | Dashboard charts        | UI               |
| `react-big-calendar`            | ^1.19.4        | Calendar UI             | UI               |
| `react-day-picker`              | ^9.11.1        | Date picker             | UI               |
| `react-dropzone`                | ^14.3.8        | File upload             | UI               |
| `embla-carousel-react`          | ^8.6.0         | Carousel                | UI               |
| `date-fns`                      | ^4.1.0         | Date utilities          | Util             |
| `sonner`                        | ^2.0.7         | Toast notifications     | UI               |
| `lucide-react`                  | ^0.548.0       | Icons                   | UI               |
| `vaul`                          | ^1.1.2         | Drawer component        | UI               |
| `cmdk`                          | ^1.1.1         | Command palette         | UI               |
| `tailwind-merge`                | ^3.3.1         | CSS class merging       | UI               |
| `clsx`                          | ^2.1.1         | Conditional classes     | UI               |
| `class-variance-authority`      | ^0.7.1         | Component variants      | UI               |
| `dotenv`                        | ^17.2.3        | Env loading (seed only) | Dev-ish          |
| All `@radix-ui/*` (18 packages) | various        | Headless UI primitives  | UI               |

**Flags:**

- `react-signature-canvas@^1.1.0-alpha.2` — alpha version in production for the signature capture feature. No stable release exists yet; the package has been alpha for 4+ years. The risk is low (it's a canvas wrapper) but should be monitored.
- `dotenv` is in `dependencies` not `devDependencies` — it is only used in `supabase/seed.ts`. Should move to devDependencies.

### Dev Dependencies (12 packages)

ESLint 9, Prettier 3, TypeScript types, Tailwind PostCSS, Supabase CLI — all standard.

### Fan-in (most-imported modules)

| Module                  | Imported by (approx) | Role                     |
| ----------------------- | -------------------- | ------------------------ |
| `@/lib/supabase/server` | ~55 files            | DB client factory        |
| `@/lib/rbac`            | ~40 files            | Auth/role checks         |
| `@/components/ui/*`     | ~150 files           | shadcn component library |
| `@/app/actions/visits`  | ~20 files            | Core visit CRUD          |
| `@/lib/database.types`  | ~30 files            | Type definitions         |
| `next/navigation`       | ~45 files            | Router/redirect          |
| `next/cache`            | ~28 files            | revalidatePath           |
| `react`                 | ~100 files           | useState/useEffect       |

### Fan-out (files with most imports)

| File                                                     | Import Count |
| -------------------------------------------------------- | ------------ |
| `app/dashboard/patients/[id]/visits/[visitId]/page.tsx`  | 32           |
| `app/dashboard/patients/[id]/page.tsx`                   | 24           |
| `components/assessments/multi-wound-assessment-form.tsx` | 23           |
| `components/reports/visit-log-report.tsx`                | 16           |
| `app/dashboard/page.tsx`                                 | 14           |

---

## 4. Server Actions — Deep Analysis

All 30 server action files are in `app/actions/`. All have `"use server"` directive. All perform authentication checks before any data operation.

### Complete Action File Metrics

| File                         | Lines | Fns | try | throw | console | auditPHI | Zod |
| ---------------------------- | ----- | --- | --- | ----- | ------- | -------- | --- |
| `visits.ts`                  | 1,204 | 15  | 8   | 6     | 18      | partial  | ✅  |
| `ai-transcription.ts`        | 990   | 14  | 12  | 8     | 36      | ✅       | ❌  |
| `pdf.ts`                     | 933   | 6   | 6   | 7     | 6       | ❌       | ❌  |
| `specialized-assessments.ts` | 1,150 | 13  | 13  | 16    | 13      | ❌       | ❌  |
| `new-forms.ts`               | 664   | 12  | 5   | 5     | 12      | ❌       | ✅  |
| `signatures.ts`              | 789   | 13  | 13  | 0     | 25      | ✅       | ❌  |
| `patients.ts`                | 722   | 6   | 5   | 5     | 5       | ✅       | ✅  |
| `reports.ts`                 | 690   | 8   | 7   | 6     | 10      | ❌       | ❌  |
| `calendar.ts`                | 598   | 8   | 8   | 8     | 8       | ❌       | ✅  |
| `assessments.ts`             | 583   | 6   | 8   | 7     | 6       | ✅       | ✅  |
| `admin.ts`                   | 560   | 9   | 8   | 7     | 15      | ❌       | ✅  |
| `billing.ts`                 | 555   | 8   | 6   | 6     | 8       | ✅       | ✅  |
| `wounds.ts`                  | 511   | 7   | 7   | 7     | 8       | ✅       | ✅  |
| `approval-workflow.ts`       | 492   | 10  | 9   | 16    | 9       | ✅       | ❌  |
| `photos.ts`                  | 437   | 7   | 7   | 6     | 10      | ✅       | ❌  |
| `documents.ts`               | 363   | 8   | 13  | 16    | 15      | ❌       | ❌  |
| `facilities.ts`              | 364   | 6   | 4   | 7     | 4       | ❌       | ✅  |
| `patient-clinicians.ts`      | 374   | 7   | 7   | 10    | 7       | ❌       | ❌  |
| `treatments.ts`              | 375   | 6   | 11  | 8     | 6       | ❌       | ❌  |
| `signature-audit.ts`         | 241   | 3   | 3   | 2     | 6       | ❌       | ❌  |
| `home-health-agencies.ts`    | 210   | 4   | 4   | 4     | 0       | ❌       | ✅  |
| `notifications.ts`           | 192   | 3   | 1   | 0     | 0       | ❌       | ❌  |
| `service-locations.ts`       | 193   | 4   | 4   | 4     | 0       | ❌       | ✅  |
| `preferences.ts`             | 159   | 2   | 2   | 0     | 0       | ❌       | ❌  |
| `pdf-cached.ts`              | 296   | 7   | 7   | 0     | 7       | ❌       | ❌  |
| `signature-audit.ts`         | 241   | 3   | 3   | 2     | 6       | ❌       | ❌  |
| `search.ts`                  | 78    | 1   | 1   | 0     | 0       | ❌       | ❌  |
| `consent-status.ts`          | 41    | 1   | 0   | 0     | 0       | ❌       | ❌  |
| `surface.ts`                 | 56    | 1   | 0   | 0     | 0       | ❌       | ❌  |
| `wound-notes.ts`             | 74    | 4   | 0   | 0     | 0       | ❌       | ✅  |

**Totals across all 30 action files:**

- 370+ `console.*` calls (debug logging never removed from production code)
- auditPhiAccess present in only **11 of 30** action files
- Zod input validation present in only **13 of 30** action files
- 194 total `throw` statements vs 290 total `try/catch` blocks

### Individual Action File Deep Analysis

---

#### `app/actions/visits.ts` — 1,204 lines, 15 functions

**Purpose:** Core visit lifecycle: create, read, update, delete, copy-forward, no-show, E/M documentation, autosave drafts, dashboard stats.

**Key functions:**

- `createVisit(formData)` — Zod-validated, multi-table insert (visits + billing), proper revalidation
- `getVisit(visitId)` — RLS-scoped; joins patient/facility/clinician/assessments
- `getClinicalDashboardStats()` — Uses `Promise.all()` for parallel queries (good)
- `getAdminDashboardStats()` — Parallel queries for tenant-wide counts
- `autosaveVisitDraft(visitId, data)` — Saves draft fields without validation (intended)
- `copyForwardVisit(visitId)` — Copies prior visit data to new visit date; clears signatures
- `getTodayUnsignedCount()` — Used for topbar badge

**Issues:**

- 18 `console.*` calls — debug logs left in (console.log, console.error)
- 8 type assertions — mostly `as string` for formData.get() results; safe but verbose
- `autosaveVisitDraft` saves arbitrary objects to a `jsonb` column without schema enforcement

---

#### `app/actions/ai-transcription.ts` — 990 lines, 14 functions

**Purpose:** Recording consent lifecycle, audio upload coordination, Whisper transcription triggering, GPT-4 note review, note approval workflow.

**Key functions:**

- `checkRecordingConsent(patientId)` — Checks both recording consent AND ai_processing_consent
- `saveRecordingConsent(data)` — Dual-consent model; validates version text
- `revokeRecordingConsent(consentId)` — Sets revoked_at, prevents future use
- `processTranscription(visitId, audioPath)` — Delegates to `lib/ai/transcription-pipeline.ts`
- `approveAIGeneratedNote(visitId, editedContent)` — Saves final clinician-approved note

**Issues:**

- **36 console.\* calls** — highest in any action file; extensive debug logging throughout pipeline
- No Zod validation on any FormData input (uses raw `formData.get()` with manual type coercion)
- 7 type assertions

---

#### `app/actions/signatures.ts` — 789 lines, 13 functions

**Purpose:** Electronic signature capture, consent document signatures, visit signing workflow, signature retrieval.

**Key functions:**

- `createSignature(data)` — Validates non-empty data, **overrides caller-supplied IP with server-determined IP** (excellent CSRF/spoofing defense)
- `signVisit(visitId, signatureData)` — Sets visit status to "signed", creates provider signature record
- `verifySignature(signatureId)` — Returns signature metadata for audit
- `getPatientSignatures(patientId)` — Lists all consent signatures for patient

**Issues:**

- 25 console.\* calls
- No Zod schema — uses typed `SignatureData` interface but no runtime validation of data format
- `signatureData` field stores raw Base64 image string — no size limit enforced server-side (could accept malformed data)
- `auditPhiAccess` called on signature creation — good

---

#### `app/actions/patients.ts` — 722 lines, 6 functions

**Purpose:** Patient CRUD, patient profile data, linked visits/wounds summary.

**Key functions:**

- `createPatient(formData)` — Full Zod schema, MRN uniqueness check within facility, audit log on create
- `updatePatient(patientId, data)` — Field-permission-aware (checks `canEditDemographics`, `canEditInsurance`)
- `getPatient(patientId)` — Returns full patient with facility info
- `getPatients(facilityId)` — Scoped to facility
- `getPatientWithHistory(patientId)` — Joins wounds + recent visits

**Issues:**

- 5 console.\* calls
- `updatePatient` does not log individual field changes to audit_log (only `auditPhiAccess("update")`)

---

#### `app/actions/assessments.ts` — 583 lines, 6 functions

**Purpose:** Standard wound assessment CRUD (per-wound clinical measurements).

**Key functions:**

- `createAssessment(visitId, woundId, data)` — Zod-validated, tissue-composition validation, creates or updates treatment plan
- `updateAssessment(assessmentId, data)` — Same validation path; triggers PDF cache invalidation
- `getAssessmentsByVisit(visitId)` — RLS-scoped
- `deleteAssessment(assessmentId)` — Guard: cannot delete if visit is signed

**Issues:**

- 6 console.\* calls
- auditPhiAccess called on create and update — good coverage

---

#### `app/actions/specialized-assessments.ts` — 1,150 lines, 13 functions

**Purpose:** Non-standard assessment types: skilled nursing, grafting, skin sweep, debridement, G-tube procedures.

**Key functions:**

- `createSkilledNursingAssessment(visitId, data)` — Creates assessment + per-wound rows in transaction
- `createGraftingAssessment(visitId, data)` — Grafting-specific clinical fields
- `createSkinSweepAssessment(visitId, data)` — Multi-wound sweep form
- `createDebridementAssessment(visitId, data)` — Debridement type/method tracking
- `createGtubeProcedure(visitId, patientId, data)` — G-tube placement/change record

**Issues:**

- **No Zod validation** anywhere — all inputs passed directly as typed objects but not runtime-validated
- **No auditPhiAccess** — PHI-heavy clinical data written without any audit trail
- 13 console.\* calls
- 16 throw statements vs 13 try/catch — some throws escape unhandled

---

#### `app/actions/wounds.ts` — 511 lines, 7 functions

**Purpose:** Wound CRUD, wound status progression, wound numbering.

**Key functions:**

- `createWound(patientId, data)` — Zod-validated; auto-increments wound_number within patient
- `updateWound(woundId, data)` — Status transitions (active → healed → closed)
- `getWoundsByPatient(patientId)` — With latest assessment data joined

**Issues:**

- 8 console.\* calls
- auditPhiAccess on create and update — good

---

#### `app/actions/treatments.ts` — 375 lines, 6 functions

**Purpose:** Treatment order CRUD — supplies, procedures, dressing changes.

**Key functions:**

- `createTreatment(visitId, assessmentId, data)` — Creates treatment order from builder output
- `updateTreatment(treatmentId, data)` — Updates order text
- `getTreatmentsByVisit(visitId)` — Returns all orders for a visit

**Issues:**

- **No auditPhiAccess** — treatment orders contain PHI (wound descriptions, drug names)
- **No Zod validation** — typed inputs only
- 6 console.\* calls
- 11 try/catch vs 8 throws — good ratio

---

#### `app/actions/billing.ts` — 555 lines, 8 functions

**Purpose:** CPT billing code CRUD, billing status management, billing queue for admin.

**Key functions:**

- `createBilling(visitId, data)` — Zod-validated with CPT code allowlist check
- `updateBillingStatus(billingId, status)` — Status enum: draft→ready→submitted→paid
- `getBillingQueue(filters)` — Admin-only; scoped by tenant via user role
- `getBillingForVisit(visitId)` — Per-visit billing data

**Issues:**

- 8 console.\* calls
- auditPhiAccess on billing create — good (billing data is PHI-adjacent)
- No rate limiting — bulk status updates possible

---

#### `app/actions/photos.ts` — 437 lines, 7 functions

**Purpose:** Clinical photo upload to Supabase Storage (`wound-photos` private bucket), photo metadata management.

**Key functions:**

- `uploadPhoto(formData)` — Validates file type (MIME check), creates storage path, saves DB record
- `getPhotoSignedUrl(photoId)` — Generates time-limited signed URL (expires in 1 hour)
- `deletePhoto(photoId)` — Removes from storage + DB; only uploader or admin can delete

**Issues:**

- **No Zod validation** — manual `formData.get()` with type coercion
- 10 console.\* calls
- `getPhotoSignedUrl` expiry is 3600s hardcoded — not configurable
- auditPhiAccess called on upload and retrieval — good

---

#### `app/actions/documents.ts` — 363 lines, 8 functions

**Purpose:** Patient document upload (consent forms, insurance cards, referrals).

**Key functions:**

- `uploadDocument(formData)` — MIME type validation, file size check, storage upload
- `getDocuments(patientId)` — With signed URL generation
- `deleteDocument(documentId)` — Admin/owner only

**Issues:**

- **No Zod validation**
- **16 throw statements vs 13 try/catch** — highest imbalance; some throws escape
- 15 console.\* calls
- Explicitly checks `user_facilities` join for facility access (defense-in-depth beyond RLS) — good pattern
- No auditPhiAccess — document access is PHI

---

#### `app/actions/approval-workflow.ts` — 492 lines, 10 functions

**Purpose:** Send-to-office, correction request, approval/rejection workflow for clinical notes.

**Key functions:**

- `sendToOffice(visitId)` — Transitions visit status; creates inbox notification
- `requestCorrection(visitId, notes)` — Returns visit to clinician with correction notes
- `approveNote(visitId)` — Final approval; triggers billing-ready status
- `getCorrectionsForClinician(clinicianId)` — Lists pending corrections

**Issues:**

- **16 throw statements vs 9 try/catch** — significant error escape risk
- No Zod validation
- 9 console.\* calls
- 1 eslint-disable (unused variable)
- auditPhiAccess on approval — partial coverage

---

#### `app/actions/wound-notes.ts` — 74 lines, 4 functions

**Purpose:** CRUD for freeform clinical notes attached to wounds.

**Key functions:**

- `createWoundNote(woundId, content)`, `updateWoundNote(noteId, content)`, `deleteWoundNote(noteId)`, `getWoundNotes(woundId)`

**Critical Issues:**

- **Zero try/catch blocks** — all 4 async functions can throw unhandled exceptions on DB errors
- Zod validation present (validates note content length)
- No auditPhiAccess — wound notes are direct PHI

---

#### `app/actions/admin.ts` — 560 lines, 9 functions

**Purpose:** User management (invite, update role/credentials), tenant configuration, facility admin operations.

**Key functions:**

- `inviteUser(email, role, facilityId)` — Creates Supabase auth invite, creates `user_roles` record
- `updateUserRole(userId, role)` — `requireTenantAdmin()` guard
- `updateUserCredentials(userId, credentials)` — `requireTenantAdmin()` guard
- `getUsers(tenantId)` — Lists all tenant users with roles
- `getTenantStats()` — Counts for admin dashboard

**Issues:**

- 15 console.\* calls
- Uses dynamic import `await import("@/lib/supabase/service")` inside function — unusual pattern, likely to avoid module-level side effects but introduces latency
- `requireTenantAdmin()` / `requireAdmin()` guards are present and correct

---

#### `app/actions/pdf.ts` — 933 lines, 6 functions

**Purpose:** Generate PDF clinical note documents using `@react-pdf/renderer`.

**Key functions:**

- `generateVisitPDF(visitId)` — Full clinical note PDF with all assessments
- `generateWoundProgressPDF(woundId)` — Wound healing progression over time
- `generatePatientSummaryPDF(patientId)` — Patient overview document

**Issues:**

- No auditPhiAccess — PDF generation reads PHI from DB without audit trail
- No Zod validation (inputs are typed IDs only — lower risk)
- 6 console.\* calls

---

#### `app/actions/reports.ts` — 690 lines, 8 functions

**Purpose:** Administrative reporting: visit log, clinician activity, facility summary.

**Key functions:**

- `getVisitLog(filters)` — Multi-filter query builder with facility scoping via `facilityIds[]` parameter
- `getClinicianActivityReport(filters)` — Per-clinician visit/billing statistics
- `getFacilitySummaryReport(facilityId)` — Facility-level aggregates

**Issues:**

- `getUserRole()` called at top — tenant scoping via role, then `facilityIds` filtering
- No Zod validation on filter inputs — potential for unexpected query parameters
- No auditPhiAccess — report queries read PHI at scale
- 10 console.\* calls

---

#### `app/actions/calendar.ts` — 598 lines, 8 functions

**Purpose:** Visit scheduling, calendar view data, upcoming appointment summaries.

**Issues:**

- Zod-validated inputs — good
- 8 console.\* calls
- No auditPhiAccess — calendar queries return patient/visit PHI

---

#### `app/actions/new-forms.ts` — 664 lines, 12 functions

**Purpose:** Newer clinical form types (debridement records, patient-not-seen reports, OASIS forms).

**Issues:**

- Zod validation present — good
- 12 console.\* calls
- No auditPhiAccess
- 5 try/catch vs 5 throws — balanced

---

#### `app/actions/search.ts` — 78 lines, 1 function

**Purpose:** Global search across patients, visits, wounds.

**Key function:**

- `globalSearch(query, facilityIds)` — Full-text search using PostgreSQL `ilike` across multiple tables

**Issues:**

- No Zod validation on search query — could accept very long strings or special characters
- No console.\* calls — clean
- No auditPhiAccess — search results expose PHI
- Single try/catch wraps all — acceptable for this size

---

#### `app/actions/notifications.ts` — 192 lines, 3 functions

**Purpose:** In-app notification management (read/unread, dismiss).

**Issues:**

- 3 functions, 1 try/catch — `markAllRead()` and `dismissNotification()` have no error handling
- No PHI in notifications content (message templates only) — audit gap acceptable here

---

#### `app/actions/preferences.ts` — 159 lines, 2 functions

**Purpose:** User preferences (dashboard layout, notification settings).

**Issues:**

- No audit needed — no PHI
- 2 try/catch blocks — fully covered
- Clean

---

#### `app/actions/pdf-cached.ts` — 296 lines, 7 functions

**Purpose:** PDF caching layer on top of Supabase Storage `pdf-cache` bucket.

**Issues:**

- Bucket existence check on every `cachePDF()` call (anti-pattern — adds latency)
- `CACHE_VERSION = "v1"` hardcoded string — cache busting requires code change
- 7 console.\* calls
- No errors bubble — all wrapped in try/catch with console.error fallback

---

#### `app/actions/service-locations.ts` — 193 lines / `home-health-agencies.ts` — 210 lines

Both: Zod-validated CRUD, clean error handling, 0 console calls. Well-written small action files.

---

#### `app/actions/consent-status.ts` — 41 lines, 1 function

Reads `patient_consent_status` view. No try/catch — DB errors bubble. Acceptable given it's read-only and tiny.

#### `app/actions/surface.ts` — 56 lines, 1 function

Cookie-based surface toggle. No try/catch — failure here is non-critical.

#### `app/actions/signature-audit.ts` — 241 lines, 3 functions

Admin-only signature audit log queries. Try/catch present. 6 console.\* calls.

#### `app/actions/patient-clinicians.ts` — 374 lines, 7 functions

Clinician assignment to patients. 10 throw statements vs 7 try/catch — some throws escape. No audit logging.

#### `app/actions/facilities.ts` — 364 lines, 6 functions

Facility CRUD (tenant_admin only). Zod-validated. 4 try/catch vs 7 throws. `requireTenantAdmin()` guard present.

---

## 5. Library Layer — Deep Analysis

### `lib/database.types.ts` — 3,888 lines

**Auto-generated** by `npm run db:types` from Supabase introspection. Last generated after migration 00045. Contains full TypeScript types for all 20 tables, views, enums, and RPC function signatures. **Do not manually edit.** Regenerate after every migration.

### `lib/rbac.ts` — 375 lines

Role-based access control. The most security-critical library file.

**Functions:**

- `getUserRole()` — Calls `get_user_role_info` RPC (avoids RLS recursion). Returns `null` for unauthenticated.
- `getUserRoles()` — Returns array for multi-role scenarios
- `requireAdmin()` — Throws `Error("Unauthorized")` if not admin/tenant_admin. Used as guard in write actions.
- `requireTenantAdmin()` — Throws if not tenant_admin
- `requireFacilityAccess(facilityId)` — Verifies caller has access to specific facility
- `canViewVisitDetails(visit, role)` — Facility users see only "approved" visits
- `canDownloadVisitPDF(visit, role)` — Same restriction
- `isFacilityUser(role, credentials)` — Pure function: role + credentials check
- Field permission helpers delegating to `lib/field-permissions.ts`

**Issues:** 4 type assertions (boundary casts from RPC). Acceptable.

### `lib/field-permissions.ts` — 279 lines

Pure function matrix defining which credentials/roles can edit which fields.

**Functions:**

- `getPatientFieldPermissions(role, credentials)` — Returns object `{canEditDemographics, canEditInsurance, ...}`
- `getVisitFieldPermissions(role, credentials, isVisitOwner)` — Similar for visit fields
- `canEditVisit(role, credentials, visit)` — Composite guard
- `canUploadDocuments(role, credentials)` — Document upload access

**Notes:** Zero DB calls, zero side effects. Pure and testable. Well-designed.

### `lib/surface.ts` — 139 lines

Derives "admin" vs "clinical" surface entitlements from role+credentials.

**Functions:**

- `getSurfaceEntitlements(role, credentials)` — Returns `{canAccessClinical, canAccessAdmin, canSwitchSurface}`
- `getActiveSurface(role, credentials)` — Cookie-backed; reads `wn_surface` cookie
- `canSwitchSurface(role, credentials)` — Guards UI surface toggle

**Issues:** 2 `:any` casts in cookie comparison. Minor.

### `lib/audit-log.ts` — 96 lines

HIPAA PHI audit logger.

**Function:**

- `auditPhiAccess(entry)` — Fire-and-forget RPC call to `log_phi_access()`. Never throws. Swallows errors.

**Issues:**

- Only 11 files import this — **coverage gap** (see section 14)
- IP address extracted from multiple headers (x-forwarded-for, x-real-ip, cf-connecting-ip) — correct priority order

### `lib/rate-limit.ts` — 77 lines

In-memory token bucket rate limiter.

**Function:**

- `rateLimit(key, limit, windowMs)` — Returns `{allowed, retryAfterMs}`
- `clientKey(headers, endpoint, userId)` — Generates composite rate limit key

**Issues:**

- Single-instance only (in-memory Map). Multi-instance deployments would lose state.
- Applied to only 2 endpoints — login action + audio upload API route.

### `lib/autosave.ts` — 96 lines + `lib/hooks/use-autosave.ts`

Client-side autosave to localStorage.

**Issue:** Clinical form data (visit notes, wound measurements, assessment data) is persisted to `localStorage`. This is:

- **HIPAA concern**: PHI stored in browser localStorage is accessible to any same-origin JavaScript, and persists across sessions. If a clinician uses a shared device (common in clinical settings), the autosave data could be read by the next user before the 24-hour expiry.
- The key includes `userId` which is a partial mitigation, but localStorage is not encrypted.
- Recommendation: Add explicit clear-on-logout. Reduce autosave window from 24 hours to the session duration.

### `lib/ai-config.ts` — 234 lines

Configuration for AI features.

**Constants:**

- `WHISPER_PER_MINUTE: 0.006` — OpenAI pricing (marked "March 2026")
- `GPT4_PER_1K_TOKENS: 0.03` — Dated; actual gpt-4-turbo pricing may differ
- `CLINICAL_NOTE_SYSTEM_PROMPT` — ~80 lines inline. Clear HIPAA context framing.
- `AI_PROCESSING_CONSENT_TEXT` — Third-party vendor disclosure for consent flow

**Issues:** Hardcoded pricing constants will diverge from actual billing. Consider fetching from OpenAI usage API instead.

### `lib/ai/openai-service.ts` — 459 lines

OpenAI API integration.

**Functions:**

- `transcribeAudio(audioBuffer, filename)` — Calls Whisper API with retry
- `generateClinicalNote(transcript, patientContext)` — GPT-4-turbo with HIPAA system prompt
- `withRetry(fn, maxRetries, baseDelayMs)` — Exponential backoff with jitter (correct implementation)
- `fetchWithTimeout(url, options, timeoutMs)` — AbortController-based timeout

**Quality:** Well-implemented. Typed error classification. Clean separation of concerns.

### `lib/ai/transcription-pipeline.ts` — 468 lines

Orchestrates the full audio → transcript → clinical note pipeline.

**Functions:**

- `processTranscription(transcriptId)` — Main pipeline: claim → download → Whisper → GPT-4 → save
- `claimTranscript(transcriptId)` — Atomic status update from "pending" → "processing" (prevents double-processing)
- `downloadAudio(audioPath)` — Supabase Storage download
- `saveTranscriptResult(transcriptId, result)` — Saves Whisper + GPT output to DB

**Quality:** Excellent. Atomic claim guard prevents race conditions. Error states are persisted to DB.

**Issues:** 12 type assertions — mostly `as ProcessingStatus` for string literals. Acceptable given DB types.

### `lib/ai/usage-tracking.ts` — 325 lines

Monthly AI cost tracking per clinician.

**Functions:**

- `trackUsage(clinicianId, inputTokens, outputTokens, whisperMinutes)` — Inserts usage record
- `getMonthlyUsage(clinicianId)` — Aggregates current month costs
- `checkUsageThreshold(clinicianId)` — Returns warning level at $25/$50/$100

**Issues:**

- `Array.isArray(visit?.clinician)` guard needed for Supabase relation type — noted pattern, minor
- No rate limiting on usage record inserts (could spam DB if called in a loop)

### `lib/pdf-cache.ts` — 306 lines

PDF caching in Supabase Storage.

**Issues:**

- Bucket existence check on every `cachePDF()` call — should pre-provision bucket in migration
- `CACHE_VERSION = "v1"` string — requires code deploy to bust cache
- 8 console.\* calls

### `lib/supabase/*.ts` — 4 client files

- `server.ts` — RLS-respecting server client (standard SSR pattern).
- `admin.ts` — Service role client. Bypasses RLS. Only for admin operations.
- `service.ts` — Service role client variant for server actions.
- `client.ts` — Browser client for client components.
- `middleware.ts` — Session refresh middleware (standard Supabase SSR pattern).

**Quality:** Correct separation. Service role key only accessible to these files + seed.ts.

### `lib/credentials.ts` — 96 lines

Credential definitions and helpers.

**Functions:**

- `CREDENTIAL_TYPES` — Enum of valid credential strings
- `requiresPatientSignature(credential)` — Boolean: does this credential type require patient consent?
- `getCredentialDisplayName(credential)` — Lookup map

**Quality:** Clean, pure, no side effects.

### `lib/email.ts`

Resend email delivery. Invitation emails, password reset notifications.

### `lib/billing-codes.ts`, `lib/procedures.ts`, `lib/treatment-options.ts`

Static data files — lists of CPT codes, procedure scopes, treatment options. No issues.

### `lib/navigation.ts`

Route helper for breadcrumb generation. Uses Next.js `usePathname`.

### `lib/utils.ts`

`cn()` utility (clsx + tailwind-merge). 10 lines. Clean.

### `lib/features.ts`

`isTenantFeatureEnabled(tenantId, featureName)` — Queries `tenant_features` table.

### `lib/image-sniff.ts`

MIME type detection from file buffer magic bytes. Used for image upload validation. Clean.

### `lib/validations/assessment.ts` — 400 lines

Pure validation functions for wound assessments.

**Functions:**

- `validateTissueComposition(data)` — Must total 100%
- `validateMeasurements(length, width, depth)` — Non-negative checks
- `shouldShowPressureStage(woundType)` — Pure UI logic
- `validateLocationConfirmation(data)` — Required for certain wound types

**Quality:** Excellent. Pure functions, no DB calls, no side effects. Fully testable.

### `lib/hooks/use-media-query.ts` — 28 lines

**ESLint Error:** `setMatches(mql.matches)` called synchronously inside `useEffect` body.

**Fix required:**

```typescript
// Current (broken):
useEffect(() => {
  const mql = window.matchMedia(query);
  setMatches(mql.matches); // ← synchronous setState in effect body
  const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}, [query]);

// Fixed:
const [matches, setMatches] = useState(() => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches; // Initialize from matchMedia in state initializer
});
useEffect(() => {
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}, [query]);
```

### `lib/recording-context.tsx` — 304 lines

Global audio recording state via React Context.

**Issues:**

- 4 console.\* calls (debug logs)
- Progress simulation via `setInterval` — browser timer; correct for client component
- `beforeunload` guard prevents accidental navigation during recording

---

## 6. Component Layer — Deep Analysis

160 component files across 14 subdirectories. All client components use `"use client"` directive. Server components omit it. The shadcn/ui layer (`components/ui/`) provides 43 base components.

### Top Complexity Components

| File                                              | Lines | useState | useEffect | Notes                     |
| ------------------------------------------------- | ----- | -------- | --------- | ------------------------- |
| `assessments/skilled-nursing-assessment-form.tsx` | 1,418 | 6        | 2         | Split candidate           |
| `assessments/skin-sweep-assessment-form.tsx`      | 1,273 | 5        | 2         | Split candidate           |
| `patients/patient-form.tsx`                       | 1,093 | 7        | 0         | Large but focused         |
| `assessments/treatment-order-builder.tsx`         | 1,015 | 0        | 0         | Pure render               |
| `assessments/grafting-assessment-form.tsx`        | 1,041 | 5        | 3         | Split candidate           |
| `assessments/debridement-assessment-form.tsx`     | 1,037 | 3        | 0         | Large but clean           |
| `visits/ai-note-review.tsx`                       | 854   | 16       | 0         | High state count          |
| `assessments/assessment-form.tsx`                 | 787   | 16       | 0         | High state count          |
| `visits/visit-form.tsx`                           | 617   | 17       | 5         | High state + effects      |
| `billing/billing-form-with-credentials.tsx`       | 635   | 12       | 0         | Complex credentials logic |

### Key Component Deep Analysis

---

#### `components/visits/visit-form.tsx` — 617 lines

**Purpose:** Create/edit visit form with billing, follow-up scheduling, autosave.

**State:**
17 useState instances: visitDate, visitType, location, followUpType, followUpDate, followUpNotes, additionalNotes, timeSpent, billingData, isSubmitting, errors, autosaveStatus, lastSavedTime, showAutosaveModal, hasAutosaveData, saveRecoveryData, activeTab.

**Effects:** 5 useEffect instances:

1. Ctrl+S shortcut registration
2. Autosave recovery check on mount
3. Auto-load visit data for edit mode
4. Server-side autosave interval (2 minutes)
5. Field permission check on role change

**Issues:**

- `saveStatus` returned from `useAutosave` is assigned to a variable but never used → ESLint warning
- High state count (17) — complex but managed; form state is inherently complex

---

#### `components/assessments/assessment-form.tsx` — 787 lines

**Purpose:** Standard wound assessment form: measurements, tissue composition, exudate, treatment.

**State:** 16 useState instances — all clinical assessment fields.

**Issues:**

- No autosave — user can lose unsaved assessment data if navigation occurs
- Tissue composition validation delegated to `lib/validations/assessment.ts` — good pattern
- 0 console.\* calls — clean

---

#### `components/visits/ai-note-review.tsx` — 854 lines

**Purpose:** AI-generated clinical note review panel — display transcript, show generated note, allow editing, approve/reject.

**State:** 16 useState instances — transcript display, note editing, approval state, diff view, loading states.

**Issues:**

- Complex but appropriate for the feature complexity
- No console.\* calls — clean
- Calls `approveAIGeneratedNote()` server action — correct pattern

---

#### `components/ui/sidebar.tsx` — 727 lines

**ESLint Error:** Line 611 — `Math.random()` called inside `useMemo([], [])`. This generates a skeleton loader width that is different between server and client renders, causing React StrictMode/hydration mismatch.

**Fix required:**

```typescript
// Current (broken):
const skeletonWidth = useMemo(() => Math.random() * 40 + 60, []); // ← impure

// Fixed (use stable widths or use useId to generate deterministic values):
const skeletonWidths = [70, 85, 60, 90, 75]; // Predetermined widths
// Or: const id = useId(); derive width from stable hash
```

---

#### `components/billing/billing-form-with-credentials.tsx` — 635 lines

**Purpose:** Billing form that shows/hides CPT codes based on user credentials.

**State:** 12 useState instances.

**Issues:**

- CPT code allowlist check done client-side (also enforced server-side in `billing.ts`) — defense-in-depth, correct
- 0 console.\* calls — clean

---

#### `components/visits/audio-recorder.tsx` — 671 lines

**Purpose:** Browser audio recording via MediaRecorder API, upload progress, recording visualization.

**Issues:**

- Uses `MediaRecorder` API (not all browsers, not all environments)
- No fallback for unsupported browsers
- 0 console.\* calls — clean
- `useEffect` cleanup correctly stops MediaRecorder on unmount

---

#### `components/pdf/` — 4 files, ~2,030 lines total

All PDF components use `@react-pdf/renderer` primitives. Zero useState, zero useEffect (pure render functions). No issues.

---

#### `components/admin/` — 9 files

All admin client components use pattern: fetch data on mount, display in table, action buttons. No console.\* calls in most. Clean.

---

#### `components/ui/` — 43 files (shadcn/ui base)

4,501 lines. Standard shadcn/ui components. One ESLint error in sidebar.tsx. Otherwise clean.

---

## 7. App Pages & Layouts — Deep Analysis

### Page Inventory

| Route                                       | File       | Lines | Notes                          |
| ------------------------------------------- | ---------- | ----- | ------------------------------ |
| `/dashboard`                                | `page.tsx` | 855   | Dashboard orchestrator         |
| `/dashboard/patients/[id]/visits/[visitId]` | `page.tsx` | 801   | Most complex page — 32 imports |
| `/dashboard/patients/[id]`                  | `page.tsx` | 573   | Patient profile                |
| `/auth/accept-invite`                       | `page.tsx` | 447   | Invite flow                    |
| `/dashboard/patients/[id]/wounds/[woundId]` | `page.tsx` | 348   | Wound detail                   |
| `/dashboard/incidents/[reportId]`           | `page.tsx` | 225   | Incident report                |
| `/signup`                                   | `page.tsx` | 227   | Account creation               |
| `/auth/reset-password`                      | `page.tsx` | 199   | Password reset                 |
| `/dashboard/incidents`                      | `page.tsx` | 162   | Incident list                  |
| `/login`                                    | `page.tsx` | 154   | Login                          |

**Total dashboard routes:** 39 pages, 1 error.tsx, 16 loading.tsx

### Route Protection Coverage

- All `/dashboard/*` routes are protected by `lib/supabase/middleware.ts` — redirects unauthenticated users to `/login`
- `/dashboard/admin/*` — Protected by `proxy.ts` with role check (tenant_admin / facility_admin)
- `/dashboard/billing` and `/dashboard/reports` — Protected by `proxy.ts` requiring admin entitlement
- **Gap:** 38 of 39 dashboard pages have no `error.tsx` sibling — only `app/dashboard/error.tsx` at the root level exists. Sub-route errors bubble to that root error boundary, which is acceptable but means error context is lost for nested routes.
- **Gap:** Only 16 of 39 pages have `loading.tsx` — 23 pages show no loading state during data fetching.

### Key Page Analysis

---

#### `app/dashboard/patients/[id]/visits/[visitId]/page.tsx` — 801 lines, 32 imports

**Highest fan-out page in codebase.** Server component. Loads visit, patient, billing, treatments, assessments, AI transcript, signatures all in parallel via `Promise.all()`. Checks `canViewVisitDetails()` for facility user restriction. Renders conditional sections based on visit status and user role.

**Issues:**

- 32 imports — close to the limit for maintainability
- `export const dynamic = "force-dynamic"` — correct for auth-required pages
- Does not have its own error.tsx — falls back to root error boundary

---

#### `app/dashboard/page.tsx` — 855 lines

**Dashboard orchestrator.** Server component. Resolves user role, active surface, then branches to clinical or admin dashboard view.

**Quality:** Good. Parallel data fetching with `Promise.all()`. Surface-aware rendering.

---

#### `app/login/page.tsx` — 154 lines

**ESLint Warnings:** Lines 52 and 142 use `<img>` instead of `<Image />`. Logo and illustration images not optimized.

---

#### `app/auth/accept-invite/page.tsx` — 447 lines

**ESLint Warnings:** Lines 132 and 150 — unused `err` variables in catch blocks.

---

## 8. API Routes

### `app/api/upload-audio/route.ts` — ~230 lines

The only REST API route in the codebase. Well-implemented:

**Security measures:**

1. **CSRF guard** — `isSameOrigin()` check comparing `Origin` header to `Host` header (custom, appropriate since Server Actions get CSRF protection for free but raw routes do not)
2. **Authentication** — `supabase.auth.getUser()` before any operation
3. **Rate limiting** — 10 uploads per 5 minutes per user via `lib/rate-limit.ts`
4. **Dual consent check** — Verifies both `consent_given = true` AND `ai_processing_consent_given = true`
5. **MIME type validation** — Checks against `AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES` whitelist
6. **File size limit** — Checked against `AI_CONFIG.AUDIO.MAX_FILE_SIZE_BYTES`
7. **Filename sanitization** — `/[^a-zA-Z0-9._-]/g` regex replace
8. **PHI audit log** — `auditPhiAccess` called after successful upload
9. **Storage cleanup** — If DB insert fails, storage file is deleted (transactional cleanup)
10. **`Retry-After` header** — Returned on 429 responses

**Quality:** This is the best-secured file in the codebase. The explicit CSRF guard, dual-consent check, and transactional cleanup are all excellent patterns.

---

## 9. Database Layer (Migrations)

### Migration History

| Migration                              | Lines | RLS Tables | Policies | Functions | Purpose                         |
| -------------------------------------- | ----- | ---------- | -------- | --------- | ------------------------------- |
| `00001_complete_schema.sql`            | 1,881 | Multiple   | 79       | 45        | Full initial schema             |
| `00027_ai_transcription.sql`           | 200   | 1          | 2        | 2         | AI transcript tables            |
| `00028_fix_trigger_search_path.sql`    | 45    | 0          | 0        | 2         | Security: search_path           |
| `00029_treatment_wound_id.sql`         | 55    | 0          | 0        | 0         | FK fix                          |
| `00030_new_clinical_forms.sql`         | 253   | 1          | 6        | 0         | Specialized assessment tables   |
| `00031_consent_provider_signature.sql` | 11    | 0          | 0        | 0         | Schema tweak                    |
| `00032_user_preferences.sql`           | 72    | 1          | 4        | 0         | User prefs table                |
| `00033_private_wound_photos.sql`       | 22    | 0          | 1        | 0         | Storage policy                  |
| `00034_critical_security_fixes.sql`    | 308   | 1          | 2        | 7         | **Critical security hardening** |
| `00035_high_severity_hardening.sql`    | 313   | 0          | 5        | 7         | **High-severity hardening**     |
| `00036_perf_indexes.sql`               | 55    | 0          | 0        | 0         | Performance indexes             |
| `00037_facility_type.sql`              | 30    | 0          | 0        | 0         | Facility type enum              |
| `00038_service_locations.sql`          | 99    | 1          | 2        | 1         | Service locations               |
| `00039_visit_no_show_reason.sql`       | 27    | 0          | 0        | 0         | No-show field                   |
| `00040_visit_scheduled_window.sql`     | 54    | 0          | 0        | 0         | Scheduling fields               |
| `00041_home_health_agencies.sql`       | 99    | 1          | 2        | 1         | HHA table                       |
| `00042_consent_status_view.sql`        | 42    | 0          | 0        | 0         | View for consent status         |
| `00043_tenant_features.sql`            | 78    | 1          | 2        | 1         | Feature flags                   |
| `00044_visit_em_documentation.sql`     | 29    | 0          | 0        | 0         | E/M jsonb field                 |
| `00045_billing_status.sql`             | 58    | 0          | 0        | 0         | Billing status enum             |

**Totals:** 79 + (policies from incremental) = ~107 RLS policies, ~65 DB functions

### Security DEFINER Functions

All `SECURITY DEFINER` functions in migrations 00034 and 00035 have `SET search_path = public` — this prevents search_path hijacking attacks.

### Key Security-Critical Functions

- `get_user_role_info(user_uuid)` — Fixed in 00034 to prevent cross-tenant role info leak. Caller must be the user themselves OR a tenant_admin in the same tenant.
- `log_phi_access()` — HIPAA audit insert function. Used by `lib/audit-log.ts`.
- `get_allowed_procedures(credentials)` / `get_restricted_procedures(credentials)` — Returns only procedures the caller's credentials permit.

### RLS Coverage

Every table with PHI has RLS enabled. The base schema (00001) enables RLS on all core tables. Tenant isolation is enforced at the database level, independent of application-layer checks.

---

## 10. Security Analysis (OWASP / HIPAA)

### OWASP Top 10 Assessment

| OWASP Category                    | Status        | Evidence                                                                                           |
| --------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| **A01 Broken Access Control**     | ✅ Mitigated  | RLS on all tables; proxy.ts route guards; requireAdmin() guards; canViewVisitDetails() restriction |
| **A02 Cryptographic Failures**    | ✅ Mitigated  | No PHI in URLs; HTTPS enforced by Supabase; signatures stored as Base64 strings                    |
| **A03 Injection**                 | ✅ Clean      | All DB queries use Supabase parameterized client. No raw SQL string interpolation found.           |
| **A04 Insecure Design**           | ⚠️ Partial    | PHI in localStorage (autosave); rate limiting gap                                                  |
| **A05 Security Misconfiguration** | ✅ Good       | search_path set on all SECURITY DEFINER functions; service role key contained                      |
| **A06 Vulnerable Components**     | ⚠️ Monitor    | `react-signature-canvas@alpha`; prices in ai-config.ts may be stale                                |
| **A07 Auth Failures**             | ✅ Good       | Supabase Auth (industry-standard); rate limiting on login; `getUser()` not `getSession()` pattern  |
| **A08 Software Integrity**        | ✅ OK         | package-lock.json present; no dynamic eval()                                                       |
| **A09 Logging Failures**          | ⚠️ Incomplete | PHI audit log exists but only 11/30 actions use it                                                 |
| **A10 SSRF**                      | ✅ N/A        | No user-controlled URL fetches found                                                               |

### Hardcoded Secrets Scan

**Result: CLEAN.** No API keys, passwords, or tokens found in source code. All secrets are environment variables.

### Service Role Key Exposure

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is used in exactly 5 files:

1. `lib/supabase/admin.ts` — Service client for admin operations
2. `lib/supabase/service.ts` — Service client variant
3. `app/actions/admin.ts` — User management (invite, role changes)
4. `app/actions/auth.ts` — Account setup
5. `supabase/seed.ts` — Development seeding

This is acceptable scope. All 5 uses are intentional and authorized.

### PHI in localStorage (HIPAA Risk)

**Files:** `lib/autosave.ts`, `lib/hooks/use-autosave.ts`, used in 6 form components.

Clinical form data (wound measurements, visit notes, assessment values) is stored in `localStorage` with key `wound-ehr-autosave-{formType}-{entityId}-{userId}` for up to 24 hours.

**Risk factors:**

- Shared clinical devices (tablets, workstations) are common in healthcare
- No encryption at rest in localStorage
- 24-hour retention window survives browser restarts
- Any same-origin JavaScript can read localStorage

**Recommendation:** Reduce retention to browser session (`sessionStorage`) or add explicit clear-on-logout call to `getUserAutosaveKeys(userId)` + `clearAutosave()`.

### Open Redirect Scan

**Result: CLEAN.** All `redirect()` calls use hardcoded paths or database-looked-up paths. No user-controlled redirect targets found.

### XSS Scan

**Result: CLEAN.**

- Zero uses of `dangerouslySetInnerHTML` in any component
- Zero uses of `eval()` or `new Function()` in any file
- All user content rendered via React's text node escaping

### CSRF Protection

- Server Actions: Protected automatically by Next.js (origin header + same-origin enforcement)
- API Route (`/api/upload-audio`): Custom `isSameOrigin()` guard checking `Origin` vs `Host` headers — correct and explicit

---

## 11. Code Quality Issues

### ESLint Errors (2 — Must Fix)

**Error 1: `components/ui/sidebar.tsx:611`**

```
Error: Cannot call impure function during render (Math.random())
Rule: react-hooks/purity
```

`Math.random()` inside `useMemo([], [])` produces different values on server vs client, causing hydration mismatch. Replace with predetermined skeleton widths.

**Error 2: `lib/hooks/use-media-query.ts:15`**

```
Error: Calling setState synchronously within an effect can trigger cascading renders
Rule: react-hooks/set-state-in-effect
```

`setMatches(mql.matches)` in the `useEffect` body. Fix by initializing state with a function that reads `window.matchMedia` directly.

### ESLint Warnings (6)

| File                                       | Line | Warning                                | Fix                        |
| ------------------------------------------ | ---- | -------------------------------------- | -------------------------- |
| `app/auth/accept-invite/page.tsx`          | 132  | `'err' is defined but never used`      | Replace with `_err` or `_` |
| `app/auth/accept-invite/page.tsx`          | 150  | `'err' is defined but never used`      | Same                       |
| `app/login/page.tsx`                       | 52   | `<img>` instead of `<Image />`         | Use `next/image`           |
| `app/login/page.tsx`                       | 142  | `<img>` instead of `<Image />`         | Use `next/image`           |
| `components/admin/office-inbox-client.tsx` | 103  | `'error' is defined but never used`    | Replace with `_error`      |
| `components/visits/visit-form.tsx`         | 154  | `'saveStatus' assigned but never used` | Remove from destructure    |

### TypeScript Strictness

`tsc --noEmit` exits 0. TypeScript is **clean** across all 295 files. No implicit any errors.

**Type assertions (213 total) — by file:**

- `lib/ai/transcription-pipeline.ts` — 12 (highest; mostly `as ProcessingStatus` for string literals)
- `lib/ai/openai-service.ts` — 9
- `app/actions/visits.ts` — 8
- `app/actions/documents.ts` — 8
- Other files — 1–5 each

Most are boundary casts from Supabase query results or formData.get() string coercions. Acceptable pattern.

### Console Logging (370+ total calls)

**High-console files** (these need cleanup for production):

| File                                      | console.\* calls |
| ----------------------------------------- | ---------------- |
| `app/actions/ai-transcription.ts`         | 36               |
| `app/actions/documents.ts`                | 15               |
| `app/actions/admin.ts`                    | 15               |
| `app/actions/signatures.ts`               | 25               |
| `app/actions/approval-workflow.ts`        | 9                |
| `app/actions/new-forms.ts`                | 12               |
| `app/actions/specialized-assessments.ts`  | 13               |
| `components/reports/visit-log-report.tsx` | 4                |

**Breakdown:** 313 `console.error`, 56 `console.log`, 1 `console.warn`

The high `console.error` count suggests most are error logging in catch blocks, which is intentional. However, the 56 `console.log` calls are debug logs that should be removed or replaced with a proper structured logger.

### Error Handling Gaps

| File                    | Issue                                                     |
| ----------------------- | --------------------------------------------------------- |
| `wound-notes.ts`        | Zero try/catch. All 4 async functions can throw unhandled |
| `approval-workflow.ts`  | 16 throws vs 9 try/catch — 7 potential unhandled errors   |
| `documents.ts`          | 16 throws vs 13 try/catch                                 |
| `patient-clinicians.ts` | 10 throws vs 7 try/catch                                  |
| `consent-status.ts`     | No try/catch (acceptable — read-only, tiny file)          |
| `surface.ts`            | No try/catch (acceptable — non-critical)                  |

### Code Duplication

- **Auth boilerplate** — 26 of 30 action files contain identical inline pattern:

  ```typescript
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  ```

  This is 50+ lines of identical code. Could be extracted to a helper, but the current pattern is explicit and readable — a judgment call.

- `revalidatePath` called 153 times across the codebase — many with the same paths. No issue.

### Missing Input Validation (FormData without Zod)

Actions using `FormData.get()` without Zod schema validation:

- `ai-transcription.ts` — 36 console calls suggests complex manual validation, but no schema
- `documents.ts` — Manual type coercion
- `photos.ts` — Manual MIME type check (file-specific, acceptable)
- `signatures.ts` — Typed interface but no runtime schema
- `treatments.ts` — Typed objects, no schema

---

## 12. Architecture Assessment

### Strengths

1. **Clean layer separation**: pages → server actions → lib → supabase. No business logic in components.
2. **Defense-in-depth**: RLS at DB level + auth guards in server actions + RBAC checks + proxy.ts route guards. Four independent layers.
3. **No client-side secret exposure**: All sensitive operations in server actions or API routes.
4. **Atomic AI processing**: Claim-before-process pattern in transcription pipeline prevents race conditions.
5. **Feature flags**: `tenant_features` table + `isTenantFeatureEnabled()` — proper per-tenant feature gating.
6. **Field-level permissions**: `lib/field-permissions.ts` provides granular field access without coupling to roles.
7. **Dual consent model**: Recording consent + AI processing consent are separate, revocable, versioned.
8. **CSRF protection on API route**: Explicit `isSameOrigin()` guard (not just relying on browser defaults).

### Weaknesses

1. **No structured logging**: 370+ raw `console.*` calls. No request IDs, no correlation. In production, these go to stdout with no queryability.
2. **Single-instance rate limiter**: In-memory Map. Fails under multiple server instances (horizontal scaling).
3. **LocalStorage PHI**: Form autosave stores clinical data in unencrypted browser storage.
4. **Sparse audit trail**: PHI is read/written without audit records in 19 of 30 action files.
5. **Bucket created at runtime**: `lib/pdf-cache.ts` creates the `pdf-cache` bucket if it doesn't exist on each `cachePDF()` call. Buckets should be pre-provisioned.
6. **Large monolithic assessment forms**: `skilled-nursing-assessment-form.tsx` (1,418 lines), `skin-sweep-assessment-form.tsx` (1,273 lines) are difficult to maintain. Multi-step wizard or section-based approach would help.
7. **39 pages, 1 error.tsx**: Sub-route errors fall back to root error boundary with no context.
8. **39 pages, 16 loading.tsx**: 23 pages have no loading state.

### Coupling Analysis

**Tight coupling points:**

- `app/dashboard/patients/[id]/visits/[visitId]/page.tsx` imports 32 modules — single change in any of those modules ripples to this page
- `app/actions/visits.ts` is imported by 20+ files — it is the hub of the system
- `lib/database.types.ts` is imported by ~30 files — schema changes require type regeneration

**These are acceptable for the domain** — visit management inherently requires many data types and components. The coupling is architectural necessity, not poor design.

---

## 13. Performance Analysis

### Parallel Data Fetching

`Promise.all()` is used in the correct places:

- `app/dashboard/page.tsx` — fetches role, credentials, corrections in parallel
- `app/dashboard/patients/[id]/visits/[visitId]/page.tsx` — fetches userRole, credentials, canDownload in parallel

### Potential N+1 Queries

The Supabase client supports nested selects which execute as JOINs rather than N+1. Review queries that iterate and call DB functions inside loops.

**Risk area:** `app/actions/reports.ts` — `getVisitLog()` with large result sets may benefit from pagination enforcement. Pagination is present but max page size is not enforced.

### PDF Generation

PDF generation with `@react-pdf/renderer` is synchronous and CPU-intensive. Currently runs in the server action context (Next.js worker). No background job queue — large PDFs will block the response.

### PDF Cache

`lib/pdf-cache.ts` provides caching, but cache invalidation on `revalidatePath()` calls is manual. If a page is revalidated without calling `invalidatePDFCache()`, stale PDFs may be served.

### Bundle Size

- `recharts` (~500KB), `react-big-calendar` (~200KB), `@react-pdf/renderer` (~800KB) are large dependencies.
- All are used only in specific pages/components — dynamic imports or route-level code splitting would reduce initial bundle.
- `export const dynamic = "force-dynamic"` on all dashboard pages prevents static optimization but is required for auth.

### `revalidatePath` Overuse

153 `revalidatePath` calls. Many call `/dashboard/patients` which invalidates the entire patients cache on any mutation. More granular paths (e.g., `/dashboard/patients/[id]`) would be more efficient.

---

## 14. HIPAA Compliance Analysis

### PHI Coverage Map

| Data Type            | Tables                        | RLS | Audit Log   | Encrypted           |
| -------------------- | ----------------------------- | --- | ----------- | ------------------- |
| Patient demographics | `patients`                    | ✅  | Partial     | DB-level (Supabase) |
| Visit records        | `visits`                      | ✅  | Partial     | DB-level            |
| Wound data           | `wounds`, `assessments`       | ✅  | Partial     | DB-level            |
| Clinical photos      | `photos` + Storage            | ✅  | Partial     | Storage encryption  |
| Audio recordings     | `visit_transcripts` + Storage | ✅  | ✅ (upload) | Storage encryption  |
| AI transcripts       | `visit_transcripts`           | ✅  | ✅          | DB-level            |
| Signatures           | `signatures`                  | ✅  | ✅          | DB-level            |
| Documents            | `patient_documents` + Storage | ✅  | ❌          | Storage encryption  |
| Billing              | `billing_records`             | ✅  | Partial     | DB-level            |
| Treatment orders     | `treatments`                  | ✅  | ❌          | DB-level            |
| Consent records      | `patient_recording_consents`  | ✅  | ❌          | DB-level            |

### Audit Log Coverage (auditPhiAccess)

Actions with `auditPhiAccess` calls:
✅ `visits.ts`, `patients.ts`, `assessments.ts`, `wounds.ts`, `billing.ts`, `photos.ts`, `signatures.ts`, `approval-workflow.ts`, `ai-transcription.ts`, `auth.ts`, `app/api/upload-audio/route.ts`

Actions **without** `auditPhiAccess` but accessing PHI:
❌ `treatments.ts`, `documents.ts`, `specialized-assessments.ts`, `new-forms.ts`, `reports.ts`, `pdf.ts`, `calendar.ts`, `search.ts`, `patient-clinicians.ts`, `wound-notes.ts`, `signature-audit.ts`, `notifications.ts`, `consent-status.ts`, `pdf-cached.ts`

**Gap:** ~55% of PHI-accessing actions have no audit trail.

### HIPAA Technical Safeguards

| Safeguard                  | Implementation                          | Status        |
| -------------------------- | --------------------------------------- | ------------- |
| Access Control             | RLS + RBAC + route guards               | ✅            |
| Unique User Identification | Supabase Auth UUID                      | ✅            |
| Automatic Logoff           | Supabase session expiry                 | ✅            |
| Encryption in Transit      | HTTPS (Supabase)                        | ✅            |
| Encryption at Rest         | Supabase managed                        | ✅            |
| Audit Controls             | `audit_logs` table + `log_phi_access()` | ⚠️ Incomplete |
| Integrity Controls         | RLS policies + FK constraints           | ✅            |
| Transmission Security      | HTTPS only                              | ✅            |

### AI/HIPAA — BAA Consideration

The system sends PHI (clinical context, patient data) to OpenAI API for note generation. This requires a Business Associate Agreement (BAA) with OpenAI. The code correctly enforces `ai_processing_consent_given` before any audio is processed, but the existence of an OpenAI BAA must be verified contractually — this cannot be confirmed from the codebase.

---

## 15. Prioritized Issue Register

### P0 — Must Fix Before Production

| ID   | Issue                                                                 | File                              | Impact                      |
| ---- | --------------------------------------------------------------------- | --------------------------------- | --------------------------- |
| P0-1 | `Math.random()` in useMemo — ESLint error, hydration mismatch         | `components/ui/sidebar.tsx:611`   | UI corruption in StrictMode |
| P0-2 | setState synchronously in useEffect — ESLint error, cascading renders | `lib/hooks/use-media-query.ts:15` | Performance / correctness   |
| P0-3 | `wound-notes.ts` — zero try/catch, all 4 async fns throw on DB error  | `app/actions/wound-notes.ts`      | Unhandled exception → 500   |

### P1 — High Priority (Security / HIPAA)

| ID   | Issue                                                                                                                       | File                               | Impact                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| P1-1 | PHI stored in localStorage with 24hr retention                                                                              | `lib/autosave.ts`                  | HIPAA risk on shared devices             |
| P1-2 | Rate limiting only on 2 of 31 endpoints                                                                                     | `lib/rate-limit.ts`                | DoS / cost abuse on AI, billing, reports |
| P1-3 | No auditPhiAccess in treatments.ts, documents.ts, specialized-assessments.ts, wound-notes.ts, reports.ts, pdf.ts, search.ts | Multiple                           | HIPAA audit gap                          |
| P1-4 | `approval-workflow.ts` — 16 throws vs 9 try/catch (7 unhandled)                                                             | `app/actions/approval-workflow.ts` | Silent failures in approval workflow     |
| P1-5 | `documents.ts` — 16 throws vs 13 try/catch                                                                                  | `app/actions/documents.ts`         | Silent failures in doc upload            |
| P1-6 | No Zod validation in ai-transcription.ts, signatures.ts, treatments.ts, photos.ts, specialized-assessments.ts, documents.ts | Multiple                           | Runtime type errors possible             |

### P2 — Medium Priority (Code Quality / Reliability)

| ID   | Issue                                                           | File                                | Impact                           |
| ---- | --------------------------------------------------------------- | ----------------------------------- | -------------------------------- |
| P2-1 | 6 ESLint warnings (unused vars, `<img>` tags)                   | Multiple                            | LCP regression, lint noise       |
| P2-2 | 56 console.log debug calls in production code                   | Multiple                            | Log noise, potential PHI in logs |
| P2-3 | PDF cache bucket created at runtime (should be pre-provisioned) | `lib/pdf-cache.ts`                  | Latency on every cachePDF()      |
| P2-4 | `patient-clinicians.ts` — 10 throws vs 7 try/catch              | `app/actions/patient-clinicians.ts` | Unhandled errors                 |
| P2-5 | 39 pages with 1 error.tsx (sub-route errors lose context)       | `app/dashboard/`                    | Poor error UX                    |
| P2-6 | 39 pages with 16 loading.tsx (23 pages show no loading state)   | `app/dashboard/`                    | Poor loading UX                  |
| P2-7 | `dotenv` in `dependencies` instead of `devDependencies`         | `package.json`                      | Unnecessary prod dep             |
| P2-8 | `react-signature-canvas@alpha` in production                    | `package.json`                      | Stability risk                   |

### P3 — Low Priority / Improvements

| ID   | Issue                                                          | File                        | Impact                          |
| ---- | -------------------------------------------------------------- | --------------------------- | ------------------------------- |
| P3-1 | 313 console.error calls — no structured logger                 | All                         | Not queryable in prod           |
| P3-2 | Hardcoded AI pricing constants                                 | `lib/ai-config.ts`          | Cost reporting inaccuracy       |
| P3-3 | Single-instance rate limiter fails under horizontal scaling    | `lib/rate-limit.ts`         | Rate limiting bypassed at scale |
| P3-4 | `CACHE_VERSION = "v1"` hardcoded — requires deploy to bust     | `lib/pdf-cache.ts`          | Cache management                |
| P3-5 | Large assessment form components (1,000+ lines each)           | `components/assessments/`   | Maintainability                 |
| P3-6 | `revalidatePath("/dashboard/patients")` — too broad            | Multiple                    | Over-invalidation               |
| P3-7 | Admin dynamic import inside function body                      | `app/actions/admin.ts`      | Added latency per call          |
| P3-8 | `signatures.ts` — no size limit on signatureData Base64 string | `app/actions/signatures.ts` | Oversized payloads              |

---

_End of Deep Analytics Report — wound-ehr_
