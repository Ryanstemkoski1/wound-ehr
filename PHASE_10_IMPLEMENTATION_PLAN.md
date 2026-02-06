# Phase 10: Production Deployment & Client Requirements

> **Version:** 1.0  
> **Date:** February 6, 2026  
> **Status:** 🔄 IN PROGRESS  
> **Client Meeting:** January 2026 - Feedback Incorporated

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Client Meeting Summary](#client-meeting-summary)
3. [Implementation Priorities](#implementation-priorities)
4. [Feature Requirements](#feature-requirements)
5. [Testing & Validation](#testing--validation)
6. [Deployment Checklist](#deployment-checklist)

---

## Overview

Phase 10 focuses on production deployment preparation with critical enhancements from client feedback. This phase includes **6 major feature areas** with **22 specific requirements**.

**Timeline:** 4-6 weeks  
**Priority:** HIGH - Blocking production launch

---

## Client Meeting Summary

**Date:** January 2026  
**Attendees:** Dr. May, Yesenia, Alana, Kaylee, Erin, Ryan (dev team)

### Key Pain Points Identified

1. **Calendar not usable** - All clinicians see everyone's schedule (confusing)
2. **No quality control workflow** - Notes go out before office review
3. **Facilities get too much detail** - Need abbreviated clinical output
4. **Missing reporting capabilities** - Can't pull notes by clinician/date/facility
5. **Access control too broad** - Clinicians can edit insurance (shouldn't)
6. **No error prevention** - Wrong locations, invalid treatments slip through

### Client Priorities (Ordered)

| Priority | Feature                      | Impact | Estimated Effort |
| -------- | ---------------------------- | ------ | ---------------- |
| 1        | Note approval workflow       | HIGH   | 7-10 days        |
| 2        | Calendar clinician filtering | HIGH   | 5-7 days         |
| 3        | Abbreviated clinical output  | HIGH   | 3-5 days         |
| 4        | Reporting by criteria        | MEDIUM | 5-7 days         |
| 5        | Access control refinement    | MEDIUM | 3-5 days         |
| 6        | Validation rules             | MEDIUM | 5-7 days         |

**Total Estimated:** 28-41 days (4-6 weeks)

---

## Implementation Priorities

### Phase 10.1: Critical Workflow (Weeks 1-2)

**Goal:** Enable office to control note release

#### 10.1.1: Note Approval Workflow ✨ **HIGHEST PRIORITY**

**Problem:** Notes go directly to facilities with potential errors before office review.

**Solution:** Multi-stage approval system

**Requirements:**

1. **New Visit Statuses:**
   - `draft` - Clinician working on note
   - `sent_to_office` - Clinician finished, awaiting approval (NEW)
   - `needs_correction` - Office flagged issues (NEW)
   - `being_corrected` - Clinician addressing feedback (NEW)
   - `approved` - Office approved, locked from editing (NEW)
   - `signed` - Provider signature applied
   - `submitted` - Final state, sent to billing

2. **Office Admin Inbox:**
   - `/dashboard/admin/inbox` page
   - Shows all notes with status `sent_to_office`
   - Table columns:
     - Patient name (link to patient page)
     - Visit date
     - Clinician name + credentials
     - Wounds assessed (count)
     - Date sent
     - Actions: Approve, Request Correction, View
   - Sort by: Date sent (oldest first), Patient, Clinician
   - Filter by: Clinician, Facility, Date range
   - Batch approve (select multiple, approve all)

3. **Request Correction Flow:**
   - Office admin clicks "Request Correction"
   - Modal opens: "What needs to be corrected?"
   - Text area for correction notes (required)
   - Click "Send Back to Clinician"
   - Visit status → `needs_correction`
   - Correction notes stored in `visits.correction_notes` (new JSONB field)
   - Email notification to clinician (optional)

4. **Clinician Correction View:**
   - Dashboard shows banner: "You have X notes needing correction"
   - Click banner → List of flagged visits
   - Each visit shows correction notes from office
   - "Mark as Corrected" button
   - Status → `being_corrected` → `sent_to_office` (back to inbox)

5. **Approval Flow:**
   - Office admin clicks "Approve"
   - Confirmation: "Lock this note? No further edits allowed except addendums."
   - Visit status → `approved`
   - `approved_at` timestamp set
   - `approved_by` user ID set
   - Note becomes read-only (except addendums)

6. **Addendum Notification:**
   - When clinician adds addendum to approved note:
   - Create entry in `addendum_notifications` table (new)
   - Office inbox shows "Addendum Added" badge
   - Click to review addendum
   - Approve addendum (required before it's visible to facilities)

7. **Void/Delete Note:**
   - Office admin can void notes with wrong patient/data
   - "Void Note" button (destructive action, requires confirmation)
   - Modal: "Reason for voiding?" (required, audit trail)
   - Visit status → `voided`
   - Note marked with strikethrough in lists
   - Cannot be edited or restored (only viewable for audit)

**Database Changes:**

```sql
-- Migration 00025: Note approval workflow
ALTER TABLE visits ADD COLUMN IF NOT EXISTS correction_notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Update status enum
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE visits ADD CONSTRAINT visits_status_check
CHECK (status IN (
  'draft',
  'sent_to_office',
  'needs_correction',
  'being_corrected',
  'approved',
  'ready_for_signature',
  'signed',
  'submitted',
  'voided',
  'scheduled',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
  'incomplete',
  'complete'
));

-- Addendum notifications table
CREATE TABLE addendum_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  addendum_id UUID NOT NULL REFERENCES wound_notes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addendum_notifications_visit ON addendum_notifications(visit_id);
CREATE INDEX idx_addendum_notifications_reviewed ON addendum_notifications(reviewed);
```

**Server Actions:**

```typescript
// app/actions/approval-workflow.ts
export async function sendNoteToOffice(visitId: string);
export async function requestCorrection(visitId: string, notes: string);
export async function markAsCorrected(visitId: string);
export async function approveNote(visitId: string);
export async function voidNote(visitId: string, reason: string);
export async function getInboxNotes(filters?: InboxFilters);
export async function getCorrectionsForClinician(userId: string);
export async function notifyAddendum(visitId: string, addendumId: string);
export async function acknowledgeAddendum(notificationId: string);
```

**UI Components:**

- `components/admin/office-inbox.tsx` - Main inbox table
- `components/admin/correction-request-dialog.tsx` - Request correction modal
- `components/admin/void-note-dialog.tsx` - Void note modal
- `components/visits/correction-banner.tsx` - Clinician notification banner
- `components/visits/corrections-needed-list.tsx` - List of flagged visits

**Success Criteria:**

- ✅ Office admin can approve/reject notes
- ✅ Clinicians get notified of corrections needed
- ✅ Approved notes are read-only (except addendums)
- ✅ Void notes are clearly marked with audit trail
- ✅ Addendum notifications appear in inbox

---

#### 10.1.2: Abbreviated Clinical Output ✨ **HIGH PRIORITY**

**Problem:** Facilities receive full medical-legal notes before final review, causing version confusion.

**Solution:** Generate abbreviated clinical summary for immediate facility use.

**Requirements:**

1. **Two PDF Versions:**
   - **Clinical Summary (Abbreviated):** Available immediately after clinician submits
   - **Complete Visit Note (Full):** Available only after office approval

2. **Clinical Summary Contents:**
   - Patient demographics (name, DOB, MRN, facility)
   - Visit date and clinician
   - **Per wound:**
     - Location and type (e.g., "Left Heel - Pressure Injury Stage 3")
     - Procedure performed: "Sharp debridement performed" (no details on depth)
     - Current measurements: Length × Width × Depth (latest only)
     - Treatment orders: "Apply hydrogel to wound bed, cover with foam dressing, change every 3 days"
   - Follow-up plan (appointment date or discharge)
   - Provider signature (name + credentials only)

3. **Exclude from Clinical Summary:**
   - Detailed assessment notes
   - Full tissue composition percentages
   - Infection signs details
   - Risk factors
   - Exudate details beyond basic amount
   - Pain levels
   - Billing codes
   - Time spent documentation

4. **Template Implementation:**
   - Await templates from Erin (G-tube and wound versions)
   - Create `components/pdf/clinical-summary-pdf.tsx`
   - Use React PDF renderer
   - Single-page format (1-2 pages max)
   - Professional styling with Wound EHR branding

5. **Access Control:**
   - Clinical Summary: Available to facilities immediately
   - Complete Note: Available only after `approved` status
   - Download buttons show different labels:
     - "Download Clinical Orders" (abbreviated)
     - "Download Complete Note" (full, only if approved)

**Server Actions:**

```typescript
// app/actions/pdf.ts (update existing)
export async function generateClinicalSummary(visitId: string);
export async function generateCompleteNote(visitId: string); // existing, but add approval check
```

**UI Components:**

- `components/pdf/clinical-summary-pdf.tsx` - New abbreviated template
- Update `visit-card.tsx` to show both download options
- Update `patient-documents-tab.tsx` to store both versions

**Templates Needed from Client:**

- ✅ **Action Item:** Email Erin for G-tube clinical summary template
- ✅ **Action Item:** Email Erin for wound care clinical summary template

**Success Criteria:**

- ✅ Clinical summary generates immediately (before approval)
- ✅ Contains only essential treatment info
- ✅ Complete note only available after approval
- ✅ Both versions downloadable from patient page

---

### Phase 10.2: Calendar & Scheduling (Week 3)

**Goal:** Make calendar usable for multi-clinician practice

#### 10.2.1: Clinician-Specific Calendar Views

**Problem:** All clinicians see everyone's schedules (confusing, error-prone).

**Solution:** Filter calendar by assigned clinician.

**Requirements:**

1. **Patient-Clinician Assignment:**
   - New table: `patient_clinicians`
   - Fields:
     - `patient_id` (UUID, FK to patients)
     - `user_id` (UUID, FK to auth.users)
     - `role` (ENUM: 'primary', 'supervisor', 'covering')
     - `is_active` (BOOLEAN)
     - `assigned_at` (TIMESTAMPTZ)
     - `assigned_by` (UUID, FK to auth.users)
   - One patient can have multiple clinicians
   - One clinician is marked as `primary`

2. **Assignment UI:**
   - On patient detail page: "Assigned Clinicians" section
   - Show list with badges: "Dr. Smith (Primary)", "Nurse Jones (Covering)"
   - "Assign Clinician" button (admin only)
   - Modal with user dropdown (filtered by clinical credentials: RN, LVN, MD, DO, PA, NP)
   - Select role (primary/supervisor/covering)
   - Save assignment

3. **Calendar Filtering:**
   - Top of calendar: "View: [Dropdown]"
   - Options:
     - "My Patients" (default for clinicians)
     - "All Patients" (admin only)
     - "Dr. Smith's Patients"
     - "Nurse Jones' Patients"
   - Filter visits by `patient_clinicians.user_id`
   - Show clinician name in event: "Jane Doe - Dr. Smith"

4. **Visit Assignment:**
   - When creating visit: "Primary Clinician" dropdown
   - Auto-defaults to patient's primary clinician
   - Can select any assigned clinician
   - Store in `visits.clinician_id` (new field)

5. **Access Control:**
   - Clinicians see ONLY their assigned patients in:
     - Patient list
     - Calendar
     - Reports
   - Admins see all patients
   - Supervisors see their assigned patients + supervisees

**Database Changes:**

```sql
-- Migration 00026: Patient-clinician assignments
CREATE TABLE patient_clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'supervisor', 'covering')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(patient_id, user_id)
);

CREATE INDEX idx_patient_clinicians_patient ON patient_clinicians(patient_id);
CREATE INDEX idx_patient_clinicians_user ON patient_clinicians(user_id);

ALTER TABLE visits ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES auth.users(id);
```

**Server Actions:**

```typescript
// app/actions/patient-clinicians.ts (new file)
export async function assignClinician(
  patientId: string,
  userId: string,
  role: string
);
export async function removeClinician(patientId: string, userId: string);
export async function getPatientClinicians(patientId: string);
export async function getClinicianPatients(userId: string);
export async function updateClinicianRole(
  patientId: string,
  userId: string,
  newRole: string
);
```

**UI Components:**

- `components/patients/clinician-assignment.tsx` - Assignment UI on patient page
- `components/calendar/calendar-clinician-filter.tsx` - Dropdown filter
- Update `calendar-view.tsx` to filter by clinician

**Success Criteria:**

- ✅ Each patient has assigned clinicians
- ✅ Clinicians see only their assigned patients
- ✅ Calendar filters by clinician
- ✅ Admins see all patients
- ✅ Supervisors see correct subset

---

#### 10.2.2: Reporting by Criteria

**Problem:** Cannot pull notes by clinician, date, or facility for medical records requests.

**Solution:** Advanced reporting with multiple filter criteria.

**Requirements:**

1. **New Reports Page:**
   - `/dashboard/reports` (update existing)
   - Three report types:
     - **Visit Log:** All visits with filters
     - **Clinician Activity:** Visits per clinician
     - **Facility Summary:** Visits per facility

2. **Visit Log Report:**
   - Filters:
     - Date range (start/end dates, required)
     - Clinician (dropdown, multi-select)
     - Facility (dropdown, multi-select)
     - Patient (search autocomplete)
     - Visit status (checkboxes: approved, signed, submitted)
   - Results table:
     - Visit date
     - Patient name
     - Clinician
     - Facility
     - Status badge
     - Actions: View, Download PDF
   - Export to CSV button
   - Pagination (50 per page)

3. **Clinician Activity Report:**
   - Select: Clinician (dropdown), Date range
   - Shows:
     - Total visits
     - By facility breakdown
     - By status breakdown
     - Charts: Visits per week, Wounds assessed
   - Export to CSV/PDF

4. **Facility Summary Report:**
   - Select: Facility (dropdown), Date range
   - Shows:
     - Total patients seen
     - Total visits
     - By clinician breakdown
     - Average wounds per visit
   - Export to CSV/PDF

5. **Medical Records Request:**
   - Special filter: "Single patient, date range"
   - Select patient → Select date range
   - Shows all visits in chronological order
   - "Download All PDFs (ZIP)" button
   - Generate combined PDF with all visits

**Server Actions:**

```typescript
// app/actions/reports.ts (update existing)
export async function getVisitLog(filters: VisitLogFilters);
export async function getClinicianActivity(
  clinicianId: string,
  startDate: string,
  endDate: string
);
export async function getFacilitySummary(
  facilityId: string,
  startDate: string,
  endDate: string
);
export async function getPatientRecords(
  patientId: string,
  startDate: string,
  endDate: string
);
export async function generateCombinedPDF(visitIds: string[]);
```

**UI Components:**

- `components/reports/visit-log-report.tsx` - Main report table
- `components/reports/clinician-activity-report.tsx` - Clinician stats
- `components/reports/facility-summary-report.tsx` - Facility stats
- `components/reports/medical-records-request.tsx` - Patient-specific export

**Success Criteria:**

- ✅ Can filter visits by clinician
- ✅ Can filter visits by date range
- ✅ Can filter visits by facility
- ✅ Can pull all records for one patient
- ✅ CSV and PDF exports work
- ✅ Medical records ZIP download works

---

### Phase 10.3: Access Control & Validation (Week 4)

**Goal:** Prevent errors and restrict unnecessary access

#### 10.3.1: Role-Based Field Access

**Problem:** Clinicians can edit insurance and demographics (shouldn't).

**Solution:** Field-level permissions based on role.

**Requirements:**

1. **Access Matrix:**

| Field Group                   | Admin | Clinician       |
| ----------------------------- | ----- | --------------- |
| Demographics (name, DOB, MRN) | Edit  | View only       |
| Insurance info                | Edit  | View only       |
| Emergency contact             | Edit  | View only       |
| Medical history               | Edit  | Edit (can add)  |
| Allergies                     | Edit  | Edit (can add)  |
| Wounds                        | Edit  | Edit (can add)  |
| Visits                        | Edit  | Edit (own only) |
| Documents                     | Edit  | View only       |

2. **Implementation:**
   - Update `patient-form.tsx`:
     - Check user role via `getUserRole()`
     - If clinician: Make insurance/demographics read-only
     - Show "Contact admin to update" tooltip
   - Update `visit-form.tsx`:
     - Clinicians can only edit their own visits
     - Cannot edit visit if assigned to different clinician
   - Update `document-upload.tsx`:
     - Only admins can upload insurance cards, face sheets

3. **Visual Indicators:**
   - Read-only fields: Gray background, lock icon
   - Disabled buttons: Tooltip explaining why
   - Section headers: "(Admin Only)" badge

**Server Actions:**

```typescript
// Update existing actions with role checks
// In patients.ts, visits.ts, etc.
// Add checks: if (isAdmin) { ... } else { throw new Error("Unauthorized") }
```

**Success Criteria:**

- ✅ Clinicians cannot edit demographics
- ✅ Clinicians cannot edit insurance
- ✅ Clinicians can only edit their assigned visits
- ✅ Visual indicators show locked fields

---

#### 10.3.2: Data Validation Rules

**Problem:** Invalid data slips through (e.g., alginate for dry wounds, tissue > 100%).

**Solution:** Real-time validation with helpful error messages.

**Requirements:**

1. **Treatment Validation:**
   - **Rule 1:** Alginate requires moderate/large exudate
     - If exudate = "none" or "scant":
     - Disable alginate checkbox
     - Show tooltip: "Alginate requires moderate to large exudate"
   - **Rule 2:** Hydrocolloid requires minimal/moderate exudate
     - If exudate = "large":
     - Show warning: "Hydrocolloid may not manage heavy drainage"
   - **Rule 3:** Foam requires at least scant exudate
     - If exudate = "none":
     - Disable foam options

2. **Tissue Composition Validation:**
   - Calculate total: epithelial% + granulation% + slough% + necrotic% + eschar%
   - If total !== 100:
     - Show error below sliders: "Total must equal 100% (currently: X%)"
     - Disable "Save" button
     - Highlight in red
   - Live calculation as user adjusts sliders

3. **Measurement Validation:**
   - Length, width, depth must be > 0
   - Area auto-calculates: length × width
   - If depth > width or depth > length:
     - Show warning: "Depth usually less than width/length. Verify measurements."

4. **Location Validation:**
   - Add "Confirm location" checkbox:
     - "I confirm this wound is on the [LEFT/RIGHT] [LOCATION]"
     - Required before saving first assessment
   - On subsequent visits:
     - Auto-populate from previous
     - Show "Previous: Right Heel" reminder

5. **Pressure Stage Validation:**
   - If wound_type = "pressure_injury":
     - Pressure stage required
   - If wound_type !== "pressure_injury":
     - Hide pressure stage field

**Implementation:**

```typescript
// lib/validations/treatment.ts (new file)
export function validateTreatmentSelection(
  exudateAmount: string,
  selectedTreatments: string[]
): ValidationResult;
export function validateTissueComposition(
  percentages: TissuePercentages
): ValidationResult;
export function validateMeasurements(
  length: number,
  width: number,
  depth: number
): ValidationResult;

// In assessment-form.tsx:
// Add real-time validation
// Disable invalid options
// Show inline error messages
```

**UI Components:**

- Update `assessment-form.tsx` with validation logic
- Update `treatment-plan-form.tsx` with treatment rules
- Create `components/assessments/validation-errors.tsx` for error display

**Success Criteria:**

- ✅ Cannot select alginate for dry wounds
- ✅ Tissue composition must equal 100%
- ✅ Location confirmed on first assessment
- ✅ Helpful error messages guide clinicians
- ✅ Invalid states prevent form submission

---

### Phase 10.4: Polish & Deployment (Week 5-6)

**Goal:** Final testing, bug fixes, and production deployment

#### 10.4.1: Comprehensive Testing

See **Testing & Validation** section below for complete checklist.

#### 10.4.2: Performance Optimization

1. Database query optimization
2. Image lazy loading
3. PDF generation caching
4. Calendar event rendering optimization

#### 10.4.3: Documentation

1. User manual (office admin workflow)
2. Clinician quick start guide
3. API documentation (for Practice Fusion integration)
4. System admin guide

#### 10.4.4: Production Deployment

1. Environment setup (production Supabase)
2. Data migration (if any existing data)
3. User onboarding
4. Training sessions
5. Go-live support

---

## Testing & Validation

### Test Plan

#### Test 1: Note Approval Workflow

**Setup:**

1. Create test clinician user (RN credentials)
2. Create test office admin user

**Test Cases:**

| #   | Test Case                                        | Expected Result                                          |
| --- | ------------------------------------------------ | -------------------------------------------------------- |
| 1.1 | Clinician creates visit, clicks "Send to Office" | Status → `sent_to_office`, appears in office inbox       |
| 1.2 | Office admin clicks "Request Correction"         | Status → `needs_correction`, clinician sees banner       |
| 1.3 | Clinician marks as corrected                     | Status → `sent_to_office`, back in inbox                 |
| 1.4 | Office admin approves note                       | Status → `approved`, note locked, approved timestamp set |
| 1.5 | Clinician tries to edit approved note            | Error: "Cannot edit approved note"                       |
| 1.6 | Clinician adds addendum to approved note         | Addendum created, notification in office inbox           |
| 1.7 | Office admin voids note with wrong patient       | Status → `voided`, note strikethrough, reason saved      |
| 1.8 | Try to approve voided note                       | Error: "Cannot approve voided note"                      |

**Pass Criteria:** All 8 test cases pass

---

#### Test 2: Clinical Summary PDF

**Setup:**

1. Create test visit with 2 wounds
2. Complete assessments with full details
3. Add multiple treatments

**Test Cases:**

| #   | Test Case                                    | Expected Result                                                |
| --- | -------------------------------------------- | -------------------------------------------------------------- |
| 2.1 | Generate clinical summary (unapproved visit) | PDF downloads, contains only essential info                    |
| 2.2 | Verify abbreviated content                   | No detailed assessment notes, no billing codes                 |
| 2.3 | Verify wound info in summary                 | Location, procedure (no depth), measurements, treatment orders |
| 2.4 | Try to download complete note (unapproved)   | Button disabled or shows "Awaiting approval"                   |
| 2.5 | Approve note, download complete note         | Full PDF with all details                                      |
| 2.6 | Compare both PDFs                            | Abbreviated = 1-2 pages, Complete = 5+ pages                   |

**Pass Criteria:** All 6 test cases pass

---

#### Test 3: Calendar Clinician Filtering

**Setup:**

1. Create 3 clinician users (Dr. Smith, Nurse Jones, PA Brown)
2. Create 5 patients
3. Assign patients to different clinicians

**Test Cases:**

| #   | Test Case                                    | Expected Result                          |
| --- | -------------------------------------------- | ---------------------------------------- |
| 3.1 | Assign Patient A to Dr. Smith (primary)      | Assignment saved, shows on patient page  |
| 3.2 | Assign Patient A to Nurse Jones (supervisor) | Both clinicians assigned                 |
| 3.3 | Create visit for Patient A, select Dr. Smith | Visit assigned to Dr. Smith              |
| 3.4 | Dr. Smith views calendar (My Patients)       | Sees only Patient A visit                |
| 3.5 | Nurse Jones views calendar (My Patients)     | Sees Patient A visit (supervisor access) |
| 3.6 | PA Brown views calendar (My Patients)        | Does NOT see Patient A visit             |
| 3.7 | Admin views calendar (All Patients)          | Sees all visits                          |
| 3.8 | Filter calendar by "Dr. Smith's Patients"    | Shows only Dr. Smith's assigned patients |

**Pass Criteria:** All 8 test cases pass

---

#### Test 4: Reporting System

**Setup:**

1. Create 10 test visits across 3 facilities, 2 clinicians, 5 patients
2. Date range: Past 30 days

**Test Cases:**

| #   | Test Case                                      | Expected Result                               |
| --- | ---------------------------------------------- | --------------------------------------------- |
| 4.1 | Run visit log (all, past 30 days)              | Shows all 10 visits                           |
| 4.2 | Filter by Dr. Smith only                       | Shows only Dr. Smith's visits                 |
| 4.3 | Filter by Facility A only                      | Shows only Facility A visits                  |
| 4.4 | Filter by date range (past 7 days)             | Shows only recent visits                      |
| 4.5 | Export to CSV                                  | CSV file downloads with correct data          |
| 4.6 | Run clinician activity report (Dr. Smith)      | Shows visit count, facility breakdown, charts |
| 4.7 | Run facility summary (Facility A)              | Shows patient count, clinician breakdown      |
| 4.8 | Medical records request (Patient 1, all dates) | Shows all Patient 1 visits                    |
| 4.9 | Download combined ZIP                          | ZIP file contains all PDFs for Patient 1      |

**Pass Criteria:** All 9 test cases pass

---

#### Test 5: Access Control

**Setup:**

1. Create test clinician (no admin privileges)
2. Create test admin

**Test Cases:**

| #   | Test Case                                         | Expected Result                                 |
| --- | ------------------------------------------------- | ----------------------------------------------- |
| 5.1 | Clinician tries to edit patient insurance         | Fields read-only, lock icon shown               |
| 5.2 | Clinician tries to edit patient demographics      | Fields read-only, tooltip shown                 |
| 5.3 | Clinician tries to edit another clinician's visit | Error: "You can only edit your assigned visits" |
| 5.4 | Admin edits any patient insurance                 | Success, changes saved                          |
| 5.5 | Admin edits any clinician's visit                 | Success, changes saved                          |
| 5.6 | Clinician tries to upload insurance document      | Upload button disabled                          |
| 5.7 | Admin uploads insurance document                  | Success, document saved                         |

**Pass Criteria:** All 7 test cases pass

---

#### Test 6: Data Validation

**Setup:**

1. Create new visit
2. Start wound assessment

**Test Cases:**

| #   | Test Case                                       | Expected Result                                |
| --- | ----------------------------------------------- | ---------------------------------------------- |
| 6.1 | Set exudate = "none", select alginate           | Alginate disabled, tooltip shown               |
| 6.2 | Set exudate = "moderate", select alginate       | Alginate enabled, selectable                   |
| 6.3 | Set tissue composition = 60% + 30% = 90%        | Error: "Must equal 100%", Save disabled        |
| 6.4 | Adjust to 70% + 30% = 100%                      | Error cleared, Save enabled                    |
| 6.5 | Enter measurements: depth > width               | Warning shown: "Depth usually less than width" |
| 6.6 | Wound type = pressure injury, no stage selected | Error: "Stage required for pressure injuries"  |
| 6.7 | Wound type = diabetic, stage field              | Stage field hidden                             |
| 6.8 | First assessment, no location confirmation      | Error: "Confirm wound location before saving"  |

**Pass Criteria:** All 8 test cases pass

---

### Performance Testing

**Load Test Scenarios:**

1. **Concurrent Users:** 50 users simultaneously accessing dashboard
2. **Large Patient Load:** 1,000 patients, 10,000 visits, 50,000 assessments
3. **Calendar Rendering:** 500 appointments in month view
4. **PDF Generation:** Batch generate 100 PDFs
5. **Report Export:** CSV export of 5,000 visit records

**Performance Targets:**

- Page load: < 2 seconds
- Form submission: < 1 second
- PDF generation: < 5 seconds
- CSV export: < 10 seconds
- Calendar render: < 3 seconds

---

## Deployment Checklist

### Pre-Deployment

- [ ] All Phase 10 features implemented
- [ ] All test cases pass (42 total)
- [ ] Performance testing complete
- [ ] Security audit complete
- [ ] Database migration scripts tested
- [ ] Backup strategy documented
- [ ] Rollback plan prepared

### Production Environment Setup

- [ ] Create production Supabase project
- [ ] Configure environment variables
- [ ] Set up Resend email service
- [ ] Configure DNS and SSL
- [ ] Set up monitoring (Sentry/LogRocket)
- [ ] Configure database backups (daily)

### Data Migration

- [ ] Export existing data (if any)
- [ ] Run migration scripts
- [ ] Verify data integrity
- [ ] Test with production data

### User Onboarding

- [ ] Create admin accounts
- [ ] Create clinician accounts
- [ ] Import facilities
- [ ] Import patients (if applicable)
- [ ] Assign clinicians to patients

### Training

- [ ] Office admin training session (2 hours)
- [ ] Clinician training session (1 hour each)
- [ ] Video tutorials recorded
- [ ] User manual distributed
- [ ] Q&A session

### Go-Live

- [ ] Staged rollout (1 facility first)
- [ ] Monitor for issues (48 hours)
- [ ] Full rollout to all facilities
- [ ] 24/7 support for first week
- [ ] Feedback collection

### Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Address critical bugs (within 24 hours)
- [ ] Plan Phase 11 enhancements

---

## Future Enhancements (Phase 11+)

### Practice Fusion API Integration

**Research Required:**

- Practice Fusion API documentation review
- Authentication mechanism (OAuth 2.0?)
- Available endpoints (patients, visits, documents)
- Rate limits and quotas
- Field mapping between systems

**Scope:**

- Auto-sync attachments (face sheets, labs, radiology)
- Bi-directional patient updates
- Visit data push to Practice Fusion
- Document attachment sync

**Estimated Effort:** 3-4 weeks (after research)

### Additional Features

1. **Bulk Photo Upload** - Drag-and-drop multiple files
2. **Document Versioning** - Track changes to patient documents
3. **Mobile App** - React Native for iOS/Android
4. **AI-Powered Validation** - Detect inconsistencies in notes
5. **Voice-to-Text** - Dictation for wound assessments

---

## Success Criteria

Phase 10 is complete when:

✅ **Functional Requirements:**

- [ ] Office can approve/reject all notes
- [ ] Clinicians see only their assigned patients
- [ ] Calendar filters by clinician
- [ ] Reports generate by clinician/date/facility
- [ ] Clinical summaries generate for facilities
- [ ] Data validation prevents errors
- [ ] Access control enforced by role

✅ **Quality Requirements:**

- [ ] All 42 test cases pass
- [ ] Zero critical bugs
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] User acceptance testing complete

✅ **Deployment Requirements:**

- [ ] Production environment configured
- [ ] Users trained and onboarded
- [ ] Documentation complete
- [ ] Support plan in place

---

## Timeline Summary

| Week | Phase    | Deliverables                                                  |
| ---- | -------- | ------------------------------------------------------------- |
| 1    | 10.1.1   | Note approval workflow (inbox, corrections, approval)         |
| 2    | 10.1.2   | Abbreviated clinical output (PDF templates)                   |
| 3    | 10.2     | Calendar filtering + Patient-clinician assignment + Reporting |
| 4    | 10.3     | Access control + Data validation rules                        |
| 5    | 10.4.1   | Comprehensive testing (all test cases)                        |
| 6    | 10.4.2-4 | Performance optimization + Documentation + Deployment         |

**Total:** 6 weeks (February 6 - March 20, 2026)

---

**Next Steps:**

1. Review and approve implementation plan
2. Request clinical summary templates from Erin
3. Begin Phase 10.1.1 development
4. Schedule weekly client check-ins

**Document Version:** 1.0  
**Last Updated:** February 6, 2026
