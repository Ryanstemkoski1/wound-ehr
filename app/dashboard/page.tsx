import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, Users, FileText, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { LazyDashboardCharts } from "@/components/dashboard/lazy-dashboard-charts";

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

  // Get stats across all user's facilities with error handling
  let totalPatients = 0;
  let activeWounds = 0;
  let visitsThisMonth = 0;
  let pendingVisits = 0;
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

    if (facilityIds.length === 0) {
      // User has no facilities, show empty dashboard
      hasError = false;
    } else {
      // Count active patients
      const { count: patientsCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .in("facility_id", facilityIds);

      totalPatients = patientsCount || 0;

      // Get all patients in user's facilities for wound queries
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .in("facility_id", facilityIds);

      const patientIds = patients?.map((p) => p.id) || [];

      if (patientIds.length > 0) {
        // Count active wounds
        const { count: woundsCount } = await supabase
          .from("wounds")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .in("patient_id", patientIds);

        activeWounds = woundsCount || 0;

        // Count visits this month
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString();
        const { count: visitsCount } = await supabase
          .from("visits")
          .select("*", { count: "exact", head: true })
          .in("patient_id", patientIds)
          .gte("visit_date", startOfMonth);

        visitsThisMonth = visitsCount || 0;

        // Count pending visits
        const { count: pendingCount } = await supabase
          .from("visits")
          .select("*", { count: "exact", head: true })
          .eq("status", "incomplete")
          .in("patient_id", patientIds);

        pendingVisits = pendingCount || 0;

        // Get recent visits
        const { data: visits } = await supabase
          .from("visits")
          .select(
            `
            *,
            patient:patients!inner(id, first_name, last_name)
          `
          )
          .in("patient_id", patientIds)
          .order("visit_date", { ascending: false })
          .limit(5);

        recentVisits = visits || [];

        // Get wound status distribution
        const { data: wounds } = await supabase
          .from("wounds")
          .select("status")
          .in("patient_id", patientIds);

        const statusGroups = (wounds || []).reduce(
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
      }
    }

    // Get visits for last 6 months
    visitsLast6Months = [];
    if (facilityIds.length > 0) {
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .in("facility_id", facilityIds);

      const patientIds = patients?.map((p) => p.id) || [];

      if (patientIds.length > 0) {
        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          const startOfMonth = new Date(
            date.getFullYear(),
            date.getMonth(),
            1
          ).toISOString();
          const endOfMonth = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
          ).toISOString();

          const { count } = await supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .in("patient_id", patientIds)
            .gte("visit_date", startOfMonth)
            .lte("visit_date", endOfMonth);

          visitsLast6Months.push({
            month: new Date(startOfMonth).toLocaleDateString("en-US", {
              month: "short",
            }),
            visits: count || 0,
          });
        }
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
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    hasError = true;
    // Use default values already set above
    visitsLast6Months = [
      { month: "May", visits: 0 },
      { month: "Jun", visits: 0 },
      { month: "Jul", visits: 0 },
      { month: "Aug", visits: 0 },
      { month: "Sep", visits: 0 },
      { month: "Oct", visits: 0 },
    ];
    healingTrends = [
      { week: "Week 1", healing: 0, stable: 0, declined: 0 },
      { week: "Week 2", healing: 0, stable: 0, declined: 0 },
      { week: "Week 3", healing: 0, stable: 0, declined: 0 },
      { week: "Week 4", healing: 0, stable: 0, declined: 0 },
      { week: "Week 5", healing: 0, stable: 0, declined: 0 },
      { week: "Week 6", healing: 0, stable: 0, declined: 0 },
      { week: "Week 7", healing: 0, stable: 0, declined: 0 },
      { week: "Week 8", healing: 0, stable: 0, declined: 0 },
    ];
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

  const stats = [
    {
      title: "Total Patients",
      value: totalPatients.toString(),
      icon: Users,
      description: "Active patients",
      color: "teal",
      gradient: "from-teal-500 to-teal-600",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
      href: "/dashboard/patients",
    },
    {
      title: "Active Wounds",
      value: activeWounds.toString(),
      icon: Activity,
      description: "Currently being tracked",
      color: "amber",
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      href: "/dashboard/wounds",
    },
    {
      title: "Visits This Month",
      value: visitsThisMonth.toString(),
      icon: Calendar,
      description: "Completed visits",
      color: "blue",
      gradient: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
      href: "/dashboard/calendar",
    },
    {
      title: "Pending Visits",
      value: pendingVisits.toString(),
      icon: FileText,
      description: "Incomplete documentation",
      color: "purple",
      gradient: "from-purple-500 to-pink-500",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600 dark:text-purple-400",
      href: "/dashboard/calendar",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header with gradient */}
      <div className="from-primary/10 via-background to-accent/5 shadow-soft relative overflow-hidden rounded-xl bg-linear-to-br p-8">
        <div className="relative z-10">
          <h1 className="gradient-text text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Welcome back, {user.user_metadata?.name || user.email}
          </p>
        </div>
        {/* Decorative circles */}
        <div className="bg-primary/5 absolute -top-16 -right-16 h-64 w-64 rounded-full blur-3xl" />
        <div className="bg-accent/5 absolute -bottom-12 -left-12 h-48 w-48 rounded-full blur-2xl" />
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

      {/* Charts Section - Lazy loaded for better performance */}
      <LazyDashboardCharts
        woundStatusData={woundStatusData}
        visitsData={visitsLast6Months}
        healingData={healingTrends}
      />

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Visits</CardTitle>
            <CardDescription>Last 5 patient visits</CardDescription>
          </CardHeader>
          <CardContent>
            {recentVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent visits</p>
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
                        className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
                        aria-label={`View visit for ${patient.first_name} ${patient.last_name} on ${format(new Date(visit.visit_date), "MMM dd, yyyy")}, status: ${visit.status}`}
                      >
                        <div>
                          <p className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {format(new Date(visit.visit_date), "MMM dd, yyyy")}{" "}
                            • {visit.visit_type}
                          </p>
                        </div>
                        <div>
                          {visit.status === "incomplete" ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Incomplete
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Complete
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  }
                )}
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
            <Link
              href="/dashboard/patients/new"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
              aria-label="Add New Patient - Register a new patient"
            >
              <Users className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <div>
                <p className="font-medium">Add New Patient</p>
                <p className="text-muted-foreground text-xs">
                  Register a new patient
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/calendar"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
              aria-label="Schedule Visit - Book an appointment"
            >
              <Calendar className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <div>
                <p className="font-medium">Schedule Visit</p>
                <p className="text-muted-foreground text-xs">
                  Book an appointment
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/billing"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
              aria-label="View Billing - Access billing reports"
            >
              <FileText className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <div>
                <p className="font-medium">View Billing</p>
                <p className="text-muted-foreground text-xs">
                  Access billing reports
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
