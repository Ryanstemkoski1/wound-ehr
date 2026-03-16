# Wound EHR

Modern Electronic Health Record (EHR) system designed for wound care management and treatment tracking.

---

## 📚 Documentation

- **[README.md](./README.md)** (this file) - Quick start guide and tech stack overview
- **[docs/SYSTEM_DESIGN.md](./docs/SYSTEM_DESIGN.md)** - Complete system architecture, database schema, and technical decisions
- **[docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)** - Current status and what's remaining
- **[docs/phase-11/](./docs/phase-11/)** - Phase 11 plan, AI research, test plan, user guide
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - AI development guidelines and patterns

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account ([supabase.com](https://supabase.com))
- Git

### Installation

```bash
# Clone repository
git clone <repo-url>
cd wound-ehr

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Generate TypeScript types from database
npm run db:types

# Seed test data (optional)
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the schema from `supabase/migrations/00001_complete_schema.sql`
4. Verify tables created in Database → Tables view
5. Optional: Seed test data with `npm run seed`

---

## 🛠️ Tech Stack

| Category      | Technology                      |
| ------------- | ------------------------------- |
| Framework     | Next.js 16.0.1 (App Router)     |
| React         | 19.2.0 with Server Components   |
| TypeScript    | Strict mode enabled             |
| Styling       | Tailwind CSS v4 (OKLCH colors)  |
| UI Components | shadcn/ui (new-york variant)    |
| Database      | Supabase PostgreSQL             |
| Auth          | Supabase Auth (email/password)  |
| Storage       | Supabase Storage (wound photos) |
| Forms         | react-hook-form + zod           |
| PDF           | @react-pdf/renderer             |
| Calendar      | React Big Calendar              |
| Icons         | Lucide React                    |
| Code Quality  | ESLint + Prettier               |

---

## 🗄️ Database

**20+ tables** with Row Level Security (RLS):

- `users` - User accounts with credentials (RN, LVN, MD, DO, PA, NP, CNA, Admin)
- `facilities` - Medical facilities/clinics
- `user_facilities` - User-facility associations (many-to-many)
- `patients` - Patient demographics and medical info
- `wounds` - Wound records with location, type, and status
- `visits` - Patient visit records with signature workflow
- `assessments` - Standard wound assessments with measurements
- `photos` - Wound photo metadata (files in Supabase Storage)
- `treatments` - Treatment plans and medical orders
- `billings` - Billing codes (CPT, ICD-10) and claims
- `signatures` - Electronic signatures with audit trail
- `patient_consents` - Initial consent-to-treat forms
- `procedure_scopes` - Credential-based procedure restrictions
- `patient_documents` - Patient document attachments (11 types)
- `skilled_nursing_assessments` - RN/LVN comprehensive assessment forms
- `grafting_assessments` - Skin graft procedure documentation
- `skin_sweep_assessments` - Full-body skin inspection forms
- `patient_clinicians` - Clinician-patient assignments with roles
- `addendum_notifications` - Post-approval change tracking
- `visit_transcripts` - AI audio transcripts and generated notes
- `patient_recording_consents` - Patient consent for AI recording

**Schema:** See `supabase/migrations/` (00001 base schema, 00027 AI transcription, 00028 trigger fix)  
**For detailed schema documentation, see [SYSTEM_DESIGN.md](./docs/SYSTEM_DESIGN.md)**

---

## 🎯 Key Features

> **For complete feature list and implementation status, see [PROJECT_STATUS.md](./PROJECT_STATUS.md)**

### Core Application (Phases 1-8) ✅

- Multi-tenant RBAC (Tenant Admin, Facility Admin, User)
- Patient & wound management with CRUD operations
- Calendar with drag-and-drop scheduling
- Multi-wound visit assessments with wound-centric UI
- Photo upload/management with comparison view
- PDF export (visit summaries, wound progress reports)
- Billing system (CPT/ICD-10 codes, reports, CSV export)
- Row Level Security for data isolation

### Compliance & Signatures (Phase 9.1-9.3) ✅

- Credentials-based roles (RN, LVN, MD, DO, PA, NP, CNA, Admin)
- Electronic signatures with immutable audit trail
- Initial consent workflow + Patient/Provider signatures
- Visit status workflow: draft → ready → signed → submitted
- Procedure restrictions (credential-based scope of practice)
- Autosave protection (client + server-side drafts)
- Visit addendums (post-signature notes)
- Signature audit logs (compliance reporting)

### Advanced Features (Phase 9.4) ✅

- Patient document attachments (11 types with viewer)
- RN/LVN skilled nursing assessment (17 clinical sections)
- Grafting assessment (skin graft procedure documentation)
- Skin sweep assessment (full-body skin inspection)
- Patient page redesign (tab-based layout)

### Phase 10 ✅

- ✅ Note approval workflow (office review, corrections, locking)
- ⚠️ Abbreviated clinical output (blocked — awaiting G-tube/wound templates)
- ✅ Calendar clinician filtering (patient assignments)
- ✅ Reporting by criteria (clinician/date/facility filters)
- ✅ Role-based field access (view-only demographics for clinicians)
- ✅ Data validation rules (treatment/tissue/measurement validation)
- ✅ Performance optimization (database indexes, query optimization)

### Phase 11.1: AI Clinical Note Generation ✅

- ✅ OpenAI Whisper speech-to-text transcription
- ✅ GPT-4 Turbo clinical note generation
- ✅ Patient recording consent workflow with signature
- ✅ Audio recording interface (waveform, pause/resume)
- ✅ Clinician review and approval interface
- ✅ Background processing with real-time status polling

**Next:** Phase 11.2–11.5 (mobile optimization, PDF enhancements, polish) — see [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)

---

## 📁 Project Structure

```
wound-ehr/
├── app/                      # Next.js App Router
│   ├── actions/              # Server Actions (21 files for DB operations)
│   ├── api/                  # API Route Handlers (audio upload)
│   ├── dashboard/            # Protected application pages
│   ├── auth/                 # Authentication pages
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind CSS v4 config
├── components/               # React components (130+ files)
│   ├── ui/                   # shadcn/ui components (40+ files)
│   ├── layout/               # Header, sidebar, navigation
│   ├── patients/             # Patient management
│   ├── wounds/               # Wound tracking
│   ├── visits/               # Visit management
│   ├── assessments/          # Assessment forms (standard, RN/LVN, grafting, skin sweep)
│   ├── signatures/           # Electronic signature components
│   ├── photos/               # Photo upload and management
│   ├── pdf/                  # PDF generation components
│   ├── admin/                # Admin components (inbox, corrections, audits)
│   ├── billing/              # Billing forms and reports
│   ├── calendar/             # Calendar views and filters
│   └── reports/              # Report components
├── lib/                      # Utilities and helpers
│   ├── supabase/             # Supabase client configurations (server, client, middleware)
│   ├── ai/                   # OpenAI service (Whisper + GPT-4)
│   ├── hooks/                # Custom React hooks (audio recorder, etc.)
│   ├── validations/          # Assessment validation rules
│   ├── database.types.ts     # Auto-generated TypeScript types
│   ├── rbac.ts               # Role-based access control
│   ├── credentials.ts        # Credential-based authorization
│   ├── field-permissions.ts  # Field-level access control
│   ├── billing-codes.ts      # CPT/ICD-10 code database
│   └── utils.ts              # Helper functions (cn, etc.)
├── supabase/                 # Database schema
│   ├── migrations/           # SQL migration files (00001, 00027, 00028)
│   └── seed.ts               # Seed script for test data
├── docs/                     # Documentation
│   ├── SYSTEM_DESIGN.md      # Architecture, schema, design decisions
│   ├── PROJECT_STATUS.md     # Current status and what's remaining
│   ├── phase-11/             # Phase 11 plan, research, test plan, user guide
│   └── archive/              # Historical phase completion reports
├── public/                   # Static assets (logos, icons)
└── README.md                 # This file - Quick start
```

---

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting

# Database
npm run db:types         # Generate TypeScript types from Supabase
npm run seed             # Seed test data
npm run seed:reset       # Reset and re-seed database
```

---

## 🔐 Authentication & Roles

### Administrative Roles

- **Tenant Admin** - Full system access, manage all facilities
- **Facility Admin** - Manage assigned facility, invite users
- **User** - Basic access for patient care

### Clinical Credentials

All users have ONE credential:

- **RN** (Registered Nurse) - Requires patient signatures
- **LVN** (Licensed Vocational Nurse) - Requires patient signatures
- **MD** (Medical Doctor) - No patient signatures required
- **DO** (Doctor of Osteopathy) - No patient signatures required
- **PA** (Physician Assistant) - No patient signatures required
- **NP** (Nurse Practitioner) - No patient signatures required
- **CNA** (Certified Nursing Assistant)
- **Admin** (Non-clinical staff)

Users can have both a role AND credential (e.g., "Facility Admin (RN)")

---

## 🚨 Important Development Notes

1. **Always consult `docs/SYSTEM_DESIGN.md` before development** - Authoritative source
2. **Use Supabase JS, NOT Prisma** - All DB operations via `@supabase/supabase-js`
3. **Server Components by default** - Use `"use client"` only when needed
4. **Tailwind v4** - Uses `@theme` directive in `globals.css`, not `tailwind.config.js`
5. **Database naming** - `snake_case` columns (e.g., `first_name`, `visit_date`)
6. **Import aliases** - Use `@/` prefix (e.g., `@/lib/utils`, `@/components/ui/button`)

---

## 🤝 Contributing

1. Review `docs/SYSTEM_DESIGN.md` for architecture and patterns
2. Check `docs/PROJECT_STATUS.md` for current features and roadmap
3. Follow conventions in `.github/copilot-instructions.md`
4. Run `npm run format` and `npm run lint:fix` before committing

---

## 📞 Support & Resources

- **System Architecture:** See `docs/SYSTEM_DESIGN.md`
- **Current Status:** See `docs/PROJECT_STATUS.md`

**Built with ❤️ for wound care specialists**
