"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { getPatientsForCalendar } from "@/app/actions/calendar";
import { getUserFacilities } from "@/app/actions/facilities";
import { getAvailableClinicians } from "@/app/actions/patient-clinicians";

type CalendarFiltersProps = {
  onFilterChange: (filters: {
    facilityId?: string;
    patientId?: string;
    clinicianId?: string;
    status?: string;
  }) => void;
};

export default function CalendarFilters({
  onFilterChange,
}: CalendarFiltersProps) {
  const [facilities, setFacilities] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [patients, setPatients] = useState<
    Array<{ id: string; first_name: string; last_name: string; mrn: string }>
  >([]);
  const [clinicians, setClinicians] = useState<
    Array<{ id: string; name: string; credentials: string; email: string }>
  >([]);
  const [selectedFacility, setSelectedFacility] = useState<
    string | undefined
  >();
  const [selectedPatient, setSelectedPatient] = useState<string | undefined>();
  const [selectedClinician, setSelectedClinician] = useState<
    string | undefined
  >();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  // Load facilities on mount
  useEffect(() => {
    async function loadFacilities() {
      const facilities = await getUserFacilities();
      setFacilities(facilities);
    }
    loadFacilities();
  }, []);

  // Load patients and clinicians when facility changes
  useEffect(() => {
    async function loadData() {
      if (selectedFacility && selectedFacility !== "all") {
        // Load patients
        const patientsResult = await getPatientsForCalendar(selectedFacility);
        if (patientsResult.success && patientsResult.patients) {
          setPatients(patientsResult.patients);
        }

        // Load clinicians for this facility
        const cliniciansResult = await getAvailableClinicians(selectedFacility);
        if (cliniciansResult.success && cliniciansResult.data) {
          setClinicians(cliniciansResult.data);
        }
      } else {
        setPatients([]);
        setClinicians([]);
      }
    }
    loadData();
  }, [selectedFacility]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange({
      facilityId: selectedFacility,
      patientId: selectedPatient,
      clinicianId: selectedClinician,
      status: selectedStatus,
    });
  }, [
    selectedFacility,
    selectedPatient,
    selectedClinician,
    selectedStatus,
    onFilterChange,
  ]);

  const clearFilters = () => {
    setSelectedFacility(undefined);
    setSelectedPatient(undefined);
    setSelectedClinician(undefined);
    setSelectedStatus(undefined);
  };

  const hasActiveFilters =
    selectedFacility || selectedPatient || selectedClinician || selectedStatus;

  return (
    <div className="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <div className="text-sm font-medium">Filters:</div>

      {/* Facility Filter */}
      <Select value={selectedFacility} onValueChange={setSelectedFacility}>
        <SelectTrigger className="w-[200px]">
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

      {/* Patient Filter */}
      <Select
        value={selectedPatient}
        onValueChange={setSelectedPatient}
        disabled={!selectedFacility || selectedFacility === "all"}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Patients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Patients</SelectItem>
          {patients.map((patient) => (
            <SelectItem key={patient.id} value={patient.id}>
              {patient.last_name}, {patient.first_name} ({patient.mrn})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clinician Filter */}
      <Select
        value={selectedClinician}
        onValueChange={setSelectedClinician}
        disabled={!selectedFacility || selectedFacility === "all"}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="All Clinicians" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clinicians</SelectItem>
          {clinicians.map((clinician) => (
            <SelectItem key={clinician.id} value={clinician.id}>
              {clinician.name || clinician.email}
              {clinician.credentials && ` (${clinician.credentials})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="in-progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto"
        >
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
