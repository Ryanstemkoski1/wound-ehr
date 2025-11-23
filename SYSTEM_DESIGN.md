# Wound EHR - System Design Document

> **Version**: 4.6  
> **Date**: November 23, 2025  
> **Status**: ✅ **Phase 9.3 - 6 of 7 Sub-phases Complete (86%)**

---

## Table of Contents

1. [Current Status](#version-46-updates-november-23-2025)
2. [Version History](#version-history-summary)
3. [Executive Summary](#executive-summary)
4. [Project Requirements](#project-requirements)
5. [System Architecture](#system-architecture)
6. [Database Schema](#database-schema)
7. [Frontend Architecture](#frontend-architecture)
8. [Key Features & Workflows](#key-features--workflows)
9. [Technology Stack](#technology-stack)
10. [Implementation Phases](#implementation-phases)
11. [Design Decisions](#design-decisions)

---

## Version 4.6 Updates (November 23, 2025)

### ✅ Phase 9.3 Completion Status

**Completed (6 of 7 sub-phases - 86%):**
- ✅ 9.3.1: Procedure Restrictions (credential-based scope of practice) - Nov 20
- ✅ 9.3.2: Visit Autosave (client-side + server-side drafts) - Nov 21
- ✅ 9.3.3: Assessment Autosave (multi-wound form protection) - Nov 21
- ✅ 9.3.4: Photo Workflow Refactor (assessment-based, PDF fixes) - Nov 21
- ✅ 9.3.5: Upload Scanned Paper Consents (file upload alternative) - Nov 23
- ✅ 9.3.6: Visit Addendums (post-signature notes with RLS security fixes) - Nov 23

**Recently Completed:**
- ✅ 9.3.6: Visit Addendums & Critical Security Fixes (November 23, 2025)
  - Post-signature addendum notes functionality
  - RPC function with SECURITY DEFINER for cross-user data access
  - Critical RLS security audit (18 tables reviewed)
  - Fixed 3 critical multi-tenant isolation vulnerabilities
  - Comprehensive automated test suite (25 tests, 100% pass rate)
  - Full system validation and production ready

**Remaining (1 of 7 sub-phases):**
- 🔴 9.3.7: Signature Audit Logs (compliance reporting) - **NEXT** - Est. 1 day

### 🔒 Critical Security Enhancements (November 23, 2025)

**Comprehensive RLS Security Audit:**
- Audited all 18 database tables for Row Level Security policies
- Identified 3 critical multi-tenant isolation vulnerabilities
- Fixed tenants table (RLS was disabled, breaking tenant isolation)
- Fixed user_invites table (RLS was disabled, exposing invite data)
- Fixed wound_notes table (policies didn't support addendums with NULL wound_id)
- Fixed procedure_scopes table (missing user_facilities join)

**Architectural Discovery:**
- System has dual authorization model: user_facilities (data access) + user_roles (admin only)
- user_roles RLS must stay disabled to prevent infinite recursion
- RLS policies must use user_facilities joins, NOT user_roles queries
- RPC functions (SECURITY DEFINER) required for cross-user data access

**Automated Testing Infrastructure:**
- Created comprehensive test suite (scripts/test-all-features.js)
- 25 automated tests covering 8 major feature areas
- 100% test pass rate achieved after fixes
- Test suite provides ongoing regression protection

### 🧹 Codebase Cleanup (November 23, 2025)

- Removed 17+ temporary documentation files (old status reports, test plans)
- Cleaned up 13 one-time debug/fix scripts
- Streamlined scripts folder to 5 essential utilities
- Updated documentation to reflect current state

---

### Version 4.0 (November 18, 2025) - Compliance & Signatures
- ✅ Credentials system (RN, LVN, MD, DO, PA, NP, CNA, Admin)
- ✅ Electronic signatures (consent-to-treat, provider, patient)
- ✅ Visit workflow (draft → ready → signed → submitted)
- ✅ Procedure restrictions (credential-based scope)
- ✅ Autosave (client-side 30s, server-side 2min)
- ✅ PDF enhancements (clinician credentials, signatures)

---

## Version History Summary

### Version 3.0 (November 4, 2025) - UX & Multi-Tenancy
- ✅ Wound-based layout (wound cards as primary interface)
- ✅ Multi-tenant RBAC (Tenant Admin, Facility Admin, User)
- ✅ Enhanced calendar (modal-based, drag-to-create)
- ✅ Per-wound notes system with timestamps

---

## Executive Summary

### Project Goal

Build a custom EHR (Electronic Health Record) system specifically designed for wound care documentation that allows clinicians to:

- Track multiple wounds per patient over time
- Record detailed wound assessments with measurements
- Monitor healing progress (better/worse/stable)
- Document treatment plans and orders
- Generate visit summaries and reports
- Support photo documentation

### Core Problem Statement

Current EHR systems (Aprima, Practice Fusion, PointClickCare) either:

- Lack API support for writing clinical data
- Have inefficient data entry workflows for wound care
- Cannot be customized for wound-specific documentation

### Solution Approach

A fully custom, web-based EHR platform with:

- Adaptive forms optimized for wound documentation
- Real-time wound tracking and comparison
- Built-in billing and reporting
- Photo upload and management
- Mobile-responsive design (tablet, phone, desktop)

---

## Project Requirements

### Functional Requirements

#### 1. Patient Management

- [ ] Create, view, edit, delete patient records
- [ ] Search patients by name, ID, or other identifiers
- [ ] Track patient demographics and contact information
- [ ] Link patients to facilities (for SNF integration)

#### 2. Wound Management

- [ ] Add multiple wounds per patient
- [ ] Track wound location on body
- [ ] Record wound type (pressure injury, surgical, diabetic, arterial, venous, etc.)
- [ ] Document wound onset date
- [ ] Archive/remove healed wounds
- [ ] Compare wound status across visits

#### 3. Visit Documentation

- [ ] Create new visit records
- [ ] Document visit type (in-person, telemed)
- [ ] Track visit date and time
- [ ] Record visit location
- [ ] Support incomplete/pending visits
- [ ] Track number of addenda per visit

#### 4. Wound Assessment (Per Visit)

**Measurements:**

- [ ] Length × Width × Depth (in cm)
- [ ] Wound area calculation
- [ ] Undermining/tunneling measurements

**Tissue Composition:**

- [ ] % Epithelial tissue
- [ ] % Granulation tissue
- [ ] % Slough tissue

**Wound Characteristics:**

- [ ] Pressure injury staging (1, 2, 3F/Thick, 3, 4, UNSTAGEABLE, DTPI)
- [ ] Healing status (Initial, Healing, Same/Stable, Declined, Healed, Sign Off)
- [ ] Exudate amount and type
- [ ] Odor presence
- [ ] Pain level
- [ ] Periwound skin condition
- [ ] Signs of infection

**Risk Factors:**

- [ ] Diabetes, incontinence, limited mobility, poor intake
- [ ] Arterial insufficiency, venous hypertension, malignancy
- [ ] History of skin condition, morbid obesity
- [ ] Other patient-specific factors

#### 5. Treatment Planning

**Treatment Categories (from screenshots):**

- [ ] Wound Gel (multiple types: standard, with AG, medical honey, etc.)
- [ ] Hydrogel Gauze
- [ ] Oil Emulsion
- [ ] Collagen (with type selection)
- [ ] Alginate (with type selection)
- [ ] Foam dressings (specialized, ABD pad, hydrocolloid, adhesive film)
- [ ] Enzymatic debridement (Santyl)
- [ ] MASD/Moisture management (zinc oxide, barrier creams, antifungal powder)
- [ ] Negative Pressure Wound Therapy (NPWT)
- [ ] Compression therapy (UNNA boots, ACE wraps, TED hose)
- [ ] Biological grafts

**Treatment Orders:**

- [ ] Frequency (every X days and PRN)
- [ ] Application method (apply to wound bed, pack loosely)
- [ ] Cleansing instructions
- [ ] Dressing change instructions
- [ ] Follow manufacturer recommendations

**Preventive Recommendations:**

- [ ] Air mattress
- [ ] Regular repositioning
- [ ] Off-load wound as tolerated
- [ ] Incontinence care per facility protocol
- [ ] Elevate while in bed
- [ ] Heel protectors
- [ ] Prevalon boots
- [ ] Chair cushion type (Gel, ROHO for stage 3/4)

#### 6. Follow-Up Planning

- [ ] Schedule follow-up appointment
- [ ] Discharge from wound care
- [ ] PT/OT consultation for wound offloading

#### 7. Calendar & Scheduling

- [ ] Calendar view of all scheduled visits (day/week/month views)
- [ ] Color-coded visits by status (scheduled, completed, cancelled)
- [ ] Click to create new visit from calendar
- [ ] Drag-and-drop to reschedule appointments
- [ ] Filter by patient, facility, or provider
- [ ] Recurring visit scheduling (weekly wound rounds)
- [ ] Appointment reminders/notifications

#### 8. Photo Documentation

- [ ] Upload multiple photos per wound per visit
- [ ] View photo history
- [ ] Compare photos across visits
- [ ] Store photos securely with HIPAA compliance

#### 9. PDF Export & Reporting

- [ ] Generate PDF visit summaries (printable/shareable)
- [ ] Export wound progress reports with photos
- [ ] PDF treatment plans for facilities
- [ ] Custom report date ranges
- [ ] Include/exclude photos in PDF exports
- [ ] Professional formatting with branding
- [ ] Multi-patient batch report generation

#### 10. Analytics & Tracking

- [ ] Wound healing rate calculations
- [ ] Treatment efficacy tracking
- [ ] Facility performance dashboards
- [ ] Billing documentation
- [ ] Export to CSV for external systems

#### 9. Billing Support

- [ ] Time component tracking (45+ minutes including exam, treatment, counseling)
- [ ] CPT code documentation
- [ ] Visit notes for billing

### Non-Functional Requirements

#### Performance

- [ ] Page load time < 2 seconds
- [ ] Form submission < 1 second
- [ ] Support 100+ concurrent users

#### Security & Compliance

- [ ] HIPAA compliant data storage
- [ ] Encrypted data at rest and in transit
- [ ] Role-based access control (RBAC)
- [ ] Audit logging for all data changes
- [ ] Secure authentication (OAuth 2.0 / JWT)

#### Usability

- [ ] Mobile-responsive (tablet primary, phone secondary)
- [ ] Keyboard shortcuts for power users
- [ ] Auto-save drafts
- [ ] Undo/redo functionality
- [ ] Inline validation with helpful error messages

#### Reliability

- [ ] 99.9% uptime
- [ ] Automated daily backups
- [ ] Disaster recovery plan

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Desktop    │  │    Tablet    │  │    Phone     │      │
│  │   Browser    │  │   Browser    │  │   Browser    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Next.js 16 App Router)       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Server Components (RSC)                       │   │
│  │  - Direct DB queries with Supabase JS                │   │
│  │  - Dashboard, Patient List, Calendar View            │   │
│  │  - Wound Assessment Forms, Reports                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Server Actions ("use server")                       │   │
│  │  - Form submissions (create/update patients, wounds) │   │
│  │  - Photo uploads to Supabase Storage                 │   │
│  │  - PDF generation (visit summaries, reports)         │   │
│  │  - Data mutations with revalidation                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Client Components ("use client")                    │   │
│  │  - Interactive forms, calendar widget                │   │
│  │  - Photo gallery, modals, charts                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase (Backend Platform)                 │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   PostgreSQL     │         │  Supabase Storage│          │
│  │   - Patients     │         │   - Wound Photos │          │
│  │   - Wounds       │         │   - PDF Reports  │          │
│  │   - Visits       │         │   - Documents    │          │
│  │   - Assessments  │         └──────────────────┘          │
│  │   - Treatments   │         ┌──────────────────┐          │
│  │   - Users (Auth) │         │  Supabase Auth   │          │
│  └──────────────────┘         │   - JWT tokens   │          │
│                                │   - User sessions│          │
│                                └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Rationale

**Frontend:**

- **Next.js 16 (App Router)**: Already set up, Server Components for performance
- **React 19**: Modern hooks, Server Actions for data mutations
- **Tailwind CSS v4**: Rapid UI development with custom design system
- **shadcn/ui**: Pre-built, accessible components (forms, tables, dialogs)
- **Lucide Icons**: Medical/healthcare iconography
- **React Big Calendar**: Calendar view for visit scheduling
- **React-PDF / jsPDF**: PDF generation for reports

**Backend & Data:**

- **Server Components**: Direct database queries in async components (no API routes for reads)
- **Server Actions**: Form submissions and mutations using `"use server"` directive
- **Supabase**: All-in-one backend platform
  - PostgreSQL database with JSONB support
  - Built-in authentication (email/password, OAuth, magic links)
  - File storage with CDN
  - Row-level security (RLS) for HIPAA compliance
  - Real-time subscriptions (future feature)
- **Supabase JS Client**: Type-safe database queries with auto-generated TypeScript types

**Deployment:**

- **Vercel**: Optimized for Next.js, automatic scaling, HTTPS, edge functions

---

## Database Schema

### Entity-Relationship Diagram

```
┌─────────────────┐
│     Users       │
│─────────────────│
│ id (PK)         │ (Supabase Auth UUID)
│ email           │
│ name            │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ created_by
         ▼
┌─────────────────┐        ┌─────────────────┐
│   Facilities    │        │  UserFacilities │
│─────────────────│        │─────────────────│
│ id (PK)         │◄───┐   │ user_id (FK)    │
│ name            │    │   │ facility_id(FK) │
│ address         │    │   │ is_default      │
│ city            │    │   │ created_at      │
│ state           │    │   └─────────────────┘
│ zip             │    │
│ phone           │    │
│ fax             │    │
│ contact_person  │    │
│ email           │    │
│ notes           │    │
│ is_active       │    │
│ created_at      │    │
│ updated_at      │    │
└─────────────────┘    │
         ▲             │
         │             │
┌─────────────────┐    │
│    Patients     │    │
│─────────────────│    │
│ id (PK)         │    │
│ facility_id(FK) │────┘
│ first_name      │
│ last_name       │
│ dob             │
│ mrn             │ (Medical Record Number - unique per facility)
│ gender          │
│ phone           │
│ email           │
│ address         │
│ city            │
│ state           │
│ zip             │
│ insurance_info  │ (JSONB: {primary: {...}, secondary: {...}})
│ emergency_contact│(JSONB: {name, phone, relationship})
│ allergies       │ (JSONB array)
│ medical_history │ (JSONB array)
│ is_active       │
│ created_at      │
│ updated_at      │
│ created_by(FK)  │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│     Wounds      │
│─────────────────│
│ id (PK)         │
│ patient_id (FK) │
│ wound_number    │ (e.g., "Wound 1", "Wound 2")
│ location        │ (anatomical location)
│ wound_type      │ (pressure_injury, diabetic, surgical, etc.)
│ onset_date      │
│ status          │ (active, healed, archived)
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────┐
│          Visits             │
│─────────────────────────────│
│ id (PK)                     │
│ patient_id (FK)             │
│ visit_date                  │
│ visit_type                  │ (in_person, telemed)
│ visit_location              │
│ status                      │ (draft, ready_for_signature, signed, submitted, incomplete, complete)
│ time_spent_min              │
│ staff_member                │ (DEPRECATED - use clinician_name)
│ clinician_name              │ (NEW - full name)
│ clinician_credentials       │ (NEW - RN, LVN, MD, DO, PA, NP)
│ requires_patient_signature  │ (NEW - auto-set based on credentials)
│ provider_signature_id (FK)  │ (NEW - references signatures.id)
│ patient_signature_id (FK)   │ (NEW - references signatures.id)
│ signed_at                   │ (NEW - when provider signed)
│ submitted_at                │ (NEW - when submitted to office)
│ addendum_count              │
│ notes                       │
│ created_by (FK)             │
│ created_at                  │
│ updated_at                  │
└─────────────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────┐
│  WoundAssessments    │
│──────────────────────│
│ id (PK)              │
│ visit_id (FK)        │
│ wound_id (FK)        │
│ length_cm            │
│ width_cm             │
│ depth_cm             │
│ area_cm2             │ (calculated)
│ undermining          │
│ tunneling            │
│ epithelial_pct       │
│ granulation_pct      │
│ slough_pct           │
│ pressure_stage       │
│ healing_status       │
│ exudate_amount       │
│ exudate_type         │
│ odor                 │
│ pain_level           │
│ periwound_condition  │
│ infection_signs      │ (JSON array)
│ risk_factors         │ (JSON array)
│ created_at           │
└──────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────┐
│    WoundPhotos       │
│──────────────────────│
│ id (PK)              │
│ assessment_id (FK)   │
│ file_url             │
│ file_size            │
│ mime_type            │
│ caption              │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│   TreatmentPlans     │
│──────────────────────│
│ id (PK)              │
│ visit_id (FK)        │
│ wound_id (FK)        │
│ treatment_category   │
│ treatment_name       │
│ frequency_days       │
│ frequency_schedule   │ (M-W-F, T-TH-SA, Clear)
│ application_method   │
│ instructions         │ (TEXT)
│ start_date           │
│ end_date             │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│PreventiveOrders      │
│──────────────────────│
│ id (PK)              │
│ visit_id (FK)        │
│ patient_id (FK)      │
│ order_type           │ (air_mattress, repositioning, etc.)
│ details              │ (JSONB for specific params)
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│    FollowUps         │
│──────────────────────│
│ id (PK)              │
│ visit_id (FK)        │
│ patient_id (FK)      │
│ follow_up_type       │ (scheduled, discharge)
│ scheduled_date       │
│ notes                │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│      Billing         │
│──────────────────────│
│ id (PK)              │
│ visit_id (FK)        │
│ patient_id (FK)      │
│ cpt_code             │ (e.g., 97605, 97610)
│ icd10_code           │ (diagnosis code)
│ time_spent_min       │ (for time-based billing)
│ documentation        │ (TEXT - counseling notes)
│ modifier             │ (billing modifiers)
│ units                │ (number of units billed)
│ status               │ (draft, submitted, paid)
│ submitted_date       │
│ paid_date            │
│ created_at           │
└──────────────────────┘
```

### Schema Updates for Version 4.0 (Compliance & Signatures)

**New Tables:**

```sql
-- Electronic Signatures Table
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_type TEXT NOT NULL CHECK (signature_type IN ('patient', 'provider', 'consent')),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT, -- 'RN', 'LVN', 'MD', 'Patient', etc.
  signature_data TEXT NOT NULL, -- Base64 encoded signature image OR typed name
  signature_method TEXT NOT NULL CHECK (signature_method IN ('draw', 'type', 'upload')),
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Consent Forms (Initial consent-to-treat)
CREATE TABLE patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'initial_treatment',
  consent_text TEXT NOT NULL, -- Full consent form text shown to patient
  patient_signature_id UUID REFERENCES signatures(id),
  witness_signature_id UUID REFERENCES signatures(id), -- Optional witness
  consented_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Procedure Scope Definitions (which credentials can perform which procedures)
CREATE TABLE procedure_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT NOT NULL, -- CPT code or internal identifier
  procedure_name TEXT NOT NULL,
  allowed_credentials TEXT[] NOT NULL, -- ['MD', 'DO', 'PA', 'NP'] or ['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']
  category TEXT, -- 'debridement', 'wound_care', 'diagnostic', 'preventive'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedure_code)
);

-- Example seed data for procedure_scopes:
-- Sharp debridement: MD, DO, PA, NP only
-- Selective debridement: All credentials including RN, LVN
-- NPWT: All credentials
-- Application of wound dressings: All credentials
```

### Schema Updates for Version 3.0 (Multi-Tenancy)

**New Tables:**

```sql
-- User Roles Table (for tenant admin and facility admin)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'facility_admin', 'user')),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wound Notes Table (for per-wound timestamped notes)
CREATE TABLE wound_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_id UUID NOT NULL REFERENCES wounds(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Table (for SaaS multi-tenancy)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update users table to link to tenant and add credentials
ALTER TABLE auth.users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN credentials TEXT NOT NULL CHECK (credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin'));
```

### Key Schema Notes

1. **Authentication & Authorization**: Dual system - Administrative roles (tenant_admin, facility_admin, user) + Clinical credentials (RN, LVN, MD, DO, PA, NP, CNA, Admin)
2. **Multi-Tenancy**: SaaS-style multi-tenant architecture with tenant isolation
3. **Credentials System (v4.0)**: Required field on all users, determines clinical scope and signature requirements
4. **Signatures (v4.0)**: Three types - patient consent (one-time), patient acknowledgment (per visit for RN/LVN), provider certification (all visits)
5. **Visit Status Flow (v4.0)**: draft → ready_for_signature → signed → submitted (allows save progress + sign later)
3. **Multi-Facility Support**: Users can belong to multiple facilities via `UserFacilities` junction table, patients belong to one facility
4. **Patients & Wounds**: One patient can have multiple wounds (1:N) - **Wound-centric UI design**
5. **Visits**: Each visit is linked to a patient and can assess multiple wounds
6. **WoundAssessments**: Links a specific wound to a visit with all measurements (checkboxes/radio buttons for most fields)
7. **Wound Notes**: Per-wound timestamped notes with ability to add multiple notes during and after visits
8. **Flexible Fields**: Use JSONB for arrays (infection_signs, risk_factors) to avoid rigid schema
9. **Billing**: CPT/ICD-10 codes tracked per visit for time-based and procedure-based billing
10. **Audit Trail**: All tables include `created_at`, `updated_at`, and `created_by` for tracking
11. **Soft Deletes**: Use `status` and `is_active` fields instead of hard deletes for compliance

---

## Frontend Architecture

### Application Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx           # Login page
│   ├── signup/
│   │   └── page.tsx           # Tenant signup page (creates tenant + admin)
│   └── layout.tsx              # Auth layout (no sidebar)
│
├── (dashboard)/
│   ├── layout.tsx              # Main dashboard layout (sidebar, header)
│   ├── page.tsx                # Dashboard home (overview)
│   │
│   ├── patients/
│   │   ├── page.tsx            # Patient list (searchable table)
│   │   ├── [id]/
│   │   │   ├── page.tsx        # **WOUND-BASED PATIENT DETAIL** (Primary View)
│   │   │   │                   # Layout: Wound cards as primary content
│   │   │   │                   # Each wound shows: location, type, onset, status
│   │   │   │                   # Recent visit history per wound
│   │   │   │                   # Quick wound switcher
│   │   │   │                   # Per-wound notes with timestamps
│   │   │   │                   # Patient demographics in sidebar/header
│   │   │   ├── wounds/
│   │   │   │   ├── [woundId]/
│   │   │   │   │   └── page.tsx # Wound detail (history, photos, all visits)
│   │   │   │   └── new/
│   │   │   │       └── page.tsx # Add new wound to patient
│   │   │   └── visits/
│   │   │       ├── page.tsx    # All visits for patient (legacy view)
│   │   │       └── [visitId]/
│   │   │           └── page.tsx # Visit detail (multi-wound assessment)
│   │   └── new/
│   │       └── page.tsx        # Create new patient
│   │
│   ├── visits/
│   │   ├── new/
│   │   │   └── page.tsx        # Create new visit (select patient, then wounds)
│   │   └── [id]/
│   │       └── page.tsx        # **WOUND-BASED VISIT ASSESSMENT FORM**
│   │                           # Easy wound switcher (tabs or sidebar)
│   │                           # Per-wound notes section
│   │                           # Checkboxes for multi-select fields
│   │                           # Radio buttons for single-select fields
│   │                           # Add timestamped notes during/after visit
│   │
│   ├── billing/
│   │   └── page.tsx            # Billing reports dashboard (✅ Phase 6.5)
│   │
│   ├── calendar/
│   │   └── page.tsx            # **ENHANCED CALENDAR VIEW**
│   │                           # Google Calendar-style interaction
│   │                           # Modal on event click (not 404 redirect)
│   │                           # Drag-select to create new appointment
│   │                           # Modal shows: patient, visit, time, links
│   │
│   ├── reports/
│   │   ├── page.tsx            # Reports dashboard
│   │   ├── visit-summary/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # PDF export page for visit
│   │   └── wound-progress/
│   │       └── [woundId]/
│   │           └── page.tsx    # PDF export page for wound
│   │
│   ├── admin/                  # **NEW: Admin Management**
│   │   ├── users/
│   │   │   └── page.tsx        # User management (tenant/facility admins only)
│   │   ├── facilities/
│   │   │   └── page.tsx        # Facility management (tenant admin only)
│   │   └── invites/
│   │       └── page.tsx        # Invite users (tenant/facility admins)
│   │
│   └── settings/
│       └── page.tsx            # User settings, profile
│
└── actions/                    # Server Actions (Next.js 16)
    ├── patients.ts             # Patient CRUD actions
    ├── wounds.ts               # Wound CRUD actions (with notes)
    ├── wound-notes.ts          # **NEW: Per-wound timestamped notes**
    ├── visits.ts               # Visit CRUD actions
    ├── assessments.ts          # Assessment creation/update
    ├── billing.ts              # Billing CRUD and reports (✅ Phase 6.5)
    ├── photos.ts               # Photo upload to Supabase Storage
    ├── auth.ts                 # **UPDATED: Role-based auth actions**
    ├── admin.ts                # **NEW: User/facility management actions**
    └── reports.ts              # PDF generation and export

components/
├── ui/                         # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── textarea.tsx
│   ├── dialog.tsx
│   ├── modal.tsx               # **NEW: Calendar event modal**
│   ├── table.tsx
│   ├── calendar.tsx
│   └── ...
│
├── forms/                      # Custom form components
│   ├── patient-form.tsx
│   ├── wound-assessment-form.tsx  # **UPDATED: Checkboxes/radio buttons**
│   ├── treatment-plan-form.tsx
│   └── preventive-orders-form.tsx
│
├── wounds/                     # **NEW: Wound-specific components**
│   ├── wound-card.tsx          # Wound card for patient detail page
│   ├── wound-switcher.tsx      # Easy wound switcher in assessment form
│   ├── wound-notes.tsx         # Per-wound timestamped notes display
│   ├── wound-note-form.tsx     # Add new note to wound
│   └── wound-timeline.tsx      # Visit timeline per wound
│
├── billing/                    # Billing components (✅ Phase 6.5)
│   ├── billing-form.tsx        # Searchable billing code form
│   └── billing-reports-client.tsx # Billing reports with filtering
│
├── layout/
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── breadcrumbs.tsx
│
├── calendar/                   # Calendar components
│   ├── visit-calendar.tsx     # **UPDATED: React Big Calendar wrapper**
│   ├── calendar-event-modal.tsx # **NEW: Modal for event details**
│   ├── calendar-event.tsx     # Custom event rendering
│   └── calendar-toolbar.tsx   # Custom toolbar
│
├── admin/                      # **NEW: Admin components**
│   ├── user-management.tsx    # User list with role assignment
│   ├── invite-user-form.tsx   # Invite user with role selection
│   └── facility-assignment.tsx # Assign users to facilities
│
├── pdf/                        # PDF generation components
│   ├── visit-summary-pdf.tsx
│   ├── wound-progress-pdf.tsx
│   └── pdf-export-button.tsx
│
└── features/                   # Feature-specific components
    ├── wound-comparison-chart.tsx
    ├── photo-gallery.tsx
    ├── visit-timeline.tsx
    └── healing-progress-indicator.tsx

lib/
├── supabase/
│   ├── server.ts               # Server-side Supabase client
│   ├── client.ts               # Client-side Supabase client
│   └── middleware.ts           # **UPDATED: Role-based auth middleware**
├── database.types.ts           # Generated TypeScript types from Supabase
├── validations/
│   ├── patient.ts              # Zod schemas for patient data
│   ├── wound.ts                # Zod schemas for wound data
│   ├── wound-note.ts           # **NEW: Wound note validation**
│   └── visit.ts                # Zod schemas for visit data
├── billing-codes.ts            # Common CPT/ICD-10/Modifier codes (✅ Phase 6.5)
├── rbac.ts                     # **NEW: Role-based access control utilities**
└── utils/
    ├── calculations.ts         # Wound area, healing rate calculations
    ├── formatters.ts           # Date, number formatting
    ├── constants.ts            # Dropdown options, enums
    └── pdf-generator.ts        # PDF generation utilities
```

### Key UI Components & Workflows

#### 1. **WOUND-BASED PATIENT DETAIL PAGE** (Primary View - REDESIGNED)

**Layout Philosophy:** Wounds are the primary focus, not visits.

**Top Section:** Patient Header

- Patient name, MRN, DOB, facility
- Quick stats: Total wounds (active/healed), last visit date
- Quick actions: New Visit, Edit Patient, Export PDF

**Main Content:** Wound Cards (Grid/List View)

- Each wound displays as a prominent card:
  - **Wound header**: Location, type, onset date, days since onset
  - **Status badge**: Active, Healing, Stable, Healed
  - **Latest measurements**: L×W×D, area trend (↑↓→)
  - **Latest photo thumbnail** (click to expand gallery)
  - **Recent visit summary**: Last assessed date, healing status
  - **Per-wound notes section** with timestamps
  - **Actions**: View full history, Add note, Mark healed
- Sort by: Most recent activity, oldest wound, location
- Filter by: Active only, all wounds, healed

**Sidebar/Secondary Panel:**

- Patient demographics (collapsible)
- Medical history, allergies
- Contact information
- Emergency contact

**Wound Notes Feature:**

- Each wound card shows most recent note
- Click to expand full note history (timestamped)
- Add new note inline (saves with timestamp and user)
- Notes persist across visits
- Color-coded by author (for multi-user facilities)

**Recent Visits Per Wound:**

- Timeline view within each wound card
- Shows last 3-5 visits with:
  - Date, visit type (in-person/telemed)
  - Healing status change
  - Measurement changes
  - Quick link to full visit detail
- "View all visits" link expands full timeline

#### 2. **WOUND-BASED VISIT ASSESSMENT FORM** (REDESIGNED)

**Layout:** Multi-wound assessment made easy

**Top Bar:** Visit Info

- Patient name, visit date/time, visit type
- Progress indicator: "Assessing wound 2 of 4"
- Save draft / Complete visit buttons

**Wound Switcher** (Easy Navigation)

- **Tab-based switcher** (for 2-5 wounds) OR
- **Sidebar list** (for 6+ wounds)
- Each tab/item shows: Wound name, location, completion status (✓)
- Click to switch between wounds instantly
- Auto-save when switching wounds

**Assessment Form** (Per Wound)

**Section 1: Measurements**

- Length × Width × Depth (numeric inputs)
- Undermining, tunneling (text inputs with position clock reference)
- Tissue composition:
  - **Checkboxes** (multi-select): Epithelial, Granulation, Slough, Necrotic, Eschar
  - Percentage sliders for each selected tissue type

**Section 2: Wound Characteristics**

- Wound type: **Radio buttons** (single select)
  - Pressure Injury, Diabetic, Venous, Arterial, Surgical, etc.
- Pressure stage (if applicable): **Radio buttons**
  - Stage 1, 2, 3, 4, Unstageable, DTPI
- Healing status: **Radio buttons**
  - Initial, Healing, Same/Stable, Declined, Healed, Sign Off
- Exudate amount: **Radio buttons** (None, Scant, Moderate, Large)
- Exudate type: **Checkboxes** (Serous, Sanguineous, Purulent, etc.)

**Section 3: Assessment Details**

- Odor: **Radio buttons** (None, Mild, Moderate, Strong, Foul)
- Pain level: Numeric slider (0-10)
- Periwound condition: **Checkboxes** (Intact, Macerated, Erythema, Edema, Induration)
- Infection signs: **Checkboxes** (Increased warmth, Purulent drainage, Delayed healing, etc.)
- Risk factors: **Checkboxes** (Diabetes, Incontinence, Limited mobility, Poor nutrition, etc.)

**Section 4: Treatment Selection**

- **Left Panel:** Treatment checkboxes by category (collapsible sections)
  - Primary dressings (hydrogel, foam, alginate, etc.)
  - Secondary dressings (gauze, transparent film, etc.)
  - Antimicrobials (silver, iodine, etc.)
  - Debridement (enzymatic, autolytic, etc.)
  - Advanced therapies (NPWT, collagen, etc.)
  - Compression (UNNA boot, wraps, etc.)
- **Right Panel:** Auto-generated treatment orders (yellow highlights)
  - Pre-filled instructions based on selections
  - Editable text areas for customization
  - Frequency dropdowns per treatment

**Section 5: Wound Notes**

- Large text area for visit-specific notes
- Auto-timestamps when saved
- Displays all previous notes below (collapsible)
- Shows author, timestamp, note content

**Section 6: Photo Upload**

- Drag-and-drop photo zone
- Preview uploaded photos
- Caption per photo (optional)
- Compare with previous photos (side-by-side viewer)

**Footer Actions:**

- Previous wound / Next wound buttons
- Save draft (partial completion)
- Complete assessment (marks wound as assessed for this visit)
- Complete visit (when all wounds assessed)

#### 3. Wound Comparison View

- Side-by-side comparison of 2+ visits
- Before/after photos
- Measurement trends (line chart)
- Healing trajectory indicator

#### 4. Photo Gallery

- Grid view of all photos for a wound
- Lightbox for full-screen viewing
- Date stamps
- Compare mode (side-by-side)

#### 5. **ENHANCED CALENDAR VIEW** (Google Calendar-Style)

**Main Features:**

- Month, week, day views
- Color-coded events by status (scheduled, completed, cancelled)
- Drag-and-drop to reschedule appointments
- Filter by patient, facility, provider

**NEW: Event Click Behavior**

- **Modal opens** (not page redirect) when clicking calendar event
- Modal displays:
  - Patient name + photo (if available)
  - Visit date and time
  - Visit type (in-person/telemed)
  - Visit status (scheduled, completed, etc.)
  - Wounds to be assessed (list)
  - Assigned provider/clinician
  - Location/facility
  - Actions:
    - "View Patient" button → `/patients/[id]`
    - "View Visit Details" button → `/visits/[id]`
    - "Edit Appointment" button (inline edit: date, time, notes)
    - "Cancel Appointment" button
    - Close modal button

**NEW: Create Appointment (Google Calendar-Style)**

- **Drag-select** time slot on calendar (e.g., Monday 2pm-3pm)
- Modal opens: "New Appointment"
  - Quick patient search (autocomplete dropdown)
  - Select patient → Auto-loads active wounds
  - Select wounds to assess (checkboxes)
  - Set visit type (in-person/telemed)
  - Add notes (optional)
  - Save button creates appointment
- **Alternative**: Click empty time slot → Same modal opens
- **Fallback**: If drag-select is complex, simple click-to-create is acceptable

**Error Handling:**

- 404 error fixed: Calendar events link to modal, not direct page URLs
- Graceful error messages if patient/visit data missing

---

## Key Features & Workflows

### Workflow 1: New Patient Visit (Wound-Based)

1. **Start Visit**
   - From calendar: Click time slot → Select patient → Create visit
   - From patient detail: Click "New Visit" button
   - System creates visit record (status: incomplete)

2. **Wound Selection**
   - View all active wounds for patient
   - Select which wounds to assess this visit (checkboxes)
   - Option to add new wound if needed

3. **Wound Assessment** (Per Wound)
   - Use wound switcher (tabs/sidebar) to navigate between wounds
   - For each wound:
     - Record measurements (L×W×D)
     - **Upload photos directly in assessment form** (linked to this assessment)
     - View photo comparison with previous assessments
     - Document tissue composition (checkboxes + percentages)
     - Select wound characteristics (radio buttons)
     - Note healing status (radio buttons)
     - Check infection signs, risk factors (checkboxes)
     - Add per-wound notes (timestamped)
   - Auto-save when switching wounds (every 30s to localStorage, every 2min to server)
   - Completion indicator (✓) for each assessed wound
   - Photos automatically linked via `assessment_id` for proper timeline tracking

4. **Treatment Planning** (Multi-Wound)
   - Select treatment options from checklist (checkboxes)
   - System auto-generates treatment orders
   - Customize instructions as needed
   - Set frequency and schedule per treatment
   - Treatment plan can apply to all wounds or specific wounds

5. **Preventive Orders**
   - Select applicable recommendations (checkboxes)
   - Specify details (e.g., cushion type)

6. **Follow-Up**
   - Schedule next appointment (opens calendar modal) OR
   - Mark for discharge (radio buttons)

7. **Complete Visit**
   - Review summary (all wounds assessed confirmation)
   - Save (status: complete)
   - Option to print/export PDF

### Workflow 2: Add Per-Wound Notes (Anytime)

1. **From Patient Detail Page**
   - Navigate to patient → wound card
   - Click "Add Note" button on wound card
   - Enter note in text area
   - Note auto-timestamps with user info
   - Saves to `wound_notes` table

2. **During Visit Assessment**
   - While assessing wound, add notes in "Wound Notes" section
   - Notes tied to both wound and visit
   - Multiple notes can be added throughout visit

3. **After Visit (Addendum)**
   - Navigate to patient → wound card
   - View recent visit details
   - Click "Add Note" to append post-visit note
   - Note shows timestamp and "Addendum" badge
   - Increments `visit.number_of_addenda` if tied to visit

### Workflow 3: Add New Wound to Existing Patient

1. Navigate to patient detail page
2. Click "Add Wound" button (prominent placement)
3. Fill out wound creation form:
   - Location (dropdown or body diagram)
   - Wound type (radio buttons)
   - Onset date (date picker)
   - Initial notes (optional)
4. Save wound
5. Wound appears as new card in patient's wound list (marked "New - Not Yet Assessed")

### Workflow 4: Compare Wound Progress

1. Navigate to wound card on patient detail page
2. Click "View History" or "Compare" button
3. Select 2+ visits from timeline
4. View side-by-side comparison:
   - Photos (before/after slider)
   - Measurements (table + line chart)
   - Tissue composition (pie charts)
   - Healing status progression
   - Treatment changes
5. Export comparison report (PDF)

### Workflow 5: Mark Wound as Healed

1. During visit assessment, select "Healed" healing status (radio button)
2. System prompts: "Archive this wound?"
3. Confirm
4. Wound status updated to `healed`
5. Wound card moves to "Healed Wounds" section (collapsible)
6. No longer appears in active wound list
7. Full history retained (read-only)

### Workflow 6: Calendar Appointment Management

**View Appointments:**

- Navigate to `/calendar`
- Switch between month/week/day views
- Filter by patient, facility, or provider

**Click Existing Appointment:**

- Modal opens (not page redirect)
- View patient, visit, time details
- Quick links to patient detail or visit detail
- Edit/cancel options inline

**Create New Appointment (Google Calendar-Style):**

- **Method 1**: Drag-select time range on calendar
- **Method 2**: Click empty time slot
- Modal opens with new appointment form:
  - Search/select patient
  - Select wounds to assess
  - Set visit type (in-person/telemed)
  - Add notes
  - Save creates appointment

### Workflow 7: Multi-Tenant Access Management

**Tenant Admin Workflow:**

1. Sign up creates new tenant
2. Tenant admin can:
   - Create facilities
   - Invite other admins (tenant-level or facility-level)
   - Assign users to facilities
   - View all data across all facilities

**Invite User:**

1. Navigate to `/admin/invites`
2. Enter email address
3. Select role:
   - Tenant Admin (full access)
   - Facility Admin (single facility access)
   - User (basic access)
4. If Facility Admin/User: Select facility assignment
5. Send invite email
6. User signs up and auto-assigned to tenant + role

**Facility Admin Workflow:**

1. Facility admin logs in
2. Can only view/manage data within assigned facility
3. Can invite users within their facility (Users role only)
4. Cannot create new facilities or manage other facilities

**User Workflow:**

1. Regular user logs in
2. Can view/manage data within assigned facilities
3. Cannot invite other users or manage settings

---

## Technology Stack

### Frontend

- **Framework**: Next.js 16 (App Router with Server Components)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Forms**: React Hook Form + Zod validation + Server Actions
- **State Management**: React Server Components (minimize client state)
- **Icons**: Lucide React
- **Charts**: Recharts or Chart.js
- **Calendar**: React Big Calendar with Google Calendar sync
- **PDF Generation**: @react-pdf/renderer (server-side)
- **Date Picker**: react-day-picker
- **Photo Upload**: react-dropzone + Supabase Storage

### Backend & Database

- **Data Fetching**: Server Components with async/await (direct DB queries)
- **Mutations**: Server Actions with `"use server"` directive
- **Database**: Supabase PostgreSQL with auto-generated TypeScript types
- **Query Layer**: Supabase JS client (@supabase/supabase-js)
- **Type Safety**: Generated types via Supabase CLI (`npm run db:types`)
- **Authentication**: Supabase Auth (email/password only)
- **File Storage**: Supabase Storage (CDN-backed, HIPAA-compliant)
- **CSV Export**: Custom implementation (no external library)

### DevOps & Deployment

- **Hosting**: Vercel
- **Environment Variables**: .env.local for Supabase credentials
- **CI/CD**: GitHub Actions (optional)
- **Monitoring**: Vercel Analytics + Sentry (error tracking)
- **Database Backups**: Automated daily (via Supabase)

### Development Tools

- **TypeScript**: Strict mode
- **Linting**: ESLint (flat config)
- **Formatting**: Prettier + Tailwind plugin
- **Testing** (future): Vitest + React Testing Library
- **E2E Testing** (future): Playwright

---

## Implementation Phases

### Phase 1: Foundation & Setup (Weeks 1-2)

**Goal:** Set up infrastructure and core models

- [ ] Supabase project setup (database + auth + storage)
- [x] Supabase project setup with PostgreSQL
- [x] SQL schema migration applied (00001_initial_schema.sql)
- [x] RLS policies configured for all tables
- [x] TypeScript types generated from database
- [ ] Supabase Auth integration (email/password)
- [ ] Basic patient CRUD with Server Actions
- [ ] Basic UI layout (sidebar, header, navigation)
- [ ] Patient list page with search (Server Component)

**Deliverable:** Can create patients and navigate the app

---

### Phase 2: Wound & Visit Management (Weeks 3-4)

**Goal:** Core wound tracking functionality

- [ ] Wound CRUD operations
- [ ] Add/remove wounds from patient
- [ ] Visit creation and management
- [ ] Link wounds to visits
- [ ] Basic wound assessment form (measurements only)

**Deliverable:** Can create visits and record basic wound data

---

### Phase 3: Assessment Form (Weeks 5-6)

**Goal:** Full assessment form matching Aprima functionality

- [ ] Complete wound assessment form with all fields
- [ ] Treatment options checklist
- [ ] Auto-generated treatment orders
- [ ] Preventive recommendations
- [ ] Follow-up planning
- [ ] Form validation and error handling

**Deliverable:** Can complete full wound assessment workflow

---

### Phase 4: Photo Management (Week 7)

**Goal:** Photo upload and viewing

- [x] Photo upload component (react-dropzone)
- [x] Supabase Storage integration
- [x] Photo gallery per wound
- [x] Photo comparison view (side-by-side)
- [x] Secure photo URLs with RLS policies
- [x] **Assessment-based photo upload** (November 21, 2025)
  - Photos uploaded during assessment creation
  - Automatic linking via `assessment_id`
  - Each assessment has its own photos
  - Wound page shows historical photos (view-only)
- [x] **Photo labels in PDFs** (Phase 9.3.4)
  - Format: "Wound #X - Location (Type)"
  - Teal branding with professional styling

**Deliverable:** Can upload and view wound photos, properly linked to assessments

**Status:** ✅ **COMPLETED & ENHANCED** (November 21, 2025)

---

### Phase 5: Calendar & Scheduling (Week 8)

**Goal:** Visual appointment management

- [ ] Calendar view integration (React Big Calendar)
- [ ] Display scheduled visits on calendar
- [ ] Create new visit from calendar
- [ ] Reschedule appointments (drag-and-drop)
- [ ] Filter by patient, facility, provider
- [ ] Color-code visits by status

**Deliverable:** Can manage appointments via calendar interface

---

### Phase 6: PDF Export & Reporting (Week 9)

**Goal:** Professional document generation

- [x] PDF generation library integration (@react-pdf/renderer)
- [x] Visit summary PDF export
- [x] Wound progress report with photos
- [x] Treatment plan PDF for facilities
- [x] Custom date range reports
- [x] CSV export for external systems (custom implementation)
- [x] Batch report generation

**Deliverable:** Can generate and download professional PDF reports

**Status:** ✅ **COMPLETED** (October 29, 2025)

---

### Phase 6.5: Billing System (Week 9-10)

**Goal:** Comprehensive billing documentation and reporting

- [x] Billing table with CPT codes, ICD-10 codes, modifiers, time tracking
- [x] Searchable dropdown form for common wound care CPT codes (30+ codes)
- [x] Searchable dropdown form for common ICD-10 diagnosis codes (40+ codes)
- [x] Searchable dropdown form for billing modifiers (20+ codes)
- [x] Custom code entry for non-standard codes
- [x] Billing form integration into visit creation workflow
- [x] Billing form integration into visit edit workflow
- [x] Display billing codes on visit detail page
- [x] Billing reports dashboard with filtering
- [x] Filter billing by date range, facility, patient
- [x] CSV export for insurance submissions
- [x] Billing statistics (total visits, total codes)
- [x] Include billing in Visit Summary PDF

**Deliverable:** Complete billing documentation and reporting system

**Status:** ✅ **COMPLETED** (October 30, 2025)

---

### Phase 7: Analytics & Polish (Week 10)

**Goal:** Production-ready system

- [ ] Wound healing rate calculations
- [ ] Dashboard charts and metrics
- [ ] Mobile/tablet responsiveness testing (desktop primary)
- [ ] Performance optimization (lazy loading, image optimization)
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] User testing with clinician
- [ ] Bug fixes
- [ ] Documentation (user guide)

**Deliverable:** Production-ready EHR system

---

### Phase 8: Wound-Based UX Redesign & RBAC (Week 11-12) ⭐ NEW

**Goal:** Implement wound-centric UI and multi-tenant access management

**8.1: Multi-Tenant RBAC (Week 11)**

- [ ] Create `tenants` table with subdomain support
- [ ] Create `user_roles` table (tenant_admin, facility_admin, user)
- [ ] Create `wound_notes` table for per-wound timestamped notes
- [ ] Update auth middleware for role-based access control
- [ ] Implement RLS policies for tenant isolation
- [ ] Add `tenant_id` foreign key to facilities, users
- [ ] Build tenant signup flow (creates tenant + admin)
- [ ] Build invite system (email invites with role assignment)
- [ ] Create `/admin/users` page (user management)
- [ ] Create `/admin/facilities` page (tenant admin only)
- [ ] Create `/admin/invites` page (send invites with role selection)
- [ ] Implement role badges in UI
- [ ] Add facility admin restrictions (can only invite users, view assigned facility)
- [ ] Test tenant isolation (users cannot see other tenant data)

**Deliverable:** Full multi-tenant SaaS with role-based access control

**8.2: Wound-Based Patient Detail Page (Week 11)**

- [ ] Redesign patient detail page layout (wound cards as primary content)
- [ ] Build wound card component (location, type, status, measurements, photo)
- [ ] Implement per-wound notes display with timestamps
- [ ] Build "Add Note" inline form for wound cards
- [ ] Create wound notes action handlers (create, read)
- [ ] Display recent visit history within each wound card (last 3-5 visits)
- [ ] Add wound sorting (recent activity, oldest, location)
- [ ] Add wound filtering (active only, all, healed)
- [ ] Move patient demographics to sidebar/header (collapsible)
- [ ] Add quick actions per wound (View History, Add Note, Mark Healed)
- [ ] Implement wound status badges (Active, Healing, Stable, Healed)
- [ ] Add measurement trend indicators (↑↓→)
- [ ] Build healed wounds collapsible section
- [ ] Test multi-wound patient scenarios (2-10 wounds)

**Deliverable:** Wound-centric patient detail page

**8.3: Wound-Based Visit Assessment Form (Week 12)**

- [ ] Build wound switcher component (tabs for 2-5 wounds, sidebar for 6+)
- [ ] Implement auto-save when switching wounds
- [ ] Add progress indicator (wound X of Y, completion checkmarks)
- [ ] Convert dropdowns to checkboxes (tissue types, exudate types, periwound, infection signs, risk factors)
- [ ] Convert dropdowns to radio buttons (wound type, pressure stage, healing status, exudate amount, odor)
- [ ] Build per-wound notes section in assessment form
- [ ] Implement multiple timestamped notes per wound during visit
- [ ] Add Previous/Next wound navigation buttons
- [ ] Update treatment plan form to support per-wound treatments
- [ ] Add completion status tracking per wound
- [ ] Implement "Save Draft" for partial assessments
- [ ] Build "Complete Assessment" action per wound
- [ ] Update "Complete Visit" to require all wounds assessed
- [ ] Test rapid wound switching with auto-save

**Deliverable:** Efficient multi-wound assessment workflow

**8.4: Enhanced Calendar with Modal (Week 12)**

- [ ] Build calendar event modal component
- [ ] Fix 404 error (event click opens modal, not page navigation)
- [ ] Display patient info, visit details, time in modal
- [ ] Add quick links (View Patient, View Visit Details) in modal
- [ ] Add inline edit/cancel actions in modal
- [ ] Implement drag-select time range detection
- [ ] Build new appointment modal (opens on drag-select or click)
- [ ] Add patient search autocomplete in new appointment modal
- [ ] Add wound selection checkboxes (auto-load patient's active wounds)
- [ ] Add visit type selection (in-person/telemed)
- [ ] Connect new appointment modal to create visit action
- [ ] Test drag-select on different time scales (hour, day, week)
- [ ] Add fallback: simple click-to-create if drag-select too complex
- [ ] Update calendar event rendering (show patient name + wound count)

**Deliverable:** Google Calendar-style appointment management

**Status:** ✅ **PHASE 8 COMPLETED** (November 13, 2025)

---

### Phase 9: Compliance & Signatures (Weeks 13-16) ✅ **COMPLETED**

**Goal:** Implement credentials-based role system, electronic signatures, and compliance workflows

**Overall Status:** Phase 9.1 and 9.2 COMPLETED (November 2025). Phase 9.3 pending.

**9.1: Credentials-Based Role System (Week 13)** ✅ **COMPLETED & DEPLOYED**

- [x] Create migration 00008: Add `credentials` field to `users` table
  - [x] Field type: TEXT NOT NULL
  - [x] CHECK constraint: credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin')
  - [x] Backfill existing users with default credentials
- [x] Update `lib/database.types.ts` (run `npm run db:types`)
- [x] Update invite system to capture credentials
  - [x] Add credentials dropdown to invite form (components/admin/invites-management-client.tsx)
  - [x] Validate credentials required when inviting
  - [x] Store credentials in user record on signup
- [x] Update user management UI
  - [x] Display "Role + Credentials" column (e.g., "Facility Admin (RN)")
  - [x] Add credentials field to user edit form
  - [x] Show credentials badges with icons
- [x] Update RBAC utilities (lib/rbac.ts)
  - [x] Add `getUserCredentials()` function
  - [x] Add credential type definitions
- [x] Update existing user records
  - [x] Create admin script to set credentials for current users
  - [x] Test with different credential types
- [x] Test invite flow end-to-end with new credentials field

**Deliverable:** ✅ All users have required credentials field, visible in admin UI, captured during invite
**Status:** DEPLOYED to production (November 2025)

---

**9.2: Electronic Signatures & Compliance (Week 14-15)**

**9.2.1: Signature Infrastructure (Days 1-3)** ✅ **COMPLETED**

- [x] Create `signatures` table migration (00014)
  - [x] Fields: signature_type, visit_id, patient_id, signer_name, signer_role, signature_data, signature_method, ip_address, signed_at
  - [x] Indexes on visit_id and patient_id
- [x] Create `patient_consents` table migration (00014)
  - [x] Fields: patient_id, consent_type, consent_text, patient_signature_id, witness_signature_id, consented_at
  - [x] Index on patient_id
- [x] Build digital signature pad component (components/signatures/signature-pad.tsx)
  - [x] Dual-mode: Canvas drawing + typed signature
  - [x] Clear and undo buttons
  - [x] Responsive sizing for mobile/tablet
  - [x] Export as base64 PNG
- [x] Build typed signature component (integrated in signature-pad.tsx)
  - [x] Text input + "I agree" checkbox
  - [x] Timestamp display
- [x] Create signature actions (app/actions/signatures.ts)
  - [x] createPatientConsent()
  - [x] signVisit()
  - [x] addPatientSignature()
  - [x] submitVisit()
  - [x] requiresPatientSignature()

**9.2.2: Initial Consent Form (Days 4-5)** ✅ **COMPLETED**

- [x] Build initial consent dialog (components/patients/consent-dialog.tsx)
  - [x] Two-step workflow: consent text → signature
  - [x] Full consent text with scroll
  - [x] Patient signature pad (dual-mode)
  - [x] Cannot dismiss until signed
  - [x] Fixed layout issues (removed conflicting prose classes)
- [x] Integrate consent check in patient detail page
  - [x] Query patient_consents on page load
  - [x] Show consent dialog if no consent exists
  - [x] Block visit creation until consent completed
- [x] Create consent actions (integrated in app/actions/signatures.ts)
  - [x] createPatientConsent()
  - [x] getPatientConsent(patientId)
  - [x] Consent signature stored with audit trail

**9.2.3: Visit Signature Workflow (Days 6-10)** ✅ **COMPLETED & TESTED**

- [x] Update visits table migration (00014)
  - [x] Add `clinician_name` TEXT
  - [x] Add `clinician_credentials` TEXT
  - [x] Add `requires_patient_signature` BOOLEAN
  - [x] Add `provider_signature_id` UUID FK
  - [x] Add `patient_signature_id` UUID FK
  - [x] Add `signed_at` TIMESTAMPTZ
  - [x] Add `submitted_at` TIMESTAMPTZ
  - [x] Update status enum: draft, ready_for_signature, signed, submitted (migration 00015)
- [x] Update visit form to pre-fill clinician fields from user profile
- [x] Build visit signature workflow component (components/visits/visit-signature-workflow.tsx)
  - [x] Dynamic buttons based on status
  - [x] Status-based conditional rendering
  - [x] Integrated with visit detail page
- [x] Build "Save Draft" functionality
  - [x] Default status='draft' for new visits
  - [x] No validation required
  - [x] Shows last saved timestamp
- [x] Build "Ready for Signature" action
  - [x] Validates all required fields
  - [x] Changes status to 'ready_for_signature'
  - [x] Auto-sets requires_patient_signature based on credentials
- [x] Build patient signature modal (components/signatures/patient-signature-modal.tsx)
  - [x] Shows visit summary
  - [x] Acknowledgment text
  - [x] Signature pad (dual-mode)
  - [x] Only shown for RN/LVN credentials
  - [x] Blocks provider signature until captured
- [x] Build provider signature flow
  - [x] Integrated in visit detail page
  - [x] Read-only visit summary before signing
  - [x] Certification text
  - [x] Signature pad (dual-mode)
  - [x] IP address captured automatically
  - [x] Updates visit: signed_at, provider_signature_id, status='signed'
- [x] Build "Submit to Office" action
  - [x] Updates visit: submitted_at, status='submitted'
  - [x] Final status, locks from editing
- [x] Read-only enforcement
  - [x] Hide Edit button for signed/submitted visits
  - [x] Hide Add Assessment buttons
  - [x] Form fields become read-only
- [x] Test complete workflow:
  1. ✅ Save multiple drafts
  2. ✅ Mark ready for signature
  3. ✅ (MD) Provider signature only
  4. ✅ (RN/LVN) Patient signature → Provider signature
  5. ✅ Submit to office
  6. ✅ Verify read-only enforcement
  7. ✅ PDF exports include signatures

**Deliverable:** ✅ Complete signature workflow with role-based requirements and visit status management
**Status:** TESTED locally (November 19, 2025), ready for production deployment

---

**9.3: High-Priority Compliance & Client Requirements (Week 16-17)** 🔴 **IN PROGRESS**

**Goal:** Address critical client requirements from November 19, 2025 feedback

**Client Requirements Source:** See `CLIENT_REQUIREMENTS_ANALYSIS.md` for detailed gap analysis

---

**9.3.1: Procedure Restrictions by Credential** ✅ **COMPLETED - November 20, 2025**

**Client Need:** RN/LVN cannot perform or document sharp debridement (CPT 11042-11047)

**Status:** Fully implemented and tested. Migration 00018 deployed. RN/LVN users blocked from CPT codes 11042-11047. MD/DO/PA/NP users have full access. Server-side validation enforced. All 9 RLS issues resolved. See `docs/PHASE_9.3.1_COMPLETION.md` for detailed report.

- [x] Create `procedure_scopes` table migration (00018)
  ```sql
  CREATE TABLE procedure_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_code TEXT NOT NULL UNIQUE,
    procedure_name TEXT NOT NULL,
    allowed_credentials TEXT[] NOT NULL,
    category TEXT CHECK (category IN ('debridement', 'wound_care', 'diagnostic', 'preventive')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [x] Seed initial procedure scope data (13 procedures total)
  - [x] Sharp debridement (11042, 11043, 11044, 11045, 11046, 11047): `['MD', 'DO', 'PA', 'NP']` ONLY
  - [x] Selective debridement (97597, 97598): `['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']` ALL
  - [x] NPWT (97605, 97606, 97607, 97608): `['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']` ALL
  - [x] Wound care (97602): `['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']` ALL
- [x] Create procedure utilities (`lib/procedures.ts`)
  - [x] `getAllowedProcedures(credentials)` - returns filtered list
  - [x] `getRestrictedProcedures(credentials)` - list of blocked procedures
  - [x] `validateBillingCodes(credentials, codes)` - server validation with errors
  - [x] `checkMultipleProcedures(credentials, codes)` - batch validation
- [x] Update billing form (`components/billing/billing-form-with-credentials.tsx`)
  - [x] Filter CPT code dropdown by current user credentials
  - [x] Warning banner for restricted users
  - [x] Restricted procedures section showing blocked codes
  - [x] Visual indicators and color coding
- [x] Update multi-wound assessment form
  - [x] Integrated credential-aware billing form
  - [x] Per-wound billing code selection with restrictions
- [x] Add server-side validation in billing actions (`app/actions/billing.ts`)
  - [x] Verify credentials before saving CPT codes
  - [x] Query procedure_scopes table via RPC
  - [x] Return error: "Credential restriction: [codes] require [credentials]"
- [x] Fix all RLS issues (9 locations)
  - [x] Use service role client for admin operations
  - [x] Use RPC functions for credential lookups
  - [x] Prevent Row Level Security errors
- [x] Test with different credentials (7 test users created)
  - [x] RN user: Cannot see/select sharp debridement CPT codes ✅
  - [x] LVN user: Cannot see/select sharp debridement CPT codes ✅
  - [x] MD user: Can see and select all procedures ✅
  - [x] PA, DO, NP users: Full access verified ✅
  - [x] Verify server rejects RN/LVN attempts to submit restricted codes ✅

**Deliverable:** ✅ Credential-based procedure filtering preventing out-of-scope documentation

**Actual Effort:** 5 days (November 15-20, 2025)

---

**9.3.2: Autosave - Client-Side & Server-Side** ⚠️ **HIGH PRIORITY - FIELD USABILITY**

**Client Need:** Prevent data loss during field visits with poor internet connectivity

- [ ] **Client-Side Autosave (localStorage)**
  - [ ] Create `useAutosave` custom hook
  - [ ] Auto-save form state to localStorage every 30 seconds
  - [ ] Key format: `draft_visit_${visitId}_${timestamp}`
  - [ ] Store: Form fields, wound assessments, photo thumbnails (base64)
  - [ ] Build draft recovery modal component
    - [ ] Detect unsaved drafts on page load
    - [ ] Show "Unsaved Draft Found" modal with timestamp
    - [ ] Options: "Restore", "Discard", "View Both" (side-by-side comparison)
  - [ ] Clear localStorage after successful submission
  - [ ] Add keyboard shortcut: Ctrl+S for manual save
  
- [ ] **Server-Side Autosave (Database)**
  - [ ] Implement auto-submit to server every 2 minutes
  - [ ] Use visit status='draft' for auto-saved visits
  - [ ] Optimistic UI updates (instant feedback)
  - [ ] Toast notification: "Draft saved at [time]"
  - [ ] Debounce logic to prevent excessive saves
  
- [ ] **Save Status Indicator Component**
  - [ ] Position: Top-right corner of forms
  - [ ] States: 
    - Saving (spinner + "Saving...")
    - Saved (green checkmark + "Last saved: X minutes ago")
    - Error (red X + "Save failed. Retry?")
  - [ ] Manual save button next to indicator
  
- [ ] **Multi-Wound Assessment Autosave**
  - [ ] Save current wound when switching to another wound
  - [ ] Show save indicator per wound in switcher
  - [ ] Auto-save assessment data on field blur
  
- [ ] **Testing**
  - [ ] Test: Fill form → Refresh browser → Verify recovery modal
  - [ ] Test: Fill form → Close tab → Reopen → Verify draft restored
  - [ ] Test: Save draft → Wait 30 sec → Verify localStorage updated
  - [ ] Test: Server autosave every 2 minutes with network throttling
  - [ ] Test: Keyboard shortcut Ctrl+S triggers manual save

**Deliverable:** Robust autosave preventing data loss in unreliable network conditions

**Estimated Effort:** 3-4 days

---

**9.3.3: Photo Labeling with Wound Location** ✅ **COMPLETED** (November 21, 2025)

**Client Need:** Photos in printed visit notes should clearly show which wound they belong to

**Implementation:**
- [x] Update PDF wound progress component (`components/pdf/wound-progress-pdf.tsx`)
  - [x] Add wound label above each photo
  - [x] Format: "Wound #X - Location" (e.g., "Wound #2 - Left Heel")
  - [x] Include wound type below: "(Pressure Injury)"
  - [x] Teal color scheme matching app branding
  
- [x] Update photo query logic (`app/actions/pdf.ts`)
  - [x] Include wound metadata (number, location, type)
  - [x] Pass metadata to PDF component
  - [x] TypeScript types updated
  
- [x] **Photo Upload Workflow Refactored** (November 21, 2025)
  - [x] Moved photo upload from wound page to assessment form
  - [x] Photos now automatically linked to `assessment_id`
  - [x] Each assessment has its own photos (no duplication)
  - [x] Wound page shows historical photos (view-only)
  - [x] PDF query simplified: filter by `assessment_id` only
  
- [x] Test PDF exports
  - [x] Single wound with multiple photos
  - [x] Multiple wounds with photos each
  - [x] Verify wound location labels appear correctly

**Deliverable:** Professional PDF reports with clear photo labeling and assessment-based photo workflow

**Actual Effort:** 1 day (as estimated)

---

**9.3.5: Upload Scanned Paper Consents** ✅ **COMPLETED** (November 23, 2025)

**Client Need:** Digitize pre-existing paper consent forms signed before electronic system deployed

- ✅ Database migration 00019 created
  - Added `consent_document_url`, `consent_document_name`, `consent_document_size` to patient_consents
  - Updated signatures constraint to include 'upload' method
  
- ✅ Supabase Storage integration
  - Created private bucket: `patient-consents`
  - Configured RLS policies for authenticated users
  - Implemented signed URLs (1-hour expiry) for secure access
  - Added Next.js Image remotePatterns for signed URLs
  
- ✅ UI Components created
  - `ScannedConsentUpload` - Drag-and-drop file upload with validation
  - `ConsentDocumentViewer` - Modal viewer (PDF iframe + Next Image)
  - `ConsentStatusCard` - Display uploaded document with "View Document" button
  - Updated `ConsentDialog` with tabs (Electronic vs Upload)
  - Added Progress component from Radix UI
  
- ✅ Server Actions implemented (`app/actions/signatures.ts`)
  - `uploadScannedConsent()` - File validation, storage upload, record creation
  - `getConsentDocumentUrl()` - Fetch consent and generate signed URL
  - File validation: PDF, JPG, PNG (max 10MB)
  - Legacy URL format handling for backward compatibility
  
- ✅ Integration complete
  - Patient page displays consent status card when document exists
  - View Document button fetches signed URL dynamically
  - Both electronic and uploaded consents supported simultaneously
  
- ✅ Testing verified
  - Upload and view working correctly
  - Storage RLS policies tested
  - Signed URL generation confirmed
  - Next.js Image rendering working

**Deliverable:** ✅ Production-ready scanned consent upload system

**Actual Effort:** 1 day (as estimated)

---

**9.3.6: Visit Addendums** 🔴 **MEDIUM PRIORITY** (Next Up)

**Client Need:** Add post-signature notes without modifying original visit

- [ ] Build addendum creation UI
  - [ ] "Add Addendum" button on signed/submitted visits
  - [ ] Addendum editor modal with rich text
  - [ ] Timestamp and author automatically captured
  - [ ] Cannot modify original visit content (read-only)
  
- [ ] Create addendum storage
  - [ ] Use existing `wound_notes` table with visit_id reference
  - [ ] Add `note_type` field: 'wound_note' vs 'addendum'
  - [ ] Track addendum count on visit record (visits.addendum_count)
  - [ ] Display addendums chronologically below visit
  
- [ ] Update visit actions (`app/actions/visits.ts`)
  - [ ] `createAddendum(visitId, content)` server action
  - [ ] Increment visits.addendum_count
  - [ ] Create wound_note with type='addendum'
  
- [ ] Update PDF exports
  - [ ] Include addendums section at end of visit summary
  - [ ] Format: "Addendum [#] - [Date] by [Author]"
  - [ ] Show full addendum content
  
- [ ] Test workflow
  - [ ] Sign visit → Add addendum → Verify saved
  - [ ] Submit visit → Add addendum → Verify allowed
  - [ ] Verify original visit remains read-only
  - [ ] Export PDF → Verify addendum included

**Deliverable:** Post-signature addendum capability

**Estimated Effort:** 2-3 days

---

**9.3.6: Signature Audit Logs** 🔴 **LOW PRIORITY**

- [ ] Build signature audit trail UI
  - [ ] List all signatures for a visit
  - [ ] Display: signer, role, timestamp, IP address, method
  - [ ] Admin-only access
  
- [ ] Add signature history to visit detail page
  - [ ] Collapsible section "Signature History"
  - [ ] Show consent, patient, and provider signatures
  - [ ] Timeline view with icons

**Deliverable:** Compliance audit trail for signatures

**Estimated Effort:** 1 day

---

**Phase 9.3 Summary:**
- **Total Estimated Effort:** 12-17 days (2.5-3.5 weeks)
- **Status:** 4 of 7 sub-phases complete (57%)
- **Completed:** ✅ Procedure restrictions, Autosave (visits), Autosave (assessments), Photo labeling
- **Remaining:** Upload consents, Visit addendums, Signature audit logs
- **Critical Path:** Procedure restrictions (legal) → Autosave (usability) → Photo labeling (quick win) ✅ DONE

---

**9.4: Document Management & Advanced Features (Week 18-20)** 🔴 **FUTURE PHASE**

**Goal:** Patient document repository and specialized assessment types

---

**9.4.1: Patient Document Attachments** 🔴 **HIGH VALUE**

**Client Need:** Central document repository for consents, face sheets, labs, radiology reports

- [ ] Create `patient_documents` table migration (00020)
  ```sql
  CREATE TABLE patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
      'consent', 'face_sheet', 'lab_report', 'radiology', 
      'insurance', 'prescription', 'other'
    )),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    thumbnail_url TEXT,
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    visit_id UUID REFERENCES visits(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    tags TEXT[],
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
  CREATE INDEX idx_patient_documents_type ON patient_documents(document_type);
  CREATE INDEX idx_patient_documents_visit_id ON patient_documents(visit_id);
  ```

- [ ] Set up Supabase Storage bucket: `patient-documents/`
  - [ ] Folder structure: `{patient_id}/{document_type}/`
  - [ ] RLS policies for document access
  - [ ] Max file size: 25MB per document

- [ ] Create document actions (`app/actions/documents.ts`)
  - [ ] `uploadDocument(patientId, file, documentType, description, visitId?)`
  - [ ] `getPatientDocuments(patientId, documentType?)`
  - [ ] `deleteDocument(documentId)`
  - [ ] `archiveDocument(documentId)`
  - [ ] `downloadDocument(documentId)` - generates signed URL

- [ ] Build Documents tab component (`components/patients/documents-tab.tsx`)
  - [ ] Tab on patient detail page: "Documents"
  - [ ] Folder view: Group by document type
  - [ ] Grid view with thumbnails (for images/PDFs)
  - [ ] List view with file details (name, size, date, uploader)
  - [ ] Upload button with drag-and-drop support
  - [ ] Multi-file upload capability
  - [ ] Search/filter by type, date, name
  - [ ] Sort by: date uploaded, file name, file size

- [ ] Build document viewer modal (`components/patients/document-viewer.tsx`)
  - [ ] PDF viewer (embedded)
  - [ ] Image viewer (lightbox)
  - [ ] Download button
  - [ ] Archive/delete actions
  - [ ] Edit description/tags

- [ ] Add document quick actions
  - [ ] Upload from visit page (link document to visit)
  - [ ] Bulk download (ZIP multiple documents)
  - [ ] Share document (generate temporary link)

- [ ] Test scenarios
  - [ ] Upload PDF face sheet → Verify stored and viewable
  - [ ] Upload multiple lab reports → Verify organized by type
  - [ ] Search for radiology report → Verify filtering works
  - [ ] Delete document → Verify removed from storage
  - [ ] Download document → Verify signed URL works

**Deliverable:** Full document management system for patient records

**Estimated Effort:** 5-7 days

---

**9.4.2: RN/LVN Shorthand Note Template** 🔴 **AWAITING CLIENT INPUT**

**Client Need:** Simplified assessment form for RN/LVN with fewer fields (template from Alana)

**Prerequisites:** Waiting for Alana to send RN/LVN template document

- [ ] Create `visit_templates` table migration (00021)
  ```sql
  CREATE TABLE visit_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE,
    template_type TEXT NOT NULL CHECK (template_type IN (
      'wound_care', 'rn_shorthand', 'md_comprehensive', 
      'grafting', 'skin_sweep', 'gtube'
    )),
    allowed_credentials TEXT[] NOT NULL,
    form_fields JSONB NOT NULL, -- Dynamic field configuration
    default_values JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Add `visit_template` field to visits table
  ```sql
  ALTER TABLE visits ADD COLUMN visit_template TEXT DEFAULT 'wound_care';
  ```

- [ ] Build dynamic form system
  - [ ] Create form field renderer based on JSONB config
  - [ ] Support field types: text, number, select, checkbox, radio, textarea
  - [ ] Conditional field visibility based on previous answers
  - [ ] Field validation rules from template config

- [ ] Create template builder UI (`app/dashboard/admin/templates/page.tsx`)
  - [ ] Admin-only access
  - [ ] Visual form builder
  - [ ] Drag-and-drop field ordering
  - [ ] Field configuration panel
  - [ ] Preview mode
  - [ ] Import/export templates (JSON)

- [ ] Build RN/LVN shorthand template (based on Alana's input)
  - [ ] Simplified wound assessment
  - [ ] Dressing change checklist
  - [ ] G-tube care fields
  - [ ] Quick treatment options
  - [ ] Pre-filled common values

- [ ] Update visit creation workflow
  - [ ] Template selector based on user credentials
  - [ ] RN/LVN: Show "Shorthand" and "Full Assessment" options
  - [ ] MD/DO/PA/NP: Show "Comprehensive Assessment"
  - [ ] Load appropriate form based on selection

- [ ] Test with different templates
  - [ ] RN user selects shorthand template → Form renders correctly
  - [ ] MD user sees comprehensive template → All fields available
  - [ ] Template switch mid-visit → Data preserved

**Deliverable:** Credential-based dynamic assessment templates

**Estimated Effort:** 5-7 days (after receiving template from Alana)

---

**9.4.3: Specialized Assessment Types** 🔴 **VERY COMPLEX - FUTURE**

**Client Need:** Different assessment forms for Grafting, Skin Sweep, G-tube care

- [ ] Create specialized assessment tables (migration 00022)
  ```sql
  -- Add assessment_type to assessments table
  ALTER TABLE assessments 
  ADD COLUMN assessment_type TEXT DEFAULT 'wound_care'
  CHECK (assessment_type IN ('wound_care', 'grafting', 'skin_sweep', 'gtube'));
  
  -- Grafting assessments
  CREATE TABLE grafting_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    graft_type TEXT NOT NULL CHECK (graft_type IN (
      'split_thickness', 'full_thickness', 'dermal_substitute', 
      'skin_substitute', 'acellular_matrix'
    )),
    graft_location TEXT NOT NULL,
    graft_size_length NUMERIC(5,2),
    graft_size_width NUMERIC(5,2),
    donor_site TEXT,
    donor_site_condition TEXT,
    fixation_method TEXT CHECK (fixation_method IN (
      'sutures', 'staples', 'steri_strips', 'tissue_glue', 'bolster'
    )),
    graft_adherence_percent INTEGER CHECK (graft_adherence_percent BETWEEN 0 AND 100),
    signs_of_rejection BOOLEAN DEFAULT false,
    postop_day INTEGER,
    dressing_type TEXT,
    postop_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- G-tube assessments
  CREATE TABLE gtube_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    tube_type TEXT NOT NULL CHECK (tube_type IN (
      'PEG', 'PEJ', 'G-J', 'low_profile', 'long_tube'
    )),
    tube_size TEXT,
    insertion_site_condition TEXT CHECK (insertion_site_condition IN (
      'intact', 'erythema', 'drainage', 'granulation', 'infection'
    )),
    drainage_amount TEXT CHECK (drainage_amount IN ('none', 'scant', 'moderate', 'large')),
    drainage_type TEXT,
    signs_infection BOOLEAN DEFAULT false,
    granulation_tissue BOOLEAN DEFAULT false,
    tube_patency TEXT CHECK (tube_patency IN ('patent', 'partial_obstruction', 'obstructed')),
    tube_migration BOOLEAN DEFAULT false,
    flushing_performed BOOLEAN DEFAULT false,
    flush_volume_ml INTEGER,
    feeding_tolerance TEXT CHECK (feeding_tolerance IN (
      'tolerating_well', 'nausea', 'vomiting', 'residual', 'diarrhea'
    )),
    residual_volume_ml INTEGER,
    skin_care_performed BOOLEAN DEFAULT false,
    education_provided TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Skin sweep assessments
  CREATE TABLE skin_sweep_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    body_areas_inspected TEXT[] NOT NULL,
    total_wounds_found INTEGER DEFAULT 0,
    new_wounds_documented INTEGER DEFAULT 0,
    at_risk_areas TEXT[],
    skin_condition_overall TEXT CHECK (skin_condition_overall IN (
      'intact', 'dry', 'fragile', 'edematous', 'compromised'
    )),
    prevention_measures JSONB,
    equipment_recommendations JSONB,
    education_topics TEXT[],
    follow_up_needed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX idx_grafting_assessments_assessment_id ON grafting_assessments(assessment_id);
  CREATE INDEX idx_gtube_assessments_assessment_id ON gtube_assessments(assessment_id);
  CREATE INDEX idx_skin_sweep_assessments_visit_id ON skin_sweep_assessments(visit_id);
  ```

- [ ] Build assessment type selector
  - [ ] At visit creation: Choose assessment type
  - [ ] Options: Wound Care, Grafting, Skin Sweep, G-tube
  - [ ] Credential-based filtering (if needed)

- [ ] Build specialized forms
  - [ ] Grafting assessment form (`components/assessments/grafting-assessment-form.tsx`)
    - Graft details, donor site, fixation, adherence
    - Photos: graft site + donor site
    - Post-op care instructions
  
  - [ ] G-tube assessment form (`components/assessments/gtube-assessment-form.tsx`)
    - Tube details, site condition, patency
    - Feeding tolerance, residual checks
    - Education provided
  
  - [ ] Skin sweep form (`components/assessments/skin-sweep-form.tsx`)
    - Body area checklist (head, trunk, arms, legs)
    - Quick wound documentation for multiple wounds
    - Prevention recommendations
    - At-risk area identification

- [ ] Build specialized PDF templates
  - [ ] Grafting note PDF
  - [ ] G-tube care note PDF  
  - [ ] Skin sweep summary PDF

- [ ] Update visit workflow
  - [ ] Assessment type determines form shown
  - [ ] Can mix assessment types in one visit (wound care + g-tube)
  - [ ] Signature workflow remains the same

- [ ] Test each assessment type
  - [ ] Create grafting assessment → Verify all fields saved
  - [ ] Create g-tube assessment → Verify calculations correct
  - [ ] Create skin sweep → Verify multiple wounds captured
  - [ ] Export PDFs → Verify specialized formatting

**Deliverable:** Complete specialized assessment system

**Estimated Effort:** 10-14 days (very complex, multiple forms)

---

**Phase 9.4 Summary:**
- **Total Estimated Effort:** 20-28 days (4-6 weeks)
- **Prerequisites:** Alana's RN/LVN template (for 9.4.2)
- **Complexity:** High - requires dynamic form system and specialized workflows
- **Priority:** Lower than Phase 9.3 critical compliance features

---

### Phase 10: Auto-Save & Field Reliability (Weeks 16-17)

**Goal:** Prevent data loss during field visits with unstable internet

**10.1: Client-Side Auto-Save (Week 16)**

- [ ] Implement localStorage auto-save hook (every 30 seconds)
- [ ] Store form state with timestamp key
- [ ] Build draft recovery modal on page load
- [ ] Add "Restore Draft" / "Discard Draft" actions
- [ ] Implement draft comparison view (side-by-side)
- [ ] Build save status indicator component
- [ ] Show "Last saved: X minutes ago" with spinning icon during save
- [ ] Add keyboard shortcut (Ctrl+S) to manual save
- [ ] Clear localStorage after successful submission
- [ ] Test with intentional page refresh during form filling

**Deliverable:** Client-side auto-save prevents data loss on refresh

**10.2: Server Draft Saves & Offline Mode (Week 17)**

- [ ] Implement server draft auto-save (every 2 minutes)
- [ ] Add optimistic UI updates during save
- [ ] Show toast notification: "Draft saved at [time]"
- [ ] Implement network status detection (navigator.onLine)
- [ ] Build offline mode banner component
- [ ] Set up IndexedDB for offline mutation queue
- [ ] Queue create/update operations when offline
- [ ] Implement sync logic when connection restored
- [ ] Show "Last synced: [time]" indicator
- [ ] Add manual "Sync Now" button
- [ ] Handle sync conflicts (local vs server changes)
- [ ] Test offline scenario: disconnect WiFi, fill form, reconnect, verify sync
- [ ] Test partial connectivity: slow 3G simulation

**Deliverable:** Offline-capable form with auto-sync

---

### Phase 11: Printing & Mobile UI (Weeks 18-19)

**Goal:** Enhanced printing and mobile usability

**11.1: Printing Enhancements (Week 18)**

- [ ] Add clinician signature section to all PDF exports
- [ ] Format: "Documented by: [Name], [Credentials] on [Date/Time]"
- [ ] Update visit summary PDF with signature section
- [ ] Update wound progress PDF with signature section
- [ ] Add user preference: "Include photos in printed reports" toggle
- [ ] Implement conditional photo rendering in PDFs based on preference
- [ ] Add settings page for user preferences
- [ ] Test PDF generation with/without photos
- [ ] Verify signature section appears on all report types

**Deliverable:** Compliant printed reports with clinician attribution

**11.2: Mobile UI Optimization (Week 19)**

- [ ] Audit all pages for mobile responsiveness (375px - 428px width)
- [ ] Update wound cards to stack vertically on mobile
- [ ] Implement touch-friendly button sizes (min 44x44px)
- [ ] Build bottom sheet modals for mobile (replace center modals)
- [ ] Add swipe gestures to wound switcher
- [ ] Implement pull-to-refresh on patient list
- [ ] Build mobile navigation bar (bottom)
- [ ] Optimize signature pad for touch (larger canvas, clear button)
- [ ] Add native camera integration for wound photos
- [ ] Test on iPhone SE (smallest), iPhone 14, iPad Mini, iPad Pro
- [ ] Test portrait and landscape orientations
- [ ] Fix any horizontal scroll issues
- [ ] Optimize calendar for mobile (day view default)

**Deliverable:** Fully mobile-optimized interface

---

### Future Enhancements (Post-MVP)

- [ ] AI-powered wound analysis (healing prediction)
- [ ] Patient portal (view own wound progress)
- [ ] Mobile app (React Native)
- [ ] Integration with PointClickCare (read-only patient data)
- [ ] Integration with Practice Fusion (read-only)
- [ ] Advanced PDF customization options
- [ ] Live data sync with other EHR systems
- [ ] Automated billing code suggestions based on visit type/treatments
- [ ] Body diagram wound location selector (visual wound placement)
- [ ] Advanced wound comparison (multi-visit, multi-wound)
- [ ] Automated appointment reminders (email/SMS)

---

## Design Decisions

This section documents all approved design decisions based on client requirements and technical considerations.

### 1. Authentication & Authorization

**Decision:** Dual-layer system - Administrative roles + Clinical credentials.

**Version 4.0 Update:** Added mandatory credentials system for clinical scope enforcement.

**Version 3.0 Update:** Complete overhaul from simple auth to role-based access control (RBAC).

- **Rationale:** 
  - Client requires tenant admin and facility admin roles for proper access management in multi-tenant SaaS environment.
  - Compliance requirements mandate tracking clinical credentials to enforce scope of practice and signature requirements.
  - Need to distinguish between administrative access and clinical capabilities.

- **Implementation:**
  - **Supabase Auth** with email/password
  - **Tenant isolation**: Each signup creates new tenant (organization)
  
  - **Administrative Roles** (determines data access):
    1. **Tenant Admin**: Full access to all facilities, can invite other admins and facility admins
    2. **Facility Admin**: Access only to assigned facility, can invite users within their facility
    3. **User**: Basic access to assigned facilities, no admin privileges
  
  - **Clinical Credentials** (determines clinical scope) - **REQUIRED for all users**:
    - **RN** (Registered Nurse): Limited procedures, requires patient signature at every visit
    - **LVN** (Licensed Vocational Nurse): Limited procedures, requires patient signature at every visit
    - **MD** (Medical Doctor): Full procedure access, no patient signature required
    - **DO** (Doctor of Osteopathic Medicine): Full procedure access, no patient signature required
    - **PA** (Physician Assistant): Full procedure access, no patient signature required
    - **NP** (Nurse Practitioner): Full procedure access, no patient signature required
    - **CNA** (Certified Nursing Assistant): View-only access, no documentation
    - **Admin** (Non-clinical): Administrative staff, no clinical access
  
  - **Examples:**
    - Facility Admin + RN = Can manage facility AND perform clinical work with RN scope
    - User + MD = Clinician with full procedure access
    - User + LVN = Clinician with limited scope, must collect patient signatures
    - Tenant Admin + Admin = Owner/manager, no clinical access
  
  - **Enforcement:**
    - `user_roles` table links users to administrative roles and facilities
    - `users.credentials` field (required) determines clinical capabilities
    - `procedure_scopes` table maps procedures to allowed credentials
    - Middleware enforces both role-based AND credential-based access control
    - Server actions validate credentials before allowing procedure documentation
  - Row-Level Security (RLS) policies filter data by tenant and facility access
- **UI:**
  - Tenant admin: Full admin panel at `/admin/*`
  - Facility admin: Limited admin panel (user invites only)
  - User: No admin access
  - Role badge displayed in user profile
- **Invite System:**
  - Email-based invites with role assignment
  - Auto-assigns to tenant during signup via invite token
  - Facility assignment for facility admins and users

### 2. Multi-Facility Support

**Decision:** Multi-facility support included in Phase 1 with tenant-based isolation.

- **Rationale:** Client confirmed multi-facility capability required from start, with proper tenant isolation for SaaS.
- **Implementation:**
  - Each tenant can have multiple facilities
  - `Facilities` table includes `tenant_id` foreign key
  - `UserFacilities` junction table for many-to-many relationships
  - Each patient belongs to one facility (`patient.facility_id`)
  - Tenant admins can access all facilities within their tenant
  - Facility admins can only access their assigned facility
  - Users can be assigned to multiple facilities (within same tenant)
- **UI:** Facility selector in header/settings, patient list filters by accessible facilities based on role.

### 3. Billing & CPT Codes

**Decision:** Comprehensive billing system implemented in Phase 6.5 with searchable code selection.

- **Rationale:** Client confirmed billing documentation needed for visit notes and time-based billing.
- **Implementation:**
  - `Billing` table with CPT codes (procedures), ICD-10 codes (diagnoses), modifiers, time tracking, notes
  - Time component: "45+ minutes spent" tracked per visit as boolean flag
  - **Searchable Dropdowns:** 30+ common CPT codes, 40+ common ICD-10 codes, 20+ modifiers
  - **Custom Entry:** Support for entering non-standard codes
  - **Billing Reports:** `/dashboard/billing` page with filtering by date range, facility, patient
  - **CSV Export:** One-click export for insurance submissions
  - **PDF Integration:** Billing codes included in Visit Summary PDF
- **Status:** ✅ **IMPLEMENTED** (Phase 6.5)
- **Future:** Automated CPT code suggestions based on visit type/treatments moved to post-MVP.

### 4. Electronic Signatures & Compliance (Version 4.0)

**Decision:** Three-tier signature system with full audit trail.

- **Rationale:** 
  - Legal compliance requirement for wound care documentation
  - RN/LVN require patient acknowledgment at every visit
  - All clinicians must certify accuracy of documentation
  - Initial consent-to-treat must be captured before any treatment
  
- **Implementation:**
  
  **1. Initial Consent (One-Time, Required Before First Visit):**
  - `patient_consents` table stores full consent text + signatures
  - Modal blocks visit creation if no consent exists for patient
  - Digital signature pad for patient (required) + witness (optional)
  - Captures: timestamp, IP address, consent text shown, signature images
  - Cannot be modified after signing (audit compliance)
  
  **2. Patient Signature (Per Visit, RN/LVN Only):**
  - Auto-determined by `visits.requires_patient_signature` flag (set based on clinician credentials)
  - Collected at END of visit, ideally before clinician leaves bedside
  - Shows visit summary: treatments performed, wound care provided
  - Text: "I acknowledge receipt of the treatments described above"
  - Signature stored in `signatures` table with type='patient'
  - Visit cannot be marked complete without patient signature if required
  
  **3. Provider Signature (Per Visit, All Clinicians):**
  - New visit status flow: `draft` → `ready_for_signature` → `signed` → `submitted`
  - **Save Draft**: Allows saving incomplete work, can return later
  - **Ready for Signature**: Validates all required fields, prevents further editing
  - Signature page shows read-only visit summary with all assessments, photos, treatments
  - Text: "I certify that this documentation is accurate and complete"
  - Signature stored in `signatures` table with type='provider'
  - Records exact timestamp of signature (signed_at field)
  - **Submit to Office**: Final action, marks visit as submitted, generates timestamp
  
  **Signature Methods:**
  - **Draw**: Canvas-based signature pad (preferred for mobile/tablet)
  - **Type**: Typed name with "I agree" checkbox (fallback)
  - Both methods are legally binding with timestamp + IP address
  
  **Audit Trail:**
  - All signatures include: signer_name, signer_role, signature_data (base64 image or typed name), signature_method, ip_address, signed_at
  - Cannot delete signatures (only soft delete with audit log)
  - Signature display component shows all details for compliance review
  
- **Status:** 🔴 **PHASE 9 - IN PLANNING**

### 5. Procedure Scope Enforcement (Version 4.0)

**Decision:** Credential-based procedure filtering with `procedure_scopes` table.

- **Rationale:**
  - Legal requirement: Clinicians cannot document procedures outside their scope of practice
  - RN/LVN cannot perform or document sharp debridement (surgical procedures)
  - Need flexible system to add/modify scope rules as regulations change
  
- **Implementation:**
  - `procedure_scopes` table maps procedure codes to array of allowed credentials
  - Seeded with wound care procedures and credential restrictions
  - Examples:
    - Sharp debridement (CPT 11042-11047): `['MD', 'DO', 'PA', 'NP']` only
    - Selective debridement (CPT 97597-97598): `['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']` all
    - NPWT (CPT 97605-97607): `['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']` all
  
  - **UI Filtering:**
    - Treatment form: Only show procedures user's credentials allow
    - Billing form: Filter CPT codes by credentials
    - Assessment form: Conditional rendering (hide sharp debridement options for RN/LVN)
  
  - **Server Validation:**
    - Server Actions validate credentials before saving procedures
    - `canPerformProcedure(credentials, procedureCode)` returns boolean
    - Reject with error if credential not in allowed array
  
  - **Admin Management:**
    - Tenant admins can view/edit procedure scopes
    - Future: Import RN/LVN templates from Alvin's team
    - Allows customization per state regulations (CA vs TX vs FL)
  
- **Status:** 🔴 **PHASE 9.3 - IN PLANNING**

### 6. Auto-Save & Offline Support (Version 4.0)

**Decision:** Dual-layer auto-save - client (localStorage) + server (drafts).

- **Rationale:**
  - Field clinicians work in facilities with poor/unstable WiFi
  - Cannot risk losing 30+ minutes of wound documentation
  - Must support offline work and sync when connection restored
  
- **Implementation:**
  
  **Client-Side (localStorage):**
  - Auto-save every 30 seconds to browser localStorage
  - Key format: `draft_visit_${visitId}_${timestamp}`
  - Stores: All form fields, wound assessments, photo thumbnails (base64)
  - On page load: Check for unsaved drafts, show recovery modal
  - Recovery options: Restore, Discard, View Both (side-by-side comparison)
  - Cleared automatically after successful submission
  
  **Server-Side (Database Drafts):**
  - Auto-submit to server every 2 minutes with status='draft'
  - Uses optimistic UI updates (instant feedback)
  - Toast notification: "Draft saved at [time]"
  - Works even with slow connection (retries with exponential backoff)
  
  **Offline Mode:**
  - Detect: `navigator.onLine` event listener
  - UI: Yellow banner "⚠️ No internet connection. Changes saved locally."
  - Queue: Store mutations in IndexedDB offline queue
  - Sync: On connection restored, process queue sequentially
  - Indicator: "Last synced: X minutes ago" with manual "Sync Now" button
  - Conflict resolution: Server timestamp wins (with user notification)
  
  **Save Status Indicator:**
  - Top right corner of forms
  - States: Saving (spinner), Saved (green check), Offline (yellow warning), Error (red)
  - Last saved timestamp
  - Keyboard shortcut: Ctrl+S for manual save
  
- **Status:** 🔴 **PHASE 10 - IN PLANNING**

### 7. Library Selections

**Decision:** Agent selects appropriate libraries based on technical requirements.

**Calendar:**

- **Library:** React Big Calendar
- **Rationale:** Industry standard, highly customizable, supports drag-and-drop
- **Version 3.0 Update:** Enhanced with modal-based event interaction (Google Calendar-style)
- **Features:**
  - Drag-and-drop rescheduling
  - Color-coded events by status
  - Month/week/day views
  - **NEW**: Modal opens on event click (not page navigation) - fixes 404 error
  - **NEW**: Drag-select time range to create new appointment
  - **NEW**: Click empty slot to create appointment
  - **NEW**: Event modal displays patient/visit info with quick links

**PDF Export:**

- **Library:** @react-pdf/renderer
- **Rationale:** Server-side rendering, React-based syntax, excellent for structured documents like visit summaries and wound progress reports
- **Features:** Custom layouts, embedded images (wound photos), professional styling

**CSV Export:**

- **Library:** None (custom implementation)
- **Rationale:** Simple CSV generation via JavaScript array manipulation, no need for external dependency
- **Implementation:** Server Action queries Supabase, formats as CSV string, returns as downloadable file

### 8. Data Migration

**Decision:** No data migration required.

- **Rationale:** Client has Supabase project ready, starting fresh with new system.
- **Implication:** Clean database start, no legacy data issues.

### 9. Photo Storage

**Decision:** Supabase Storage with reasonable limits, agent-defined retention policy.

- **Storage:** Supabase Storage buckets (HIPAA-compliant, CDN-backed)
- **Limits:**
  - Max 10 photos per wound per visit (configurable)
  - Max file size: 10MB per photo
  - Supported formats: JPEG, PNG, HEIC
- **Retention:** Photos retained indefinitely with patient record (required for HIPAA compliance)
- **Optimization:** Automatic thumbnail generation for gallery views

### 10. Wound Types & Treatment Options

**Decision:** Agent uses medical knowledge to define comprehensive wound types and treatment options. Assessment forms use checkboxes and radio buttons for efficiency.

**Version 3.0 Update:** Converted most dropdowns to checkboxes (multi-select) and radio buttons (single-select) for faster data entry.

- **Rationale:** Client feedback - dropdowns slow down workflow. Checkboxes/radio buttons allow faster, more intuitive selection.
- **Implementation:**
  - **Checkboxes** for multi-select fields:
    - Tissue types (epithelial, granulation, slough, etc.)
    - Exudate types (serous, sanguineous, purulent, etc.)
    - Periwound conditions (macerated, erythema, edema, etc.)
    - Infection signs (warmth, purulent drainage, delayed healing, etc.)
    - Risk factors (diabetes, incontinence, limited mobility, etc.)
    - Treatment options (all categories)
  - **Radio buttons** for single-select fields:
    - Wound type (pressure injury, diabetic, venous, arterial, etc.)
    - Pressure stage (1, 2, 3, 4, unstageable, DTPI)
    - Healing status (initial, healing, stable, declined, healed)
    - Exudate amount (none, scant, moderate, large)
    - Odor level (none, mild, moderate, strong, foul)
  - **Numeric inputs** for measurements (length, width, depth)
  - **Sliders** for percentages (tissue composition)
- **Wound Types (Expanded):**
  - Pressure Injuries (Stage 1-4, Unstageable, Deep Tissue Injury)
  - Diabetic Foot Ulcers (neuropathic, ischemic, neuro-ischemic)
  - Venous Leg Ulcers
  - Arterial Ulcers
  - Surgical Wounds (primary closure, dehisced, infected)
  - Traumatic Wounds (lacerations, abrasions, burns)
  - Moisture-Associated Skin Damage (MASD)
  - Skin Tears (ISTAP categories 1-3)
  - Fungating Wounds
  - Other (free text)
- **Treatment Categories (Comprehensive):**
  - Primary Dressings (hydrogel, hydrocolloid, foam, alginate, etc.)
  - Secondary Dressings (gauze, ABD pads, transparent films)
  - Antimicrobials (silver, iodine, PHMB, Hydrofera Blue)
  - Debridement (autolytic, enzymatic/Santyl, sharp)
  - Advanced Therapies (NPWT, collagen, growth factors)
  - Compression Therapy (UNNA boots, multi-layer wraps)
  - Moisture Management (barrier creams, antifungals)
  - Preventive (air mattress, repositioning, off-loading)
- **Customization:** Treatment checklist hardcoded in Phase 1, customizable admin panel added in post-MVP.

### 11. Wound-Based UI Philosophy (NEW)

**Decision:** Redesign patient detail page and visit assessment to be wound-centric rather than visit-centric.

**Version 3.0 Update:** Major UX overhaul based on client feedback.

- **Rationale:** Client confirmed wounds are the primary entity clinicians think about, not visits. Current visit-based layout creates confusion when managing multiple wounds.
- **Implementation:**
  - **Patient Detail Page:**
    - Wounds displayed as primary content (cards/grid)
    - Each wound card shows: location, type, status, latest measurements, latest photo, recent visit history
    - Per-wound notes displayed prominently with timestamps
    - Patient demographics moved to sidebar/header (secondary)
    - Quick wound switcher for easy navigation
  - **Visit Assessment Form:**
    - Easy wound switcher (tabs for 2-5 wounds, sidebar for 6+)
    - Auto-save when switching between wounds
    - Progress indicator shows completion status per wound
    - Per-wound notes section in assessment form
    - Ability to add multiple timestamped notes during and after visit
  - **Wound Notes System:**
    - New `wound_notes` table for per-wound timestamped notes
    - Notes can be added anytime (during visit, after visit, standalone)
    - Display author, timestamp, content
    - Notes linked to wound (required) and visit (optional)
    - Addendum tracking: Post-visit notes increment `visit.number_of_addenda`
  - **Visit History:**
    - Recent visits shown within each wound card (last 3-5)
    - Full visit timeline accessible via "View History" link
    - Timeline shows healing progression per wound
- **Benefits:**
  - Easier management of patients with multiple wounds
  - Clearer wound history and progression tracking
  - Faster navigation during assessments
  - Better support for longitudinal wound care
- **Legacy Support:** Original visit-centric views remain accessible at `/patients/[id]/visits`

### 12. Reporting Requirements

**Decision:** PDF export for visit summaries and wound progress, CSV export for data analysis.

- **Critical Reports:**
  - Visit summary PDF (per-visit export with all assessments, photos, treatments)
  - Wound progress report PDF (multi-visit comparison with before/after photos, measurement charts)
  - Patient list CSV (all patients with demographics, active wound count)
  - Visit log CSV (all visits with date, patient, status, time spent)
- **Frequency:** On-demand generation (no scheduled/automated reports in Phase 1)
- **Future:** Weekly/monthly automated reports, custom date range filtering, batch exports.

### 13. Device & Responsiveness

**Decision:** Desktop-first design with tablet/mobile responsiveness.

- **Primary Device:** Desktop (1920x1080 target resolution)
- **Secondary:** Tablet (iPad Pro 12.9", landscape orientation)
- **Mobile:** Responsive but not optimized (minimal phone usage expected)
- **Testing:** Chrome desktop, Safari tablet, basic mobile smoke tests
- **Forms:** Optimized for mouse/keyboard on desktop, touch-friendly on tablet
- **Future:** Dedicated mobile app (React Native) in post-MVP.

### 14. EHR Integration

**Decision:** CSV export sufficient for Phase 1, live integrations deferred.

- **Rationale:** Client confirmed CSV export meets immediate needs for data portability.
- **Implementation:**
  - Export patient list, visit logs, wound data as CSV
  - Manual import into Practice Fusion/PointClickCare as needed
- **Future:** Live read-only integration with PointClickCare and Practice Fusion APIs moved to post-MVP enhancements.

---

## Next Steps

**Design document has been approved and is ready for Phase 1 implementation.**

### ✅ Completed Actions

**Phases 1-8:** Complete application infrastructure (Weeks 1-12)
1. **Supabase Setup** ✅ - Database, RLS, Storage, Authentication
2. **SQL Schema Migration** ✅ - 17 migrations executed
3. **Authentication Implementation** ✅ - Login/logout, protected routes
4. **Full Application** ✅ - UI, navigation, CRUD operations
5. **RBAC System** ✅ - Tenant admin, facility admin, user roles
6. **Wound-Based UI** ✅ - Wound-centric layout and workflows
7. **Wound Notes** ✅ - Per-wound timestamped notes
8. **Calendar Integration** ✅ - Modal-based event management

**Phase 9.1: Credentials System** ✅ DEPLOYED (Week 13)
- Migration 00008: Added credentials field to users table
- Credentials validation: RN, LVN, MD, DO, PA, NP, CNA, Admin
- User management UI displays credentials
- Invite system captures credentials
- Patient signature logic based on credentials

**Phase 9.2: Electronic Signatures** ✅ TESTED (Weeks 14-15)
- Migration 00014: signatures and patient_consents tables
- Migration 00015: Visit status constraint (draft → ready → signed → submitted)
- Migration 00017: Fixed user_roles RLS infinite recursion
- Dual-mode signature pad (draw with canvas + type with keyboard)
- Initial consent workflow (blocks first visit until signed)
- Provider signature workflow (all credentials)
- Patient signature workflow (RN/LVN only, before provider signature)
- Visit status management and read-only enforcement
- PDF exports include signatures with credentials
- Tested: MD workflow (no patient sig), RN workflow (requires patient sig)

**Admin Dashboard Enhancement** ✅ WORKING (November 19, 2025)
- Admin panel section on main dashboard
- Shows user count, facility count, pending invite count
- Quick links to user management, facilities, invites
- Visible to tenant admins only

**Database & Security** ✅ OPTIMIZED
- RLS disabled on user_roles table (eliminated infinite recursion)
- RPC functions: get_user_role_info(), get_tenant_user_roles()
- Application-level security via middleware and server actions
- All other tables maintain proper RLS policies

---

**Document Version:** 4.1 (Updated)  
**Last Updated:** November 19, 2025  
**Current Phase:** Phase 9.3 - Addendums & Restrictions (Week 16) - PENDING
**Production Status:** Phase 9.1-9.2 ready for deployment
