# Wound EHR - AI Agent Instructions

## Project Overview

This is a **Next.js 16** app with **React 19**, **TypeScript**, and **Tailwind CSS v4** for building an Electronic Health Record (EHR) system for wound care. The project uses the modern Next.js App Router architecture with shadcn/ui components.

**⚠️ CRITICAL: All development work MUST follow the comprehensive system design documented in `SYSTEM_DESIGN.md` (v5.0). This includes:**

- Database schema (17 tables with Supabase PostgreSQL)
- Frontend architecture (app router structure, components)
- Backend patterns (Server Components + Server Actions)
- UI/UX workflows (assessment forms, photo management, calendar, signatures)
- Implementation phases (Phase 9.4 complete, Phase 10 planning)
- Design decisions (auth, multi-facility, billing, compliance, libraries)

**📚 Documentation Structure:**
- **README.md** - Quick start guide, installation, tech stack overview
- **SYSTEM_DESIGN.md** - Complete system architecture, database schema, technical decisions
- **PROJECT_STATUS.md** - Current status, completed features, next phase planning
- **docs/ENV_SETUP_GUIDE.md** - Detailed environment setup
- **docs/archive/** - Historical phase completion reports (reference only)

**Before implementing ANY feature, review the relevant section in `SYSTEM_DESIGN.md` and check `PROJECT_STATUS.md` for current status.**

## Tech Stack & Configuration

- **Framework**: Next.js 16.0.1 (App Router)
- **React**: 19.2.0 (latest with React Compiler support)
- **Styling**: Tailwind CSS v4 (using PostCSS plugin `@tailwindcss/postcss`)
- **UI Components**: shadcn/ui with "new-york" style variant
- **Icons**: Lucide React
- **Database**: Supabase PostgreSQL with auto-generated TypeScript types
- **Query Layer**: Supabase JS (@supabase/supabase-js + @supabase/ssr)
- **TypeScript**: Strict mode enabled
- **Code Quality**: ESLint (flat config) + Prettier with Tailwind plugin

## Architecture & Structure

### Key Directories

- `app/` - Next.js App Router pages and layouts (auth, dashboard, patient management)
- `app/actions/` - Server Actions for all database operations (patients, visits, wounds, billing, etc.)
- `lib/` - Shared utilities (`utils.ts`, `billing-codes.ts`, Supabase clients)
- `lib/supabase/` - Supabase client configurations (server, client, middleware)
- `components/` - React components organized by feature (ui, layout, patients, wounds, etc.)
- `components/ui/` - shadcn/ui components (button, card, form, table, etc.)
- `components/layout/` - Layout components (sidebar, header, dashboard layout)
- `public/` - Static assets (logos, icons, favicon)
- `supabase/` - Database migrations, seed scripts, schema documentation

### Import Paths (tsconfig aliases)

Use absolute imports with `@/` prefix:

```typescript
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";
```

## Styling Conventions

### Tailwind CSS v4 Specifics

- Uses **inline @theme** directive in `globals.css` (NOT traditional tailwind.config.js)
- Custom CSS variables defined in `:root` and `.dark` selectors
- Uses **OKLCH color format** for all design tokens
- Custom variant for dark mode: `@custom-variant dark (&:is(.dark *))`
- CSS linter warnings for unknown at-rules disabled in `.vscode/settings.json`

### Design System

- **Base radius**: `0.625rem` (10px) - used for component border-radius
- **Color scheme**:
  - Primary: Teal (`oklch(0.52 0.12 192)` light, `oklch(0.65 0.14 192)` dark)
  - Secondary: Amber (`oklch(0.92 0.08 85)` light, `oklch(0.35 0.06 85)` dark)
  - Accent: Red (`oklch(0.58 0.22 25)` light, `oklch(0.62 0.20 25)` dark)
  - Base: Zinc for backgrounds and borders
- **CSS variables enabled** for all Tailwind utilities
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`

### Branding Assets

- **Logo**: `/logo.svg` - Horizontal version for headers (400x120)
- **Logo Extended**: `/logo-horizontal.svg` - With tagline (800x200)
- **Icon**: `/icon.svg` - Square icon (512x512)
- **Favicon**: `/icon.svg` - Used in metadata
- **Design**: Medical cross with wound healing waves, teal primary color

### Component Styling Pattern

Always use the `cn()` utility from `@/lib/utils` for conditional class merging:

```typescript
import { cn } from "@/lib/utils";
<div className={cn("base-classes", condition && "conditional-classes")} />;
```

## Development Workflow

### Implementation Guidelines

**ALWAYS consult `SYSTEM_DESIGN.md` before starting any development work:**

1. **Database Changes**: Reference the ERD and schema notes (Section: Database Schema)
2. **New Features**: Check implementation phases for correct sequencing (Section: Implementation Phases)
3. **UI Components**: Follow the app structure and component hierarchy (Section: Frontend Architecture)
4. **API/Actions**: Use Server Actions pattern, not API routes (Section: Technology Stack)
5. **Design Decisions**: Respect all approved decisions (Section: Design Decisions)

### Database Schema

The database uses **10 tables** with Row Level Security (RLS):

- `users` - User accounts (synced with auth.users via trigger)
- `facilities` - Medical facilities/clinics
- `user_facilities` - User-facility associations (many-to-many)
- `patients` - Patient demographics and medical info
- `wounds` - Wound records with location and type
- `visits` - Patient visit records
- `assessments` - Detailed wound assessments
- `photos` - Wound photo metadata (files in Supabase Storage)
- `treatments` - Treatment plans and medical orders
- `billings` - Billing codes and claims

Schema location: `supabase/migrations/00001_initial_schema.sql`

### Supabase Backend Architecture

**IMPORTANT**: This project uses **Supabase JS** directly, **NOT Prisma**.

- All database operations use Supabase client (`@supabase/supabase-js` and `@supabase/ssr`)
- Server Components: Use `createClient()` from `@/lib/supabase/server`
- Client Components: Use `createClient()` from `@/lib/supabase/client`
- Server Actions: Use server client with `"use server"` directive
- TypeScript types: Auto-generated via `npm run db:types` → `lib/database.types.ts`
- Column naming: `snake_case` (e.g., `first_name`, `visit_date`, `cpt_codes`)
- JSONB columns: Used for arrays/objects (allergies, insurance_info, cpt_codes, etc.)

### Query Patterns

```typescript
// ❌ WRONG - Don't use Prisma
import { PrismaClient } from "@prisma/client";

// ✅ CORRECT - Use Supabase client
import { createClient } from "@/lib/supabase/server";

// Server Action example
export async function getPatient(id: string) {
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select(
      `
      *,
      facility:facilities(*),
      wounds(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return patient;
}
```

### Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint (uses flat config in eslint.config.mjs)
npm run lint:fix     # Run ESLint and auto-fix issues
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing changes
npm run db:types     # Generate TypeScript types from Supabase database
npm run seed         # Seed database with test data
npm run seed:reset   # Reset and re-seed database
```

### Code Quality Tools

- **ESLint**: Configured with Next.js preset and Prettier integration (`eslint.config.mjs`)
- **Prettier**: Auto-formats code with Tailwind CSS class sorting
  - Config: `.prettierrc` (double quotes, semicolons, 80-char width)
  - VS Code: Auto-format on save enabled (`.vscode/settings.json`)
  - Tailwind plugin sorts classes automatically
- **VS Code Settings**: Format on save, ESLint auto-fix, CSS unknown at-rules disabled

### Adding shadcn/ui Components

This project is configured for shadcn/ui. When adding components:

- Components go to `@/components/ui/` (aliased in `components.json`)
- Use the "new-york" style variant
- RSC (React Server Components) enabled by default
- Icon library: lucide-react

## Code Conventions

### TypeScript

- **Strict mode enabled** - handle all type safety
- Use `type` over `interface` for consistency
- React 19 types available from `@types/react@19`

### React Patterns

- Prefer Server Components by default (RSC enabled)
- Use `"use client"` directive only when needed (interactivity, hooks)
- Async Server Components supported in App Router
- Auth-protected pages use `export const dynamic = "force-dynamic"` to prevent static rendering
- All dashboard pages configured for dynamic rendering (prevents auth errors at build time)

### File Naming

- React components: PascalCase (e.g., `Button.tsx`)
- Utilities: camelCase (e.g., `utils.ts`)
- Routes: lowercase (e.g., `page.tsx`, `layout.tsx`)

## Important Notes

1. **System Design Document**: `SYSTEM_DESIGN.md` is the authoritative source for all architectural decisions, database schema, UI workflows, and implementation phases. Review it before making ANY changes.

2. **Tailwind v4 Breaking Changes**: This project uses Tailwind CSS v4 alpha with PostCSS. Traditional `tailwind.config.js` is NOT used. All configuration is in `globals.css` via `@theme` directive.

3. **ESLint Flat Config**: Uses the new ESLint flat config format (`eslint.config.mjs`) with Next.js preset and Prettier integration.

4. **Module Resolution**: Uses `bundler` mode (for Next.js) - allows `.ts` extensions and proper tree-shaking.

5. **React 19**: Latest React with improved hooks, actions, and server component capabilities. Use modern patterns like `use()` hook and form actions where applicable.

6. **Supabase Backend**: All database operations use Supabase PostgreSQL via Supabase JS. Authentication via Supabase Auth. Photo storage via Supabase Storage. TypeScript types generated from database schema.

7. **Server-First Architecture**: Use Server Components for data fetching (async/await DB queries) and Server Actions for mutations (`"use server"` directive). Avoid Client Components unless absolutely necessary for interactivity.
