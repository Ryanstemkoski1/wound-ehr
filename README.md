# Wound EHR# Wound EHR

A modern Electronic Health Record (EHR) system designed specifically for wound care management and treatment tracking.A modern Electronic Health Record (EHR) system designed specifically for wound care management and treatment tracking.

## 🚀 Quick Start## 📋 System Design

### Prerequisites**All development follows the comprehensive system design in [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md).**

- Node.js 18+ and npmThe design document includes:

- Supabase account ([supabase.com](https://supabase.com))

- Complete database schema (Supabase PostgreSQL)

### Installation- Frontend architecture with Server Components + Server Actions

- UI/UX workflows for wound assessments and photo management

````bash- 10-week implementation roadmap

# Install dependencies- Technology stack and approved design decisions

npm install

**Before working on any feature, review the relevant section in `SYSTEM_DESIGN.md`.**

# Set up environment variables

cp .env.example .env.local---

# Edit .env.local with your Supabase credentials

## Tech Stack

# Start development server

npm run dev- **Framework**: Next.js 16.0.1 (App Router with Server Components)

```- **React**: 19.2.0

- **TypeScript**: Strict mode

Open [http://localhost:3000](http://localhost:3000) and sign up to get started.- **Styling**: Tailwind CSS v4 (PostCSS, OKLCH colors)

- **UI Components**: shadcn/ui (new-york variant)

### Database Setup- **Database**: Supabase PostgreSQL + Prisma ORM

- **Auth**: Supabase Auth (email/password)

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project- **Storage**: Supabase Storage (wound photos)

2. **Apply Schema**: In Supabase SQL Editor, run `supabase/migrations/00001_initial_schema.sql`- **Calendar**: React Big Calendar

3. **Generate Types**: Run `npm run db:types` to create TypeScript types- **PDF Export**: @react-pdf/renderer

4. **Seed Data** (optional): Run `npm run seed` to populate with test data- **Icons**: Lucide React

- **Code Quality**: ESLint + Prettier

## 📋 Tech Stack

## Getting Started

- **Framework**: Next.js 16 (App Router, Server Components)

- **React**: 19 with React Compiler### Installation

- **TypeScript**: Strict mode enabled

- **Database**: Supabase PostgreSQL```bash

- **Auth**: Supabase Auth (email/password)npm install

- **Storage**: Supabase Storage (wound photos)```

- **Styling**: Tailwind CSS v4 (OKLCH colors)

- **UI**: shadcn/ui components (new-york variant)### Development

- **Forms**: React Hook Form + Zod validation

- **PDF**: @react-pdf/renderer```bash

- **Calendar**: React Big Calendarnpm run dev

- **Icons**: Lucide React```



## 🎯 Key FeaturesOpen [http://localhost:3000](http://localhost:3000) to view the application.



### Patient Management### Available Commands

- Multi-facility support with user-facility relationships

- Complete patient demographics and medical history```bash

- Insurance information (primary/secondary)npm run dev          # Start dev server (localhost:3000)

- Emergency contacts and allergies trackingnpm run build        # Production build

npm run start        # Start production server

### Wound Carenpm run lint         # Run ESLint

- Comprehensive wound assessments with 70+ anatomical locationsnpm run lint:fix     # Run ESLint and auto-fix issues

- Tissue type percentages (epithelial, granulation, slough)npm run format       # Format all files with Prettier

- Measurement tracking (length, width, depth, area)npm run format:check # Check formatting without changes

- Healing status monitoring and progress notes```

- Photo documentation with Supabase Storage

## Project Structure

### Visit Tracking

- In-person and telehealth visit support```

- Treatment plans and medical orderswound-ehr/

- Follow-up scheduling (appointment/discharge)├── app/              # Next.js App Router (pages, layouts, routes)

- Time spent tracking and additional notes├── components/       # Reusable React components (shadcn/ui)

- Visit status workflow (complete/incomplete)├── lib/              # Utilities and helpers

├── public/           # Static assets (logos, icons)

### Billing System└── .github/          # GitHub configuration

- Searchable CPT and ICD-10 code libraries```

- Multiple code assignment per visit

- Modifier support and time-spent billing## Design System

- Billing reports with export to CSV

- Filter by facility, date range, patient### Colors (OKLCH format)



### Reporting- **Primary (Teal)**: Medical/healthcare theme

- PDF visit summaries with wound assessments- **Secondary (Amber)**: Warm accents

- Wound progress reports with photo timelines- **Accent (Red)**: Alerts and important actions

- Calendar view of scheduled visits- **Base (Zinc)**: Backgrounds and borders

- CSV export for billing and patient data

- Dashboard analytics (wound status, healing trends)### Typography



## 📁 Project Structure- **Sans**: Geist Sans (body text)

- **Mono**: Geist Mono (code)

````

wound-ehr/### Branding Assets

├── app/ # Next.js App Router

│ ├── actions/ # Server Actions (database operations)- `logo.svg` - Horizontal logo (400×120)

│ ├── dashboard/ # Protected application pages- `logo-horizontal.svg` - Extended logo with tagline (800×200)

│ ├── login/ # Authentication pages- `icon.svg` - Square app icon (512×512)

│ ├── signup/- `favicon.svg` - Browser favicon (32×32)

│ ├── layout.tsx # Root layout

│ └── globals.css # Tailwind CSS v4 config## Code Conventions

├── components/ # React components

│ ├── layout/ # Header, sidebar, navigation- **Import Aliases**: Use `@/` prefix (e.g., `@/lib/utils`)

│ ├── ui/ # shadcn/ui components- **Component Styling**: Use `cn()` utility for conditional classes

│ ├── patients/ # Patient-specific components- **Server Actions**: Use `"use server"` directive for mutations

│ ├── wounds/ # Wound assessment components- **File Naming**:

│ ├── visits/ # Visit management components - Components: PascalCase (`Button.tsx`)

│ └── billing/ # Billing components - Utilities: camelCase (`utils.ts`)

├── lib/ # Utilities and helpers - Routes: lowercase (`page.tsx`, `layout.tsx`)

│ ├── supabase/ # Supabase client setup

│ ├── database.types.ts # Generated TypeScript types## Implementation Phases

│ └── utils.ts # Helper functions (cn, etc.)

├── supabase/ # Database schema and migrationsThe project follows a **10-week implementation roadmap** (see `SYSTEM_DESIGN.md`):

│ ├── migrations/ # SQL migration files

│ ├── seed.ts # Seed script for test data- ✅ **Phase 1-2 (Weeks 1-4)**: Foundation, auth, patient/wound/visit CRUD - **COMPLETED**

│ └── README.md # Schema documentation- ✅ **Phase 3 (Weeks 5-6)**: Complete assessment form with treatment options - **COMPLETED**

├── public/ # Static assets (logos, icons)- ✅ **Phase 4 (Week 7)**: Photo upload and management - **COMPLETED**

└── SYSTEM_DESIGN.md # Complete technical specification- ✅ **Phase 5 (Week 8)**: Calendar and scheduling - **COMPLETED**

````- ✅ **Phase 6 (Week 9)**: PDF export and reporting - **COMPLETED**

- ✅ **Phase 6.5 (Week 9-10)**: Billing system with searchable codes - **COMPLETED**

## 🔧 Available Commands- ⏳ **Phase 7 (Week 10)**: Analytics, polish, production readiness - **IN PROGRESS**



```bash## Key Features

# Development

npm run dev                 # Start dev server (localhost:3000)### Completed Features ✅

npm run build               # Production build

npm run start               # Start production server- ✅ Supabase authentication (email/password)

- ✅ Multi-facility support with user-facility relationships

# Code Quality- ✅ Patient and wound tracking with full CRUD

npm run lint                # Run ESLint- ✅ Comprehensive wound assessment forms

npm run lint:fix            # Auto-fix ESLint issues- ✅ Photo documentation with Supabase Storage

npm run format              # Format code with Prettier- ✅ Treatment plan management and orders

npm run format:check        # Check formatting without changes- ✅ Calendar-based visit scheduling (React Big Calendar)

- ✅ PDF report generation (visit summaries, wound progress)

# Database- ✅ CSV data export

npm run db:types            # Generate TypeScript types from Supabase- ✅ Billing system with searchable CPT/ICD-10 codes

npm run seed                # Seed database with test data- ✅ Billing reports dashboard with filtering

npm run seed:reset          # Reset and re-seed database- ✅ Dark mode support

```- ✅ Desktop-first responsive design



## 🗄️ Database Schema### In Progress ⏳



The application uses **10 core tables** with Row Level Security (RLS):- ⏳ Wound healing rate analytics

- ⏳ Dashboard charts and metrics

- `users` - User accounts (synced with auth.users)- ⏳ Mobile/tablet responsiveness

- `facilities` - Medical facilities/clinics- ⏳ Performance optimization

- `user_facilities` - User-facility associations (many-to-many)

- `patients` - Patient demographics and medical info## VS Code Setup

- `wounds` - Wound records with location and type

- `visits` - Patient visit recordsThis project includes VS Code settings for optimal developer experience:

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
