"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ChartLoadingSkeleton } from "@/components/ui/loading-skeletons";

type DashboardChartsProps = {
  woundStatusData: { name: string; value: number }[];
  visitsData: { month: string; visits: number }[];
  healingData: {
    week: string;
    healing: number;
    stable: number;
    declined: number;
  }[];
};

// Lazy load the heavy dashboard charts component
const DashboardChartsComponent = dynamic<DashboardChartsProps>(
  () => import("@/components/dashboard/dashboard-charts"),
  {
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartLoadingSkeleton />
        <ChartLoadingSkeleton />
        <ChartLoadingSkeleton />
      </div>
    ),
    ssr: false,
  }
);

export function LazyDashboardCharts(props: DashboardChartsProps) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ChartLoadingSkeleton />
          <ChartLoadingSkeleton />
          <ChartLoadingSkeleton />
        </div>
      }
    >
      <DashboardChartsComponent {...props} />
    </Suspense>
  );
}
