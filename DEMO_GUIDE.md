# Phase 10 Demo Guide (Quick Reference)

**Date:** February 16, 2026 | **Status:** 5 of 6 Complete

---

## Status at a Glance

| Feature                 | Status                      | Where to Find               |
| ----------------------- | --------------------------- | --------------------------- |
| 1. Note Approval        | ✅ Ready                    | Admin → Office Inbox        |
| 2. Clinical Summaries   | ⏳ Need templates from Erin | -                           |
| 3. Calendar Filtering   | ✅ Ready                    | Calendar → "View:" dropdown |
| 4. Reports              | ✅ Ready                    | Reports page                |
| 5. Field Access Control | ✅ Ready                    | Try editing as RN vs MD     |
| 6. Validation Rules     | ✅ Ready                    | Any wound assessment form   |

---

## Feature 1: Note Approval Workflow

**Demo Path:**

1. Admin → Office Inbox (see notes waiting for approval)
2. Click "Approve" or "Request Correction" on any note
3. If requesting correction: Add notes → Send back
4. Log in as clinician → See correction banner → Fix → Re-submit

**Key Points:**

- Office controls when notes are released
- Correction feedback goes directly to clinician
- Approved notes become locked (read-only)

---

## Feature 2: Clinical Summaries

**Status:** ⏳ **Blocked - Need Templates from Erin**

**What's Needed:**

- G-tube clinical summary template
- Wound care clinical summary template

**Once received:** 2-3 days to implement

**Demo Plan (after templates):**

- Two download buttons per visit:
  - "Clinical Orders" (brief, for facilities)
  - "Complete Note" (full, after approval only)

---

## Feature 3: Calendar Filtering

**Demo Path:**

1. Patients → Pick patient → "Assigned Clinicians" section
2. Click "Assign Clinician" → Select clinician + role → Save
3. Calendar → "View:" dropdown → Select "My Patients"
4. Calendar shows only that clinician's visits

**Key Points:**

- Each clinician sees ONLY their assigned patients
- Admins see everyone
- Filter persists when navigating

---

## Feature 4: Reporting

**Demo Path:**

1. Reports → "Visit Log" tab
2. Set filters: Date range + Clinician + Facility
3. Generate Report → Export to CSV

**Example Use Cases:**

- Medical records request: Filter by patient + date range → Bulk download PDFs
- Clinician productivity: "Clinician Activity" tab → See visit counts/charts
- Facility billing: "Facility Summary" tab → See all visits by facility

---

## Feature 5: Field Access Control

**Demo Path:**

1. Log in as RN → Edit patient → Insurance fields are read-only ✅
2. Log in as MD → Edit patient → All fields editable ✅
3. Hover over locked field → Tooltip explains why

**What's Restricted for RN/LVN:**

- Insurance information
- Medical record numbers
- Billing codes
- Time spent documentation

---

## Feature 6: Validation Rules

**Demo Path:**

1. Create wound assessment
2. Tissue Composition: Enter 60% + 30% + 5% = 95%
   - See red error: "Must total 100%"
   - Submit button disabled
3. Measurements: Enter depth > width
   - See yellow warning (can still submit)
4. First assessment: Must check location confirmation

**What's Validated:**

- Tissue percentages = 100% (blocking)
- Measurement logic (warning only)
- Location confirmation (blocking)
- Pressure stage for pressure injuries (conditional)

---

## Performance Improvements ⚡

**What Users Will Notice:**

- Calendar loads 65% faster
- Patient search 85% faster
- PDF downloads nearly instant (if cached)
- Everything feels snappier

**No demo needed** - just mention it happened!

---

## What's Next

**Client Action Items:**

1. **Erin:** Send clinical summary templates → Unblocks Feature 2
2. **Dr. May:** Schedule training for office staff (Feb 20?)
3. **All:** Review these 5 completed features

**Development Tasks:**

1. Implement Feature 2 (2-3 days after templates)
2. User documentation (3-4 days)
3. Final testing (2-3 days)
4. Production deployment (2 days)

**Timeline:** ~2 weeks after receiving templates

---

## Quick Demo Script (30 minutes)

1. **Show Status** (2 min) - "5 of 6 done, one awaiting templates"
2. **Note Approval** (8 min) - Office inbox → Approve/reject workflow
3. **Calendar Filtering** (5 min) - Assign clinicians → Filter view
4. **Reporting** (7 min) - Run report with filters → Export CSV
5. **Field Access** (3 min) - RN vs MD permissions
6. **Validation Rules** (5 min) - Tissue composition + warnings

---

**Questions?** Contact dev team via Slack/email

**Last Updated:** February 16, 2026
