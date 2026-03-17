# Wound EHR — Project Status

**Last Updated:** March 17, 2026

---

## Phase Completion

| Phase      | Description                                                                     | Status          | Date         |
| ---------- | ------------------------------------------------------------------------------- | --------------- | ------------ |
| 1–8        | Core EHR (patients, wounds, visits, calendar, billing, photos, PDF)             | Complete        | Oct 2025     |
| 9.1        | Credentials-based role system                                                   | Complete        | Nov 2025     |
| 9.2        | Electronic signatures & audit trail                                             | Complete        | Nov 2025     |
| 9.3        | High-priority compliance (7 sub-phases)                                         | Complete        | Nov 2025     |
| 9.4        | Advanced features (documents, specialized assessments)                          | Complete        | Dec 2025     |
| 10         | Production features (approval workflow, reports, field permissions, validation) | Complete        | Feb 2026     |
| 11.1       | AI clinical note generation (Whisper + GPT-4)                                   | Complete        | Mar 9, 2026  |
| 11.6       | Treatment Order Builder (4-tab sentence builder)                                | Complete        | Mar 16, 2026 |
| 11.7       | Client Forms (debridement, consents, incident, not-seen)                        | Complete        | Mar 16, 2026 |
| **11.2.1** | **Facility access control (hide unapproved notes)**                             | **Not started** | —            |
| **11.3**   | **Mobile UI optimization**                                                      | **Not started** | —            |
| **11.4**   | **Printing & PDF enhancements**                                                 | **Not started** | —            |
| **11.5**   | **Final polish (search, notifications, admin tools)**                           | **Not started** | —            |

> Phase 11.2.2 (Clinical Summary PDFs) was dropped — client confirmed the implemented forms fulfill the requirement.

---

## Codebase Metrics

| Metric                   | Count                        |
| ------------------------ | ---------------------------- |
| Database tables          | 31                           |
| RLS policies             | 75+                          |
| RPC functions            | 20+                          |
| Database migrations      | 6                            |
| Route pages              | 41                           |
| API routes               | 1                            |
| Server action files      | 23 (~175 exported functions) |
| React components         | 134 (114 Client / 20 Server) |
| Library utility files    | 24                           |
| Custom hooks             | 3                            |
| Supabase Storage buckets | 5                            |

---

## What's Remaining

### Phase 11.2.1: Facility Access Control (~1 day)

**Priority: HIGH — data disclosure risk.** Facility users currently see clinician notes before office approval.

- Create `canViewVisitDetails(user, visit)` utility in `lib/rbac.ts`
- Update visit list UI — hide content for unapproved visits (show "Pending" badge)
- Update visit detail page — block access or mask content for facility users
- Block PDF downloads for unapproved visits

### Phase 11.3: Mobile UI Optimization (~1.5 weeks)

**11.3.1: Mobile Assessment Forms** (2 days)

- Touch-friendly controls (min 44×44px tap targets)
- Larger checkboxes/radio buttons, stack fields vertically
- Larger signature canvas (full-width), 16px font minimum

**11.3.2: Mobile Navigation & Layout** (2 days)

- Bottom navigation bar for screens < 768px
- Card-based patient list on mobile
- Day-view default for calendar on mobile
- Collapse sidebar to hamburger menu

**11.3.3: Offline Support & Performance** (2 days)

- Service worker for offline page caching
- Queue actions when offline, sync on reconnect
- Offline indicator banner
- Lazy load images, virtual scrolling

**11.3.4: Mobile Testing** (1 day)

- Device matrix: iPhone SE, iPhone 14, iPad Mini, iPad Pro, Android
- Portrait + landscape orientation testing

### Phase 11.4: Printing & PDF Enhancements (~1 week)

**11.4.1: Clinician Signature on PDFs** (2 days)

- Signature footer with clinician name, credentials, date/time on all PDFs

**11.4.2: Photo Printing Preferences** (2 days)

- New `user_preferences` table (migration needed)
- Settings page (`/dashboard/settings`) for PDF preferences
- Include/exclude photos, photo size, page size options

**11.4.3: Advanced PDF Features** (1 day, optional)

- Watermark option, batch PDF export (ZIP)

### Phase 11.5: Final Polish (~1 week)

**11.5.1: Auto-Save Visual Indicators** (1 day)

- Fixed-position save status indicator (Saving/Saved/Error)
- Ctrl+S / Cmd+S keyboard shortcut

**11.5.2: Global Search** (1 day)

- Cmd+K / Ctrl+K search modal across patients, visits, facilities

**11.5.3: In-app Notifications** (2 days)

- Bell icon with badge count
- Types: correction requested, note approved, AI note ready, new patient assigned

**11.5.4: Deferred AI Items** (1 day)

- Admin transcript management page
- Audio playback with waveform in review UI
- Batch audio retention cleanup (90-day policy)

---

## Known Issues

### 1. Facility Access Control — Data Disclosure Risk

Unapproved notes visible to facility users. Phase 11.2.1 will hide pending note content and block PDF downloads. **Highest-priority unblocked work item.**

### 2. Mobile Responsiveness

Desktop-first design. Some forms not optimized for tablet/mobile. Signature pad needs touch optimization. Addressed in Phase 11.3.

### 3. No Automated Test Coverage

Primarily manual testing. 40+ test scenarios documented in [phase-11/AI_DOCUMENTATION_TEST_PLAN.md](./phase-11/AI_DOCUMENTATION_TEST_PLAN.md).

### 4. AI Recording Persistence

Audio recording can be lost when navigating away during a visit. Needs recording state persisted across navigation. Fix planned for Phase 11.5.

### 5. Missing user_preferences Table

Required for Phase 11.4 (PDF printing preferences). No migration created yet.

### 6. Missing Admin Transcript Page

`/dashboard/admin/transcripts` does not exist yet. Deferred from Phase 11.1, planned for Phase 11.5.

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
- Frontend route structure (41 pages)
- Component organization (134 files)
- Server action inventory (23 files, ~175 functions)
- Security model (RBAC + credentials + RLS)
- Technology stack details

See [phase-11/PHASE_11_PLAN.md](./phase-11/PHASE_11_PLAN.md) for detailed Phase 11 implementation plan.
See [archive/PHASE_HISTORY.md](./archive/PHASE_HISTORY.md) for Phase 9–10 completion history.
