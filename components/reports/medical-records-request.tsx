"use client";

/**
 * Medical Records Request Component
 * Pull all visits for a single patient with download options
 */

import { useState } from "react";
import { format } from "date-fns";
import {
  Download,
  FileText,
  Calendar as CalendarIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getPatientRecords } from "@/app/actions/reports";
import Link from "next/link";

type PatientRecordsData = {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    date_of_birth: string;
    facility: { id: string; name: string } | null;
  };
  visits: Array<{
    id: string;
    visit_date: string;
    visit_type: string;
    status: string;
    visit_notes: string | null;
    assessments: Array<{
      id: string;
      wound: { id: string; location: string; wound_type: string } | null;
    }>;
    clinician: {
      id: string;
      name: string;
      credentials: string | null;
    } | null;
  }>;
  totalVisits: number;
};

type MedicalRecordsRequestProps = {
  patients: Array<{
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  }>;
};

export function MedicalRecordsRequest({
  patients,
}: MedicalRecordsRequestProps) {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PatientRecordsData | null>(null);

  const handleRunReport = async () => {
    if (!selectedPatient) {
      alert("Please select a patient");
      return;
    }

    setLoading(true);
    try {
      const result = await getPatientRecords(
        selectedPatient,
        startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate ? format(endDate, "yyyy-MM-dd") : undefined
      );

      if (result.success && result.data) {
        setData(result.data as unknown as PatientRecordsData);
      } else {
        console.error("Failed to fetch patient records:", result.error);
        alert("Failed to load records. Please try again.");
        setData(null);
      }
    } catch (error) {
      console.error("Error fetching patient records:", error);
      alert("Failed to load records. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (!patientSearch) return true;
    const query = patientSearch.toLowerCase();
    return (
      patient.first_name.toLowerCase().includes(query) ||
      patient.last_name.toLowerCase().includes(query) ||
      patient.mrn.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Records Request</CardTitle>
          <CardDescription>
            Pull all visit records for a specific patient with optional date
            range filtering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Patient Search/Selection */}
            <div className="space-y-2">
              <Label>Search Patient</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  placeholder="Search by name or MRN..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {patientSearch && filteredPatients.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {filteredPatients.slice(0, 10).map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => {
                        setSelectedPatient(patient.id);
                        setPatientSearch(
                          `${patient.last_name}, ${patient.first_name} (${patient.mrn})`
                        );
                      }}
                      className="hover:bg-muted w-full px-4 py-2 text-left transition-colors"
                    >
                      <div className="font-medium">
                        {patient.last_name}, {patient.first_name}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        MRN: {patient.mrn}
                      </div>
                    </button>
                  ))}
                  {filteredPatients.length > 10 && (
                    <div className="text-muted-foreground border-t px-4 py-2 text-sm">
                      ... and {filteredPatients.length - 10} more. Refine your
                      search.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date Range (Optional) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
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
                      {startDate ? format(startDate, "PPP") : "All dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
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
                      {endDate ? format(endDate, "PPP") : "All dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRunReport}
                disabled={loading || !selectedPatient}
              >
                {loading ? "Loading..." : "Pull Records"}
              </Button>
              {startDate && (
                <Button
                  variant="outline"
                  onClick={() => setStartDate(undefined)}
                >
                  Clear Start Date
                </Button>
              )}
              {endDate && (
                <Button variant="outline" onClick={() => setEndDate(undefined)}>
                  Clear End Date
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <>
          {/* Patient Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {data.patient.last_name}, {data.patient.first_name}
              </CardTitle>
              <CardDescription>
                MRN: {data.patient.mrn} • DOB:{" "}
                {format(new Date(data.patient.date_of_birth), "MMM d, yyyy")}
                {data.patient.facility && ` • ${data.patient.facility.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{data.totalVisits}</div>
                  <p className="text-muted-foreground text-sm">
                    Total visits
                    {startDate && endDate && (
                      <>
                        {" "}
                        ({format(startDate, "MMM d")} -{" "}
                        {format(endDate, "MMM d, yyyy")})
                      </>
                    )}
                  </p>
                </div>
                <Button disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Download All PDFs (ZIP)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Visit Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Visit Records</CardTitle>
              <CardDescription>
                Chronological list of all visits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.visits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="text-muted-foreground mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">
                    No visits found for the selected date range
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visit Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Clinician</TableHead>
                        <TableHead>Wounds Assessed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.visits.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell>
                            {format(new Date(visit.visit_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="capitalize">
                            {visit.visit_type.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            {visit.clinician ? (
                              <div>
                                <div>{visit.clinician.name}</div>
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
                          <TableCell>
                            {visit.assessments.length > 0 ? (
                              <div className="text-sm">
                                {visit.assessments.map((a, idx) => (
                                  <div key={a.id}>
                                    {a.wound?.location || "Unknown"}{" "}
                                    {a.wound?.wound_type || ""}
                                    {idx < visit.assessments.length - 1 && ", "}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                None
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                visit.status === "signed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {visit.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  href={`/dashboard/patients/${data.patient.id}/visits/${visit.id}`}
                                >
                                  View
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" disabled>
                                Download PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
