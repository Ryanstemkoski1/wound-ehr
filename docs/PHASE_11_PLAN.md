# Phase 11 Implementation Plan - AI Documentation & Mobile Optimization

**Timeline:** 6-8 weeks (March 6 - April 24, 2026)  
**Source:** Client meeting transcript (February 20, 2026)  
**Priority:** CRITICAL - AI note generation + mobile optimization  
**Status:** Planning complete, awaiting kickoff

---

## Executive Summary

Phase 11 focuses on revolutionary AI-powered clinical documentation and mobile device optimization. The primary feature—AI conversation capture and note synthesis—emerged from client feedback after experiencing AI note-taking in a medical setting. This represents a major workflow transformation that will significantly reduce documentation burden while improving accuracy and completeness.

**Key Deliverables:**

1. AI-powered clinical note generation from patient conversations
2. HIPAA-compliant audio recording and transcription system
3. Facility access control refinements (hide pending notes)
4. Clinical summary PDF templates (G-tube and wound care)
5. Mobile UI optimization for field use
6. PDF printing enhancements

---

## Phase 10 Completion Status

### ✅ Completed Features (as of February 20, 2026)

**10.1.1: Office Inbox Approval System** - APPROVED BY CLIENT

- Pending notes review interface working
- Approve/request correction/void workflow functional
- Notes become read-only after approval
- Correction loop working properly
- Client feedback: "Perfect. That looks great."

**10.2: Calendar & Reporting** - APPROVED BY CLIENT

- Clinician assignment to patients (multiple roles supported)
- Calendar filtering by clinician working
- Visit logs, facility summaries, medical records requests all functional
- Client feedback: "Cool", "Great"

**10.3: Access Control & Validation** - APPROVED BY CLIENT

- Role-based field restrictions (insurance read-only for RN)
- Tissue percentage validation (must equal 100%)
- Measurement logic warnings
- Location and pressure stage validation
- Clear, specific error messages

**BONUS: Performance Improvements** - DELIVERED

- Calendar load time: 65% faster
- Patient search: 85% faster
- PDF generation optimizations
- Better scalability with larger datasets

### ⚠️ Remaining Phase 10 Items

**10.1.2: Clinical Summary PDFs** - BLOCKED

- **Status:** Waiting on templates from Aaron/Erin
- **Required:** G-tube clinical summary format
- **Required:** Wound care clinical summary format
- **Action:** Client will send templates ASAP
- **Estimate:** 3-4 days once templates received

**10.4: Facility Access Control** - NEW REQUIREMENT

- **Status:** Identified in February 20 meeting
- **Requirement:** Hide unapproved notes from facility users
- **Implementation:** Show "pending note" indicator without content
- **Estimate:** 1 day (quick fix)

---

## Phase 11: Core Features

### 11.1: AI-Powered Clinical Note Generation (Weeks 1-4) 🔴 **HIGHEST PRIORITY**

**Client Need:** "I went to the doctor last week... they asked if I have A.I. take the recorder conversation for their note taking. My note was ready by the time I left the office, which is great."

**Business Value:**

- Dramatically reduces documentation time (30-60% time savings estimated)
- Improves clinical note completeness and accuracy
- Captures context that would otherwise be forgotten
- Provides legal protection with full conversation transcript
- Already becoming standard of care in medical documentation

**Problem Statement:**

- Clinicians spend excessive time typing clinical narratives
- Important details get omitted due to time pressure
- Handwritten notes are illegible or incomplete
- Need to document clinical logic/reasoning for each wound
- Current workflow: Type everything manually OR use editable PDFs (less structured)

---

**11.1.1: Research & Architecture (Week 1)** 📚

**Objective:** Identify HIPAA-compliant AI solution and design system architecture

- [ ] **Research HIPAA-Compliant AI Services**
  - [ ] Evaluate medical-specific transcription services:
    - Suki AI (physician-focused, HIPAA-compliant)
    - Nuance Dragon Medical One (industry leader)
    - DeepScribe (ambient clinical documentation)
    - Abridge (medical conversation AI)
    - AWS HealthScribe (HIPAA-compliant, healthcare-specific)
  - [ ] Evaluate general AI services with BAA support:
    - OpenAI Whisper API + GPT-4 (requires Business Associate Agreement)
    - Google Cloud Speech-to-Text Healthcare
    - Microsoft Azure Health Bot / Speech Services
    - AssemblyAI Medical Transcription (HIPAA-compliant)
  - [ ] Compare features: accuracy, latency, cost, language support, medical terminology
  - [ ] Verify Business Associate Agreement (BAA) availability
  - [ ] Check if service supports medical vocabulary/terminology
  - [ ] Review data residency and encryption requirements

- [ ] **Architecture Design**
  - [ ] Audio capture method: Browser-based (MediaRecorder API) vs. native app
  - [ ] Storage design:
    - Audio files: Supabase Storage private bucket `visit-audio/`
    - Transcripts: New `visit_transcripts` table
    - AI-generated notes: Store in `visits.ai_generated_note` field
  - [ ] Processing flow:
    1. Record audio during patient visit
    2. Upload to secure storage
    3. Send to AI transcription service
    4. Receive transcript + AI-generated clinical note
    5. Present editable note to clinician for review/approval
    6. Save final note to visit record
  - [ ] Access control: Admin-only access to raw audio/transcripts (audit trail)
  - [ ] Consent workflow: Add patient consent for recording (one-time, like consent-to-treat)

- [ ] **Legal & Compliance Review**
  - [ ] Document HIPAA compliance requirements
  - [ ] Draft patient consent language for audio recording
  - [ ] Establish data retention policy for audio files
  - [ ] Define access controls (who can listen to recordings)
  - [ ] Create audit trail requirements

**Deliverable:** Technical specification document with recommended AI service and architecture diagram

**Estimated Effort:** 5 days

---

**11.1.2: Database Schema & Storage Setup (Week 2, Days 1-2)** ✅ COMPLETE

- [x] **Create migration 00027: AI transcription tables**
  - Created `supabase/migrations/00027_ai_transcription.sql`
  - Tables: `visit_transcripts`, `patient_recording_consents`
  - ALTER TABLE visits: 4 new columns (`has_ai_transcript`, `ai_transcript_id`, `ai_note_approved`, `clinician_notes_manual`)
  - RLS policies, indexes, triggers, comments

- [x] **Create Supabase Storage bucket: `visit-audio/`**
  - Created `supabase/storage/visit-audio-bucket.sql`
  - Private bucket, 500MB limit, audio MIME types
  - RLS: INSERT (facility users), SELECT (admins + assigned clinician), DELETE (tenant_admin only)
  - 90-day retention policy documented

- [x] **Update types and actions**
  - [x] Updated `lib/database.types.ts` with `visit_transcripts`, `patient_recording_consents` tables and new visits columns
  - [x] Created `app/actions/ai-transcription.ts` — 12 server actions (upload, process, approve, reject, consent CRUD, audio management)
  - [x] Created `lib/ai-config.ts` — OpenAI config, wound care system prompt, consent text, TypeScript types

**Deliverable:** Database schema supporting AI transcription with HIPAA-compliant access controls

**Estimated Effort:** 2 days

---

**11.1.3: Patient Recording Consent Workflow (Week 2, Days 3-5)** ✅ COMPLETE

**Requirement:** Obtain one-time patient consent for visit recording before AI feature can be used

- [x] **Create recording consent component** (`components/signatures/recording-consent-modal.tsx`)
  - [x] Modal with consent form text (full HIPAA consent v1.0)
  - [x] Clear explanation: 3-card summary (What/Security/Retention) + scrollable full text
  - [x] Signature pad (reuses existing `SignaturePad` component)
  - [x] Consent version tracking (v1.0)
  - [x] 365-day expiration (annual renewal)
  - [x] Revocation modal with reason field (`RevokeRecordingConsentModal`)

- [x] **Integrate consent check into visit workflow**
  - [x] Patient detail page: `RecordingConsentStatus` card with consent/no-consent/expiring states
  - [x] If no consent: "Obtain Recording Consent" button opens modal
  - [x] If consent expiring: "Expiring Soon" badge + renewal button
  - [x] If consented: Active badge with revoke option
  - [x] Visit detail page: `VisitAIStatusCard` component
    - Shows consent status, transcript processing state, approval status
    - If no consent: "Obtain Recording Consent" button
    - If consented + no transcript: "Ready to record" message
    - If transcript processing: animated status indicators
    - If AI note ready: review/approve prompt

- [x] **Recording consent actions** (in `app/actions/ai-transcription.ts`)
  - [x] `checkRecordingConsent(patientId)` — validates active, not expired/revoked
  - [x] `saveRecordingConsent(patientId, signatureId, expiresInDays)` — upsert with conflict handling
  - [x] `revokeRecordingConsent(patientId, reason)` — soft revoke with reason

- [x] **Recording consent badge** (`components/signatures/recording-consent-status.tsx`)
  - [x] `RecordingConsentBadge` — compact inline badge: "AI Ready" / "Consent Expiring" / "No AI Consent"
  - [x] For patient list rows and visit headers

- [ ] **Admin management UI** (deferred to Phase 11.2+)
  - [ ] Patient list: Show recording consent status column
  - [ ] Bulk consent report: "% of patients with recording consent"
  - [ ] Consent expiration alerts

**Deliverable:** HIPAA-compliant patient consent system for visit recording

**Estimated Effort:** 3 days

---

**11.1.4: Audio Recording Interface (Week 3, Days 1-3)** ✅ COMPLETE

**Requirement:** Browser-based audio recording during patient visits with real-time feedback

- [x] **Create audio recording hook** (`lib/hooks/use-audio-recorder.ts`)
  - [x] Custom React hook wrapping browser MediaRecorder API
  - [x] Recording states: idle, requesting-permission, recording, paused, stopping, uploading, completed, error
  - [x] Real-time audio level analysis via AnalyserNode/FFT
  - [x] Duration timer with auto-stop at maxDuration
  - [x] File size tracking
  - [x] Microphone device selection/enumeration
  - [x] WebM+Opus with fallback (mp4/ogg)
  - [x] Proper cleanup on unmount
  - [x] Helper utilities: formatDuration, formatFileSize, getExtensionForMime

- [x] **Create audio recording component** (`components/visits/audio-recorder.tsx`)
  - [x] Uses useAudioRecorder hook (MediaRecorder API)
  - [x] Visual elements:
    - Large record/pause/stop buttons with state-based styling
    - Real-time scrolling waveform visualization (canvas-based)
    - Audio level bar meter (20-bar with color thresholds)
    - Duration timer (MM:SS) with max-duration progress bar
    - File size badge indicator
    - Duration warning at 83% threshold
  - [x] Controls:
    - Start Recording button (with consent gate via visit-ai-status-card)
    - Pause/Resume toggle
    - Stop Recording (finalizes audio)
    - Discard Recording (cancel without saving)
    - Microphone selector dropdown (if multiple available)
  - [x] Audio playback preview after recording completes
  - [x] Audio format: WebM with Opus codec, fallback MP4/OGG
  - [x] States: idle → recording/paused → completed → uploading → processing → done

- [x] **Integrate recording into visit form**
  - [x] Updated `visit-ai-status-card.tsx` to embed AudioRecorder
  - [x] Show recorder when:
    - Patient has recording consent ✅
    - Visit is editable (not signed/submitted) ✅
    - No existing transcript ✅
  - [x] Workflow:
    1. Clinician clicks "Start Recording" in AI Documentation card
    2. Records conversation with real-time waveform feedback
    3. Can pause during exam/procedures
    4. Clicks "Stop Recording" when done
    5. Reviews audio playback preview
    6. Clicks "Upload & Generate AI Note"
    7. Audio uploads to Supabase Storage via uploadVisitAudio server action
    8. AI processing starts automatically (processTranscription)
    9. Page refresh shows AI-generated note status

- [x] **Recording error handling**
  - [x] Browser support check (MediaRecorder + getUserMedia)
  - [x] Permission denied → friendly error message
  - [x] Device not found → descriptive error
  - [x] Max recording length enforcement (auto-stop at 60 min)
  - [x] Upload retry capability on failure
  - [x] Discard option at any stage

- [x] **Upload audio to Supabase Storage**
  - [x] Upload via server action (FormData with file/visitId/patientId)
  - [x] Upload progress indicator (uploading → processing states)
  - [x] Consent validation before upload
  - [x] Creates visit_transcripts record and links to visit
  - [x] Error handling with retry

---

**11.1.5: AI Transcription Service Integration (Week 3, Days 4-5 + Week 4, Days 1-2)**

**11.1.5: AI Transcription Service Integration (Week 3, Days 4-5 + Week 4, Days 1-2)** ✅ COMPLETE

**Requirement:** Send audio to AI service, receive transcript + clinical note

- [x] **Configure AI service**
  - [x] Environment variables: `OPENAI_API_KEY` in `.env.example`
  - [x] API key validation utility (`validateApiKey` in openai-service)
  - [x] Health check server action (`checkAIServiceHealth`)

- [x] **Create OpenAI service module** (`lib/ai/openai-service.ts`)
  - [x] `transcribeAudio()` — Whisper API with retry + timeout (5 min)
  - [x] `generateClinicalNote()` — GPT-4 with retry + timeout (2 min)
  - [x] `calculateWhisperCost()`, `calculateGPTCost()`, `calculateTotalCost()`
  - [x] `validateApiKey()` — Lightweight health check
  - [x] Typed error classification: auth, rate_limit, timeout, server, invalid_request, network
  - [x] Exponential backoff with jitter (max 3 retries, 30s cap)
  - [x] `fetchWithTimeout()` using AbortController
  - [x] All direct OpenAI REST API calls (no SDK dependency)

- [x] **Create transcription pipeline** (`lib/ai/transcription-pipeline.ts`)
  - [x] `runTranscriptionPipeline(transcriptId)` — Full orchestration:
    1. Download audio from Supabase Storage
    2. Transcribe with Whisper (saves intermediate raw transcript)
    3. Generate clinical note with GPT-4
    4. Save all results + metadata + costs to database
  - [x] `retryTranscription()` — Reset failed → re-run pipeline
  - [x] `regenerateClinicalNote()` — Re-run GPT-4 only (keeps raw transcript)
  - [x] Progress callback support for real-time status updates
  - [x] Error recovery: marks record as "failed" with detailed error message
  - [x] Intermediate saves: raw transcript saved before GPT-4 call (no data loss)
  - [x] Allows retry from "failed" state

- [x] **Update server actions** (`app/actions/ai-transcription.ts`)
  - [x] `processTranscription()` — Refactored to use pipeline
  - [x] `retryFailedTranscription()` — New: retry from failed state
  - [x] `regenerateAINote()` — New: re-generate note from existing transcript
  - [x] `getTranscriptionStatus()` — New: lightweight status polling
  - [x] `checkAIServiceHealth()` — New: admin API key validation
  - [x] All existing actions preserved: upload, approve, reject, delete, playback

- [x] **Client-side status polling** (`lib/hooks/use-transcription-polling.ts`)
  - [x] `useTranscriptionPolling()` hook — Polls during pending/processing states
  - [x] Configurable interval (default 3s), timeout (default 10 min)
  - [x] Auto-stops on terminal states (completed, failed, deleted)
  - [x] Callbacks: `onCompleted`, `onFailed`
  - [x] Elapsed time tracking and progress display

- [x] **Visit AI Status Card improvements** (`components/visits/visit-ai-status-card.tsx`)
  - [x] Integrated polling for real-time processing status updates
  - [x] Working "Retry Processing" button with `retryFailedTranscription`
  - [x] Elapsed time display during processing
  - [x] Auto-reload on completion
  - [x] New `transcriptId` prop for polling/retry

- [x] **Cost optimization & usage tracking** (`lib/ai/usage-tracking.ts`)
  - [x] `getUserMonthlyUsage()` — Per-clinician monthly summary
  - [x] `getAllClinicianUsage()` — Admin view of all clinicians
  - [x] `checkUsageWarnings()` — Threshold-based alerts (cost + count)
  - [x] Configurable thresholds: $25 info, $50 warning, $100 critical
  - [x] Tracks: transcription count, duration, cost breakdown, averages

---

**11.1.6: AI Note Review & Editing Interface (Week 4, Days 3-5)**

**Requirement:** Clinician reviews AI-generated note, makes edits, approves final version

- [x] **Create AI note review component** (`components/visits/ai-note-review.tsx`)
  - [x] Single editor with "AI Note" tab to view formatted original + "Edit" tab for editing
  - [x] Section-aware formatting (Chief Complaint, Wound Assessment, Treatment, etc.)
  - [x] Diff view tab showing side-by-side changes (AI original vs clinician edits)
  - [x] Edit tracking with "Reset" to revert to AI original
  - [x] Action buttons:
    - "Approve AI Note" / "Approve Edited Note" (with edit detection)
    - "Regenerate" (re-run GPT-4 on same transcript)
    - "Discard AI Note" (with confirmation dialog, resets for re-processing)
  - [x] Audio playback inline (signed URL via `getAudioPlaybackUrl`)
  - [x] Raw transcript viewer tab
  - [x] Metadata footer: duration, cost, tokens, model, language
  - [x] Approved state: green card with formatted note, edit badge, approval timestamp
  - [x] Copy to clipboard button
  - [x] Error handling with action error display
  - [x] Disabled actions for signed/submitted visits (`isEditable` prop)

- [x] **Integrate into visit detail page**
  - [x] AIReviewPanel renders below VisitAIStatusCard when transcript completed/approved
  - [x] Passes full transcript data with proper type mapping
  - [x] Respects visit status (read-only for signed/submitted)
  - [x] Updated VisitAIStatusCard messaging to reference review panel below

- [ ] **Admin transcript playback** (`app/dashboard/admin/transcripts/page.tsx`)
  - [ ] Admin-only page: "AI Transcripts"
  - [ ] Table of all transcripts (filterable by date, clinician, patient)
  - [ ] Audio playback with waveform
  - [ ] Show full verbatim transcript
  - [ ] Show AI-generated clinical note
  - [ ] Show final approved note (with edits highlighted)
  - [ ] Download options: audio file, transcript TXT, note PDF

- [ ] **Clinician preference controls**
  - [ ] User settings page: "AI Documentation Preferences"
  - [ ] Toggle: "Enable AI note generation for my visits"
  - [ ] Dropdown: "AI verbosity level" (concise, standard, detailed)
  - [ ] Checkbox: "Auto-start recording when I open a visit"
  - [ ] Checkbox: "Send me email when AI note is ready"

**Deliverable:** Complete AI note review and approval workflow

**Estimated Effort:** 3 days

---

**11.1.7: Testing & Refinement (Week 4, Day 5)**

- [x] **Build validation & lint check**
  - [x] TypeScript `tsc --noEmit` — zero errors
  - [x] ESLint on all Phase 11.1 files — zero errors
  - [x] Database migration applied via `supabase db push`
  - [x] Types regenerated via `npm run db:types` (not manually edited)

- [x] **Code review & critical bug fixes**
  - [x] Fixed Whisper 25 MB API limit (was incorrectly set to 500 MB)
  - [x] Fixed race condition: atomic status claim prevents double-processing
  - [x] Fixed polling `startTimeRef` never resetting on retry
  - [x] Fixed `setState` during render in AIReviewPanel (moved to event handler)
  - [x] Fixed `regenerateClinicalNote` not resetting `visits.ai_note_approved`
  - [x] Fixed `approveAINote` missing status validation (now requires `completed`)
  - [x] Fixed unsafe FormData type casts (now uses `instanceof File` check)
  - [x] Moved polling callbacks out of React state updater into `useEffect`

- [x] **Documentation created**
  - [x] User guide: `docs/phase-11/AI_DOCUMENTATION_USER_GUIDE.md`
  - [x] Test plan: `docs/phase-11/AI_DOCUMENTATION_TEST_PLAN.md` (40+ test scenarios)

- [ ] **Manual test scenarios** (requires running application)
  - [ ] Record 5-minute mock patient encounter → Verify transcription accuracy
  - [ ] Test with medical terminology (wound care vocab) → Verify correct recognition
  - [ ] Test with background noise → Verify quality/handling
  - [ ] Test network interruption during recording → Verify recovery
  - [ ] Test AI note formatting → Verify clinical structure
  - [ ] Edit AI note significantly → Verify diff tracking
  - [ ] Approve AI note → Verify saved to visit record
  - [ ] Discard AI note → Verify fallback to manual entry
  - [ ] Patient without recording consent → Verify blocked appropriately

- [ ] **Gather client feedback**
  - [ ] Demo to Dr. May and clinicians
  - [ ] Test with real wound care conversations
  - [ ] Adjust LLM prompt based on output quality
  - [ ] Tune transcription accuracy (medical vocabulary)
  - [ ] Refine UI/UX based on clinician preferences

- [ ] **Documentation**
  - [ ] User guide: "How to Use AI Documentation"
  - [ ] Admin guide: "Managing AI Transcripts"
  - [ ] Troubleshooting: Common recording issues
  - [ ] Privacy policy update: AI transcription disclosure

**Deliverable:** Production-ready AI documentation system

**Estimated Effort:** 1 day

---

**Phase 11.1 Summary:**

- **Total Effort:** 4 weeks (20 working days)
- **Priority:** CRITICAL - Major competitive advantage
- **Complexity:** HIGH - AI integration, HIPAA compliance, audio processing
- **Dependencies:**
  - Business Associate Agreement with AI provider
  - Patient recording consent forms (legal review)
  - Stable internet connection at facilities (for audio upload)
- **Risks:**
  - AI transcription accuracy may vary (accent, medical terminology)
  - Cost per transcription (usage-based pricing)
  - Client expectations may exceed AI capabilities initially
- **Success Metrics:**
  - 50%+ reduction in documentation time
  - 90%+ clinician adoption rate
  - 95%+ transcription accuracy for medical terms
  - Zero HIPAA violations

---

### 11.2: Facility Access Control Refinement (Week 5, Day 1) 🔴 **QUICK FIX**

**Client Need:** "If a clinician makes a mistake on a note, facilities would have access to it right away before the office can approve it."

**Decision:** Hide unapproved visit content from facility users, show "pending note" indicator only

- [ ] **Update visit visibility logic**
  - [ ] Create utility: `canViewVisitDetails(user, visit)` in `lib/rbac.ts`
  - [ ] Rules:
    - Clinician who created visit: FULL ACCESS (any status)
    - Tenant/Facility Admin: FULL ACCESS (any status)
    - Facility read-only users: ONLY if `visit.approval_status = 'approved'`
    - Otherwise: Show "pending note" indicator, hide content

- [ ] **Update visit list UI** (`app/dashboard/patients/[id]/visits/page.tsx`)
  - [ ] For facility users viewing unapproved visits:
    - Show: Visit date, clinician name, status badge "Pending Office Approval"
    - Hide: Wound assessments, treatments, notes, photos, PDF downloads
    - Show message: "This visit is pending office review. Contact office for information."

- [ ] **Update visit detail page** (`app/dashboard/patients/[id]/visits/[visitId]/page.tsx`)
  - [ ] If `!canViewVisitDetails(user, visit)`:
    - Redirect to patient page with toast: "This visit note is still pending approval"
    - Or: Show placeholder card "Visit Pending Approval" with contact info

- [ ] **Update PDF download permissions**
  - [ ] In `app/actions/pdf.ts`:
    - Check `canViewVisitDetails()` before generating PDF
    - Return error if unapproved and user is facility-only
  - [ ] Hide "Download PDF" button for unapproved visits (facility users only)

- [ ] **Test access control**
  - [ ] Login as facility admin → View approved note → Works ✅
  - [ ] Login as facility admin → Try view unapproved note → Blocked ✅
  - [ ] Login as clinician → View own unapproved note → Works ✅
  - [ ] Login as tenant admin → View any note → Works ✅

**Deliverable:** Proper access control preventing premature note disclosure

**Estimated Effort:** 1 day

---

### 11.3: Clinical Summary PDF Templates (Week 5, Days 2-3) ⚠️ **BLOCKED - WAITING ON CLIENT**

**Status:** Waiting for templates from Aaron/Erin

**Client Action Required:** Send G-tube and wound care clinical summary formats ASAP

- [ ] **Once templates received:**
  - [ ] Review template format and required fields
  - [ ] Create `components/pdf/clinical-summary-gtube.tsx`
  - [ ] Create `components/pdf/clinical-summary-wound-care.tsx`
  - [ ] Implement abbreviated format:
    - Include: Patient info, visit date, clinician, wound info, procedures (YES/NO), treatment orders
    - Exclude: Billing codes, tissue percentages, detailed infection signs, pain levels, medical-legal notes
  - [ ] Add download button on visit detail page: "Download Clinical Summary"
  - [ ] Restrict "Download Complete Note" to approved visits only (already implemented)

- [ ] **Test PDF generation**
  - [ ] Generate G-tube clinical summary → Verify format matches template
  - [ ] Generate wound care clinical summary → Verify format matches template
  - [ ] Verify no excluded information appears
  - [ ] Test with multiple wounds, multiple procedures
  - [ ] Verify facility users can download clinical summary (not complete note)

**Deliverable:** Two-tier PDF system (clinical summary vs. complete note)

**Estimated Effort:** 2 days (once templates received)

---

### 11.4: Mobile UI Optimization (Weeks 5-6) 📱

**Goal:** Optimize interface for tablet/mobile field use

**Client Context:** Clinicians use tablets (likely iPads) during facility visits

---

**11.4.1: Mobile Assessment Form Optimization (Week 5, Days 4-5)**

- [ ] **Audit current forms on mobile devices**
  - [ ] Test on iPad Pro, iPad Mini, iPhone (various sizes)
  - [ ] Identify usability issues:
    - Buttons too small to tap
    - Horizontal scrolling issues
    - Dropdowns/modals cut off
    - Text inputs too small
    - Signature pad too small

- [ ] **Update assessment form for touch**
  - [ ] Increase tap target sizes (min 44x44px)
  - [ ] Larger checkboxes and radio buttons (18px → 24px)
  - [ ] Bigger numeric input +/- buttons
  - [ ] Larger signature canvas (full width on mobile)
  - [ ] Stack form fields vertically (no side-by-side on small screens)
  - [ ] Larger text inputs (16px font minimum prevents zoom on iOS)

- [ ] **Optimize wound cards for mobile**
  - [ ] Stack wound info vertically
  - [ ] Larger wound photos (tap to fullscreen)
  - [ ] Swipe gestures to navigate between wounds
  - [ ] Bottom sheet modals (iOS-style) instead of center modals

- [ ] **Photo capture optimization**
  - [ ] Use native camera on mobile (input accept="image/\*" capture="environment")
  - [ ] Show camera viewfinder in-app (no need to open camera app separately)
  - [ ] Tap to focus, pinch to zoom
  - [ ] Immediate preview after capture
  - [ ] Retake button if photo is blurry

**Deliverable:** Touch-optimized assessment forms

**Estimated Effort:** 2 days

---

**11.4.2: Mobile Navigation & Layout (Week 6, Days 1-2)**

- [ ] **Bottom navigation bar for mobile**
  - [ ] Show on screens < 768px width
  - [ ] Sticky bottom bar with 4-5 key actions:
    - Home (dashboard)
    - Patients (list)
    - Calendar
    - New Visit (add button)
    - Menu (overflow)
  - [ ] Active state indicators
  - [ ] Hide sidebar on mobile (hamburger menu instead)

- [ ] **Patient list mobile optimization**
  - [ ] Card-based layout (not table)
  - [ ] Larger tap targets for patient rows
  - [ ] Pull-to-refresh gesture
  - [ ] Infinite scroll (lazy loading)
  - [ ] Sticky search bar at top
  - [ ] Filter drawer (slide in from right)

- [ ] **Calendar mobile view**
  - [ ] Default to day view on mobile (not month)
  - [ ] Swipe between dates (left/right gestures)
  - [ ] Tap event to view details (bottom sheet modal)
  - [ ] Floating action button: "Add Visit"
  - [ ] Hide clinician filter on mobile (auto-show my patients)

**Deliverable:** Mobile-first navigation and layout

**Estimated Effort:** 2 days

---

**11.4.3: Offline Support & Performance (Week 6, Days 3-4)**

**Client Context:** Field clinicians may have poor WiFi in facilities

- [ ] **Enhanced offline mode**
  - [ ] Service worker for offline page caching
  - [ ] Cache patient list, wound data for offline viewing
  - [ ] Queue actions when offline:
    - Save draft visit
    - Upload photo (when back online)
    - Submit assessment (when back online)
  - [ ] Show offline indicator banner
  - [ ] "Last synced: X minutes ago" status
  - [ ] Manual "Sync Now" button

- [ ] **Mobile performance optimizations**
  - [ ] Lazy load images (react-lazy-load-image-component)
  - [ ] Progressive image loading (blur-up technique)
  - [ ] Reduce bundle size (tree-shaking, code splitting)
  - [ ] Optimize fonts (subset, preload)
  - [ ] Minimize re-renders (React.memo, useMemo)
  - [ ] Debounce search inputs
  - [ ] Virtual scrolling for long lists

- [ ] **Test on 3G/4G speeds**
  - [ ] Chrome DevTools Network throttling
  - [ ] Test assessment form save with slow connection
  - [ ] Test photo upload with slow connection
  - [ ] Verify graceful degradation

**Deliverable:** Reliable offline support and fast mobile performance

**Estimated Effort:** 2 days

---

**11.4.4: Mobile Testing & Refinement (Week 6, Day 5)**

- [ ] **Device testing matrix**
  - [ ] iPhone SE (375px, smallest modern iPhone)
  - [ ] iPhone 14 (390px, current standard)
  - [ ] iPad Mini (768px, small tablet)
  - [ ] iPad Pro 11" (834px, standard tablet)
  - [ ] iPad Pro 12.9" (1024px, large tablet)
  - [ ] Android phone (Samsung Galaxy, various sizes)
  - [ ] Android tablet (Samsung Tab, Pixel Tablet)

- [ ] **Test core workflows on mobile**
  - [ ] Create new patient → Enter demographics → Save
  - [ ] View patient list → Search → Open patient
  - [ ] Create new visit → Complete assessment → Upload photo → Sign → Save
  - [ ] Multi-wound assessment → Switch between wounds → Save
  - [ ] Calendar → View appointments → Add new visit
  - [ ] Reports → Generate visit log → Export CSV

- [ ] **Fix mobile-specific bugs**
  - [ ] Any horizontal scroll issues
  - [ ] Modals cut off or inaccessible
  - [ ] Buttons too small or overlapping
  - [ ] Text inputs causing page zoom
  - [ ] Keyboard covering inputs (viewport height issues)

- [ ] **Orientation testing**
  - [ ] Test portrait mode
  - [ ] Test landscape mode (especially signature pad)
  - [ ] Verify layout adapts properly

**Deliverable:** Fully tested and refined mobile experience

**Estimated Effort:** 1 day

---

### 11.5: Printing & PDF Enhancements (Week 7)

**Goal:** Professional PDF exports with clinician signatures and photo options

---

**11.5.1: Clinician Signature on PDF Exports (Week 7, Days 1-2)**

**Requirement:** All PDFs must show "Documented by [Name], [Credentials] on [Date/Time]"

- [ ] **Update PDF components**
  - [ ] Add signature footer component (`components/pdf/pdf-signature-footer.tsx`)
    - Clinician name (from user profile)
    - Credentials (RN, MD, etc.)
    - Date and time of documentation
    - Optional: Printed signature image (if available)
  - [ ] Update visit summary PDF (`components/pdf/visit-summary-pdf.tsx`)
    - Add signature footer on last page
  - [ ] Update wound progress PDF (`components/pdf/wound-progress-pdf.tsx`)
    - Add signature footer on last page
  - [ ] Update clinical summary PDFs (when templates implemented)
    - Add signature footer on last page

- [ ] **Format example:**

  ```
  ─────────────────────────────────────────────────────
  Documented by: Dr. Jane Smith, MD
  Date: February 20, 2026 at 2:45 PM PST

  [Optional: Digital signature image]

  This document was electronically generated and authenticated.
  ─────────────────────────────────────────────────────
  ```

- [ ] **Test PDF signatures**
  - [ ] Generate visit summary → Verify signature appears
  - [ ] Generate wound progress → Verify signature appears
  - [ ] Test with different credentials (RN, MD, PA) → Verify all display correctly
  - [ ] Verify timestamp is in correct timezone

**Deliverable:** Compliant PDF reports with clinician attribution

**Estimated Effort:** 2 days

---

**11.5.2: Photo Printing Preferences (Week 7, Days 3-4)**

**Requirement:** User preference to include/exclude photos in PDFs

- [ ] **Create user settings page** (`app/dashboard/settings/page.tsx`)
  - [ ] Tab: "PDF Preferences"
  - [ ] Toggle: "Include wound photos in PDF exports"
  - [ ] Toggle: "Include measurement charts in PDF exports"
  - [ ] Dropdown: "PDF page size" (Letter, A4, Legal)
  - [ ] Dropdown: "Photo size in PDFs" (Small, Medium, Large, Full Page)
  - [ ] Checkbox: "Always show photo labels (wound location)"
  - [ ] Save button

- [ ] **Create user_preferences table** (migration 00028)

  ```sql
  CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    include_photos_in_pdf BOOLEAN DEFAULT TRUE,
    include_charts_in_pdf BOOLEAN DEFAULT TRUE,
    pdf_page_size TEXT DEFAULT 'letter' CHECK (pdf_page_size IN ('letter', 'a4', 'legal')),
    pdf_photo_size TEXT DEFAULT 'medium' CHECK (pdf_photo_size IN ('small', 'medium', 'large', 'full-page')),
    pdf_show_photo_labels BOOLEAN DEFAULT TRUE,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
  );

  CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
  ```

- [ ] **Update PDF generation logic**
  - [ ] Load user preferences before generating PDF
  - [ ] Conditionally render photos based on `include_photos_in_pdf` setting
  - [ ] Adjust photo size based on `pdf_photo_size` setting
  - [ ] Conditionally render charts based on `include_charts_in_pdf` setting

- [ ] **Test PDF preferences**
  - [ ] Set "exclude photos" → Generate PDF → Verify no photos shown
  - [ ] Set "include photos - small" → Generate PDF → Verify small photos
  - [ ] Set "include photos - full page" → Generate PDF → Verify full-page photos
  - [ ] Change page size to A4 → Generate PDF → Verify A4 format

**Deliverable:** Customizable PDF output per user preferences

**Estimated Effort:** 2 days

---

**11.5.3: Advanced PDF Features (Week 7, Day 5)**

**Optional enhancements if time permits**

- [ ] **PDF watermark option**
  - [ ] User preference: "Add 'CONFIDENTIAL' watermark to PDFs"
  - [ ] Diagonal watermark across each page

- [ ] **PDF password protection**
  - [ ] Option to password-protect sensitive PDFs
  - [ ] Useful for emailing PDFs securely

- [ ] **Batch PDF export**
  - [ ] Select multiple visits → "Download All as ZIP"
  - [ ] Useful for medical records requests

- [ ] **PDF templates**
  - [ ] Admin can customize PDF header/footer
  - [ ] Upload facility logo for PDFs
  - [ ] Custom color scheme per facility

**Deliverable:** Advanced PDF customization options

**Estimated Effort:** 1 day (if time permits)

---

### 11.6: Additional Enhancements (Week 8)

**Goal:** Polish, bug fixes, and nice-to-have features

---

**11.6.1: Auto-Save Improvements (Week 8, Days 1-2)**

**Build on Phase 9.3.2 foundation**

- [ ] **Visual save status indicator**
  - [ ] Component: `components/ui/save-status.tsx`
  - [ ] Position: Fixed top-right corner of forms
  - [ ] States with icons:
    - 💾 "Saving..." (spinner)
    - ✅ "Saved at 2:15 PM" (green checkmark)
    - ⚠️ "Offline - Saved locally" (yellow warning)
    - ❌ "Save failed - Retry" (red X with retry button)
  - [ ] Keyboard shortcut: Ctrl+S / Cmd+S for manual save
  - [ ] Toast notification on successful save (optional, can be disabled in settings)

- [ ] **Enhanced recovery modal**
  - [ ] On page load, check localStorage for unsaved drafts
  - [ ] If found: Show modal with options:
    - "Restore Draft" (load saved data)
    - "Discard Draft" (clear localStorage)
    - "View Both" (side-by-side comparison - show what's different)
  - [ ] Timestamp: "Draft saved 15 minutes ago"
  - [ ] Preview: Show first 200 characters of draft content

- [ ] **Multi-wound assessment auto-save**
  - [ ] When switching between wounds:
    - Auto-save current wound assessment
    - Show "Saving wound 1..." indicator
    - Load next wound data after save completes
  - [ ] Progress indicator: "Wound 1: ✅ Saved | Wound 2: ⏹️ Not started | Wound 3: 💾 Saving..."

**Deliverable:** Robust auto-save with clear user feedback

**Estimated Effort:** 2 days

---

**11.6.2: Search & Filter Enhancements (Week 8, Day 3)**

- [ ] **Global search** (`components/layout/global-search.tsx`)
  - [ ] Cmd+K / Ctrl+K keyboard shortcut
  - [ ] Search modal with instant results
  - [ ] Search across:
    - Patients (name, MRN, DOB)
    - Visits (date, clinician)
    - Facilities
    - Users
  - [ ] Show results with context (patient name + facility)
  - [ ] Click result to navigate directly

- [ ] **Advanced patient filters**
  - [ ] Filter drawer on patient list page
  - [ ] Filters:
    - Active wounds (yes/no)
    - Wound type (pressure injury, diabetic, etc.)
    - Last visit date range
    - Assigned clinician
    - Facility
    - Insurance type
  - [ ] "Save Filter Preset" button (save common filter combinations)

- [ ] **Recent patients / Quick access**
  - [ ] Track last 10 patients viewed per user
  - [ ] "Recent Patients" section on dashboard
  - [ ] Jump directly to recently viewed patient

**Deliverable:** Enhanced search and filtering capabilities

**Estimated Effort:** 1 day

---

**11.6.3: Notifications & Alerts (Week 8, Days 4-5)**

- [ ] **In-app notification system**
  - [ ] Component: `components/layout/notifications-panel.tsx`
  - [ ] Bell icon in header with badge count
  - [ ] Notification types:
    - "Visit correction requested" (clinician)
    - "Note approved" (clinician)
    - "AI note ready for review" (clinician)
    - "New patient assigned" (clinician)
    - "Pending notes to review" (admin)
  - [ ] Click notification to navigate to relevant item
  - [ ] Mark as read functionality
  - [ ] Notification history (last 30 days)

- [ ] **Email notifications** (optional)
  - [ ] User preference: "Email me when..." (checkboxes)
    - Correction requested
    - Note approved
    - AI note ready
    - New patient assigned
  - [ ] Daily digest option: "Send daily summary of activity"
  - [ ] Use Supabase Edge Functions + Resend.com for email delivery

- [ ] **Dashboard alerts**
  - [ ] Alert cards on dashboard:
    - "You have X pending corrections"
    - "Y notes awaiting your approval" (admin)
    - "Z patients without consent forms"
  - [ ] Click alert to navigate to relevant page

**Deliverable:** Comprehensive notification system

**Estimated Effort:** 2 days

---

## Phase 11 Summary

### Timeline & Effort

- **Total Duration:** 8 weeks (March 6 - April 24, 2026)
- **Total Effort:** 40 working days
- **Priority:** CRITICAL - Production blockers + major feature addition

### Feature Breakdown

| Feature                          | Priority    | Effort    | Status             |
| -------------------------------- | ----------- | --------- | ------------------ |
| 11.1: AI-Powered Note Generation | 🔴 CRITICAL | 4 weeks   | New                |
| 11.2: Facility Access Control    | 🔴 HIGH     | 1 day     | Quick Fix          |
| 11.3: Clinical Summary PDFs      | ⚠️ BLOCKED  | 2 days    | Awaiting Templates |
| 11.4: Mobile UI Optimization     | 🟡 MEDIUM   | 1.5 weeks | New                |
| 11.5: Printing Enhancements      | 🟢 LOW      | 1 week    | Enhancement        |
| 11.6: Additional Polish          | 🟢 LOW      | 1 week    | Nice-to-Have       |

### Dependencies

**External:**

- Business Associate Agreement (BAA) with AI transcription provider
- Clinical summary templates from Aaron/Erin (G-tube and wound care)
- Legal review of patient recording consent forms

**Technical:**

- Supabase Storage configured for large audio files
- Stable internet at client facilities (for audio upload)
- AI service API keys and quotas

**Internal:**

- Phase 10 completion (95% done, pending templates)
- Testing environment access for client

### Success Metrics

**AI Documentation System:**

- 50%+ reduction in documentation time per visit
- 90%+ clinician adoption rate within 3 months
- 95%+ transcription accuracy for medical terminology
- Zero HIPAA compliance violations
- Client satisfaction: "This changed our workflow dramatically"

**Mobile Optimization:**

- All core workflows usable on tablets/phones
- No horizontal scrolling issues
- Touch targets meet accessibility standards (44x44px minimum)
- Page load time < 2 seconds on mobile devices

**Overall Phase 11:**

- Client approves all deliverables
- Production deployment ready by April 24, 2026
- Zero critical bugs
- Positive clinician feedback on usability

### Risks & Mitigation

| Risk                                         | Impact   | Mitigation                                                                     |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| AI transcription accuracy below expectations | HIGH     | Offer manual notes fallback, tune LLM prompts, use medical-specific AI service |
| HIPAA compliance issues with AI provider     | CRITICAL | Thoroughly vet providers, require BAA, legal review, audit trail               |
| High cost per transcription                  | MEDIUM   | Monitor usage, set per-user limits, offer compressed audio option              |
| Poor WiFi at facilities (audio upload fails) | MEDIUM   | Local storage queue, retry logic, compress audio before upload                 |
| Clinical summary templates delayed           | MEDIUM   | Proceed with other features, implement in parallel when received               |
| Client expectations exceed AI capabilities   | MEDIUM   | Set realistic expectations, show demo early, iterate based on feedback         |

### Testing Plan

**Week 8 (Final Week):**

- [ ] **Day 1-2: Integration Testing**
  - [ ] Test complete workflow: Recording → Transcription → Note review → Approval → PDF export
  - [ ] Test with multiple wound types and procedures
  - [ ] Test edge cases (very long recordings, poor audio quality, network failures)

- [ ] **Day 3: User Acceptance Testing (UAT)**
  - [ ] Client team tests AI documentation with real patient encounters
  - [ ] Gather feedback on:
    - Transcription accuracy
    - Clinical note quality
    - UI/UX functionality
    - Mobile experience
  - [ ] Make adjustments based on feedback

- [ ] **Day 4: Performance & Security Testing**
  - [ ] Load test: 50 concurrent users
  - [ ] Security audit: Check RLS policies, access controls
  - [ ] Penetration test: Audio file access, transcript access
  - [ ] HIPAA compliance checklist review

- [ ] **Day 5: Documentation & Training**
  - [ ] Update user documentation
  - [ ] Create training videos:
    - "How to Use AI Documentation"
    - "Mobile Workflow Tips"
    - "Admin: Managing Transcripts"
  - [ ] Conduct training session with client team

### Deployment Plan

**Production Cutover: April 24, 2026**

**Pre-Deployment (April 17-23):**

- [ ] Code freeze on April 17
- [ ] Final QA testing
- [ ] Database migration dry run (test environment)
- [ ] Communication to users about new features
- [ ] Backup current production database

**Deployment Day (April 24):**

- [ ] Run migrations 00027, 00028
- [ ] Deploy new code
- [ ] Verify all features working
- [ ] Monitor for errors (first 24 hours)
- [ ] Support team on standby

**Post-Deployment (April 25-30):**

- [ ] Gather user feedback
- [ ] Monitor AI transcription usage and costs
- [ ] Fix any critical bugs (hotfix releases)
- [ ] Schedule Phase 12 planning meeting

### Budget & Resources

**AI Transcription Costs (Estimated):**

- Service: AWS HealthScribe or similar (HIPAA-compliant)
- Cost: ~$0.10 per minute of audio
- Average visit: 15 minutes = $1.50 per visit
- Expected usage: 100 visits/month = $150/month
- Annual cost: ~$1,800

**Development Effort:**

- Total hours: 320 hours (40 days × 8 hours)
- At standard rate: [Client's rate structure]

**Infrastructure:**

- Supabase Storage: +$25/month for audio files
- AI API costs: ~$150/month (see above)
- Total new monthly cost: ~$175

### Documentation Deliverables

1. **Technical Documentation:**
   - AI transcription system architecture
   - Database schema changes (migrations 00027, 00028)
   - API integration guide (selected AI service)
   - Security and HIPAA compliance documentation

2. **User Documentation:**
   - "Getting Started with AI Documentation" guide
   - "Mobile App User Guide"
   - "PDF Preferences and Printing" guide
   - Troubleshooting common issues

3. **Admin Documentation:**
   - "Managing AI Transcripts" guide
   - "User Permissions and Access Control"
   - "Monitoring Usage and Costs"

4. **Legal Documentation:**
   - Updated Privacy Policy (AI transcription disclosure)
   - Patient Recording Consent form
   - Business Associate Agreement (BAA) template

### Next Steps (Immediate)

**Week 1 Actions (March 6-13):**

1. **Client Actions:**
   - [ ] Send clinical summary templates (G-tube and wound care) to developer
   - [ ] Review and approve patient recording consent form language
   - [ ] Provide feedback on AI transcription priority (confirm this is most important)

2. **Developer Actions:**
   - [ ] Research HIPAA-compliant AI transcription services (3 options minimum)
   - [ ] Prepare service comparison matrix for client review
   - [ ] Draft Business Associate Agreement requirements
   - [ ] Begin database schema design (migration 00027)

3. **Joint Actions:**
   - [ ] Schedule kickoff call for Phase 11 (week of March 6)
   - [ ] Confirm budget approval for AI transcription costs
   - [ ] Establish testing plan with client clinicians (UAT participants)

---

## Appendix: Client Meeting Notes (February 20, 2026)

### Attendees

- Client: Dr. May, Alana (likely nurse/admin), Aaron's team
- Developer: System architect

### Key Quotes

**On AI Documentation:**

> "I went to the doctor last week... they asked if I have A.I. take the recorder conversation for their note taking. My note was ready by the time I left the office, which is great. I'm curious if there's, like, an AI tool that we can integrate with this."

**On Clinician Workflow:**

> "There's a section of what we're communicating that needs to be clinical logic, explaining what's going on with the patient to explain why a wound is getting better, why we're treating for infection... I think from a speed standpoint, for them to be able to have an option that it'll make it easier for them to enter the data."

**On Facility Access:**

> "If a clinician makes a mistake on a note, the facilities would have access to it right away before the office can approve it. I think it's best if it was like 'there was a note here,' like 'the patient was seen type of thing,' but it's pending."

**On Phase 10 Features:**

> "Everything looks great. The office inbox is perfect. The reporting systems are great. The calendar filtering is exactly what we need."

### Decisions Made

1. ✅ **Phase 10 Features Approved:** Office inbox, calendar, reporting, validation
2. ✅ **Facility Access Control:** Hide unapproved notes, show "pending" indicator
3. ✅ **AI Documentation Priority:** Highest priority for Phase 11
4. ✅ **Clinical Summary Templates:** Waiting on Aaron/Erin to send
5. ✅ **Next Meeting:** Regroup in couple weeks (early March)

### Action Items from Meeting

**Client (Dr. May):**

- [ ] Send clinical summary templates (G-tube and wound care)
- [ ] Test Phase 10 features thoroughly
- [ ] Provide feedback on any adjustments needed

**Developer:**

- [ ] Research AI transcription services (HIPAA-compliant)
- [ ] Implement facility access control fix (hide pending notes)
- [ ] Continue Phase 10 polish and bug fixes

---

**Document Version:** 1.0  
**Created:** February 20, 2026  
**Last Updated:** February 20, 2026  
**Status:** DRAFT - Awaiting Client Review
