"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Download, FileText } from "lucide-react";
import Link from "next/link";

type BillingRecord = {
  id: string;
  cptCodes: unknown;
  icd10Codes: unknown;
  modifiers: unknown;
  timeSpent: boolean;
  notes: string | null;
  createdAt: Date;
  visit: {
    id: string;
    visitDate: Date;
    visitType: string;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    facility: {
      id: string;
      name: string;
    };
  };
};

type Facility = {
  id: string;
  name: string;
};

type Props = {
  initialBillings: BillingRecord[];
  facilities: Facility[];
};

export function BillingReportsClient({ initialBillings, facilities }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter billings
  const filteredBillings = useMemo(() => {
    return initialBillings.filter((billing) => {
      // Facility filter
      if (
        selectedFacility !== "all" &&
        billing.patient.facility.id !== selectedFacility
      ) {
        return false;
      }

      // Date range filter
      if (startDate) {
        const start = new Date(startDate);
        if (billing.visit.visitDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (billing.visit.visitDate > end) return false;
      }

      // Search filter (patient name or MRN)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName =
          `${billing.patient.firstName} ${billing.patient.lastName}`.toLowerCase();
        const mrn = billing.patient.mrn.toLowerCase();
        if (!fullName.includes(query) && !mrn.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [initialBillings, selectedFacility, startDate, endDate, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalVisits = filteredBillings.length;
    const totalCptCodes = filteredBillings.reduce(
      (sum, b) => sum + (Array.isArray(b.cptCodes) ? b.cptCodes.length : 0),
      0
    );
    const totalIcd10Codes = filteredBillings.reduce(
      (sum, b) => sum + (Array.isArray(b.icd10Codes) ? b.icd10Codes.length : 0),
      0
    );

    return {
      totalVisits,
      totalCptCodes,
      totalIcd10Codes,
    };
  }, [filteredBillings]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Patient Name",
      "MRN",
      "Facility",
      "Visit Type",
      "CPT Codes",
      "ICD-10 Codes",
      "Modifiers",
      "Time-Based",
      "Notes",
    ];

    const rows = filteredBillings.map((billing) => [
      format(new Date(billing.visit.visitDate), "MM/dd/yyyy"),
      `${billing.patient.firstName} ${billing.patient.lastName}`,
      billing.patient.mrn,
      billing.patient.facility.name,
      billing.visit.visitType,
      Array.isArray(billing.cptCodes) ? billing.cptCodes.join("; ") : "",
      Array.isArray(billing.icd10Codes) ? billing.icd10Codes.join("; ") : "",
      Array.isArray(billing.modifiers) ? billing.modifiers.join("; ") : "",
      billing.timeSpent ? "Yes" : "No",
      billing.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `billing-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-muted-foreground text-xs">Billable visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPT Codes</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCptCodes}</div>
            <p className="text-muted-foreground text-xs">Procedure codes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ICD-10 Codes</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIcd10Codes}</div>
            <p className="text-muted-foreground text-xs">Diagnosis codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter billing records by date, facility, or patient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Patient</Label>
              <Input
                id="search"
                placeholder="Name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facility">Facility</Label>
              <Select
                value={selectedFacility}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger id="facility">
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

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedFacility("all");
                setStartDate("");
                setEndDate("");
              }}
              className="w-full sm:w-auto"
            >
              Clear Filters
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={filteredBillings.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Records</CardTitle>
          <CardDescription>
            {filteredBillings.length} record
            {filteredBillings.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBillings.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No billing records found. Try adjusting your filters.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto rounded-md border lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>MRN</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>CPT Codes</TableHead>
                      <TableHead>ICD-10 Codes</TableHead>
                      <TableHead>Modifiers</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBillings.map((billing) => (
                      <TableRow key={billing.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(
                            new Date(billing.visit.visitDate),
                            "MM/dd/yyyy"
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Link
                            href={`/dashboard/patients/${billing.patient.id}`}
                            className="font-medium hover:underline"
                          >
                            {billing.patient.firstName}{" "}
                            {billing.patient.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>{billing.patient.mrn}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {billing.patient.facility.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(billing.cptCodes) &&
                              billing.cptCodes.map((code) => (
                                <Badge
                                  key={code}
                                  variant="default"
                                  className="text-xs"
                                >
                                  {code}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(billing.icd10Codes) &&
                              billing.icd10Codes.map((code) => (
                                <Badge
                                  key={code}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {code}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(billing.modifiers) &&
                              billing.modifiers.map((modifier) => (
                                <Badge
                                  key={modifier}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {modifier}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {billing.timeSpent ? (
                            <Badge variant="default" className="bg-green-600">
                              Time
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/dashboard/patients/${billing.patient.id}/visits/${billing.visit.id}`}
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

              {/* Mobile Card View */}
              <div className="space-y-4 lg:hidden">
                {filteredBillings.map((billing) => (
                  <Card key={billing.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link
                              href={`/dashboard/patients/${billing.patient.id}`}
                              className="text-base font-semibold hover:underline"
                            >
                              {billing.patient.firstName}{" "}
                              {billing.patient.lastName}
                            </Link>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              MRN: {billing.patient.mrn}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/dashboard/patients/${billing.patient.id}/visits/${billing.visit.id}`}
                            >
                              View
                            </Link>
                          </Button>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-600 dark:text-zinc-400">
                              Date:
                            </span>
                            <span className="font-medium">
                              {format(
                                new Date(billing.visit.visitDate),
                                "MM/dd/yyyy"
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-600 dark:text-zinc-400">
                              Facility:
                            </span>
                            <span className="font-medium">
                              {billing.patient.facility.name}
                            </span>
                          </div>
                          {billing.timeSpent && (
                            <div className="flex justify-between">
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Time-Based:
                              </span>
                              <Badge variant="default" className="bg-green-600">
                                Yes
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {Array.isArray(billing.cptCodes) &&
                            billing.cptCodes.length > 0 && (
                              <div>
                                <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  CPT Codes:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {billing.cptCodes.map((code) => (
                                    <Badge
                                      key={code}
                                      variant="default"
                                      className="text-xs"
                                    >
                                      {code}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                          {Array.isArray(billing.icd10Codes) &&
                            billing.icd10Codes.length > 0 && (
                              <div>
                                <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  ICD-10 Codes:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {billing.icd10Codes.map((code) => (
                                    <Badge
                                      key={code}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {code}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                          {Array.isArray(billing.modifiers) &&
                            billing.modifiers.length > 0 && (
                              <div>
                                <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  Modifiers:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {billing.modifiers.map((modifier) => (
                                    <Badge
                                      key={modifier}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {modifier}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
