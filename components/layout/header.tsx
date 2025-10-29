"use client";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { User as UserIcon, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Header({ user }: { user: User }) {
  async function handleLogout() {
    await logout();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-4">
        {/* TODO: Add facility selector here */}
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {/* Facility selector will go here */}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium">
            {user.user_metadata?.name || user.email}
          </span>
        </div>

        {/* Logout button */}
        <form action={handleLogout}>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
