"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { X, PackageOpen, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/rbac";
import type { Surface } from "@/lib/surface";
import { getMainNav, getAdminSectionNav } from "@/lib/navigation";

type SidebarProps = {
  userRole: UserRole | null;
  surface: Surface;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  todayUnsignedCount?: number;
};

export default function Sidebar({
  userRole,
  surface,
  mobileOpen,
  onMobileClose,
  todayUnsignedCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const mainNav = getMainNav(surface);
  const adminNav = getAdminSectionNav(surface, userRole);

  const handleLinkClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={cn(
          "bg-sidebar fixed inset-y-0 left-0 z-50 flex w-[200px] flex-col transition-transform duration-300 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Header / Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={handleLinkClick}
          >
            <Image
              src="/icon.svg"
              alt="WoundNote"
              width={28}
              height={28}
              priority
            />
            <span className="text-sidebar-foreground text-base font-semibold">
              WoundNote
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground h-7 w-7 hover:bg-white/10 lg:hidden"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Surface badge */}
        <div className="mb-1 px-4">
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
              surface === "admin"
                ? "bg-purple-500/20 text-purple-300"
                : "bg-sidebar-primary/20 text-sidebar-primary"
            )}
          >
            {surface === "admin" ? "Operations" : "Clinical"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Today section — clinical surface only */}
          {surface === "clinical" && (
            <div className="mb-3 px-4">
              <p className="text-sidebar-foreground/50 mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Today
              </p>
              <div className="space-y-0.5">
                <Link
                  href="/dashboard/calendar"
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center justify-between rounded-full py-1.5 pr-3 pl-3 text-sm transition-colors",
                    pathname.startsWith("/dashboard/calendar")
                      ? "text-sidebar-primary bg-white/15 font-semibold"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/8"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    Unsigned
                  </span>
                  {todayUnsignedCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-sidebar-primary text-sidebar-foreground h-4 min-w-4 rounded-full px-1.5 py-0 text-[10px] leading-4 font-bold"
                    >
                      {todayUnsignedCount}
                    </Badge>
                  )}
                </Link>
                <Link
                  href="/dashboard/patients"
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-2 rounded-full py-1.5 pr-3 pl-3 text-sm transition-colors",
                    pathname === "/dashboard/patients"
                      ? "text-sidebar-primary bg-white/15 font-semibold"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/8"
                  )}
                >
                  <PackageOpen
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Supplies
                </Link>
              </div>
            </div>
          )}

          {/* Main nav */}
          <div className="px-2">
            {surface === "clinical" && (
              <p className="text-sidebar-foreground/50 mb-1 px-2 text-[10px] font-semibold tracking-wider uppercase">
                Navigation
              </p>
            )}
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-sidebar-primary bg-white/15 font-semibold"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/8"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}

            {adminNav.length > 0 && (
              <div className="mt-4">
                <p className="text-sidebar-foreground/50 mb-1 px-2 text-[10px] font-semibold tracking-wider uppercase">
                  Admin
                </p>
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-purple-500/20 font-semibold text-purple-300"
                          : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/8"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-sidebar-border border-t px-4 py-3">
          <p className="text-sidebar-foreground/40 text-[10px]">
            WoundNote v1.0
          </p>
        </div>
      </nav>
    </>
  );
}
