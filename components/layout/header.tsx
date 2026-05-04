"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { clearAllUserAutosaveData } from "@/lib/autosave";
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
    // Clear PHI from localStorage before sign-out (shared-device safety)
    clearAllUserAutosaveData(user.id);
    const result = await logout();
    if ("redirectTo" in result && result.redirectTo) {
      router.push(result.redirectTo);
    }
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Primary-color gradient top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, oklch(0.72 0.14 174 / 0.55), transparent)",
        }}
        aria-hidden="true"
      />
      <div className="border-border/50 bg-background/80 flex h-16 items-center justify-between border-b px-4 shadow-sm backdrop-blur-xl sm:px-6">
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

          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="bg-primary/10 text-primary ring-primary/20 flex h-8 w-8 items-center justify-center rounded-full ring-1">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium">
              {user.user_metadata?.name || user.email}
            </span>
          </div>

          <form action={handleLogout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
