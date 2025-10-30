"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import type { User } from "@supabase/supabase-js";

type DashboardLayoutClientProps = {
  user: User;
  children: React.ReactNode;
};

export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMobileMenuClick={() => setMobileMenuOpen(true)} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-zinc-50 p-4 sm:p-6 dark:bg-zinc-950"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
