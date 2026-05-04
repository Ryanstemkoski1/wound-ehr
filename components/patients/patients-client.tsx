"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import PatientCard from "./patient-card";
import CSVDownloadButton from "@/components/pdf/csv-download-button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date;
  mrn: string;
  gender: string | null;
  phone: string | null;
  facility: {
    id: string;
    name: string;
  };
  _count: {
    wounds: number;
  };
};

type Facility = {
  id: string;
  name: string;
};

export default function PatientsClient({
  initialPatients,
  facilities,
}: {
  initialPatients: Patient[];
  facilities: Facility[];
}) {
  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");

  // Filter patients client-side
  const filteredPatients = initialPatients.filter((patient) => {
    const matchesSearch =
      search === "" ||
      `${patient.firstName} ${patient.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(search.toLowerCase());

    const matchesFacility =
      facilityFilter === "all" || patient.facility.id === facilityFilter;

    return matchesSearch && matchesFacility;
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumbs customSegments={[{ label: "Patients" }]} />

      {/* Enhanced Header with gradient */}
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="gradient-text text-2xl font-bold tracking-tight sm:text-3xl">
              Patients
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Manage and track all patient records
            </p>
          </div>
          <div className="flex gap-2">
            <CSVDownloadButton
              type="patients"
              facilityId={facilityFilter === "all" ? undefined : facilityFilter}
              variant="outline"
            />
            <Link href="/dashboard/patients/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Patient</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <Card className="border-l-primary overflow-hidden border-l-4 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="relative flex-1">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                placeholder="Search by name or MRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search patients by name or medical record number"
              />
            </div>
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger
                className="w-full sm:w-[250px]"
                aria-label="Filter by facility"
              >
                <SelectValue placeholder="All Facilities" />
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
        </CardContent>
      </Card>

      {/* Results with count badge */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {filteredPatients.length} patient
            {filteredPatients.length !== 1 ? "s" : ""} found
          </p>
          {search && (
            <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
              Filtered
            </span>
          )}
        </div>

        {filteredPatients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="bg-muted mb-4 rounded-full p-4">
                <UsersIcon className="text-muted-foreground/50 h-12 w-12" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {initialPatients.length === 0
                  ? "No patients yet"
                  : "No patients match your search"}
              </h3>
              <p className="text-muted-foreground mb-4 text-center text-sm">
                {initialPatients.length === 0
                  ? "Get started by adding your first patient"
                  : "Try adjusting your search or filters"}
              </p>
              {initialPatients.length === 0 && (
                <Link href="/dashboard/patients/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Patient
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="columns-1 gap-x-4 md:columns-2 lg:columns-3">
            {filteredPatients.map((patient, index) => (
              <div
                key={patient.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-in mb-4 break-inside-avoid"
              >
                <PatientCard patient={patient} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
