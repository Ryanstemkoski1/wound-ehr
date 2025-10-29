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
import {
  getPatientsForCalendar,
  getFacilitiesForCalendar,
} from "@/app/actions/calendar";

type CalendarFiltersProps = {
  onFilterChange: (filters: {
    facilityId?: string;
    patientId?: string;
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
    Array<{ id: string; firstName: string; lastName: string; mrn: string }>
  >([]);
  const [selectedFacility, setSelectedFacility] = useState<
    string | undefined
  >();
  const [selectedPatient, setSelectedPatient] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  // Load facilities on mount
  useEffect(() => {
    async function loadFacilities() {
      const result = await getFacilitiesForCalendar();
      if (result.success && result.facilities) {
        setFacilities(result.facilities);
      }
    }
    loadFacilities();
  }, []);

  // Load patients when facility changes
  useEffect(() => {
    async function loadPatients() {
      const result = await getPatientsForCalendar(selectedFacility);
      if (result.success && result.patients) {
        setPatients(result.patients);
      }
    }
    loadPatients();
  }, [selectedFacility]);

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange({
      facilityId: selectedFacility,
      patientId: selectedPatient,
      status: selectedStatus,
    });
  }, [selectedFacility, selectedPatient, selectedStatus, onFilterChange]);

  const clearFilters = () => {
    setSelectedFacility(undefined);
    setSelectedPatient(undefined);
    setSelectedStatus(undefined);
  };

  const hasActiveFilters =
    selectedFacility || selectedPatient || selectedStatus;

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
        disabled={!selectedFacility}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Patients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Patients</SelectItem>
          {patients.map((patient) => (
            <SelectItem key={patient.id} value={patient.id}>
              {patient.lastName}, {patient.firstName} ({patient.mrn})
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
