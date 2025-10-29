# Wound EHR

A modern Electronic Health Record (EHR) system designed specifically for wound care management and treatment tracking.

## Tech Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **React**: 19.2.0
- **TypeScript**: Strict mode
- **Styling**: Tailwind CSS v4 (PostCSS)
- **UI Components**: shadcn/ui (new-york variant)
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
- **File Naming**:
  - Components: PascalCase (`Button.tsx`)
  - Utilities: camelCase (`utils.ts`)
  - Routes: lowercase (`page.tsx`, `layout.tsx`)

## Key Features

- ✅ Tailwind CSS v4 with OKLCH color system
- ✅ Dark mode support
- ✅ Server Components by default (RSC)
- ✅ Automatic code formatting (Prettier)
- ✅ Type-safe with TypeScript strict mode
- ✅ shadcn/ui component library ready

## VS Code Setup

This project includes VS Code settings for optimal developer experience:

- Auto-format on save
- ESLint auto-fix on save
- Tailwind CSS IntelliSense
- Prettier as default formatter

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [React 19](https://react.dev)

## License

Private - All rights reserved.
