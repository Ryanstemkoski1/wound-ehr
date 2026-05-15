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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
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
        <div className="border-sidebar-border/40 flex h-16 items-center justify-between border-b bg-gradient-to-b from-white/[0.06] to-transparent px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={handleLinkClick}
          >
            <div className="bg-sidebar-primary/20 ring-sidebar-primary/30 flex h-8 w-8 items-center justify-center rounded-lg ring-1">
              <Image
                src="/icon.svg"
                alt="WoundNote"
                width={20}
                height={20}
                priority
              />
            </div>
            <span className="text-sidebar-foreground text-[0.9rem] font-bold tracking-tight">
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
                    "flex items-center justify-between rounded-lg py-1.5 pr-3 text-sm transition-all duration-150",
                    pathname.startsWith("/dashboard/calendar")
                      ? "nav-item-active"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground pl-3 hover:bg-white/10"
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
                    "flex items-center gap-2 rounded-lg py-1.5 pr-3 text-sm transition-all duration-150",
                    pathname === "/dashboard/patients"
                      ? "nav-item-active"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground pl-3 hover:bg-white/10"
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
                    "flex items-center gap-3 rounded-lg py-2 pr-3 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "nav-item-active"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground pl-3 hover:bg-white/10"
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
                        "flex items-center gap-3 rounded-lg py-2 pr-3 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "nav-item-active"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground pl-3 hover:bg-white/10"
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
        <div className="border-sidebar-border/40 border-t px-4 py-3">
          <p className="text-sidebar-foreground/35 text-[10px] tracking-wide">
            WoundNote · v1.0
          </p>
        </div>
      </nav>
    </>
  );
}
