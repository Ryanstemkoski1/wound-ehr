import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Users,
  FileText,
  Calendar,
  AlertCircle,
  Building2,
  Shield,
  UserPlus,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  Inbox,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { LazyDashboardCharts } from "@/components/dashboard/lazy-dashboard-charts";
import { getUserRole } from "@/lib/rbac";
import { getCorrectionsForClinician } from "@/app/actions/approval-workflow";
import { CorrectionBanner } from "@/components/dashboard/correction-banner";
import { getActiveSurface } from "@/lib/surface";
import { getUserCredentials } from "@/lib/rbac";
import {
  getClinicalDashboardStats,
  getAdminDashboardStats,
} from "@/app/actions/visits";
import { Badge } from "@/components/ui/badge";

// Force dynamic rendering (requires auth)
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role for admin features
  const userRole = await getUserRole();

  // Resolve active surface (clinical vs admin/ops)
  const credentials = await getUserCredentials();
  const activeSurface =
    (await getActiveSurface(userRole?.role ?? null, credentials)) ?? "clinical";
  const isAdminSurface = activeSurface === "admin";

  // Surface-specific stats (non-blocking)
  let clinicalStats: Awaited<ReturnType<typeof getClinicalDashboardStats>> = {
    visitsTodayOwn: 0,
    unsignedToday: 0,
    visitsThisWeekOwn: 0,
    recentOwnVisits: [],
  };
  let adminStats: Awaited<ReturnType<typeof getAdminDashboardStats>> = {
    visitsTodayAll: 0,
    unsignedTodayAll: 0,
    pendingInboxCount: 0,
    billingReadyCount: 0,
  };

  // Get admin stats if user is tenant admin (parallel)
  let totalUsers = 0;
  let totalFacilities = 0;
  let pendingInvites = 0;

  if (userRole?.role === "tenant_admin") {
    try {
      const [usersResult, facilitiesResult, invitesResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", userRole.tenant_id),
        supabase
          .from("facilities")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", userRole.tenant_id),
        supabase
          .from("invites")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", userRole.tenant_id)
          .eq("status", "pending"),
      ]);
      totalUsers = usersResult.count || 0;
      totalFacilities = facilitiesResult.count || 0;
      pendingInvites = invitesResult.count || 0;
    } catch {
      // Admin stats unavailable — non-critical
    }
  }

  // Get stats across all user's facilities with error handling
  let totalPatients = 0;
  let activeWounds = 0;
  let recentVisits: {
    id: string;
    visit_date: string;
    visit_type: string;
    status: string;
    patient: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }[] = [];
  let woundsByStatus: { status: string; count: number }[] = [];
  let visitsLast6Months: { month: string; visits: number }[] = [];
  let healingTrends: {
    week: string;
    healing: number;
    stable: number;
    declined: number;
  }[] = [];
  let hasError = false;

  try {
    // Get user's facility IDs
    const { data: userFacilities } = await supabase
      .from("user_facilities")
      .select("facility_id")
      .eq("user_id", user.id);

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || [];

    // Fetch surface-specific stats in parallel (non-blocking)
    try {
      if (isAdminSurface) {
        adminStats = await getAdminDashboardStats(facilityIds);
      } else {
        clinicalStats = await getClinicalDashboardStats();
      }
    } catch {
      // Surface stats unavailable — non-critical
    }

    if (facilityIds.length === 0) {
      // User has no facilities, show empty dashboard
      hasError = false;
    } else {
      // Get patient count and patient IDs in parallel
      const [patientsCountResult, patientsResult] = await Promise.all([
        supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .in("facility_id", facilityIds),
        supabase.from("patients").select("id").in("facility_id", facilityIds),
      ]);

      totalPatients = patientsCountResult.count || 0;
      const patientIds = patientsResult.data?.map((p) => p.id) || [];

      if (patientIds.length > 0) {
        // All these queries are independent — run in parallel
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString();

        // Build the 6-month date ranges for visit history
        const monthRanges = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          return {
            start: new Date(
              date.getFullYear(),
              date.getMonth(),
              1
            ).toISOString(),
            end: new Date(
              date.getFullYear(),
              date.getMonth() + 1,
              0
            ).toISOString(),
            label: new Date(
              date.getFullYear(),
              date.getMonth(),
              1
            ).toLocaleDateString("en-US", { month: "short" }),
          };
        });

        const [
          woundsCountResult,
          ,
          ,
          recentVisitsResult,
          woundsResult,
          ...monthlyVisitResults
        ] = await Promise.all([
          // Active wounds count
          supabase
            .from("wounds")
            .select("*", { count: "exact", head: true })
            .eq("status", "active")
            .in("patient_id", patientIds),
          // Visits this month
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .in("patient_id", patientIds)
            .gte("visit_date", startOfMonth),
          // Pending visits
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("status", "incomplete")
            .in("patient_id", patientIds),
          // Recent 5 visits
          supabase
            .from("visits")
            .select(
              `
              *,
              patient:patients!inner(id, first_name, last_name)
            `
            )
            .in("patient_id", patientIds)
            .order("visit_date", { ascending: false })
            .limit(5),
          // Wound status distribution
          supabase.from("wounds").select("status").in("patient_id", patientIds),
          // 6 monthly visit counts — all in parallel instead of sequential loop
          ...monthRanges.map((range) =>
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .in("patient_id", patientIds)
              .gte("visit_date", range.start)
              .lte("visit_date", range.end)
          ),
        ]);

        activeWounds = woundsCountResult.count || 0;
        recentVisits = recentVisitsResult.data || [];

        // Process wound status distribution
        const statusGroups = (woundsResult.data || []).reduce(
          (acc: Record<string, number>, wound) => {
            acc[wound.status] = (acc[wound.status] || 0) + 1;
            return acc;
          },
          {}
        );

        woundsByStatus = Object.entries(statusGroups).map(
          ([status, count]) => ({
            status,
            count: count as number,
          })
        );

        // Process monthly visit counts
        visitsLast6Months = monthRanges.map((range, i) => ({
          month: range.label,
          visits: monthlyVisitResults[i]?.count || 0,
        }));
      }
    }

    // Healing trends (mock data for now - would need assessment history)
    healingTrends = [
      { week: "Week 1", healing: 12, stable: 8, declined: 3 },
      { week: "Week 2", healing: 15, stable: 7, declined: 2 },
      { week: "Week 3", healing: 18, stable: 6, declined: 2 },
      { week: "Week 4", healing: 20, stable: 5, declined: 1 },
      { week: "Week 5", healing: 22, stable: 4, declined: 1 },
      { week: "Week 6", healing: 25, stable: 3, declined: 1 },
      { week: "Week 7", healing: 27, stable: 3, declined: 0 },
      { week: "Week 8", healing: 30, stable: 2, declined: 0 },
    ];
  } catch {
    hasError = true;
    // Use dynamic month labels for fallback
    const fallbackMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleDateString("en-US", { month: "short" });
    });
    visitsLast6Months = fallbackMonths.map((month) => ({ month, visits: 0 }));
    healingTrends = Array.from({ length: 8 }, (_, i) => ({
      week: `Week ${i + 1}`,
      healing: 0,
      stable: 0,
      declined: 0,
    }));
  }

  // Get corrections count for banner (clinician-facing)
  let correctionsCount = 0;
  try {
    const { data: corrections } = await getCorrectionsForClinician(user.id);
    correctionsCount = corrections?.length || 0;
  } catch {
    // Corrections count unavailable — non-critical
  }

  // Prepare chart data
  const woundStatusData = woundsByStatus.map(
    (item: { status: string; count: number }) => ({
      name:
        item.status.charAt(0).toUpperCase() +
        item.status.slice(1).toLowerCase(),
      value: item.count,
    })
  );

  const stats = isAdminSurface
    ? [
        {
          title: "Total Patients",
          value: totalPatients.toString(),
          icon: Users,
          description: "Active patients across facilities",
          color: "teal",
          gradient: "from-teal-500 to-teal-600",
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
          href: "/dashboard/patients",
        },
        {
          title: "Visits Today",
          value: adminStats.visitsTodayAll.toString(),
          icon: Calendar,
          description: "All clinicians today",
          color: "blue",
          gradient: "from-blue-500 to-cyan-500",
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
          href: "/dashboard/calendar",
        },
        {
          title: "Unsigned Today",
          value: adminStats.unsignedTodayAll.toString(),
          icon: ClipboardList,
          description: "Pending signatures today",
          color: "amber",
          gradient: "from-amber-500 to-orange-500",
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-600 dark:text-amber-400",
          href: "/dashboard/calendar",
        },
        {
          title: "Office Inbox",
          value: adminStats.pendingInboxCount.toString(),
          icon: Inbox,
          description: "Notes awaiting review",
          color: "purple",
          gradient: "from-purple-500 to-pink-500",
          iconBg: "bg-purple-500/10",
          iconColor: "text-purple-600 dark:text-purple-400",
          href: "/dashboard/admin",
        },
      ]
    : [
        {
          title: "My Visits Today",
          value: clinicalStats.visitsTodayOwn.toString(),
          icon: Calendar,
          description: "Visits scheduled for today",
          color: "teal",
          gradient: "from-teal-500 to-teal-600",
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
          href: "/dashboard/calendar",
        },
        {
          title: "Unsigned Today",
          value: clinicalStats.unsignedToday.toString(),
          icon: ClipboardList,
          description: "Need your signature today",
          color: "amber",
          gradient: "from-amber-500 to-orange-500",
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-600 dark:text-amber-400",
          href: "/dashboard/calendar",
        },
        {
          title: "Corrections Pending",
          value: correctionsCount.toString(),
          icon: ClipboardCheck,
          description: "Notes requiring correction",
          color: "purple",
          gradient: "from-purple-500 to-pink-500",
          iconBg: "bg-purple-500/10",
          iconColor: "text-purple-600 dark:text-purple-400",
          href: "/dashboard/corrections",
        },
        {
          title: "Active Wounds",
          value: activeWounds.toString(),
          icon: HeartPulse,
          description: "Currently being tracked",
          color: "blue",
          gradient: "from-blue-500 to-cyan-500",
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
          href: "/dashboard/wounds",
        },
      ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Correction Banner */}
      <CorrectionBanner count={correctionsCount} />

      {/* Header with gradient */}
      <div className="page-hero">
        <div className="relative z-10">
          <h1 className="gradient-text text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user.user_metadata?.name || user.email}
          </p>
        </div>
      </div>

      {hasError && (
        <Card className="animate-slide-in border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Database Connection Issue
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-500">
              Unable to connect to the database. Please check your internet
              connection or try again later. The dashboard is displaying default
              values.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Enhanced Stats Grid with Individual Colors */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const StatCard = (
            <Card
              key={stat.title}
              className="group hover-lift relative overflow-hidden border-l-4 transition-all duration-300"
              style={{
                borderLeftColor: `var(--chart-${index + 1})`,
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Gradient background overlay */}
              <div
                className={`absolute inset-0 bg-linear-to-br ${stat.gradient} opacity-[0.03] transition-opacity group-hover:opacity-[0.06]`}
              />

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div
                  className={`rounded-lg ${stat.iconBg} p-2.5 transition-transform group-hover:scale-110`}
                >
                  <Icon
                    className={`h-5 w-5 ${stat.iconColor}`}
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );

          // Wrap in Link if href is provided
          return stat.href ? (
            <Link key={stat.title} href={stat.href} className="block">
              {StatCard}
            </Link>
          ) : (
            StatCard
          );
        })}
      </div>

      {/* Admin Panel for Tenant Admins */}
      {userRole?.role === "tenant_admin" && (
        <Card className="animate-slide-in border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-primary h-5 w-5" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              Manage users, facilities, and invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/dashboard/admin/users"
                className="group border-border/60 bg-background hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Users className="text-primary h-5 w-5" />
                  </div>
                  <span className="text-2xl font-bold">{totalUsers}</span>
                </div>
                <div>
                  <p className="font-semibold">User Management</p>
                  <p className="text-muted-foreground text-sm">
                    View and manage user accounts
                  </p>
                  <span className="text-primary mt-2 inline-block text-xs group-hover:underline">
                    Manage →
                  </span>
                </div>
              </Link>

              <Link
                href="/dashboard/admin/facilities"
                className="group border-border/60 bg-background hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Building2 className="text-primary h-5 w-5" />
                  </div>
                  <span className="text-2xl font-bold">{totalFacilities}</span>
                </div>
                <div>
                  <p className="font-semibold">Facilities</p>
                  <p className="text-muted-foreground text-sm">
                    Configure facility settings
                  </p>
                  <span className="text-primary mt-2 inline-block text-xs group-hover:underline">
                    Manage →
                  </span>
                </div>
              </Link>

              <Link
                href="/dashboard/admin/invites"
                className="group border-border/60 bg-background hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <UserPlus className="text-primary h-5 w-5" />
                  </div>
                  <span className="text-2xl font-bold">{pendingInvites}</span>
                </div>
                <div>
                  <p className="font-semibold">User Invites</p>
                  <p className="text-muted-foreground text-sm">
                    Invite new users to organization
                  </p>
                  <span className="text-primary mt-2 inline-block text-xs group-hover:underline">
                    Manage →
                  </span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section - Lazy loaded for better performance */}
      <LazyDashboardCharts
        woundStatusData={woundStatusData}
        visitsData={visitsLast6Months}
        healingData={healingTrends}
      />

      {/* Recent Activity — surface-specific */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdminSurface ? "Recent Visits" : "My Recent Visits"}
            </CardTitle>
            <CardDescription>
              {isAdminSurface
                ? "Last 5 visits across all clinicians"
                : "Your last 5 patient visits"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdminSurface ? (
              /* Admin: all clinicians recent visits */
              recentVisits.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No recent visits
                </p>
              ) : (
                <div className="space-y-4">
                  {recentVisits.map(
                    (visit: {
                      id: string;
                      visit_date: string;
                      visit_type: string;
                      status: string;
                      patient: {
                        id: string;
                        first_name: string;
                        last_name: string;
                      };
                    }) => {
                      const patient = Array.isArray(visit.patient)
                        ? visit.patient[0]
                        : visit.patient;
                      return (
                        <Link
                          key={visit.id}
                          href={`/dashboard/patients/${patient.id}/visits/${visit.id}`}
                          className="hover:bg-accent border-border/60 flex items-center justify-between rounded-xl border p-3 transition-colors"
                          aria-label={`View visit for ${patient.first_name} ${patient.last_name}`}
                        >
                          <div>
                            <p className="font-medium">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {format(
                                new Date(visit.visit_date),
                                "MMM dd, yyyy"
                              )}{" "}
                              • {visit.visit_type}
                            </p>
                          </div>
                          <Badge
                            variant={
                              visit.status === "signed" ||
                              visit.status === "submitted"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {visit.status}
                          </Badge>
                        </Link>
                      );
                    }
                  )}
                </div>
              )
            ) : /* Clinical: own recent visits */
            clinicalStats.recentOwnVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent visits</p>
            ) : (
              <div className="space-y-4">
                {clinicalStats.recentOwnVisits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/patients/${visit.patient_id}/visits/${visit.id}`}
                    className="hover:bg-accent border-border/60 flex items-center justify-between rounded-xl border p-3 transition-colors"
                    aria-label={`View visit for ${visit.patient_name}`}
                  >
                    <div>
                      <p className="font-medium">{visit.patient_name}</p>
                      <p className="text-muted-foreground text-sm">
                        {format(new Date(visit.visit_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        visit.status === "signed" ||
                        visit.status === "submitted"
                          ? "default"
                          : visit.status === "draft" ||
                              visit.status === "incomplete"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {visit.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAdminSurface ? (
              <>
                <Link
                  href="/dashboard/admin"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="Review Office Inbox"
                >
                  <Inbox className="text-primary h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Office Inbox</p>
                    <p className="text-muted-foreground text-xs">
                      Review notes sent for approval
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="Review Billing"
                >
                  <DollarSign
                    className="text-primary h-5 w-5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">Billing</p>
                    <p className="text-muted-foreground text-xs">
                      Process billing records
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/patients"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="View Patients"
                >
                  <Users className="text-primary h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Patients</p>
                    <p className="text-muted-foreground text-xs">
                      View and manage patient roster
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="Reports"
                >
                  <Activity
                    className="text-primary h-5 w-5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">Reports</p>
                    <p className="text-muted-foreground text-xs">
                      Visit logs and analytics
                    </p>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/calendar"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="View Today's Schedule"
                >
                  <Calendar
                    className="text-primary h-5 w-5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">Today&apos;s Schedule</p>
                    <p className="text-muted-foreground text-xs">
                      {clinicalStats.visitsTodayOwn} visits today ·{" "}
                      {clinicalStats.unsignedToday} unsigned
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/patients/new"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="Add New Patient"
                >
                  <Users className="text-primary h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Add New Patient</p>
                    <p className="text-muted-foreground text-xs">
                      Register a new patient
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/wounds"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="Active Wounds"
                >
                  <HeartPulse
                    className="text-primary h-5 w-5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">Active Wounds</p>
                    <p className="text-muted-foreground text-xs">
                      Track wound progress
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  aria-label="View Billing"
                >
                  <FileText
                    className="text-primary h-5 w-5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">View Billing</p>
                    <p className="text-muted-foreground text-xs">
                      Access billing reports
                    </p>
                  </div>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
