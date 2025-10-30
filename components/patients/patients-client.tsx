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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Patients</h1>
          <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Manage patient records
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
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

      {/* Results */}
      <div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {filteredPatients.length} patient
          {filteredPatients.length !== 1 ? "s" : ""} found
        </p>

        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UsersIcon className="mb-4 h-12 w-12 text-zinc-400" />
              <h3 className="mb-2 text-lg font-semibold">
                {initialPatients.length === 0
                  ? "No patients yet"
                  : "No patients match your search"}
              </h3>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                {initialPatients.length === 0
                  ? "Get started by adding your first patient"
                  : "Try adjusting your search or filters"}
              </p>
              {initialPatients.length === 0 && (
                <Link href="/dashboard/patients/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Patient
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
