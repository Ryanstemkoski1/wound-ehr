# Phase 10: Testing & Validation Checklist

> **Version:** 1.0  
> **Date:** February 6, 2026  
> **Phase:** Production Deployment Testing  
> **Total Test Cases:** 42

---

## 📋 Testing Overview

This document provides a comprehensive checklist for validating all Phase 10 features before production deployment.

**Testing Strategy:**

- Manual testing for all workflows
- Automated testing for critical paths
- Performance testing with production-scale data
- Security audit and penetration testing
- User acceptance testing (UAT)

**Test Environment:**

- Development: `localhost:3000`
- Staging: `staging.wound-ehr.app` (to be set up)
- Production: `app.wound-ehr.com` (final deployment)

---

## Test Suite 1: Note Approval Workflow

**Feature:** Phase 10.1.1  
**Priority:** CRITICAL  
**Test Cases:** 8  
**Estimated Time:** 45 minutes

### Setup

1. ✅ Create test clinician user: `testclinician@wound-ehr.com` (RN credentials)
2. ✅ Create test office admin user: `testadmin@wound-ehr.com` (tenant_admin role)
3. ✅ Create test patient with 2 wounds
4. ✅ Ensure office inbox is empty

### Test Cases

| #       | Test Case                 | Steps                                                                                                                                    | Expected Result                                                                                                | Status | Notes |
| ------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| **1.1** | **Send note to office**   | 1. Login as clinician<br>2. Create visit with assessments<br>3. Click "Send to Office"                                                   | • Status → `sent_to_office`<br>• Note appears in office inbox<br>• Timestamp recorded                          | ⬜     |       |
| **1.2** | **Request correction**    | 1. Login as admin<br>2. Open office inbox<br>3. Click "Request Correction"<br>4. Enter notes: "Please verify left vs right"<br>5. Submit | • Status → `needs_correction`<br>• Correction notes saved<br>• Clinician sees banner                           | ⬜     |       |
| **1.3** | **Mark as corrected**     | 1. Login as clinician<br>2. View flagged visits<br>3. Read correction notes<br>4. Make edits<br>5. Click "Mark as Corrected"             | • Status → `being_corrected` → `sent_to_office`<br>• Back in office inbox                                      | ⬜     |       |
| **1.4** | **Approve note**          | 1. Login as admin<br>2. Open office inbox<br>3. Review note<br>4. Click "Approve"<br>5. Confirm lock                                     | • Status → `approved`<br>• `approved_at` timestamp set<br>• `approved_by` = admin user ID<br>• Note locked     | ⬜     |       |
| **1.5** | **Attempt edit approved** | 1. Login as clinician<br>2. Open approved visit<br>3. Try to edit assessment                                                             | • Error: "Cannot edit approved note"<br>• Edit button disabled<br>• Form fields read-only                      | ⬜     |       |
| **1.6** | **Add addendum**          | 1. Login as clinician<br>2. Open approved visit<br>3. Click "Add Addendum"<br>4. Enter note: "Labs returned: WBC 12.5"<br>5. Submit      | • Addendum created<br>• Notification in office inbox<br>• Badge: "Addendum Added"                              | ⬜     |       |
| **1.7** | **Void note**             | 1. Login as admin<br>2. Open office inbox<br>3. Click "Void Note"<br>4. Enter reason: "Documented on wrong patient"<br>5. Confirm        | • Status → `voided`<br>• `voided_at` timestamp set<br>• Note strikethrough in lists<br>• Reason saved in audit | ⬜     |       |
| **1.8** | **Prevent void approval** | 1. Login as admin<br>2. Try to approve voided note                                                                                       | • Error: "Cannot approve voided note"<br>• Approve button disabled                                             | ⬜     |       |

**Pass Criteria:** All 8 test cases must pass

---

## Test Suite 2: Clinical Summary PDF

**Feature:** Phase 10.1.2  
**Priority:** HIGH  
**Test Cases:** 6  
**Estimated Time:** 30 minutes

### Setup

1. ✅ Create test visit with 2 wounds (Left Heel Pressure Injury Stage 3, Right Foot Diabetic Ulcer)
2. ✅ Complete full assessments with detailed notes
3. ✅ Add multiple treatments per wound
4. ✅ Add billing codes

### Test Cases

| #       | Test Case                      | Steps                                                               | Expected Result                                                                                                                                                                                  | Status | Notes                  |
| ------- | ------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------- |
| **2.1** | **Generate clinical summary**  | 1. Open visit (unapproved)<br>2. Click "Download Clinical Summary"  | • PDF downloads<br>• Filename: `clinical-summary-[patient]-[date].pdf`<br>• Opens in viewer                                                                                                      | ⬜     |                        |
| **2.2** | **Verify abbreviated content** | 1. Review PDF contents<br>2. Check for exclusions                   | • NO detailed notes<br>• NO billing codes<br>• NO tissue percentages<br>• NO infection signs details<br>• NO pain levels                                                                         | ⬜     | Check against template |
| **2.3** | **Verify wound info**          | 1. Review each wound section                                        | • Location: "Left Heel"<br>• Type: "Pressure Injury Stage 3"<br>• Procedure: "Sharp debridement performed" (no depth)<br>• Measurements: "5.2 × 3.1 × 1.8 cm"<br>• Treatment: Full orders listed | ⬜     |                        |
| **2.4** | **Complete note disabled**     | 1. Try to download "Complete Visit Note"                            | • Button disabled OR<br>• Shows "Awaiting Approval" tooltip                                                                                                                                      | ⬜     |                        |
| **2.5** | **Approve and download full**  | 1. Admin approves note<br>2. Click "Download Complete Note"         | • Full PDF downloads<br>• Contains all details<br>• Billing codes included<br>• Assessment notes included                                                                                        | ⬜     |                        |
| **2.6** | **Compare PDFs**               | 1. Open both PDFs side-by-side<br>2. Compare page count and content | • Clinical Summary: 1-2 pages<br>• Complete Note: 5+ pages<br>• Summary = subset of Complete                                                                                                     | ⬜     |                        |

**Pass Criteria:** All 6 test cases must pass

---

## Test Suite 3: Calendar Clinician Filtering

**Feature:** Phase 10.2.1  
**Priority:** HIGH  
**Test Cases:** 8  
**Estimated Time:** 45 minutes

### Setup

1. ✅ Create 3 clinician users:
   - `drsmith@wound-ehr.com` (MD credentials)
   - `nursejones@wound-ehr.com` (RN credentials)
   - `pabrown@wound-ehr.com` (PA credentials)
2. ✅ Create 5 test patients (A, B, C, D, E)
3. ✅ Clear all existing patient-clinician assignments

### Test Cases

| #       | Test Case                      | Steps                                                                                                         | Expected Result                                                                                             | Status | Notes |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ | ----- |
| **3.1** | **Assign primary clinician**   | 1. Open Patient A detail<br>2. Click "Assign Clinician"<br>3. Select Dr. Smith<br>4. Role: Primary<br>5. Save | • Assignment saved<br>• Shows on patient page: "Dr. Smith (Primary)"<br>• Badge with credentials            | ⬜     |       |
| **3.2** | **Assign supervisor**          | 1. Patient A detail<br>2. Click "Assign Clinician"<br>3. Select Nurse Jones<br>4. Role: Supervisor<br>5. Save | • Both clinicians listed<br>• "Dr. Smith (Primary)"<br>• "Nurse Jones (Supervisor)"                         | ⬜     |       |
| **3.3** | **Create assigned visit**      | 1. Create visit for Patient A<br>2. Primary Clinician dropdown                                                | • Auto-defaults to Dr. Smith<br>• Can select Nurse Jones<br>• Visit saved with clinician_id                 | ⬜     |       |
| **3.4** | **Primary clinician calendar** | 1. Login as Dr. Smith<br>2. Open calendar<br>3. View: "My Patients"                                           | • Sees ONLY Patient A visit<br>• Does not see unassigned patients<br>• Event shows: "Patient A - Dr. Smith" | ⬜     |       |
| **3.5** | **Supervisor calendar**        | 1. Login as Nurse Jones<br>2. Open calendar<br>3. View: "My Patients"                                         | • Sees Patient A visit<br>• Has supervisor access<br>• Event visible                                        | ⬜     |       |
| **3.6** | **Unassigned clinician**       | 1. Login as PA Brown<br>2. Open calendar<br>3. View: "My Patients"                                            | • Does NOT see Patient A visit<br>• Calendar empty or shows only assigned patients                          | ⬜     |       |
| **3.7** | **Admin view all**             | 1. Login as admin<br>2. Open calendar<br>3. View: "All Patients"                                              | • Sees ALL visits<br>• All clinicians' appointments visible<br>• No filtering applied                       | ⬜     |       |
| **3.8** | **Filter by clinician**        | 1. Login as admin<br>2. Calendar dropdown: "Dr. Smith's Patients"<br>3. View                                  | • Shows ONLY Dr. Smith's assigned patients<br>• Other clinicians' patients hidden                           | ⬜     |       |

**Pass Criteria:** All 8 test cases must pass

---

## Test Suite 4: Reporting System

**Feature:** Phase 10.2.2  
**Priority:** MEDIUM  
**Test Cases:** 9  
**Estimated Time:** 60 minutes

### Setup

1. ✅ Create 10 test visits with the following distribution:
   - Dr. Smith: 4 visits (Facility A: 2, Facility B: 2)
   - Nurse Jones: 3 visits (Facility A: 3)
   - PA Brown: 3 visits (Facility B: 3)
2. ✅ Date range: Past 30 days (5 in last 7 days, 5 older)
3. ✅ 5 approved, 3 signed, 2 draft

### Test Cases

| #       | Test Case                     | Steps                                                                                                  | Expected Result                                                                                                              | Status | Notes                   |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| **4.1** | **Visit log - all visits**    | 1. Navigate to `/dashboard/reports`<br>2. Select: Past 30 days<br>3. No other filters<br>4. Run report | • Shows all 10 visits<br>• Table with correct columns<br>• Sorted by date (oldest first)                                     | ⬜     |                         |
| **4.2** | **Filter by clinician**       | 1. Filter: Dr. Smith only<br>2. Run report                                                             | • Shows ONLY Dr. Smith's 4 visits<br>• Other clinicians excluded                                                             | ⬜     |                         |
| **4.3** | **Filter by facility**        | 1. Clear filters<br>2. Filter: Facility A only<br>3. Run report                                        | • Shows 5 visits (Facility A only)<br>• Facility B visits excluded                                                           | ⬜     |                         |
| **4.4** | **Filter by date range**      | 1. Clear filters<br>2. Date range: Past 7 days<br>3. Run report                                        | • Shows 5 recent visits<br>• Older visits excluded                                                                           | ⬜     |                         |
| **4.5** | **Export to CSV**             | 1. With filters applied<br>2. Click "Export to CSV"                                                    | • CSV file downloads<br>• Correct filename with date<br>• All filtered data included<br>• Proper formatting (commas, quotes) | ⬜     | Open in Excel to verify |
| **4.6** | **Clinician activity report** | 1. Select: Dr. Smith<br>2. Date range: Past 30 days<br>3. Run report                                   | • Total visits: 4<br>• Facility breakdown chart<br>• Visits per week chart<br>• Accurate statistics                          | ⬜     |                         |
| **4.7** | **Facility summary report**   | 1. Select: Facility A<br>2. Date range: Past 30 days<br>3. Run report                                  | • Total patients count<br>• Total visits: 5<br>• Clinician breakdown<br>• Average wounds per visit                           | ⬜     |                         |
| **4.8** | **Medical records request**   | 1. Select: Patient 1<br>2. Date range: All dates<br>3. Run report                                      | • Shows ALL Patient 1 visits<br>• Chronological order<br>• Status visible                                                    | ⬜     |                         |
| **4.9** | **Download combined ZIP**     | 1. Medical records for Patient 1<br>2. Click "Download All PDFs (ZIP)"                                 | • ZIP file downloads<br>• Contains all Patient 1 visit PDFs<br>• Correct filenames<br>• PDFs open correctly                  | ⬜     | Extract and verify      |

**Pass Criteria:** All 9 test cases must pass

---

## Test Suite 5: Access Control

**Feature:** Phase 10.3.1  
**Priority:** MEDIUM  
**Test Cases:** 7  
**Estimated Time:** 30 minutes

### Setup

1. ✅ Create test clinician (no admin role): `clinician@wound-ehr.com`
2. ✅ Create test admin: `admin@wound-ehr.com`
3. ✅ Create test patient with complete data (demographics, insurance, medical history)

### Test Cases

| #       | Test Case                       | Steps                                                                                                | Expected Result                                                                                        | Status | Notes |
| ------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ | ----- |
| **5.1** | **Clinician edit insurance**    | 1. Login as clinician<br>2. Open patient detail<br>3. Try to edit insurance info                     | • Fields read-only<br>• Gray background<br>• Lock icon visible<br>• Tooltip: "Contact admin to update" | ⬜     |       |
| **5.2** | **Clinician edit demographics** | 1. Still as clinician<br>2. Try to edit name, DOB, MRN                                               | • Fields read-only<br>• Lock icon visible<br>• Cannot modify                                           | ⬜     |       |
| **5.3** | **Clinician edit other visit**  | 1. Create visit assigned to Dr. Smith<br>2. Login as Nurse Jones<br>3. Try to edit Dr. Smith's visit | • Error: "You can only edit your assigned visits"<br>• Edit button disabled OR<br>• Form submit fails  | ⬜     |       |
| **5.4** | **Admin edit insurance**        | 1. Login as admin<br>2. Open patient detail<br>3. Edit insurance provider                            | • Fields editable<br>• No lock icons<br>• Changes save successfully                                    | ⬜     |       |
| **5.5** | **Admin edit any visit**        | 1. Still as admin<br>2. Open Dr. Smith's visit<br>3. Edit assessment                                 | • Form editable<br>• Changes save<br>• No access errors                                                | ⬜     |       |
| **5.6** | **Clinician upload insurance**  | 1. Login as clinician<br>2. Patient documents tab<br>3. Try to upload "Insurance Card"               | • Upload button disabled OR<br>• Document type dropdown excludes admin-only types                      | ⬜     |       |
| **5.7** | **Admin upload insurance**      | 1. Login as admin<br>2. Patient documents tab<br>3. Upload "Insurance Card"                          | • Upload succeeds<br>• Document saved<br>• Visible in documents list                                   | ⬜     |       |

**Pass Criteria:** All 7 test cases must pass

---

## Test Suite 6: Data Validation

**Feature:** Phase 10.3.2  
**Priority:** MEDIUM  
**Test Cases:** 8  
**Estimated Time:** 45 minutes

### Setup

1. ✅ Create new visit for test patient
2. ✅ Start wound assessment (do not complete)

### Test Cases

| #       | Test Case                           | Steps                                                                               | Expected Result                                                                                                                        | Status | Notes                                         |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------- |
| **6.1** | **Alginate validation (dry wound)** | 1. Set exudate amount: "None"<br>2. Try to select alginate treatment                | • Alginate checkbox disabled<br>• Tooltip: "Alginate requires moderate to large exudate"                                               | ⬜     |                                               |
| **6.2** | **Alginate validation (wet wound)** | 1. Change exudate: "Moderate"<br>2. Select alginate treatment                       | • Alginate checkbox enabled<br>• Selectable<br>• No error                                                                              | ⬜     |                                               |
| **6.3** | **Tissue composition < 100%**       | 1. Set epithelial: 60%<br>2. Set granulation: 30%<br>3. Total = 90%                 | • Error below sliders: "Total must equal 100% (currently: 90%)"<br>• Save button disabled<br>• Red highlighting                        | ⬜     |                                               |
| **6.4** | **Tissue composition = 100%**       | 1. Adjust granulation: 40%<br>2. Total = 100%                                       | • Error cleared<br>• Save button enabled<br>• No red highlighting                                                                      | ⬜     |                                               |
| **6.5** | **Measurement warning**             | 1. Length: 5.0 cm<br>2. Width: 3.0 cm<br>3. Depth: 4.0 cm (> width)                 | • Warning: "Depth usually less than width. Verify measurements."<br>• Yellow/orange alert<br>• Save still enabled (warning, not error) | ⬜     |                                               |
| **6.6** | **Pressure stage required**         | 1. Wound type: "Pressure Injury"<br>2. Leave pressure stage blank<br>3. Try to save | • Error: "Stage required for pressure injuries"<br>• Save disabled                                                                     | ⬜     |                                               |
| **6.7** | **Pressure stage hidden**           | 1. Change wound type: "Diabetic Ulcer"<br>2. Check form                             | • Pressure stage field hidden<br>• Not in form data<br>• No validation error                                                           | ⬜     |                                               |
| **6.8** | **Location confirmation**           | 1. First assessment for new wound<br>2. Try to save without confirming location     | • Error: "Confirm wound location before saving"<br>• Checkbox unchecked<br>• Save disabled                                             | ⬜     | Check "I confirm this wound is on [location]" |

**Pass Criteria:** All 8 test cases must pass

---

## Performance Testing

**Goal:** Validate system performance with production-scale data

### Test Scenarios

#### Scenario 1: Concurrent Users

**Target:** 50 concurrent users  
**Duration:** 15 minutes  
**Actions:**

- 20 users viewing dashboard
- 15 users creating/editing visits
- 10 users generating PDFs
- 5 admins running reports

**Success Criteria:**

- ✅ Page load time: < 2 seconds (avg)
- ✅ Form submission: < 1 second (avg)
- ✅ PDF generation: < 5 seconds (avg)
- ✅ No timeout errors
- ✅ No database connection errors

**Status:** ⬜ Not started

---

#### Scenario 2: Large Dataset

**Setup:**

- 1,000 patients
- 10,000 visits
- 50,000 assessments
- 100,000 photos

**Tests:**

1. ⬜ Dashboard load time
2. ⬜ Patient list pagination
3. ⬜ Search performance
4. ⬜ Calendar rendering (500 appointments/month)
5. ⬜ Report generation (1,000+ records)

**Success Criteria:**

- ✅ All operations < 3 seconds
- ✅ No memory leaks
- ✅ No database query timeouts

---

#### Scenario 3: PDF Generation

**Test:**

- Generate 100 PDFs sequentially
- Measure time and memory usage

**Success Criteria:**

- ✅ Average time: < 5 seconds per PDF
- ✅ No memory leaks
- ✅ All PDFs valid and complete

**Status:** ⬜ Not started

---

## Security Testing

### Security Audit Checklist

#### Authentication & Authorization

- ⬜ **SQL Injection:** Test all form inputs for SQL injection vulnerabilities
- ⬜ **XSS:** Test all text fields for cross-site scripting
- ⬜ **CSRF:** Verify CSRF protection on all forms
- ⬜ **Session Management:** Test session timeout and invalidation
- ⬜ **Password Security:** Verify password hashing (Supabase Auth)
- ⬜ **Role Bypass:** Attempt to access admin pages as clinician
- ⬜ **RLS Bypass:** Attempt to query other tenant's data

#### Data Protection

- ⬜ **Encryption at Rest:** Verify database encryption (Supabase)
- ⬜ **Encryption in Transit:** Verify HTTPS/TLS
- ⬜ **PII Exposure:** Check for PHI/PII in logs or error messages
- ⬜ **File Upload:** Test malicious file uploads
- ⬜ **API Endpoints:** Verify authentication on all Server Actions

#### Compliance

- ⬜ **HIPAA:** Review HIPAA compliance checklist
- ⬜ **Audit Logs:** Verify all sensitive actions logged
- ⬜ **Data Retention:** Verify no automatic deletion of PHI
- ⬜ **Access Logs:** Monitor who accessed what data

**Status:** ⬜ Not started  
**Recommendation:** Hire security firm for penetration testing

---

## User Acceptance Testing (UAT)

### UAT Participants

1. **Dr. May** (Primary Clinician)
2. **Yesenia** (Office Admin/QA Lead)
3. **Alana** (Admin Staff)
4. **Erin** (Clinician)

### UAT Scenarios

#### Scenario 1: Daily Workflow (Yesenia)

1. ⬜ Review office inbox (10 pending notes)
2. ⬜ Request corrections (2 notes)
3. ⬜ Approve notes (8 notes)
4. ⬜ Review addendum notifications (3 addendums)
5. ⬜ Generate daily visit log report
6. ⬜ Export to CSV for billing

**Time:** 30 minutes  
**Feedback:** ********************\_\_\_\_********************

---

#### Scenario 2: Clinical Workflow (Erin)

1. ⬜ View assigned patients (calendar filter)
2. ⬜ Create new visit (2 wounds)
3. ⬜ Complete assessments with photos
4. ⬜ Select treatments (validation rules)
5. ⬜ Send to office
6. ⬜ Receive correction request
7. ⬜ Make corrections and resubmit
8. ⬜ Add addendum after approval

**Time:** 45 minutes  
**Feedback:** ********************\_\_\_\_********************

---

#### Scenario 3: Admin Workflow (Alana)

1. ⬜ Assign clinician to new patient
2. ⬜ Update patient insurance
3. ⬜ Upload insurance card document
4. ⬜ Run facility summary report
5. ⬜ Generate medical records ZIP for audit

**Time:** 20 minutes  
**Feedback:** ********************\_\_\_\_********************

---

## Test Summary

### Overall Progress

| Test Suite                  | Total Cases | Passed | Failed | Blocked | Status         |
| --------------------------- | ----------- | ------ | ------ | ------- | -------------- |
| Suite 1: Note Approval      | 8           | 0      | 0      | 0       | ⬜ Not Started |
| Suite 2: Clinical Summary   | 6           | 0      | 0      | 0       | ⬜ Not Started |
| Suite 3: Calendar Filtering | 8           | 0      | 0      | 0       | ⬜ Not Started |
| Suite 4: Reporting          | 9           | 0      | 0      | 0       | ⬜ Not Started |
| Suite 5: Access Control     | 7           | 0      | 0      | 0       | ⬜ Not Started |
| Suite 6: Data Validation    | 8           | 0      | 0      | 0       | ⬜ Not Started |
| **Total**                   | **46**      | **0**  | **0**  | **0**   | **0%**         |

### Performance Testing

- ⬜ Concurrent users (50)
- ⬜ Large dataset (10,000 visits)
- ⬜ PDF generation (100 PDFs)

### Security Testing

- ⬜ Authentication & authorization (7 checks)
- ⬜ Data protection (5 checks)
- ⬜ Compliance audit (4 checks)

### User Acceptance Testing

- ⬜ Scenario 1: Daily workflow (Yesenia)
- ⬜ Scenario 2: Clinical workflow (Erin)
- ⬜ Scenario 3: Admin workflow (Alana)

---

## Sign-Off

### Development Team

- [ ] All test cases executed
- [ ] All critical bugs fixed
- [ ] Performance targets met
- [ ] Security audit passed

**Developer:** ********\_\_\_******** **Date:** ****\_\_\_****

### Client Team

- [ ] UAT scenarios completed
- [ ] Functionality meets requirements
- [ ] Ready for production deployment

**Client Lead:** ********\_\_\_******** **Date:** ****\_\_\_****

---

**For implementation details, see [PHASE_10_IMPLEMENTATION_PLAN.md](./PHASE_10_IMPLEMENTATION_PLAN.md)**  
**For project status, see [PROJECT_STATUS.md](./PROJECT_STATUS.md)**
