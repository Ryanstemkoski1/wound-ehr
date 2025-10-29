# Wound EHR - AI Agent Instructions

## Project Overview

This is a **Next.js 16** app with **React 19**, **TypeScript**, and **Tailwind CSS v4** for building an Electronic Health Record (EHR) system for wound care. The project uses the modern Next.js App Router architecture with shadcn/ui components.

## Tech Stack & Configuration

- **Framework**: Next.js 16.0.1 (App Router)
- **React**: 19.2.0 (latest with React Compiler support)
- **Styling**: Tailwind CSS v4 (using PostCSS plugin `@tailwindcss/postcss`)
- **UI Components**: shadcn/ui with "new-york" style variant
- **Icons**: Lucide React
- **TypeScript**: Strict mode enabled
- **Code Quality**: ESLint (flat config) + Prettier with Tailwind plugin

## Architecture & Structure

### Key Directories

- `app/` - Next.js App Router pages and layouts (root route at `app/page.tsx`)
- `lib/` - Shared utilities (currently contains `utils.ts` with `cn()` helper)
- `components/` - Will contain shadcn/ui components when added
- `public/` - Static assets (logos, icons, favicon)

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

### Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint (uses flat config in eslint.config.mjs)
npm run lint:fix     # Run ESLint and auto-fix issues
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing changes
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
- `app/page.tsx` is currently a minimal placeholder - ready for implementation

### File Naming

- React components: PascalCase (e.g., `Button.tsx`)
- Utilities: camelCase (e.g., `utils.ts`)
- Routes: lowercase (e.g., `page.tsx`, `layout.tsx`)

## Important Notes

1. **Tailwind v4 Breaking Changes**: This project uses Tailwind CSS v4 alpha with PostCSS. Traditional `tailwind.config.js` is NOT used. All configuration is in `globals.css` via `@theme` directive.

2. **ESLint Flat Config**: Uses the new ESLint flat config format (`eslint.config.mjs`) with Next.js preset and Prettier integration.

3. **Module Resolution**: Uses `bundler` mode (for Next.js) - allows `.ts` extensions and proper tree-shaking.

4. **React 19**: Latest React with improved hooks, actions, and server component capabilities. Use modern patterns like `use()` hook and form actions where applicable.

5. **Clean Slate**: The project is freshly initialized with branding, tooling, and design system in place. `app/page.tsx` is a minimal placeholder ready for feature implementation.
