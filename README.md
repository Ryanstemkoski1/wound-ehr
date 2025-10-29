# Wound EHR

A modern Electronic Health Record (EHR) system designed specifically for wound care management and treatment tracking.

## 📋 System Design

**All development follows the comprehensive system design in [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md).**

The design document includes:

- Complete database schema (Supabase PostgreSQL)
- Frontend architecture with Server Components + Server Actions
- UI/UX workflows for wound assessments and photo management
- 10-week implementation roadmap
- Technology stack and approved design decisions

**Before working on any feature, review the relevant section in `SYSTEM_DESIGN.md`.**

---

## Tech Stack

- **Framework**: Next.js 16.0.1 (App Router with Server Components)
- **React**: 19.2.0
- **TypeScript**: Strict mode
- **Styling**: Tailwind CSS v4 (PostCSS, OKLCH colors)
- **UI Components**: shadcn/ui (new-york variant)
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Auth**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (wound photos)
- **Calendar**: React Big Calendar
- **PDF Export**: @react-pdf/renderer
- **Icons**: Lucide React
- **Code Quality**: ESLint + Prettier

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint and auto-fix issues
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without changes
```

## Project Structure

```
wound-ehr/
├── app/              # Next.js App Router (pages, layouts, routes)
├── components/       # Reusable React components (shadcn/ui)
├── lib/              # Utilities and helpers
├── public/           # Static assets (logos, icons)
└── .github/          # GitHub configuration
```

## Design System

### Colors (OKLCH format)

- **Primary (Teal)**: Medical/healthcare theme
- **Secondary (Amber)**: Warm accents
- **Accent (Red)**: Alerts and important actions
- **Base (Zinc)**: Backgrounds and borders

### Typography

- **Sans**: Geist Sans (body text)
- **Mono**: Geist Mono (code)

### Branding Assets

- `logo.svg` - Horizontal logo (400×120)
- `logo-horizontal.svg` - Extended logo with tagline (800×200)
- `icon.svg` - Square app icon (512×512)
- `favicon.svg` - Browser favicon (32×32)

## Code Conventions

- **Import Aliases**: Use `@/` prefix (e.g., `@/lib/utils`)
- **Component Styling**: Use `cn()` utility for conditional classes
- **Server Actions**: Use `"use server"` directive for mutations
- **File Naming**:
  - Components: PascalCase (`Button.tsx`)
  - Utilities: camelCase (`utils.ts`)
  - Routes: lowercase (`page.tsx`, `layout.tsx`)

## Implementation Phases

The project follows a **10-week implementation roadmap** (see `SYSTEM_DESIGN.md`):

- **Phase 1-2 (Weeks 1-4)**: Foundation, auth, patient/wound/visit CRUD
- **Phase 3 (Weeks 5-6)**: Complete assessment form with treatment options
- **Phase 4 (Week 7)**: Photo upload and management
- **Phase 5 (Week 8)**: Calendar and scheduling
- **Phase 6 (Week 9)**: PDF export and reporting
- **Phase 7 (Week 10)**: Analytics, polish, production readiness

## Key Features (Planned)

- ✅ Supabase authentication (email/password)
- ✅ Multi-facility support
- ✅ Patient and wound tracking
- ✅ Comprehensive wound assessment forms
- ✅ Photo documentation with Supabase Storage
- ✅ Treatment plan management
- ✅ Calendar-based visit scheduling
- ✅ PDF report generation (visit summaries, wound progress)
- ✅ CSV data export
- ✅ Billing/CPT code tracking
- ✅ Dark mode support
- ✅ Desktop-first responsive design

## VS Code Setup

This project includes VS Code settings for optimal developer experience:

- Auto-format on save
- ESLint auto-fix on save
- Tailwind CSS IntelliSense
- Prettier as default formatter

## Learn More

- [System Design Document](./SYSTEM_DESIGN.md) - Complete technical specification
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com)

## Contributing

1. Review `SYSTEM_DESIGN.md` for architecture and implementation phases
2. Check `.github/copilot-instructions.md` for coding conventions
3. Follow the approved design decisions and database schema
4. Use Server Components + Server Actions (no API routes)
5. Run `npm run format` and `npm run lint:fix` before committing

- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [React 19](https://react.dev)

## License

Private - All rights reserved.
