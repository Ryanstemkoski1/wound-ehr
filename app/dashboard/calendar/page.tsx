"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import CalendarView from "@/components/calendar/calendar-view";
import CalendarFilters from "@/components/calendar/calendar-filters";
import NewVisitDialog from "@/components/calendar/new-visit-dialog";

export default function CalendarPage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [patientId, setPatientId] = useState<string | undefined>();
  const [clinicianId, setClinicianId] = useState<string | undefined>();
  const [showNewVisitDialog, setShowNewVisitDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFilterChange = useCallback(
    (filters: {
      facilityId?: string;
      patientId?: string;
      clinicianId?: string;
      status?: string;
    }) => {
      setFacilityId(
        filters.facilityId === "all" ? undefined : filters.facilityId
      );
      setPatientId(filters.patientId === "all" ? undefined : filters.patientId);
      setClinicianId(
        filters.clinicianId === "all" ? undefined : filters.clinicianId
      );
      // Status filter not implemented yet - would need to be passed to getCalendarEvents
      setRefreshKey((prev) => prev + 1); // Force calendar reload
    },
    []
  );

  const handleVisitCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1); // Reload calendar after creating visit
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 ring-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1">
            <CalendarIcon className="text-primary h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Calendar
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Schedule and manage patient visits
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewVisitDialog(true)}
          className="w-full sm:w-auto"
          aria-label="Schedule a new patient visit"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Visit
        </Button>
      </div>

      {/* Filters */}
      <CalendarFilters onFilterChange={handleFilterChange} />

      {/* Calendar */}
      <div className="bg-card border-border/60 rounded-xl border p-3 shadow-sm sm:p-6">
        <CalendarView
          key={refreshKey}
          facilityId={facilityId}
          patientId={patientId}
          clinicianId={clinicianId}
        />
      </div>

      {/* New Visit Dialog */}
      <NewVisitDialog
        open={showNewVisitDialog}
        onOpenChange={setShowNewVisitDialog}
        onSuccess={handleVisitCreated}
      />
    </div>
  );
}
