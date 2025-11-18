# Wound EHR - System Design Document

> **Version**: 4.0  
> **Date**: November 18, 2025  
> **Status**: ✅ **Approved - Compliance & Workflow Enhancements**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Version 4.0 Key Changes](#version-40-key-changes)
3. [Version 3.0 Key Changes](#version-30-key-changes)
4. [Project Requirements](#project-requirements)
5. [System Architecture](#system-architecture)
6. [Database Schema](#database-schema)
7. [Frontend Architecture](#frontend-architecture)
8. [Key Features & Workflows](#key-features--workflows)
9. [Technology Stack](#technology-stack)
10. [Implementation Phases](#implementation-phases)
11. [Design Decisions](#design-decisions)

---

## Version 4.0 Key Changes

### 🎯 Compliance & Workflow Requirements (November 18, 2025)

Based on feedback from Alvin's team, this version adds critical compliance features:

#### 1. **Credentials-Based Role System** 🔐

- **Administrative Roles** (unchanged): Tenant Admin, Facility Admin, User
- **Clinical Credentials** (NEW): RN, LVN, MD, DO, PA, NP, CNA, Admin
- **Required field**: All users must have credentials (one per user)
- **Examples**: Facility Admin+RN, User+MD, User+LVN
- **Enables**: Auto-determine signature requirements, filter procedures by scope, print credentials on reports

#### 2. **Electronic Signatures** 📝 **CRITICAL**

- **Initial Consent**: One-time consent-to-treat (blocks first visit until signed)
- **Patient Signature**: Required for RN/LVN at end of every visit (not for MD/DO/PA/NP)
- **Provider Signature**: New workflow - Save Draft → Ready → Sign → Submit to Office
- **Audit Trail**: Timestamp, IP address, signature image stored for all signatures
- **Visit Status**: draft, ready_for_signature, signed, submitted

#### 3. **Procedure Restrictions** 🚫

- **RN/LVN**: Cannot see/document sharp debridement (CPT 11042, 11043, 11044)
- **MD/DO/PA/NP**: Full access to all procedures including sharp debridement
- **Enforced via**: `procedure_scopes` table with credential allowlists
- **UI Filtering**: Treatment/billing forms show only allowed procedures

#### 4. **Printing Enhancements** 🖨️

- Add `clinician_name` and `clinician_credentials` to visits table
- PDF exports include: "Documented by: [Name], [Credentials] on [Date/Time]"
- User preference: "Include wound photos in printed reports" (default: yes)

#### 5. **Auto-Save & Offline** 💾

- **Client-side**: localStorage auto-save every 30 seconds
- **Server-side**: Draft auto-save every 2 minutes
- **Offline Mode**: IndexedDB queue, auto-sync when online
- **Recovery**: Modal to restore unsaved drafts on page load

#### 6. **Mobile UI Polish** 📱 (Post-functionality)

- Responsive layouts, touch targets (44×44px min)
- Native camera, swipe gestures, bottom navigation
- Signature pad optimized for touch

---

## Version 3.0 Key Changes

### 🎯 Critical Client Requirements (November 4, 2025)

This version addressed major UX and access management requirements from the client:

#### 1. **Wound-Based Layout** (MOST IMPORTANT) 🔥

**Problem:** Current visit-centric layout makes managing multiple wounds difficult.

**Solution:**

- **Patient Detail Page**: Redesigned with wound cards as primary content
  - Each wound shows: location, type, status, measurements, latest photo, recent visits
  - Per-wound notes with timestamps (can add notes anytime)
  - Quick wound switcher for easy navigation
  - Patient demographics moved to sidebar (secondary)
- **Visit Assessment Form**: Easy multi-wound management
  - Wound switcher (tabs for 2-5 wounds, sidebar for 6+)
  - Auto-save when switching between wounds
  - Progress indicator (wound X of Y, checkmarks)
  - Per-wound notes section for multiple timestamped notes
  - Checkboxes replace dropdowns for multi-select (tissue types, infection signs, etc.)
  - Radio buttons replace dropdowns for single-select (wound type, healing status, etc.)

**Why This Matters:** Clinicians think in terms of wounds, not visits. A patient with 5 wounds needs 5 separate assessments per visit. The wound-based layout makes this workflow natural and efficient.

#### 2. **Multi-Tenant Access Management** (RBAC)

**Problem:** Need SaaS-style multi-tenancy with proper access controls.

**Solution:**

- **Three roles**: Tenant Admin, Facility Admin, User
- **Tenant Admin**: Full access, can invite other admins and facility admins, manage all facilities
- **Facility Admin**: Can only view/manage assigned facility, can invite users within facility
- **User**: Basic access to assigned facilities
- Email-based invite system with role assignment
- Complete tenant isolation (users cannot see other tenant data)

**New Tables:** `tenants`, `user_roles`, `wound_notes`

#### 3. **Enhanced Calendar** (Google Calendar-Style)

**Problem:** 404 error when clicking calendar events, no easy way to create appointments.

**Solution:**

- **Modal opens on event click** (not page redirect) - fixes 404 error
- Modal shows: patient, visit, time, quick links (View Patient, View Visit Details)
- **Drag-select time range** to create new appointment
- **Click empty slot** to create appointment
- New appointment modal with patient search and wound selection

**Why This Matters:** Faster appointment management without context switching.

#### 4. **Per-Wound Notes System**

**Problem:** Need to track notes per wound with timestamps, including post-visit addenda.

**Solution:**

- New `wound_notes` table for timestamped notes
- Add notes anytime (during visit, after visit, standalone)
- Multiple notes per wound per visit
- Shows author, timestamp, content
- Addendum tracking: Post-visit notes increment `visit.number_of_addenda`

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
     - Take/upload photos with comparison viewer
     - Document tissue composition (checkboxes + percentages)
     - Select wound characteristics (radio buttons)
     - Note healing status (radio buttons)
     - Check infection signs, risk factors (checkboxes)
     - Add per-wound notes (timestamped)
   - Auto-save when switching wounds
   - Completion indicator (✓) for each assessed wound

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

- [ ] Photo upload component (react-dropzone)
- [ ] Supabase Storage integration
- [ ] Photo gallery per wound
- [ ] Photo comparison view (side-by-side)
- [ ] Secure photo URLs with RLS policies

**Deliverable:** Can upload and view wound photos

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

### Phase 9: Compliance & Signatures (Weeks 13-16) 🔴 **CURRENT PRIORITY**

**Goal:** Implement credentials-based role system, electronic signatures, and compliance workflows

**9.1: Credentials-Based Role System (Week 13)** ⭐ **START HERE**

- [ ] Create migration 00008: Add `credentials` field to `users` table
  - [ ] Field type: TEXT NOT NULL
  - [ ] CHECK constraint: credentials IN ('RN', 'LVN', 'MD', 'DO', 'PA', 'NP', 'CNA', 'Admin')
  - [ ] Backfill existing users with default credentials
- [ ] Update `lib/database.types.ts` (run `npm run db:types`)
- [ ] Update invite system to capture credentials
  - [ ] Add credentials dropdown to invite form (components/admin/invites-management-client.tsx)
  - [ ] Validate credentials required when inviting
  - [ ] Store credentials in user record on signup
- [ ] Update user management UI
  - [ ] Display "Role + Credentials" column (e.g., "Facility Admin (RN)")
  - [ ] Add credentials field to user edit form
  - [ ] Show credentials badges with icons
- [ ] Update RBAC utilities (lib/rbac.ts)
  - [ ] Add `getUserCredentials()` function
  - [ ] Add credential type definitions
- [ ] Update existing user records
  - [ ] Create admin script to set credentials for current users
  - [ ] Test with different credential types
- [ ] Test invite flow end-to-end with new credentials field

**Deliverable:** All users have required credentials field, visible in admin UI, captured during invite

---

**9.2: Electronic Signatures & Compliance (Week 14-15)**

**9.2.1: Signature Infrastructure (Days 1-3)**

- [ ] Create `signatures` table migration
  - [ ] Fields: signature_type, visit_id, patient_id, signer_name, signer_role, signature_data, signature_method, ip_address, signed_at
  - [ ] Indexes on visit_id and patient_id
- [ ] Create `patient_consents` table migration
  - [ ] Fields: patient_id, consent_type, consent_text, patient_signature_id, witness_signature_id, consented_at
  - [ ] Index on patient_id
- [ ] Build digital signature pad component (components/signatures/signature-pad.tsx)
  - [ ] Canvas-based drawing with touch support
  - [ ] Clear and undo buttons
  - [ ] Responsive sizing for mobile/tablet
  - [ ] Export as base64 PNG
- [ ] Build typed signature component (components/signatures/typed-signature.tsx)
  - [ ] Text input + "I agree" checkbox
  - [ ] Timestamp display
- [ ] Create signature actions (app/actions/signatures.ts)
  - [ ] createSignature(type, data, method)
  - [ ] validateSignature(signatureId)
  - [ ] getSignatureAuditTrail(visitId)

**9.2.2: Initial Consent Form (Days 4-5)**

- [ ] Build initial consent modal (components/patients/initial-consent-modal.tsx)
  - [ ] Full consent text display (customizable per facility)
  - [ ] Patient signature pad
  - [ ] Optional witness signature pad
  - [ ] "I understand and consent to treatment" checkbox
  - [ ] Cannot dismiss until signed
- [ ] Create consent page (app/dashboard/patients/[id]/consent/page.tsx)
- [ ] Add consent check before visit creation
  - [ ] Query patient_consents for patient_id
  - [ ] Show consent modal if no consent exists
  - [ ] Block visit form until consent completed
- [ ] Create consent actions (app/actions/consents.ts)
  - [ ] createPatientConsent()
  - [ ] getPatientConsent(patientId)
  - [ ] hasValidConsent(patientId)

**9.2.3: Visit Signature Workflow (Days 6-10)**

- [ ] Update visits table migration
  - [ ] Add `clinician_name` TEXT
  - [ ] Add `clinician_credentials` TEXT
  - [ ] Add `requires_patient_signature` BOOLEAN
  - [ ] Add `provider_signature_id` UUID FK
  - [ ] Add `patient_signature_id` UUID FK
  - [ ] Add `signed_at` TIMESTAMPTZ
  - [ ] Add `submitted_at` TIMESTAMPTZ
  - [ ] Update status enum: ('draft', 'ready_for_signature', 'signed', 'submitted', 'incomplete', 'complete')
- [ ] Update visit form to pre-fill clinician fields from user profile
- [ ] Build visit action buttons component (components/visits/visit-action-buttons.tsx)
  - [ ] Dynamic buttons based on status:
    - Draft: [Save Draft] [Ready for Signature]
    - Ready: [Edit] [Sign Now]
    - Signed: [Submit to Office] [Add Addendum]
    - Submitted: [View Only] [Add Addendum]
- [ ] Build "Save Draft" action
  - [ ] Saves visit with status='draft'
  - [ ] No validation required
  - [ ] Shows auto-save timestamp
- [ ] Build "Ready for Signature" action
  - [ ] Validates all required fields
  - [ ] Changes status to 'ready_for_signature'
  - [ ] Auto-sets requires_patient_signature based on credentials
- [ ] Build patient signature modal (for RN/LVN only)
  - [ ] Shows visit summary
  - [ ] Acknowledgment text: "I acknowledge receipt of treatment described above"
  - [ ] Signature pad
  - [ ] Captured at end of visit, before provider signature
  - [ ] Only shown if requires_patient_signature=true
- [ ] Build provider signature page (app/dashboard/visits/[id]/sign/page.tsx)
  - [ ] Read-only complete visit summary
  - [ ] All assessments, photos, treatments displayed
  - [ ] Certification text: "I certify that this documentation is accurate and complete"
  - [ ] Signature pad or typed name
  - [ ] IP address captured automatically
- [ ] Build "Sign & Submit" action
  - [ ] Creates provider signature record
  - [ ] Updates visit: signed_at, provider_signature_id, status='signed'
  - [ ] Locks visit from editing (can only add addendums)
- [ ] Build "Submit to Office" action
  - [ ] Updates visit: submitted_at, status='submitted'
  - [ ] Triggers any backend workflows (e.g., billing, notifications)
- [ ] Test complete workflow:
  1. Save multiple drafts
  2. Mark ready for signature
  3. (If RN/LVN) Capture patient signature
  4. Capture provider signature
  5. Submit to office
  6. Verify cannot edit signed visit

**Deliverable:** Complete signature workflow with role-based requirements and visit status management

---

**9.3: Printing Enhancements (Week 16, Days 1-3)**

- [ ] Add clinician signature section to PDF components
  - [ ] Update components/pdf/visit-summary-pdf.tsx
  - [ ] Update components/pdf/wound-progress-pdf.tsx
  - [ ] Format: "Documented by: [Name], [Credentials] on [Date/Time]"
  - [ ] Include actual signature image if available
- [ ] Add user preference for photo printing
  - [ ] Create user_preferences table or JSON field in users table
  - [ ] Add "Include wound photos in printed reports" toggle
  - [ ] Build user settings page (app/dashboard/settings/page.tsx)
- [ ] Update PDF generation to respect photo preference
  - [ ] Check user preference before rendering photos
  - [ ] Show photo count even if not rendered: "3 photos available (not shown)"
- [ ] Test PDF exports
  - [ ] Verify clinician signature appears
  - [ ] Test with/without photos
  - [ ] Print to PDF and verify formatting

**Deliverable:** Professional printed reports with clinician attribution

---

**9.4: Procedure Scope Restrictions (Week 16, Days 4-5)**

- [ ] Create `procedure_scopes` table migration
  - [ ] Fields: procedure_code, procedure_name, allowed_credentials[], category, description
  - [ ] Seed with initial data (awaiting RN/LVN templates from Alvin's team)
- [ ] Create procedure utilities (lib/procedures.ts)
  - [ ] `getAllowedProcedures(credentials)` - returns filtered procedure list
  - [ ] `canPerformProcedure(credentials, code)` - validation function
  - [ ] `getProceduresByCategory(credentials, category)` - grouped procedures
- [ ] Seed procedure scope data
  - [ ] Sharp debridement (11042, 11043, 11044): ['MD', 'DO', 'PA', 'NP']
  - [ ] Selective debridement (97597, 97598): ['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']
  - [ ] NPWT (97605, 97606): ['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']
  - [ ] Wound care (97602): ['MD', 'DO', 'PA', 'NP', 'RN', 'LVN']
- [ ] Update treatment form (components/treatments/treatment-form.tsx)
  - [ ] Filter procedures by current user credentials
  - [ ] Show restricted procedures as disabled with tooltip
- [ ] Update billing form (components/billing/billing-form.tsx)
  - [ ] Filter CPT codes by credentials
  - [ ] Server-side validation on submission
- [ ] Update assessment form (components/assessments/assessment-form.tsx)
  - [ ] Hide sharp debridement options for RN/LVN
  - [ ] Show only "Selective debridement" and "No debridement" for RN/LVN
  - [ ] Show all debridement types for MD/DO/PA/NP
- [ ] Add server-side validation in visit actions
  - [ ] Reject if user tries to submit procedure outside scope
  - [ ] Return clear error message
- [ ] Build admin page for procedure scope management (app/dashboard/admin/procedures/page.tsx)
  - [ ] Only accessible by tenant admins
  - [ ] CRUD for procedure scopes
  - [ ] Bulk import from RN/LVN templates
- [ ] Test with different credentials
  - [ ] RN user: Cannot see sharp debridement codes
  - [ ] LVN user: Cannot see sharp debridement codes
  - [ ] MD user: Can see all procedures
  - [ ] Verify server-side validation rejects unauthorized procedures

**Deliverable:** Credential-based procedure filtering preventing out-of-scope documentation

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

### 7. Wound Types & Treatment Options

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

### 8. Wound-Based UI Philosophy (NEW)

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

### 9. Reporting Requirements

**Decision:** PDF export for visit summaries and wound progress, CSV export for data analysis.

- **Critical Reports:**
  - Visit summary PDF (per-visit export with all assessments, photos, treatments)
  - Wound progress report PDF (multi-visit comparison with before/after photos, measurement charts)
  - Patient list CSV (all patients with demographics, active wound count)
  - Visit log CSV (all visits with date, patient, status, time spent)
- **Frequency:** On-demand generation (no scheduled/automated reports in Phase 1)
- **Future:** Weekly/monthly automated reports, custom date range filtering, batch exports.

### 10. Device & Responsiveness

**Decision:** Desktop-first design with tablet/mobile responsiveness.

- **Primary Device:** Desktop (1920x1080 target resolution)
- **Secondary:** Tablet (iPad Pro 12.9", landscape orientation)
- **Mobile:** Responsive but not optimized (minimal phone usage expected)
- **Testing:** Chrome desktop, Safari tablet, basic mobile smoke tests
- **Forms:** Optimized for mouse/keyboard on desktop, touch-friendly on tablet
- **Future:** Dedicated mobile app (React Native) in post-MVP.

### 11. EHR Integration

**Decision:** CSV export sufficient for Phase 1, live integrations deferred.

- **Rationale:** Client confirmed CSV export meets immediate needs for data portability.
- **Implementation:**
  - Export patient list, visit logs, wound data as CSV
  - Manual import into Practice Fusion/PointClickCare as needed
- **Future:** Live read-only integration with PointClickCare and Practice Fusion APIs moved to post-MVP enhancements.

---

## Next Steps

**Design document has been approved and is ready for Phase 1 implementation.**

### ✅ Completed Actions (Weeks 1-10)

1. **Supabase Setup** ✅
   - Database tables configured using SQL schema
   - Row-Level Security policies enabled on all tables
   - Storage bucket configured for wound photos
   - Authentication enabled with email/password

2. **SQL Schema Migration** ✅
   - Complete SQL schema in `supabase/migrations/00001_initial_schema.sql`
   - Applied via Supabase SQL Editor
   - TypeScript types generated with `npm run db:types`
   - Supabase clients configured (server/client)

3. **Authentication Implementation** ✅
   - Supabase Auth integration complete
   - Login/logout flow functional
   - Protected routes middleware active
   - Session management via middleware

4. **Full Application** ✅
   - Complete UI with sidebar navigation
   - Header with user info
   - Dashboard with analytics charts
   - Patient, wound, visit, assessment, billing, and calendar management
   - PDF export and CSV reports
   - Photo upload and management
   - Seed script for test data

---

**Document Version:** 4.0 (Approved)  
**Last Updated:** November 18, 2025  
**Current Phase:** Phase 9 - Compliance & Signatures (Weeks 13-16)
