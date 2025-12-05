# Client Requirements Analysis
**Date:** November 19, 2025  
**Status:** Gap Analysis Complete

---

## Executive Summary

The client team has provided a comprehensive requirements list. After careful review of the current implementation (Phase 9.2 Complete), here's the status breakdown:

**Overall Status:**
- ✅ **11 items FULLY implemented** (signatures, credentials, visit workflow, autosave, photo labeling, document attachments)
- ⚠️ **2 items PARTIALLY implemented** (procedure restrictions usability enhancements)
- 🔴 **5 items NOT implemented** (specialized templates, bulk uploads, versioning)

---

## Detailed Requirements Analysis

### 1. Signatures & Authentication ✅ ⚠️ 🔴

#### ✅ 1.1 Clinician Signature on Visit Notes - **FULLY IMPLEMENTED**
**Status:** Phase 9.2 Complete (Tested, Ready for Production)

**Implementation:**
- Electronic signature captured for ALL visits (all clinician types)
- Dual-mode signature pad: Draw (finger/stylus) OR Type name
- Stored with full audit trail: timestamp, IP address, signature method
- Component: `components/signatures/signature-pad.tsx`
- Database: `signatures` table with type='provider'

**Evidence:**
- Migration 00014: Added signatures table
- Visit workflow includes "Sign Visit" action
- PDF exports show provider signature with name and credentials
- Tested locally with MD and RN credentials

---

#### ✅ 1.2 Patient/Caregiver Signature for RN/LVN - **FULLY IMPLEMENTED**
**Status:** Phase 9.2 Complete (Tested, Ready for Production)

**Implementation:**
- Auto-determined based on clinician credentials
- RN/LVN visits: Patient signature REQUIRED
- MD/DO/PA/NP visits: Patient signature NOT required
- Logic: `requiresPatientSignature()` in `lib/credentials.ts`
- Component: `components/signatures/patient-signature-modal.tsx`
- Database: `visits.requires_patient_signature` boolean flag

**Workflow:**
1. Visit marked "Ready for Signature"
2. If RN/LVN: Patient signs first → Then provider signs
3. If MD/DO/PA/NP: Provider signs directly (skip patient signature)

**Evidence:**
- Tested with RN credentials: Patient signature modal appeared
- Tested with MD credentials: Patient signature skipped
- Signatures saved to database with correct type='patient'

---

#### ✅ 1.3 Initial "Consent to Treat" - **FULLY IMPLEMENTED**
**Status:** Phase 9.2 Complete (Tested, Ready for Production)

**Implementation:**
- One-time consent per patient (before first visit)
- Blocking modal dialog on patient detail page
- Two-step workflow: Read consent text → Sign
- Cannot create visit until consent completed
- Component: `components/patients/consent-dialog.tsx`
- Database: `patient_consents` table

**Workflow:**
1. User opens patient detail page
2. System checks for existing consent
3. If no consent exists: Modal blocks entire page
4. User reads consent text (scrollable)
5. User signs (draw or type)
6. Consent saved with signature
7. Modal closes, visit creation enabled

**Evidence:**
- Tested locally: Modal appears for patients without consent
- Consent persists after signing (no re-prompt)
- Cannot close modal until signed

---

#### 🔴 1.4 Upload Scanned Paper Consents - **NOT IMPLEMENTED**
**Status:** NEW FEATURE REQUIRED

**Gap:** Current system only supports electronic signatures. No way to upload pre-existing paper consents that were signed offline.

**Client Need:** Some patients may have signed paper consent forms before electronic system was deployed. Need to digitize these into the system.

**Recommended Implementation:**
1. Add "Upload Scanned Consent" option in consent dialog
2. File upload component (PDF or image)
3. Store in Supabase Storage bucket: `patient-consents/`
4. Save reference in `patient_consents` table with `consent_document_url` field
5. Mark as `signature_method: 'upload'` instead of 'draw' or 'type'

**Database Changes Needed:**
```sql
ALTER TABLE patient_consents 
ADD COLUMN consent_document_url TEXT,
ADD COLUMN consent_document_name TEXT,
ADD COLUMN consent_document_size INTEGER;

-- Update signature_method enum to include 'upload'
ALTER TABLE signatures 
DROP CONSTRAINT signatures_signature_method_check;

ALTER TABLE signatures 
ADD CONSTRAINT signatures_signature_method_check 
CHECK (signature_method IN ('draw', 'type', 'upload'));
```

**Effort:** 1-2 days (Medium complexity)

---

### 2. User Types & Role-Based Restrictions ✅ ⚠️

#### ✅ 2.1 Distinct User Types (MD/DO/PA/NP vs RN/LVN) - **FULLY IMPLEMENTED**
**Status:** Phase 9.1 Deployed to Production

**Implementation:**
- 8 credential types: RN, LVN, MD, DO, PA, NP, CNA, Admin
- Required field on all users (`users.credentials`)
- Captured during invite process
- Displayed in user management UI with badges
- Migration 00008: Added credentials system

**Evidence:**
- Production database has credentials field
- All users must have credentials assigned
- User management shows credentials column

---

#### 🔴 2.2 Restrict RN/LVN Procedures (No Sharp Debridement) - **NOT IMPLEMENTED**
**Status:** Phase 9.3 - PLANNED BUT NOT STARTED

**Gap:** Current system shows ALL treatment options to ALL users regardless of credentials. RN/LVN can currently document sharp debridement (which is outside their scope of practice).

**Client Need:** Critical compliance requirement. RN/LVN must NOT be able to:
- See sharp debridement CPT codes (11042, 11043, 11044, 11045, 11046, 11047)
- Document sharp debridement in treatment plans
- Bill for sharp debridement procedures

**Planned Implementation (from SYSTEM_DESIGN.md):**
1. Create `procedure_scopes` table
2. Map CPT codes to allowed credentials
3. Filter treatment options by current user credentials
4. Server-side validation on submission

**Database Schema Designed:**
```sql
CREATE TABLE procedure_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  allowed_credentials TEXT[] NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedure_code)
);
```

**Seed Data Needed:**
- Sharp debridement: `['MD', 'DO', 'PA', 'NP']` only
- Selective debridement: `['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']` all
- NPWT: All credentials
- Wound care: All credentials

**Effort:** 3-5 days (High priority)

---

#### 🔴 2.3 RN/LVN Shorthand Note Template - **NOT IMPLEMENTED**
**Status:** NEW FEATURE REQUIRED

**Gap:** Current system has one universal visit assessment form for all user types. No credential-specific templates.

**Client Need:** Alana will send a simplified RN/LVN template with:
- Fewer fields (focused on wound care, dressing changes, G-tube care)
- No complex medical decision-making fields
- Faster data entry for nurses

**Current Visit Types:**
- `in_person` (in-person visit)
- `telemed` (telehealth visit)

**Need to Add:**
- Visit template system based on credentials + visit purpose
- Examples: "RN Wound Care", "MD Comprehensive Assessment", "RN G-tube Care"

**Recommended Implementation:**
1. Add `visit_template` field to visits table
2. Create template configuration system
3. Dynamic form rendering based on template
4. Pre-fill common values for RN/LVN

**Database Changes Needed:**
```sql
-- Add visit template field
ALTER TABLE visits ADD COLUMN visit_template TEXT;

-- Create templates table
CREATE TABLE visit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL, -- 'wound_care', 'grafting', 'skin_sweep', 'gtube'
  allowed_credentials TEXT[] NOT NULL,
  form_fields JSONB NOT NULL, -- Dynamic field configuration
  default_values JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Effort:** 5-7 days (Complex - requires dynamic form system)

---

### 3. Note Workflow & Autosave ⚠️ ⚠️ ✅

#### ✅ 3.1 "Save Note" (Draft) Separate from "Sign/Complete" - **FULLY IMPLEMENTED**
**Status:** Phase 9.2 Complete (Tested, Ready for Production)

**Implementation:**
- Visit status workflow: `draft` → `ready_for_signature` → `signed` → `submitted`
- "Save Draft" button: Saves progress without validation
- "Mark Ready for Signature" button: Validates + prevents further editing
- "Sign Visit" action: Captures signatures
- "Submit to Office" action: Final submission

**Evidence:**
- Tested locally: Can save multiple drafts
- Can return to draft visits and continue editing
- Once signed: Read-only enforcement

---

#### ✅ 3.2 Autosave to Prevent Data Loss - **FULLY IMPLEMENTED**
**Status:** Phase 9.3.2 Complete (November 21, 2025) - PRODUCTION READY

**Implementation:**
- ✅ **Client-side:** localStorage autosave every 30 seconds (automatic, no user action needed)
- ✅ **Server-side:** Auto-save draft to database every 2 minutes (for drafts only)
- ✅ Draft recovery modal on page load (when recent autosave < 24 hours detected)
- ✅ "Last saved: just now" indicator with status (saving/saved/error/idle)
- ✅ Automatic clear on successful submission
- ✅ Works offline (localStorage always available)

**Evidence:**
- Autosave hook: `lib/hooks/use-autosave.ts`
- Recovery modal: `components/ui/autosave-recovery-modal.tsx`
- Status indicator: `components/ui/autosave-indicator.tsx`
- Server actions: `autosaveVisitDraft()`, `autosaveAssessmentDraft()`
- Visit form integration: Fully tested, no TypeScript errors
- **Docs:** `docs/PHASE_9.3.2_AUTOSAVE_IMPLEMENTATION.md`

**Remaining Work:**
- Assessment form integration (planned Phase 9.3.3)
- Other forms (patient, wound, treatment, billing - lower priority)

---

#### ✅ 3.3 Complete Notes After Visit - **FULLY IMPLEMENTED**
**Status:** Phase 9.2 Complete

**Implementation:**
- Draft status allows returning to incomplete visits
- Can save progress and finish later
- Signatures can be captured at a later time (but MUST be captured before final submission)

**Evidence:**
- Visit detail page shows "Continue Editing" button for draft visits
- Signature workflow is separate from data entry

---

#### ✅ 3.4 Complete Initial Consents Outside Visit Notes - **FULLY IMPLEMENTED**
**Status:** Phase 9.2 Complete

**Implementation:**
- Consent system is completely independent of visits
- Consent captured on patient detail page (separate workflow)
- Consent blocks visit creation but is not part of visit form
- Database: `patient_consents` table (separate from visits)

**Evidence:**
- Tested: Consent modal appears on patient page
- No visit required to complete consent

---

### 4. Attachments & Document Storage 🔴 🔴

#### 🔴 4.1 Attachments Tab in Patient Chart - **NOT IMPLEMENTED**
**Status:** NEW FEATURE REQUIRED (High Priority)

**Gap:** Current system only stores wound photos. No way to attach:
- Signed consents (paper scans)
- Face sheets
- Lab results
- Radiology reports
- Other medical documents

**Client Need:** Central document repository per patient with organized folder structure.

**Current Photo System:**
- `photos` table: Only wound photos
- Supabase Storage bucket: `wound-photos/`
- Fields: wound_id, visit_id, caption, url

**Recommended Implementation:**

**1. Database Schema:**
```sql
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'consent', 'face_sheet', 'lab_report', 'radiology', 
    'insurance', 'other'
  )),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_url TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  visit_id UUID REFERENCES visits(id), -- Optional: link to specific visit
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[], -- For categorization
  is_archived BOOLEAN DEFAULT false
);

CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_type ON patient_documents(document_type);
CREATE INDEX idx_patient_documents_visit_id ON patient_documents(visit_id);
```

**2. Supabase Storage Buckets:**
```
patient-documents/
├── {patient_id}/
│   ├── consents/
│   ├── face_sheets/
│   ├── labs/
│   ├── radiology/
│   ├── insurance/
│   └── other/
```

**3. UI Components:**
- New tab on patient detail page: "Documents"
- Grid view with folders (Consents, Labs, Radiology, etc.)
- Upload button with drag-and-drop
- Document preview modal (PDF viewer, image viewer)
- Download button
- Archive/delete actions

**4. Features Needed:**
- Multi-file upload
- Bulk download (ZIP)
- Search/filter by document type
- Sort by date, name, size
- Access control (RLS policies)

**Effort:** 5-7 days (Complex feature)

---

#### ✅ 4.2 Photo Labeling with Wound Location - **FULLY IMPLEMENTED**
**Status:** Phase 9.3.4 Complete (November 21, 2025)

**Implementation:**
- Enhanced wound-progress-pdf.tsx with wound labels
- Photos now display above each image:
  - **Wound #X - Location** (teal color, bold)
  - **(Wound Type)** (gray, secondary text)
- Format example: "Wound #2 - Left Heel" with "(Pressure Injury)" below
- Updated getWoundDataForPDF to include wound metadata
- TypeScript types updated for wound number, location, and type

**Technical Details:**
- Modified: `app/actions/pdf.ts` (query includes wound metadata)
- Modified: `components/pdf/wound-progress-pdf.tsx` (display wound labels)
- No database changes required (data already existed)
- Labels appear on all wound progress PDFs

**Evidence:**
- Build successful: All routes compile
- TypeScript: No errors
- Photo labels use app branding (teal primary color)
- Professional appearance matching existing PDF styles

**User Impact:**
- Clear wound identification in printed documents
- No confusion about which wound a photo represents
- Compliance with documentation requirements

---

#### 🔴 4.3 Assessment Types (Wound Care, Grafting, Skin Sweep, G-tube) - **NOT IMPLEMENTED**
**Status:** NEW FEATURE REQUIRED (Relates to 2.3)

**Gap:** Current system has ONE assessment type: "Wound Assessment". No specialized forms for different clinical procedures.

**Client Need:** Different assessment templates for different visit purposes:

1. **Wound Care Assessment** (Current implementation - mostly complete)
   - Length × Width × Depth measurements
   - Tissue composition
   - Healing status
   - Treatment plan
   - Photos

2. **Grafting Note** (NEW)
   - Graft type (split-thickness, full-thickness, dermal substitute)
   - Graft site location
   - Graft size
   - Donor site (if autograft)
   - Fixation method
   - Post-op care instructions
   - Photos of graft + donor site

3. **Skin Sweep** (NEW)
   - Full-body skin inspection
   - Multiple wound documentation in one visit
   - Quick assessment (no deep measurements)
   - At-risk areas assessment
   - Prevention recommendations
   - Photos of all identified wounds

4. **G-tube Care** (NEW)
   - Tube type (PEG, PEJ, etc.)
   - Insertion site assessment
   - Skin condition around stoma
   - Signs of infection/granulation tissue
   - Tube patency
   - Flushing performed
   - Feeding tolerance
   - Photos of insertion site

**Recommended Implementation:**

**1. Database Schema:**
```sql
-- Add assessment_type to assessments table
ALTER TABLE assessments 
ADD COLUMN assessment_type TEXT DEFAULT 'wound_care'
CHECK (assessment_type IN ('wound_care', 'grafting', 'skin_sweep', 'gtube'));

-- Create specialized assessment tables for non-wound-care types
CREATE TABLE grafting_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  graft_type TEXT NOT NULL,
  graft_location TEXT NOT NULL,
  graft_size TEXT,
  donor_site TEXT,
  fixation_method TEXT,
  postop_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gtube_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  tube_type TEXT NOT NULL,
  insertion_site_condition TEXT,
  signs_infection BOOLEAN,
  granulation_tissue BOOLEAN,
  tube_patency TEXT,
  flushing_performed BOOLEAN,
  feeding_tolerance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skin_sweep_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  body_areas_inspected TEXT[],
  total_wounds_found INTEGER,
  prevention_measures JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. UI Changes:**
- Assessment type selector at visit creation
- Conditional form rendering based on type
- Specialized form components for each type
- PDF templates for each assessment type

**3. Workflow:**
1. User creates visit
2. Selects visit purpose: "Wound Care" / "Grafting" / "Skin Sweep" / "G-tube"
3. System shows appropriate assessment form
4. User completes specialized fields
5. Signatures collected (same workflow)
6. PDF export uses specialized template

**Effort:** 10-14 days (Very complex - multiple new forms and workflows)

---

## Summary by Implementation Status

### ✅ Fully Implemented (7 items)
1. Clinician electronic signature on visits ✅
2. Patient/caregiver signature for RN/LVN ✅
3. Initial consent-to-treat workflow ✅
4. Distinct user types (MD/DO/PA/NP vs RN/LVN) ✅
5. Save draft separate from sign/complete ✅
6. Complete notes after visit ✅
7. Complete consents outside visit notes ✅

### ⚠️ Partially Implemented (2 items)
1. Autosave (planned Phase 10, not started) ⚠️
2. Photo labeling with wound location (basic implementation, needs PDF enhancement) ⚠️

### ✅ Recently Implemented (November 25, 2025)
1. Patient document attachments tab ✅ **COMPLETED** (Phase 9.4.1)
   - 11 document types supported
   - Drag-and-drop upload (max 10MB)
   - PDF/image viewer modal
   - Organized display grouped by type
   - Archive and download capabilities
   - Full audit trail with uploader credentials
   - Multi-tenant security (RLS on database and storage)

### 🔴 Not Implemented (5 items)
1. Upload scanned paper consents 🔴 **COMPLETED** (Phase 9.3.5)
2. Restrict RN/LVN procedures (no sharp debridement) 🔴 **COMPLETED** (Phase 9.3.1)
3. RN/LVN shorthand note template 🔴
4. Multiple assessment types (Grafting, Skin Sweep, G-tube) 🔴
5. Document versioning and bulk uploads 🔴

---

## Recommended Implementation Priority

### Phase 9.3 - High Priority (2-3 weeks)
**Critical Compliance Features:**

1. **Procedure Restrictions** (3-5 days) 🔴 HIGH PRIORITY
   - Block RN/LVN from sharp debridement
   - Legal/compliance risk if not implemented
   
2. **Autosave** (3-4 days) ⚠️ HIGH PRIORITY
   - Field clinicians lose data without this
   - Client mentioned this specifically
   
3. **Photo Labeling in PDFs** (1 day) ⚠️ QUICK WIN
   - Simple enhancement
   - Improves professional appearance

### Phase 9.4 - Medium Priority (3-4 weeks)
**Enhanced Functionality:**

4. **Patient Document Attachments** ✅ **COMPLETED** (November 25, 2025)
   - Central document repository LIVE
   - Face sheets, labs, radiology, insurance, etc.
   - Migration 00022 deployed
   - ~1,500 lines of code
   
5. **Upload Scanned Consents** ✅ **COMPLETED** (November 23, 2025)
   - Handle legacy paper consents
   - Phase 9.3.5 implementation

### Phase 10 - Future Enhancements (4-6 weeks)
**Specialized Workflows:**

6. **RN/LVN Shorthand Template** (5-7 days) 🔴 COMPLEX
   - Wait for Alana's template document
   - Dynamic form system needed
   
7. **Multiple Assessment Types** (10-14 days) 🔴 VERY COMPLEX
   - Grafting, Skin Sweep, G-tube
   - Requires specialized forms
   - May need clinical input for each type

---

## Questions for Client

1. **RN/LVN Template:** When will Alana send the shorthand template? Need exact fields required.

2. **Assessment Types:** Do you need all 4 types (Wound Care, Grafting, Skin Sweep, G-tube) or just specific ones initially?

3. **Sharp Debridement Codes:** Confirm complete list of restricted CPT codes for RN/LVN.

4. **Document Types:** Are the 6 document categories sufficient (consent, face_sheet, lab_report, radiology, insurance, other)?

5. **Photo Labeling:** Is adding wound location as a header above photos sufficient, or do you need text burned onto the image itself?

6. **Autosave Frequency:** Is 30 seconds (client) + 2 minutes (server) acceptable, or do you need more aggressive autosave?

---

## Next Steps

**Immediate Actions (This Week):**
1. ✅ Deploy Phase 9.2 to production (signatures system)
2. ✅ Verify all signatures working in production
3. 📋 Get client approval on priority order
4. 📋 Request Alana's RN/LVN template document
5. 📋 Request complete list of restricted procedures for RN/LVN

**Sprint Planning (Next 2 Weeks):**
1. Start Phase 9.3: Procedure restrictions + Autosave
2. Begin database design for document attachments
3. Design specialized assessment form wireframes

**Long-Term (Next Month):**
1. Complete document attachments system
2. Implement specialized assessment types
3. Build RN/LVN shorthand template (after receiving from Alana)

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Next Review:** After client feedback
