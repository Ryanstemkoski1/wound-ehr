# Wound EHR - System Design Document

> **Version**: 2.2  
> **Date**: October 30, 2025  
> **Status**: ✅ **Approved - Production Ready** (Migrated from Prisma to Supabase JS)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Requirements](#project-requirements)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Frontend Architecture](#frontend-architecture)
6. [Key Features & Workflows](#key-features--workflows)
7. [Technology Stack](#technology-stack)
8. [Implementation Phases](#implementation-phases)
9. [Design Decisions](#design-decisions)

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
┌─────────────────┐
│     Visits      │
│─────────────────│
│ id (PK)         │
│ patient_id (FK) │
│ visit_date      │
│ visit_type      │ (in_person, telemed)
│ visit_location  │
│ status          │ (incomplete, complete)
│ time_spent_min  │
│ staff_member    │
│ addendum_count  │
│ notes           │
│ created_by (FK) │
│ created_at      │
│ updated_at      │
└─────────────────┘
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

### Key Schema Notes

1. **Authentication**: Simple email/password via Supabase Auth (no RBAC/roles)
2. **Multi-Facility Support**: Users can belong to multiple facilities via `UserFacilities` junction table, patients belong to one facility
3. **Patients & Wounds**: One patient can have multiple wounds (1:N)
4. **Visits**: Each visit is linked to a patient and can assess multiple wounds
5. **WoundAssessments**: Links a specific wound to a visit with all measurements
6. **Flexible Fields**: Use JSONB for arrays (infection_signs, risk_factors) to avoid rigid schema
7. **Billing**: CPT/ICD-10 codes tracked per visit for time-based and procedure-based billing
8. **Audit Trail**: All tables include `created_at`, `updated_at`, and `created_by` for tracking
9. **Soft Deletes**: Use `status` and `is_active` fields instead of hard deletes for compliance

---

## Frontend Architecture

### Application Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx           # Login page
│   └── layout.tsx              # Auth layout (no sidebar)
│
├── (dashboard)/
│   ├── layout.tsx              # Main dashboard layout (sidebar, header)
│   ├── page.tsx                # Dashboard home (overview)
│   │
│   ├── patients/
│   │   ├── page.tsx            # Patient list (searchable table)
│   │   ├── [id]/
│   │   │   ├── page.tsx        # Patient detail (overview, wounds, visits)
│   │   │   ├── wounds/
│   │   │   │   └── [woundId]/
│   │   │   │       └── page.tsx # Wound detail (history, photos)
│   │   │   └── visits/
│   │   │       ├── page.tsx    # Visit history for patient
│   │   │       └── [visitId]/
│   │   │           └── page.tsx # Visit detail/edit
│   │   └── new/
│   │       └── page.tsx        # Create new patient
│   │
│   ├── visits/
│   │   ├── page.tsx            # Calendar view of all visits
│   │   ├── new/
│   │   │   └── page.tsx        # Create new visit (select patient)
│   │   └── [id]/
│   │       └── page.tsx        # Visit assessment form
│   │
│   ├── billing/
│   │   └── page.tsx            # Billing reports dashboard (✅ Phase 6.5)
│   │
│   ├── calendar/
│   │   └── page.tsx            # Interactive calendar view
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
│   └── settings/
│       └── page.tsx            # User settings, facility management
│
└── actions/                    # Server Actions (Next.js 16)
    ├── patients.ts             # Patient CRUD actions
    ├── wounds.ts               # Wound CRUD actions
    ├── visits.ts               # Visit CRUD actions
    ├── assessments.ts          # Assessment creation/update
    ├── billing.ts              # Billing CRUD and reports (✅ Phase 6.5)
    ├── photos.ts               # Photo upload to Supabase Storage
    └── reports.ts              # PDF generation and export
            └── route.ts        # Export data to CSV

components/
├── ui/                         # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── textarea.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   ├── calendar.tsx
│   └── ...
│
├── forms/                      # Custom form components
│   ├── patient-form.tsx
│   ├── wound-assessment-form.tsx
│   ├── treatment-plan-form.tsx
│   └── preventive-orders-form.tsx
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
│   ├── visit-calendar.tsx     # React Big Calendar wrapper
│   ├── calendar-event.tsx     # Custom event rendering
│   └── calendar-toolbar.tsx   # Custom toolbar
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
│   └── middleware.ts           # Auth middleware utilities
├── database.types.ts           # Generated TypeScript types from Supabase
├── validations/
│   ├── patient.ts              # Zod schemas for patient data
│   ├── wound.ts                # Zod schemas for wound data
│   └── visit.ts                # Zod schemas for visit data
├── billing-codes.ts            # Common CPT/ICD-10/Modifier codes (✅ Phase 6.5)
└── utils/
    ├── calculations.ts         # Wound area, healing rate calculations
    ├── formatters.ts           # Date, number formatting
    ├── constants.ts            # Dropdown options, enums
    └── pdf-generator.ts        # PDF generation utilities
```

### Key UI Components & Workflows

#### 1. Patient List (Dashboard Home)

- Searchable/filterable table
- Columns: Name, MRN, Active Wounds, Last Visit, Next Scheduled
- Quick actions: View, New Visit, Edit
- Pagination

#### 2. Wound Assessment Form (Core Feature)

**Layout:** Split-screen design inspired by Aprima screenshots

**Left Panel:** Treatment Options (Checkboxes + Details)

- Collapsible sections by category
- Frequency dropdowns
- Conditional fields (e.g., "Type" when Collagen selected)

**Right Panel:** Treatment Orders/Instructions (Auto-generated)

- Yellow highlighted sections for selected treatments
- Pre-filled instructions based on selections
- Editable text areas for custom notes

**Top Section:** Patient Info + Wound Selection

- Patient name, visit date
- Dropdown to select which wound(s) to assess
- "Add New Wound" button

**Bottom Section:** Assessment Details

- Measurements (length, width, depth)
- Tissue composition (% sliders or inputs)
- Pressure stage (radio buttons)
- Healing status (radio buttons)
- Risk factors (checkboxes)
- Photo upload zone

**Footer:**

- Save Draft
- Complete Visit
- Print Summary

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

---

## Key Features & Workflows

### Workflow 1: New Patient Visit

1. **Start Visit**
   - Navigate to "New Visit" or click patient → "New Visit"
   - System creates visit record (status: incomplete)

2. **Patient Selection** (if not pre-selected)
   - Search by name or MRN
   - Select patient
   - View patient summary (demographics, active wounds)

3. **Wound Assessment**
   - For each active wound:
     - Record measurements
     - Take/upload photos
     - Document tissue composition
     - Note healing status
     - Check for infection signs

4. **Treatment Planning**
   - Select treatment options from checklist
   - System auto-generates treatment orders
   - Customize instructions as needed
   - Set frequency and schedule

5. **Preventive Orders**
   - Select applicable recommendations
   - Specify details (e.g., cushion type)

6. **Follow-Up**
   - Schedule next appointment OR
   - Mark for discharge

7. **Complete Visit**
   - Review summary
   - Save (status: complete)
   - Option to print/export

### Workflow 2: Add New Wound to Existing Patient

1. Navigate to patient detail page
2. Click "Add Wound"
3. Fill out wound creation form:
   - Location (dropdown or body diagram)
   - Wound type
   - Onset date
   - Initial assessment
4. Save wound
5. Wound appears in patient's active wound list

### Workflow 3: Compare Wound Progress

1. Navigate to wound detail page
2. Click "Compare Visits"
3. Select 2+ visits from timeline
4. View side-by-side:
   - Photos
   - Measurements (table + chart)
   - Tissue composition
   - Healing status
5. Export comparison report

### Workflow 4: Mark Wound as Healed

1. During visit assessment, select "Healed" status
2. System prompts: "Archive this wound?"
3. Confirm
4. Wound moved to "Healed Wounds" section (read-only)
5. No longer appears in active assessments

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

### Future Enhancements (Post-MVP)

- [ ] Advanced role-based access control (admin, clinician, scribe)
- [ ] AI-powered wound analysis (healing prediction)
- [ ] Patient portal (view own wound progress)
- [ ] Mobile app (React Native)
- [ ] Integration with PointClickCare (read-only patient data)
- [ ] Integration with Practice Fusion (read-only)
- [ ] Advanced PDF customization options
- [ ] Live data sync with other EHR systems
- [ ] Automated billing code suggestions based on visit type/treatments

---

## Design Decisions

This section documents all approved design decisions based on client requirements and technical considerations.

### 1. Authentication & Authorization

**Decision:** Simple email/password authentication via Supabase Auth, no role-based access control (RBAC) in Phase 1.

- **Rationale:** Client confirmed simple auth is sufficient initially. RBAC can be added in future enhancements if team grows.
- **Implementation:** Supabase Auth with email/password only. All authenticated users have equal access to all features.
- **Future:** Multi-role support (admin/clinician/scribe) moved to post-MVP enhancements.

### 2. Multi-Facility Support

**Decision:** Multi-facility support included in Phase 1.

- **Rationale:** Client confirmed multi-facility capability is required from the start.
- **Implementation:**
  - `Facilities` table with full facility details
  - `UserFacilities` junction table for many-to-many relationships
  - Each patient belongs to one facility (`patient.facility_id`)
  - Users can switch between facilities they have access to
- **UI:** Facility selector in header/settings, patient list filters by selected facility.

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

### 4. Library Selections

**Decision:** Agent selects appropriate libraries based on technical requirements.

**Calendar:**

- **Library:** React Big Calendar
- **Rationale:** Industry standard, highly customizable, supports Google Calendar sync
- **Features:** Drag-and-drop rescheduling, color-coded events, month/week/day views

**PDF Export:**

- **Library:** @react-pdf/renderer
- **Rationale:** Server-side rendering, React-based syntax, excellent for structured documents like visit summaries and wound progress reports
- **Features:** Custom layouts, embedded images (wound photos), professional styling

**CSV Export:**

- **Library:** None (custom implementation)
- **Rationale:** Simple CSV generation via JavaScript array manipulation, no need for external dependency
- **Implementation:** Server Action queries Supabase, formats as CSV string, returns as downloadable file

### 5. Data Migration

**Decision:** No data migration required.

- **Rationale:** Client has Supabase project ready, starting fresh with new system.
- **Implication:** Clean database start, no legacy data issues.

### 6. Photo Storage

**Decision:** Supabase Storage with reasonable limits, agent-defined retention policy.

- **Storage:** Supabase Storage buckets (HIPAA-compliant, CDN-backed)
- **Limits:**
  - Max 10 photos per wound per visit (configurable)
  - Max file size: 10MB per photo
  - Supported formats: JPEG, PNG, HEIC
- **Retention:** Photos retained indefinitely with patient record (required for HIPAA compliance)
- **Optimization:** Automatic thumbnail generation for gallery views

### 7. Wound Types & Treatment Options

**Decision:** Agent uses medical knowledge to define comprehensive wound types and treatment options.

- **Rationale:** Client relies on agent's expertise for clinical accuracy.
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

### 8. Reporting Requirements

**Decision:** PDF export for visit summaries and wound progress, CSV export for data analysis.

- **Critical Reports:**
  - Visit summary PDF (per-visit export with all assessments, photos, treatments)
  - Wound progress report PDF (multi-visit comparison with before/after photos, measurement charts)
  - Patient list CSV (all patients with demographics, active wound count)
  - Visit log CSV (all visits with date, patient, status, time spent)
- **Frequency:** On-demand generation (no scheduled/automated reports in Phase 1)
- **Future:** Weekly/monthly automated reports, custom date range filtering, batch exports.

### 9. Device & Responsiveness

**Decision:** Desktop-first design with tablet/mobile responsiveness.

- **Primary Device:** Desktop (1920x1080 target resolution)
- **Secondary:** Tablet (iPad Pro 12.9", landscape orientation)
- **Mobile:** Responsive but not optimized (minimal phone usage expected)
- **Testing:** Chrome desktop, Safari tablet, basic mobile smoke tests
- **Forms:** Optimized for mouse/keyboard on desktop, touch-friendly on tablet
- **Future:** Dedicated mobile app (React Native) in post-MVP.

### 10. EHR Integration

**Decision:** CSV export sufficient for Phase 1, live integrations deferred.

- **Rationale:** Client confirmed CSV export meets immediate needs for data portability.
- **Implementation:**
  - Export patient list, visit logs, wound data as CSV
  - Manual import into Practice Fusion/PointClickCare as needed
- **Future:** Live read-only integration with PointClickCare and Practice Fusion APIs moved to post-MVP enhancements.

---

## Next Steps

---

## Appendix: Screenshots Analysis

### Screenshot 1: Treatment Order Form (Bottom Section)

- Treatment options (left panel): Wound Gel, Xeroform, Hydrogel, Oil Emulsion, etc.
- Treatment orders (right panel): Auto-generated instructions
- Frequency selector: "Every X Days (and PRN)"
- Key insight: **Split-screen design for efficient data entry**

### Screenshot 2: Negative Pressure Wound Therapy + Preventive Care

- NPWT settings: mmHg pressure, frequency (M-W-F, T-TH-SA, Clear)
- Preventive recommendations: Air mattress, repositioning, off-load, etc.
- Chair cushion type: Gel vs. ROHO (for stage 3/4 pressure injury)
- Key insight: **Conditional fields based on wound severity**

### Screenshot 3: Protection/Secondary Dressings + More

- Multiple dressing types with custom input fields
- Enzymatic debridement (Santyl)
- MASD/Moisture management options
- Venous/lymphatic insufficiency treatments (UNNA boots, etc.)
- Key insight: **Extensive treatment catalog with mix of checkboxes and text inputs**

### Screenshot 4: Additional Antimicrobial + NPWT (Repeated)

- Cadexomer Iodine directions
- Hydrofera Blue frequency
- PHMB (Polyhexamethylene Biguanide) notes section
- Key insight: **Notes sections for special instructions**

### Screenshot 5: Follow-Up + Time Component

- Follow-up appointment vs. Discharge radio buttons
- Time component: "45+ minutes spent including examination, treatment, counseling"
- Additional notes/orders text area
- Key insight: **Billing documentation embedded in visit workflow**

### Screenshot 6: Wound Assessment Tab

- Visit location: In-person vs. Telemed
- Wound type selection (extensive list)
- Wound onset date picker
- Pressure injury staging
- Healing status: Initial, Healing, Same/Stable, Declined, Healed, Sign Off
- At risk for reopening (checkboxes)
- Measurements section (L × W × D)
- Tissue composition (Epithelial %, Granulation %, Slough %)
- Key insight: **Comprehensive assessment form with yellow highlights for required fields**

### Screenshot 7: Visit History Sidebar

- Left sidebar shows visit dates with "Number of Addenda"
- Tracks incomplete visits
- Quick navigation between visit records
- Key insight: **Visit timeline for easy access to historical data**

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

### Phase 1 Deliverables (Weeks 1-2)

- Working authentication system
- Patient CRUD operations (Create, Read, Update, soft Delete)
- Facility management (create/edit facilities)
- User can create patients and assign to facilities
- Basic responsive layout with shadcn/ui components

---

## Appendix: Screenshots Analysis

### Screenshot 1: Treatment Order Form (Bottom Section)

- Treatment options (left panel): Wound Gel, Xeroform, Hydrogel, Oil Emulsion, etc.
- Treatment orders (right panel): Auto-generated instructions
- Frequency selector: "Every X Days (and PRN)"
- Key insight: **Split-screen design for efficient data entry**

### Screenshot 2: Negative Pressure Wound Therapy + Preventive Care

- NPWT settings: mmHg pressure, frequency (M-W-F, T-TH-SA, Clear)
- Preventive recommendations: Air mattress, repositioning, off-load, etc.
- Chair cushion type: Gel vs. ROHO (for stage 3/4 pressure injury)
- Key insight: **Conditional fields based on wound severity**

### Screenshot 3: Protection/Secondary Dressings + More

- Multiple dressing types with custom input fields
- Enzymatic debridement (Santyl)
- MASD/Moisture management options
- Venous/lymphatic insufficiency treatments (UNNA boots, etc.)
- Key insight: **Extensive treatment catalog with mix of checkboxes and text inputs**

### Screenshot 4: Additional Antimicrobial + NPWT (Repeated)

- Cadexomer Iodine directions
- Hydrofera Blue frequency
- PHMB (Polyhexamethylene Biguanide) notes section
- Key insight: **Notes sections for special instructions**

### Screenshot 5: Follow-Up + Time Component

- Follow-up appointment vs. Discharge radio buttons
- Time component: "45+ minutes spent including examination, treatment, counseling"
- Additional notes/orders text area
- Key insight: **Billing documentation embedded in visit workflow**

### Screenshot 6: Wound Assessment Tab

- Visit location: In-person vs. Telemed
- Wound type selection (extensive list)
- Wound onset date picker
- Pressure injury staging
- Healing status: Initial, Healing, Same/Stable, Declined, Healed, Sign Off
- At risk for reopening (checkboxes)
- Measurements section (L × W × D)
- Tissue composition (Epithelial %, Granulation %, Slough %)
- Key insight: **Comprehensive assessment form with yellow highlights for required fields**

### Screenshot 7: Visit History Sidebar

- Left sidebar shows visit dates with "Number of Addenda"
- Tracks incomplete visits
- Quick navigation between visit records
- Key insight: **Visit timeline for easy access to historical data**

---

## Version History

### Version 2.1 (October 30, 2025)

**Changes:**

- ✅ Added Phase 6.5: Billing System to implementation phases
- ✅ Updated Design Decision #3 (Billing & CPT Codes) to reflect completed implementation
- ✅ Added billing routes to Frontend Architecture (`/dashboard/billing`)
- ✅ Added billing components (`billing-form.tsx`, `billing-reports-client.tsx`)
- ✅ Added billing-codes.ts to lib structure
- ✅ Marked Phase 6 (PDF Export & Reporting) as completed
- ✅ Marked Phase 6.5 (Billing System) as completed
- ✅ Moved automated billing code suggestions to Future Enhancements

**Features Added:**

- Searchable dropdowns for CPT codes (30+), ICD-10 codes (40+), modifiers (20+)
- Billing reports dashboard with filtering and CSV export
- Billing integration in visit workflow
- Billing data in PDF exports

### Version 2.0 (October 29, 2025)

**Changes:**

- Initial approved system design document
- 10 implementation phases defined
- Complete database schema with 10+ tables
- Frontend architecture with app router structure
- Technology stack finalized
- Design decisions documented

---

**Document Version:** 2.1 (Approved)

**Last Updated:** October 30, 2025

**Ready for Implementation:** ✅ Yes
