# Wound EHR - Setup Instructions

## Phase 1 Complete! ✅

The foundation and authentication system is now complete. Here's what we've built:

### ✅ Completed Features

1. **Database Schema** (Prisma)
   - 10+ tables covering all requirements
   - Users, Facilities, Patients, Wounds, Visits, Assessments, Treatments, Billing, Photos
   - Complete with relationships, indexes, and JSONB fields
   - Location: `prisma/schema.prisma`

2. **Supabase Integration**
   - Server-side client for Server Components and Server Actions
   - Client-side client for Client Components
   - Middleware for auth session management
   - Location: `lib/supabase/`

3. **Authentication System**
   - Login page with form validation
   - Signup page with email/password
   - Server Actions for auth (`app/actions/auth.ts`)
   - Protected routes via middleware
   - Auto-redirect to dashboard when logged in

4. **Main Application Layout**
   - Sidebar navigation with icons
   - Header with user info and logout button
   - Dashboard page with stats cards (placeholder data)
   - Responsive design with Tailwind CSS v4

5. **UI Components** (shadcn/ui)
   - Button, Input, Label, Card, Form, Select, Textarea
   - Consistent design system with teal primary color
   - Dark mode support

---

## 🚀 Next Steps to Get Running

### 1. Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` public key
4. Update `.env.local` with your actual values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key

DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
```

### 2. Run Database Migrations

Once you have Supabase configured:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to Supabase (creates all tables)
npx prisma db push
```

### 3. Create Supabase Database Trigger (Optional but Recommended)

To automatically sync Supabase Auth users with the `users` table, run this SQL in Supabase SQL Editor:

```sql
-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

You should be redirected to `/login`. Create an account to get started!

---

## 📁 Project Structure

```
wound-ehr/
├── app/
│   ├── actions/
│   │   └── auth.ts              # Server Actions for authentication
│   ├── dashboard/
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   └── page.tsx             # Dashboard home page
│   ├── login/
│   │   └── page.tsx             # Login page
│   ├── signup/
│   │   └── page.tsx             # Signup page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Root page (redirects to dashboard)
├── components/
│   ├── layout/
│   │   ├── header.tsx           # Header with user info
│   │   └── sidebar.tsx          # Sidebar navigation
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Client-side Supabase client
│   │   ├── server.ts            # Server-side Supabase client
│   │   └── middleware.ts        # Auth middleware utilities
│   ├── prisma.ts                # Prisma client singleton
│   └── utils.ts                 # Utility functions (cn, etc.)
├── prisma/
│   └── schema.prisma            # Database schema (10+ tables)
├── middleware.ts                # Next.js middleware (auth protection)
├── .env.local                   # Environment variables (add your keys!)
└── .env.local.example           # Example env file
```

---

## 🎯 What's Next?

### Phase 2: Patient & Facility Management (Weeks 3-4)

Now that authentication is complete, we'll build:

1. **Facility CRUD**
   - List all facilities
   - Create/edit facility forms
   - User-facility associations

2. **Patient CRUD**
   - Patient list with search/filter
   - Patient detail page
   - Create/edit patient forms
   - Multi-facility support

### Phase 3-7 (Remaining Weeks)

- Wound management
- Visit documentation with comprehensive assessment forms
- Photo upload and gallery
- PDF export and reporting
- Analytics and polish

---

## 🔧 Available Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma db push   # Push schema changes to database
```

---

## 📝 Notes

- **Authentication**: Uses Supabase Auth with email/password
- **Database**: Supabase PostgreSQL via Prisma ORM
- **Server Components**: Default for all pages (faster, less JS)
- **Server Actions**: Used for all mutations (`"use server"` directive)
- **Styling**: Tailwind CSS v4 with OKLCH colors
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

---

## ⚠️ Important

Before running the app, you MUST:

1. Create a Supabase project
2. Update `.env.local` with real credentials
3. Run `npx prisma db push` to create tables

The app will not work until Supabase is configured!

---

**Ready to continue?** Let me know when you want to start Phase 2!
