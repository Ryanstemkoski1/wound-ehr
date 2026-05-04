"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Stethoscope, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setActiveSurface } from "@/app/actions/surface";
import {
  SURFACE_LABELS,
  SURFACE_DESCRIPTIONS,
  type Surface,
} from "@/lib/surface";

type RoleSwitcherProps = {
  active: Surface;
  entitlements: Surface[];
};

/**
 * Surface (role) switcher shown in the header for users entitled to more than
 * one surface. Single-surface users never see this control.
 */
export function RoleSwitcher({ active, entitlements }: RoleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Don't render at all if there's nothing to switch to.
  if (entitlements.length <= 1) return null;

  const handleSelect = (next: Surface) => {
    if (next === active) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await setActiveSurface(next);
      setOpen(false);
      if (result.ok) {
        // revalidatePath('/dashboard', 'layout') already fired server-side;
        // refresh the router to pick up the new layout shell + cookies.
        router.refresh();
      }
    });
  };

  const ActiveIcon = active === "admin" ? Briefcase : Stethoscope;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className={cn(
            "gap-2",
            active === "admin"
              ? "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300"
              : "border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-900 dark:text-teal-300"
          )}
          aria-label={`Switch surface (currently ${SURFACE_LABELS[active]})`}
        >
          <ActiveIcon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{SURFACE_LABELS[active]}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {entitlements.map((s) => {
          const Icon = s === "admin" ? Briefcase : Stethoscope;
          const isActive = s === active;
          return (
            <DropdownMenuItem
              key={s}
              onSelect={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              className="flex items-start gap-3 py-2"
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  s === "admin" ? "text-purple-600" : "text-teal-600"
                )}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {SURFACE_LABELS[s]}
                  </span>
                  {isActive && (
                    <Check
                      className="h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {SURFACE_DESCRIPTIONS[s]}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
