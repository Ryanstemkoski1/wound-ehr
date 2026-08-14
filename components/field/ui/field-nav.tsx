"use client";

// Field surface — role-filtered navigation.
// FieldNav renders the desktop top-bar links; FieldTabBar renders the
// fixed bottom tab bar on phones. Both highlight the active route.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Inbox,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldNavItem {
  href: string;
  label: string;
  icon: "inbox" | "schedule" | "patients" | "admin" | "visits";
}

const ICONS: Record<FieldNavItem["icon"], LucideIcon> = {
  inbox: Inbox,
  schedule: CalendarDays,
  patients: Users,
  admin: Settings,
  visits: ClipboardList,
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop top-bar navigation (hidden on phones). */
export function FieldNav({ items }: { items: FieldNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone bottom tab bar (hidden at md and up). */
export function FieldTabBar({ items }: { items: FieldNavItem[] }) {
  const pathname = usePathname();

  // The note document, sign, and preview screens are immersive: the tab
  // bar would cover their own floating controls (section pills, the QA
  // Approve/Return footer), so it steps aside there.
  if (pathname.startsWith("/notes/")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="grid auto-cols-fr grid-flow-col">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
