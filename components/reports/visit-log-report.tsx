"use client";

/**
 * Visit Log Report Component
 * Filterable table of all visits with export functionality
 */

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Search,
  Download,
  FileText,
  Filter,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getVisitLog,
  exportVisitLogToCSV,
  type VisitLogFilters,
  type VisitLogResult,
} from "@/app/actions/reports";
import Link from "next/link";

type VisitLogReportProps = {
  facilities: Array<{ id: string; name: string }>;
  clinicians: Array<{
    id: string;
    name: string;
    credentials?: string;
  }>;
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  sent_to_office: "secondary",
  needs_correction: "destructive",
  being_corrected: "secondary",
  approved: "default",
  signed: "default",
  submitted: "default",
  voided: "destructive",
};

export function VisitLogReport({
  facilities,
  clinicians,
}: VisitLogReportProps) {
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedClinicians, setSelectedClinicians] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [visits, setVisits] = useState<VisitLogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const limit = 50;

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const filters: VisitLogFilters = {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        facilityIds:
          selectedFacilities.length > 0 ? selectedFacilities : undefined,
        clinicianIds:
          selectedClinicians.length > 0 ? selectedClinicians : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        page,
        limit,
      };

      const result = await getVisitLog(filters);

      if (result.success && result.data) {
        setVisits(result.data);
        if (result.pagination) {
          setTotal(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        }
      } else {
        console.error("Failed to fetch visits:", result.error);
        setVisits([]);
      }
    } catch (error) {
      console.error("Error fetching visits:", error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    selectedFacilities,
    selectedClinicians,
    selectedStatuses,
    page,
  ]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleRunReport = () => {
    setPage(1);
    fetchVisits();
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const filters: VisitLogFilters = {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        facilityIds:
          selectedFacilities.length > 0 ? selectedFacilities : undefined,
        clinicianIds:
          selectedClinicians.length > 0 ? selectedClinicians : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      };

      const result = await exportVisitLogToCSV(filters);

      if (result.success && result.csv) {
        // Create download
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `visit-log-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to export CSV:", result.error);
        alert("Failed to export CSV. Please try again.");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Filter displayed visits by search query (client-side)
  const filteredVisits = visits.filter((visit) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      visit.patient.first_name.toLowerCase().includes(query) ||
      visit.patient.last_name.toLowerCase().includes(query) ||
      visit.patient.mrn.toLowerCase().includes(query) ||
      visit.clinician?.first_name.toLowerCase().includes(query) ||
      visit.clinician?.last_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter visits by date range, clinician, facility, and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

            {/* Facility Filter */}
            <div className="space-y-2">
              <Label>Facility</Label>
              <Select
                value={selectedFacilities[0] || "all"}
                onValueChange={(value) =>
                  setSelectedFacilities(value === "all" ? [] : [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clinician Filter */}
            <div className="space-y-2">
              <Label>Clinician</Label>
              <Select
                value={selectedClinicians[0] || "all"}
                onValueChange={(value) =>
                  setSelectedClinicians(value === "all" ? [] : [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All clinicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clinicians</SelectItem>
                  {clinicians.map((clinician) => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.name}{" "}
                      {clinician.credentials && `(${clinician.credentials})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatuses[0] || "all"}
                onValueChange={(value) =>
                  setSelectedStatuses(value === "all" ? [] : [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent_to_office">Sent to Office</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleRunReport}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Loading..." : "Run Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visit Log</CardTitle>
              <CardDescription>
                {total} total visits found • Page {page} of {totalPages}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  placeholder="Search patient or clinician..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[250px] pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={exporting || visits.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading visits...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="text-muted-foreground mb-2 h-12 w-12" />
              <p className="text-muted-foreground">
                No visits found matching your filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>MRN</TableHead>
                      <TableHead>Clinician</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Wounds</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell>
                          {format(new Date(visit.visit_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/patients/${visit.patient.id}`}
                            className="hover:underline"
                          >
                            {visit.patient.last_name},{" "}
                            {visit.patient.first_name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {visit.patient.mrn}
                        </TableCell>
                        <TableCell>
                          {visit.clinician ? (
                            <div>
                              <div>
                                {visit.clinician.last_name},{" "}
                                {visit.clinician.first_name}
                              </div>
                              {visit.clinician.credentials && (
                                <div className="text-muted-foreground text-xs">
                                  {visit.clinician.credentials}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{visit.facility.name}</TableCell>
                        <TableCell className="capitalize">
                          {visit.visit_type.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariants[visit.status] || "outline"}
                          >
                            {visit.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {visit.wound_count}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/dashboard/patients/${visit.patient.id}/visits/${visit.id}`}
                            >
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, total)} of {total} visits
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
