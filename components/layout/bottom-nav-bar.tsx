"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Surface } from "@/lib/surface";
import { getBottomNav } from "@/lib/navigation";

type BottomNavBarProps = {
  surface: Surface;
  onMoreClick?: () => void;
};

/**
 * Fixed bottom navigation bar shown only on mobile (<md via Tailwind).
 * Items are surface-aware so a clinician on phone sees clinical destinations
 * and an office user sees ops destinations.
 */
export function BottomNavBar({ surface, onMoreClick }: BottomNavBarProps) {
  const pathname = usePathname();
  const items = getBottomNav(surface);

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
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
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
        <button
          type="button"
          onClick={onMoreClick}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors",
            "text-zinc-500 active:text-teal-600 dark:text-zinc-400 dark:active:text-teal-400"
          )}
          aria-label="Open menu"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </div>
    </nav>
  );
}
