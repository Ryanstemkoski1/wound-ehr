# Wound EHR

Modern Electronic Health Record (EHR) system designed for wound care management and treatment tracking.

---

## 📚 Documentation

**Start here:**
- **[README.md](./README.md)** (this file) - Quick start guide and tech stack overview
- **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Complete system architecture, database schema, and technical decisions
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current status, completed features, and next phase planning

**Additional resources:**
- **[docs/ENV_SETUP_GUIDE.md](./docs/ENV_SETUP_GUIDE.md)** - Detailed environment setup instructions
- **[docs/archive/](./docs/archive/)** - Historical phase completion reports (reference only)
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - Development guidelines and patterns

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
3. Run migrations in order from `supabase/migrations/` (24 files)
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

**17 core tables** with Row Level Security (RLS):

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

**Schema:** See `supabase/migrations/` (24 migrations)  
**For detailed schema documentation, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)**

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

### Next Phase (Phase 10) 🔄

- Production deployment preparation
- Bulk photo uploads
- Document versioning
- Performance optimization
- Enhanced mobile experience

**Phase 9.4.2+: Specialized Templates & Features**

- RN/LVN shorthand note template (awaiting client input)
- Specialized assessment types (Grafting, Skin Sweep, G-tube)
- Document versioning and bulk uploads

**Phase 7: Analytics & Polish**

- Dashboard charts and wound healing metrics
- Performance optimization
- Accessibility improvements (WCAG 2.1 AA)
- Mobile/tablet responsiveness
- User testing and documentation

---

---

## 📁 Project Structure

```
wound-ehr/
├── app/                      # Next.js App Router
│   ├── actions/              # Server Actions (16 files for DB operations)
│   ├── dashboard/            # Protected application pages
│   ├── auth/                 # Authentication pages
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind CSS v4 config
├── components/               # React components (110+ files)
│   ├── ui/                   # shadcn/ui components (40+ files)
│   ├── layout/               # Header, sidebar, navigation
│   ├── patients/             # Patient management
│   ├── wounds/               # Wound tracking
│   ├── visits/               # Visit management
│   ├── assessments/          # Assessment forms (standard, RN/LVN, grafting, skin sweep)
│   ├── signatures/           # Electronic signature components
│   ├── photos/               # Photo upload and management
│   └── pdf/                  # PDF generation components
├── lib/                      # Utilities and helpers
│   ├── supabase/             # Supabase client configurations (server, client, middleware)
│   ├── database.types.ts     # Auto-generated TypeScript types
│   ├── rbac.ts               # Role-based access control
│   ├── credentials.ts        # Credential-based authorization
│   ├── procedures.ts         # Procedure restriction logic
│   ├── autosave.ts           # Autosave utilities
│   ├── billing-codes.ts      # CPT/ICD-10 code database
│   └── utils.ts              # Helper functions (cn, etc.)
├── supabase/                 # Database schema
│   ├── migrations/           # 24 SQL migration files
│   └── seed.ts               # Seed script for test data
├── docs/                     # Documentation
│   ├── ENV_SETUP_GUIDE.md    # Detailed setup instructions
│   └── archive/              # Historical phase reports (reference)
├── public/                   # Static assets (logos, icons)
├── README.md                 # This file - Quick start
├── SYSTEM_DESIGN.md          # Complete architecture
└── PROJECT_STATUS.md         # Current status and roadmap
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

1. **Always consult `SYSTEM_DESIGN.md` before development** - Authoritative source
2. **Use Supabase JS, NOT Prisma** - All DB operations via `@supabase/supabase-js`
3. **Server Components by default** - Use `"use client"` only when needed
4. **Tailwind v4** - Uses `@theme` directive in `globals.css`, not `tailwind.config.js`
5. **Database naming** - `snake_case` columns (e.g., `first_name`, `visit_date`)
6. **Import aliases** - Use `@/` prefix (e.g., `@/lib/utils`, `@/components/ui/button`)

---

## 🤝 Contributing

1. Review `SYSTEM_DESIGN.md` for architecture and patterns
2. Check `PROJECT_STATUS.md` for current features and roadmap
3. Follow conventions in `.github/copilot-instructions.md`
4. Run `npm run format` and `npm run lint:fix` before committing

---

## 📞 Support & Resources

- **System Architecture:** See `SYSTEM_DESIGN.md`
- **Current Status:** See `PROJECT_STATUS.md`
- **Setup Help:** See `docs/ENV_SETUP_GUIDE.md`
- **Phase History:** See `docs/archive/`

**Built with ❤️ for wound care specialists**
