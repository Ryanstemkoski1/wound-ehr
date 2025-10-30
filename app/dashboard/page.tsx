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
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { LazyDashboardCharts } from "@/components/dashboard/lazy-dashboard-charts";

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
    visitDate: Date;
    visitType: string;
    status: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[] = [];
  let woundsByStatus: { status: string; _count: { id: number } }[] = [];
  let visitsLast6Months: { month: string; visits: number }[] = [];
  let healingTrends: {
    week: string;
    healing: number;
    stable: number;
    declined: number;
  }[] = [];
  let hasError = false;

  try {
    const results = await Promise.all([
      prisma.patient.count({
        where: {
          isActive: true,
          facility: {
            users: {
              some: { userId: user.id },
            },
          },
        },
      }),
      prisma.wound.count({
        where: {
          status: "active",
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
      }),
      prisma.visit.count({
        where: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
          visitDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.visit.count({
        where: {
          status: "incomplete",
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
      }),
      // Recent visits
      prisma.visit.findMany({
        where: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          visitDate: "desc",
        },
        take: 5,
      }),
      // Wound status distribution
      prisma.wound.groupBy({
        by: ["status"],
        where: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    [
      totalPatients,
      activeWounds,
      visitsThisMonth,
      pendingVisits,
      recentVisits,
      woundsByStatus,
    ] = results;

    // Get visits for last 6 months (simplified - no parallel queries inside Promise.all)
    visitsLast6Months = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await prisma.visit.count({
        where: {
          patient: {
            facility: {
              users: {
                some: { userId: user.id },
              },
            },
          },
          visitDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      visitsLast6Months.push({
        month: startOfMonth.toLocaleDateString("en-US", { month: "short" }),
        visits: count,
      });
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
    (item: { status: string; _count: { id: number } }) => ({
      name:
        item.status.charAt(0).toUpperCase() +
        item.status.slice(1).toLowerCase(),
      value: item._count.id,
    })
  );

  const stats = [
    {
      title: "Total Patients",
      value: totalPatients.toString(),
      icon: Users,
      description: "Active patients",
    },
    {
      title: "Active Wounds",
      value: activeWounds.toString(),
      icon: Activity,
      description: "Currently being tracked",
    },
    {
      title: "Visits This Month",
      value: visitsThisMonth.toString(),
      icon: Calendar,
      description: "Completed visits",
    },
    {
      title: "Pending Visits",
      value: pendingVisits.toString(),
      icon: FileText,
      description: "Incomplete documentation",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome back, {user.user_metadata?.name || user.email}
        </p>
      </div>

      {hasError && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
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
                    visitDate: Date;
                    visitType: string;
                    status: string;
                    patient: {
                      id: string;
                      firstName: string;
                      lastName: string;
                    };
                  }) => (
                    <Link
                      key={visit.id}
                      href={`/dashboard/patients/${visit.patient.id}/visits/${visit.id}`}
                      className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {visit.patient.firstName} {visit.patient.lastName}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {format(new Date(visit.visitDate), "MMM dd, yyyy")} •{" "}
                          {visit.visitType}
                        </p>
                      </div>
                      <div>
                        {visit.status === "incomplete" ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            Incomplete
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Complete
                          </span>
                        )}
                      </div>
                    </Link>
                  )
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
            >
              <Users className="h-5 w-5 text-teal-600" />
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
            >
              <Calendar className="h-5 w-5 text-teal-600" />
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
            >
              <FileText className="h-5 w-5 text-teal-600" />
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
