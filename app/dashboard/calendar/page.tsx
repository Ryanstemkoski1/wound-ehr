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
  const [showNewVisitDialog, setShowNewVisitDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFilterChange = useCallback(
    (filters: { facilityId?: string; patientId?: string; status?: string }) => {
      setFacilityId(
        filters.facilityId === "all" ? undefined : filters.facilityId
      );
      setPatientId(filters.patientId === "all" ? undefined : filters.patientId);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            Calendar
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Schedule and manage patient visits
          </p>
        </div>
        <Button
          onClick={() => setShowNewVisitDialog(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Visit
        </Button>
      </div>

      {/* Filters */}
      <CalendarFilters onFilterChange={handleFilterChange} />

      {/* Calendar */}
      <div className="bg-card rounded-lg border p-3 sm:p-6">
        <CalendarView
          key={refreshKey}
          facilityId={facilityId}
          patientId={patientId}
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
