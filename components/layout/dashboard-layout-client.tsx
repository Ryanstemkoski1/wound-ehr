"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RecordingProvider } from "@/lib/recording-context";
import { PersistentRecorderBar } from "@/components/layout/persistent-recorder-bar";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/rbac";
import type { Surface } from "@/lib/surface";

type DashboardLayoutClientProps = {
  user: User;
  userRole: UserRole | null;
  surface: Surface;
  entitlements: Surface[];
  clinicalUxV2?: boolean;
  todayUnsignedCount?: number;
  children: React.ReactNode;
};

export function DashboardLayoutClient({
  user,
  userRole,
  surface,
  entitlements,
  clinicalUxV2 = false,
  todayUnsignedCount = 0,
  children,
}: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <RecordingProvider>
      <div className="flex">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        <Sidebar
          userRole={userRole}
          surface={surface}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          todayUnsignedCount={todayUnsignedCount}
        />
        <div className="flex flex-1 flex-col">
          <Header
            user={user}
            surface={surface}
            entitlements={entitlements}
            clinicalUxV2={clinicalUxV2}
            onMobileMenuClick={() => setMobileMenuOpen(true)}
          />
          <PersistentRecorderBar />
          <main
            id="main-content"
            className="bg-zinc-50 px-4 py-4 pb-20 sm:px-6 sm:py-6 md:pb-6 dark:bg-zinc-950"
            role="main"
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>

      <BottomNavBar
        surface={surface}
        onMoreClick={() => setMobileMenuOpen(true)}
      />
    </RecordingProvider>
  );
}
