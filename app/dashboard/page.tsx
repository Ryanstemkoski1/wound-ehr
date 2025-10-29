import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, FileText, Calendar } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // TODO: Fetch real stats from database
  const stats = [
    {
      title: "Total Patients",
      value: "0",
      icon: Users,
      description: "Active patients",
    },
    {
      title: "Active Wounds",
      value: "0",
      icon: Activity,
      description: "Currently being tracked",
    },
    {
      title: "Visits This Month",
      value: "0",
      icon: Calendar,
      description: "Completed visits",
    },
    {
      title: "Pending Visits",
      value: "0",
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

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-2 font-semibold">🎉 Welcome to Wound EHR</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Your system is ready! Here&apos;s what you can do next:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>• Set up your first facility</li>
              <li>• Add patient records</li>
              <li>• Create wound assessments</li>
              <li>• Schedule visits</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
