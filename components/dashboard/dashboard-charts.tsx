"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type WoundStatusData = {
  name: string;
  value: number;
};

type VisitsData = {
  month: string;
  visits: number;
};

type HealingData = {
  week: string;
  healing: number;
  stable: number;
  declined: number;
};

type Props = {
  woundStatusData: WoundStatusData[];
  visitsData: VisitsData[];
  healingData: HealingData[];
};

const COLORS = {
  active: "oklch(0.52 0.12 192)", // teal
  healing: "oklch(0.65 0.15 145)", // green
  healed: "oklch(0.75 0.08 85)", // amber
  stable: "oklch(0.60 0.10 265)", // blue
  declined: "oklch(0.58 0.22 25)", // red
};

export function DashboardCharts({
  woundStatusData,
  visitsData,
  healingData,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Wound Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Status Distribution</CardTitle>
          <CardDescription>
            Current status of all tracked wounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={woundStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: unknown) => {
                  const e = entry as { name: string; percent?: number };
                  return `${e.name}: ${((e.percent || 0) * 100).toFixed(0)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {woundStatusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.name === "Active"
                        ? COLORS.active
                        : entry.name === "Healing"
                          ? COLORS.healing
                          : COLORS.healed
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Visits Per Month */}
      <Card>
        <CardHeader>
          <CardTitle>Visits Over Time</CardTitle>
          <CardDescription>
            Monthly visit trends (last 6 months)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={visitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill={COLORS.active} name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Healing Progress Trends */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Healing Progress Trends</CardTitle>
          <CardDescription>
            Wound healing status over the last 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={healingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="healing"
                stroke={COLORS.healing}
                name="Improving"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="stable"
                stroke={COLORS.stable}
                name="Stable"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="declined"
                stroke={COLORS.declined}
                name="Declined"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardCharts;
