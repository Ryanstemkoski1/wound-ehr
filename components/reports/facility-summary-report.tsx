"use client";

/**
 * Facility Summary Report Component
 * Shows aggregate statistics for a specific facility
 */

import { useState } from "react";
import { format } from "date-fns";
import {
  Building2,
  Calendar as CalendarIcon,
  Users,
  Activity,
} from "lucide-react";
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
  getFacilitySummary,
  type FacilitySummaryResult,
} from "@/app/actions/reports";

type FacilitySummaryReportProps = {
  facilities: Array<{ id: string; name: string }>;
};

export function FacilitySummaryReport({
  facilities,
}: FacilitySummaryReportProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FacilitySummaryResult | null>(null);

  const handleRunReport = async () => {
    if (!selectedFacility) {
      alert("Please select a facility");
      return;
    }

    setLoading(true);
    try {
      const result = await getFacilitySummary(
        selectedFacility,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );

      if (result.success && result.data) {
        setData(result.data);
      } else {
        console.error("Failed to fetch facility summary:", result.error);
        alert("Failed to load report. Please try again.");
        setData(null);
      }
    } catch (error) {
      console.error("Error fetching facility summary:", error);
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
          <CardTitle>Facility Summary Report</CardTitle>
          <CardDescription>
            View aggregate statistics and clinician breakdown for a specific
            facility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Facility Selection */}
            <div className="space-y-2">
              <Label>Facility</Label>
              <Select
                value={selectedFacility}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
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
            disabled={loading || !selectedFacility}
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
                  Total Patients
                </CardTitle>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalPatients}</div>
                <p className="text-muted-foreground text-xs">
                  Unique patients seen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Visits
                </CardTitle>
                <Activity className="text-muted-foreground h-4 w-4" />
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
                  Clinicians
                </CardTitle>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.cliniciansBreakdown.length}
                </div>
                <p className="text-muted-foreground text-xs">
                  Different clinicians
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Wounds/Visit
                </CardTitle>
                <Activity className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.avgWoundsPerVisit}
                </div>
                <p className="text-muted-foreground text-xs">
                  Average per visit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Facility Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {data.facility.name}
              </CardTitle>
              {data.facility.address && (
                <CardDescription>{data.facility.address}</CardDescription>
              )}
            </CardHeader>
          </Card>

          {/* Clinicians Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Visits by Clinician</CardTitle>
              <CardDescription>
                Breakdown of visits by each clinician
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.cliniciansBreakdown.map((clinician) => (
                  <div
                    key={clinician.clinicianId}
                    className="flex items-center"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {clinician.clinicianName}
                        {clinician.credentials && `, ${clinician.credentials}`}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {clinician.visitCount} visits (
                        {Math.round(
                          (clinician.visitCount / data.totalVisits) * 100
                        )}
                        %)
                      </div>
                    </div>
                    <div className="w-48">
                      <div className="bg-muted h-2 rounded-full">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(clinician.visitCount / data.totalVisits) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 w-12 text-right font-bold">
                      {clinician.visitCount}
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
        </>
      )}
    </div>
  );
}
