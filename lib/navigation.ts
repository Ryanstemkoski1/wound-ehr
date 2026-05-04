// Top-level navigation configuration, organized by UX surface.
// Single source of truth for the sidebar AND the mobile bottom nav.
//
// Per docs/PROJECT_PLAN.md §5.1 (R-004, R-005, R-006):
//   - Admin surface hides: Wounds (top-level), Signatures, AI Transcripts
//     (the latter two stay only via the Admin section for tenant_admin).
//   - Clinical surface hides: Billing, Reports, Admin.
//   - Incidents re-enabled in Phase 5 (R-081): visible on both surfaces.

import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Shield,
  Activity,
  FileSignature,
  Inbox,
  BarChart,
  BrainCircuit,
  Settings,
  Building2,
  HeartHandshake,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { Surface } from "@/lib/surface";
import type { UserRole } from "@/lib/rbac";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export type AdminNavItem = NavItem & {
  /** Tenant-admin-only items are hidden from facility admins. */
  tenantOnly?: boolean;
};

const ADMIN_MAIN_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart },
  { name: "Billing", href: "/dashboard/billing", icon: DollarSign },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const CLINICAL_MAIN_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Wounds", href: "/dashboard/wounds", icon: Activity },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const ADMIN_SECTION_NAV: AdminNavItem[] = [
  { name: "Office Inbox", href: "/dashboard/admin/inbox", icon: Inbox },
  { name: "Users", href: "/dashboard/admin/users", icon: Users },
  {
    name: "Facilities",
    href: "/dashboard/admin/facilities",
    icon: Building2,
    tenantOnly: true,
  },
  {
    name: "Agencies",
    href: "/dashboard/admin/agencies",
    icon: HeartHandshake,
  },
  { name: "Invites", href: "/dashboard/admin/invites", icon: Shield },
  {
    name: "Signatures",
    href: "/dashboard/admin/signatures",
    icon: FileSignature,
    tenantOnly: true,
  },
  {
    name: "AI Transcripts",
    href: "/dashboard/admin/transcripts",
    icon: BrainCircuit,
    tenantOnly: true,
  },
];

/** Main nav items for the active surface. */
export function getMainNav(surface: Surface): NavItem[] {
  return surface === "admin" ? ADMIN_MAIN_NAV : CLINICAL_MAIN_NAV;
}

/**
 * Admin-section nav items, scoped by role. Returns an empty array when the
 * Admin section should not be shown at all (clinical surface, or a non-admin
 * user accidentally on the admin surface).
 */
export function getAdminSectionNav(
  surface: Surface,
  role: UserRole | null
): AdminNavItem[] {
  if (surface !== "admin") return [];
  if (role !== "tenant_admin" && role !== "facility_admin") return [];
  return ADMIN_SECTION_NAV.filter(
    (item) => !item.tenantOnly || role === "tenant_admin"
  );
}

/** Mobile bottom-nav items per surface (5 max, last is "More"). */
export function getBottomNav(surface: Surface): NavItem[] {
  if (surface === "admin") {
    return [
      { name: "Home", href: "/dashboard", icon: LayoutDashboard },
      { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { name: "Patients", href: "/dashboard/patients", icon: Users },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart },
    ];
  }
  return [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    { name: "Patients", href: "/dashboard/patients", icon: Users },
    { name: "Wounds", href: "/dashboard/wounds", icon: Activity },
  ];
}
