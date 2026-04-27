# Wound EHR — Project Status

**Last Updated:** April 27, 2026

---

## Phase Completion

| Phase  | Description                                                                     | Status   | Date         |
| ------ | ------------------------------------------------------------------------------- | -------- | ------------ |
| 1–8    | Core EHR (patients, wounds, visits, calendar, billing, photos, PDF)             | Complete | Oct 2025     |
| 9.1    | Credentials-based role system                                                   | Complete | Nov 2025     |
| 9.2    | Electronic signatures & audit trail                                             | Complete | Nov 2025     |
| 9.3    | High-priority compliance (7 sub-phases)                                         | Complete | Nov 2025     |
| 9.4    | Advanced features (documents, specialized assessments)                          | Complete | Dec 2025     |
| 10     | Production features (approval workflow, reports, field permissions, validation) | Complete | Feb 2026     |
| 11.1   | AI clinical note generation (Whisper + GPT-4)                                   | Complete | Mar 9, 2026  |
| 11.6   | Treatment Order Builder (4-tab sentence builder)                                | Complete | Mar 16, 2026 |
| 11.7   | Client Forms (debridement, consents, incident, not-seen)                        | Complete | Mar 16, 2026 |
| 11.2.1 | Facility access control (hide unapproved notes)                                 | Complete | Apr 2, 2026  |
| 11.3   | Mobile UI optimization (touch targets, bottom nav, calendar, perf)              | Complete | Apr 3, 2026  |
| 11.4.1 | Clinician signature on PDFs (all 3 PDF types)                                   | Complete | Apr 3, 2026  |
| 11.5.1 | Auto-save visual indicators (status tracking, Ctrl+S)                           | Complete | Apr 3, 2026  |
| 11.5.2 | Global search (Cmd+K dialog, patients & facilities)                             | Complete | Apr 3, 2026  |
| 11.5.3 | In-app notifications (bell, polling, mark read)                                 | Complete | Apr 3, 2026  |
| 11.5.4 | AI transcript admin, enhanced audio player, retention cleanup                   | Complete | Apr 3, 2026  |
| 11.4.2 | Photo printing preferences (settings page + PDF integration)                    | Complete | Apr 6, 2026  |
| 12     | Security audit & hardening (Critical + High + Medium)                           | Complete | Apr 27, 2026 |

> Phase 11.2.2 (Clinical Summary PDFs) was dropped — client confirmed the implemented forms fulfill the requirement.

---

## Codebase Metrics

| Metric                   | Count                        |
| ------------------------ | ---------------------------- |
| Database tables          | 32                           |
| RLS policies             | 80+                          |
| RPC functions            | 22+                          |
| Database migrations      | 11                           |
| Route pages              | 43                           |
| API routes               | 1                            |
| Server action files      | 26 (~183 exported functions) |
| React components         | 143 (126 Client / 17 Server) |
| Library utility files    | 30                           |
| Custom hooks             | 9                            |
| Supabase Storage buckets | 5                            |

---

## What's Remaining

### Phase 11.4.3: Advanced PDF Features (optional)

- Watermark option, batch PDF export (ZIP)

### Operational (client / DevOps action)

- Apply migration `00036_perf_indexes.sql` and run `npm run db:types`
- Patch `delete_expired_audio()` to allow `auth.uid() IS NULL` (cron context), then schedule pg_cron jobs: audio retention (daily 03:00), expired-invite cleanup (daily 03:15), stuck-transcript reaper (every 15 min), audit log retention (weekly)
- Set `NEXT_PUBLIC_SUPABASE_URL` in production env (`next.config.ts` now derives the image hostname from it and throws at boot if missing)

---

## Recently Completed (Apr 27, 2026)

### Phase 12: Security Audit & Hardening

Comprehensive line-by-line audit identified 41 findings across Critical / High / Medium / Low. All Critical, High, and Medium items resolved.

**Critical fixes (migration `00034_critical_security_fixes.sql`)**

- Hardened `get_user_role_info()` SECURITY DEFINER (locked `search_path`, removed implicit privilege escalation paths)
- Fixed `photos.wound_id` FK to `ON DELETE SET NULL` (was cascading and silently destroying photo records)
- New `audit_logs` table + `log_phi_access()` RPC for HIPAA disclosure tracking
- Added 5 AI-processing-consent columns to `patient_recording_consents` (separates AI consent from recording consent)

**High-severity fixes (migration `00035_high_severity_hardening.sql`)**

- `SET search_path = public` on 6 more SECURITY DEFINER functions
- `procedure_scopes` SELECT restricted to caller's own credential level
- Facility-scope checks added to grafting + skin-sweep UPDATE/DELETE policies
- UNIQUE(visit_id) added to 3 specialized assessment tables (prevents duplicate-form race condition)
- New `delete_expired_audio(retention_days INTEGER DEFAULT 90)` tenant-admin RPC

**Performance (migration `00036_perf_indexes.sql`, pending apply)**

- 8 missing FK / partial / covering indexes on signatures, consents, retention scan, and RLS-checked `created_by` columns

**Application-layer hardening**

- New helpers: [lib/audit-log.ts](../lib/audit-log.ts), [lib/rate-limit.ts](../lib/rate-limit.ts), [lib/image-sniff.ts](../lib/image-sniff.ts), [lib/validations/common.ts](../lib/validations/common.ts)
- `auditPhiAccess()` wired into `getPatient`, `getVisit`, `getWound`, `getPhoto`, `getPhotos`, `getSignature`, `getVisitSignatures`, `getConsentDocumentUrl`, audio upload route, and login
- Audio upload route ([app/api/upload-audio/route.ts](../app/api/upload-audio/route.ts)): same-origin CSRF check, per-user rate limit (10 / 5 min), AI-consent gate, sanitized error logs (no PHI)
- Login ([app/actions/auth.ts](../app/actions/auth.ts)): per-IP rate limit (10 / 15 min), audit on success, fixed invite handling
- Photo upload ([app/actions/photos.ts](../app/actions/photos.ts)): server-side magic-byte sniffing rejects mismatched / disallowed MIME types
- UUID validation at action boundaries ([app/actions/treatments.ts](../app/actions/treatments.ts)) prevents Postgres error leakage
- Service-role client ([lib/supabase/service.ts](../lib/supabase/service.ts)): comprehensive doc block listing allowed / forbidden uses + browser-context throw guard
- `next.config.ts` derives Supabase image hostname from `NEXT_PUBLIC_SUPABASE_URL` (no more hardcoded project ID)
- Admin tenant-scoping: `updateUserRole` enforces facility-scope check for `facility_admin` role assignments
- AI consent UI: separate consent checkbox in `RecordingConsentModal`, status badge in `RecordingConsentStatus`, threaded into `AudioRecorder` (Start disabled until AI consent given)
- New `revokeAiProcessingConsent(patientId)` server action

---

## Recently Completed (Apr 6, 2026)

### Phase 11.4.2: Photo Printing Preferences

**Database & Server Actions**

- New `user_preferences` table (migration `00032_user_preferences.sql`) with RLS policies
- `getUserPreferences()` returns saved preferences or sensible defaults
- `savePDFPreferences()` upserts with validation (size, count, page size constraints)

**Settings Page (`/dashboard/settings`)**

- Photo toggle (Switch): include/exclude wound photos from PDFs entirely
- Photo size picker (Small / Medium / Large): maps to 100pt / 150pt / 220pt height
- Photos-per-assessment slider (1–6): controls max photos per assessment entry
- Page size dropdown: US Letter or A4
- Save bar with change detection, saving state, and success feedback
- New "Settings" link in sidebar navigation (Settings icon)

**PDF Integration**

- `getWoundDataForPDF()` loads user preferences and respects photo include/exclude + max count
- `WoundProgressPDF` component renders dynamic photo height, conditional photo section, and selectable page size
- Defaults: photos on, medium size (150pt), 2 per assessment, US Letter — same as prior behavior

---

## Recently Completed (Apr 3, 2026)

### Phase 11.3: Mobile UI Optimization

**11.3.1: Touch-Friendly Forms**

- Global 44×44px min touch targets for coarse pointers (CSS `@media (pointer: coarse)`)
- 16px min font on inputs (prevents iOS zoom), larger checkboxes/radios
- Signature pad: responsive height (260px mobile / 200px desktop), retina DPR scaling
- Skilled nursing tabs: flexbox wrapping on small screens (10 tabs, shortened labels)
- Safe-area-inset padding on body for notch devices
- `prefers-reduced-motion` support to disable animations

**11.3.2: Mobile Navigation & Layout**

- Bottom navigation bar (`<BottomNavBar>`) — 5 items, `md:hidden`, safe-area padding
- "More" button opens sidebar drawer on mobile
- Calendar defaults to "day" view on mobile, restricts to day/week/agenda (no month)
- Drag-resize disabled on mobile

**11.3.3: Performance**

- Logo image marked `priority` (LCP fix)
- Lazy loading on native `<img>` tags in wound assessment history
- Responsive `sizes` attribute on wound card photos

**New hooks:** `useMediaQuery`, `useMobile`, `useTabletOrMobile`, `useTouchDevice` in `lib/hooks/use-media-query.ts`

### Phase 11.4.1: Clinician Signature on PDFs

- All 3 PDF types now include clinician signature footers
- Visit Summary PDF: provider credentials displayed alongside signature
- Wound Progress & Patient Summary PDFs: new clinician name + credentials + date footer
- Credentials fetched from `users` table via `created_by` / current user

### Phase 11.5.1–11.5.3: Final Polish

**Auto-Save Indicators (11.5.1)**

- `useAutosave` hook now tracks `saveStatus` and `lastSavedAt`
- Floating save indicator variant (`floating` prop on `AutosaveIndicator`)
- Ctrl+S / Cmd+S keyboard shortcut in visit form

**Global Search (11.5.2)**

- Cmd+K / Ctrl+K opens search dialog
- Searches patients (name/MRN) and facilities (name)
- Keyboard navigation (↑↓, Enter, Esc), debounced 250ms
- Server action: `app/actions/search.ts`

**In-app Notifications (11.5.3)**

- Bell icon with red badge count in header
- Aggregates: corrections, approvals, AI notes ready, patient assignments
- Auto-polls every 60s, mark individual/all as read
- Relative time formatting, click navigates to source

### Phase 11.5.4: AI Transcript Management

**Admin Transcripts Page**

- New route: `/dashboard/admin/transcripts` with sidebar navigation link
- Stats dashboard: total transcripts, cost breakdown (Whisper + GPT-4), storage count, expired audio count
- Filterable table with status, patient, visit date, duration, size, cost columns
- Inline audio playback from signed Supabase Storage URLs
- Individual audio deletion per transcript

**Enhanced Audio Player**

- Replaced basic play/pause player with full-featured `TranscriptAudioPlayer`
- Visual progress bar with click-to-seek and scrub handle
- Current time / total duration display
- Playback speed control (0.75×, 1×, 1.25×, 1.5×, 2×)

**Audio Retention Cleanup**

- `cleanupExpiredAudio()` server action: batch deletes audio files older than 90 days
- Preserves written transcripts and clinical notes (permanent medical record)
- Admin confirmation dialog with count of affected files
- Dry-run capability for previewing impact

---

## Known Issues

### 1. Facility Access Control — FIXED

~~Unapproved notes visible to facility users.~~ Facility users (non-clinical role=`user`) now see a “Pending Review” badge on visit cards and are redirected away from visit detail pages for unapproved visits. PDF downloads are blocked at the server action level (`getVisitDataForPDF`, `checkCachedVisitPDF`). Clinicians and admins are unaffected.

### 2. Mobile Responsiveness — FIXED

~~Desktop-first design. Some forms not optimized for tablet/mobile. Signature pad needs touch optimization.~~ Phase 11.3 implemented: 44×44px touch targets, responsive signature pad, bottom navigation bar, mobile calendar view, safe-area-inset support, lazy loading, and `prefers-reduced-motion` support. Service worker offline support was descoped (not needed for clinical WiFi environments).

### 3. No Automated Test Coverage

Primarily manual testing. 40+ test scenarios documented in [archive/AI_DOCUMENTATION_TEST_PLAN.md](./archive/AI_DOCUMENTATION_TEST_PLAN.md).

### 4. AI Recording Persistence — FIXED

~~Audio recording can be lost when navigating away during a visit.~~ Recording state is now lifted to a layout-level React Context (`RecordingProvider`). The `MediaRecorder`, audio chunks, blob, and upload/processing all persist across page navigation. A floating `PersistentRecorderBar` shows recording status when the user navigates away from the visit page. A `beforeunload` guard warns before closing the browser tab.

### 5. ~~Missing user_preferences Table~~ — FIXED

~~Required for Phase 11.4 (PDF printing preferences). No migration created yet.~~ Migration `00032_user_preferences.sql` created with `user_preferences` table. Settings page at `/dashboard/settings` allows clinicians to configure PDF photo preferences (include/exclude, size, max per assessment, page size). Preferences wire into `getWoundDataForPDF()` and the `WoundProgressPDF` component.

### 6. ~~Missing Admin Transcript Page~~ — FIXED

`/dashboard/admin/transcripts` now exists with full management UI, stats dashboard, audio playback, and batch retention cleanup.

---

## Blockers & Client Action Items

| #   | Item                                                 | Owner  | Status     |
| --- | ---------------------------------------------------- | ------ | ---------- |
| 1   | AI demo scheduling for Dr. May and clinicians        | Client | Pending    |
| 2   | Production OpenAI API key (needed before AI go-live) | Client | Pending    |
| 3   | Weekly Monday check-ins (30 min, scope control)      | Alana  | Scheduling |

---

## Architecture Reference

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for:

- Complete database schema (31 tables)
- Frontend route structure (43 pages)
- Component organization (143 files)
- Server action inventory (26 files, ~183 functions)
- Security model (RBAC + credentials + RLS)
- Technology stack details

See [archive/PHASE_HISTORY.md](./archive/PHASE_HISTORY.md) for Phase 9–10 completion history.
See [archive/AI_DOCUMENTATION_USER_GUIDE.md](./archive/AI_DOCUMENTATION_USER_GUIDE.md) for AI feature user guide.
See [archive/AI_DOCUMENTATION_TEST_PLAN.md](./archive/AI_DOCUMENTATION_TEST_PLAN.md) for AI test scenarios.
