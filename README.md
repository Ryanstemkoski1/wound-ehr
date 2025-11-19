# Wound EHR

Modern Electronic Health Record (EHR) system designed for wound care management and treatment tracking.

**All development follows the comprehensive system design in [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md).**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account ([supabase.com](https://supabase.com))

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations in Supabase SQL Editor
# (Copy content from supabase/migrations/00001_initial_schema.sql)

# Generate TypeScript types from database
npm run db:types

# Seed test data (optional)
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`

---

## 📚 Documentation

- **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - ⚠️ **READ FIRST** - Complete system architecture, database schema, implementation roadmap (v4.1)
- **[PHASE_9_COMPREHENSIVE_REVIEW.md](./PHASE_9_COMPREHENSIVE_REVIEW.md)** - Phase 9 implementation review and production readiness assessment
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Production deployment steps and testing procedures
- **[docs/PHASE_9.2_COMPLETION.md](./docs/PHASE_9.2_COMPLETION.md)** - Electronic signatures implementation details

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16.0.1 (App Router) |
| React | 19.2.0 with Server Components |
| TypeScript | Strict mode enabled |
| Styling | Tailwind CSS v4 (OKLCH colors) |
| UI Components | shadcn/ui (new-york variant) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (wound photos) |
| Forms | react-hook-form + zod |
| PDF | @react-pdf/renderer |
| Calendar | React Big Calendar |
| Icons | Lucide React |
| Code Quality | ESLint + Prettier |

---

## 🗄️ Database

**12 core tables** with Row Level Security (RLS):

- `users` - User accounts with credentials (RN, LVN, MD, etc.)
- `facilities` - Medical facilities/clinics
- `user_facilities` - User-facility associations (many-to-many)
- `patients` - Patient demographics and medical info
- `wounds` - Wound records with location and type
- `visits` - Patient visit records with signature workflow
- `assessments` - Detailed wound assessments
- `photos` - Wound photo metadata (files in Supabase Storage)
- `treatments` - Treatment plans and medical orders
- `billings` - Billing codes (CPT, ICD-10) and claims
- `signatures` - Electronic signatures with audit trail ✨ NEW
- `patient_consents` - Initial consent-to-treat forms ✨ NEW

**Schema:** See `supabase/migrations/` (17 migrations executed)

---

## 🎯 Key Features

### ✅ Phase 1-8: Core Application (COMPLETE)

- 👥 Multi-tenant RBAC (Tenant Admin, Facility Admin, User)
- 🏥 Patient & wound management with CRUD operations
- 📅 Calendar with drag-and-drop scheduling
- 📝 Multi-wound visit assessments with wound-centric UI
- 📸 Photo upload/management with comparison view
- 📄 PDF export (visit summaries, wound progress reports)
- 💰 Billing system (CPT/ICD-10 codes, reports, CSV export)
- 📧 Email-based user invites with role assignment
- 🔐 Row Level Security for data isolation
- 📋 Admin dashboard with user/facility/invite management

### ✅ Phase 9.1-9.2: Compliance & Signatures (COMPLETE) ✨ NEW

- 🏥 **Credentials-based roles** (RN, LVN, MD, DO, PA, NP, CNA, Admin)
- ✍️ **Electronic signatures** with immutable audit trail
- 📝 **Initial consent** workflow (blocks first visit until signed)
- 👤 **Patient signatures** (required for RN/LVN visits only)
- 👨‍⚕️ **Provider signatures** (all clinical staff)
- 🔄 **Visit status workflow**: draft → ready → signed → submitted
- 🔒 **Read-only enforcement** for signed/submitted visits
- 📄 **PDF signatures** included in visit exports
- 📱 **Dual-mode signature pad** (draw with canvas OR type with keyboard)

### 🚧 Next Phase

**Phase 7: Analytics & Polish**
- Dashboard charts and wound healing metrics
- Performance optimization
- Accessibility improvements (WCAG 2.1 AA)
- Mobile/tablet responsiveness
- User testing and documentation

---

## 📁 Project Structure

```
wound-ehr/
├── app/                      # Next.js App Router
│   ├── actions/              # Server Actions (database operations)
│   ├── dashboard/            # Main application pages
│   │   ├── admin/            # Admin management (users, facilities)
│   │   ├── billing/          # Billing reports
│   │   ├── calendar/         # Calendar view
│   │   ├── patients/         # Patient management
│   │   └── wounds/           # Wound tracking
│   ├── auth/                 # Authentication pages
│   ├── login/                # Login page
│   ├── signup/               # Signup (disabled, invite-only)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind CSS v4 config
├── components/               # React components
│   ├── layout/               # Header, sidebar, navigation
│   ├── ui/                   # shadcn/ui components
│   ├── patients/             # Patient-specific components
│   ├── wounds/               # Wound assessment components
│   ├── visits/               # Visit management components
│   ├── assessments/          # Multi-wound assessment forms
│   ├── calendar/             # Calendar components
│   ├── billing/              # Billing components
│   └── pdf/                  # PDF generation components
├── lib/                      # Utilities and helpers
│   ├── supabase/             # Supabase client setup
│   ├── database.types.ts     # Generated TypeScript types
│   ├── rbac.ts               # Role-based access control
│   ├── billing-codes.ts      # CPT/ICD-10 code database
│   └── utils.ts              # Helper functions (cn, etc.)
├── supabase/                 # Database schema and migrations
│   ├── migrations/           # SQL migration files
│   └── seed.ts               # Seed script for test data
├── public/                   # Static assets (logos, icons)
└── SYSTEM_DESIGN.md          # Complete technical specification
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
npm run lint:fix         # Run ESLint and auto-fix issues
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without writing changes

# Database
npm run db:types         # Generate TypeScript types from Supabase
npm run seed             # Seed database with test data
npm run seed:reset       # Reset and re-seed database
```

---

## 🎨 Design System

### Colors (OKLCH)

- **Primary (Teal)**: `oklch(0.52 0.12 192)` light, `oklch(0.65 0.14 192)` dark
- **Secondary (Amber)**: `oklch(0.92 0.08 85)` light, `oklch(0.35 0.06 85)` dark
- **Accent (Red)**: `oklch(0.58 0.22 25)` light, `oklch(0.62 0.20 25)` dark
- **Base**: Zinc for backgrounds and borders

### Typography

- **Sans**: Geist Sans
- **Mono**: Geist Mono
- **Base Radius**: 0.625rem (10px)

### Branding Assets

- `logo.svg` - Horizontal logo (400×120)
- `logo-horizontal.svg` - Extended logo with tagline (800×200)
- `icon.svg` - Square app icon (512×512)
- Design: Medical cross with wound healing waves, teal primary color

---

## 🔐 Authentication & Roles

### Administrative Roles

1. **Tenant Admin** - Full access to all facilities, manage users, facilities, and invites
2. **Facility Admin** - Access to assigned facility, can invite users to their facility
3. **User** - Basic access to assigned facilities for patient care

### Clinical Credentials (NEW - Phase 9.1)

All users must have ONE credential:
- **RN** (Registered Nurse) - Requires patient signatures
- **LVN** (Licensed Vocational Nurse) - Requires patient signatures
- **MD** (Medical Doctor) - No patient signatures required
- **DO** (Doctor of Osteopathy) - No patient signatures required
- **PA** (Physician Assistant) - No patient signatures required
- **NP** (Nurse Practitioner) - No patient signatures required
- **CNA** (Certified Nursing Assistant)
- **Admin** (Non-clinical administrative staff)

**Example:** A user can be "Facility Admin (RN)" - both an administrative role AND clinical credential.

### Invite System

- Email-based invites with role + credentials assignment
- Auto-assigns to tenant during signup via invite token
- Facility assignment for facility admins and users
- Credentials captured during invite and stored on user record

---

## 🚨 Important Notes

1. **Always consult `SYSTEM_DESIGN.md` before development** - Authoritative source for all architectural decisions
2. **Use Supabase JS, NOT Prisma** - All DB operations use `@supabase/supabase-js`
3. **Server Components by default** - Use `"use client"` only when needed
4. **Tailwind v4 specifics** - Uses `@theme` directive in `globals.css`, not `tailwind.config.js`
5. **Column naming** - `snake_case` in database (e.g., `first_name`, `visit_date`)

---

## 📝 Code Conventions

### TypeScript

- Strict mode enabled
- Use `type` over `interface`
- Handle all type safety

### React Patterns

- Prefer Server Components (RSC enabled)
- Async Server Components for data fetching
- Server Actions for mutations (`"use server"` directive)

### File Naming

- Components: PascalCase (`Button.tsx`)
- Utilities: camelCase (`utils.ts`)
- Routes: lowercase (`page.tsx`, `layout.tsx`)

### Styling

- Use `cn()` utility for conditional classes
- Tailwind CSS with design system tokens
- Import aliases with `@/` prefix (e.g., `@/lib/utils`)

---

## 🤝 Contributing

1. Review `SYSTEM_DESIGN.md` for context
2. Follow code conventions in `.github/copilot-instructions.md`
3. Test thoroughly before committing
4. Run `npm run format` and `npm run lint:fix` before pushing

---

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for wound care specialists**
