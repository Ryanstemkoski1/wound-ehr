"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Wounds", href: "/dashboard/wounds", icon: Activity },
  { name: "More", href: "#more", icon: MoreHorizontal },
];

type BottomNavBarProps = {
  onMoreClick?: () => void;
};

/**
 * Fixed bottom navigation bar shown only on mobile (<768px via Tailwind).
 * Provides one-tap access to the 5 most-used sections.
 */
export function BottomNavBar({ onMoreClick }: BottomNavBarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-900"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href !== "#more" && isActive(item.href);
          const isMore = item.href === "#more";

          return isMore ? (
            <button
              key={item.name}
              type="button"
              onClick={onMoreClick}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors",
                "text-zinc-500 active:text-teal-600 dark:text-zinc-400 dark:active:text-teal-400"
              )}
              aria-label="Open menu"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </button>
          ) : (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors",
                active
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-zinc-500 active:text-teal-600 dark:text-zinc-400 dark:active:text-teal-400"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
