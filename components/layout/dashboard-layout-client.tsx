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
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMobileMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
