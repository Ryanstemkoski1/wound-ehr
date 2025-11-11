# Wound EHR# Wound EHR



A modern Electronic Health Record (EHR) system designed specifically for wound care management and treatment tracking.A modern Electronic Health Record (EHR) system designed specifically for wound care management and treatment tracking.



## 📋 System Design## 🚀 Quick Start## 📋 System Design



**All development follows the comprehensive system design in [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md).**### Prerequisites**All development follows the comprehensive system design in [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md).**



The design document includes:- Node.js 18+ and npmThe design document includes:

- Complete database schema (Supabase PostgreSQL)

- Frontend architecture with Server Components + Server Actions- Supabase account ([supabase.com](https://supabase.com))

- UI/UX workflows for wound assessments and photo management

- 10-week implementation roadmap- Complete database schema (Supabase PostgreSQL)

- Technology stack and approved design decisions

### Installation- Frontend architecture with Server Components + Server Actions

**Before working on any feature, review the relevant section in `SYSTEM_DESIGN.md`.**

- UI/UX workflows for wound assessments and photo management

---

````bash- 10-week implementation roadmap

## Tech Stack

# Install dependencies- Technology stack and approved design decisions

- **Framework**: Next.js 16.0.1 (App Router with Server Components)

- **React**: 19.2.0npm install

- **TypeScript**: Strict mode

- **Styling**: Tailwind CSS v4 (PostCSS, OKLCH colors)**Before working on any feature, review the relevant section in `SYSTEM_DESIGN.md`.**

- **UI Components**: shadcn/ui (new-york variant)

- **Database**: Supabase PostgreSQL# Set up environment variables

- **Auth**: Supabase Auth (email/password, invite-only)

- **Storage**: Supabase Storage (wound photos)cp .env.example .env.local---

- **Calendar**: React Big Calendar with drag-and-drop

- **PDF Export**: @react-pdf/renderer# Edit .env.local with your Supabase credentials

- **Icons**: Lucide React

- **Code Quality**: ESLint + Prettier## Tech Stack



---# Start development server



## Getting Startednpm run dev- **Framework**: Next.js 16.0.1 (App Router with Server Components)



### Prerequisites```- **React**: 19.2.0



- Node.js 18+ and npm- **TypeScript**: Strict mode

- Supabase account ([supabase.com](https://supabase.com))

Open [http://localhost:3000](http://localhost:3000) and sign up to get started.- **Styling**: Tailwind CSS v4 (PostCSS, OKLCH colors)

### Installation

- **UI Components**: shadcn/ui (new-york variant)

```bash

# Install dependencies### Database Setup- **Database**: Supabase PostgreSQL + Prisma ORM

npm install

- **Auth**: Supabase Auth (email/password)

# Set up environment variables

cp .env.example .env.local1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project- **Storage**: Supabase Storage (wound photos)



# Edit .env.local with your Supabase credentials2. **Apply Schema**: In Supabase SQL Editor, run `supabase/migrations/00001_initial_schema.sql`- **Calendar**: React Big Calendar

```

3. **Generate Types**: Run `npm run db:types` to create TypeScript types- **PDF Export**: @react-pdf/renderer

### Database Setup

4. **Seed Data** (optional): Run `npm run seed` to populate with test data- **Icons**: Lucide React

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project

2. **Apply Migrations**: In Supabase SQL Editor, run migrations from `supabase/migrations/`- **Code Quality**: ESLint + Prettier

   - `00001_initial_schema.sql` - Core tables

   - `00002_phase8_rbac_wound_notes.sql` - Multi-tenant RBAC## 📋 Tech Stack

   - `00004_emergency_disable_rls.sql` - RLS adjustments

   - `00005_setup_default_tenant.sql` - Default tenant setup## Getting Started

   - `00006_update_visit_status_enum.sql` - Visit status updates

3. **Generate Types**: Run `npm run db:types` to create TypeScript types- **Framework**: Next.js 16 (App Router, Server Components)

4. **Seed Data** (optional): Run `npm run seed` to populate with test data

- **React**: 19 with React Compiler### Installation

### Development

- **TypeScript**: Strict mode enabled

```bash

npm run dev- **Database**: Supabase PostgreSQL```bash

```

- **Auth**: Supabase Auth (email/password)npm install

Open [http://localhost:3000](http://localhost:3000) to view the application.

- **Storage**: Supabase Storage (wound photos)```

### Available Commands

- **Styling**: Tailwind CSS v4 (OKLCH colors)

```bash

npm run dev          # Start dev server (localhost:3000)- **UI**: shadcn/ui components (new-york variant)### Development

npm run build        # Production build

npm run start        # Start production server- **Forms**: React Hook Form + Zod validation

npm run lint         # Run ESLint

npm run lint:fix     # Run ESLint and auto-fix issues- **PDF**: @react-pdf/renderer```bash

npm run format       # Format all files with Prettier

npm run format:check # Check formatting without writing changes- **Calendar**: React Big Calendarnpm run dev

npm run db:types     # Generate TypeScript types from Supabase database

npm run seed         # Seed database with test data- **Icons**: Lucide React```

npm run seed:reset   # Reset and re-seed database

```



---## 🎯 Key FeaturesOpen [http://localhost:3000](http://localhost:3000) to view the application.



## Key Features



### Patient Management### Patient Management### Available Commands

- Multi-facility support with user-facility relationships

- Complete patient demographics and medical history- Multi-facility support with user-facility relationships

- Wound-centric patient detail pages

- Active wounds tracking with measurements and photos- Complete patient demographics and medical history```bash



### Wound Care- Insurance information (primary/secondary)npm run dev          # Start dev server (localhost:3000)

- Comprehensive wound assessments

- Progress tracking with photo timeline- Emergency contacts and allergies trackingnpm run build        # Production build

- Per-wound notes with timestamps

- Location mapping and wound numberingnpm run start        # Start production server

- Status tracking (active, healed, monitoring, closed)

### Wound Carenpm run lint         # Run ESLint

### Visit Management

- Visit scheduling with calendar view- Comprehensive wound assessments with 70+ anatomical locationsnpm run lint:fix     # Run ESLint and auto-fix issues

- In-person and telemedicine visits

- 5-status workflow: scheduled, in-progress, completed, cancelled, no-show- Tissue type percentages (epithelial, granulation, slough)npm run format       # Format all files with Prettier

- Multi-wound assessment forms with smart switcher

- Auto-save when switching between wounds- Measurement tracking (length, width, depth, area)npm run format:check # Check formatting without changes

- Progress indicators with checkmarks

- Healing status monitoring and progress notes```

### Calendar Features

- Monthly/weekly/daily views- Photo documentation with Supabase Storage

- Event details modal with inline editing

- Status change dropdown## Project Structure

- Drag-and-drop appointment rescheduling

- Patient and facility filtering### Visit Tracking



### Billing & Documentation- In-person and telehealth visit support```

- ICD-10 and CPT code management

- Billing code search and validation- Treatment plans and medical orderswound-ehr/

- Visit documentation with time tracking

- PDF export for patient summaries and wound progress reports- Follow-up scheduling (appointment/discharge)├── app/              # Next.js App Router (pages, layouts, routes)



### Multi-Tenant RBAC- Time spent tracking and additional notes├── components/       # Reusable React components (shadcn/ui)

- **Tenant Admin**: Full access to tenant resources

- **Facility Admin**: Manage assigned facilities- Visit status workflow (complete/incomplete)├── lib/              # Utilities and helpers

- **User**: Standard clinician access

- Invite-only registration system├── public/           # Static assets (logos, icons)

- Email-based user invitations

### Billing System└── .github/          # GitHub configuration

---

- Searchable CPT and ICD-10 code libraries```

## Project Structure

- Multiple code assignment per visit

```

wound-ehr/- Modifier support and time-spent billing## Design System

├── app/                      # Next.js App Router

│   ├── actions/              # Server Actions (database operations)- Billing reports with export to CSV

│   ├── auth/                 # Authentication pages

│   ├── dashboard/            # Main application pages- Filter by facility, date range, patient### Colors (OKLCH format)

│   │   ├── admin/            # Admin management (users, facilities)

│   │   ├── billing/          # Billing reports

│   │   ├── calendar/         # Calendar view

│   │   ├── patients/         # Patient management### Reporting- **Primary (Teal)**: Medical/healthcare theme

│   │   └── wounds/           # Wound tracking

│   ├── login/                # Login page- PDF visit summaries with wound assessments- **Secondary (Amber)**: Warm accents

│   └── signup/               # Signup (disabled, invite-only)

├── components/               # React components- Wound progress reports with photo timelines- **Accent (Red)**: Alerts and important actions

│   ├── ui/                   # shadcn/ui components

│   ├── layout/               # Layout components (sidebar, header)- Calendar view of scheduled visits- **Base (Zinc)**: Backgrounds and borders

│   ├── patients/             # Patient-related components

│   ├── wounds/               # Wound management components- CSV export for billing and patient data

│   ├── visits/               # Visit components

│   ├── assessments/          # Assessment forms- Dashboard analytics (wound status, healing trends)### Typography

│   ├── calendar/             # Calendar components

│   ├── billing/              # Billing components

│   └── pdf/                  # PDF generation components

├── lib/                      # Shared utilities## 📁 Project Structure- **Sans**: Geist Sans (body text)

│   ├── supabase/             # Supabase client configurations

│   ├── database.types.ts     # Auto-generated TypeScript types- **Mono**: Geist Mono (code)

│   ├── rbac.ts               # Role-based access control

│   └── utils.ts              # Utility functions````

├── supabase/                 # Database files

│   ├── migrations/           # SQL migration fileswound-ehr/### Branding Assets

│   ├── seed.ts               # Database seed script

│   └── README.md             # Database documentation├── app/ # Next.js App Router

├── scripts/                  # Utility scripts

│   ├── debug/                # Debug scripts (organized)│ ├── actions/ # Server Actions (database operations)- `logo.svg` - Horizontal logo (400×120)

│   └── admin/                # Admin utility scripts

├── docs/                     # Documentation│ ├── dashboard/ # Protected application pages- `logo-horizontal.svg` - Extended logo with tagline (800×200)

│   ├── PHASE_8.1_TESTING_GUIDE.md

│   ├── PHASE_8.3_TESTING_GUIDE.md│ ├── login/ # Authentication pages- `icon.svg` - Square app icon (512×512)

│   ├── PHASE_8.3_COMPLETION.md

│   ├── PHASE_8.4.1_COMPLETION.md│ ├── signup/- `favicon.svg` - Browser favicon (32×32)

│   ├── PASSWORD_RESET_GUIDE.md

│   └── EMAIL_INVITE_SETUP.md│ ├── layout.tsx # Root layout

├── SYSTEM_DESIGN.md          # Comprehensive system design (v2.2)

├── SETUP_NOTES_NOV4.md       # Progress tracking and notes│ └── globals.css # Tailwind CSS v4 config## Code Conventions

└── README.md                 # This file

```├── components/ # React components



---│ ├── layout/ # Header, sidebar, navigation- **Import Aliases**: Use `@/` prefix (e.g., `@/lib/utils`)



## Implementation Status│ ├── ui/ # shadcn/ui components- **Component Styling**: Use `cn()` utility for conditional classes



### ✅ Phase 8.1 - Multi-Tenant RBAC (COMPLETE)│ ├── patients/ # Patient-specific components- **Server Actions**: Use `"use server"` directive for mutations

- User management with roles

- Facility management│ ├── wounds/ # Wound assessment components- **File Naming**:

- Email-based invitations

- Route protection│ ├── visits/ # Visit management components - Components: PascalCase (`Button.tsx`)



### ✅ Phase 8.2 - Wound-Based Patient Detail (COMPLETE)│ └── billing/ # Billing components - Utilities: camelCase (`utils.ts`)

- Redesigned patient pages

- Per-wound tracking├── lib/ # Utilities and helpers - Routes: lowercase (`page.tsx`, `layout.tsx`)

- Photo and visit timeline

│ ├── supabase/ # Supabase client setup

### ✅ Phase 8.3 - Multi-Wound Assessment Form (COMPLETE)

- Intelligent wound switcher│ ├── database.types.ts # Generated TypeScript types## Implementation Phases

- Radio buttons & checkboxes

- Auto-save functionality│ └── utils.ts # Helper functions (cn, etc.)

- Progress tracking

├── supabase/ # Database schema and migrationsThe project follows a **10-week implementation roadmap** (see `SYSTEM_DESIGN.md`):

### ✅ Phase 8.4.1 - Calendar Event Modal (COMPLETE)

- Fixed 404 error│ ├── migrations/ # SQL migration files

- Status change dropdown

- Edit/Delete actions│ ├── seed.ts # Seed script for test data- ✅ **Phase 1-2 (Weeks 1-4)**: Foundation, auth, patient/wound/visit CRUD - **COMPLETED**

- 5-status visit workflow

│ └── README.md # Schema documentation- ✅ **Phase 3 (Weeks 5-6)**: Complete assessment form with treatment options - **COMPLETED**

### ⏳ Phase 8.4.2 - Drag-Select Appointments (IN PROGRESS)

- Drag-select time range detection├── public/ # Static assets (logos, icons)- ✅ **Phase 4 (Week 7)**: Photo upload and management - **COMPLETED**

- New appointment modal

- Patient search└── SYSTEM_DESIGN.md # Complete technical specification- ✅ **Phase 5 (Week 8)**: Calendar and scheduling - **COMPLETED**

- Wound selection

````- ✅ **Phase 6 (Week 9)**: PDF export and reporting - **COMPLETED**

---

- ✅ **Phase 6.5 (Week 9-10)**: Billing system with searchable codes - **COMPLETED**

## Authentication

## 🔧 Available Commands- ⏳ **Phase 7 (Week 10)**: Analytics, polish, production readiness - **IN PROGRESS**

The system uses **invite-only registration**:



1. **Admin invites user** via email (Admin → Users → Invite User)

2. **User receives email** with invitation link```bash## Key Features

3. **User clicks link** and sets password

4. **User logs in** with email/password# Development



**Public signup is disabled** to maintain security and control.npm run dev                 # Start dev server (localhost:3000)### Completed Features ✅



---npm run build               # Production build



## Database Schemanpm run start               # Start production server- ✅ Supabase authentication (email/password)



**10 core tables** with Row Level Security (RLS):- ✅ Multi-facility support with user-facility relationships



- `users` - User accounts (synced with auth.users)# Code Quality- ✅ Patient and wound tracking with full CRUD

- `facilities` - Medical facilities/clinics

- `user_facilities` - User-facility associationsnpm run lint                # Run ESLint- ✅ Comprehensive wound assessment forms

- `patients` - Patient demographics

- `wounds` - Wound recordsnpm run lint:fix            # Auto-fix ESLint issues- ✅ Photo documentation with Supabase Storage

- `visits` - Visit records

- `assessments` - Wound assessmentsnpm run format              # Format code with Prettier- ✅ Treatment plan management and orders

- `photos` - Photo metadata (Supabase Storage)

- `treatments` - Treatment plansnpm run format:check        # Check formatting without changes- ✅ Calendar-based visit scheduling (React Big Calendar)

- `billings` - Billing codes

- ✅ PDF report generation (visit summaries, wound progress)

**Phase 8 additions**:

- `tenants` - Multi-tenant organizations# Database- ✅ CSV data export

- `user_roles` - Role assignments

- `user_invites` - Invitation trackingnpm run db:types            # Generate TypeScript types from Supabase- ✅ Billing system with searchable CPT/ICD-10 codes

- `wound_notes` - Per-wound notes

npm run seed                # Seed database with test data- ✅ Billing reports dashboard with filtering

See [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for complete schema and ERD.

npm run seed:reset          # Reset and re-seed database- ✅ Dark mode support

---

```- ✅ Desktop-first responsive design

## Contributing



This is a private project. All development follows the implementation phases outlined in `SYSTEM_DESIGN.md`.

## 🗄️ Database Schema### In Progress ⏳

Before starting work:

1. Review `SYSTEM_DESIGN.md` for architectural decisions

2. Check `SETUP_NOTES_NOV4.md` for current progress

3. Follow code conventions in `.github/copilot-instructions.md`The application uses **10 core tables** with Row Level Security (RLS):- ⏳ Wound healing rate analytics



---- ⏳ Dashboard charts and metrics



## License- `users` - User accounts (synced with auth.users)- ⏳ Mobile/tablet responsiveness



Private/Proprietary - All rights reserved- `facilities` - Medical facilities/clinics- ⏳ Performance optimization



---- `user_facilities` - User-facility associations (many-to-many)



## Support- `patients` - Patient demographics and medical info## VS Code Setup



For issues or questions, refer to:- `wounds` - Wound records with location and type

- `SYSTEM_DESIGN.md` - Architecture and design decisions

- `SETUP_NOTES_NOV4.md` - Implementation progress- `visits` - Patient visit recordsThis project includes VS Code settings for optimal developer experience:

- `docs/` - Feature-specific documentation

- `assessments` - Detailed wound assessments

- `photos` - Wound photo metadata (files in Supabase Storage)- Auto-format on save

- `treatments` - Treatment plans and medical orders- ESLint auto-fix on save

- `billings` - Billing codes and claims- Tailwind CSS IntelliSense

- Prettier as default formatter

**See `supabase/migrations/00001_initial_schema.sql` for complete schema.**

## Learn More

## 🌱 Seeding Test Data

- [System Design Document](./SYSTEM_DESIGN.md) - Complete technical specification

The seed script generates realistic test data for development:- [Next.js Documentation](https://nextjs.org/docs)

- [Supabase Documentation](https://supabase.com/docs)

```bash- [Prisma Documentation](https://www.prisma.io/docs)

# First time: Apply schema then sign up one user- [shadcn/ui Components](https://ui.shadcn.com)

npm run seed                # Create sample data- [Tailwind CSS v4](https://tailwindcss.com)



# Reset and re-seed## Contributing

npm run seed:reset          # Delete existing data and create fresh

```1. Review `SYSTEM_DESIGN.md` for architecture and implementation phases

2. Check `.github/copilot-instructions.md` for coding conventions

**Generates**:3. Follow the approved design decisions and database schema

- 3-5 facilities4. Use Server Components + Server Actions (no API routes)

- 50-100 patients with complete demographics5. Run `npm run format` and `npm run lint:fix` before committing

- 65-150 wounds (65% of patients have 1-3 wounds)

- 150-300 visits (1-4 per patient with wounds)- [Tailwind CSS v4](https://tailwindcss.com/docs)

- 120-240 assessments (80% of wounds)- [shadcn/ui](https://ui.shadcn.com)

- 80-200 billing records (80% of completed visits)- [React 19](https://react.dev)



## 🎨 Design System## License



### Colors (OKLCH format)Private - All rights reserved.

- **Primary (Teal)**: Medical/healthcare theme
- **Secondary (Amber)**: Warm accents
- **Accent (Red)**: Alerts and important actions
- **Base (Zinc)**: Backgrounds and borders

### Branding
- `logo.svg` - Horizontal logo (400×120)
- `icon.svg` - Square app icon (512×512)
- Medical cross with wound healing waves design

## 🔐 Authentication & Security

- **Supabase Auth**: Email/password authentication
- **Row Level Security (RLS)**: All tables secured with policies
- **User-Facility Isolation**: Users only access their facility's data
- **Server Actions**: All mutations use `"use server"` directive
- **Middleware**: Protected routes require authentication

## 📖 Usage Guide

### For Healthcare Providers

1. **Sign Up**: Create account and verify email
2. **Add Patients**: Register patients with demographics and medical history
3. **Document Wounds**: Create wound records with location and type
4. **Schedule Visits**: Use calendar to book appointments
5. **Perform Assessments**: Complete detailed wound assessments during visits
6. **Upload Photos**: Document wound progression with photos
7. **Create Treatment Plans**: Add treatment orders and medical instructions
8. **Submit Billing**: Assign CPT/ICD-10 codes for insurance claims
9. **Generate Reports**: Export PDFs for patient records or insurance

### For Administrators

- **Multi-Facility**: Manage multiple facilities from one account
- **User Management**: Add users via Supabase Dashboard
- **Billing Reports**: Filter and export billing data by facility/date
- **Data Export**: CSV export for all major data types
- **Analytics**: View dashboard charts for wound status and healing trends

## 🏗️ Architecture Decisions

### Why Supabase?
- **PostgreSQL**: Industry-standard relational database
- **Real-time**: Built-in subscriptions (future feature)
- **Storage**: Integrated file storage for wound photos
- **Auth**: Production-ready authentication system
- **RLS**: Database-level security (no API vulnerabilities)

### Why Next.js App Router?
- **Server Components**: Faster page loads, less JavaScript
- **Server Actions**: Direct database mutations without API routes
- **React 19**: Latest React features (use hook, form actions)
- **Turbopack**: Faster development builds

### Why Tailwind CSS v4?
- **OKLCH Colors**: Better perceptual uniformity
- **CSS Variables**: Dynamic theming support
- **PostCSS**: No config file needed
- **Utility-First**: Rapid UI development

## 📚 Additional Documentation

- **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Complete technical specification (database schema, UI workflows, implementation phases)
- **[supabase/README.md](./supabase/README.md)** - Database schema management and migration guide
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - AI agent coding conventions

## 🤝 Contributing

1. Review `SYSTEM_DESIGN.md` for architecture and implementation phases
2. Follow coding conventions in `.github/copilot-instructions.md`
3. Use Server Components + Server Actions (no API routes)
4. Run `npm run format` and `npm run lint:fix` before committing
5. Test with seed data before deploying

## 📝 Code Conventions

- **Import Aliases**: Use `@/` prefix (e.g., `@/lib/utils`)
- **Component Styling**: Use `cn()` utility for conditional classes
- **Server vs Client**: Default to Server Components, add `"use client"` only when needed
- **File Naming**:
  - Components: PascalCase (`Button.tsx`)
  - Utilities: camelCase (`utils.ts`)
  - Routes: lowercase (`page.tsx`, `layout.tsx`)

## 🐛 Troubleshooting

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
````

### Database Connection Issues

- Verify Supabase credentials in `.env.local`
- Check Supabase project status (supabase.com)
- Ensure schema is applied via SQL Editor

### Type Errors

```bash
# Regenerate types from database
npm run db:types
```

### Seed Script Fails

- Ensure schema is applied first
- Sign up at least one user via app
- Check `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

## 📄 License

Private - All rights reserved.

---

**Built with ❤️ for wound care specialists**
