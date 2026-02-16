"use client";

/**
 * Clinician Activity Report Component
 * Shows statistics and charts for a specific clinician
 */

import { useState } from "react";
import { format } from "date-fns";
import { BarChart, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getClinicianActivity,
  type ClinicianActivityResult,
} from "@/app/actions/reports";

type ClinicianActivityReportProps = {
  clinicians: Array<{
    id: string;
    name: string;
    credentials?: string;
  }>;
};

export function ClinicianActivityReport({
  clinicians,
}: ClinicianActivityReportProps) {
  const [selectedClinician, setSelectedClinician] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ClinicianActivityResult | null>(null);

  const handleRunReport = async () => {
    if (!selectedClinician) {
      alert("Please select a clinician");
      return;
    }

    setLoading(true);
    try {
      const result = await getClinicianActivity(
        selectedClinician,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );

      if (result.success && result.data) {
        setData(result.data);
      } else {
        console.error("Failed to fetch clinician activity:", result.error);
        alert("Failed to load report. Please try again.");
        setData(null);
      }
    } catch (error) {
      console.error("Error fetching clinician activity:", error);
      alert("Failed to load report. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Clinician Activity Report</CardTitle>
          <CardDescription>
            View visit statistics, facility breakdown, and activity trends for a
            specific clinician
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Clinician Selection */}
            <div className="space-y-2">
              <Label>Clinician</Label>
              <Select
                value={selectedClinician}
                onValueChange={setSelectedClinician}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinician" />
                </SelectTrigger>
                <SelectContent>
                  {clinicians.map((clinician) => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.name}{" "}
                      {clinician.credentials && `(${clinician.credentials})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={handleRunReport}
            disabled={loading || !selectedClinician}
            className="mt-4"
          >
            {loading ? "Loading..." : "Run Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <>
          {/* Summary Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Visits
                </CardTitle>
                <BarChart className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalVisits}</div>
                <p className="text-muted-foreground text-xs">
                  {format(startDate, "MMM d")} -{" "}
                  {format(endDate, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Wounds Assessed
                </CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.totalWoundsAssessed}
                </div>
                <p className="text-muted-foreground text-xs">
                  Unique wounds treated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Facilities Served
                </CardTitle>
                <BarChart className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.facilitiesBreakdown.length}
                </div>
                <p className="text-muted-foreground text-xs">
                  Different locations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Visits/Week
                </CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.visitsPerWeek.length > 0
                    ? Math.round(data.totalVisits / data.visitsPerWeek.length)
                    : 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  Average weekly activity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Facility Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Visits by Facility</CardTitle>
              <CardDescription>
                Breakdown of visits across facilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.facilitiesBreakdown.map((facility) => (
                  <div key={facility.facilityId} className="flex items-center">
                    <div className="flex-1">
                      <div className="font-medium">{facility.facilityName}</div>
                      <div className="text-muted-foreground text-sm">
                        {facility.visitCount} visits (
                        {Math.round(
                          (facility.visitCount / data.totalVisits) * 100
                        )}
                        %)
                      </div>
                    </div>
                    <div className="w-48">
                      <div className="bg-muted h-2 rounded-full">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(facility.visitCount / data.totalVisits) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 w-12 text-right font-bold">
                      {facility.visitCount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Visits by Status</CardTitle>
              <CardDescription>Current status of all visits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.statusBreakdown.map((status) => (
                  <div key={status.status} className="flex items-center">
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {status.status.replace(/_/g, " ")}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {status.count} visits (
                        {Math.round((status.count / data.totalVisits) * 100)}%)
                      </div>
                    </div>
                    <div className="w-48">
                      <div className="bg-muted h-2 rounded-full">
                        <div
                          className="bg-secondary h-2 rounded-full"
                          style={{
                            width: `${(status.count / data.totalVisits) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 w-12 text-right font-bold">
                      {status.count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Activity Chart */}
          {data.visitsPerWeek.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Visits Per Week</CardTitle>
                <CardDescription>
                  Weekly visit volume over the period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.visitsPerWeek.map((week) => (
                    <div key={week.weekStart} className="flex items-center">
                      <div className="text-muted-foreground w-32 text-sm">
                        Week of {format(new Date(week.weekStart), "MMM d")}
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted h-8 rounded">
                          <div
                            className="bg-accent flex h-8 items-center justify-end rounded pr-2 text-sm font-medium"
                            style={{
                              width: `${(week.count / Math.max(...data.visitsPerWeek.map((w) => w.count))) * 100}%`,
                              minWidth: week.count > 0 ? "40px" : "0",
                            }}
                          >
                            {week.count}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
