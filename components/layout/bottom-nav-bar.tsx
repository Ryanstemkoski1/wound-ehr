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
      className="border-border/50 bg-background/85 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xl md:hidden"
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
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-primary"
              )}
              aria-current={active ? "page" : undefined}
            >
              <div
                className={cn(
                  "mb-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                  active ? "bg-primary/12 scale-110" : ""
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active ? "stroke-[2.2]" : ""
                  )}
                  aria-hidden="true"
                />
              </div>
              {item.name}
              {active && (
                <span className="bg-primary absolute inset-x-4 bottom-0 h-0.5 rounded-t-full" />
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium transition-colors",
            "text-muted-foreground active:text-primary"
          )}
          aria-label="Open menu"
        >
          <div className="mb-0.5 flex h-7 w-7 items-center justify-center">
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </div>
          More
        </button>
      </div>
    </nav>
  );
}
