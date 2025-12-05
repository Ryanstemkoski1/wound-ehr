"use client";

import { TrendingDown, TrendingUp, Minus, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type WoundQuickStatsProps = {
  onsetDate: Date;
  assessmentCount: number;
  latestMeasurements: {
    length: number | null;
    width: number | null;
    area: number | null;
  } | null;
  previousMeasurements: {
    length: number | null;
    width: number | null;
    area: number | null;
  } | null;
  latestHealingStatus: string | null;
};

export function WoundQuickStats({
  onsetDate,
  assessmentCount,
  latestMeasurements,
  previousMeasurements,
  latestHealingStatus,
}: WoundQuickStatsProps) {
  // Calculate days since onset
  const daysSinceOnset = Math.floor(
    (Date.now() - new Date(onsetDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate area change
  let areaChange: number | null = null;
  let areaChangePercent: number | null = null;
  if (
    latestMeasurements?.area !== null &&
    previousMeasurements?.area !== null &&
    latestMeasurements &&
    previousMeasurements
  ) {
    areaChange = latestMeasurements.area - previousMeasurements.area;
    areaChangePercent =
      (areaChange / previousMeasurements.area) * 100;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Days Since Onset */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Days Since Onset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-bold">{daysSinceOnset}</div>
          </div>
        </CardContent>
      </Card>

      {/* Total Assessments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-bold">{assessmentCount}</div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Latest Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestMeasurements?.area !== null && latestMeasurements !== null ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {latestMeasurements.area} cm²
              </div>
              {latestMeasurements.length !== null &&
                latestMeasurements.width !== null && (
                  <p className="text-xs text-muted-foreground">
                    {latestMeasurements.length} × {latestMeasurements.width} cm
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No measurements</p>
          )}
        </CardContent>
      </Card>

      {/* Healing Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Healing Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {areaChange !== null && areaChangePercent !== null ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {areaChange < 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-green-600" />
                    <div className="text-2xl font-bold text-green-600">
                      {Math.abs(areaChangePercent).toFixed(1)}%
                    </div>
                  </>
                ) : areaChange > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-red-600" />
                    <div className="text-2xl font-bold text-red-600">
                      +{areaChangePercent.toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <>
                    <Minus className="h-5 w-5 text-muted-foreground" />
                    <div className="text-2xl font-bold text-muted-foreground">
                      0%
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {areaChange < 0
                  ? "Wound shrinking (good)"
                  : areaChange > 0
                  ? "Wound growing (concern)"
                  : "No change"}
              </p>
            </div>
          ) : latestHealingStatus ? (
            <Badge
              variant={
                latestHealingStatus === "improving"
                  ? "default"
                  : latestHealingStatus === "stable"
                  ? "secondary"
                  : "destructive"
              }
              className="capitalize text-base py-1.5 px-3"
            >
              {latestHealingStatus}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
