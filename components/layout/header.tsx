"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { User as UserIcon, LogOut, Menu } from "lucide-react";
import { GlobalSearchDialog } from "@/components/layout/global-search-dialog";
import { NotificationBell } from "@/components/layout/notification-bell";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { NewEncounterModal } from "@/components/visits/new-encounter-modal";
import type { User } from "@supabase/supabase-js";
import type { Surface } from "@/lib/surface";

type HeaderProps = {
  user: User;
  surface: Surface;
  entitlements: Surface[];
  clinicalUxV2?: boolean;
  onMobileMenuClick?: () => void;
};

export default function Header({
  user,
  surface,
  entitlements,
  clinicalUxV2 = false,
  onMobileMenuClick,
}: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const result = await logout();
    if ("redirectTo" in result && result.redirectTo) {
      router.push(result.redirectTo);
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <GlobalSearchDialog />
        {clinicalUxV2 && surface === "clinical" && <NewEncounterModal />}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <RoleSwitcher active={surface} entitlements={entitlements} />

        <NotificationBell />

        <div className="hidden items-center gap-2 sm:flex">
          <UserIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium">
            {user.user_metadata?.name || user.email}
          </span>
        </div>

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
