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
} from "lucide-react";
import Image from "next/image";

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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/icon.svg" alt="Wound EHR" width={32} height={32} />
          <span className="ml-2 text-lg font-semibold">Wound EHR</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
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
  );
}
