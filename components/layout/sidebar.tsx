"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  FileText,
  Activity,
  Settings,
  DollarSign,
  X,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Facilities", href: "/dashboard/facilities", icon: Building2 },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Billing", href: "/dashboard/billing", icon: DollarSign },
  { name: "Visits", href: "/dashboard/visits", icon: FileText },
  { name: "Wounds", href: "/dashboard/wounds", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function Sidebar({
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    // Close mobile menu when navigating
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="flex items-center"
            onClick={handleLinkClick}
          >
            <Image src="/icon.svg" alt="Wound EHR" width={32} height={32} />
            <span className="ml-2 text-lg font-semibold">Wound EHR</span>
          </Link>

          {/* Close button (mobile only) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Wound EHR v0.1.0
          </p>
        </div>
      </div>
    </>
  );
}
