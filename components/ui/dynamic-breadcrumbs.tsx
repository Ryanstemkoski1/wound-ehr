"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Home,
  Users,
  Calendar,
  Building2,
  FileText,
  BarChart3,
  Activity,
  UserCircle,
} from "lucide-react";

// Icon mapping for different routes
const routeIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  dashboard: Home,
  patients: Users,
  visits: Calendar,
  facilities: Building2,
  reports: FileText,
  analytics: BarChart3,
  wounds: Activity,
  user: UserCircle,
};

// Label mapping for route segments
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  visits: "Visits",
  facilities: "Facilities",
  reports: "Reports",
  analytics: "Analytics",
  wounds: "Wounds",
  new: "New",
  edit: "Edit",
  assessments: "Assessments",
};

interface DynamicBreadcrumbsProps {
  customSegments?: { label: string; href?: string }[];
}

export function DynamicBreadcrumbs({
  customSegments,
}: DynamicBreadcrumbsProps) {
  const pathname = usePathname();

  // Don't show breadcrumbs on homepage or login
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);

  // If custom segments provided, use those
  if (customSegments && customSegments.length > 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-1.5"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {customSegments.map((segment, index) => {
            const isLast = index === customSegments.length - 1;
            return (
              <Fragment key={index}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : segment.href ? (
                    <BreadcrumbLink href={segment.href}>
                      {segment.label}
                    </BreadcrumbLink>
                  ) : (
                    <span>{segment.label}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Auto-generate breadcrumbs from pathname
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const breadcrumbPath = segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;

          // Skip UUIDs and numeric IDs in breadcrumbs (show but don't link)
          const isId =
            segment.match(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            ) || /^\d+$/.test(segment);

          // Get label and icon
          const label =
            routeLabels[segment] ||
            segment.charAt(0).toUpperCase() + segment.slice(1);
          const Icon = routeIcons[segment];

          // First breadcrumb is always Dashboard with icon
          if (index === 0) {
            return (
              <BreadcrumbItem key={segment}>
                <BreadcrumbLink
                  href="/dashboard"
                  className="flex items-center gap-1.5"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
            );
          }

          return (
            <Fragment key={`${segment}-${index}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    {Icon && <Icon className="h-4 w-4" />}
                    {isId ? "Details" : label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={`/${breadcrumbPath}`}
                    className="flex items-center gap-1.5"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">
                      {isId ? "..." : label}
                    </span>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
