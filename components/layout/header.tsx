"use client";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { User as UserIcon, LogOut, Menu } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type HeaderProps = {
  user: User;
  onMobileMenuClick?: () => void;
};

export default function Header({ user, onMobileMenuClick }: HeaderProps) {
  async function handleLogout() {
    await logout();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Reserved for breadcrumbs or page-specific filters */}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* User info */}
        <div className="hidden items-center gap-2 sm:flex">
          <UserIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium">
            {user.user_metadata?.name || user.email}
          </span>
        </div>

        {/* Logout button */}
        <form action={handleLogout}>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
